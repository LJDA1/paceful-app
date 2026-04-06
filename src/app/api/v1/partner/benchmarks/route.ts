/**
 * GET /api/v1/partner/benchmarks
 *
 * Get benchmark data for a partner's vertical.
 * Partners can only see benchmarks for their own vertical (enforced via vertical filter).
 *
 * Query params:
 * - vertical: (optional) defaults to partner's vertical
 * - period: (optional) 'weekly' | 'monthly' | 'quarterly', defaults to 'weekly'
 *
 * Returns:
 * - Per-dimension averages for their vertical
 * - Their partner's averages vs vertical averages
 * - Percentile rank ("Your users' emotional stability is in the 72nd percentile")
 * - Trend (is their user base improving vs the vertical trend?)
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

const DIMENSIONS = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
  'overall_ers',
] as const;

type Dimension = typeof DIMENSIONS[number];

interface DimensionBenchmark {
  dimension: Dimension;
  displayName: string;
  verticalAvg: number;
  verticalMedian: number;
  verticalP25: number;
  verticalP75: number;
  partnerAvg: number | null;
  partnerSampleSize: number;
  percentileRank: number | null;
  percentileLabel: string | null;
  trend: 'improving' | 'declining' | 'stable' | null;
  previousAvg: number | null;
}

const DIMENSION_DISPLAY_NAMES: Record<Dimension, string> = {
  emotional_stability: 'Emotional Stability',
  self_reflection: 'Self Reflection',
  coping_capacity: 'Coping Capacity',
  behavioral_engagement: 'Behavioral Engagement',
  social_readiness: 'Social Readiness',
  overall_ers: 'Overall ERS',
};

function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return 'Exceptional';
  if (percentile >= 75) return 'Above Average';
  if (percentile >= 50) return 'Average';
  if (percentile >= 25) return 'Below Average';
  return 'Needs Attention';
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('benchmarks', {});
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
    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || 'weekly';

    // Validate period
    const validPeriods = ['weekly', 'monthly', 'quarterly'];
    if (!validPeriods.includes(periodParam)) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/benchmarks',
        'GET',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'Invalid period. Use: weekly, monthly, or quarterly',
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    // Get partner's vertical from api_keys
    const { data: partnerData, error: partnerError } = await supabase
      .from('api_keys')
      .select('vertical')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partnerData?.vertical) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/benchmarks',
        'GET',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'No vertical configured for this partner. Contact support to set your industry vertical.',
        'NO_VERTICAL',
        400,
        undefined,
        rateLimit
      );
    }

    const vertical = partnerData.vertical;

    // Get latest benchmark snapshots for this vertical
    const { data: benchmarks, error: benchmarksError } = await supabase
      .from('benchmark_snapshots')
      .select('*')
      .eq('vertical', vertical)
      .eq('period', periodParam)
      .order('period_start', { ascending: false })
      .limit(DIMENSIONS.length);

    if (benchmarksError) {
      console.error('[Benchmarks] Error fetching benchmarks:', benchmarksError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/benchmarks',
        'GET',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch benchmarks', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    // Get partner's stats for comparison
    const { data: partnerStats, error: statsError } = await supabase
      .from('partner_benchmark_stats')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('vertical', vertical)
      .eq('period', periodParam)
      .order('period_start', { ascending: false })
      .limit(DIMENSIONS.length);

    if (statsError) {
      console.error('[Benchmarks] Error fetching partner stats:', statsError);
    }

    // Create a map of partner stats by dimension
    const partnerStatsMap = new Map(
      (partnerStats || []).map(s => [s.dimension, s])
    );

    // Create a map of benchmarks by dimension
    const benchmarksMap = new Map(
      (benchmarks || []).map(b => [b.dimension, b])
    );

    // Build response
    const dimensionBenchmarks: DimensionBenchmark[] = [];

    for (const dimension of DIMENSIONS) {
      const benchmark = benchmarksMap.get(dimension);
      const partnerStat = partnerStatsMap.get(dimension);

      dimensionBenchmarks.push({
        dimension,
        displayName: DIMENSION_DISPLAY_NAMES[dimension],
        verticalAvg: benchmark?.avg_score ?? 0,
        verticalMedian: benchmark?.median_score ?? 0,
        verticalP25: benchmark?.p25 ?? 0,
        verticalP75: benchmark?.p75 ?? 0,
        partnerAvg: partnerStat?.partner_avg_score ?? null,
        partnerSampleSize: partnerStat?.partner_sample_size ?? 0,
        percentileRank: partnerStat?.vertical_percentile ?? null,
        percentileLabel: partnerStat?.vertical_percentile
          ? getPercentileLabel(partnerStat.vertical_percentile)
          : null,
        trend: partnerStat?.trend_direction ?? null,
        previousAvg: partnerStat?.previous_avg_score ?? null,
      });
    }

    // Get overall ERS for summary
    const overallBenchmark = dimensionBenchmarks.find(d => d.dimension === 'overall_ers');

    // Calculate aggregate stats
    const partnerDimensions = dimensionBenchmarks.filter(
      d => d.dimension !== 'overall_ers' && d.partnerAvg !== null
    );
    const avgPercentile = partnerDimensions.length > 0
      ? Math.round(
          partnerDimensions.reduce((sum, d) => sum + (d.percentileRank || 0), 0) /
          partnerDimensions.length
        )
      : null;

    // Get benchmark period info
    const latestBenchmark = benchmarks?.[0];
    const periodStart = latestBenchmark?.period_start;
    const periodEnd = latestBenchmark?.period_end;
    const sampleSize = latestBenchmark?.sample_size;

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/benchmarks',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      vertical,
      period: periodParam,
      periodStart,
      periodEnd,
      verticalSampleSize: sampleSize,
      summary: {
        overallErsVerticalAvg: overallBenchmark?.verticalAvg ?? null,
        overallErsPartnerAvg: overallBenchmark?.partnerAvg ?? null,
        overallPercentile: overallBenchmark?.percentileRank ?? null,
        overallPercentileLabel: overallBenchmark?.percentileLabel ?? null,
        overallTrend: overallBenchmark?.trend ?? null,
        avgPercentileAcrossDimensions: avgPercentile,
      },
      dimensions: dimensionBenchmarks,
      insights: generateInsights(dimensionBenchmarks, vertical),
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('[Benchmarks] Error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/benchmarks',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}

/**
 * Generate human-readable insights from benchmark data
 */
