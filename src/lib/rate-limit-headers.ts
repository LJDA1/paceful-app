/**
 * Rate Limit Headers
 *
 * Adds standard rate limit headers to API responses.
 * Compatible with industry standards (Stripe, Twilio, OpenAI).
 */

export interface RateLimitInfo {
  limit: number;        // Total requests allowed per hour
  remaining: number;    // Requests remaining in current window
  reset: number;        // Unix timestamp (seconds) when the window resets
  retryAfter?: number;  // Seconds until retry (only if rate limited)
}

/**
 * Add rate limit headers to a Response object
 */
export function addRateLimitHeaders(
  response: Response,
  rateLimitInfo: RateLimitInfo
): Response {
  const headers = new Headers(response.headers);

  headers.set('X-RateLimit-Limit', String(rateLimitInfo.limit));
  headers.set('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
  headers.set('X-RateLimit-Reset', String(rateLimitInfo.reset));

  if (rateLimitInfo.remaining === 0 && rateLimitInfo.retryAfter) {
    headers.set('Retry-After', String(rateLimitInfo.retryAfter));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create rate limit info from the rate limit check result
 */
export function createRateLimitInfo(
  limit: number,
  remaining: number,
  resetAt: Date | string | number
): RateLimitInfo {
  // Convert to Unix timestamp (seconds)
  let reset: number;
  if (typeof resetAt === 'number') {
    reset = resetAt;
  } else if (typeof resetAt === 'string') {
    reset = Math.floor(new Date(resetAt).getTime() / 1000);
  } else {
    reset = Math.floor(resetAt.getTime() / 1000);
  }

  const now = Math.floor(Date.now() / 1000);
  const retryAfter = remaining === 0 ? Math.max(0, reset - now) : undefined;

  return {
    limit,
    remaining,
    reset,
    retryAfter,
  };
}
