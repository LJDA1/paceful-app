/**
 * GET /api/v1/partner/webhooks/deliveries
 *
 * List webhook deliveries for a partner with filtering and pagination.
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

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('webhook_deliveries_list', {});
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhook_id');
    const status = searchParams.get('status');
    const eventType = searchParams.get('event_type');
    const since = searchParams.get('since');
    const limitParam = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10);

    // Validate limit
    const limit = Math.min(Math.max(1, limitParam), MAX_LIMIT);
    const offset = Math.max(0, offsetParam);

    // Build query
    let query = supabase
      .from('webhook_deliveries')
      .select('id, webhook_id, event_type, status, http_status_code, attempt_count, max_attempts, next_retry_at, delivered_at, failed_at, created_at, duration_ms', { count: 'exact' })
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (webhookId) {
      query = query.eq('webhook_id', webhookId);
    }

    if (status) {
      const validStatuses = ['pending', 'delivered', 'retrying', 'failed'];
      if (validStatuses.includes(status)) {
        query = query.eq('status', status);
      }
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (since) {
      // Validate ISO datetime
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query = query.gte('created_at', sinceDate.toISOString());
      }
    }

    const { data: deliveries, error, count } = await query;

    if (error) {
      console.error('Error fetching deliveries:', error);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/webhooks/deliveries',
        'GET',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch deliveries', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    // Format response (excluding payload for list view)
    const formattedDeliveries = (deliveries || []).map(d => ({
      id: d.id,
      webhookId: d.webhook_id,
      eventType: d.event_type,
      status: d.status,
      httpStatusCode: d.http_status_code,
      attemptCount: d.attempt_count,
      maxAttempts: d.max_attempts,
      nextRetryAt: d.next_retry_at,
      deliveredAt: d.delivered_at,
      failedAt: d.failed_at,
      createdAt: d.created_at,
      durationMs: d.duration_ms,
    }));

    const total = count || 0;
    const hasMore = offset + formattedDeliveries.length < total;

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/webhooks/deliveries',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      deliveries: formattedDeliveries,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Webhook deliveries list error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/webhooks/deliveries',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
