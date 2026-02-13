import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { updateSelfReportedReadiness } from '@/lib/trajectory-snapshot';

export async function POST(request: Request) {
  try {
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

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { readiness } = await request.json();

    const validReadiness = ['not_at_all', 'a_little', 'mostly', 'completely'];
    if (!readiness || !validReadiness.includes(readiness)) {
      return NextResponse.json({ error: 'Invalid readiness value' }, { status: 400 });
    }

    // Use service role client for the update (to bypass RLS if disabled)
    const { createClient } = await import('@supabase/supabase-js');
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const success = await updateSelfReportedReadiness(user.id, readiness, serviceSupabase);

    if (!success) {
      return NextResponse.json({ error: 'Failed to save readiness' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Self-report API error:', error);
    return NextResponse.json(
      { error: 'Failed to save readiness' },
      { status: 500 }
    );
  }
}
