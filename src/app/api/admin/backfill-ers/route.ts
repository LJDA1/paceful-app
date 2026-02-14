import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    .select('user_id')
    .eq('is_synthetic', true);

  if (!users) return NextResponse.json({ error: 'No users found' }, { status: 404 });

  let calculated = 0;
  let errors = 0;

  for (const user of users) {
    // Get mood entries for this user (all time, not just 30 days)
    const { data: moods } = await supabase
      .from('mood_entries')
      .select('mood_value, logged_at')
      .eq('user_id', user.user_id)
      .order('logged_at', { ascending: false });

    if (!moods || moods.length < 3) continue; // Need at least 3 entries

    // Calculate ERS components
    const moodValues = moods.map(m => m.mood_value || 3);

    // Emotional stability (lower variance = higher stability)
    const avg = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
    const variance = moodValues.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / moodValues.length;
    const stdDev = Math.sqrt(variance);
    const stabilityScore = Math.max(0, 1 - (stdDev / 2)); // Normalize: stdDev of 2 = 0 stability

    // Trend (are moods improving?)
    const recentAvg = moodValues.slice(0, Math.min(7, moodValues.length)).reduce((a, b) => a + b, 0) / Math.min(7, moodValues.length);
    const olderAvg = moodValues.slice(-Math.min(7, moodValues.length)).reduce((a, b) => a + b, 0) / Math.min(7, moodValues.length);
    const trendScore = Math.min(1, Math.max(0, 0.5 + (recentAvg - olderAvg) / 4));

    // Engagement (logging frequency)
    const uniqueDays = new Set(moods.map(m => m.logged_at?.split('T')[0])).size;
    const daySpan = Math.max(1, Math.ceil((new Date(moods[0].logged_at).getTime() - new Date(moods[moods.length - 1].logged_at).getTime()) / (24 * 60 * 60 * 1000)));
    const engagementScore = Math.min(1, uniqueDays / Math.max(daySpan * 0.5, 1));

    // Combined ERS score (0-100)
    const ersScore = Math.round((stabilityScore * 0.4 + trendScore * 0.3 + engagementScore * 0.3) * 100);

    // Determine stage (valid values: ready, rebuilding, healing)
    let ersStage: string;
    if (ersScore >= 75) ersStage = 'ready';
    else if (ersScore >= 50) ersStage = 'rebuilding';
    else ersStage = 'healing';

    // Get current week start for week_of
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekOf = weekStart.toISOString().split('T')[0];

    // Confidence based on data points
    const ersConfidence = Math.min(1, moods.length / 30);

    // Upsert ERS score
    const { error } = await supabase
      .from('ers_scores')
      .upsert({
        user_id: user.user_id,
        ers_score: ersScore,
        ers_stage: ersStage,
        ers_confidence: Math.round(ersConfidence * 100) / 100,
        emotional_stability_score: Math.round(stabilityScore * 1000) / 1000,
        engagement_consistency_score: Math.round(engagementScore * 1000) / 1000,
        data_points_used: moods.length,
        calculation_method: 'synthetic_backfill_v1',
        week_of: weekOf,
        calculated_at: new Date().toISOString(),
        is_synthetic: true,
      }, { onConflict: 'user_id,week_of' });

    if (error) {
      console.error(`ERS error for ${user.user_id}:`, error.message);
      errors++;
    } else {
      calculated++;
    }
  }

  return NextResponse.json({
    success: true,
    ersCalculated: calculated,
    errors,
    usersProcessed: users.length
  });
}
