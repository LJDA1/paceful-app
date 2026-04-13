/**
 * GET /api/v1/signals/gambling/compliance-report
 *
 * Returns an audit-ready compliance report for a user:
 * - All RGS scores over the period with dimension breakdown
 * - All threshold breaches detected
 * - All interventions triggered (recommended_action ≠ monitor)
 * - Timeline of score changes
 *
 * Query params:
 *   user_id  (required)
 *   period   7d | 30d | 90d (default: 30d)
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

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(validation.error || 'Invalid API key', 'UNAUTHORIZED', 401);
  }

  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, '/api/v1/signals/gambling/compliance-report');
  if (!rateLimit.allowed) {
    return partnerApiError(
      `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`,
      'RATE_LIMITED', 429, undefined, rateLimit
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const periodParam = searchParams.get('period') || '30d';

    if (!userId || userId.trim() === '') {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/compliance-report', 'GET', 400, Date.now() - startTime);
      return partnerApiError('user_id query parameter is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const validPeriods: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    if (!validPeriods[periodParam]) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/compliance-report', 'GET', 400, Date.now() - startTime);
      return partnerApiError('period must be one of: 7d, 30d, 90d', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const periodDays = validPeriods[periodParam];
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseAdmin();

    const { data: records, error: fetchError } = await supabase
      .from('gambling_signals')
      .select('*')
      .eq('partner_id', validation.partnerId)
      .eq('user_id', userId.trim())
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Compliance report fetch error:', fetchError);
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/compliance-report', 'GET', 500, Date.now() - startTime);
      return partnerApiError('Failed to fetch compliance data', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    if (!records || records.length === 0) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/compliance-report', 'GET', 404, Date.now() - startTime);
      return partnerApiError(
        `No signal records found for user_id "${userId.trim()}" in the last ${periodDays} days.`,
        'NOT_FOUND', 404, undefined, rateLimit
      );
    }

    // Build timeline
    const timeline = records.map((r, i) => {
      const prev = i > 0 ? records[i - 1] : null;
      const delta = prev !== null ? r.rgs_score - prev.rgs_score : null;

      return {
        timestamp: r.created_at,
        rgs_score: r.rgs_score,
        rgs_label: r.rgs_label,
        confidence: r.overall_confidence,
        delta_from_previous: delta,
        dimensions: {
          emotional_stability: r.dim_emotional_stability,
          self_reflection: r.dim_self_reflection,
          coping_capacity: r.dim_coping_capacity,
          behavioral_engagement: r.dim_behavioral_engagement,
          social_readiness: r.dim_social_readiness,
        },
        recommended_action: r.recommended_action,
        thresholds_breached: r.thresholds_breached || [],
      };
    });

    // Extract all interventions (action ≠ monitor)
    const interventions = records
      .filter(r => r.recommended_action && r.recommended_action !== 'monitor')
      .map(r => ({
        timestamp: r.created_at,
        action: r.recommended_action,
        rgs_score: r.rgs_score,
        alerts: r.thresholds_breached || [],
      }));

    // Extract all unique threshold breach types
    const allBreachTypes = new Set<string>();
    for (const r of records) {
      const breaches = (r.thresholds_breached || []) as { type: string }[];
      for (const b of breaches) {
        if (b.type) allBreachTypes.add(b.type);
      }
    }

    // Summary statistics
    const scores = records.map(r => r.rgs_score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const latestScore = scores[scores.length - 1];
    const earliestScore = scores[0];
    const overallTrend =
      latestScore > earliestScore + 3 ? 'improving'
      : latestScore < earliestScore - 3 ? 'declining'
      : 'stable';

    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/signals/gambling/compliance-report',
      'GET',
      200,
      Date.now() - startTime,
      { user_id: userId, period: periodParam, records: records.length }
    );

    return partnerApiSuccess({
      success: true,
      report: {
        user_id: userId.trim(),
        partner_id: validation.partnerId,
        period: periodParam,
        generated_at: new Date().toISOString(),
        period_start: since,
        period_end: new Date().toISOString(),

        summary: {
          total_assessments: records.length,
          average_rgs_score: avgScore,
          min_rgs_score: minScore,
          max_rgs_score: maxScore,
          latest_rgs_score: latestScore,
          overall_trend: overallTrend,
          total_interventions: interventions.length,
          restrict_count: interventions.filter(i => i.action === 'restrict').length,
          intervene_count: interventions.filter(i => i.action === 'intervene').length,
          unique_breach_types: Array.from(allBreachTypes),
        },

        timeline,
        interventions,

        // Audit metadata
        audit: {
          report_version: '1.0',
          data_source: 'gambling_signals',
          scoring_method: 'deterministic_signal_mapping',
          api_version: '1.3.0',
        },
      },
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Compliance report error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/compliance-report', 'GET', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
