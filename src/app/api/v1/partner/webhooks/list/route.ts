/**
 * GET /api/v1/partner/webhooks/list
 *
 * List all webhooks for a partner with delivery statistics.
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

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('webhooks_list', {});
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

    // Get all webhooks for this partner
    const { data: webhooks, error: webhooksError } = await supabase
      .from('partner_webhooks')
      .select('id, webhook_url, events, is_active, created_at, updated_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/webhooks/list',
        'GET',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch webhooks', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    if (!webhooks || webhooks.length === 0) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/webhooks/list',
        'GET',
        200,
        Date.now() - startTime
      );
      return partnerApiSuccess({ webhooks: [] }, 200, undefined, rateLimit);
    }

    // Get delivery stats for each webhook (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const webhookIds = webhooks.map(w => w.id);

    const { data: deliveries, error: deliveriesError } = await supabase
      .from('webhook_deliveries')
      .select('webhook_id, status, delivered_at')
      .in('webhook_id', webhookIds)
      .gte('delivered_at', sevenDaysAgo);

    if (deliveriesError) {
      console.error('Error fetching deliveries:', deliveriesError);
    }

    // Calculate stats per webhook
    const deliveryStats = new Map<string, { total: number; success: number; lastTriggered: string | null }>();

    for (const delivery of deliveries || []) {
      const stats = deliveryStats.get(delivery.webhook_id) || { total: 0, success: 0, lastTriggered: null };
      stats.total++;
      if (delivery.status === 'success') {
        stats.success++;
      }
      if (!stats.lastTriggered || delivery.delivered_at > stats.lastTriggered) {
        stats.lastTriggered = delivery.delivered_at;
      }
      deliveryStats.set(delivery.webhook_id, stats);
    }

    // Build response
    const webhooksWithStats = webhooks.map(webhook => {
      const stats = deliveryStats.get(webhook.id) || { total: 0, success: 0, lastTriggered: null };
      const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100;

      return {
        id: webhook.id,
        url: webhook.webhook_url,
        events: webhook.events,
        isActive: webhook.is_active,
        lastTriggeredAt: stats.lastTriggered,
        deliveries7d: stats.total,
        successRate,
      };
    });

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/webhooks/list',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({ webhooks: webhooksWithStats }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Webhooks list error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/webhooks/list',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
