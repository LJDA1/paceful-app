/**
 * POST /api/v1/partner/ers/calculate
 *
 * Force a fresh ERS calculation for a partner user.
 * Triggers ers.stage_changed webhook if stage changes.
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
import {
  calculatePartnerERS,
  savePartnerERSScore,
  getLatestPartnerERS,
} from '@/lib/partner-ers-calculator';
import { sendUserWebhook } from '@/lib/webhook-sender';

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
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
    const { externalId } = body;

    // Validate required fields
    if (!externalId || typeof externalId !== 'string') {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/calculate',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('externalId is required', 'BAD_REQUEST', 400);
    }

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Look up partner user
    const { data: partnerUser, error: userError } = await supabase
      .from('partner_users')
      .select('id, external_id')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .single();

    if (userError || !partnerUser) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/calculate',
        'POST',
        404,
        Date.now() - startTime
      );
      return partnerApiError('User not found', 'NOT_FOUND', 404);
    }

    // Get previous score for comparison
    const previousData = await getLatestPartnerERS(partnerUser.id);
    const previousScore = previousData?.score || null;
    const previousStage = previousData?.stage || null;

    // Calculate fresh ERS
    const calculationResult = await calculatePartnerERS(partnerUser.id);

    // Save the new score
    await savePartnerERSScore(partnerUser.id, calculationResult);

    // Check if stage changed and fire webhook
    if (previousStage && previousStage !== calculationResult.stage) {
      await sendUserWebhook(partnerId, externalId, 'ers.stage_changed', {
        previousStage,
        newStage: calculationResult.stage,
        previousScore,
        newScore: calculationResult.score,
        timestamp: calculationResult.calculatedAt,
      });
    }

    // Calculate change
    const change = previousScore !== null
      ? Math.round((calculationResult.score - previousScore) * 10) / 10
      : null;

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/ers/calculate',
      'POST',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      ersScore: calculationResult.score,
      stage: calculationResult.stage,
      dimensions: calculationResult.dimensions,
      previousScore,
      change,
      dataPointsUsed: calculationResult.dataPointsUsed,
    });
  } catch (error) {
    console.error('ERS calculation error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/ers/calculate',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
