import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const ADMIN_KEY = 'paceful_admin_2025';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mood patterns by stage
const MOOD_PATTERNS = {
  healing: { minMood: 2, maxMood: 6, avgMood: 4, variance: 2.5, trend: 0.02 },
  rebuilding: { minMood: 4, maxMood: 8, avgMood: 6, variance: 1.5, trend: 0.05 },
  ready: { minMood: 6, maxMood: 10, avgMood: 7.5, variance: 0.8, trend: 0.02 },
};

const EMOTIONS = {
  low: ['sad', 'anxious', 'lonely', 'frustrated', 'angry'],
  medium: ['anxious', 'hopeful', 'calm', 'grateful', 'peaceful'],
  high: ['happy', 'hopeful', 'grateful', 'peaceful', 'excited'],
};

// ============================================================================
// Helpers
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateBreakupDate(stage: 'healing' | 'rebuilding' | 'ready'): string {
  const ranges = {
    healing: { min: 15, max: 60 },
    rebuilding: { min: 45, max: 120 },
    ready: { min: 90, max: 180 },
  };
  const daysAgo = randomInt(ranges[stage].min, ranges[stage].max);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function generateMoodValue(
  stage: 'healing' | 'rebuilding' | 'ready',
  dayIndex: number
): number {
  const pattern = MOOD_PATTERNS[stage];
  const trendBonus = dayIndex * pattern.trend;
  const baseMood = pattern.avgMood + trendBonus;
  const noise = (Math.random() - 0.5) * pattern.variance * 2;
  let mood = baseMood + noise;
  mood = Math.max(pattern.minMood, Math.min(pattern.maxMood, mood));
  return Math.round(mood);
}

function getEmotionsForMood(moodValue: number): string[] {
  const set = moodValue <= 4 ? EMOTIONS.low : moodValue <= 7 ? EMOTIONS.medium : EMOTIONS.high;
  return randomChoices(set, randomInt(1, 3));
}

// ============================================================================
// POST /api/admin/seed - Generate demo mood data for existing users
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check admin key
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get('key') || request.headers.get('X-Admin-Key');

  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = {
    usersProcessed: 0,
    moodEntriesCreated: 0,
    ersCalculated: 0,
    stageDistribution: { healing: 0, rebuilding: 0, ready: 0 },
    errors: [] as string[],
  };

  try {
    // Get existing users from profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, first_name')
      .limit(50);

    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No existing users found. Create users via signup first.',
      }, { status: 400 });
    }

    // Assign stages to users (distribute evenly)
    const stages: Array<'healing' | 'rebuilding' | 'ready'> = [];
    profiles.forEach((_, i) => {
      if (i < Math.ceil(profiles.length * 0.4)) stages.push('healing');
      else if (i < Math.ceil(profiles.length * 0.8)) stages.push('rebuilding');
      else stages.push('ready');
    });

    // Generate mood entries for each user
    for (let i = 0; i < profiles.length; i++) {
      const user = profiles[i];
      const stage = stages[i];

      // Generate 2-4 weeks of historical data
      const weeksOfData = randomInt(2, 4);
      const totalDays = weeksOfData * 7;
      const entries: Array<Record<string, unknown>> = [];

      for (let day = 0; day < totalDays; day++) {
        // 3-5 entries per day
        const entriesPerDay = randomInt(3, 5);
        const date = new Date();
        date.setDate(date.getDate() - (totalDays - day));

        for (let entry = 0; entry < entriesPerDay; entry++) {
          const moodValue = generateMoodValue(stage, day);
          const hour = 7 + Math.floor((entry / entriesPerDay) * 14);
          date.setHours(hour, randomInt(0, 59), 0, 0);

          entries.push({
            user_id: user.user_id,
            mood_value: moodValue,
            mood_label: moodValue <= 3 ? 'low' : moodValue <= 6 ? 'moderate' : 'high',
            emotions: getEmotionsForMood(moodValue),
            time_of_day: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
            logged_at: date.toISOString(),
            created_at: date.toISOString(),
          });
        }
      }

      // Insert mood entries in batches
      const batchSize = 100;
      for (let j = 0; j < entries.length; j += batchSize) {
        const batch = entries.slice(j, j + batchSize);
        const { error } = await supabase.from('mood_entries').insert(batch);
        if (error) {
          result.errors.push(`Moods for ${user.first_name}: ${error.message}`);
        } else {
          result.moodEntriesCreated += batch.length;
        }
      }
      result.usersProcessed++;
    }

    // Calculate ERS for each user
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    for (const user of profiles) {
      try {
        const response = await fetch(`${baseUrl}/api/ers/recalculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.user_id }),
        });

        const data = await response.json();
        if (data.success) {
          result.ersCalculated++;
          const stage = data.ersStage as keyof typeof result.stageDistribution;
          if (stage in result.stageDistribution) {
            result.stageDistribution[stage]++;
          }
        }
      } catch (err) {
        result.errors.push(`ERS for ${user.first_name}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...result,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/admin/seed - Clean up demo data
// ============================================================================

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get('key') || request.headers.get('X-Admin-Key');

  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get demo user IDs (users created via seed)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .like('first_name', '%'); // Get all

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Keep the original demo user
    const keepUserId = '5b362424-0963-4fe3-b4fc-84d85cf47044';
    const userIds = profiles
      .map(p => p.user_id)
      .filter(id => id !== keepUserId);

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Delete mood entries
    await supabase.from('mood_entries').delete().in('user_id', userIds);

    // Delete ERS scores
    await supabase.from('ers_scores').delete().in('user_id', userIds);

    // Delete profiles
    const { data: deleted } = await supabase
      .from('profiles')
      .delete()
      .in('user_id', userIds)
      .select('user_id');

    return NextResponse.json({
      success: true,
      deleted: deleted?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/admin/seed - Check current data stats
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get('key') || request.headers.get('X-Admin-Key');

  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: moodCount } = await supabase
    .from('mood_entries')
    .select('*', { count: 'exact', head: true });

  const { count: ersCount } = await supabase
    .from('ers_scores')
    .select('*', { count: 'exact', head: true });

  const { data: ersScores } = await supabase
    .from('ers_scores')
    .select('ers_stage');

  const stageDistribution = { healing: 0, rebuilding: 0, ready: 0 };
  (ersScores || []).forEach(s => {
    if (s.ers_stage in stageDistribution) {
      stageDistribution[s.ers_stage as keyof typeof stageDistribution]++;
    }
  });

  return NextResponse.json({
    profiles: profileCount || 0,
    moodEntries: moodCount || 0,
    ersScores: ersCount || 0,
    stageDistribution,
  });
}
