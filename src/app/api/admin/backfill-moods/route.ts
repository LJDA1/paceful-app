import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMoodTimeline } from '@/lib/synthetic/mood-generator';
import { SyntheticUserProfile } from '@/lib/synthetic/user-archetypes';

const ADMIN_KEY = 'paceful-admin-2024';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
    .select('user_id, first_name, breakup_date, recovery_context, relationship_duration, gender, date_of_birth, seeking_match, match_preferences')
    .eq('is_synthetic', true);

  if (!users) return NextResponse.json({ error: 'No users found' }, { status: 404 });

  let totalInserted = 0;
  let usersBackfilled = 0;

  for (const user of users) {
    // Check if they already have mood entries
    const { count } = await supabase
      .from('mood_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.user_id);

    if (count && count > 0) continue; // Skip users with existing moods

    // Reconstruct a minimal archetype from profile data
    const breakupDate = user.breakup_date ? new Date(user.breakup_date) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const journeyLengthDays = Math.floor((Date.now() - breakupDate.getTime()) / (24 * 60 * 60 * 1000));

    // Calculate age from date_of_birth
    const dob = user.date_of_birth ? new Date(user.date_of_birth) : new Date('1990-01-01');
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    // Create a synthetic profile for the mood generator
    const syntheticProfile: SyntheticUserProfile = {
      syntheticId: `backfill_${user.user_id.substring(0, 8)}`,
      userType: user.recovery_context === 'support_seeker' ? 'support_seeker' : 'classic_recovery',
      recoverySpeed: 'moderate',
      attachmentStyle: 'secure',
      engagementLevel: 'regular',
      journeyLengthDays: Math.min(journeyLengthDays, 180), // Cap at 180 days
      outcome: 'full_recovery',
      firstName: user.first_name || 'User',
      age: age,
      gender: user.gender || 'prefer_not_to_say',
      relationshipLengthMonths: user.relationship_duration || 12,
      seekingMatch: user.seeking_match || false,
      matchPreferences: user.match_preferences || null,
      recoveryContext: user.recovery_context || 'breakup',
      breakupType: 'was_dumped',
      complicatingFactors: [],
    };

    // Generate mood timeline
    const moodTimeline = generateMoodTimeline(syntheticProfile, breakupDate);

    if (moodTimeline.length === 0) continue;

    // Insert mood entries
    const moodInserts = moodTimeline.map(entry => ({
      user_id: user.user_id,
      mood_value: entry.moodScore,
      mood_label: entry.moodScore <= 2 ? 'low' : entry.moodScore <= 3 ? 'moderate' : 'high',
      emotions: entry.emotions,
      logged_at: entry.loggedAt.toISOString(),
      is_synthetic: true,
    }));

    const { error } = await supabase.from('mood_entries').insert(moodInserts);

    if (error) {
      console.error(`Mood insert error for ${user.user_id}:`, error.message);
    } else {
      totalInserted += moodInserts.length;
      usersBackfilled++;
    }
  }

  return NextResponse.json({
    success: true,
    moodsInserted: totalInserted,
    usersBackfilled,
    usersProcessed: users.length
  });
}
