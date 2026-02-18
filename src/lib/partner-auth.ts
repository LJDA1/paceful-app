/**
 * Partner API Authentication Middleware
 *
 * Validates partner API keys and handles rate limiting for B2B integrations.
 * Partner API keys are stored in the api_keys table with prefix "pk_".
 */

import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization for Supabase admin client
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

// ============================================================================
// Types
// ============================================================================

export interface PartnerKeyValidation {
  valid: boolean;
  partnerId: string | null;
  partnerName: string | null;
  permissions: string[];
  rateLimit: number;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
}

// ============================================================================
// Test API Keys (for development)
// ============================================================================

const TEST_PARTNER_KEYS: Record<string, {
  partnerId: string;
  partnerName: string;
  permissions: string[];
  rateLimit: number
}> = {
  'pk_test_partner_demo_2024': {
    partnerId: 'test_partner_001',
    partnerName: 'Test Partner',
    permissions: ['users:write', 'mood:write', 'journal:write', 'ers:read', 'ers:write', 'analytics:read', 'webhooks:write'],
    rateLimit: 1000,
  },
  'pk_test_enterprise_2024': {
    partnerId: 'test_enterprise_001',
    partnerName: 'Enterprise Test Partner',
    permissions: ['users:write', 'mood:write', 'journal:write', 'ers:read', 'ers:write', 'analytics:read', 'webhooks:write'],
    rateLimit: 10000,
  },
};

// ============================================================================
// Partner Key Validation
// ============================================================================

/**
 * Validate a partner API key from the Authorization header
 */
export async function validatePartnerKey(request: NextRequest): Promise<PartnerKeyValidation> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      valid: false,
      partnerId: null,
      partnerName: null,
      permissions: [],
      rateLimit: 0,
      error: 'Missing Authorization header',
    };
  }

  // Extract Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      valid: false,
      partnerId: null,
      partnerName: null,
      permissions: [],
      rateLimit: 0,
      error: 'Invalid Authorization header format. Use: Bearer <api_key>',
    };
  }

  const apiKey = parts[1];

  // Validate key format (should start with pk_)
  if (!apiKey.startsWith('pk_')) {
    return {
      valid: false,
      partnerId: null,
      partnerName: null,
      permissions: [],
      rateLimit: 0,
      error: 'Invalid API key format',
    };
  }

  // Check test keys first (for development)
  const testKey = TEST_PARTNER_KEYS[apiKey];
  if (testKey) {
    return {
      valid: true,
      partnerId: testKey.partnerId,
      partnerName: testKey.partnerName,
      permissions: testKey.permissions,
      rateLimit: testKey.rateLimit,
    };
  }

  try {
    const supabase = getSupabaseAdmin();

    // Look up API key in database
    const { data: keyData, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, partner_name, permissions, rate_limit_per_hour, is_active')
      .eq('api_key', apiKey)
      .single();

    if (fetchError || !keyData) {
      return {
        valid: false,
        partnerId: null,
        partnerName: null,
        permissions: [],
        rateLimit: 0,
        error: 'Invalid API key',
      };
    }

    if (!keyData.is_active) {
      return {
        valid: false,
        partnerId: keyData.id,
        partnerName: keyData.partner_name,
        permissions: [],
        rateLimit: 0,
        error: 'API key is deactivated',
      };
    }

    // Update last_used_at timestamp (fire and forget)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)
      .then(() => {});

    return {
      valid: true,
      partnerId: keyData.id,
      partnerName: keyData.partner_name,
      permissions: keyData.permissions || [],
      rateLimit: keyData.rate_limit_per_hour || 100,
    };
  } catch (error) {
    console.error('Partner key validation error:', error);
    return {
      valid: false,
      partnerId: null,
      partnerName: null,
      permissions: [],
      rateLimit: 0,
      error: 'Internal server error during authentication',
    };
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check rate limit for a partner
 */
export async function checkPartnerRateLimit(
  partnerId: string,
  rateLimit: number
): Promise<RateLimitResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const resetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  try {
    const supabase = getSupabaseAdmin();

    const { count, error } = await supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', partnerId)
      .gte('timestamp', oneHourAgo);

    if (error) {
      // On error, allow the request but log it
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: rateLimit, resetAt };
    }

    const used = count || 0;
    const remaining = Math.max(0, rateLimit - used);

    if (remaining <= 0) {
      const retryAfter = Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: rateLimit, resetAt };
  }
}

/**
 * Log API usage for rate limiting and analytics
 */
export async function logPartnerApiUsage(
  partnerId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    await supabase.from('api_usage_logs').insert({
      client_id: partnerId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log API usage:', error);
  }
}

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Check if partner has a specific permission
 */
export function hasPartnerPermission(validation: PartnerKeyValidation, permission: string): boolean {
  return validation.permissions.includes(permission);
}

// ============================================================================
// Response Helpers
// ============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Create a standardized error response
 */
export function partnerApiError(
  message: string,
  code: string,
  status: number,
  headers?: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
        ...headers,
      },
    }
  );
}

/**
 * Create a standardized success response
 */
export function partnerApiSuccess(
  data: unknown,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

/**
 * Handle CORS preflight requests
 */
export function handlePartnerCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Add rate limit headers to response
 */
export function withRateLimitHeaders(
  response: Response,
  rateLimit: RateLimitResult & { limit: number }
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  headers.set('X-RateLimit-Reset', rateLimit.resetAt);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
