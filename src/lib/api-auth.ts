/**
 * API Key Authentication for B2B Endpoints
 *
 * Simple API key validation for B2B partners.
 * For production, use proper key management with database.
 */

import { supabase } from './supabase';

// ============================================================================
// Types
// ============================================================================

export interface APIClient {
  id: string;
  name: string;
  apiKey: string;
  tier: 'basic' | 'premium' | 'enterprise';
  rateLimit: number; // requests per hour
  isActive: boolean;
  createdAt: string;
}

export interface APIUsageLog {
  clientId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Hardcoded Test API Keys (for development)
// ============================================================================

const TEST_API_KEYS: Record<string, APIClient> = {
  'pk_test_paceful_b2b_2025_demo': {
    id: 'client_demo_001',
    name: 'Demo B2B Partner',
    apiKey: 'pk_test_paceful_b2b_2025_demo',
    tier: 'basic',
    rateLimit: 100,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
  'pk_test_research_partner_alpha': {
    id: 'client_research_001',
    name: 'Research Partner Alpha',
    apiKey: 'pk_test_research_partner_alpha',
    tier: 'premium',
    rateLimit: 500,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
  'pk_test_enterprise_corp': {
    id: 'client_enterprise_001',
    name: 'Enterprise Corp',
    apiKey: 'pk_test_enterprise_corp',
    tier: 'enterprise',
    rateLimit: 2000,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
};

// Admin API key for internal use (loaded from environment)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'sk_admin_paceful_internal_2025';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate API key and return client info
 */
export async function validateAPIKey(apiKey: string | null): Promise<{
  valid: boolean;
  client?: APIClient;
  error?: string;
}> {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  // Check hardcoded test keys first
  const testClient = TEST_API_KEYS[apiKey];
  if (testClient) {
    if (!testClient.isActive) {
      return { valid: false, error: 'API key is inactive' };
    }
    return { valid: true, client: testClient };
  }

  // Try database lookup (for production keys)
  try {
    const { data, error } = await supabase
      .from('api_clients')
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
        name: data.name,
        apiKey: data.api_key,
        tier: data.tier,
        rateLimit: data.rate_limit,
        isActive: data.is_active,
        createdAt: data.created_at,
      },
    };
  } catch {
    // Table might not exist yet, fall back to test keys only
    return { valid: false, error: 'Invalid API key' };
  }
}

/**
 * Validate admin API key
 */
export function validateAdminKey(apiKey: string | null): boolean {
  return apiKey === ADMIN_API_KEY;
}

/**
 * Extract API key from request headers
 */
export function extractAPIKey(headers: Headers): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try X-API-Key header
  const apiKeyHeader = headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log API usage for analytics and billing
 */
export async function logAPIUsage(log: APIUsageLog): Promise<void> {
  try {
    await supabase.from('api_usage_logs').insert({
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
    const { count, error } = await supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('timestamp', oneHourAgo);

    if (error) {
      // Allow request if we can't check rate limit
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
    // Allow request if rate limiting fails
    return { allowed: true, remaining: rateLimit, resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  }
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Authenticate B2B API request
 */
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

  // Check rate limit
  const rateCheck = await checkRateLimit(validation.client.id, validation.client.rateLimit);
  if (!rateCheck.allowed) {
    return {
      authenticated: false,
      error: `Rate limit exceeded. Resets at ${rateCheck.resetAt}`,
      statusCode: 429,
    };
  }

  return {
    authenticated: true,
    client: validation.client,
  };
}
