/**
 * POST /api/v1/partner/mood/log
 *
 * Log a mood entry for a partner user.
 * Triggers webhooks for mood.logged and mood.critical (3+ consecutive low scores).
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
import { sendUserWebhook } from '@/lib/webhook-sender';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const body = await request.clone().json().catch(() => ({}));
    return sandboxResponse('mood_log', body);
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
    const body = await request.json();
    const { externalId, score, label, emotions, note } = body;

    // Validate required fields
    if (!externalId || typeof externalId !== 'string') {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/mood/log',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('externalId is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (typeof score !== 'number' || score < 1 || score > 5) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/mood/log',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('score must be a number between 1 and 5', 'BAD_REQUEST', 400, undefined, rateLimit);
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
        '/api/v1/partner/mood/log',
        'POST',
        404,
        Date.now() - startTime
      );
      return partnerApiError('User not found', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Insert mood log
    const timestamp = new Date().toISOString();
    const { data: moodLog, error: insertError } = await supabase
      .from('partner_mood_logs')
      .insert({
        partner_user_id: partnerUser.id,
        score,
        label: label || null,
        emotions: emotions || null,
        note: note || null,
        logged_at: timestamp,
      })
      .select('id, logged_at')
      .single();

    if (insertError) {
      console.error('Error inserting mood log:', insertError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/mood/log',
        'POST',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to log mood', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    // Check for critical mood pattern (3+ consecutive low scores)
    if (score <= 1) {
      const { data: recentMoods } = await supabase
        .from('partner_mood_logs')
        .select('score')
        .eq('partner_user_id', partnerUser.id)
        .order('logged_at', { ascending: false })
        .limit(3);

      if (recentMoods && recentMoods.length >= 3) {
        const allLow = recentMoods.every(m => m.score <= 1);
        if (allLow) {
          // Fire critical webhook
          await sendUserWebhook(partnerId, externalId, 'mood.critical', {
            score,
            consecutiveLowCount: 3,
            timestamp,
          });
        }
      }
    }

    // Fire mood.logged webhook
    await sendUserWebhook(partnerId, externalId, 'mood.logged', {
      moodId: moodLog.id,
      score,
      label: label || null,
      emotions: emotions || null,
      timestamp,
    });

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/mood/log',
      'POST',
      201,
      Date.now() - startTime
    );

    return partnerApiSuccess(
      {
        logged: true,
        moodId: moodLog.id,
        timestamp: moodLog.logged_at,
      },
      201,
      undefined,
      rateLimit
    );
  } catch (error) {
    console.error('Mood log error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/mood/log',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
