/**
 * POST /api/v1/partner/signup
 *
 * Self-serve partner signup that instantly generates a sandbox API key.
 * Production keys still require manual approval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRENT_API_VERSION, MINIMUM_SUPPORTED_VERSION } from '@/lib/api-version';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SignupRequest {
  companyName: string;
  contactName: string;
  contactEmail: string;
  companyUrl?: string;
  useCase?: string;
  expectedVolume?: string;
  description?: string;
}

const VERTICALS = [
  'Dating App',
  'Mental Health Platform',
  'Workplace Wellness',
  'Insurance',
  'Coaching',
  'Education',
  'Gambling/Responsible Gaming',
  'Other',
];

const VOLUMES = [
  'Just exploring',
  'Under 1,000 calls',
  '1,000-10,000',
  '10,000-100,000',
  '100,000+',
];

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
    const body: SignupRequest = await request.json();

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

    // Validate email format
    if (!isValidEmail(body.contactEmail)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' } },
        { status: 400 }
      );
    }

    // Check if email already registered
    const { data: existingApp } = await supabase
      .from('partner_applications')
      .select('id, sandbox_api_key')
      .eq('contact_email', body.contactEmail.toLowerCase().trim())
      .single();

    if (existingApp) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'This email is already registered. Check your inbox for your API key or contact partners@paceful.com.',
          },
        },
        { status: 409 }
      );
    }

    // Generate unique sandbox API key
    const sanitizedCompany = sanitizeCompanyName(body.companyName);
    const randomSuffix = generateRandomString(8);
    const sandboxApiKey = `pk_sandbox_${sanitizedCompany}_${randomSuffix}`;

    // Insert into partner_applications
    const { error: appError } = await supabase.from('partner_applications').insert({
      company_name: body.companyName.trim(),
      contact_name: body.contactName.trim(),
      contact_email: body.contactEmail.toLowerCase().trim(),
      company_url: body.companyUrl?.trim() || null,
      use_case: body.description?.trim() || null,
      expected_volume: body.expectedVolume || null,
      vertical: body.useCase || null,
      sandbox_api_key: sandboxApiKey,
      status: 'sandbox',
    });

    if (appError) {
      console.error('Error inserting partner application:', appError);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to create application. Please try again.' } },
        { status: 500 }
      );
    }

    // Insert into api_keys table for authentication
    const { error: keyError } = await supabase.from('api_keys').insert({
      api_key: sandboxApiKey,
      partner_name: body.companyName.trim(),
      permissions: ['sandbox'],
      rate_limit_per_hour: 1000,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (keyError) {
      console.error('Error inserting API key:', keyError);
      // Don't fail the request - the sandbox middleware will still accept the key
    }

    // Log the signup
    console.log(`[Partner Signup] ${body.companyName} (${body.contactEmail}) - ${sandboxApiKey}`);

    return NextResponse.json(
      {
        success: true,
        sandboxApiKey,
        docsUrl: '/partners/docs',
        playgroundUrl: '/partners/docs#playground',
        message: 'Your sandbox key is active immediately. To upgrade to a production key, we\'ll reach out within 24 hours.',
      },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-API-Version': CURRENT_API_VERSION,
          'X-API-Min-Version': MINIMUM_SUPPORTED_VERSION,
        },
      }
    );
  } catch (error) {
    console.error('Partner signup error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' } },
      { status: 500 }
    );
  }
}
