/**
 * GET /api/v1/partner/analytics/dashboard
 *
 * Comprehensive analytics data for partner dashboard visualizations.
 * Returns assessment volume, ERS distribution, dimension heatmap, stage funnel, and top signals.
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

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('analytics_dashboard', {});
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
    const periodParam = searchParams.get('period') || '30d';
    const granularity = searchParams.get('granularity') || 'daily';

    // Calculate date range
    const periodDays = periodParam === 'all' ? 90 : parseInt(periodParam.replace('d', ''));
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // ============================================================================
    // 1. Assessment Volume Chart Data
    // ============================================================================
    const { data: assessments, error: assessmentsError } = await supabase
      .from('text_assessments')
      .select('id, created_at, ers_score')
      .eq('partner_id', partnerId)
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: true });

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
    }

    // Group by date based on granularity
    const volumeMap = new Map<string, number>();
    for (const assessment of assessments || []) {
      const date = new Date(assessment.created_at);
      let key: string;
      if (granularity === 'weekly') {
        // Get week start (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      } else {
        key = date.toISOString().split('T')[0];
      }
      volumeMap.set(key, (volumeMap.get(key) || 0) + 1);
    }

    // Fill in missing dates
    const volumeData: Array<{ date: string; count: number }> = [];
    const current = new Date(periodStart);
    const today = new Date();
    while (current <= today) {
      const key = current.toISOString().split('T')[0];
      if (granularity === 'daily' ||
          (granularity === 'weekly' && current.getDay() === 0) ||
          (granularity === 'monthly' && current.getDate() === 1)) {
        volumeData.push({
          date: key,
          count: volumeMap.get(key) || 0,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    // ============================================================================
    // 2. ERS Distribution Histogram
    // ============================================================================
    const ersDistribution: Array<{ range: string; count: number; percentage: number }> = [];
    const buckets = [
      { min: 0, max: 20, label: '0-20' },
      { min: 21, max: 40, label: '21-40' },
      { min: 41, max: 60, label: '41-60' },
      { min: 61, max: 80, label: '61-80' },
      { min: 81, max: 100, label: '81-100' },
    ];

    const totalAssessments = assessments?.length || 0;
    for (const bucket of buckets) {
      const count = (assessments || []).filter(
        a => a.ers_score >= bucket.min && a.ers_score <= bucket.max
      ).length;
      ersDistribution.push({
        range: bucket.label,
        count,
        percentage: totalAssessments > 0 ? Math.round((count / totalAssessments) * 100) : 0,
      });
    }

    // ============================================================================
    // 3. Dimension Heatmap
    // ============================================================================
    const { data: dimensionData, error: dimensionError } = await supabase
      .from('text_assessments')
      .select(`
        dim_emotional_stability,
        dim_self_reflection,
        dim_coping_capacity,
        dim_behavioral_engagement,
        dim_social_readiness
      `)
      .eq('partner_id', partnerId)
      .gte('created_at', periodStart.toISOString());

    if (dimensionError) {
      console.error('Error fetching dimension data:', dimensionError);
    }

    const dimensions = [
      { key: 'dim_emotional_stability', name: 'Emotional Stability' },
      { key: 'dim_self_reflection', name: 'Self Reflection' },
      { key: 'dim_coping_capacity', name: 'Coping Capacity' },
      { key: 'dim_behavioral_engagement', name: 'Behavioral Engagement' },
      { key: 'dim_social_readiness', name: 'Social Readiness' },
    ];

    const dimensionHeatmap = dimensions.map(dim => {
      const values = (dimensionData || [])
        .map(d => d[dim.key as keyof typeof d] as number)
        .filter(v => v !== null && v !== undefined);

      const avg = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;

      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted.length > 0
        ? sorted[Math.floor(sorted.length / 2)]
        : 0;

      // Calculate distribution
      const low = values.filter(v => v < 40).length;
      const medium = values.filter(v => v >= 40 && v < 70).length;
      const high = values.filter(v => v >= 70).length;

      return {
        dimension: dim.name,
        average: avg,
        median,
        sampleSize: values.length,
        distribution: {
          low: values.length > 0 ? Math.round((low / values.length) * 100) : 0,
          medium: values.length > 0 ? Math.round((medium / values.length) * 100) : 0,
          high: values.length > 0 ? Math.round((high / values.length) * 100) : 0,
        },
      };
    });

    // ============================================================================
    // 4. Stage Funnel
    // ============================================================================
    const { data: stageData, error: stageError } = await supabase
      .from('text_assessments')
      .select('readiness_label')
      .eq('partner_id', partnerId)
      .gte('created_at', periodStart.toISOString());

    if (stageError) {
      console.error('Error fetching stage data:', stageError);
    }

    const stageCounts = {
      Healing: 0,
      Rebuilding: 0,
      Ready: 0,
    };

    for (const item of stageData || []) {
      const stage = item.readiness_label as keyof typeof stageCounts;
      if (stage in stageCounts) {
        stageCounts[stage]++;
      }
    }

    const totalStages = stageCounts.Healing + stageCounts.Rebuilding + stageCounts.Ready;
    const stageFunnel = [
      {
        stage: 'Healing',
        count: stageCounts.Healing,
        percentage: totalStages > 0 ? Math.round((stageCounts.Healing / totalStages) * 100) : 0,
      },
      {
        stage: 'Rebuilding',
        count: stageCounts.Rebuilding,
        percentage: totalStages > 0 ? Math.round((stageCounts.Rebuilding / totalStages) * 100) : 0,
      },
      {
        stage: 'Ready',
        count: stageCounts.Ready,
        percentage: totalStages > 0 ? Math.round((stageCounts.Ready / totalStages) * 100) : 0,
      },
    ];

    // Calculate conversion rates
    const healingToRebuilding = stageCounts.Healing > 0
      ? Math.round(((stageCounts.Rebuilding + stageCounts.Ready) / (stageCounts.Healing + stageCounts.Rebuilding + stageCounts.Ready)) * 100)
      : 0;
    const rebuildingToReady = (stageCounts.Healing + stageCounts.Rebuilding) > 0
      ? Math.round((stageCounts.Ready / (stageCounts.Rebuilding + stageCounts.Ready || 1)) * 100)
      : 0;

    // ============================================================================
    // 5. Benchmark Comparison (from benchmark engine)
    // ============================================================================
    const { data: partnerVertical } = await supabase
      .from('api_keys')
      .select('vertical')
      .eq('id', partnerId)
      .single();

    let benchmarkComparison = null;
    if (partnerVertical?.vertical) {
      // Get latest benchmark for this vertical
      const { data: benchmarks } = await supabase
        .from('benchmark_snapshots')
        .select('*')
        .eq('vertical', partnerVertical.vertical)
        .eq('period', 'weekly')
        .order('period_start', { ascending: false })
        .limit(6);

      // Get partner's stats
      const { data: partnerStats } = await supabase
        .from('partner_benchmark_stats')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('period', 'weekly')
        .order('period_start', { ascending: false })
        .limit(6);

      if (benchmarks && benchmarks.length > 0) {
        const latestBenchmarks = new Map(
          benchmarks.map(b => [b.dimension, b])
        );
        const latestPartnerStats = new Map(
          (partnerStats || []).map(s => [s.dimension, s])
        );

        benchmarkComparison = {
          vertical: partnerVertical.vertical,
          dimensions: dimensions.map(dim => {
            const dimKey = dim.key.replace('dim_', '');
            const benchmark = latestBenchmarks.get(dimKey);
            const partnerStat = latestPartnerStats.get(dimKey);

            return {
              dimension: dim.name,
              verticalAvg: benchmark?.avg_score || null,
              partnerAvg: partnerStat?.partner_avg_score || null,
              percentile: partnerStat?.vertical_percentile || null,
              trend: partnerStat?.trend_direction || null,
            };
          }),
          overall: {
            verticalAvg: latestBenchmarks.get('overall_ers')?.avg_score || null,
            partnerAvg: latestPartnerStats.get('overall_ers')?.partner_avg_score || null,
            percentile: latestPartnerStats.get('overall_ers')?.vertical_percentile || null,
          },
        };
      }
    }

    // ============================================================================
    // 6. Top Signals Table
    // ============================================================================
    // Note: Signals are stored in the analysis but we need to aggregate them
    // For now, we'll compute the most common patterns from dimension scores
    const topSignals: Array<{ signal: string; frequency: number; dimension: string; sentiment: 'positive' | 'negative' | 'neutral' }> = [];

    // Analyze dimension patterns to derive signals
    for (const dim of dimensionHeatmap) {
      if (dim.distribution.high > 50) {
        topSignals.push({
          signal: `Strong ${dim.dimension.toLowerCase()}`,
          frequency: dim.distribution.high,
          dimension: dim.dimension,
          sentiment: 'positive',
        });
      } else if (dim.distribution.low > 50) {
        topSignals.push({
          signal: `${dim.dimension} needs attention`,
          frequency: dim.distribution.low,
          dimension: dim.dimension,
          sentiment: 'negative',
        });
      } else {
        topSignals.push({
          signal: `Moderate ${dim.dimension.toLowerCase()}`,
          frequency: dim.distribution.medium,
          dimension: dim.dimension,
          sentiment: 'neutral',
        });
      }
    }

    // Sort by frequency
    topSignals.sort((a, b) => b.frequency - a.frequency);

    // ============================================================================
    // Summary Stats
    // ============================================================================
    const avgErs = assessments && assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + a.ers_score, 0) / assessments.length)
      : null;

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/analytics/dashboard',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      period: periodParam,
      granularity,
      summary: {
        totalAssessments: totalAssessments,
        averageErs: avgErs,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date().toISOString(),
      },
      assessmentVolume: volumeData,
      ersDistribution,
      dimensionHeatmap,
      stageFunnel: {
        stages: stageFunnel,
        conversionRates: {
          healingToRebuilding,
          rebuildingToReady,
        },
      },
      benchmarkComparison,
      topSignals: topSignals.slice(0, 10),
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/analytics/dashboard',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
