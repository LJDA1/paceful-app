/**
 * GET /api/v1/partner/auth/session
 *
 * Returns the current partner session info including API keys.
 * Used by the dashboard to check if user is logged in via magic link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPartnerSession } from '@/lib/partner-session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check for session cookie
    const session = await getPartnerSession(request);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        session: null,
      });
    }

    // Get partner details including API keys
    const { data: partner, error } = await supabase
      .from('partner_applications')
      .select('id, company_name, contact_name, contact_email, test_api_key, live_api_key, sandbox_api_key, email_verified_at, is_personal_email, status, created_at')
      .eq('id', session.partnerId)
      .single();

    if (error || !partner) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        error: 'Partner not found',
      });
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        partnerId: partner.id,
        email: partner.contact_email,
        companyName: partner.company_name,
        contactName: partner.contact_name,
      },
      keys: {
        testApiKey: partner.test_api_key || partner.sandbox_api_key,
        liveApiKey: partner.live_api_key,
        testKeyActive: true,
        liveKeyActive: !!partner.email_verified_at && !partner.is_personal_email,
        emailVerified: !!partner.email_verified_at,
        isPersonalEmail: partner.is_personal_email,
      },
      status: partner.status,
      createdAt: partner.created_at,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      authenticated: false,
      session: null,
      error: 'Session check failed',
    }, { status: 500 });
  }
}
