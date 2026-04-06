/**
 * POST /api/cron/generate-benchmarks
 *
 * Weekly cron job to generate benchmark snapshots by vertical.
 * Aggregates all partner assessments and computes per-dimension percentiles.
 * Only generates benchmarks when sample_size >= 50 (privacy threshold).
 *
 * Should run weekly (e.g., Sunday at midnight UTC).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CRON_SECRET = process.env.CRON_SECRET;
const MINIMUM_SAMPLE_SIZE = 50;

const DIMENSIONS = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
  'overall_ers',
] as const;

type Dimension = typeof DIMENSIONS[number];

interface DimensionStats {
  avg: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  stdDev: number;
  count: number;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

/**
 * Calculate standard deviation
 */
function standardDeviation(arr: number[], mean: number): number {
  if (arr.length <= 1) return 0;
  const squaredDiffs = arr.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate statistics for an array of scores
 */
function calculateStats(scores: number[]): DimensionStats {
  if (scores.length === 0) {
    return { avg: 0, median: 0, p25: 0, p75: 0, min: 0, max: 0, stdDev: 0, count: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = sum / scores.length;

  return {
    avg: Math.round(avg * 100) / 100,
    median: Math.round(percentile(sorted, 50) * 100) / 100,
    p25: Math.round(percentile(sorted, 25) * 100) / 100,
    p75: Math.round(percentile(sorted, 75) * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: Math.round(standardDeviation(scores, avg) * 100) / 100,
    count: scores.length,
  };
}

/**
 * Calculate percentile rank of a value within a distribution
 */
function calculatePercentileRank(value: number, sortedArr: number[]): number {
  if (sortedArr.length === 0) return 50;
  let count = 0;
  for (const v of sortedArr) {
    if (v < value) count++;
    else break;
  }
  return Math.round((count / sortedArr.length) * 100);
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    benchmarksGenerated: 0,
    partnerStatsGenerated: 0,
    verticalsProcessed: 0,
    skippedLowSampleSize: [] as string[],
    errors: [] as string[],
  };

  try {
    const supabase = getSupabaseAdmin();

    // Calculate period (last 7 days)
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);
    periodStart.setHours(0, 0, 0, 0);

    console.log(`[Benchmarks] Generating for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    // Get all active partners with their verticals
    const { data: partners, error: partnersError } = await supabase
      .from('api_keys')
      .select('id, partner_name, vertical')
      .eq('is_active', true)
      .not('vertical', 'is', null);

    if (partnersError) {
      console.error('[Benchmarks] Failed to fetch partners:', partnersError);
      return NextResponse.json(
        { error: 'Failed to fetch partners', details: partnersError.message },
        { status: 500 }
      );
    }

    // Get unique verticals
    const verticals = [...new Set(partners?.map(p => p.vertical).filter(Boolean))] as string[];
    console.log(`[Benchmarks] Processing ${verticals.length} verticals:`, verticals);

    // For each vertical, aggregate assessments
    for (const vertical of verticals) {
      try {
        // Get partner IDs for this vertical
        const verticalPartnerIds = partners
          ?.filter(p => p.vertical === vertical)
          .map(p => p.id) || [];

        if (verticalPartnerIds.length === 0) continue;

        // Fetch all assessments for this vertical in the period
        const { data: assessments, error: assessmentsError } = await supabase
          .from('text_assessments')
          .select(`
            partner_id,
            ers_score,
            dim_emotional_stability,
            dim_self_reflection,
            dim_coping_capacity,
            dim_behavioral_engagement,
            dim_social_readiness
          `)
          .in('partner_id', verticalPartnerIds)
          .gte('created_at', periodStart.toISOString())
          .lte('created_at', periodEnd.toISOString());

        if (assessmentsError) {
          console.error(`[Benchmarks] Error fetching assessments for ${vertical}:`, assessmentsError);
          results.errors.push(`${vertical}: ${assessmentsError.message}`);
          continue;
        }

        if (!assessments || assessments.length < MINIMUM_SAMPLE_SIZE) {
          console.log(`[Benchmarks] Skipping ${vertical}: only ${assessments?.length || 0} samples (min: ${MINIMUM_SAMPLE_SIZE})`);
          results.skippedLowSampleSize.push(`${vertical} (${assessments?.length || 0})`);
          continue;
        }

        console.log(`[Benchmarks] Processing ${vertical}: ${assessments.length} assessments`);
        results.verticalsProcessed++;

        // Map dimension names to column names
        const dimensionColumns: Record<Dimension, string> = {
          emotional_stability: 'dim_emotional_stability',
          self_reflection: 'dim_self_reflection',
          coping_capacity: 'dim_coping_capacity',
          behavioral_engagement: 'dim_behavioral_engagement',
          social_readiness: 'dim_social_readiness',
          overall_ers: 'ers_score',
        };

        // Calculate stats for each dimension
        const benchmarkInserts = [];
        const dimensionScores: Record<Dimension, number[]> = {} as Record<Dimension, number[]>;

        for (const dimension of DIMENSIONS) {
          const column = dimensionColumns[dimension];
          const scores = assessments
            .map(a => a[column as keyof typeof a] as number)
            .filter(s => s !== null && s !== undefined);

          dimensionScores[dimension] = scores;

          if (scores.length >= MINIMUM_SAMPLE_SIZE) {
            const stats = calculateStats(scores);

            benchmarkInserts.push({
              vertical,
              dimension,
              avg_score: stats.avg,
              median_score: stats.median,
              p25: stats.p25,
              p75: stats.p75,
              min_score: stats.min,
              max_score: stats.max,
              std_dev: stats.stdDev,
              sample_size: stats.count,
              period: 'weekly',
              period_start: periodStart.toISOString().split('T')[0],
              period_end: periodEnd.toISOString().split('T')[0],
            });
          }
        }

        // Insert benchmark snapshots
        if (benchmarkInserts.length > 0) {
          const { error: insertError } = await supabase
            .from('benchmark_snapshots')
            .insert(benchmarkInserts);

          if (insertError) {
            console.error(`[Benchmarks] Error inserting benchmarks for ${vertical}:`, insertError);
            results.errors.push(`${vertical} insert: ${insertError.message}`);
          } else {
            results.benchmarksGenerated += benchmarkInserts.length;
          }
        }

        // Calculate per-partner stats for this vertical
        const partnerStatsInserts = [];

        for (const partnerId of verticalPartnerIds) {
          const partnerAssessments = assessments.filter(a => a.partner_id === partnerId);

          if (partnerAssessments.length < 5) continue; // Need at least 5 samples per partner

          for (const dimension of DIMENSIONS) {
            const column = dimensionColumns[dimension];
            const partnerScores = partnerAssessments
              .map(a => a[column as keyof typeof a] as number)
              .filter(s => s !== null && s !== undefined);

            if (partnerScores.length < 5) continue;

            const partnerAvg = partnerScores.reduce((a, b) => a + b, 0) / partnerScores.length;
            const sortedVerticalScores = [...dimensionScores[dimension]].sort((a, b) => a - b);
            const percentileRank = calculatePercentileRank(partnerAvg, sortedVerticalScores);

            // Get previous period's average for trend calculation
            const previousPeriodEnd = new Date(periodStart);
            previousPeriodEnd.setMilliseconds(-1);
            const previousPeriodStart = new Date(previousPeriodEnd);
            previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);

            const { data: prevStats } = await supabase
              .from('partner_benchmark_stats')
              .select('partner_avg_score')
              .eq('partner_id', partnerId)
              .eq('dimension', dimension)
              .gte('period_start', previousPeriodStart.toISOString().split('T')[0])
              .lte('period_end', previousPeriodEnd.toISOString().split('T')[0])
              .order('period_start', { ascending: false })
              .limit(1);

            const previousAvg = prevStats?.[0]?.partner_avg_score;
            let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';

            if (previousAvg !== undefined && previousAvg !== null) {
              const change = partnerAvg - previousAvg;
              if (change > 2) trendDirection = 'improving';
              else if (change < -2) trendDirection = 'declining';
            }

            partnerStatsInserts.push({
              partner_id: partnerId,
              vertical,
              dimension,
              partner_avg_score: Math.round(partnerAvg * 100) / 100,
              partner_sample_size: partnerScores.length,
              vertical_percentile: percentileRank,
              previous_avg_score: previousAvg,
              trend_direction: trendDirection,
              period: 'weekly',
              period_start: periodStart.toISOString().split('T')[0],
              period_end: periodEnd.toISOString().split('T')[0],
            });
          }
        }

        // Insert partner stats
        if (partnerStatsInserts.length > 0) {
          const { error: statsInsertError } = await supabase
            .from('partner_benchmark_stats')
            .insert(partnerStatsInserts);

          if (statsInsertError) {
            console.error(`[Benchmarks] Error inserting partner stats for ${vertical}:`, statsInsertError);
            results.errors.push(`${vertical} partner stats: ${statsInsertError.message}`);
          } else {
            results.partnerStatsGenerated += partnerStatsInserts.length;
          }
        }
      } catch (verticalError) {
        console.error(`[Benchmarks] Error processing vertical ${vertical}:`, verticalError);
        results.errors.push(`${vertical}: ${verticalError instanceof Error ? verticalError.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Benchmarks] Cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Support GET for testing
export async function GET(request: NextRequest) {
  return POST(request);
}
