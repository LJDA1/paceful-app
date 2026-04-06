/**
 * POST /api/v1/partner/import/mood
 *
 * Bulk import mood logs for partners migrating historical data.
 * Processes up to 1000 entries per request in parallel.
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

const MAX_ENTRIES_PER_REQUEST = 1000;
const MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface MoodImportRecord {
  externalId: string;
  score: number;
  label?: string;
  emotions?: string[];
  note?: string;
  timestamp: string;
}

interface ImportResult {
  externalId: string;
  timestamp: string;
  status: 'created' | 'skipped' | 'failed';
  moodId?: string;
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
    return sandboxResponse('import_mood', { entries: body.entries || [] });
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
    const entries: MoodImportRecord[] = body.entries;

    // Validate request body
    if (!Array.isArray(entries)) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/import/mood',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'Request body must contain an "entries" array',
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    if (entries.length === 0) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/import/mood',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'Entries array cannot be empty',
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    if (entries.length > MAX_ENTRIES_PER_REQUEST) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/import/mood',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Maximum ${MAX_ENTRIES_PER_REQUEST} entries per request. Received ${entries.length}`,
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Get all unique externalIds from entries
    const externalIds = [...new Set(entries.map(e => e.externalId))];

    // Look up partner users for all external IDs
    const { data: partnerUsers } = await supabase
      .from('partner_users')
      .select('id, external_id')
      .eq('partner_id', partnerId)
      .in('external_id', externalIds);

    const userIdMap = new Map(partnerUsers?.map(u => [u.external_id, u.id]) || []);

    // Process entries in parallel
    const results: ImportResult[] = await Promise.all(
      entries.map(async (entry): Promise<ImportResult> => {
        const baseResult = {
          externalId: entry.externalId || '(missing)',
          timestamp: entry.timestamp || '(missing)',
        };

        // Validate externalId
        if (!entry.externalId || typeof entry.externalId !== 'string') {
          return {
            ...baseResult,
            status: 'failed',
            reason: 'invalid_external_id',
          };
        }

        // Validate score
        if (typeof entry.score !== 'number' || entry.score < 1 || entry.score > 5) {
          return {
            ...baseResult,
            status: 'failed',
            reason: 'invalid_score',
          };
        }

        // Validate timestamp
        if (!entry.timestamp) {
          return {
            ...baseResult,
            status: 'failed',
            reason: 'missing_timestamp',
          };
        }

        const parsedTimestamp = new Date(entry.timestamp);
        if (isNaN(parsedTimestamp.getTime())) {
          return {
            ...baseResult,
            status: 'failed',
            reason: 'invalid_timestamp',
          };
        }

        // Check if user exists
        const partnerUserId = userIdMap.get(entry.externalId);
        if (!partnerUserId) {
          return {
            ...baseResult,
            status: 'failed',
            reason: 'user_not_found',
          };
        }

        // Create the mood entry
        try {
          const { data: moodEntry, error } = await supabase
            .from('partner_mood_logs')
            .insert({
              partner_id: partnerId,
              partner_user_id: partnerUserId,
              score: entry.score,
              label: entry.label || null,
              emotions: entry.emotions || [],
              note: entry.note || null,
              logged_at: parsedTimestamp.toISOString(),
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (error) {
            console.error(`Error creating mood entry for ${entry.externalId}:`, error);
            return {
              ...baseResult,
              status: 'failed',
              reason: 'database_error',
            };
          }

          return {
            ...baseResult,
            status: 'created',
            moodId: moodEntry.id,
          };
        } catch (err) {
          console.error(`Exception creating mood entry for ${entry.externalId}:`, err);
          return {
            ...baseResult,
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
      '/api/v1/partner/import/mood',
      'POST',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      total: entries.length,
      created,
      skipped,
      failed,
      results,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Bulk mood import error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/import/mood',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
