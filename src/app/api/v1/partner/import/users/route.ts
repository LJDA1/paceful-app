/**
 * POST /api/v1/partner/import/users
 *
 * Bulk import users for partners with existing user bases.
 * Processes up to 500 users per request in parallel.
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

const MAX_USERS_PER_REQUEST = 500;
const MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface UserImportRecord {
  externalId: string;
  context?: Record<string, unknown>;
  consentGiven?: boolean;
}

interface ImportResult {
  externalId: string;
  status: 'created' | 'skipped' | 'failed';
  pacefulUserId?: string;
  reason?: string;
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check payload size via content-length header
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE_BYTES) {
    return partnerApiError(
      `Payload too large. Maximum size is ${MAX_PAYLOAD_SIZE_BYTES / 1024 / 1024}MB`,
      'PAYLOAD_TOO_LARGE',
      413
    );
  }

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const body = await request.json();
    return sandboxResponse('import_users', { users: body.users || [] });
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

  // Check rate limit (batch counts as 1 request)
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
    const users: UserImportRecord[] = body.users;

    // Validate request body
    if (!Array.isArray(users)) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/import/users',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'Request body must contain a "users" array',
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    if (users.length === 0) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/import/users',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'Users array cannot be empty',
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    if (users.length > MAX_USERS_PER_REQUEST) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/import/users',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Maximum ${MAX_USERS_PER_REQUEST} users per request. Received ${users.length}`,
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    // Check for duplicate externalIds in batch
    const externalIds = users.map(u => u.externalId);
    const uniqueIds = new Set(externalIds);
    if (uniqueIds.size !== externalIds.length) {
      const duplicates = externalIds.filter((id, i) => externalIds.indexOf(id) !== i);
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/import/users',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Duplicate externalIds in batch: ${[...new Set(duplicates)].join(', ')}`,
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Get existing users for this partner
    const { data: existingUsers } = await supabase
      .from('partner_users')
      .select('external_id, id')
      .eq('partner_id', partnerId)
      .in('external_id', externalIds);

    const existingExternalIds = new Set(existingUsers?.map(u => u.external_id) || []);

    // Process users in parallel
    const results: ImportResult[] = await Promise.all(
      users.map(async (user): Promise<ImportResult> => {
        // Validate externalId
        if (!user.externalId || typeof user.externalId !== 'string' || user.externalId.trim() === '') {
          return {
            externalId: user.externalId || '(missing)',
            status: 'failed',
            reason: 'invalid_external_id',
          };
        }

        // Check if already exists
        if (existingExternalIds.has(user.externalId)) {
          return {
            externalId: user.externalId,
            status: 'skipped',
            reason: 'already_exists',
          };
        }

        // Create the user
        try {
          const { data: newUser, error } = await supabase
            .from('partner_users')
            .insert({
              partner_id: partnerId,
              external_id: user.externalId,
              context: user.context || {},
              consent_given: user.consentGiven ?? false,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (error) {
            console.error(`Error creating user ${user.externalId}:`, error);
            return {
              externalId: user.externalId,
              status: 'failed',
              reason: error.code === '23505' ? 'already_exists' : 'database_error',
            };
          }

          return {
            externalId: user.externalId,
            status: 'created',
            pacefulUserId: newUser.id,
          };
        } catch (err) {
          console.error(`Exception creating user ${user.externalId}:`, err);
          return {
            externalId: user.externalId,
            status: 'failed',
            reason: 'internal_error',
          };
        }
      })
    );

    // Count results
    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed = results.filter(r => r.status === 'failed').length;

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/import/users',
      'POST',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      total: users.length,
      created,
      skipped,
      failed,
      results,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Bulk user import error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/import/users',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
