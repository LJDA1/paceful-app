/**
 * Webhook System for B2B Partners
 *
 * Handles webhook delivery for real-time event notifications to B2B partners.
 * Supports HMAC-SHA256 signature verification for secure payload delivery.
 */

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

// Initialize Supabase client with service role for webhook operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// Types
// ============================================================================

export type WebhookEventType =
  | 'prediction.created'
  | 'prediction.updated'
  | 'user.stage_changed'
  | 'cohort.updated';

export interface WebhookPayload {
  event_type: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface Webhook {
  id: string;
  client_id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
}

export interface WebhookDeliveryResult {
  webhook_id: string;
  success: boolean;
  status_code?: number;
  error?: string;
}

// ============================================================================
// Signature Generation
// ============================================================================

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify webhook signature (for receiving webhooks)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);

  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// Webhook Delivery
// ============================================================================

/**
 * Deliver a webhook to a single endpoint
 */
async function deliverWebhook(
  webhook: Webhook,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, webhook.secret);
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Paceful-Signature': signature,
        'X-Paceful-Timestamp': String(timestamp),
        'X-Paceful-Event': payload.event_type,
        'User-Agent': 'Paceful-Webhooks/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseBody = await response.text().catch(() => '');

    // Log the delivery attempt
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: payload.event_type,
      payload: payload,
      response_status: response.status,
      response_body: responseBody.slice(0, 1000), // Limit stored response size
      delivered_at: new Date().toISOString(),
    });

    // Update last_triggered_at on webhook
    await supabase
      .from('webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhook.id);

    return {
      webhook_id: webhook.id,
      success: response.ok,
      status_code: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed delivery attempt
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: payload.event_type,
      payload: payload,
      response_status: null,
      response_body: errorMessage,
      delivered_at: null,
    });

    return {
      webhook_id: webhook.id,
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Main Trigger Function
// ============================================================================

/**
 * Trigger webhooks for a specific event type
 *
 * Finds all active webhooks subscribed to the event and delivers the payload.
 * Payloads are signed with HMAC-SHA256 using each webhook's secret.
 *
 * @param eventType - The type of event (e.g., 'prediction.created')
 * @param data - The event data to include in the payload
 * @param clientId - Optional: Only trigger webhooks for a specific client
 * @returns Array of delivery results
 *
 * @example
 * ```typescript
 * await triggerWebhook('prediction.created', {
 *   prediction_id: 'uuid',
 *   user_id: 'uuid',
 *   prediction_type: 'timeline_rebuilding',
 *   probability: 0.85
 * });
 * ```
 */
export async function triggerWebhook(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  clientId?: string
): Promise<WebhookDeliveryResult[]> {
  // Build query for active webhooks subscribed to this event
  let query = supabase
    .from('webhooks')
    .select('*')
    .eq('is_active', true)
    .contains('events', [eventType]);

  // Optionally filter by client
  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data: webhooks, error } = await query;

  if (error) {
    console.error('Error fetching webhooks:', error);
    return [];
  }

  if (!webhooks || webhooks.length === 0) {
    return [];
  }

  // Build the payload
  const payload: WebhookPayload = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  // Deliver to all matching webhooks in parallel
  const results = await Promise.all(
    webhooks.map((webhook) => deliverWebhook(webhook as Webhook, payload))
  );

  return results;
}

// ============================================================================
// Event-Specific Trigger Functions
// ============================================================================

/**
 * Trigger webhook for a new prediction
 */
export async function triggerPredictionCreated(
  predictionId: string,
  userId: string,
  predictionType: string,
  probability: number,
  metadata?: Record<string, unknown>
): Promise<WebhookDeliveryResult[]> {
  return triggerWebhook('prediction.created', {
    prediction_id: predictionId,
    user_id: userId,
    prediction_type: predictionType,
    probability,
    metadata,
  });
}

/**
 * Trigger webhook for an updated prediction
 */
export async function triggerPredictionUpdated(
  predictionId: string,
  userId: string,
  predictionType: string,
  previousProbability: number,
  newProbability: number,
  resolved?: boolean,
  actualOutcome?: boolean
): Promise<WebhookDeliveryResult[]> {
  return triggerWebhook('prediction.updated', {
    prediction_id: predictionId,
    user_id: userId,
    prediction_type: predictionType,
    previous_probability: previousProbability,
    new_probability: newProbability,
    resolved,
    actual_outcome: actualOutcome,
  });
}

/**
 * Trigger webhook for user stage change
 */
export async function triggerUserStageChanged(
  userId: string,
  previousStage: string,
  newStage: string,
  ersScore: number
): Promise<WebhookDeliveryResult[]> {
  return triggerWebhook('user.stage_changed', {
    user_id: userId,
    previous_stage: previousStage,
    new_stage: newStage,
    ers_score: ersScore,
    changed_at: new Date().toISOString(),
  });
}

/**
 * Trigger webhook for cohort update
 */
export async function triggerCohortUpdated(
  cohortId: string,
  userId: string,
  cohortName: string,
  cohortSize: number,
  similarityScore: number
): Promise<WebhookDeliveryResult[]> {
  return triggerWebhook('cohort.updated', {
    cohort_id: cohortId,
    user_id: userId,
    cohort_name: cohortName,
    cohort_size: cohortSize,
    similarity_score: similarityScore,
  });
}

// ============================================================================
// Webhook Management Helpers
// ============================================================================

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Validate webhook URL (must be HTTPS)
 */
export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Webhook URL must use HTTPS' };
    }

    // Block localhost and private IPs in production
    const hostname = parsed.hostname.toLowerCase();
    if (
      process.env.NODE_ENV === 'production' &&
      (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.local'))
    ) {
      return { valid: false, error: 'Webhook URL cannot point to localhost or private networks' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate event types
 */
export function validateEventTypes(events: string[]): { valid: boolean; error?: string } {
  const validEvents: WebhookEventType[] = [
    'prediction.created',
    'prediction.updated',
    'user.stage_changed',
    'cohort.updated',
  ];

  if (!events || events.length === 0) {
    return { valid: false, error: 'At least one event type is required' };
  }

  const invalidEvents = events.filter((e) => !validEvents.includes(e as WebhookEventType));
  if (invalidEvents.length > 0) {
    return {
      valid: false,
      error: `Invalid event types: ${invalidEvents.join(', ')}. Valid types are: ${validEvents.join(', ')}`,
    };
  }

  return { valid: true };
}

export default {
  triggerWebhook,
  triggerPredictionCreated,
  triggerPredictionUpdated,
  triggerUserStageChanged,
  triggerCohortUpdated,
  generateWebhookSignature,
  verifyWebhookSignature,
  generateWebhookSecret,
  validateWebhookUrl,
  validateEventTypes,
};
