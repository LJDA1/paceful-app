import { NextResponse } from 'next/server';

/**
 * Standardized API Error Response Utility
 *
 * Provides consistent error responses across all API endpoints.
 */

export interface APIErrorResponse {
  error: string;
  code: string;
  status: number;
  details?: string;
}

/**
 * Create a standardized API error response
 */
export function apiError(
  message: string,
  code: string,
  status: number,
  details?: string
): NextResponse<APIErrorResponse> {
  const body: APIErrorResponse = {
    error: message,
    code,
    status,
  };

  if (details) {
    body.details = details;
  }

  return NextResponse.json(body, { status });
}

/**
 * Common error responses
 */
export const errors = {
  unauthorized: (details?: string) =>
    apiError('Unauthorized', 'UNAUTHORIZED', 401, details),

  forbidden: (details?: string) =>
    apiError('Forbidden', 'FORBIDDEN', 403, details),

  notFound: (resource = 'Resource', details?: string) =>
    apiError(`${resource} not found`, 'NOT_FOUND', 404, details),

  badRequest: (message: string, details?: string) =>
    apiError(message, 'BAD_REQUEST', 400, details),

  validationError: (message: string, details?: string) =>
    apiError(message, 'VALIDATION_ERROR', 422, details),

  internalError: (details?: string) =>
    apiError('Internal server error', 'INTERNAL_ERROR', 500, details),

  rateLimited: (resetAt?: string) =>
    apiError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      resetAt ? `Resets at ${resetAt}` : undefined
    ),

  serviceUnavailable: (details?: string) =>
    apiError('Service temporarily unavailable', 'SERVICE_UNAVAILABLE', 503, details),
};

/**
 * Validate admin API key from request
 */
export function validateAdminKeyFromRequest(
  request: Request,
  envKey = 'ADMIN_API_KEY'
): boolean {
  const url = new URL(request.url);
  const keyFromQuery = url.searchParams.get('key');
  const keyFromHeader = request.headers.get('X-Admin-Key');
  const providedKey = keyFromQuery || keyFromHeader;

  const expectedKey = process.env[envKey];

  if (!expectedKey) {
    // No admin key configured - deny all
    return false;
  }

  return providedKey === expectedKey;
}

/**
 * Conditional logger that only logs in development
 */
export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
