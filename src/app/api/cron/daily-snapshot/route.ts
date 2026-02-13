import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureTrajectorySnapshot } from '@/lib/trajectory-snapshot';

/**
 * Daily snapshot cron job
 * Captures trajectory snapshots for all active users
 * Can be called by Vercel cron or manually
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or admin access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get date 7 days ago for activity check
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // Find all users with activity in the last 7 days
    // Activity = mood entries, journal entries, or activity logs
    const activeUserIds = new Set<string>();

    // Check mood entries
    const { data: moodUsers } = await supabase
      .from('mood_entries')
      .select('user_id')
      .gte('logged_at', sevenDaysAgoStr);

    moodUsers?.forEach(row => activeUserIds.add(row.user_id));

    // Check journal entries
    const { data: journalUsers } = await supabase
      .from('journal_entries')
      .select('user_id')
      .gte('created_at', sevenDaysAgoStr)
      .is('deleted_at', null);

    journalUsers?.forEach(row => activeUserIds.add(row.user_id));

    // Check activity logs
    const { data: activityUsers } = await supabase
      .from('activity_logs')
      .select('user_id')
      .gte('created_at', sevenDaysAgoStr);

    activityUsers?.forEach(row => activeUserIds.add(row.user_id));

    const userIds = Array.from(activeUserIds);
    let processed = 0;
    let errors = 0;

    // Process each user
    for (const userId of userIds) {
      try {
        await captureTrajectorySnapshot(userId, supabase);
        processed++;
      } catch (error) {
        console.error(`Snapshot error for user ${userId}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      totalActiveUsers: userIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Daily snapshot cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also allow GET for easy manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
