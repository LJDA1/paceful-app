/**
 * GET /api/v1/partner/usage
 *
 * Get API usage statistics for a partner.
 * Currently returns mock data - will be replaced with real tracking.
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkEndpointRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
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
    return sandboxResponse('partner_usage', {});
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
  const rateLimitResult = await checkEndpointRateLimit(validation.partnerId!, request.url);
  if (!rateLimitResult.allowed) {
    return partnerApiError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      undefined,
      rateLimitResult
    );
  }

  try {
    const partnerId = validation.partnerId!;
    const rateLimitPerHour = validation.rateLimit || 100;

    // TODO: Replace with real usage tracking from partner_api_usage table
    // For now, return realistic mock data
    const mockUsageData = {
      totalCalls30d: 847,
      callsToday: 23,
      rateLimitPerHour,
      rateLimitRemaining: rateLimitResult.remaining,
      topEndpoints: [
        { endpoint: '/ers/{id}', calls: 342 },
        { endpoint: '/mood/log', calls: 228 },
        { endpoint: '/analytics/summary', calls: 156 },
        { endpoint: '/journal/entry', calls: 89 },
        { endpoint: '/users', calls: 32 },
      ],
    };

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/usage',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess(mockUsageData, 200, undefined, rateLimitResult);
  } catch (error) {
    console.error('Usage stats error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/usage',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimitResult);
  }
}
