/**
 * Webhook Sender for Partner Integrations
 *
 * Handles webhook delivery with HMAC signing, retries, and comprehensive logging.
 */

import { createHmac } from 'crypto';
import { getSupabaseAdmin } from './partner-auth';

// ============================================================================
// Types
// ============================================================================

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  webhookId: string;
  deliveryId?: string;
  statusCode?: number;
  error?: string;
  attempts: number;
}

interface PartnerWebhook {
  id: string;
  partner_id: string;
  webhook_url: string;
  webhook_secret: string;
  events: string[];
  is_active: boolean;
}

type DeliveryStatus = 'pending' | 'delivered' | 'retrying' | 'failed';

// Exponential backoff delays: 1 minute, 5 minutes, 30 minutes
const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000];
const MAX_ATTEMPTS = 3;

// ============================================================================
// HMAC Signing
// ============================================================================

/**
 * Sign a payload with HMAC-SHA256
 */
function signPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

// ============================================================================
// Delivery Record Management
// ============================================================================

/**
 * Create a new delivery record
 */
async function createDeliveryRecord(
  webhookId: string,
  partnerId: string,
  eventType: string,
  payload: WebhookPayload
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhookId,
        partner_id: partnerId,
        event_type: eventType,
        payload,
        status: 'pending',
        attempt_count: 0,
        max_attempts: MAX_ATTEMPTS,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create delivery record:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error creating delivery record:', error);
    return null;
  }
}

/**
 * Update delivery record with attempt result
 */
async function updateDeliveryRecord(
  deliveryId: string,
  updates: {
    status: DeliveryStatus;
    httpStatusCode?: number;
    responseBody?: string;
    attemptCount: number;
    durationMs?: number;
    nextRetryAt?: string | null;
    deliveredAt?: string | null;
    failedAt?: string | null;
  }
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    // Truncate response body to 500 chars
    const truncatedResponse = updates.responseBody
      ? updates.responseBody.substring(0, 500)
      : null;

    await supabase
      .from('webhook_deliveries')
      .update({
        status: updates.status,
        http_status_code: updates.httpStatusCode,
        response_body: truncatedResponse,
        attempt_count: updates.attemptCount,
        duration_ms: updates.durationMs,
        next_retry_at: updates.nextRetryAt,
        delivered_at: updates.deliveredAt,
        failed_at: updates.failedAt,
      })
      .eq('id', deliveryId);
  } catch (error) {
    console.error('Failed to update delivery record:', error);
  }
}

/**
 * Calculate next retry timestamp based on attempt count
 */
function calculateNextRetryAt(attemptCount: number): string | null {
  if (attemptCount >= MAX_ATTEMPTS) {
    return null;
  }

  const delayIndex = Math.min(attemptCount, RETRY_DELAYS_MS.length - 1);
  const delayMs = RETRY_DELAYS_MS[delayIndex];
  return new Date(Date.now() + delayMs).toISOString();
}

// ============================================================================
// Webhook Delivery
// ============================================================================

/**
 * Attempt a single webhook delivery
 */
async function attemptDelivery(
  webhook: PartnerWebhook,
  payloadString: string,
  signature: string,
  event: string
): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  durationMs: number;
}> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Paceful-Signature': signature,
        'X-Paceful-Event': event,
        'X-Paceful-Delivery': webhook.id,
        'User-Agent': 'Paceful-Webhooks/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const durationMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs,
    };
  }
}

/**
 * Send a webhook to a specific URL with retries and delivery tracking
 */
