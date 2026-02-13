import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface TrajectorySnapshot {
  user_id: string;
  snapshot_date: string;
  days_since_breakup: number | null;
  ers_score: number | null;
  ers_stage: string | null;
  mood_avg_7d: number | null;
  mood_variance_7d: number | null;
  mood_trend: string | null;
  journal_frequency_7d: number | null;
  journal_avg_words: number | null;
  dominant_themes: string[] | null;
  active_triggers: string[] | null;
  exercise_completions_7d: number | null;
  streak_length: number | null;
  engagement_score: number | null;
  self_reported_readiness: string | null;
  ai_assessed_phase: string | null;
  extracted_risk_level: string | null;
}

// ============================================================================
// Main Snapshot Function
// ============================================================================

/**
 * Capture a comprehensive trajectory snapshot for a user.
 * This creates labeled training data for future model fine-tuning.
 * Should be called fire-and-forget - never block user experience.
 */
export async function captureTrajectorySnapshot(
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // 1. Get profile for days_since_breakup
    const { data: profile } = await supabase
      .from('profiles')
      .select('relationship_ended_at')
      .eq('user_id', userId)
      .single();

    let daysSinceBreakup: number | null = null;
    if (profile?.relationship_ended_at) {
      const endDate = new Date(profile.relationship_ended_at);
      const now = new Date();
      daysSinceBreakup = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 2. Get latest ERS
    const { data: ersData } = await supabase
      .from('ers_scores')
      .select('ers_score, ers_stage')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    // 3. Get mood stats (last 7 days)
    const { data: moodEntries } = await supabase
      .from('mood_entries')
      .select('mood_value, logged_at, note')
      .eq('user_id', userId)
      .gte('logged_at', sevenDaysAgoStr)
      .order('logged_at', { ascending: true });

    let moodAvg7d: number | null = null;
    let moodVariance7d: number | null = null;
    let moodTrend: string | null = null;
    const activeTriggers: string[] = [];

    if (moodEntries && moodEntries.length > 0) {
      // Calculate average
      const moodValues = moodEntries.map(m => m.mood_value).filter(v => v != null);
      if (moodValues.length > 0) {
        moodAvg7d = moodValues.reduce((sum, v) => sum + v, 0) / moodValues.length;

        // Calculate variance
        const squaredDiffs = moodValues.map(v => Math.pow(v - moodAvg7d!, 2));
        moodVariance7d = Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / moodValues.length);

        // Calculate trend (first 3 vs last 3)
        if (moodValues.length >= 3) {
          const firstHalf = moodValues.slice(0, Math.ceil(moodValues.length / 2));
          const secondHalf = moodValues.slice(Math.floor(moodValues.length / 2));
          const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
          const diff = secondAvg - firstAvg;

          if (diff > 0.5) {
            moodTrend = 'improving';
          } else if (diff < -0.5) {
            moodTrend = 'declining';
          } else {
            moodTrend = 'stable';
          }
        }
      }

      // Extract triggers from notes (simple keyword extraction)
      const triggerKeywords = ['work', 'social media', 'friends', 'family', 'sleep', 'alcohol', 'exercise', 'ex', 'photos', 'memories', 'dating', 'loneliness'];
      moodEntries.forEach(m => {
        if (m.note) {
          const noteLower = m.note.toLowerCase();
          triggerKeywords.forEach(keyword => {
            if (noteLower.includes(keyword) && !activeTriggers.includes(keyword)) {
              activeTriggers.push(keyword);
            }
          });
        }
      });
    }

    // 4. Get journal stats (last 7 days)
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('entry_content, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgoStr);

    let journalFrequency7d: number | null = null;
    let journalAvgWords: number | null = null;

    if (journalEntries) {
      journalFrequency7d = journalEntries.length;

      if (journalEntries.length > 0) {
        const wordCounts = journalEntries.map(j =>
          j.entry_content ? j.entry_content.split(/\s+/).filter(Boolean).length : 0
        );
        journalAvgWords = wordCounts.reduce((sum, c) => sum + c, 0) / wordCounts.length;
      }
    }

    // 5. Get dominant themes from extracted_insights (last 7 days)
    const { data: themeInsights } = await supabase
      .from('extracted_insights')
      .select('content')
      .eq('user_id', userId)
      .eq('insight_type', 'emotional_theme')
      .gte('created_at', sevenDaysAgoStr);

    const dominantThemes: string[] = [];
    if (themeInsights && themeInsights.length > 0) {
      const themeCount = new Map<string, number>();
      themeInsights.forEach(insight => {
        const theme = (insight.content as { theme?: string })?.theme;
        if (theme) {
          themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
        }
      });
      // Get top 3 themes
      const sortedThemes = Array.from(themeCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([theme]) => theme);
      dominantThemes.push(...sortedThemes);
    }

    // 6. Get exercise completions (last 7 days)
    const { data: exerciseLogs } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'exercise_completed')
      .gte('created_at', sevenDaysAgoStr);

    const exerciseCompletions7d = exerciseLogs?.length || 0;

    // 7. Calculate streak from mood_entries
    let streakLength = 0;
    if (moodEntries && moodEntries.length > 0) {
      // Get all unique dates with mood entries
      const { data: allMoods } = await supabase
        .from('mood_entries')
        .select('logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(60);

      if (allMoods && allMoods.length > 0) {
        const dates = new Set(allMoods.map(m =>
          new Date(m.logged_at).toISOString().split('T')[0]
        ));

        const todayDate = new Date().toISOString().split('T')[0];
        let currentDate = new Date();

        // Check if today or yesterday has an entry to start the streak
        const hasToday = dates.has(todayDate);
        if (!hasToday) {
          currentDate.setDate(currentDate.getDate() - 1);
        }

        while (dates.has(currentDate.toISOString().split('T')[0])) {
          streakLength++;
          currentDate.setDate(currentDate.getDate() - 1);
        }
      }
    }

    // 8. Calculate engagement score
    const totalActivities = (moodEntries?.length || 0) + (journalFrequency7d || 0) + exerciseCompletions7d;
    const engagementScore = Math.min(1, totalActivities / 14); // Normalize: 2 activities per day = 1.0

    // 9. Get AI-assessed phase from latest extracted_insight
    const { data: phaseInsight } = await supabase
      .from('extracted_insights')
      .select('content')
      .eq('user_id', userId)
      .eq('insight_type', 'recovery_phase')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const aiAssessedPhase = (phaseInsight?.content as { phase?: string })?.phase || null;

    // 10. Get extracted risk level from latest risk indicator
    const { data: riskInsight } = await supabase
      .from('extracted_insights')
      .select('content')
      .eq('user_id', userId)
      .eq('insight_type', 'risk_indicator')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const extractedRiskLevel = (riskInsight?.content as { severity?: string })?.severity || null;

    // Build snapshot
    const snapshot: TrajectorySnapshot = {
      user_id: userId,
      snapshot_date: today,
      days_since_breakup: daysSinceBreakup,
      ers_score: ersData?.ers_score || null,
      ers_stage: ersData?.ers_stage || null,
      mood_avg_7d: moodAvg7d,
      mood_variance_7d: moodVariance7d,
      mood_trend: moodTrend,
      journal_frequency_7d: journalFrequency7d,
      journal_avg_words: journalAvgWords,
      dominant_themes: dominantThemes.length > 0 ? dominantThemes : null,
      active_triggers: activeTriggers.length > 0 ? activeTriggers : null,
      exercise_completions_7d: exerciseCompletions7d,
      streak_length: streakLength,
      engagement_score: engagementScore,
      self_reported_readiness: null, // Set via self-report mechanism
      ai_assessed_phase: aiAssessedPhase,
      extracted_risk_level: extractedRiskLevel,
    };

    // Upsert into recovery_trajectories
    const { error } = await supabase
      .from('recovery_trajectories')
      .upsert(snapshot, {
        onConflict: 'user_id,snapshot_date',
      });

    if (error) {
      console.error('Error upserting trajectory snapshot:', error);
    }
  } catch (error) {
    // Silent failure - never block user experience
    console.error('Trajectory snapshot error:', error);
  }
}

/**
 * Fire-and-forget wrapper for trajectory capture
 */
export function captureTrajectorySnapshotAsync(
  userId: string,
  supabase: SupabaseClient
): void {
  captureTrajectorySnapshot(userId, supabase).catch(() => {
    // Silently ignore errors
  });
}

/**
 * Update self-reported readiness for today's snapshot
 */
export async function updateSelfReportedReadiness(
  userId: string,
  readiness: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // First ensure a snapshot exists for today
    const { data: existing } = await supabase
      .from('recovery_trajectories')
      .select('id')
      .eq('user_id', userId)
      .eq('snapshot_date', today)
      .single();

    if (!existing) {
      // Create a minimal snapshot first
      await captureTrajectorySnapshot(userId, supabase);
    }

    // Update the readiness
    const { error } = await supabase
      .from('recovery_trajectories')
      .update({ self_reported_readiness: readiness })
      .eq('user_id', userId)
      .eq('snapshot_date', today);

    if (error) {
      console.error('Error updating self-reported readiness:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Self-report update error:', error);
    return false;
  }
}
