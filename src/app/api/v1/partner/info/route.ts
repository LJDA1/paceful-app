/**
 * GET /api/v1/partner/info
 *
 * Get partner account information.
 * Returns partner name, masked API key, permissions, and usage stats.
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

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('partner_info', {});
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
    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Get partner details
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, api_key, permissions, rate_limit, created_at')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      console.error('Error fetching partner:', partnerError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/info',
        'GET',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to fetch partner info', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('partner_users')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId);

    if (usersError) {
      console.error('Error counting users:', usersError);
    }

    // Mask API key (show first 8 and last 4 characters)
    const apiKey = partner.api_key || '';
    const maskedApiKey = apiKey.length > 12
      ? `${apiKey.slice(0, 8)}${'•'.repeat(Math.max(0, apiKey.length - 12))}${apiKey.slice(-4)}`
      : '•'.repeat(apiKey.length);

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/info',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      partnerName: partner.name,
      apiKey: maskedApiKey,
      permissions: partner.permissions || ['read', 'write'],
      rateLimit: partner.rate_limit || 100,
      createdAt: partner.created_at,
      totalUsers: totalUsers || 0,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Partner info error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/info',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
