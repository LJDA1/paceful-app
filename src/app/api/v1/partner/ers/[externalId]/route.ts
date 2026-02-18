/**
 * GET /api/v1/partner/ers/[externalId]
 *
 * Get the ERS score for a partner user.
 * Returns cached score if recent (< 24 hours), otherwise calculates fresh.
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
  getPartnerERSTrend,
} from '@/lib/partner-ers-calculator';

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ externalId: string }> }
) {
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
    const { externalId } = await params;

    if (!externalId) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/:externalId',
        'GET',
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
        '/api/v1/partner/ers/:externalId',
        'GET',
        404,
        Date.now() - startTime
      );
      return partnerApiError('User not found', 'NOT_FOUND', 404);
    }

    // Get latest ERS score
    let ersData = await getLatestPartnerERS(partnerUser.id);
    let needsCalculation = !ersData;

    // Check if score is older than 24 hours
    if (ersData) {
      const scoreAge = Date.now() - new Date(ersData.calculatedAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (scoreAge > twentyFourHours) {
        needsCalculation = true;
      }
    }

    // Calculate fresh if needed
    if (needsCalculation) {
      const calculationResult = await calculatePartnerERS(partnerUser.id);
      await savePartnerERSScore(partnerUser.id, calculationResult);
      ersData = {
        score: calculationResult.score,
        stage: calculationResult.stage,
        dimensions: calculationResult.dimensions,
        calculatedAt: calculationResult.calculatedAt,
      };
    }

    // Get trend data
    const trend = await getPartnerERSTrend(partnerUser.id);

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/ers/:externalId',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      userId: externalId,
      ersScore: ersData!.score,
      stage: ersData!.stage,
      dimensions: ersData!.dimensions,
      calculatedAt: ersData!.calculatedAt,
      trend: {
        direction: trend.direction,
        weeklyChange: trend.weeklyChange,
        daysTracked: trend.daysTracked,
      },
    });
  } catch (error) {
    console.error('ERS fetch error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/ers/:externalId',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
