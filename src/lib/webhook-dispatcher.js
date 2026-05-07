/**
 * Webhook Dispatcher
 *
 * Fires three event types produced by the vertical signal engine:
 *
 *   signal.critical         — any individual signal hits critical severity
 *   signal.escalation       — escalation_composite hits critical severity
 *   conversation.escalating — trajectory velocity exceeds 0.7
 *
 * DB tables used (Supabase):
 *   api_keys            — look up partner_id from raw API key
 *   partner_webhooks    — find subscribed, active endpoints for this partner + event
 *   webhook_deliveries  — log every attempt (success and failure)
 *
 * Schema reference:
 *   api_keys.id (uuid)  ←  partner_webhooks.partner_id (uuid)
 */

const crypto = require('crypto');
const { supabase } = require('./supabase');

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;
const DELIVERY_TIMEOUT_MS = 10_000; // 10 s per attempt
const MAX_RESPONSE_BODY = 2000;      // chars stored in webhook_deliveries

/** Exponential backoff: 1 s → 2 s → 4 s */
function backoffMs(attempt) {
  return Math.pow(2, attempt) * 1_000;
}

// ─── Core delivery ────────────────────────────────────────────────────────────

/**
 * Look up partner_id from the raw API key, find all active webhooks subscribed
 * to `event`, and deliver to each one.
 *
 * Called from dispatchSignalEvents / dispatchConversationEvents.
 * Swallows all errors so it never blocks the API response.
 *
 * @param {string} event   - WebhookEvent string e.g. "signal.critical"
 * @param {Object} payload - Event payload (already shaped by the caller)
 * @param {string} apiKey  - Raw value of the X-API-Key header
 */
async function deliverWebhookEvent(event, payload, apiKey) {
  if (!apiKey) return;

  // 1. Resolve partner_id from the API key
  const { data: keyRow, error: keyErr } = await supabase
    .from('api_keys')
    .select('id')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single();

  if (keyErr || !keyRow) {
    if (keyErr?.code !== 'PGRST116') { // PGRST116 = no rows — expected for bad keys
      console.error('[WebhookDispatcher] api_keys lookup error:', keyErr?.message);
    }
    return;
  }

  const partnerId = keyRow.id;

  // 2. Find active webhooks subscribed to this event
  //    partner_webhooks.events is a text[] column; @> checks containment
  const { data: webhooks, error: whErr } = await supabase
    .from('partner_webhooks')
    .select('id, url, secret')
    .eq('partner_id', partnerId)
    .eq('is_active', true)
    .contains('events', [event]);

  if (whErr) {
    console.error('[WebhookDispatcher] partner_webhooks lookup error:', whErr.message);
    return;
  }

  if (!webhooks || webhooks.length === 0) return;

  // 3. Deliver to each endpoint concurrently (independent — one failure doesn't block others)
  await Promise.allSettled(
    webhooks.map(wh => deliverToWebhook(wh, partnerId, event, payload))
  );
}

/**
 * POST a single webhook endpoint, log the attempt, and retry on failure.
 * Updates webhook_deliveries in place so callers can observe the full audit trail.
 */
