/**
 * B2B API: Batch ERS Lookup
 *
 * GET /api/v1/ers/batch?user_ids=id1,id2,id3
 * Requires: Bearer token with "read_ers" permission
 * Max 50 users per request
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

const MAX_BATCH_SIZE = 50;

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
  if (!hasPermission(auth, 'read_ers')) {
    return apiError('API key does not have read_ers permission', 'FORBIDDEN', 403);
  }

  // Parse user_ids from query params
  const { searchParams } = new URL(request.url);
  const userIdsParam = searchParams.get('user_ids');

  if (!userIdsParam) {
    return apiError('user_ids query parameter is required', 'INVALID_REQUEST', 400);
  }

  const userIds = userIdsParam.split(',').map(id => id.trim()).filter(Boolean);

  if (userIds.length === 0) {
    return apiError('At least one user_id is required', 'INVALID_REQUEST', 400);
  }

  if (userIds.length > MAX_BATCH_SIZE) {
    return apiError(`Maximum ${MAX_BATCH_SIZE} users per batch request`, 'INVALID_REQUEST', 400);
  }

  try {
    // Fetch latest ERS scores for all users
    // Using a subquery to get latest score per user
    const { data: ersData, error: ersError } = await getSupabaseAdmin()
      .from('ers_scores')
      .select(`
        user_id,
        ers_score,
        ers_stage,
        ers_delta,
        emotional_stability_score,
        self_reflection_score,
        engagement_consistency_score,
        trust_openness_score,
        recovery_behavior_score,
        social_readiness_score,
        calculated_at
      `)
      .in('user_id', userIds)
      .order('calculated_at', { ascending: false });

    if (ersError) {
      console.error('ERS batch fetch error:', ersError);
      return apiError('Failed to fetch ERS data', 'INTERNAL_ERROR', 500);
    }

    // Group by user_id and take only the latest score for each
    const latestByUser = new Map<string, typeof ersData[0]>();
    for (const score of ersData || []) {
      if (!latestByUser.has(score.user_id)) {
        latestByUser.set(score.user_id, score);
      }
    }

    // Build response array
    const results = userIds.map(userId => {
      const data = latestByUser.get(userId);

      if (!data) {
        return {
          user_id: userId,
          found: false,
          ers_score: null,
          ers_stage: null,
          dimensions: null,
          calculated_at: null,
          trend: null,
        };
      }

      // Determine trend direction
      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
      if (data.ers_delta !== null) {
        if (data.ers_delta > 2) {
          trendDirection = 'improving';
        } else if (data.ers_delta < -2) {
          trendDirection = 'declining';
        }
      }

      return {
        user_id: data.user_id,
        found: true,
        ers_score: Math.round(data.ers_score),
        ers_stage: data.ers_stage,
        dimensions: {
          emotional_stability: data.emotional_stability_score ? Math.round(data.emotional_stability_score) : null,
          self_reflection: data.self_reflection_score ? Math.round(data.self_reflection_score) : null,
          engagement_consistency: data.engagement_consistency_score ? Math.round(data.engagement_consistency_score) : null,
          trust_openness: data.trust_openness_score ? Math.round(data.trust_openness_score) : null,
          recovery_behavior: data.recovery_behavior_score ? Math.round(data.recovery_behavior_score) : null,
          social_readiness: data.social_readiness_score ? Math.round(data.social_readiness_score) : null,
        },
        calculated_at: data.calculated_at,
        trend: {
          direction: trendDirection,
          weekly_change: data.ers_delta !== null ? Math.round(data.ers_delta * 10) / 10 : null,
        },
      };
    });

    return apiSuccess({
      results,
      total_requested: userIds.length,
      total_found: results.filter(r => r.found).length,
    });
  } catch (error) {
    console.error('API batch error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
