/**
 * GET /api/v1/partner/ers/[externalId]/compare
 *
 * Compare a user's ERS scores against cohort averages.
 * Answers: "How is this user doing compared to similar users?"
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

type CohortType = 'all' | 'same_stage' | 'same_partner' | 'global';
type PeriodType = '7d' | '30d' | '90d' | 'all';
type RelativePosition = 'well_below_average' | 'below_average' | 'average' | 'above_average' | 'well_above_average';

const DIMENSIONS = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
] as const;

type Dimension = typeof DIMENSIONS[number];

function getRelativePosition(percentile: number): RelativePosition {
  if (percentile < 25) return 'well_below_average';
  if (percentile < 40) return 'below_average';
  if (percentile < 60) return 'average';
  if (percentile < 75) return 'above_average';
  return 'well_above_average';
}

function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 50;
  const count = sortedValues.filter(v => v < value).length;
  return Math.round((count / sortedValues.length) * 100);
}

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

function generateSummary(
  userScore: number,
  percentileRank: number,
  strongestDim: { dimension: string; percentileRank: number },
  cohortType: string
): string {
  const cohortLabel = cohortType === 'same_stage' ? 'users at the same stage' :
    cohortType === 'same_partner' ? 'users in your platform' :
    cohortType === 'global' ? 'all users globally' : 'all users';

  const dimLabel = strongestDim.dimension.replace(/_/g, ' ');

  let progress = '';
  if (percentileRank >= 75) {
    progress = `progressing faster than ${percentileRank}% of ${cohortLabel}`;
  } else if (percentileRank >= 50) {
    progress = `performing better than ${percentileRank}% of ${cohortLabel}`;
  } else if (percentileRank >= 25) {
    progress = `on par with most ${cohortLabel}, with room for growth`;
  } else {
    progress = `in the early stages compared to ${cohortLabel}, with significant growth potential`;
  }

  return `This user's ${dimLabel} is significantly above the cohort average, ranking in the ${strongestDim.percentileRank}th percentile. Overall, they are ${progress}.`;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ externalId: string }> }
) {
  const startTime = Date.now();
  const { externalId } = await params;

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('ers_compare', { externalId });
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
    const cohort = (url.searchParams.get('cohort') || 'all') as CohortType;
    const period = (url.searchParams.get('period') || '30d') as PeriodType;

    // Look up the user
    const { data: partnerUser, error: userError } = await supabase
      .from('partner_users')
      .select('id, external_id')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .single();

    if (userError || !partnerUser) {
      await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/compare`, 'GET', 404, Date.now() - startTime);
      return partnerApiError('User not found', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Get user's latest ERS score
    const { data: userScore, error: scoreError } = await supabase
      .from('partner_ers_scores')
      .select('*')
      .eq('partner_user_id', partnerUser.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (scoreError || !userScore) {
      await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/compare`, 'GET', 404, Date.now() - startTime);
      return partnerApiError('No ERS score found for this user', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Calculate date filter for cohort
    let dateFilter: string | null = null;
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Build cohort query
    let cohortQuery = supabase
      .from('partner_ers_scores')
      .select('score, emotional_stability, self_reflection, coping_capacity, behavioral_engagement, social_readiness, stage');

    if (cohort === 'same_partner') {
      // Get all partner users first
      const { data: partnerUsers } = await supabase
        .from('partner_users')
        .select('id')
        .eq('partner_id', partnerId);

      if (partnerUsers && partnerUsers.length > 0) {
        cohortQuery = cohortQuery.in('partner_user_id', partnerUsers.map(u => u.id));
      }
    } else if (cohort === 'same_stage') {
      // Filter by same stage
      cohortQuery = cohortQuery.eq('stage', userScore.stage);
    }
    // For 'all' and 'global', we use all scores

    if (dateFilter) {
      cohortQuery = cohortQuery.gte('calculated_at', dateFilter);
    }

    const { data: cohortScores, error: cohortError } = await cohortQuery;

    if (cohortError) {
      console.error('Error fetching cohort scores:', cohortError);
      await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/compare`, 'GET', 500, Date.now() - startTime);
      return partnerApiError('Failed to fetch cohort data', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    const cohortSize = cohortScores?.length || 0;
    const scores = cohortScores?.map(s => s.score) || [];
    const sortedScores = [...scores].sort((a, b) => a - b);

    // Calculate overall stats
    const overallStats = calculateStats(scores);
    const userPercentile = calculatePercentile(userScore.score, sortedScores);

    // Calculate dimension stats
    const dimensionComparisons: Record<string, {
      userScore: number;
      cohortMean: number;
      percentileRank: number;
      gap: number;
      relativePosition: RelativePosition;
    }> = {};

    let strongestDim = { dimension: '', gap: -Infinity, percentileRank: 0 };
    let weakestDim = { dimension: '', gap: Infinity, percentileRank: 100 };

    for (const dim of DIMENSIONS) {
      const dimScores = cohortScores?.map(s => s[dim] as number).filter(v => v != null) || [];
      const sortedDimScores = [...dimScores].sort((a, b) => a - b);
      const dimStats = calculateStats(dimScores);
      const userDimScore = userScore[dim] as number || 0;
      const dimPercentile = calculatePercentile(userDimScore, sortedDimScores);
      const gap = userDimScore - dimStats.mean;

      dimensionComparisons[dim] = {
        userScore: userDimScore,
        cohortMean: dimStats.mean,
        percentileRank: dimPercentile,
        gap,
        relativePosition: getRelativePosition(dimPercentile),
      };

      if (gap > strongestDim.gap) {
        strongestDim = { dimension: dim, gap, percentileRank: dimPercentile };
      }
      if (gap < weakestDim.gap) {
        weakestDim = { dimension: dim, gap, percentileRank: dimPercentile };
      }
    }

    // Build response
    const response: Record<string, unknown> = {
      userId: externalId,
      currentScore: userScore.score,
      currentStage: userScore.stage,
      cohort,
      cohortSize,
      comparison: {
        overall: {
          userScore: userScore.score,
          cohortMean: overallStats.mean,
          cohortMedian: overallStats.median,
          cohortStdDev: overallStats.stdDev,
          percentileRank: userPercentile,
          percentiles: overallStats.percentiles,
          relativePosition: getRelativePosition(userPercentile),
        },
        dimensions: dimensionComparisons,
        insights: {
          strongestDimension: strongestDim,
          weakestDimension: weakestDim,
          summary: generateSummary(userScore.score, userPercentile, strongestDim, cohort),
        },
      },
    };

    // Add warning for small cohort sizes
    if (cohortSize < 10) {
      response.warning = 'Cohort size is less than 10. Benchmarks may not be statistically significant.';
    }

    await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/compare`, 'GET', 200, Date.now() - startTime);
    return partnerApiSuccess(response, 200, undefined, rateLimit);
  } catch (error) {
    console.error('ERS compare error:', error);
    await logPartnerApiUsage(validation.partnerId!, `/api/v1/partner/ers/${externalId}/compare`, 'GET', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined);
  }
}
