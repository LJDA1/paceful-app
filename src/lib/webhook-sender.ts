/**
 * Webhook Sender for Partner Integrations
 *
 * Handles webhook delivery with HMAC signing, retries, and logging.
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
// Webhook Delivery
// ============================================================================

/**
 * Send a webhook to a specific URL with retries
 */
async function deliverWebhook(
  webhook: PartnerWebhook,
  event: string,
  data: Record<string, unknown>,
  maxRetries: number = 3
): Promise<WebhookDeliveryResult> {
  const supabase = getSupabaseAdmin();
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, webhook.webhook_secret);

  let lastError: string | undefined;
  let lastStatusCode: number | undefined;
  let attempts = 0;

  // Retry with exponential backoff: 1s, 4s, 16s
  const delays = [0, 1000, 4000, 16000];

  for (let i = 0; i <= maxRetries; i++) {
    attempts++;

    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }

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

      lastStatusCode = response.status;
      const responseBody = await response.text().catch(() => '');

      // Log delivery attempt
      await logWebhookDelivery(
        webhook.id,
        event,
        response.status,
        responseBody.substring(0, 1000), // Limit response body size
        response.ok,
        attempts
      );

      if (response.ok) {
        // Update last_triggered_at
        await supabase
          .from('partner_webhooks')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', webhook.id);

        return {
          success: true,
          webhookId: webhook.id,
          statusCode: response.status,
          attempts,
        };
      }

      lastError = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;

      // Don't retry on client errors (4xx) except 429
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';

      // Log failed delivery attempt
      await logWebhookDelivery(
        webhook.id,
        event,
        0,
        lastError,
        false,
        attempts
      );
    }
  }

  return {
    success: false,
    webhookId: webhook.id,
    statusCode: lastStatusCode,
    error: lastError,
    attempts,
  };
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(
  webhookId: string,
  event: string,
  statusCode: number,
  responseBody: string,
  success: boolean,
  attempt: number
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event,
      status_code: statusCode,
      response_body: responseBody,
      success,
      attempt_number: attempt,
      delivered_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log webhook delivery:', error);
  }
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
