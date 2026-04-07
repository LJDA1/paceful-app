/**
 * GET /api/v1/partner/auth/verify
 *
 * Verifies a magic link token and creates a session.
 *
 * Flow:
 * 1. Look up partner by magic_link_token
 * 2. Check token not expired (15 minutes)
 * 3. Clear token
 * 4. Create session cookie (7-day JWT with partner_id, email, company)
 * 5. Redirect to /partners/dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPartnerSession, setSessionCookie } from '@/lib/partner-session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paceful.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        `${APP_URL}/partners/login?error=missing_token`
      );
    }

    // Look up partner by magic link token
    const { data: partner, error: lookupError } = await supabase
      .from('partner_applications')
      .select('id, contact_email, contact_name, company_name, magic_link_expires_at')
      .eq('magic_link_token', token)
      .single();

    if (lookupError || !partner) {
      console.error('Magic link token lookup failed:', lookupError);
      return NextResponse.redirect(
        `${APP_URL}/partners/login?error=invalid_token`
      );
    }

    // Check if token has expired
    if (partner.magic_link_expires_at) {
      const expiresAt = new Date(partner.magic_link_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.redirect(
          `${APP_URL}/partners/login?error=token_expired`
        );
      }
    }

    // Clear the magic link token (single use)
    const { error: updateError } = await supabase
      .from('partner_applications')
      .update({
        magic_link_token: null,
        magic_link_expires_at: null,
      })
      .eq('id', partner.id);

    if (updateError) {
      console.error('Error clearing magic link token:', updateError);
      // Continue anyway - token might get reused but that's low risk
    }

    // Create session JWT
    const sessionToken = await createPartnerSession({
      partnerId: partner.id,
      email: partner.contact_email,
      companyName: partner.company_name,
    });

    // Log the login
    console.log(`[Magic Link Login] ${partner.company_name} (${partner.contact_email})`);

    // Create redirect response with session cookie
    const response = NextResponse.redirect(
      `${APP_URL}/partners/dashboard?logged_in=true`
    );

    // Set the session cookie
    setSessionCookie(response, sessionToken);

    return response;
  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.redirect(
      `${APP_URL}/partners/login?error=verification_failed`
    );
  }
}
