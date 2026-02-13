/**
 * B2B API Authentication Middleware
 *
 * Validates API keys for partner integrations.
 * API keys are stored in the api_keys table.
 */

import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization for Supabase admin client
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
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

export interface ApiKeyValidation {
  valid: boolean;
  partnerId: string | null;
  partnerName: string | null;
  permissions: string[];
  rateLimitPerHour: number;
  error?: string;
}

export interface APIClient {
  id: string;
  name: string;
  apiKey: string;
  tier: 'basic' | 'premium' | 'enterprise';
  rateLimit: number;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// Test API Keys (for development when table doesn't exist)
// ============================================================================

const TEST_API_KEYS: Record<string, { partnerId: string; partnerName: string; permissions: string[]; rateLimit: number }> = {
  'pk_test_paceful_demo_key_2024': {
    partnerId: 'test_partner_001',
    partnerName: 'Test Partner',
    permissions: ['read_ers', 'read_analytics'],
    rateLimit: 100,
  },
  'pk_test_paceful_b2b_2025_demo': {
    partnerId: 'demo_partner_001',
    partnerName: 'Demo B2B Partner',
    permissions: ['read_ers'],
    rateLimit: 100,
  },
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a B2B API key from the Authorization header
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidation> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      valid: false,
      partnerId: null,
      partnerName: null,
      permissions: [],
      rateLimitPerHour: 0,
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
      rateLimitPerHour: 0,
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
      rateLimitPerHour: 0,
      error: 'Invalid API key format',
    };
  }

  // Check test keys first (for development)
  const testKey = TEST_API_KEYS[apiKey];
  if (testKey) {
    return {
      valid: true,
      partnerId: testKey.partnerId,
      partnerName: testKey.partnerName,
      permissions: testKey.permissions,
      rateLimitPerHour: testKey.rateLimit,
    };
  }

  try {
    // Look up API key in database
    const { data: keyData, error: fetchError } = await getSupabaseAdmin()
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
        rateLimitPerHour: 0,
        error: 'Invalid API key',
      };
    }

    if (!keyData.is_active) {
      return {
        valid: false,
        partnerId: keyData.id,
        partnerName: keyData.partner_name,
        permissions: [],
        rateLimitPerHour: 0,
        error: 'API key is deactivated',
      };
    }

    // Update last_used_at timestamp (fire and forget)
    getSupabaseAdmin()
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)
      .then(() => {});

    return {
      valid: true,
      partnerId: keyData.id,
      partnerName: keyData.partner_name,
      permissions: keyData.permissions || [],
      rateLimitPerHour: keyData.rate_limit_per_hour || 100,
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return {
      valid: false,
      partnerId: null,
      partnerName: null,
      permissions: [],
      rateLimitPerHour: 0,
      error: 'Internal server error during authentication',
    };
  }
}

/**
 * Check if the validated API key has a specific permission
 */
export function hasPermission(validation: ApiKeyValidation, permission: string): boolean {
  return validation.permissions.includes(permission);
}

// ============================================================================
// Response Helpers
// ============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Create a standardized error response for API routes
 */
export function apiError(message: string, code: string, status: number): Response {
  return new Response(
    JSON.stringify({
      error: {
        message,
        code,
      },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

/**
 * Create a standardized success response for API routes
 */
export function apiSuccess(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ============================================================================
// Usage Logging
// ============================================================================

export interface APIUsageLog {
  clientId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log API usage for analytics and billing
 */
export async function logAPIUsage(log: APIUsageLog): Promise<void> {
  try {
    await getSupabaseAdmin().from('api_usage_logs').insert({
      client_id: log.clientId,
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.statusCode,
      response_time_ms: log.responseTime,
      timestamp: log.timestamp,
      metadata: log.metadata || {},
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log API usage:', error);
  }
}

/**
 * Check rate limit for a client
 */
export async function checkRateLimit(
  clientId: string,
  rateLimit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    const { count, error } = await getSupabaseAdmin()
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('timestamp', oneHourAgo);

    if (error) {
      return { allowed: true, remaining: rateLimit, resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
    }

    const used = count || 0;
    const remaining = Math.max(0, rateLimit - used);
    const resetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    return {
      allowed: remaining > 0,
      remaining,
      resetAt,
    };
  } catch {
    return { allowed: true, remaining: rateLimit, resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  }
}

// ============================================================================
// Legacy exports (for backward compatibility)
// ============================================================================

export async function validateAPIKey(apiKey: string | null): Promise<{
  valid: boolean;
  client?: APIClient;
  error?: string;
}> {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  // Check test keys
  const testKey = TEST_API_KEYS[apiKey];
  if (testKey) {
    return {
      valid: true,
      client: {
        id: testKey.partnerId,
        name: testKey.partnerName,
        apiKey,
        tier: 'basic',
        rateLimit: testKey.rateLimit,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    };
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!data.is_active) {
      return { valid: false, error: 'API key is inactive' };
    }

    return {
      valid: true,
      client: {
        id: data.id,
        name: data.partner_name,
        apiKey: data.api_key,
        tier: 'basic',
        rateLimit: data.rate_limit_per_hour,
        isActive: data.is_active,
        createdAt: data.created_at,
      },
    };
  } catch {
    return { valid: false, error: 'Invalid API key' };
  }
}

export function extractAPIKey(headers: Headers): string | null {
  const authHeader = headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const apiKeyHeader = headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }
  return null;
}

export async function authenticateB2BRequest(
  headers: Headers
): Promise<{
  authenticated: boolean;
  client?: APIClient;
  error?: string;
  statusCode?: number;
}> {
  const apiKey = extractAPIKey(headers);
  const validation = await validateAPIKey(apiKey);

  if (!validation.valid || !validation.client) {
    return {
      authenticated: false,
      error: validation.error || 'Authentication failed',
      statusCode: 401,
    };
  }

  return {
    authenticated: true,
    client: validation.client,
  };
}
