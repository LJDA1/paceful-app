/**
 * GET /api/v1/partner/verify
 *
 * Email verification endpoint. Verifies the token from the email link
 * and activates the partner's live API key.
 *
 * Flow:
 * 1. Look up partner by verification_token
 * 2. Check token not expired (24 hour validity)
 * 3. Update partner: email_verified_at = now(), status = 'verified'
 * 4. Activate live key in api_keys table
 * 5. Clear verification_token
 * 6. Redirect to /partners/dashboard?verified=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendLiveKeyActivatedEmail } from '@/lib/partner-emails';

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
        `${APP_URL}/partners/dashboard?error=missing_token`
      );
    }

    // Look up partner by verification token
    const { data: partner, error: lookupError } = await supabase
      .from('partner_applications')
      .select('id, contact_email, contact_name, company_name, live_api_key, verification_expires_at, email_verified_at')
      .eq('verification_token', token)
      .single();

    if (lookupError || !partner) {
      console.error('Verification token lookup failed:', lookupError);
      return NextResponse.redirect(
        `${APP_URL}/partners/dashboard?error=invalid_token`
      );
    }

    // Check if already verified
    if (partner.email_verified_at) {
      return NextResponse.redirect(
        `${APP_URL}/partners/dashboard?already_verified=true`
      );
    }

    // Check if token has expired
    if (partner.verification_expires_at) {
      const expiresAt = new Date(partner.verification_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.redirect(
          `${APP_URL}/partners/dashboard?error=token_expired`
        );
      }
    }

    // Update partner record: mark as verified, clear token
    const { error: updateError } = await supabase
      .from('partner_applications')
      .update({
        email_verified_at: new Date().toISOString(),
        status: 'verified',
        verification_token: null,
        verification_expires_at: null,
      })
      .eq('id', partner.id);

    if (updateError) {
      console.error('Error updating partner verification:', updateError);
      return NextResponse.redirect(
        `${APP_URL}/partners/dashboard?error=update_failed`
      );
    }

    // Activate the live API key
    if (partner.live_api_key) {
      const { error: keyError } = await supabase
        .from('api_keys')
        .update({
          is_active: true,
        })
        .eq('api_key', partner.live_api_key);

      if (keyError) {
        console.error('Error activating live API key:', keyError);
        // Don't fail the whole operation - the key can be activated manually
      }
    }

    // Send confirmation email
    await sendLiveKeyActivatedEmail({
      email: partner.contact_email,
      name: partner.contact_name,
      companyName: partner.company_name,
      liveKey: partner.live_api_key,
    });

    // Log the verification
    console.log(`[Partner Verified] ${partner.company_name} (${partner.contact_email})`);

    // Redirect to dashboard with success flag
    return NextResponse.redirect(
      `${APP_URL}/partners/dashboard?verified=true`
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      `${APP_URL}/partners/dashboard?error=verification_failed`
    );
  }
}
