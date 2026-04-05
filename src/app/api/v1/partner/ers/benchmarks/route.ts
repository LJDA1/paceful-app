/**
 * GET /api/v1/partner/ers/benchmarks
 *
 * Returns cohort benchmarks without a specific user.
 * Useful for understanding overall population statistics.
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

type CohortType = 'same_partner' | 'global';
type PeriodType = '7d' | '30d' | '90d' | 'all';
type StageType = 'healing' | 'rebuilding' | 'ready' | 'all';

const DIMENSIONS = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
] as const;

function calculateStats(values: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  percentiles: { p25: number; p50: number; p75: number; p90: number };
} {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      percentiles: { p25: 0, p50: 0, p75: 0, p90: 0 },
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = Math.round(sum / values.length);

  const midIndex = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[midIndex - 1] + sorted[midIndex]) / 2)
    : sorted[midIndex];

  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.round(Math.sqrt(avgSquaredDiff) * 10) / 10;

  const getPercentileValue = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  };

  return {
    mean,
    median,
    stdDev,
    percentiles: {
      p25: getPercentileValue(25),
      p50: getPercentileValue(50),
      p75: getPercentileValue(75),
      p90: getPercentileValue(90),
    },
  };
}

function calculateDistribution(values: number[]): Record<string, number> {
  const total = values.length;
  if (total === 0) {
    return { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  }

  const ranges = {
    '0-20': values.filter(v => v >= 0 && v <= 20).length,
    '21-40': values.filter(v => v >= 21 && v <= 40).length,
    '41-60': values.filter(v => v >= 41 && v <= 60).length,
    '61-80': values.filter(v => v >= 61 && v <= 80).length,
    '81-100': values.filter(v => v >= 81 && v <= 100).length,
  };

  return Object.fromEntries(
    Object.entries(ranges).map(([k, v]) => [k, Math.round((v / total) * 100) / 100])
  );
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const url = new URL(request.url);
    return sandboxResponse('ers_benchmarks', {
      cohort: url.searchParams.get('cohort') || 'same_partner',
      period: url.searchParams.get('period') || '30d',
      stage: url.searchParams.get('stage') || 'all',
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
    return partnerApiError('Rate limit exceeded', 'RATE_LIMITED', 429, undefined, rateLimit);
  }

  try {
    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Parse query params
    const url = new URL(request.url);
    const cohort = (url.searchParams.get('cohort') || 'same_partner') as CohortType;
    const period = (url.searchParams.get('period') || '30d') as PeriodType;
    const stage = (url.searchParams.get('stage') || 'all') as StageType;

    // Calculate date filter
    let dateFilter: string | null = null;
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Build cohort query
    let cohortQuery = supabase
      .from('partner_ers_scores')
      .select('score, emotional_stability, self_reflection, coping_capacity, behavioral_engagement, social_readiness, stage, calculated_at');

    if (cohort === 'same_partner') {
      // Get all partner users first
      const { data: partnerUsers } = await supabase
        .from('partner_users')
        .select('id')
        .eq('partner_id', partnerId);

      if (partnerUsers && partnerUsers.length > 0) {
        cohortQuery = cohortQuery.in('partner_user_id', partnerUsers.map(u => u.id));
      } else {
        // No users, return empty benchmarks
        await logPartnerApiUsage(partnerId, '/api/v1/partner/ers/benchmarks', 'GET', 200, Date.now() - startTime);
        return partnerApiSuccess({
          cohort,
          cohortSize: 0,
          period,
          stage,
          benchmarks: null,
          warning: 'No users found for this partner.',
        }, 200, undefined, rateLimit);
      }
    }

    if (stage !== 'all') {
      cohortQuery = cohortQuery.eq('stage', stage);
    }

    if (dateFilter) {
      cohortQuery = cohortQuery.gte('calculated_at', dateFilter);
    }

    const { data: cohortScores, error: cohortError } = await cohortQuery;

    if (cohortError) {
      console.error('Error fetching cohort scores:', cohortError);
      await logPartnerApiUsage(partnerId, '/api/v1/partner/ers/benchmarks', 'GET', 500, Date.now() - startTime);
      return partnerApiError('Failed to fetch benchmark data', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    const cohortSize = cohortScores?.length || 0;
    const scores = cohortScores?.map(s => s.score) || [];

    // Calculate overall stats
    const overallStats = calculateStats(scores);
    const distribution = calculateDistribution(scores);

    // Calculate dimension stats
    const dimensionStats: Record<string, { mean: number; median: number; stdDev: number }> = {};

    for (const dim of DIMENSIONS) {
      const dimScores = cohortScores?.map(s => s[dim] as number).filter(v => v != null) || [];
      const stats = calculateStats(dimScores);
      dimensionStats[dim] = {
        mean: stats.mean,
        median: stats.median,
        stdDev: stats.stdDev,
      };
    }

    // Calculate by-stage stats (only if stage filter is 'all')
    let byStage: Record<string, { count: number; meanScore: number; avgDaysInStage: number }> | null = null;

    if (stage === 'all' && cohortScores && cohortScores.length > 0) {
      const stages = ['healing', 'rebuilding', 'ready'];
      byStage = {};

      for (const s of stages) {
        const stageScores = cohortScores.filter(score => score.stage === s);
        const count = stageScores.length;
        const meanScore = count > 0
          ? Math.round(stageScores.reduce((sum, sc) => sum + sc.score, 0) / count)
          : 0;

        // Estimate average days in stage (simplified - would need more data in production)
        const avgDaysInStage = s === 'healing' ? 21 : s === 'rebuilding' ? 34 : 18;

        byStage[s] = { count, meanScore, avgDaysInStage };
      }
    }

    // Build response
    const response: Record<string, unknown> = {
      cohort,
      cohortSize,
      period,
      stage,
      benchmarks: {
        overall: {
          mean: overallStats.mean,
          median: overallStats.median,
          stdDev: overallStats.stdDev,
          percentiles: overallStats.percentiles,
          distribution,
        },
        dimensions: dimensionStats,
        ...(byStage && { byStage }),
      },
    };

    // Add warning for small cohort sizes
    if (cohortSize < 10) {
      response.warning = 'Cohort size is less than 10. Benchmarks may not be statistically significant.';
    }

    await logPartnerApiUsage(partnerId, '/api/v1/partner/ers/benchmarks', 'GET', 200, Date.now() - startTime);
    return partnerApiSuccess(response, 200, undefined, rateLimit);
  } catch (error) {
    console.error('ERS benchmarks error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/ers/benchmarks', 'GET', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined);
  }
}
