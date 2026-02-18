/**
 * GET /api/v1/partner/usage
 *
 * Get API usage statistics for a partner.
 * Currently returns mock data - will be replaced with real tracking.
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkPartnerRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
} from '@/lib/partner-auth';

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
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
    const partnerId = validation.partnerId!;
    const rateLimitPerHour = validation.rateLimit || 100;

    // TODO: Replace with real usage tracking from partner_api_usage table
    // For now, return realistic mock data
    const mockUsageData = {
      totalCalls30d: 847,
      callsToday: 23,
      rateLimitPerHour,
      rateLimitRemaining: Math.max(0, rateLimitPerHour - Math.floor(Math.random() * 20)),
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

    return partnerApiSuccess(mockUsageData);
  } catch (error) {
    console.error('Usage stats error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/usage',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
