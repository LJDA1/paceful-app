import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Pattern discovery cron job
 * Runs individual analysis for qualifying users and aggregate analysis
 * Meant to run weekly via Vercel cron
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Find users with 7+ trajectory snapshots
    const { data: userSnapshots } = await supabase
      .from('recovery_trajectories')
      .select('user_id');

    const userSnapshotCounts = new Map<string, number>();
    userSnapshots?.forEach(s => {
      userSnapshotCounts.set(s.user_id, (userSnapshotCounts.get(s.user_id) || 0) + 1);
    });

    const qualifyingUsers = Array.from(userSnapshotCounts.entries())
      .filter(([, count]) => count >= 7)
      .map(([userId]) => userId);

    let individualAnalyzed = 0;
    let patternsFound = 0;
    const errors: string[] = [];

    // Run individual analysis for each qualifying user
    for (const userId of qualifyingUsers) {
      try {
        const result = await analyzeIndividualUser(userId, supabase, anthropic);
        if (result.success) {
          individualAnalyzed++;
          patternsFound += result.patternsFound;
        }
      } catch (error) {
        errors.push(`User ${userId.substring(0, 8)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Run aggregate analysis if 10+ users
    let aggregateRun = false;
    if (userSnapshotCounts.size >= 10) {
      try {
        const result = await analyzeAggregate(supabase, anthropic);
        if (result.success) {
          aggregateRun = true;
          patternsFound += result.patternsFound;
        }
      } catch (error) {
        errors.push(`Aggregate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      individualAnalyzed,
      aggregateRun,
      patternsFound,
      qualifyingUsers: qualifyingUsers.length,
      totalUsers: userSnapshotCounts.size,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pattern discovery cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}

// ============================================================================
// Individual Analysis (simplified version for cron)
// ============================================================================

async function analyzeIndividualUser(
  userId: string,
  supabase: SupabaseClient,
  anthropic: Anthropic
): Promise<{ success: boolean; patternsFound: number }> {
  const { data: trajectories } = await supabase
    .from('recovery_trajectories')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: true });

  if (!trajectories || trajectories.length < 7) {
    return { success: false, patternsFound: 0 };
  }

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
  }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1200,
    system: `You are analyzing a user's recovery trajectory. Identify 1-5 meaningful patterns. Respond with ONLY JSON:
{
  "patterns": [
    {
      "pattern": "description",
      "type": "trigger_effect|habit_impact|temporal_cycle|progress_marker|risk_signal",
      "evidence": "data points",
      "confidence": 0.0-1.0,
      "actionable_insight": "what to do"
    }
  ],
  "recovery_velocity": {
    "current_rate": "fast|moderate|slow|stalled|regressing",
    "primary_accelerator": "helpful behavior",
    "primary_blocker": "hindering behavior"
  }
}`,
    messages: [{
      role: 'user',
      content: `Trajectory data (${trajectories.length} snapshots):\n${JSON.stringify(trajectoryData, null, 2)}`,
    }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return { success: false, patternsFound: 0 };
  }

  let analysis;
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    analysis = JSON.parse(jsonMatch[0]);
  } catch {
    return { success: false, patternsFound: 0 };
  }

  const patternsToInsert = (analysis.patterns || [])
    .filter((p: { confidence: number }) => p.confidence >= 0.3)
    .map((p: { type: string; pattern: string; evidence: string; confidence: number; actionable_insight: string }) => ({
      user_id: userId,
      scope: 'individual',
      pattern_type: p.type,
      pattern_description: p.pattern,
      evidence: p.evidence,
      confidence: Math.max(0, Math.min(1, p.confidence)),
      actionable_insight: p.actionable_insight,
      source_data: { recovery_velocity: analysis.recovery_velocity },
    }));

  if (patternsToInsert.length > 0) {
    await supabase
      .from('discovered_patterns')
      .delete()
      .eq('user_id', userId)
      .eq('scope', 'individual');

    await supabase.from('discovered_patterns').insert(patternsToInsert);
  }

  return { success: true, patternsFound: patternsToInsert.length };
}

// ============================================================================
// Aggregate Analysis (simplified version for cron)
// ============================================================================

async function analyzeAggregate(
  supabase: SupabaseClient,
  anthropic: Anthropic
): Promise<{ success: boolean; patternsFound: number }> {
  const { data: trajectories } = await supabase
    .from('recovery_trajectories')
    .select('ers_stage, mood_avg_7d, mood_trend, journal_frequency_7d, exercise_completions_7d, engagement_score')
    .limit(3000);

  if (!trajectories || trajectories.length < 50) {
    return { success: false, patternsFound: 0 };
  }

  // Calculate stats
  const stats = {
    total: trajectories.length,
    stages: {} as Record<string, number>,
    trends: {} as Record<string, number>,
    avgJournal: 0,
    avgExercise: 0,
  };

  let jSum = 0, eSum = 0, jCount = 0, eCount = 0;
  trajectories.forEach(t => {
    if (t.ers_stage) stats.stages[t.ers_stage] = (stats.stages[t.ers_stage] || 0) + 1;
    if (t.mood_trend) stats.trends[t.mood_trend] = (stats.trends[t.mood_trend] || 0) + 1;
    if (t.journal_frequency_7d != null) { jSum += t.journal_frequency_7d; jCount++; }
    if (t.exercise_completions_7d != null) { eSum += t.exercise_completions_7d; eCount++; }
  });
  stats.avgJournal = jCount > 0 ? jSum / jCount : 0;
  stats.avgExercise = eCount > 0 ? eSum / eCount : 0;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1200,
    system: `Analyze aggregate recovery statistics across users. Identify cross-user patterns. Respond with ONLY JSON:
{
  "patterns": [
    {
      "pattern": "cross-user pattern description",
      "type": "trigger_effect|habit_impact|temporal_cycle|progress_marker|risk_signal",
      "evidence": "statistical support",
      "confidence": 0.0-1.0,
      "actionable_insight": "how this helps users"
    }
  ]
}
Max 8 patterns. Be rigorous about confidence.`,
    messages: [{
      role: 'user',
      content: `Aggregate stats:\n${JSON.stringify(stats, null, 2)}`,
    }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return { success: false, patternsFound: 0 };
  }

  let analysis;
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    analysis = JSON.parse(jsonMatch[0]);
  } catch {
    return { success: false, patternsFound: 0 };
  }

  const patternsToInsert = (analysis.patterns || [])
    .filter((p: { confidence: number }) => p.confidence >= 0.3)
    .map((p: { type: string; pattern: string; evidence: string; confidence: number; actionable_insight: string }) => ({
      user_id: null,
      scope: 'aggregate',
      pattern_type: p.type,
      pattern_description: p.pattern,
      evidence: p.evidence,
      confidence: Math.max(0, Math.min(1, p.confidence)),
      actionable_insight: p.actionable_insight,
      source_data: stats,
    }));

  if (patternsToInsert.length > 0) {
    await supabase
      .from('discovered_patterns')
      .delete()
      .eq('scope', 'aggregate');

    await supabase.from('discovered_patterns').insert(patternsToInsert);
  }

  return { success: true, patternsFound: patternsToInsert.length };
}
