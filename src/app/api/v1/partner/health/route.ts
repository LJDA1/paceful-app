/**
 * GET /api/v1/partner/health
 *
 * Authenticated health check endpoint with partner-specific details.
 * Returns service status plus partner rate limits, webhook counts, etc.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

// Read version from package.json
const APP_VERSION = '0.1.0';

// SDK version info
const SDK_INFO = {
  latestVersion: '1.1.0',
  minimumSupported: '1.0.0',
};

type ServiceStatus = 'operational' | 'degraded' | 'slow' | 'down';

interface ServiceInfo {
  status: ServiceStatus;
  responseTimeMs?: number;
}

/**
 * Ping the database and measure response time
 */
async function pingDatabase(): Promise<{ status: ServiceStatus; responseTimeMs: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { status: 'down', responseTimeMs: 0 };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = performance.now();

  try {
    const { error } = await supabase
      .from('partners')
      .select('id')
      .limit(1);

    const responseTimeMs = Math.round(performance.now() - startTime);

    if (error) {
      return { status: 'degraded', responseTimeMs };
    }

    if (responseTimeMs > 2000) {
      return { status: 'slow', responseTimeMs };
    }

    return { status: 'operational', responseTimeMs };
  } catch {
    const responseTimeMs = Math.round(performance.now() - startTime);
    return { status: 'down', responseTimeMs };
  }
}

/**
 * Determine overall status from service statuses
 */
function determineOverallStatus(services: Record<string, ServiceInfo>): ServiceStatus {
  const statuses = Object.values(services).map(s => s.status);

  if (statuses.includes('down')) {
    return 'down';
  }
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  if (statuses.includes('slow')) {
    return 'slow';
  }
  return 'operational';
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('partner_health', {});
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
    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Ping database
    const dbStatus = await pingDatabase();

    // Calculate API response time (so far)
    const apiResponseTimeMs = Math.round(performance.now() - requestStartTime);

    // Build services status
    const services: Record<string, ServiceInfo> = {
      api: { status: 'operational', responseTimeMs: apiResponseTimeMs },
      database: dbStatus,
      ers_engine: { status: 'operational' },
    };

    // Get partner info
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('name')
      .eq('id', partnerId)
      .single();

    if (partnerError) {
      console.error('Error fetching partner:', partnerError);
    }

    // Get active webhooks count
    const { count: activeWebhooksCount } = await supabase
      .from('partner_webhooks')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)
      .eq('is_active', true);

    // Get total users registered
    const { count: totalUsersCount } = await supabase
      .from('partner_users')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId);

    // Get last API call timestamp
    const { data: lastApiCall } = await supabase
      .from('partner_api_usage')
      .select('called_at')
      .eq('partner_id', partnerId)
      .order('called_at', { ascending: false })
      .limit(1)
      .single();

    // Log API usage
    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/health',
      'GET',
      200,
      Date.now() - startTime
    );

    // Determine overall status
    const overallStatus = determineOverallStatus(services);

    return partnerApiSuccess({
      status: overallStatus,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      services,
      partner: {
        name: partner?.name || 'Unknown',
        rateLimitRemaining: rateLimit.remaining,
        rateLimitReset: rateLimit.reset,
        activeWebhooks: activeWebhooksCount || 0,
        totalUsersRegistered: totalUsersCount || 0,
        lastApiCall: lastApiCall?.called_at || null,
      },
      sdk: SDK_INFO,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Partner health check error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/health',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
