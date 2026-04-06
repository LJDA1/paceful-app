/**
 * GET /api/v1/partner/ers/trends/aggregate
 *
 * Aggregate ERS trends across ALL of a partner's users.
 * Powers dashboards, outcome reports, and population-level analytics.
 *
 * Query params:
 * - period: "7d", "30d", "90d" (default "30d")
 * - granularity: "daily", "weekly", "monthly" (default "weekly")
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkEndpointRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
  getSupabaseAdmin,
} from '@/lib/partner-auth';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';

type Period = '7d' | '30d' | '90d';
type Granularity = 'daily' | 'weekly' | 'monthly';
type Stage = 'healing' | 'rebuilding' | 'ready';
type OverallTrend = 'improving' | 'stable' | 'declining';

interface StageDistribution {
  healing: number;
  rebuilding: number;
  ready: number;
}

interface TransitionCounts {
  healing_to_rebuilding: number;
  rebuilding_to_ready: number;
  ready_to_rebuilding: number;
  rebuilding_to_healing: number;
}

interface TimelineEntry {
  date: string;
  averageScore: number;
  stageDistribution: StageDistribution;
  userCount: number;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

/**
 * Get the start date for a given period
 */
function getPeriodStartDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Get the date key for aggregation based on granularity
 */
function getDateKey(dateStr: string, granularity: Granularity): string {
  const date = new Date(dateStr);

  switch (granularity) {
    case 'daily':
      return date.toISOString().split('T')[0];
    case 'weekly':
      // Get the Monday of the week
      const dayOfWeek = date.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(date.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
      return monday.toISOString().split('T')[0];
    case 'monthly':
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }
}

/**
 * Calculate stage distribution from an array of stages
 */
function calculateStageDistribution(stages: Stage[]): StageDistribution {
  if (stages.length === 0) {
    return { healing: 0, rebuilding: 0, ready: 0 };
  }

  const counts = { healing: 0, rebuilding: 0, ready: 0 };
  for (const stage of stages) {
    counts[stage]++;
  }

  return {
    healing: Math.round((counts.healing / stages.length) * 100) / 100,
    rebuilding: Math.round((counts.rebuilding / stages.length) * 100) / 100,
    ready: Math.round((counts.ready / stages.length) * 100) / 100,
  };
}

/**
 * Determine overall trend based on score change
 */
function determineOverallTrend(startScore: number, endScore: number): OverallTrend {
  const change = endScore - startScore;
  if (change > 3) return 'improving';
  if (change < -3) return 'declining';
  return 'stable';
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const { searchParams } = new URL(request.url);
    return sandboxResponse('ers_trends_aggregate', {
      period: searchParams.get('period') || '30d',
      granularity: searchParams.get('granularity') || 'weekly',
    });
  }

  // Validate API key
  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(
      validation.error || 'Invalid API key',
      'UNAUTHORIZED',
      401
    );
  }

  // Check rate limit
  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, request.url);
  if (!rateLimit.allowed) {
    return partnerApiError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      undefined,
      rateLimit
    );
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || '30d';
    const granularityParam = searchParams.get('granularity') || 'weekly';

    // Validate period
    const validPeriods: Period[] = ['7d', '30d', '90d'];
    if (!validPeriods.includes(periodParam as Period)) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/trends/aggregate',
        'GET',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Invalid period: "${periodParam}". Valid options: ${validPeriods.join(', ')}`,
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    // Validate granularity
    const validGranularities: Granularity[] = ['daily', 'weekly', 'monthly'];
    if (!validGranularities.includes(granularityParam as Granularity)) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/trends/aggregate',
        'GET',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Invalid granularity: "${granularityParam}". Valid options: ${validGranularities.join(', ')}`,
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    const period = periodParam as Period;
    const granularity = granularityParam as Granularity;

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Get the start date for the period
    const periodStart = getPeriodStartDate(period);

    // Get all partner users
    const { data: partnerUsers, error: usersError } = await supabase
      .from('partner_users')
      .select('id')
      .eq('partner_id', partnerId);

    if (usersError) {
      console.error('Error fetching partner users:', usersError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/trends/aggregate',
        'GET',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch users', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    const totalUsers = partnerUsers?.length || 0;

    if (totalUsers === 0) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/trends/aggregate',
        'GET',
        200,
        Date.now() - startTime
      );

      return partnerApiSuccess({
        period,
        granularity,
        totalUsers: 0,
        averageScoreStart: null,
        averageScoreEnd: null,
        overallTrend: 'stable',
        stageDistributionStart: { healing: 0, rebuilding: 0, ready: 0 },
        stageDistributionEnd: { healing: 0, rebuilding: 0, ready: 0 },
        transitionsInPeriod: {
          healing_to_rebuilding: 0,
          rebuilding_to_ready: 0,
          ready_to_rebuilding: 0,
          rebuilding_to_healing: 0,
        },
        timeline: [],
      }, 200, undefined, rateLimit);
    }

    const userIds = partnerUsers.map(u => u.id);

    // Fetch all ERS scores for these users within the period
    const { data: allScores, error: scoresError } = await supabase
      .from('partner_ers_scores')
      .select('partner_user_id, ers_score, ers_stage, calculated_at')
      .in('partner_user_id', userIds)
      .gte('calculated_at', periodStart.toISOString())
      .order('calculated_at', { ascending: true });

    if (scoresError) {
      console.error('Error fetching ERS scores:', scoresError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/trends/aggregate',
        'GET',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch scores', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    const scores = allScores || [];

    // Handle no scores
    if (scores.length === 0) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/trends/aggregate',
        'GET',
        200,
        Date.now() - startTime
      );

      return partnerApiSuccess({
        period,
        granularity,
        totalUsers,
        averageScoreStart: null,
        averageScoreEnd: null,
        overallTrend: 'stable',
        stageDistributionStart: { healing: 0, rebuilding: 0, ready: 0 },
        stageDistributionEnd: { healing: 0, rebuilding: 0, ready: 0 },
        transitionsInPeriod: {
          healing_to_rebuilding: 0,
          rebuilding_to_ready: 0,
          ready_to_rebuilding: 0,
          rebuilding_to_healing: 0,
        },
        timeline: [],
      }, 200, undefined, rateLimit);
    }

    // Group scores by date key for timeline
    const scoresByDateKey = new Map<string, Array<{ score: number; stage: Stage; userId: string }>>();

    for (const score of scores) {
      const dateKey = getDateKey(score.calculated_at, granularity);
      if (!scoresByDateKey.has(dateKey)) {
        scoresByDateKey.set(dateKey, []);
      }
      scoresByDateKey.get(dateKey)!.push({
        score: score.ers_score,
        stage: score.ers_stage as Stage,
        userId: score.partner_user_id,
      });
    }

    // Build timeline
    const timelineKeys = Array.from(scoresByDateKey.keys()).sort();
    const timeline: TimelineEntry[] = [];

    for (const dateKey of timelineKeys) {
      const dateScores = scoresByDateKey.get(dateKey)!;

      // Get unique user scores (latest per user for this period)
      const userLatestScores = new Map<string, { score: number; stage: Stage }>();
      for (const s of dateScores) {
        userLatestScores.set(s.userId, { score: s.score, stage: s.stage });
      }

      const uniqueScores = Array.from(userLatestScores.values());
      const avgScore = Math.round(
        (uniqueScores.reduce((sum, s) => sum + s.score, 0) / uniqueScores.length) * 10
      ) / 10;
      const stages = uniqueScores.map(s => s.stage);

      timeline.push({
        date: dateKey,
        averageScore: avgScore,
        stageDistribution: calculateStageDistribution(stages),
        userCount: uniqueScores.length,
      });
    }

    // Calculate start and end metrics
    const startEntry = timeline[0];
    const endEntry = timeline[timeline.length - 1];

    const averageScoreStart = startEntry?.averageScore || null;
    const averageScoreEnd = endEntry?.averageScore || null;
    const stageDistributionStart = startEntry?.stageDistribution || { healing: 0, rebuilding: 0, ready: 0 };
    const stageDistributionEnd = endEntry?.stageDistribution || { healing: 0, rebuilding: 0, ready: 0 };

    const overallTrend = averageScoreStart !== null && averageScoreEnd !== null
      ? determineOverallTrend(averageScoreStart, averageScoreEnd)
      : 'stable';

    // Count stage transitions
    // Group scores by user and track transitions
    const userScores = new Map<string, Array<{ stage: Stage; date: string }>>();
    for (const score of scores) {
      const userId = score.partner_user_id;
      if (!userScores.has(userId)) {
        userScores.set(userId, []);
      }
      userScores.get(userId)!.push({
        stage: score.ers_stage as Stage,
        date: score.calculated_at,
      });
    }

    const transitions: TransitionCounts = {
      healing_to_rebuilding: 0,
      rebuilding_to_ready: 0,
      ready_to_rebuilding: 0,
      rebuilding_to_healing: 0,
    };

    for (const [, userHistory] of userScores) {
      // Sort by date
      userHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (let i = 1; i < userHistory.length; i++) {
        const prev = userHistory[i - 1].stage;
        const curr = userHistory[i].stage;

        if (prev !== curr) {
          if (prev === 'healing' && curr === 'rebuilding') {
            transitions.healing_to_rebuilding++;
          } else if (prev === 'rebuilding' && curr === 'ready') {
            transitions.rebuilding_to_ready++;
          } else if (prev === 'ready' && curr === 'rebuilding') {
            transitions.ready_to_rebuilding++;
          } else if (prev === 'rebuilding' && curr === 'healing') {
            transitions.rebuilding_to_healing++;
          }
        }
      }
    }

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/ers/trends/aggregate',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      period,
      granularity,
      totalUsers,
      averageScoreStart,
      averageScoreEnd,
      overallTrend,
      stageDistributionStart,
      stageDistributionEnd,
      transitionsInPeriod: transitions,
      timeline,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('ERS trends aggregate error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/ers/trends/aggregate',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
