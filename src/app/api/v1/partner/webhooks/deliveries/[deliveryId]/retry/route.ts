/**
 * POST /api/v1/partner/webhooks/deliveries/:deliveryId/retry
 *
 * Manually retry a failed webhook delivery.
 * Only allowed for deliveries with status 'failed'.
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
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';
import { retryDelivery } from '@/lib/webhook-sender';

interface RouteParams {
  params: Promise<{ deliveryId: string }>;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { deliveryId } = await params;

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('webhook_delivery_retry', { deliveryId });
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
  const rateLimit = await checkPartnerRateLimit(validation.partnerId!, validation.rateLimit);
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

    // Fetch the delivery - MUST belong to this partner
    const { data: delivery, error: fetchError } = await supabase
      .from('webhook_deliveries')
      .select('id, status, partner_id')
      .eq('id', deliveryId)
      .eq('partner_id', partnerId)
      .single();

    if (fetchError || !delivery) {
      await logPartnerApiUsage(
        partnerId,
        `/api/v1/partner/webhooks/deliveries/${deliveryId}/retry`,
        'POST',
        404,
        Date.now() - startTime
      );
      return partnerApiError('Delivery not found', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Only allow retry if status is 'failed'
    if (delivery.status !== 'failed') {
      await logPartnerApiUsage(
        partnerId,
        `/api/v1/partner/webhooks/deliveries/${deliveryId}/retry`,
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Cannot retry delivery with status '${delivery.status}'. Only 'failed' deliveries can be retried.`,
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    // Trigger retry
    const result = await retryDelivery(deliveryId);

    if (!result) {
      await logPartnerApiUsage(
        partnerId,
        `/api/v1/partner/webhooks/deliveries/${deliveryId}/retry`,
        'POST',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to retry delivery', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    await logPartnerApiUsage(
      partnerId,
      `/api/v1/partner/webhooks/deliveries/${deliveryId}/retry`,
      'POST',
      200,
      Date.now() - startTime
    );

    // Determine new status
    const newStatus = result.success ? 'delivered' : 'retrying';

    return partnerApiSuccess({
      retried: true,
      deliveryId,
      newStatus,
      success: result.success,
      httpStatusCode: result.statusCode,
      error: result.error,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Webhook delivery retry error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      `/api/v1/partner/webhooks/deliveries/${deliveryId}/retry`,
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
