/**
 * POST /api/v1/partner/auth/magic-link
 *
 * Sends a magic link login email to the partner.
 *
 * Flow:
 * 1. Look up partner by email
 * 2. Generate magic_link_token (crypto random, 32 chars)
 * 3. Set magic_link_expires_at (15 minutes)
 * 4. Send email with link: /api/v1/partner/auth/verify?token=xxx
 * 5. Return success message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSecureToken } from '@/lib/partner-session';
import { sendMagicLinkEmail } from '@/lib/partner-emails';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MagicLinkRequest {
  email: string;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: MagicLinkRequest = await request.json();

    // Validate email
    if (!body.email?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
        { status: 400 }
      );
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' } },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();

    // Look up partner by email
    const { data: partner, error: lookupError } = await supabase
      .from('partner_applications')
      .select('id, contact_email, contact_name, company_name')
      .eq('contact_email', email)
      .single();

    if (lookupError || !partner) {
      // Don't reveal whether the email exists or not for security
      // Always return success to prevent email enumeration
      console.log(`[Magic Link] Email not found: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a login link shortly.',
      });
    }

    // Generate magic link token
    const magicLinkToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Update partner with magic link token
    const { error: updateError } = await supabase
      .from('partner_applications')
      .update({
        magic_link_token: magicLinkToken,
        magic_link_expires_at: expiresAt,
      })
      .eq('id', partner.id);

    if (updateError) {
      console.error('Error updating magic link token:', updateError);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to generate login link. Please try again.' } },
        { status: 500 }
      );
    }

    // Send magic link email
    const emailSent = await sendMagicLinkEmail({
      email: partner.contact_email,
      name: partner.contact_name,
      magicLinkToken,
    });

    if (!emailSent) {
      console.error('Failed to send magic link email to:', email);
    }

    // Log the request
    console.log(`[Magic Link] Sent to ${email}`);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a login link shortly.',
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Magic link request error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' } },
      { status: 500 }
    );
  }
}
