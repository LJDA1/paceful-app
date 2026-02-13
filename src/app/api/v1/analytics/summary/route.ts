/**
 * B2B API: Analytics Summary
 *
 * GET /api/v1/analytics/summary
 * Requires: Bearer token with "read_analytics" permission
 * Returns anonymized aggregate statistics
 */

import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey, hasPermission, apiError, apiSuccess, handleCors } from '@/lib/api-auth';

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export async function OPTIONS() {
  return handleCors();
}

export async function GET(request: NextRequest) {
  // Validate API key
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return apiError(auth.error || 'Unauthorized', 'UNAUTHORIZED', 401);
  }

  // Check permission
  if (!hasPermission(auth, 'read_analytics')) {
    return apiError('API key does not have read_analytics permission', 'FORBIDDEN', 403);
  }

  try {
    // Get active users (users with ERS scores in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activeUsers, error: activeError } = await getSupabaseAdmin()
      .from('ers_scores')
      .select('user_id')
      .gte('calculated_at', thirtyDaysAgo);

    if (activeError) {
      console.error('Active users fetch error:', activeError);
    }

    const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_id) || []);
    const totalActiveUsers = uniqueActiveUsers.size;

    // Get latest ERS scores for average calculation
    const { data: latestScores, error: scoresError } = await getSupabaseAdmin()
      .from('ers_scores')
      .select('user_id, ers_score, ers_stage, calculated_at')
      .order('calculated_at', { ascending: false });

    if (scoresError) {
      console.error('Scores fetch error:', scoresError);
    }

    // Group by user and take latest
    const latestByUser = new Map<string, { score: number; stage: string; calculatedAt: string }>();
    for (const score of latestScores || []) {
      if (!latestByUser.has(score.user_id)) {
        latestByUser.set(score.user_id, {
          score: score.ers_score,
          stage: score.ers_stage,
          calculatedAt: score.calculated_at,
        });
      }
    }

    // Calculate average ERS score
    const scores = Array.from(latestByUser.values()).map(v => v.score);
    const averageErsScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // Calculate stage distribution
    const stageCounts = { healing: 0, rebuilding: 0, ready: 0 };
    for (const { stage } of latestByUser.values()) {
      if (stage in stageCounts) {
        stageCounts[stage as keyof typeof stageCounts]++;
      }
    }
    const totalWithScores = latestByUser.size;
    const stageDistribution = {
      healing: totalWithScores > 0 ? Math.round((stageCounts.healing / totalWithScores) * 100) : 0,
      rebuilding: totalWithScores > 0 ? Math.round((stageCounts.rebuilding / totalWithScores) * 100) : 0,
      ready: totalWithScores > 0 ? Math.round((stageCounts.ready / totalWithScores) * 100) : 0,
    };

    // Calculate average days to rebuilding
    // This would require tracking when users first started and when they reached rebuilding
    // For now, we'll estimate based on available data or return null
    const averageDaysToRebuilding = null; // TODO: Implement with proper tracking

    // Get total data points (moods + journal entries)
    const { count: moodCount } = await getSupabaseAdmin()
      .from('mood_logs')
      .select('*', { count: 'exact', head: true });

    const { count: journalCount } = await getSupabaseAdmin()
      .from('journal_entries')
      .select('*', { count: 'exact', head: true });

    const dataPointsCollected = (moodCount || 0) + (journalCount || 0);

    // Build response
    const response = {
      total_active_users: totalActiveUsers,
      average_ers_score: averageErsScore,
      stage_distribution: stageDistribution,
      average_days_to_rebuilding: averageDaysToRebuilding,
      data_points_collected: dataPointsCollected,
      generated_at: new Date().toISOString(),
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Analytics API error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
