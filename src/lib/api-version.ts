/**
 * API Versioning Infrastructure
 *
 * Provides version headers for all partner API responses and
 * manages version compatibility.
 */

import { NextResponse } from 'next/server';

export const CURRENT_API_VERSION = '1.0.0';
export const MINIMUM_SUPPORTED_VERSION = '1.0.0';

/**
 * Add version headers to a NextResponse.
 * Should be called on every partner API response.
 */
export function addVersionHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-API-Version', CURRENT_API_VERSION);
  response.headers.set('X-API-Min-Version', MINIMUM_SUPPORTED_VERSION);
  return response;
}

/**
 * Check if a requested version is supported.
 * For future use when we implement version negotiation.
 */
export function isVersionSupported(version: string): boolean {
  const [major, minor, patch] = version.split('.').map(Number);
  const [minMajor, minMinor, minPatch] = MINIMUM_SUPPORTED_VERSION.split('.').map(Number);

  if (major < minMajor) return false;
  if (major > minMajor) return true;
  if (minor < minMinor) return false;
  if (minor > minMinor) return true;
  return patch >= minPatch;
}

/**
 * Add deprecation headers for endpoints being phased out.
 * For future use when deprecating endpoints.
 */
export function addDeprecationHeaders(
  response: NextResponse,
  sunsetDate: string,
  replacementUrl?: string
): NextResponse {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', sunsetDate);
  if (replacementUrl) {
    response.headers.set('Link', `<${replacementUrl}>; rel="successor-version"`);
  }
  return response;
}
