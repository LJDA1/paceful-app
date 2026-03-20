/**
 * GET /api/v1/partner/ers/[externalId]/history
 *
 * Get historical ERS scores and trend data for a partner user.
 * Supports different time periods and granularity levels.
 *
 * Query params:
 * - period: "7d", "30d", "90d", "all" (default "30d")
 * - granularity: "daily", "weekly", "monthly" (default "daily")
 * - include_dimensions: boolean (default true)
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkPartnerRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
  getSupabaseAdmin,
} from '@/lib/partner-auth';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';

type Period = '7d' | '30d' | '90d' | 'all';
type Granularity = 'daily' | 'weekly' | 'monthly';
type Stage = 'healing' | 'rebuilding' | 'ready';
type TrendDirection = 'improving' | 'stable' | 'declining';

interface ERSScoreRecord {
  ers_score: number;
  ers_stage: Stage;
  emotional_stability: number;
  self_reflection: number;
  engagement: number;
  coping_capacity: number;
  social_readiness: number;
  calculated_at: string;
}

interface HistoryDataPoint {
  date: string;
  score: number;
  stage: Stage;
  dimensions?: {
    emotional_stability: number;
    self_reflection: number;
    coping_capacity: number;
    behavioral_engagement: number;
    social_readiness: number;
  };
}

interface Milestone {
  date: string;
  type: 'stage_transition';
  from: Stage;
  to: Stage;
  scoreAtTransition: number;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

/**
 * Get the start date for a given period
 */
