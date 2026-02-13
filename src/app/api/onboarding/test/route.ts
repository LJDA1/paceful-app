import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { errors } from '@/lib/api-errors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin key - required in production, fallback only in development
const ADMIN_KEY = process.env.ADMIN_API_KEY || (process.env.NODE_ENV === 'development' ? 'paceful_admin_dev' : '');

export async function POST(request: NextRequest) {
  // Require admin key for test routes
  const url = new URL(request.url);
  const keyFromQuery = url.searchParams.get('key');
  const keyFromHeader = request.headers.get('X-Admin-Key');
  const providedKey = keyFromQuery || keyFromHeader;

  if (providedKey !== ADMIN_KEY) {
    return errors.unauthorized('Admin key required for test endpoints');
  }
  try {
    const body = await request.json();
    const userId = body.userId || '5b362424-0963-4fe3-b4fc-84d85cf47044';

    // Test 1: Check current profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Test 2: Update profile with onboarding data
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: body.firstName || 'Test User',
        // Only update fields that exist
      })
      .eq('id', userId)
      .select()
      .single();

    // Test 3: Try to insert consent record (use auth user_id from profile)
    const authUserId = existingProfile?.user_id || userId;
    const { data: consent, error: consentError } = await supabase
      .from('consent_records')
      .insert({
        user_id: authUserId,
        consent_type: 'ers_tracking',
        consent_given: true,
      })
      .select()
      .single();

    return NextResponse.json({
      tests: {
        existingProfile: {
          success: !fetchError,
          data: existingProfile,
          error: fetchError?.message,
        },
        updateProfile: {
          success: !updateError,
          data: updatedProfile,
          error: updateError?.message,
        },
        consentRecord: {
          success: !consentError,
          data: consent,
          error: consentError?.message,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Require admin key for test routes
  const url = new URL(request.url);
  const keyFromQuery = url.searchParams.get('key');
  const keyFromHeader = request.headers.get('X-Admin-Key');
  const providedKey = keyFromQuery || keyFromHeader;

  if (providedKey !== ADMIN_KEY) {
    return errors.unauthorized('Admin key required for test endpoints');
  }
  try {
    // Get profile columns
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const columns = data && data[0] ? Object.keys(data[0]) : [];

    // Check consent_records table
    const { data: consentData, error: consentError } = await supabase
      .from('consent_records')
      .select('*')
      .limit(1);

    const consentColumns = consentData && consentData[0] ? Object.keys(consentData[0]) : [];

    return NextResponse.json({
      profileColumns: columns,
      sampleProfile: data?.[0],
      consentTableExists: !consentError,
      consentColumns,
      sampleConsent: consentData?.[0],
      consentError: consentError?.message,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
