/**
 * POST /api/v1/signals/gambling/threshold-check
 *
 * Retrieve the most recent gambling signal record for a user and
 * evaluate all partner-configured thresholds against it.
 *
 * Returns: { breached, alerts, recommended_action, snapshot }
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
import {
  checkThresholds,
  DEFAULT_GAMBLING_CONFIG,
  type GamblingSignals,
  type GamblingConfig,
  type DimensionWeights,
  type ThresholdConfig,
  type Dimension,
  type DimensionResult,
} from '@/lib/gambling-signals';

async function loadGamblingConfig(partnerId: string): Promise<GamblingConfig> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('partner_gambling_configs')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    if (error || !data) return DEFAULT_GAMBLING_CONFIG;

    return {
      dimension_weights: (data.dimension_weights as DimensionWeights) || DEFAULT_GAMBLING_CONFIG.dimension_weights,
      thresholds: {
        rgs_minimum: data.rgs_minimum ?? DEFAULT_GAMBLING_CONFIG.thresholds.rgs_minimum,
        dimension_minimum: data.dimension_minimum ?? DEFAULT_GAMBLING_CONFIG.thresholds.dimension_minimum,
        deposit_velocity_threshold: data.deposit_velocity_threshold ?? DEFAULT_GAMBLING_CONFIG.thresholds.deposit_velocity_threshold,
        loss_chase_threshold: data.loss_chase_threshold ?? DEFAULT_GAMBLING_CONFIG.thresholds.loss_chase_threshold,
        alert_on_rgs_breach: data.alert_on_rgs_breach ?? true,
        alert_on_dimension_breach: data.alert_on_dimension_breach ?? true,
        alert_on_velocity_breach: data.alert_on_velocity_breach ?? true,
        alert_on_loss_chase_breach: data.alert_on_loss_chase_breach ?? true,
      } satisfies ThresholdConfig,
      verbosity: data.verbosity || DEFAULT_GAMBLING_CONFIG.verbosity,
      tone: data.tone || DEFAULT_GAMBLING_CONFIG.tone,
      score_format: data.score_format || DEFAULT_GAMBLING_CONFIG.score_format,
      traffic_light_thresholds: (data.traffic_light_thresholds as { red_max: number; yellow_max: number }) || DEFAULT_GAMBLING_CONFIG.traffic_light_thresholds,
    };
  } catch {
    return DEFAULT_GAMBLING_CONFIG;
  }
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(validation.error || 'Invalid API key', 'UNAUTHORIZED', 401);
  }

  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, '/api/v1/signals/gambling/threshold-check');
  if (!rateLimit.allowed) {
    return partnerApiError(
      `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`,
      'RATE_LIMITED', 429, undefined, rateLimit
    );
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const { user_id } = body;

    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/threshold-check', 'POST', 400, Date.now() - startTime);
      return partnerApiError('user_id is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const supabase = getSupabaseAdmin();

    // Fetch the most recent signal record for this user under this partner
    const { data: record, error: fetchError } = await supabase
      .from('gambling_signals')
      .select('*')
      .eq('partner_id', validation.partnerId)
      .eq('user_id', user_id.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !record) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/threshold-check', 'POST', 404, Date.now() - startTime);
      return partnerApiError(
        `No signal records found for user_id "${user_id.trim()}". Call POST /api/v1/signals/gambling/ingest first.`,
        'NOT_FOUND', 404, undefined, rateLimit
      );
    }

    // Load current partner config (thresholds may have changed since ingestion)
    const config = await loadGamblingConfig(validation.partnerId!);

    // Reconstruct signals from stored record
    const signals: GamblingSignals = {
      session_duration_minutes: record.session_duration_minutes ?? undefined,
      session_frequency_daily: record.session_frequency_daily ?? undefined,
      deposit_amount: record.deposit_amount ?? undefined,
      deposit_velocity_change_pct: record.deposit_velocity_change_pct ?? undefined,
      loss_chase_score: record.loss_chase_score ?? undefined,
      late_night_sessions_pct: record.late_night_sessions_pct ?? undefined,
      deposit_limit_set: record.deposit_limit_set ?? undefined,
      deposit_limit_modified_down: record.deposit_limit_modified_down ?? undefined,
      self_exclusion_history: record.self_exclusion_history ?? undefined,
      bet_type_risk_score: record.bet_type_risk_score ?? undefined,
      withdrawal_cancellation_count: record.withdrawal_cancellation_count ?? undefined,
      rg_tool_engagement_score: record.rg_tool_engagement_score ?? undefined,
      session_break_compliance_pct: record.session_break_compliance_pct ?? undefined,
      promo_response_rate: record.promo_response_rate ?? undefined,
    };

    // Reconstruct dimensions from stored scores
    const dimensions: Record<Dimension, DimensionResult> = {
      emotional_stability: { score: record.dim_emotional_stability, confidence: record.dim_es_confidence, contributing_signals: ['loss_chase_score', 'late_night_sessions_pct'] },
      self_reflection: { score: record.dim_self_reflection, confidence: record.dim_sr_confidence, contributing_signals: ['rg_tool_engagement_score', 'self_exclusion_history'] },
      coping_capacity: { score: record.dim_coping_capacity, confidence: record.dim_cc_confidence, contributing_signals: ['deposit_velocity_change_pct', 'withdrawal_cancellation_count'] },
      behavioral_engagement: { score: record.dim_behavioral_engagement, confidence: record.dim_be_confidence, contributing_signals: ['deposit_limit_set', 'session_break_compliance_pct', 'deposit_limit_modified_down'] },
      social_readiness: { score: record.dim_social_readiness, confidence: record.dim_srd_confidence, contributing_signals: ['promo_response_rate', 'bet_type_risk_score'] },
    };

    // Run fresh threshold check with current config
    const thresholdResult = checkThresholds(signals, record.rgs_score, dimensions, config.thresholds);

    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/signals/gambling/threshold-check',
      'POST',
      200,
      Date.now() - startTime,
      { user_id, rgs_score: record.rgs_score, breached: thresholdResult.breached }
    );

    return partnerApiSuccess({
      success: true,
      user_id: user_id.trim(),
      breached: thresholdResult.breached,
      alerts: thresholdResult.alerts,
      recommended_action: thresholdResult.recommended_action,
      snapshot: {
        rgs_score: record.rgs_score,
        rgs_label: record.rgs_label,
        confidence: record.overall_confidence,
        dimensions: {
          emotional_stability: record.dim_emotional_stability,
          self_reflection: record.dim_self_reflection,
          coping_capacity: record.dim_coping_capacity,
          behavioral_engagement: record.dim_behavioral_engagement,
          social_readiness: record.dim_social_readiness,
        },
        assessed_at: record.created_at,
      },
      thresholds_applied: {
        rgs_minimum: config.thresholds.rgs_minimum,
        dimension_minimum: config.thresholds.dimension_minimum,
        deposit_velocity_threshold: config.thresholds.deposit_velocity_threshold,
        loss_chase_threshold: config.thresholds.loss_chase_threshold,
      },
      checked_at: new Date().toISOString(),
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Threshold check error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/threshold-check', 'POST', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
