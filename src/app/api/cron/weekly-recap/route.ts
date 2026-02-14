import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { weeklyRecapEmail, getWeeklyRecapSubject, WeeklyRecapData } from '@/lib/email-templates';

const CRON_SECRET = process.env.CRON_SECRET;

// Create admin Supabase client lazily (bypasses RLS)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/cron/weekly-recap
 *
 * Triggered by cron service to send weekly recap emails.
 * Should run once per week, e.g., Sunday evening or Monday morning.
 *
 * Secured by CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = { sent: 0, skipped: 0, failed: 0, errors: [] as string[] };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Find users who:
    // 1. Have had any activity in the last 14 days
    // 2. Have weekly recap enabled
    const { data: eligibleUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_id,
        first_name,
        email_reminders_weekly
      `)
      .eq('email_reminders_weekly', true);

    if (usersError) {
      console.error('[WeeklyRecap] Failed to fetch users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      );
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No eligible users found',
        duration: Date.now() - startTime,
      });
    }

    // Process each user
    for (const user of eligibleUsers) {
      try {
        // Get user's email from auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.user_id);

        if (authError || !authUser?.user?.email) {
          results.skipped++;
          continue;
        }

        const email = authUser.user.email;

        // Check for recent activity (last 14 days)
        const { data: recentActivity } = await supabaseAdmin
          .from('mood_entries')
          .select('id')
          .eq('user_id', user.user_id)
          .gte('logged_at', fourteenDaysAgo.toISOString())
          .limit(1);

        if (!recentActivity || recentActivity.length === 0) {
          // No recent activity, skip
          results.skipped++;
          continue;
        }

        // Gather weekly stats
        const [moodsRes, journalsRes, ersRes, prevErsRes, insightRes] = await Promise.all([
          // Moods logged this week
          supabaseAdmin
            .from('mood_entries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .gte('logged_at', sevenDaysAgo.toISOString()),

          // Journal entries this week
          supabaseAdmin
            .from('journal_entries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .is('deleted_at', null)
            .gte('created_at', sevenDaysAgo.toISOString()),

          // Current ERS score
          supabaseAdmin
            .from('ers_scores')
            .select('ers_score')
            .eq('user_id', user.user_id)
            .order('calculated_at', { ascending: false })
            .limit(1),

          // Previous week ERS score
          supabaseAdmin
            .from('ers_scores')
            .select('ers_score')
            .eq('user_id', user.user_id)
            .lt('calculated_at', sevenDaysAgo.toISOString())
            .order('calculated_at', { ascending: false })
            .limit(1),

          // Latest insight
          supabaseAdmin
            .from('extracted_insights')
            .select('content')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        // Calculate streak
        const { data: streakData } = await supabaseAdmin
          .from('mood_entries')
          .select('logged_at')
          .eq('user_id', user.user_id)
          .order('logged_at', { ascending: false })
          .limit(30);

        let streakDays = 0;
        if (streakData && streakData.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkDate = new Date(today);

          for (let i = 0; i < 30; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const hasEntry = streakData.some(entry => {
              const entryDate = new Date(entry.logged_at).toISOString().split('T')[0];
              return entryDate === dateStr;
            });

            if (hasEntry) {
              streakDays++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else if (i === 0) {
              // Today not logged yet, check from yesterday
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }

        const currentErs = ersRes.data?.[0]?.ers_score ?? null;
        const previousErs = prevErsRes.data?.[0]?.ers_score ?? null;
        const ersChange = currentErs !== null && previousErs !== null
          ? Math.round(currentErs - previousErs)
          : null;

        const weeklyData: WeeklyRecapData = {
          moodsLogged: moodsRes.count || 0,
          journalEntries: journalsRes.count || 0,
          ersScore: currentErs !== null ? Math.round(currentErs) : null,
          ersChange,
          streakDays,
          topInsight: insightRes.data?.[0]?.content || null,
        };

        // Only send if there's something to report
        if (weeklyData.moodsLogged === 0 && weeklyData.journalEntries === 0) {
          results.skipped++;
          continue;
        }

        // Generate and send email
        const firstName = user.first_name || 'there';
        const subject = getWeeklyRecapSubject(firstName);
        const html = weeklyRecapEmail(firstName, weeklyData);

        const sent = await sendEmail({ to: email, subject, html });

        if (sent) {
          results.sent++;

          // Log the reminder event
          await supabaseAdmin.from('activity_logs').insert({
            user_id: user.user_id,
            event_type: 'reminder_sent',
            event_data: { type: 'weekly', ...weeklyData },
          });
        } else {
          // Email not configured or failed
          results.skipped++;
        }
      } catch (userError) {
        console.error(`[WeeklyRecap] Error processing user ${user.user_id}:`, userError);
        results.failed++;
        results.errors.push(user.user_id);
      }
    }

    return NextResponse.json({
      ...results,
      totalProcessed: eligibleUsers.length,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[WeeklyRecap] Cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Support GET for testing (but still requires auth)
export async function GET(request: NextRequest) {
  return POST(request);
}
