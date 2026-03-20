/**
 * Sandbox Middleware
 *
 * Detects sandbox requests and provides helper functions for sandbox mode.
 */

import { NextResponse } from 'next/server';
import { getSandboxResponse, SANDBOX_ENDPOINTS } from './sandbox-data';
import { CURRENT_API_VERSION, MINIMUM_SUPPORTED_VERSION } from './api-version';

// The demo sandbox API key (for documentation examples)
export const SANDBOX_API_KEY = 'pk_sandbox_paceful_demo';

/**
 * Check if a request is using any sandbox API key.
 * All keys starting with pk_sandbox_ are treated as sandbox keys.
 * This allows partners to sign up and get working sandbox access immediately.
 */
export function isSandboxRequest(apiKey: string): boolean {
  return apiKey.startsWith('pk_sandbox_');
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(headers: Headers): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Create a sandbox response with appropriate headers
 */
export function sandboxResponse(
  endpoint: string,
  params: Record<string, unknown> = {},
  status: number = 200
): NextResponse {
  const data = getSandboxResponse(endpoint, params);

  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Paceful-Sandbox': 'true',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      // Version headers on all responses including sandbox
      'X-API-Version': CURRENT_API_VERSION,
      'X-API-Min-Version': MINIMUM_SUPPORTED_VERSION,
    },
  });
}

/**
 * Get sandbox status information
 */
export function getSandboxStatus() {
  return {
    sandbox: true,
    available_endpoints: SANDBOX_ENDPOINTS,
    test_api_key: SANDBOX_API_KEY,
    documentation_url: '/partners/docs',
    notes: [
      'Sandbox mode returns realistic mock data',
      'No authentication setup required',
      'Requests do not count against rate limits',
      'Data is deterministic - same inputs return same outputs',
      'All response schemas match production exactly',
    ],
  };
}
