/**
 * Partner Config Endpoint
 *
 * GET /api/v1/partner/config - Get partner's default configuration
 * PUT /api/v1/partner/config - Update partner's default configuration
 *
 * Partners can set their defaults for:
 * - verbosity: minimal | standard | clinical
 * - tone: clinical | casual | motivational
 * - score_format: numerical | percentage | tier_label | traffic_light
 * - traffic_light_thresholds: { red_max: number, yellow_max: number }
 * - include_signals: boolean
 * - include_trend: boolean
 *
 * Per-request config overrides these defaults.
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

// Valid options for each config field
const VALID_VERBOSITY = ['minimal', 'standard', 'clinical'] as const;
const VALID_TONE = ['clinical', 'casual', 'motivational'] as const;
const VALID_SCORE_FORMAT = ['numerical', 'percentage', 'tier_label', 'traffic_light'] as const;

// Default config values
const DEFAULT_CONFIG = {
  verbosity: 'minimal',
  tone: 'clinical',
  score_format: 'numerical',
  traffic_light_thresholds: { red_max: 33, yellow_max: 66 },
  include_signals: true,
  include_trend: true,
};

export interface PartnerConfig {
  verbosity: 'minimal' | 'standard' | 'clinical';
  tone: 'clinical' | 'casual' | 'motivational';
  score_format: 'numerical' | 'percentage' | 'tier_label' | 'traffic_light';
  traffic_light_thresholds: { red_max: number; yellow_max: number };
  include_signals: boolean;
  include_trend: boolean;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

/**
 * GET /api/v1/partner/config
 * Returns the partner's current default configuration
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

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
      { 'Retry-After': String(rateLimit.retryAfter || 3600) }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch partner's config
    const { data: configData, error: fetchError } = await supabase
      .from('partner_configs')
      .select('*')
      .eq('partner_id', validation.partnerId)
      .single();

    // Log API usage
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/config',
      'GET',
      200,
      Date.now() - startTime
    );

    // If no config exists, return defaults
    if (fetchError || !configData) {
      return partnerApiSuccess({
        config: DEFAULT_CONFIG,
        is_default: true,
        partner_id: validation.partnerId,
      });
    }

    // Return partner's config
    return partnerApiSuccess({
      config: {
        verbosity: configData.verbosity,
        tone: configData.tone,
        score_format: configData.score_format,
        traffic_light_thresholds: configData.traffic_light_thresholds,
        include_signals: configData.include_signals,
        include_trend: configData.include_trend,
      },
      is_default: false,
      partner_id: validation.partnerId,
      updated_at: configData.updated_at,
    });
  } catch (error) {
    console.error('Error fetching partner config:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/config',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * PUT /api/v1/partner/config
 * Update the partner's default configuration
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();

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
      { 'Retry-After': String(rateLimit.retryAfter || 3600) }
    );
  }

  try {
    const body = await request.json();
    const { config } = body;

    if (!config || typeof config !== 'object') {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/config',
        'PUT',
        400,
        Date.now() - startTime
      );
      return partnerApiError('config object is required', 'BAD_REQUEST', 400);
    }

    // Validate each field if provided
    const validationErrors: string[] = [];

    if (config.verbosity !== undefined) {
      if (!VALID_VERBOSITY.includes(config.verbosity)) {
        validationErrors.push(`Invalid verbosity: "${config.verbosity}". Valid options: ${VALID_VERBOSITY.join(', ')}`);
      }
    }

    if (config.tone !== undefined) {
      if (!VALID_TONE.includes(config.tone)) {
        validationErrors.push(`Invalid tone: "${config.tone}". Valid options: ${VALID_TONE.join(', ')}`);
      }
    }

    if (config.score_format !== undefined) {
      if (!VALID_SCORE_FORMAT.includes(config.score_format)) {
        validationErrors.push(`Invalid score_format: "${config.score_format}". Valid options: ${VALID_SCORE_FORMAT.join(', ')}`);
      }
    }

    if (config.traffic_light_thresholds !== undefined) {
      const thresholds = config.traffic_light_thresholds;
      if (typeof thresholds !== 'object' || thresholds === null) {
        validationErrors.push('traffic_light_thresholds must be an object with red_max and yellow_max');
      } else {
        const { red_max, yellow_max } = thresholds;
        if (typeof red_max !== 'number' || red_max < 0 || red_max > 100) {
          validationErrors.push('traffic_light_thresholds.red_max must be a number between 0-100');
        }
        if (typeof yellow_max !== 'number' || yellow_max < 0 || yellow_max > 100) {
          validationErrors.push('traffic_light_thresholds.yellow_max must be a number between 0-100');
        }
        if (typeof red_max === 'number' && typeof yellow_max === 'number' && red_max >= yellow_max) {
          validationErrors.push('traffic_light_thresholds.red_max must be less than yellow_max');
        }
      }
    }

    if (config.include_signals !== undefined && typeof config.include_signals !== 'boolean') {
      validationErrors.push('include_signals must be a boolean');
    }

    if (config.include_trend !== undefined && typeof config.include_trend !== 'boolean') {
      validationErrors.push('include_trend must be a boolean');
    }

    if (validationErrors.length > 0) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/config',
        'PUT',
        400,
        Date.now() - startTime
      );
      return partnerApiError(validationErrors.join('; '), 'BAD_REQUEST', 400);
    }

    const supabase = getSupabaseAdmin();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      partner_id: validation.partnerId,
    };

    if (config.verbosity !== undefined) updateData.verbosity = config.verbosity;
    if (config.tone !== undefined) updateData.tone = config.tone;
    if (config.score_format !== undefined) updateData.score_format = config.score_format;
    if (config.traffic_light_thresholds !== undefined) updateData.traffic_light_thresholds = config.traffic_light_thresholds;
    if (config.include_signals !== undefined) updateData.include_signals = config.include_signals;
    if (config.include_trend !== undefined) updateData.include_trend = config.include_trend;

    // Upsert the config (insert or update)
    const { data: updatedConfig, error: upsertError } = await supabase
      .from('partner_configs')
      .upsert(updateData, { onConflict: 'partner_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting partner config:', upsertError);
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/config',
        'PUT',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to update configuration', 'INTERNAL_ERROR', 500);
    }

    // Log API usage
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/config',
      'PUT',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      config: {
        verbosity: updatedConfig.verbosity,
        tone: updatedConfig.tone,
        score_format: updatedConfig.score_format,
        traffic_light_thresholds: updatedConfig.traffic_light_thresholds,
        include_signals: updatedConfig.include_signals,
        include_trend: updatedConfig.include_trend,
      },
      partner_id: validation.partnerId,
      updated_at: updatedConfig.updated_at,
    });
  } catch (error) {
    console.error('Error updating partner config:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/config',
      'PUT',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
