/**
 * POST /api/v1/partner/auth/logout
 *
 * Clears the partner session cookie and logs the user out.
 */

import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/partner-session';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear the session cookie
  clearSessionCookie(response);

  return response;
}