async function deliverWebhook(
  webhook: PartnerWebhook,
  event: string,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult> {
  const supabase = getSupabaseAdmin();
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, webhook.webhook_secret);

  // Create delivery record
  const deliveryId = await createDeliveryRecord(
    webhook.id,
    webhook.partner_id,
    event,
    payload
  );

  if (!deliveryId) {
    return {
      success: false,
      webhookId: webhook.id,
      error: 'Failed to create delivery record',
      attempts: 0,
    };
  }

  // Attempt immediate delivery
  const result = await attemptDelivery(webhook, payloadString, signature, event);
  const attemptCount = 1;

  if (result.success) {
    // Success - update record and webhook
    await updateDeliveryRecord(deliveryId, {
      status: 'delivered',
      httpStatusCode: result.statusCode,
      responseBody: result.responseBody,
      attemptCount,
      durationMs: result.durationMs,
      deliveredAt: new Date().toISOString(),
      nextRetryAt: null,
      failedAt: null,
    });

    // Update last_triggered_at on webhook
    await supabase
      .from('partner_webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhook.id);

    return {
      success: true,
      webhookId: webhook.id,
      deliveryId,
      statusCode: result.statusCode,
      attempts: attemptCount,
    };
  }

  // Failed - check if we should retry or mark as failed
  // Don't retry on client errors (4xx) except 429 (rate limited)
  const shouldRetry =
    result.statusCode === undefined || // Network error
    result.statusCode === 429 || // Rate limited
    result.statusCode >= 500; // Server error

  if (shouldRetry && attemptCount < MAX_ATTEMPTS) {
    // Mark for retry
    const nextRetryAt = calculateNextRetryAt(attemptCount);
    await updateDeliveryRecord(deliveryId, {
      status: 'retrying',
      httpStatusCode: result.statusCode,
      responseBody: result.responseBody || result.error,
      attemptCount,
      durationMs: result.durationMs,
      nextRetryAt,
      deliveredAt: null,
      failedAt: null,
    });
  } else {
    // Mark as permanently failed
    await updateDeliveryRecord(deliveryId, {
      status: 'failed',
      httpStatusCode: result.statusCode,
      responseBody: result.responseBody || result.error,
      attemptCount,
      durationMs: result.durationMs,
      nextRetryAt: null,
      deliveredAt: null,
      failedAt: new Date().toISOString(),
    });
  }

  return {
    success: false,
    webhookId: webhook.id,
    deliveryId,
    statusCode: result.statusCode,
    error: result.error || `HTTP ${result.statusCode}`,
    attempts: attemptCount,
  };
}

/**
 * Retry a specific delivery by ID
 */
export async function retryDelivery(deliveryId: string): Promise<WebhookDeliveryResult | null> {
  const supabase = getSupabaseAdmin();

  // Fetch the delivery record
  const { data: delivery, error: fetchError } = await supabase
    .from('webhook_deliveries')
    .select('*, partner_webhooks!inner(*)')
    .eq('id', deliveryId)
    .single();

  if (fetchError || !delivery) {
    console.error('Failed to fetch delivery for retry:', fetchError);
    return null;
  }

  const webhook = delivery.partner_webhooks as PartnerWebhook;
  const payload = delivery.payload as WebhookPayload;
  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, webhook.webhook_secret);

  // Reset attempt count for manual retry
  await supabase
    .from('webhook_deliveries')
    .update({
      status: 'pending',
      attempt_count: 0,
      next_retry_at: null,
      failed_at: null,
    })
    .eq('id', deliveryId);

  // Attempt delivery
  const result = await attemptDelivery(webhook, payloadString, signature, payload.event);
  const attemptCount = 1;

  if (result.success) {
    await updateDeliveryRecord(deliveryId, {
      status: 'delivered',
      httpStatusCode: result.statusCode,
      responseBody: result.responseBody,
      attemptCount,
      durationMs: result.durationMs,
      deliveredAt: new Date().toISOString(),
      nextRetryAt: null,
      failedAt: null,
    });

    return {
      success: true,
      webhookId: webhook.id,
      deliveryId,
      statusCode: result.statusCode,
      attempts: attemptCount,
    };
  }

  // Failed again
  const shouldRetry =
    result.statusCode === undefined ||
    result.statusCode === 429 ||
    result.statusCode >= 500;

  if (shouldRetry && attemptCount < MAX_ATTEMPTS) {
    const nextRetryAt = calculateNextRetryAt(attemptCount);
    await updateDeliveryRecord(deliveryId, {
      status: 'retrying',
      httpStatusCode: result.statusCode,
      responseBody: result.responseBody || result.error,
      attemptCount,
      durationMs: result.durationMs,
      nextRetryAt,
      deliveredAt: null,
      failedAt: null,
    });
  } else {
    await updateDeliveryRecord(deliveryId, {
      status: 'failed',
      httpStatusCode: result.statusCode,
      responseBody: result.responseBody || result.error,
      attemptCount,
      durationMs: result.durationMs,
      nextRetryAt: null,
      deliveredAt: null,
      failedAt: new Date().toISOString(),
    });
  }

  return {
    success: false,
    webhookId: webhook.id,
    deliveryId,
    statusCode: result.statusCode,
    error: result.error || `HTTP ${result.statusCode}`,
    attempts: attemptCount,
  };
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Send a webhook event to all registered webhooks for a partner
 */
export async function sendWebhook(
  partnerId: string,
  event: string,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult[]> {
  const supabase = getSupabaseAdmin();

  try {
    // Find all active webhooks for this partner that are subscribed to this event
    const { data: webhooks, error } = await supabase
      .from('partner_webhooks')
      .select('id, partner_id, webhook_url, webhook_secret, events, is_active')
      .eq('partner_id', partnerId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch webhooks:', error);
      return [];
    }

    if (!webhooks || webhooks.length === 0) {
      return [];
    }

    // Filter webhooks that are subscribed to this event
    const relevantWebhooks = webhooks.filter(
      (webhook) => webhook.events && webhook.events.includes(event)
    );

    if (relevantWebhooks.length === 0) {
      return [];
    }

    // Deliver to all relevant webhooks in parallel
    const results = await Promise.all(
      relevantWebhooks.map((webhook) => deliverWebhook(webhook, event, data))
    );

    return results;
  } catch (error) {
    console.error('Webhook sending failed:', error);
    return [];
  }
}

/**
 * Send a webhook event for a specific external user
 * Includes external_id in the payload for partner reference
 */
export async function sendUserWebhook(
  partnerId: string,
  externalId: string,
  event: string,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult[]> {
  return sendWebhook(partnerId, event, {
    externalId,
    ...data,
  });
}
