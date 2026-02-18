/**
 * POST /api/v1/partner/webhooks/register
 *
 * Register a webhook endpoint for partner events.
 * Updates existing webhook if same URL already registered.
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import {
  validatePartnerKey,
  checkPartnerRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
  getSupabaseAdmin,
} from '@/lib/partner-auth';

// Allowed webhook events
const ALLOWED_EVENTS = [
  'ers.stage_changed',
  'ers.score_threshold',
  'mood.critical',
  'mood.logged',
  'journal.created',
];

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
    const { url, events } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/webhooks/register',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('url is required', 'BAD_REQUEST', 400);
    }

    if (!url.startsWith('https://')) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/webhooks/register',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('url must start with https://', 'BAD_REQUEST', 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/webhooks/register',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('Invalid URL format', 'BAD_REQUEST', 400);
    }

    // Validate events
    if (!Array.isArray(events) || events.length === 0) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/webhooks/register',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('events must be a non-empty array', 'BAD_REQUEST', 400);
    }

    const invalidEvents = events.filter(e => !ALLOWED_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/webhooks/register',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Invalid events: ${invalidEvents.join(', ')}. Allowed: ${ALLOWED_EVENTS.join(', ')}`,
        'BAD_REQUEST',
        400
      );
    }

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Check if webhook already exists for this partner + URL
    const { data: existingWebhook, error: lookupError } = await supabase
      .from('partner_webhooks')
      .select('id, webhook_secret')
      .eq('partner_id', partnerId)
      .eq('webhook_url', url)
      .single();

    if (existingWebhook && !lookupError) {
      // Update existing webhook
      const { error: updateError } = await supabase
        .from('partner_webhooks')
        .update({
          events,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingWebhook.id);

      if (updateError) {
        console.error('Error updating webhook:', updateError);
        await logPartnerApiUsage(
          partnerId,
          '/api/v1/partner/webhooks/register',
          'POST',
          500,
          Date.now() - startTime
        );
        return partnerApiError('Failed to update webhook', 'INTERNAL_ERROR', 500);
      }

      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/webhooks/register',
        'POST',
        200,
        Date.now() - startTime
      );

      return partnerApiSuccess({
        webhookId: existingWebhook.id,
        secret: existingWebhook.webhook_secret,
        events,
        status: 'updated',
      });
    }

    // Create new webhook
    const webhookSecret = `whsec_${randomUUID().replace(/-/g, '')}`;

    const { data: newWebhook, error: insertError } = await supabase
      .from('partner_webhooks')
      .insert({
        partner_id: partnerId,
        webhook_url: url,
        webhook_secret: webhookSecret,
        events,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating webhook:', insertError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/webhooks/register',
        'POST',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to register webhook', 'INTERNAL_ERROR', 500);
    }

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/webhooks/register',
      'POST',
      201,
      Date.now() - startTime
    );

    return partnerApiSuccess(
      {
        webhookId: newWebhook.id,
        secret: webhookSecret,
        events,
        status: 'created',
      },
      201
    );
  } catch (error) {
    console.error('Webhook registration error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/webhooks/register',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
