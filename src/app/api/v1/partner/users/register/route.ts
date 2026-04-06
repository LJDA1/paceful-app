/**
 * POST /api/v1/partner/users/register
 *
 * Register a new user for a partner integration.
 * Creates a shadow user in the Paceful system linked to the partner's external ID.
 * Optionally accepts a disruptionType to optimize ERS scoring for the user's recovery context.
 */

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const body = await request.clone().json().catch(() => ({}));
    return sandboxResponse('users_register', body);
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
    const { externalId, context, consentGiven, disruptionType } = body;

    // Validate required fields
    if (!externalId || typeof externalId !== 'string' || externalId.trim() === '') {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/users/register',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('externalId is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const VALID_DISRUPTION_TYPES = ['breakup', 'grief', 'burnout', 'addiction_recovery', 'divorce', 'layoff', 'trauma', 'life_transition', 'other'];

    if (disruptionType && !VALID_DISRUPTION_TYPES.includes(disruptionType)) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/partner/users/register', 'POST', 400, Date.now() - startTime);
      return partnerApiError(
        `Invalid disruptionType. Must be one of: ${VALID_DISRUPTION_TYPES.join(', ')}`,
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;
    const trimmedExternalId = externalId.trim();

    // Check if user already exists for this partner
    const { data: existingUser, error: lookupError } = await supabase
      .from('partner_users')
      .select('id, paceful_user_id, external_id, disruption_type')
      .eq('partner_id', partnerId)
      .eq('external_id', trimmedExternalId)
      .single();

    if (existingUser && !lookupError) {
      // User already exists
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/users/register',
        'POST',
        200,
        Date.now() - startTime
      );

      return partnerApiSuccess({
        pacefulUserId: existingUser.id,
        externalId: existingUser.external_id,
        disruptionType: existingUser.disruption_type || null,
        status: 'existing',
      }, 200, undefined, rateLimit);
    }

    // Create a shadow user in the auth system
    const shadowEmail = `partner_${partnerId}_${trimmedExternalId}@paceful.internal`;
    const shadowPassword = randomBytes(32).toString('hex');

    // Check if auth user already exists (in case of partial creation)
    const { data: existingAuthUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', shadowEmail)
      .single();

    let pacefulUserId: string;

    if (existingAuthUser) {
      pacefulUserId = existingAuthUser.id;
    } else {
      // Create new auth user using Supabase admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: shadowEmail,
        password: shadowPassword,
        email_confirm: true,
        user_metadata: {
          is_partner_user: true,
          partner_id: partnerId,
          external_id: trimmedExternalId,
          disruption_type: disruptionType || null,
        },
      });

      if (authError) {
        console.error('Error creating shadow user:', authError);
        await logPartnerApiUsage(
          partnerId,
          '/api/v1/partner/users/register',
          'POST',
          500,
          Date.now() - startTime
        );
        return partnerApiError('Failed to create user', 'INTERNAL_ERROR', 500, undefined, rateLimit);
      }

      pacefulUserId = authData.user.id;
    }

    // Create partner_users entry
    const { data: partnerUser, error: insertError } = await supabase
      .from('partner_users')
      .insert({
        partner_id: partnerId,
        paceful_user_id: pacefulUserId,
        external_id: trimmedExternalId,
        context: context || null,
        consent_given: consentGiven === true,
        consent_timestamp: consentGiven === true ? new Date().toISOString() : null,
        disruption_type: disruptionType || null,
        created_at: new Date().toISOString(),
      })
      .select('id, external_id')
      .single();

    if (insertError) {
      console.error('Error creating partner user:', insertError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/users/register',
        'POST',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to register user', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/users/register',
      'POST',
      201,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      pacefulUserId: partnerUser.id,
      externalId: partnerUser.external_id,
      disruptionType: disruptionType || null,
      status: 'registered',
    }, 201, undefined, rateLimit);
  } catch (error) {
    console.error('User registration error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/users/register',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
