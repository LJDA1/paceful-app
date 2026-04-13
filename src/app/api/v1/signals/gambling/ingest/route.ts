/**
 * POST /api/v1/signals/gambling/ingest
 *
 * Accept 14 structured behavioral signals from a partner platform,
 * compute a Responsible Gambling Score (RGS) and dimension breakdown,
 * run threshold checks, and store the result.
 *
 * No AI calls — scoring is deterministic from the supplied signal values.
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
  computeDimensions,
  computeRgsScore,
  getRgsLabel,
  getOverallConfidence,
  checkThresholds,
  buildDimensionResults,
  formatScore,
  DEFAULT_GAMBLING_CONFIG,
  type GamblingSignals,
  type GamblingConfig,
  type DimensionWeights,
  type ThresholdConfig,
} from '@/lib/gambling-signals';

// ============================================================================
// Load partner gambling config
// ============================================================================

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

// ============================================================================
// Validate signal values
// ============================================================================

function validateSignals(body: Record<string, unknown>): { signals: GamblingSignals; errors: string[] } {
  const errors: string[] = [];
  const signals: GamblingSignals = {};

  const numericSignals: (keyof GamblingSignals)[] = [
    'session_duration_minutes',
    'session_frequency_daily',
    'deposit_amount',
    'deposit_velocity_change_pct',
    'loss_chase_score',
    'late_night_sessions_pct',
    'bet_type_risk_score',
    'rg_tool_engagement_score',
    'session_break_compliance_pct',
  ];

  for (const field of numericSignals) {
    const val = body[field];
    if (val !== undefined && val !== null) {
      if (typeof val !== 'number' || isNaN(val)) {
        errors.push(`${field} must be a number`);
      } else {
        (signals[field] as number) = val;
      }
    }
  }

  // Range-validated signals
  const rangedSignals: { field: keyof GamblingSignals; min: number; max: number }[] = [
    { field: 'loss_chase_score', min: 0, max: 100 },
    { field: 'late_night_sessions_pct', min: 0, max: 100 },
    { field: 'bet_type_risk_score', min: 0, max: 100 },
    { field: 'rg_tool_engagement_score', min: 0, max: 100 },
    { field: 'session_break_compliance_pct', min: 0, max: 100 },
  ];

  for (const { field, min, max } of rangedSignals) {
    const val = signals[field] as number | undefined;
    if (val !== undefined && (val < min || val > max)) {
      errors.push(`${field} must be between ${min} and ${max}`);
    }
  }

  // promo_response_rate: 0-1
  if (body.promo_response_rate !== undefined && body.promo_response_rate !== null) {
    const val = body.promo_response_rate;
    if (typeof val !== 'number' || val < 0 || val > 1) {
      errors.push('promo_response_rate must be a number between 0 and 1');
    } else {
      signals.promo_response_rate = val;
    }
  }

  // withdrawal_cancellation_count: non-negative integer
  if (body.withdrawal_cancellation_count !== undefined && body.withdrawal_cancellation_count !== null) {
    const val = body.withdrawal_cancellation_count;
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
      errors.push('withdrawal_cancellation_count must be a non-negative integer');
    } else {
      signals.withdrawal_cancellation_count = val;
    }
  }

  // Boolean signals
  const booleanSignals: (keyof GamblingSignals)[] = [
    'deposit_limit_set',
    'deposit_limit_modified_down',
    'self_exclusion_history',
  ];

  for (const field of booleanSignals) {
    const val = body[field];
    if (val !== undefined && val !== null) {
      if (typeof val !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      } else {
        (signals[field] as boolean) = val;
      }
    }
  }

  return { signals, errors };
}

// ============================================================================
// Handler
// ============================================================================

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(validation.error || 'Invalid API key', 'UNAUTHORIZED', 401);
  }

  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, '/api/v1/signals/gambling/ingest');
  if (!rateLimit.allowed) {
    return partnerApiError(
      `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`,
      'RATE_LIMITED', 429, undefined, rateLimit
    );
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const { user_id, config: requestConfig } = body;

    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/ingest', 'POST', 400, Date.now() - startTime);
      return partnerApiError('user_id is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const { signals, errors } = validateSignals(body);

    if (errors.length > 0) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/ingest', 'POST', 400, Date.now() - startTime);
      return partnerApiError(errors.join('; '), 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    // At least one scored signal must be present
    const scoredSignalKeys: (keyof GamblingSignals)[] = [
      'deposit_velocity_change_pct', 'loss_chase_score', 'late_night_sessions_pct',
      'deposit_limit_set', 'deposit_limit_modified_down', 'self_exclusion_history',
      'bet_type_risk_score', 'withdrawal_cancellation_count', 'rg_tool_engagement_score',
      'session_break_compliance_pct', 'promo_response_rate',
    ];
    const hasAnySignal = scoredSignalKeys.some(k => signals[k] !== undefined);
    if (!hasAnySignal) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/ingest', 'POST', 400, Date.now() - startTime);
      return partnerApiError('At least one scored signal must be provided', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    // Load and optionally merge per-request config overrides
    const partnerConfig = await loadGamblingConfig(validation.partnerId!);

    // Allow per-request verbosity/tone/score_format overrides (mirrors base ERS pattern)
    const config: GamblingConfig = {
      ...partnerConfig,
      verbosity: (['minimal', 'standard', 'clinical'].includes(requestConfig as string) ? requestConfig as GamblingConfig['verbosity'] : partnerConfig.verbosity),
      tone: (['clinical', 'casual', 'motivational'].includes(requestConfig as string) ? requestConfig as GamblingConfig['tone'] : partnerConfig.tone),
    };

    // Compute dimensions and RGS
    const dimensions = computeDimensions(signals);
    const rgsScore = computeRgsScore(dimensions, config.dimension_weights);
    const rgsLabel = getRgsLabel(rgsScore);
    const overallConfidence = getOverallConfidence(dimensions);

    // Run threshold checks
    const thresholdResult = checkThresholds(signals, rgsScore, dimensions, config.thresholds);

    // Generate assessment ID
    const assessmentId = `rgs_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    // Store in DB
    const supabase = getSupabaseAdmin();
    const { error: insertError } = await supabase.from('gambling_signals').insert({
      partner_id: validation.partnerId,
      user_id: user_id.trim(),
      // Raw signals
      session_duration_minutes: signals.session_duration_minutes ?? null,
      session_frequency_daily: signals.session_frequency_daily ?? null,
      deposit_amount: signals.deposit_amount ?? null,
      deposit_velocity_change_pct: signals.deposit_velocity_change_pct ?? null,
      loss_chase_score: signals.loss_chase_score ?? null,
      late_night_sessions_pct: signals.late_night_sessions_pct ?? null,
      deposit_limit_set: signals.deposit_limit_set ?? null,
      deposit_limit_modified_down: signals.deposit_limit_modified_down ?? null,
      self_exclusion_history: signals.self_exclusion_history ?? null,
      bet_type_risk_score: signals.bet_type_risk_score ?? null,
      withdrawal_cancellation_count: signals.withdrawal_cancellation_count ?? null,
      rg_tool_engagement_score: signals.rg_tool_engagement_score ?? null,
      session_break_compliance_pct: signals.session_break_compliance_pct ?? null,
      promo_response_rate: signals.promo_response_rate ?? null,
      // Computed scores
      rgs_score: rgsScore,
      dim_emotional_stability: dimensions.emotional_stability.score,
      dim_self_reflection: dimensions.self_reflection.score,
      dim_coping_capacity: dimensions.coping_capacity.score,
      dim_behavioral_engagement: dimensions.behavioral_engagement.score,
      dim_social_readiness: dimensions.social_readiness.score,
      dim_es_confidence: dimensions.emotional_stability.confidence,
      dim_sr_confidence: dimensions.self_reflection.confidence,
      dim_cc_confidence: dimensions.coping_capacity.confidence,
      dim_be_confidence: dimensions.behavioral_engagement.confidence,
      dim_srd_confidence: dimensions.social_readiness.confidence,
      rgs_label: rgsLabel,
      overall_confidence: overallConfidence,
      thresholds_breached: thresholdResult.alerts,
      recommended_action: thresholdResult.recommended_action,
      config_snapshot: {
        dimension_weights: config.dimension_weights,
        thresholds: config.thresholds,
      },
    });

    if (insertError) {
      console.error('Error storing gambling signals:', insertError);
      // Continue — still return result even if storage fails
    }

    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/signals/gambling/ingest',
      'POST',
      200,
      Date.now() - startTime,
      { user_id, rgs_score: rgsScore, recommended_action: thresholdResult.recommended_action }
    );

    // Build explainability response
    const dimensionResults = buildDimensionResults(
      dimensions,
      config.verbosity,
      config.tone,
      config.score_format,
      config.traffic_light_thresholds
    );

    const formattedRgs = formatScore(rgsScore, config.score_format, config.traffic_light_thresholds);

    const response: Record<string, unknown> = {
      success: true,
      assessment_id: assessmentId,
      user_id: user_id.trim(),
      rgs_score: formattedRgs,
      rgs_label: rgsLabel,
      confidence: overallConfidence,
      dimensions: dimensionResults,
      threshold_check: {
        breached: thresholdResult.breached,
        alert_count: thresholdResult.alerts.length,
        recommended_action: thresholdResult.recommended_action,
        alerts: thresholdResult.alerts,
      },
      timestamp,
    };

    if (config.verbosity !== 'minimal') {
      response.meta = {
        verbosity: config.verbosity,
        tone: config.tone,
        score_format: config.score_format,
        dimension_weights: config.dimension_weights,
        api_version: '1.3.0',
        scoring_method: 'deterministic_signal_mapping',
      };
    }

    return partnerApiSuccess(response, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Gambling signal ingest error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/signals/gambling/ingest', 'POST', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
