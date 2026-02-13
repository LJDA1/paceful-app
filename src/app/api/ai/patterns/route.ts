import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Types
// ============================================================================

interface PatternResult {
  pattern: string;
  type: 'trigger_effect' | 'habit_impact' | 'temporal_cycle' | 'progress_marker' | 'risk_signal';
  evidence: string;
  confidence: number;
  actionable_insight: string;
}

interface RecoveryVelocity {
  current_rate: 'fast' | 'moderate' | 'slow' | 'stalled' | 'regressing';
  compared_to_baseline: 'above' | 'at' | 'below';
  primary_accelerator: string;
  primary_blocker: string;
}

interface PredictedTrajectory {
  likely_next_stage_days: number | null;
  confidence: number;
  key_factor: string;
}

interface AnalysisResult {
  patterns: PatternResult[];
  recovery_velocity?: RecoveryVelocity;
  predicted_trajectory?: PredictedTrajectory;
}

// ============================================================================
// Constants
// ============================================================================

const INDIVIDUAL_SYSTEM_PROMPT = `You are a behavioral data analyst for an emotional recovery platform. You're analyzing a user's recovery trajectory data — a time series of daily snapshots including mood, journaling, exercises, ERS scores, and emotional themes.

Identify meaningful patterns and correlations. Respond with ONLY a JSON object:
{
  "patterns": [
    {
      "pattern": "description of the pattern",
      "type": "trigger_effect|habit_impact|temporal_cycle|progress_marker|risk_signal",
      "evidence": "what data points support this",
      "confidence": 0.0-1.0,
      "actionable_insight": "what the user could do with this knowledge"
    }
  ],
  "recovery_velocity": {
    "current_rate": "fast|moderate|slow|stalled|regressing",
    "compared_to_baseline": "above|at|below",
    "primary_accelerator": "the behavior most helping recovery",
    "primary_blocker": "the behavior most hindering recovery"
  },
  "predicted_trajectory": {
    "likely_next_stage_days": number or null,
    "confidence": 0.0-1.0,
    "key_factor": "what most influences this prediction"
  }
}

Be rigorous — only report patterns with clear data support. Set confidence accordingly. Return at least 1 pattern if any data exists. Max 5 patterns.`;

const AGGREGATE_SYSTEM_PROMPT = `You are a behavioral data analyst studying recovery patterns across many users of an emotional recovery platform. You have anonymized aggregate statistics from multiple users' recovery trajectories.

Identify cross-user patterns and correlations that could help inform product decisions and user guidance. Respond with ONLY a JSON object:
{
  "patterns": [
    {
      "pattern": "description of the cross-user pattern",
      "type": "trigger_effect|habit_impact|temporal_cycle|progress_marker|risk_signal",
      "evidence": "statistical evidence supporting this",
      "confidence": 0.0-1.0,
      "actionable_insight": "how this could help users"
    }
  ]
}

Focus on:
- Do certain behaviors correlate with faster recovery?
- Which activities precede mood improvements vs setbacks?
- Are there common timelines for stage transitions?
- What engagement patterns predict success?

Be rigorous — only report patterns with statistical support. Max 8 patterns.`;

// ============================================================================
// Admin Check
// ============================================================================

