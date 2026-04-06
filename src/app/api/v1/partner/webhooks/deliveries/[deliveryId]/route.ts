/**
 * GET /api/v1/partner/webhooks/deliveries/:deliveryId
 *
 * Get full details of a specific webhook delivery including payload.
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

interface RouteParams {
  params: Promise<{ deliveryId: string }>;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { deliveryId } = await params;

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('webhook_delivery_detail', { deliveryId });
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

    // Fetch the delivery - MUST belong to this partner
    const { data: delivery, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('partner_id', partnerId)
      .single();

    if (error || !delivery) {
      await logPartnerApiUsage(
        partnerId,
        `/api/v1/partner/webhooks/deliveries/${deliveryId}`,
        'GET',
        404,
        Date.now() - startTime
      );
      return partnerApiError('Delivery not found', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    await logPartnerApiUsage(
      partnerId,
      `/api/v1/partner/webhooks/deliveries/${deliveryId}`,
      'GET',
      200,
      Date.now() - startTime
    );

    // Return full delivery record including payload
    return partnerApiSuccess({
      id: delivery.id,
      webhookId: delivery.webhook_id,
      eventType: delivery.event_type,
      payload: delivery.payload,
      status: delivery.status,
      httpStatusCode: delivery.http_status_code,
      responseBody: delivery.response_body,
      attemptCount: delivery.attempt_count,
      maxAttempts: delivery.max_attempts,
      nextRetryAt: delivery.next_retry_at,
      deliveredAt: delivery.delivered_at,
      failedAt: delivery.failed_at,
      createdAt: delivery.created_at,
      durationMs: delivery.duration_ms,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Webhook delivery detail error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      `/api/v1/partner/webhooks/deliveries/${deliveryId}`,
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