async function deliverToWebhook(webhook, partnerId, event, payload) {
  const body = JSON.stringify({ event, payload, timestamp: Date.now() });

  // Sign the full body with the per-webhook secret (HMAC-SHA256)
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(body)
    .digest('hex');

  // Create the delivery record before the first attempt so it exists
  // even if all retries fail
  const { data: delivery, error: insertErr } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhook.id,
      partner_id: partnerId,
      event_type: event,
      payload,
      status: 'pending',
      attempt_count: 0,
      max_attempts: MAX_ATTEMPTS,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr || !delivery) {
    console.error('[WebhookDispatcher] Failed to create delivery record:', insertErr?.message);
    return;
  }

  const deliveryId = delivery.id;

  // Attempt with up to MAX_ATTEMPTS tries
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, backoffMs(attempt)));
    }

    const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
    const startedAt = Date.now();
    let httpStatus = null;
    let responseBody = null;

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Paceful-Signature': signature,
          'X-Paceful-Event': event,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });

      const durationMs = Date.now() - startedAt;
      httpStatus = res.status;
      responseBody = (await res.text().catch(() => '')).slice(0, MAX_RESPONSE_BODY);

      if (res.ok) {
        // ── Success ──────────────────────────────────────────────────────────
        await Promise.all([
          supabase
            .from('webhook_deliveries')
            .update({
              status: 'delivered',
              http_status_code: httpStatus,
              response_body: responseBody,
              attempt_count: attempt + 1,
              delivered_at: new Date().toISOString(),
              duration_ms: durationMs,
            })
            .eq('id', deliveryId),

          supabase
            .from('partner_webhooks')
            .update({ last_triggered_at: new Date().toISOString() })
            .eq('id', webhook.id),
        ]);
        return; // done — no more retries needed
      }

      // ── Non-2xx response — schedule retry or mark failed ─────────────────
      await supabase
        .from('webhook_deliveries')
        .update({
          status: isLastAttempt ? 'failed' : 'pending',
          http_status_code: httpStatus,
          response_body: responseBody,
          attempt_count: attempt + 1,
          duration_ms: durationMs,
          next_retry_at: isLastAttempt
            ? null
            : new Date(Date.now() + backoffMs(attempt + 1)).toISOString(),
          ...(isLastAttempt && { failed_at: new Date().toISOString() }),
        })
        .eq('id', deliveryId);

    } catch (err) {
      // ── Network error / timeout ────────────────────────────────────────────
      const durationMs = Date.now() - startedAt;
      await supabase
        .from('webhook_deliveries')
        .update({
          status: isLastAttempt ? 'failed' : 'pending',
          response_body: err.message?.slice(0, MAX_RESPONSE_BODY),
          attempt_count: attempt + 1,
          duration_ms: durationMs,
          next_retry_at: isLastAttempt
            ? null
            : new Date(Date.now() + backoffMs(attempt + 1)).toISOString(),
          ...(isLastAttempt && { failed_at: new Date().toISOString() }),
        })
        .eq('id', deliveryId);
    }
  }
}

// ─── Public dispatch functions ────────────────────────────────────────────────

/**
 * Inspect a single-text analysis result and fire relevant signal events.
 *
 * @param {Object} result  - VerticalEngineResult from engine.analyze()
 * @param {string} apiKey  - Raw X-API-Key header value
 */
async function dispatchSignalEvents(result, apiKey) {
  const promises = [];

  // signal.critical — any individual signal at critical severity
  const criticalSignals = (result.signals || []).filter(s => s.severity === 'critical');
  for (const signal of criticalSignals) {
    promises.push(
      deliverWebhookEvent('signal.critical', {
        analysis_id: result.analysis_id,
        vertical: result.vertical,
        signal_id: signal.id,
        signal_name: signal.display_name || signal.name,
        score: signal.score,
        recommended_action: signal.recommended_action,
        timestamp: result.timestamp,
      }, apiKey)
    );
  }

  // signal.escalation — escalation_composite composite hits critical
  const escalation = result.composite_scores?.escalation_composite;
  if (escalation && escalation.severity === 'critical') {
    promises.push(
      deliverWebhookEvent('signal.escalation', {
        analysis_id: result.analysis_id,
        vertical: result.vertical,
        escalation_score: escalation.score,
        contributing_signals: escalation.contributing_signals,
        timestamp: result.timestamp,
      }, apiKey)
    );
  }

  await Promise.allSettled(promises);
}

/**
 * Inspect a conversation analysis result and fire conversation events.
 *
 * @param {Object} result  - ConversationAnalysisResult
 * @param {string} apiKey  - Raw X-API-Key header value
 */
async function dispatchConversationEvents(result, apiKey) {
  const { trajectory } = result;
  if (!trajectory) return;

  if (trajectory.velocity > 0.7) {
    await deliverWebhookEvent('conversation.escalating', {
      conversation_id: result.conversation_id,
      vertical: result.vertical,
      velocity: trajectory.velocity,
      overall_direction: trajectory.overall_direction,
      turning_points: trajectory.turning_points,
      optimal_intervention_window: trajectory.optimal_intervention_window,
      timestamp: Date.now(),
    }, apiKey);
  }
}

module.exports = { dispatchSignalEvents, dispatchConversationEvents };
