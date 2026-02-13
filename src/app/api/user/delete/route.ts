import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
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
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Delete user data in order (respecting foreign key constraints)
    // Start with tables that reference others, then move to base tables

    // 1. Delete activity logs
    await supabase
      .from('activity_logs')
      .delete()
      .eq('user_id', userId);

    // 2. Delete consent records
    await supabase
      .from('consent_records')
      .delete()
      .eq('user_id', userId);

    // 3. Delete ERS scores
    await supabase
      .from('ers_scores')
      .delete()
      .eq('user_id', userId);

    // 4. Delete mood entries
    await supabase
      .from('mood_entries')
      .delete()
      .eq('user_id', userId);

    // 5. Delete journal entries
    await supabase
      .from('journal_entries')
      .delete()
      .eq('user_id', userId);

    // 6. Delete exercise completions
    await supabase
      .from('exercise_completions')
      .delete()
      .eq('user_id', userId);

    // 7. Delete user streaks
    await supabase
      .from('user_streaks')
      .delete()
      .eq('user_id', userId);

    // 8. Delete profile (last, as other tables may reference it)
    await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    // Note: We cannot delete from auth.users via the client API
    // The user will be signed out and their data is deleted
    // For full deletion, you'd need a service role key or admin API

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: 'Account data deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