const ADMIN_EMAILS = ['lewisjohnson004@gmail.com'];

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check authorization (admin or cron)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      // Check for admin user
      const { createServerClient } = await import('@supabase/ssr');
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();

      const authSupabase = createServerClient(
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

      const { data: { user } } = await authSupabase.auth.getUser();
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse request
    const { scope, userId } = await request.json();

    if (scope !== 'individual' && scope !== 'aggregate') {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    if (scope === 'individual' && !userId) {
      return NextResponse.json({ error: 'userId required for individual scope' }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    if (scope === 'individual') {
      // Individual analysis
      const result = await analyzeIndividual(userId, supabase, anthropic);
      return NextResponse.json(result);
    } else {
      // Aggregate analysis
      const result = await analyzeAggregate(supabase, anthropic);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Individual Analysis
// ============================================================================

async function analyzeIndividual(
  userId: string,
  supabase: SupabaseClient,
  anthropic: Anthropic
): Promise<{ success: boolean; patternsFound: number; error?: string }> {
  // Fetch trajectory data
  const { data: trajectories } = await supabase
    .from('recovery_trajectories')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: true });

  if (!trajectories || trajectories.length < 7) {
    return { success: false, patternsFound: 0, error: 'Insufficient data (need 7+ snapshots)' };
  }

  // Fetch extracted insights
  const { data: insights } = await supabase
    .from('extracted_insights')
    .select('insight_type, content, confidence, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);

  // Build analysis context
  const trajectoryData = trajectories.map(t => ({
    date: t.snapshot_date,
    ers_score: t.ers_score,
    ers_stage: t.ers_stage,
    mood_avg: t.mood_avg_7d,
    mood_trend: t.mood_trend,
    journal_freq: t.journal_frequency_7d,
    exercises: t.exercise_completions_7d,
    engagement: t.engagement_score,
    streak: t.streak_length,
    themes: t.dominant_themes,
    triggers: t.active_triggers,
    days_since: t.days_since_breakup,
  }));

  const insightsSummary = (insights || []).reduce((acc, i) => {
    acc[i.insight_type] = (acc[i.insight_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userPrompt = `Analyze this user's recovery trajectory:

TRAJECTORY DATA (${trajectories.length} snapshots):
${JSON.stringify(trajectoryData, null, 2)}

EXTRACTED INSIGHTS SUMMARY:
${JSON.stringify(insightsSummary, null, 2)}

Identify patterns, recovery velocity, and predicted trajectory.`;

  // Call Claude Sonnet for deeper analysis
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1500,
    system: INDIVIDUAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Parse response
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return { success: false, patternsFound: 0, error: 'No response from AI' };
  }

  let analysis: AnalysisResult;
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    analysis = JSON.parse(jsonMatch[0]);
  } catch {
    return { success: false, patternsFound: 0, error: 'Failed to parse AI response' };
  }

  // Save patterns to database
  const patternsToInsert = analysis.patterns
    .filter(p => p.confidence >= 0.3) // Store patterns with 0.3+ confidence
    .map(p => ({
      user_id: userId,
      scope: 'individual',
      pattern_type: p.type,
      pattern_description: p.pattern,
      evidence: p.evidence,
      confidence: Math.max(0, Math.min(1, p.confidence)),
      actionable_insight: p.actionable_insight,
      source_data: {
        recovery_velocity: analysis.recovery_velocity,
        predicted_trajectory: analysis.predicted_trajectory,
        snapshot_count: trajectories.length,
      },
    }));

  if (patternsToInsert.length > 0) {
    // Delete old patterns for this user first
    await supabase
      .from('discovered_patterns')
      .delete()
      .eq('user_id', userId)
      .eq('scope', 'individual');

    // Insert new patterns
    await supabase.from('discovered_patterns').insert(patternsToInsert);
  }

  return { success: true, patternsFound: patternsToInsert.length };
}

// ============================================================================
// Aggregate Analysis
// ============================================================================

async function analyzeAggregate(
  supabase: SupabaseClient,
  anthropic: Anthropic
): Promise<{ success: boolean; patternsFound: number; error?: string }> {
  // Get unique users with trajectory data
  const { data: userCounts } = await supabase
    .from('recovery_trajectories')
    .select('user_id')
    .limit(1000);

  const uniqueUsers = new Set(userCounts?.map(u => u.user_id) || []);

  if (uniqueUsers.size < 10) {
    return { success: false, patternsFound: 0, error: 'Insufficient users (need 10+)' };
  }

  // Fetch aggregate statistics (anonymized)
  const { data: allTrajectories } = await supabase
    .from('recovery_trajectories')
    .select('ers_score, ers_stage, mood_avg_7d, mood_trend, journal_frequency_7d, exercise_completions_7d, engagement_score, streak_length, days_since_breakup, self_reported_readiness')
    .limit(5000);

  if (!allTrajectories || allTrajectories.length < 50) {
    return { success: false, patternsFound: 0, error: 'Insufficient data points' };
  }

  // Calculate aggregate statistics
  const stats = {
    total_snapshots: allTrajectories.length,
    unique_users: uniqueUsers.size,
    stage_distribution: {} as Record<string, number>,
    mood_trend_distribution: {} as Record<string, number>,
    avg_journal_freq: 0,
    avg_exercise_freq: 0,
    avg_engagement: 0,
    avg_streak: 0,
    journal_vs_mood_correlation: [] as { journal_freq: number; mood_avg: number }[],
    exercise_vs_mood_correlation: [] as { exercises: number; mood_avg: number }[],
    stage_transition_data: [] as { from_stage: string; days_in_stage: number }[],
    self_report_distribution: {} as Record<string, number>,
  };

  let journalSum = 0, exerciseSum = 0, engagementSum = 0, streakSum = 0;
  let validCounts = { journal: 0, exercise: 0, engagement: 0, streak: 0 };

  allTrajectories.forEach(t => {
    // Stage distribution
    if (t.ers_stage) {
      stats.stage_distribution[t.ers_stage] = (stats.stage_distribution[t.ers_stage] || 0) + 1;
    }

    // Mood trend distribution
    if (t.mood_trend) {
      stats.mood_trend_distribution[t.mood_trend] = (stats.mood_trend_distribution[t.mood_trend] || 0) + 1;
    }

    // Self-report distribution
    if (t.self_reported_readiness) {
      stats.self_report_distribution[t.self_reported_readiness] = (stats.self_report_distribution[t.self_reported_readiness] || 0) + 1;
    }

    // Averages
    if (t.journal_frequency_7d != null) {
      journalSum += t.journal_frequency_7d;
      validCounts.journal++;
    }
    if (t.exercise_completions_7d != null) {
      exerciseSum += t.exercise_completions_7d;
      validCounts.exercise++;
    }
    if (t.engagement_score != null) {
      engagementSum += t.engagement_score;
      validCounts.engagement++;
    }
    if (t.streak_length != null) {
      streakSum += t.streak_length;
      validCounts.streak++;
    }

    // Correlations
    if (t.journal_frequency_7d != null && t.mood_avg_7d != null) {
      stats.journal_vs_mood_correlation.push({
        journal_freq: t.journal_frequency_7d,
        mood_avg: t.mood_avg_7d,
      });
    }
    if (t.exercise_completions_7d != null && t.mood_avg_7d != null) {
      stats.exercise_vs_mood_correlation.push({
        exercises: t.exercise_completions_7d,
        mood_avg: t.mood_avg_7d,
      });
    }
  });

  stats.avg_journal_freq = validCounts.journal > 0 ? journalSum / validCounts.journal : 0;
  stats.avg_exercise_freq = validCounts.exercise > 0 ? exerciseSum / validCounts.exercise : 0;
  stats.avg_engagement = validCounts.engagement > 0 ? engagementSum / validCounts.engagement : 0;
  stats.avg_streak = validCounts.streak > 0 ? streakSum / validCounts.streak : 0;

  // Calculate simple correlations
  const journalCorr = calculateCorrelation(
    stats.journal_vs_mood_correlation.map(d => d.journal_freq),
    stats.journal_vs_mood_correlation.map(d => d.mood_avg)
  );
  const exerciseCorr = calculateCorrelation(
    stats.exercise_vs_mood_correlation.map(d => d.exercises),
    stats.exercise_vs_mood_correlation.map(d => d.mood_avg)
  );

  const userPrompt = `Analyze these aggregate recovery statistics across ${uniqueUsers.size} users:

AGGREGATE STATISTICS:
- Total snapshots: ${stats.total_snapshots}
- Unique users: ${stats.unique_users}
- Stage distribution: ${JSON.stringify(stats.stage_distribution)}
- Mood trend distribution: ${JSON.stringify(stats.mood_trend_distribution)}
- Average journal frequency (7d): ${stats.avg_journal_freq.toFixed(2)}
- Average exercises (7d): ${stats.avg_exercise_freq.toFixed(2)}
- Average engagement score: ${stats.avg_engagement.toFixed(3)}
- Average streak length: ${stats.avg_streak.toFixed(1)} days
- Journal-mood correlation coefficient: ${journalCorr.toFixed(3)}
- Exercise-mood correlation coefficient: ${exerciseCorr.toFixed(3)}
- Self-reported readiness distribution: ${JSON.stringify(stats.self_report_distribution)}

Identify cross-user patterns that reveal what helps or hinders recovery.`;

  // Call Claude Sonnet
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1500,
    system: AGGREGATE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Parse response
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return { success: false, patternsFound: 0, error: 'No response from AI' };
  }

  let analysis: AnalysisResult;
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    analysis = JSON.parse(jsonMatch[0]);
  } catch {
    return { success: false, patternsFound: 0, error: 'Failed to parse AI response' };
  }

  // Save patterns to database
  const patternsToInsert = analysis.patterns
    .filter(p => p.confidence >= 0.3)
    .map(p => ({
      user_id: null, // Aggregate patterns have no user
      scope: 'aggregate',
      pattern_type: p.type,
      pattern_description: p.pattern,
      evidence: p.evidence,
      confidence: Math.max(0, Math.min(1, p.confidence)),
      actionable_insight: p.actionable_insight,
      source_data: {
        total_snapshots: stats.total_snapshots,
        unique_users: stats.unique_users,
        journal_correlation: journalCorr,
        exercise_correlation: exerciseCorr,
      },
    }));

  if (patternsToInsert.length > 0) {
    // Delete old aggregate patterns first
    await supabase
      .from('discovered_patterns')
      .delete()
      .eq('scope', 'aggregate');

    // Insert new patterns
    await supabase.from('discovered_patterns').insert(patternsToInsert);
  }

  return { success: true, patternsFound: patternsToInsert.length };
}

// ============================================================================
// Helper: Calculate Pearson Correlation
// ============================================================================

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}
