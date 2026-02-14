import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { dailyReminderEmail, getDailyReminderSubject } from '@/lib/email-templates';

const CRON_SECRET = process.env.CRON_SECRET;

// Create admin Supabase client lazily (bypasses RLS)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/cron/daily-reminders
 *
 * Triggered by cron service to send daily mood reminders.
 * Should run once per day, ideally in the morning (e.g., 9 AM local time).
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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    // Find users who:
    // 1. Have NOT logged a mood today
    // 2. Last activity was more than 20 hours ago (don't remind people who just used the app)
    // 3. Have email reminders enabled
    // 4. Have a verified email
    const { data: eligibleUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_id,
        first_name,
        email_reminders_daily
      `)
      .eq('email_reminders_daily', true);

    if (usersError) {
      console.error('[DailyReminders] Failed to fetch users:', usersError);
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

        // Check if they logged mood today
        const { data: todayMood } = await supabaseAdmin
          .from('mood_entries')
          .select('id')
          .eq('user_id', user.user_id)
          .gte('logged_at', todayStart.toISOString())
          .limit(1);

        if (todayMood && todayMood.length > 0) {
          results.skipped++;
          continue;
        }

        // Check last activity (any mood or journal entry)
        const { data: lastActivity } = await supabaseAdmin
          .from('mood_entries')
          .select('logged_at')
          .eq('user_id', user.user_id)
          .order('logged_at', { ascending: false })
          .limit(1);

        const lastActivityTime = lastActivity?.[0]?.logged_at;
        if (lastActivityTime && new Date(lastActivityTime) > twentyHoursAgo) {
          // Recent activity, skip reminder
          results.skipped++;
          continue;
        }

        // Calculate streak
        const { data: streakData } = await supabaseAdmin
          .from('mood_entries')
          .select('logged_at')
          .eq('user_id', user.user_id)
          .order('logged_at', { ascending: false })
          .limit(30);

        let streakCount = 0;
        if (streakData && streakData.length > 0) {
          // Count consecutive days with mood logs
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Start from yesterday since we already know they didn't log today
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - 1);

          for (let i = 0; i < 30; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const hasEntry = streakData.some(entry => {
              const entryDate = new Date(entry.logged_at).toISOString().split('T')[0];
              return entryDate === dateStr;
            });

            if (hasEntry) {
              streakCount++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }

        // Check if they missed yesterday
        const yesterday = new Date(todayStart);
        yesterday.setDate(yesterday.getDate() - 1);
        const { data: yesterdayMood } = await supabaseAdmin
          .from('mood_entries')
          .select('id')
          .eq('user_id', user.user_id)
          .gte('logged_at', yesterday.toISOString())
          .lt('logged_at', todayStart.toISOString())
          .limit(1);

        const missedYesterday = !yesterdayMood || yesterdayMood.length === 0;

        // Generate and send email
        const firstName = user.first_name || 'there';
        const subject = getDailyReminderSubject(firstName, streakCount, missedYesterday);
        const html = dailyReminderEmail(firstName, streakCount, missedYesterday);

        const sent = await sendEmail({ to: email, subject, html });

        if (sent) {
          results.sent++;

          // Log the reminder event
          await supabaseAdmin.from('activity_logs').insert({
            user_id: user.user_id,
            event_type: 'reminder_sent',
            event_data: { type: 'daily', streak: streakCount },
          });
        } else {
          // Email not configured or failed
          results.skipped++;
        }
      } catch (userError) {
        console.error(`[DailyReminders] Error processing user ${user.user_id}:`, userError);
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
    console.error('[DailyReminders] Cron error:', error);
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
