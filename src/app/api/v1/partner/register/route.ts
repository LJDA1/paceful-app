/**
 * POST /api/v1/partner/register
 *
 * Enhanced partner registration with dual API keys (test + live),
 * email verification, and personal email detection.
 *
 * Flow:
 * 1. Validate required fields + terms acceptance
 * 2. Check email domain → set is_personal_email flag
 * 3. Generate pk_test_* (active immediately) and pk_live_* keys
 * 4. If business email: generate verification token, send verification email
 * 5. If personal email: live key disabled, prompt to use business email
 * 6. Return both keys + verification status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRENT_API_VERSION, MINIMUM_SUPPORTED_VERSION } from '@/lib/api-version';
import { generateSecureToken } from '@/lib/partner-session';
import { sendWelcomeEmail } from '@/lib/partner-emails';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Personal email domains that cannot get live API keys directly
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.fr',
  'live.com',
  'live.co.uk',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'gmx.com',
  'gmx.de',
  'yandex.com',
  'yandex.ru',
  'tutanota.com',
  'zoho.com',
  'fastmail.com',
  'hey.com',
];

interface RegisterRequest {
  companyName: string;
  contactName: string;
  contactEmail: string;
  companyUrl?: string;
  useCase?: string;
  expectedVolume?: string;
  description?: string;
  termsAccepted: boolean;
}

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isPersonalEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return PERSONAL_EMAIL_DOMAINS.includes(domain);
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
    const body: RegisterRequest = await request.json();

    // Validate required fields
    if (!body.companyName?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Company name is required' } },
        { status: 400 }
      );
    }

    if (!body.contactName?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Contact name is required' } },
        { status: 400 }
      );
    }

    if (!body.contactEmail?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
        { status: 400 }
      );
    }

    if (!isValidEmail(body.contactEmail)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' } },
        { status: 400 }
      );
    }

    if (!body.termsAccepted) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'You must accept the terms of service' } },
        { status: 400 }
      );
    }

    // Check if email already registered
    const { data: existingApp } = await supabase
      .from('partner_applications')
      .select('id, test_api_key, live_api_key, sandbox_api_key')
      .eq('contact_email', body.contactEmail.toLowerCase().trim())
      .single();

    if (existingApp) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'This email is already registered. Check your inbox for your API keys or use the login page.',
          },
        },
        { status: 409 }
      );
    }

    // Check if this is a personal email domain
    const personalEmail = isPersonalEmail(body.contactEmail);

    // Generate API keys
    const sanitizedCompany = sanitizeCompanyName(body.companyName);
    const testKey = `pk_test_${sanitizedCompany}_${generateRandomString(8)}`;
    const liveKey = `pk_live_${sanitizedCompany}_${generateRandomString(8)}`;

    // Generate verification token for business emails
    const verificationToken = personalEmail ? null : generateSecureToken(32);
    const verificationExpiresAt = personalEmail
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Insert into partner_applications
    const { data: newPartner, error: appError } = await supabase
      .from('partner_applications')
      .insert({
        company_name: body.companyName.trim(),
        contact_name: body.contactName.trim(),
        contact_email: body.contactEmail.toLowerCase().trim(),
        company_url: body.companyUrl?.trim() || null,
        use_case: body.description?.trim() || null,
        expected_volume: body.expectedVolume || null,
        vertical: body.useCase || null,
        test_api_key: testKey,
        live_api_key: liveKey,
        sandbox_api_key: testKey, // Maintain backwards compatibility
        status: 'sandbox',
        is_personal_email: personalEmail,
        terms_accepted_at: new Date().toISOString(),
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt,
      })
      .select('id')
      .single();

    if (appError || !newPartner) {
      console.error('Error inserting partner application:', appError);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to create application. Please try again.' } },
        { status: 500 }
      );
    }

    // Insert test key into api_keys table (active immediately)
    const { error: testKeyError } = await supabase.from('api_keys').insert({
      api_key: testKey,
      partner_name: body.companyName.trim(),
      permissions: ['sandbox', 'test'],
      rate_limit_per_hour: 1000,
      is_active: true,
      created_at: new Date().toISOString(),
      vertical: body.useCase || null,
    });

    if (testKeyError) {
      console.error('Error inserting test API key:', testKeyError);
    }

    // Insert live key into api_keys table (inactive until verified for business emails)
    // For personal emails, we don't insert the live key at all
    if (!personalEmail) {
      const { error: liveKeyError } = await supabase.from('api_keys').insert({
        api_key: liveKey,
        partner_name: body.companyName.trim(),
        permissions: ['production'],
        rate_limit_per_hour: 1000,
        is_active: false, // Will be activated after email verification
        created_at: new Date().toISOString(),
        vertical: body.useCase || null,
      });

      if (liveKeyError) {
        console.error('Error inserting live API key:', liveKeyError);
      }
    }

    // Send welcome email with API keys
    await sendWelcomeEmail({
      email: body.contactEmail.toLowerCase().trim(),
      name: body.contactName.trim(),
      companyName: body.companyName.trim(),
      testKey,
      liveKey,
      verificationToken: verificationToken || undefined,
      isPersonalEmail: personalEmail,
    });

    // Log the signup
    console.log(`[Partner Register] ${body.companyName} (${body.contactEmail}) - test: ${testKey}, personal: ${personalEmail}`);

    // Build response
    const response = {
      success: true,
      testApiKey: testKey,
      liveApiKey: liveKey,
      testKeyActive: true,
      liveKeyActive: false,
      isPersonalEmail: personalEmail,
      emailVerificationRequired: !personalEmail,
      emailVerificationSent: !personalEmail,
      message: personalEmail
        ? 'Your test key is active immediately. To get production access, please sign up with a business email.'
        : 'Your test key is active immediately. Check your email to verify and activate your live key.',
      docsUrl: '/partners/docs',
      dashboardUrl: '/partners/dashboard',
      loginUrl: '/partners/login',
    };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-API-Version': CURRENT_API_VERSION,
        'X-API-Min-Version': MINIMUM_SUPPORTED_VERSION,
      },
    });
  } catch (error) {
    console.error('Partner registration error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' } },
      { status: 500 }
    );
  }
}