function generateInsights(dimensions: DimensionBenchmark[], vertical: string): string[] {
  const insights: string[] = [];

  // Find strongest and weakest dimensions
  const rankedDimensions = dimensions
    .filter(d => d.dimension !== 'overall_ers' && d.percentileRank !== null)
    .sort((a, b) => (b.percentileRank || 0) - (a.percentileRank || 0));

  if (rankedDimensions.length > 0) {
    const strongest = rankedDimensions[0];
    const weakest = rankedDimensions[rankedDimensions.length - 1];

    if (strongest.percentileRank && strongest.percentileRank >= 50) {
      insights.push(
        `Your users' ${strongest.displayName.toLowerCase()} is in the ${strongest.percentileRank}${getOrdinalSuffix(strongest.percentileRank)} percentile for ${formatVertical(vertical)} - a key strength.`
      );
    }

    if (weakest.percentileRank && weakest.percentileRank < 50) {
      insights.push(
        `${weakest.displayName} (${weakest.percentileRank}${getOrdinalSuffix(weakest.percentileRank)} percentile) represents an opportunity for improvement.`
      );
    }
  }

  // Trend insights
  const improvingDimensions = dimensions.filter(d => d.trend === 'improving');
  const decliningDimensions = dimensions.filter(d => d.trend === 'declining');

  if (improvingDimensions.length > 0) {
    const names = improvingDimensions.map(d => d.displayName.toLowerCase()).join(', ');
    insights.push(`Positive trend: ${names} ${improvingDimensions.length === 1 ? 'is' : 'are'} improving.`);
  }

  if (decliningDimensions.length > 0) {
    const names = decliningDimensions.map(d => d.displayName.toLowerCase()).join(', ');
    insights.push(`Watch area: ${names} ${decliningDimensions.length === 1 ? 'has' : 'have'} declined since last period.`);
  }

  // Overall insight
  const overall = dimensions.find(d => d.dimension === 'overall_ers');
  if (overall?.percentileRank !== null && overall?.percentileRank !== undefined) {
    if (overall.percentileRank >= 75) {
      insights.push(`Your users are performing well above the ${formatVertical(vertical)} average overall.`);
    } else if (overall.percentileRank >= 50) {
      insights.push(`Your users are performing at or above the ${formatVertical(vertical)} average.`);
    } else {
      insights.push(`There's room to improve your users' emotional readiness compared to other ${formatVertical(vertical)} platforms.`);
    }
  }

  return insights;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatVertical(vertical: string): string {
  return vertical.toLowerCase().replace(/_/g, ' ');
}
