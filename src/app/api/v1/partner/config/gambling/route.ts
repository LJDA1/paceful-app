/**
 * GET  /api/v1/partner/config/gambling — retrieve gambling-specific config
 * PUT  /api/v1/partner/config/gambling — update gambling-specific config
 *
 * Partners can configure:
 * - dimension_weights: custom weights for RGS composite (must sum to 1.0)
 * - rgs_minimum: minimum RGS before breach alert (default 40)
 * - dimension_minimum: minimum per-dimension score before breach (default 25)
 * - deposit_velocity_threshold: % increase before breach alert (default 200)
 * - loss_chase_threshold: loss_chase_score ceiling before breach (default 80)
 * - alert_on_*: enable/disable individual alert types
 * - verbosity / tone / score_format: same explainability options as base ERS config
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
import { DEFAULT_GAMBLING_CONFIG, type DimensionWeights } from '@/lib/gambling-signals';

const DEFAULT_CONFIG = DEFAULT_GAMBLING_CONFIG;

function weightsSum(w: DimensionWeights): number {
  return w.emotional_stability + w.self_reflection + w.coping_capacity + w.behavioral_engagement + w.social_readiness;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

// ============================================================================
// GET
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(validation.error || 'Invalid API key', 'UNAUTHORIZED', 401);
  }

  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, '/api/v1/partner/config/gambling');
  if (!rateLimit.allowed) {
    return partnerApiError('Rate limit exceeded', 'RATE_LIMITED', 429, undefined, rateLimit);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('partner_gambling_configs')
      .select('*')
      .eq('partner_id', validation.partnerId)
      .single();

    await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/config/gambling', 'GET', 200, Date.now() - startTime);

    if (error || !data) {
      return partnerApiSuccess({
        config: {
          dimension_weights: DEFAULT_CONFIG.dimension_weights,
          rgs_minimum: DEFAULT_CONFIG.thresholds.rgs_minimum,
          dimension_minimum: DEFAULT_CONFIG.thresholds.dimension_minimum,
          deposit_velocity_threshold: DEFAULT_CONFIG.thresholds.deposit_velocity_threshold,
          loss_chase_threshold: DEFAULT_CONFIG.thresholds.loss_chase_threshold,
          alert_on_rgs_breach: DEFAULT_CONFIG.thresholds.alert_on_rgs_breach,
          alert_on_dimension_breach: DEFAULT_CONFIG.thresholds.alert_on_dimension_breach,
          alert_on_velocity_breach: DEFAULT_CONFIG.thresholds.alert_on_velocity_breach,
          alert_on_loss_chase_breach: DEFAULT_CONFIG.thresholds.alert_on_loss_chase_breach,
          verbosity: DEFAULT_CONFIG.verbosity,
          tone: DEFAULT_CONFIG.tone,
          score_format: DEFAULT_CONFIG.score_format,
          traffic_light_thresholds: DEFAULT_CONFIG.traffic_light_thresholds,
        },
        is_default: true,
        partner_id: validation.partnerId,
      }, 200, undefined, rateLimit);
    }

    return partnerApiSuccess({
      config: {
        dimension_weights: data.dimension_weights,
        rgs_minimum: data.rgs_minimum,
        dimension_minimum: data.dimension_minimum,
        deposit_velocity_threshold: data.deposit_velocity_threshold,
        loss_chase_threshold: data.loss_chase_threshold,
        alert_on_rgs_breach: data.alert_on_rgs_breach,
        alert_on_dimension_breach: data.alert_on_dimension_breach,
        alert_on_velocity_breach: data.alert_on_velocity_breach,
        alert_on_loss_chase_breach: data.alert_on_loss_chase_breach,
        verbosity: data.verbosity,
        tone: data.tone,
        score_format: data.score_format,
        traffic_light_thresholds: data.traffic_light_thresholds,
      },
      is_default: false,
      partner_id: validation.partnerId,
      updated_at: data.updated_at,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Gambling config GET error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/config/gambling', 'GET', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}

// ============================================================================
// PUT
// ============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(validation.error || 'Invalid API key', 'UNAUTHORIZED', 401);
  }

  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, '/api/v1/partner/config/gambling');
  if (!rateLimit.allowed) {
    return partnerApiError('Rate limit exceeded', 'RATE_LIMITED', 429, undefined, rateLimit);
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const { config } = body;

    if (!config || typeof config !== 'object') {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/config/gambling', 'PUT', 400, Date.now() - startTime);
      return partnerApiError('config object is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const c = config as Record<string, unknown>;
    const errors: string[] = [];

    // Validate dimension_weights
    if (c.dimension_weights !== undefined) {
      if (typeof c.dimension_weights !== 'object' || c.dimension_weights === null) {
        errors.push('dimension_weights must be an object');
      } else {
        const w = c.dimension_weights as Record<string, unknown>;
        const requiredDims = ['emotional_stability', 'self_reflection', 'coping_capacity', 'behavioral_engagement', 'social_readiness'];
        for (const dim of requiredDims) {
          if (typeof w[dim] !== 'number' || (w[dim] as number) < 0 || (w[dim] as number) > 1) {
            errors.push(`dimension_weights.${dim} must be a number between 0 and 1`);
          }
        }
        if (errors.length === 0) {
          const sum = weightsSum(w as unknown as DimensionWeights);
          if (Math.abs(sum - 1.0) > 0.01) {
            errors.push(`dimension_weights must sum to 1.0 (got ${sum.toFixed(3)})`);
          }
        }
      }
    }

    // Validate numeric thresholds
    const numericFields: { field: string; min: number; max: number }[] = [
      { field: 'rgs_minimum', min: 0, max: 100 },
      { field: 'dimension_minimum', min: 0, max: 100 },
      { field: 'loss_chase_threshold', min: 0, max: 100 },
    ];
    for (const { field, min, max } of numericFields) {
      if (c[field] !== undefined) {
        const val = c[field];
        if (typeof val !== 'number' || val < min || val > max) {
          errors.push(`${field} must be a number between ${min} and ${max}`);
        }
      }
    }

    if (c.deposit_velocity_threshold !== undefined) {
      const val = c.deposit_velocity_threshold;
      if (typeof val !== 'number' || val <= 0) {
        errors.push('deposit_velocity_threshold must be a positive number');
      }
    }

    // Validate booleans
    const boolFields = ['alert_on_rgs_breach', 'alert_on_dimension_breach', 'alert_on_velocity_breach', 'alert_on_loss_chase_breach'];
    for (const field of boolFields) {
      if (c[field] !== undefined && typeof c[field] !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    }

    // Validate explainability fields
    if (c.verbosity !== undefined && !['minimal', 'standard', 'clinical'].includes(c.verbosity as string)) {
      errors.push('verbosity must be one of: minimal, standard, clinical');
    }
    if (c.tone !== undefined && !['clinical', 'casual', 'motivational'].includes(c.tone as string)) {
      errors.push('tone must be one of: clinical, casual, motivational');
    }
    if (c.score_format !== undefined && !['numerical', 'percentage', 'tier_label', 'traffic_light'].includes(c.score_format as string)) {
      errors.push('score_format must be one of: numerical, percentage, tier_label, traffic_light');
    }
    if (c.traffic_light_thresholds !== undefined) {
      const t = c.traffic_light_thresholds as Record<string, unknown>;
      if (typeof t?.red_max !== 'number' || typeof t?.yellow_max !== 'number') {
        errors.push('traffic_light_thresholds must have numeric red_max and yellow_max');
      } else if ((t.red_max as number) >= (t.yellow_max as number)) {
        errors.push('traffic_light_thresholds.red_max must be less than yellow_max');
      }
    }

    if (errors.length > 0) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/config/gambling', 'PUT', 400, Date.now() - startTime);
      return partnerApiError(errors.join('; '), 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    // Build upsert payload with only provided fields
    const updateData: Record<string, unknown> = {
      partner_id: validation.partnerId,
      updated_at: new Date().toISOString(),
    };

    if (c.dimension_weights !== undefined) updateData.dimension_weights = c.dimension_weights;
    if (c.rgs_minimum !== undefined) updateData.rgs_minimum = c.rgs_minimum;
    if (c.dimension_minimum !== undefined) updateData.dimension_minimum = c.dimension_minimum;
    if (c.deposit_velocity_threshold !== undefined) updateData.deposit_velocity_threshold = c.deposit_velocity_threshold;
    if (c.loss_chase_threshold !== undefined) updateData.loss_chase_threshold = c.loss_chase_threshold;
    if (c.alert_on_rgs_breach !== undefined) updateData.alert_on_rgs_breach = c.alert_on_rgs_breach;
    if (c.alert_on_dimension_breach !== undefined) updateData.alert_on_dimension_breach = c.alert_on_dimension_breach;
    if (c.alert_on_velocity_breach !== undefined) updateData.alert_on_velocity_breach = c.alert_on_velocity_breach;
    if (c.alert_on_loss_chase_breach !== undefined) updateData.alert_on_loss_chase_breach = c.alert_on_loss_chase_breach;
    if (c.verbosity !== undefined) updateData.verbosity = c.verbosity;
    if (c.tone !== undefined) updateData.tone = c.tone;
    if (c.score_format !== undefined) updateData.score_format = c.score_format;
    if (c.traffic_light_thresholds !== undefined) updateData.traffic_light_thresholds = c.traffic_light_thresholds;

    const supabase = getSupabaseAdmin();
    const { data: updated, error: upsertError } = await supabase
      .from('partner_gambling_configs')
      .upsert(updateData, { onConflict: 'partner_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Gambling config upsert error:', upsertError);
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/config/gambling', 'PUT', 500, Date.now() - startTime);
      return partnerApiError('Failed to update configuration', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/config/gambling', 'PUT', 200, Date.now() - startTime);

    return partnerApiSuccess({
      config: {
        dimension_weights: updated.dimension_weights,
        rgs_minimum: updated.rgs_minimum,
        dimension_minimum: updated.dimension_minimum,
        deposit_velocity_threshold: updated.deposit_velocity_threshold,
        loss_chase_threshold: updated.loss_chase_threshold,
        alert_on_rgs_breach: updated.alert_on_rgs_breach,
        alert_on_dimension_breach: updated.alert_on_dimension_breach,
        alert_on_velocity_breach: updated.alert_on_velocity_breach,
        alert_on_loss_chase_breach: updated.alert_on_loss_chase_breach,
        verbosity: updated.verbosity,
        tone: updated.tone,
        score_format: updated.score_format,
        traffic_light_thresholds: updated.traffic_light_thresholds,
      },
      partner_id: validation.partnerId,
      updated_at: updated.updated_at,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Gambling config PUT error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/config/gambling', 'PUT', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
