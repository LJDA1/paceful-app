/**
 * B2B API: Get ERS for a Single User
 *
 * GET /api/v1/ers/:userId
 * Requires: Bearer token with "read_ers" permission
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Validate API key
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return apiError(auth.error || 'Unauthorized', 'UNAUTHORIZED', 401);
  }

  // Check permission
  if (!hasPermission(auth, 'read_ers')) {
    return apiError('API key does not have read_ers permission', 'FORBIDDEN', 403);
  }

  const { userId } = await params;

  if (!userId) {
    return apiError('User ID is required', 'INVALID_REQUEST', 400);
  }

  try {
    // Fetch latest ERS score for user
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
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (ersError && ersError.code === 'PGRST116') {
      return apiError('User not found or no ERS data available', 'NOT_FOUND', 404);
    }

    if (ersError) {
      console.error('ERS fetch error:', ersError);
      return apiError('Failed to fetch ERS data', 'INTERNAL_ERROR', 500);
    }

    // Determine trend direction
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (ersData.ers_delta !== null) {
      if (ersData.ers_delta > 2) {
        trendDirection = 'improving';
      } else if (ersData.ers_delta < -2) {
        trendDirection = 'declining';
      }
    }

    // Build response (anonymized - no personal data)
    const response = {
      user_id: ersData.user_id,
      ers_score: Math.round(ersData.ers_score),
      ers_stage: ersData.ers_stage,
      dimensions: {
        emotional_stability: ersData.emotional_stability_score ? Math.round(ersData.emotional_stability_score) : null,
        self_reflection: ersData.self_reflection_score ? Math.round(ersData.self_reflection_score) : null,
        engagement_consistency: ersData.engagement_consistency_score ? Math.round(ersData.engagement_consistency_score) : null,
        trust_openness: ersData.trust_openness_score ? Math.round(ersData.trust_openness_score) : null,
        recovery_behavior: ersData.recovery_behavior_score ? Math.round(ersData.recovery_behavior_score) : null,
        social_readiness: ersData.social_readiness_score ? Math.round(ersData.social_readiness_score) : null,
      },
      calculated_at: ersData.calculated_at,
      trend: {
        direction: trendDirection,
        weekly_change: ersData.ers_delta !== null ? Math.round(ersData.ers_delta * 10) / 10 : null,
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('API error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