function getPeriodStartDate(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
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
 * Aggregate scores by granularity
 */
function aggregateScores(
  scores: ERSScoreRecord[],
  granularity: Granularity,
  includeDimensions: boolean
): HistoryDataPoint[] {
  if (granularity === 'daily') {
    // For daily, just format each score
    return scores.map(s => formatDataPoint(s, includeDimensions));
  }

  // Group by date key
  const groups = new Map<string, ERSScoreRecord[]>();

  for (const score of scores) {
    const key = getDateKey(score.calculated_at, granularity);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(score);
  }

  // Average each group
  const result: HistoryDataPoint[] = [];

  for (const [dateKey, groupScores] of groups) {
    const avgScore = Math.round(
      groupScores.reduce((sum, s) => sum + s.ers_score, 0) / groupScores.length * 10
    ) / 10;

    // Use the most recent stage in the period
    const latestRecord = groupScores.sort(
      (a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime()
    )[0];

    const dataPoint: HistoryDataPoint = {
      date: `${dateKey}T00:00:00Z`,
      score: avgScore,
      stage: latestRecord.ers_stage,
    };

    if (includeDimensions) {
      dataPoint.dimensions = {
        emotional_stability: Math.round(
          groupScores.reduce((sum, s) => sum + s.emotional_stability, 0) / groupScores.length * 10
        ) / 10,
        self_reflection: Math.round(
          groupScores.reduce((sum, s) => sum + s.self_reflection, 0) / groupScores.length * 10
        ) / 10,
        coping_capacity: Math.round(
          groupScores.reduce((sum, s) => sum + s.coping_capacity, 0) / groupScores.length * 10
        ) / 10,
        behavioral_engagement: Math.round(
          groupScores.reduce((sum, s) => sum + s.engagement, 0) / groupScores.length * 10
        ) / 10,
        social_readiness: Math.round(
          groupScores.reduce((sum, s) => sum + s.social_readiness, 0) / groupScores.length * 10
        ) / 10,
      };
    }

    result.push(dataPoint);
  }

  // Sort by date ascending
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Format a single score record as a data point
 */
function formatDataPoint(score: ERSScoreRecord, includeDimensions: boolean): HistoryDataPoint {
  const dataPoint: HistoryDataPoint = {
    date: score.calculated_at,
    score: score.ers_score,
    stage: score.ers_stage,
  };

  if (includeDimensions) {
    dataPoint.dimensions = {
      emotional_stability: score.emotional_stability,
      self_reflection: score.self_reflection,
      coping_capacity: score.coping_capacity,
      behavioral_engagement: score.engagement,
      social_readiness: score.social_readiness,
    };
  }

  return dataPoint;
}

/**
 * Calculate trend metadata from history
 */
function calculateTrend(
  history: HistoryDataPoint[]
): {
  direction: TrendDirection;
  totalChange: number;
  weeklyRate: number;
  dataPointsUsed: number;
} {
  if (history.length < 2) {
    return {
      direction: 'stable',
      totalChange: 0,
      weeklyRate: 0,
      dataPointsUsed: history.length,
    };
  }

  const firstScore = history[0].score;
  const lastScore = history[history.length - 1].score;
  const totalChange = Math.round((lastScore - firstScore) * 10) / 10;

  // Calculate time span in weeks
  const firstDate = new Date(history[0].date);
  const lastDate = new Date(history[history.length - 1].date);
  const weeksSpan = (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000);

  const weeklyRate = weeksSpan > 0
    ? Math.round((totalChange / weeksSpan) * 10) / 10
    : 0;

  let direction: TrendDirection = 'stable';
  if (totalChange > 3) {
    direction = 'improving';
  } else if (totalChange < -3) {
    direction = 'declining';
  }

  return {
    direction,
    totalChange,
    weeklyRate,
    dataPointsUsed: history.length,
  };
}

/**
 * Identify stage transition milestones
 */
function identifyMilestones(history: HistoryDataPoint[]): Milestone[] {
  const milestones: Milestone[] = [];

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];

    if (prev.stage !== curr.stage) {
      milestones.push({
        date: curr.date,
        type: 'stage_transition',
        from: prev.stage,
        to: curr.stage,
        scoreAtTransition: curr.score,
      });
    }
  }

  return milestones;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ externalId: string }> }
) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const { externalId } = await params;
    const { searchParams } = new URL(request.url);
    return sandboxResponse('ers_history', {
      externalId,
      period: searchParams.get('period') || '30d',
      granularity: searchParams.get('granularity') || 'daily',
      include_dimensions: searchParams.get('include_dimensions') !== 'false',
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
  const rateLimit = await checkPartnerRateLimit(validation.partnerId!, validation.rateLimit);
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
    const { externalId } = await params;

    if (!externalId) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/:externalId/history',
        'GET',
        400,
        Date.now() - startTime
      );
      return partnerApiError('externalId is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || '30d';
    const granularityParam = searchParams.get('granularity') || 'daily';
    const includeDimensionsParam = searchParams.get('include_dimensions') !== 'false';

    // Validate period
    const validPeriods: Period[] = ['7d', '30d', '90d', 'all'];
    if (!validPeriods.includes(periodParam as Period)) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/:externalId/history',
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
        '/api/v1/partner/ers/:externalId/history',
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
    const includeDimensions = includeDimensionsParam;

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Look up partner user
    const { data: partnerUser, error: userError } = await supabase
      .from('partner_users')
      .select('id, external_id')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .single();

    if (userError || !partnerUser) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/:externalId/history',
        'GET',
        404,
        Date.now() - startTime
      );
      return partnerApiError('User not found', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Build query for ERS scores
    const startDate = getPeriodStartDate(period);

    let query = supabase
      .from('partner_ers_scores')
      .select('ers_score, ers_stage, emotional_stability, self_reflection, engagement, coping_capacity, social_readiness, calculated_at')
      .eq('partner_user_id', partnerUser.id)
      .order('calculated_at', { ascending: true });

    if (startDate) {
      query = query.gte('calculated_at', startDate.toISOString());
    }

    const { data: scoresData, error: scoresError } = await query;

    if (scoresError) {
      console.error('Error fetching ERS history:', scoresError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/:externalId/history',
        'GET',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch history', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    const scores: ERSScoreRecord[] = (scoresData || []).map(s => ({
      ers_score: s.ers_score,
      ers_stage: s.ers_stage as Stage,
      emotional_stability: s.emotional_stability,
      self_reflection: s.self_reflection,
      engagement: s.engagement,
      coping_capacity: s.coping_capacity,
      social_readiness: s.social_readiness,
      calculated_at: s.calculated_at,
    }));

    // Handle empty history
    if (scores.length === 0) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/:externalId/history',
        'GET',
        200,
        Date.now() - startTime
      );

      return partnerApiSuccess({
        userId: externalId,
        period,
        granularity,
        currentScore: null,
        currentStage: null,
        trend: {
          direction: 'stable',
          totalChange: 0,
          weeklyRate: 0,
          dataPointsUsed: 0,
        },
        milestones: [],
        history: [],
      }, 200, undefined, rateLimit);
    }

    // Aggregate by granularity
    const history = aggregateScores(scores, granularity, includeDimensions);

    // Get current score (most recent)
    const latestScore = scores[scores.length - 1];

    // Calculate trend
    const trend = calculateTrend(history);

    // Identify milestones (use non-aggregated data for accuracy)
    const rawHistory = scores.map(s => formatDataPoint(s, false));
    const milestones = identifyMilestones(rawHistory);

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/ers/:externalId/history',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      userId: externalId,
      period,
      granularity,
      currentScore: latestScore.ers_score,
      currentStage: latestScore.ers_stage,
      trend,
      milestones,
      history,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('ERS history error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/ers/:externalId/history',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
