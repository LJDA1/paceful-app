/**
 * API Authentication Utility
 *
 * Supports both:
 * - Cookie-based auth (web browser)
 * - Bearer token auth (mobile app)
 */

import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export interface AuthResult {
  user: User | null;
  supabase: SupabaseClient;
  error?: string;
}

/**
 * Authenticate an API request using either cookies or Bearer token.
 *
 * For web (cookie auth):
 *   - Uses HttpOnly cookies set by Supabase SSR
 *
 * For mobile (Bearer token auth):
 *   - Expects: Authorization: Bearer <access_token>
 *   - The access_token is from supabase.auth.getSession().session.access_token
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  // Check for Bearer token (mobile auth)
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.substring(7);
    return authenticateWithToken(accessToken);
  }

  // Fall back to cookie auth (web)
  return authenticateWithCookies();
}

/**
 * Authenticate using Bearer token (for mobile apps)
 */
async function authenticateWithToken(accessToken: string): Promise<AuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Create a Supabase client with the access token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  // Verify the token by getting the user
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return {
      user: null,
      supabase,
      error: 'Invalid or expired token',
    };
  }

  return { user, supabase };
}

/**
 * Authenticate using cookies (for web browser)
 */
async function authenticateWithCookies(): Promise<AuthResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase,
      error: 'Not authenticated',
    };
  }

  return { user, supabase };
}
