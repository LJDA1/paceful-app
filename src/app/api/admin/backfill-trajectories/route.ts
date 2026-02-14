import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_KEY = 'paceful-admin-2024';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface MoodEntry {
  mood_value: number;
  logged_at: string;
}

interface WeekBucket {
  weekEnd: Date;
  moods: number[];
}

function getStage(score: number): string {
  if (score <= 25) return 'crisis';
  if (score <= 40) return 'processing';
  if (score <= 60) return 'rebuilding';
  if (score <= 80) return 'growth';
  return 'ready';
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== 'Bearer ' + ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get all synthetic users
  const { data: users } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('is_synthetic', true);

  if (!users) return NextResponse.json({ error: 'No users found' }, { status: 404 });

  let totalSnapshots = 0;
  let usersProcessed = 0;
  let errors = 0;

  for (const user of users) {
    // Get mood entries ordered by date
    const { data: moods } = await supabase
      .from('mood_entries')
      .select('mood_value, logged_at')
      .eq('user_id', user.user_id)
      .order('logged_at', { ascending: true });

    if (!moods || moods.length < 7) continue;

    // Group moods into weekly buckets
    const weekBuckets = new Map<string, WeekBucket>();

    for (const mood of moods as MoodEntry[]) {
      const date = new Date(mood.logged_at);
      // Get the Sunday of that week (end of week)
      const weekEnd = new Date(date);
      weekEnd.setDate(date.getDate() + (7 - date.getDay()));
      weekEnd.setHours(23, 59, 59, 999);
      const weekKey = weekEnd.toISOString().split('T')[0];

      if (!weekBuckets.has(weekKey)) {
        weekBuckets.set(weekKey, { weekEnd, moods: [] });
      }
      weekBuckets.get(weekKey)!.moods.push(mood.mood_value || 3);
    }

    // Convert to array and sort by date
    const weeks = Array.from(weekBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, bucket]) => bucket);

    if (weeks.length < 2) continue;

    // Create trajectory snapshots for each week
    const trajectoryInserts = [];
    let prevAvg = 0;

    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      const moodValues = week.moods;

      // Calculate average mood (1-5 scale)
      const avgMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;

      // Convert to 0-100 scale
      const ersScore = Math.round((avgMood - 1) * 25); // 1->0, 5->100

      // Engagement consistency (entries per week / 7 * 100)
      const engagementScore = Math.round(Math.min(100, (moodValues.length / 7) * 100));

      // Determine mood trend
      const moodTrend = i > 0 && prevAvg > 0
        ? (avgMood > prevAvg + 0.2 ? 'improving' : avgMood < prevAvg - 0.2 ? 'declining' : 'stable')
        : 'stable';

      trajectoryInserts.push({
        user_id: user.user_id,
        snapshot_date: week.weekEnd.toISOString().split('T')[0],
        ers_score: ersScore,
        ers_stage: getStage(ersScore),
        mood_avg_7d: Math.round(avgMood * 100) / 100,
        mood_trend: moodTrend,
        journal_frequency_7d: Math.floor(Math.random() * 5), // Placeholder
        exercise_completions_7d: Math.floor(Math.random() * 3), // Placeholder
        engagement_score: engagementScore,
        streak_length: Math.min(i + 1, 7 + Math.floor(Math.random() * 14)), // Growing streak
        is_synthetic: true,
        created_at: week.weekEnd.toISOString(),
      });

      prevAvg = avgMood;
    }

    if (trajectoryInserts.length > 0) {
      const { error } = await supabase
        .from('recovery_trajectories')
        .insert(trajectoryInserts);

      if (error) {
        console.error(`Trajectory insert error for ${user.user_id}:`, error.message);
        errors++;
      } else {
        totalSnapshots += trajectoryInserts.length;
        usersProcessed++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    trajectoriesInserted: totalSnapshots,
    usersProcessed,
    errors,
    totalUsers: users.length
  });
}
