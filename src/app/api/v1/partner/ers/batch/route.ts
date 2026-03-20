/**
 * POST /api/v1/partner/ers/batch
 *
 * Get ERS scores for multiple partner users at once.
 * Maximum 50 users per request.
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkPartnerRateLimit,
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
    return sandboxResponse('ers_batch', body);
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
  const rateLimit = await checkPartnerRateLimit(validation.partnerId!, validation.rateLimit);
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
    const { externalIds } = body;

    // Validate input
    if (!Array.isArray(externalIds)) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/batch',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('externalIds must be an array', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (externalIds.length === 0) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/batch',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('externalIds array cannot be empty', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (externalIds.length > 50) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/ers/batch',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('Maximum 50 externalIds per request', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    // Deduplicate and validate IDs
    const uniqueIds = [...new Set(externalIds.filter(id => typeof id === 'string' && id.trim()))];

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Look up all partner users
    const { data: partnerUsers, error: usersError } = await supabase
      .from('partner_users')
      .select('id, external_id')
      .eq('partner_id', partnerId)
      .in('external_id', uniqueIds);

    if (usersError) {
      console.error('Error fetching partner users:', usersError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/batch',
        'POST',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch users', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    if (!partnerUsers || partnerUsers.length === 0) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/batch',
        'POST',
        200,
        Date.now() - startTime
      );
      return partnerApiSuccess({
        results: [],
        totalRequested: externalIds.length,
        totalReturned: 0,
      }, 200, undefined, rateLimit);
    }

    // Build a map of external_id to partner_user_id
    const userIdMap = new Map<string, string>();
    const partnerUserIds: string[] = [];
    for (const user of partnerUsers) {
      userIdMap.set(user.external_id, user.id);
      partnerUserIds.push(user.id);
    }

    // Fetch latest ERS scores for all found users
    // Using a subquery to get the latest score per user
    const { data: ersScores, error: ersError } = await supabase
      .from('partner_ers_scores')
      .select('partner_user_id, ers_score, ers_stage, calculated_at')
      .in('partner_user_id', partnerUserIds)
      .order('calculated_at', { ascending: false });

    if (ersError) {
      console.error('Error fetching ERS scores:', ersError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/ers/batch',
        'POST',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch ERS scores', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    // Group scores by user and get latest for each
    const latestScoresByUserId = new Map<string, {
      ersScore: number;
      stage: string;
      calculatedAt: string;
    }>();

    for (const score of ersScores || []) {
      if (!latestScoresByUserId.has(score.partner_user_id)) {
        latestScoresByUserId.set(score.partner_user_id, {
          ersScore: score.ers_score,
          stage: score.ers_stage,
          calculatedAt: score.calculated_at,
        });
      }
    }

    // Build results
    const results: Array<{
      externalId: string;
      ersScore: number | null;
      stage: string | null;
      calculatedAt: string | null;
    }> = [];

    for (const user of partnerUsers) {
      const scoreData = latestScoresByUserId.get(user.id);
      results.push({
        externalId: user.external_id,
        ersScore: scoreData?.ersScore ?? null,
        stage: scoreData?.stage ?? null,
        calculatedAt: scoreData?.calculatedAt ?? null,
      });
    }

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/ers/batch',
      'POST',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      results,
      totalRequested: externalIds.length,
      totalReturned: results.length,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Batch ERS error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/ers/batch',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
