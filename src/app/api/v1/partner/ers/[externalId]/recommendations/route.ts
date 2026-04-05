/**
 * GET /api/v1/partner/ers/[externalId]/recommendations
 *
 * Generate targeted improvement recommendations based on comparison data.
 * Identifies user's weakest dimensions relative to cohort and suggests actions.
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkPartnerRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
  getSupabaseAdmin,
} from '@/lib/partner-auth';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';

const DIMENSIONS = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
] as const;

type Dimension = typeof DIMENSIONS[number];

interface DimensionAnalysis {
  dimension: Dimension;
  userScore: number;
  cohortMean: number;
  percentileRank: number;
  gap: number;
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  emotional_stability: 'Emotional Stability',
  self_reflection: 'Self-Reflection',
  coping_capacity: 'Coping Capacity',
  behavioral_engagement: 'Behavioral Engagement',
  social_readiness: 'Social Readiness',
};

const DIMENSION_ACTIONS: Record<Dimension, string[]> = {
  emotional_stability: [
    'Encourage daily mood logging at consistent times',
    'Identify and flag emotional triggers through pattern analysis',
    'Suggest grounding exercises during high-variance periods',
    'Implement gentle check-ins after mood dips',
  ],
  self_reflection: [
    'Introduce guided journaling prompts focused on self-awareness',
    'Encourage reflection on recent positive experiences',
    'Suggest weekly review sessions to identify patterns',
    'Provide feedback on journal depth and consistency',
  ],
  coping_capacity: [
    'Introduce structured coping exercises (breathing, mindfulness)',
    'Increase check-in frequency to build consistency',
    'Track specific coping triggers and responses',
    'Suggest progressive skill-building exercises',
  ],
  behavioral_engagement: [
    'Set achievable daily micro-goals for engagement',
    'Celebrate small wins and consistent behaviors',
    'Create accountability through gentle reminders',
    'Track and visualize engagement streaks',
  ],
  social_readiness: [
    'Gradually introduce low-pressure social activities',
    'Encourage reflection on positive social experiences',
    'Suggest starting with familiar, supportive connections',
    'Build confidence through small social wins',
  ],
};

function generateInsight(
  dimension: Dimension,
  analysis: DimensionAnalysis,
  priority: 'primary' | 'secondary',
  isStrength: boolean = false
): string {
  const label = DIMENSION_LABELS[dimension];

  if (isStrength) {
    if (analysis.percentileRank >= 90) {
      return `${label} is exceptional, placing in the top 10% of users. This is a significant strength to leverage.`;
    }
    return `${label} shows strong development, ranking in the ${analysis.percentileRank}th percentile. This strength can support growth in other areas.`;
  }

  if (analysis.percentileRank < 25) {
    return `${label} is significantly below the cohort average, ranking in the ${analysis.percentileRank}th percentile. This represents a key opportunity for targeted intervention.`;
  }

  if (analysis.percentileRank < 50) {
    return `${label} is below average compared to peers. Focused attention here could yield meaningful improvements.`;
  }

  if (priority === 'primary') {
    return `${label} is this user's least developed dimension relative to peers. While not below average, it represents the biggest opportunity for growth.`;
  }

  return `${label} shows room for improvement. Moderate attention here could help accelerate overall recovery.`;
}

function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 50;
  const count = sortedValues.filter(v => v < value).length;
  return Math.round((count / sortedValues.length) * 100);
}

function calculateStats(values: number[]): { mean: number } {
  if (values.length === 0) return { mean: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return { mean: Math.round(sum / values.length) };
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ externalId: string }> }
) {
  const startTime = Date.now();
  const { externalId } = await params;

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('ers_recommendations', { externalId });
  }

  // Validate API key
  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(
      validation.error || 'Invalid API key',
      'UNAUTHORIZED',
      401
    );
  }

  // Check rate limit
  const rateLimit = await checkPartnerRateLimit(validation.partnerId!, validation.rateLimit);
  if (!rateLimit.allowed) {
    return partnerApiError('Rate limit exceeded', 'RATE_LIMITED', 429, undefined, rateLimit);
  }

  try {
    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Look up the user
    const { data: partnerUser, error: userError } = await supabase
      .from('partner_users')
      .select('id, external_id')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .single();

    if (userError || !partnerUser) {
      await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/recommendations`, 'GET', 404, Date.now() - startTime);
      return partnerApiError('User not found', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Get user's latest ERS score
    const { data: userScore, error: scoreError } = await supabase
      .from('partner_ers_scores')
      .select('*')
      .eq('partner_user_id', partnerUser.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (scoreError || !userScore) {
      await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/recommendations`, 'GET', 404, Date.now() - startTime);
      return partnerApiError('No ERS score found for this user', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Get cohort data (same stage, last 30 days)
    const dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: cohortScores, error: cohortError } = await supabase
      .from('partner_ers_scores')
      .select('score, emotional_stability, self_reflection, coping_capacity, behavioral_engagement, social_readiness')
      .eq('stage', userScore.stage)
      .gte('calculated_at', dateFilter);

    if (cohortError) {
      console.error('Error fetching cohort scores:', cohortError);
      await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/recommendations`, 'GET', 500, Date.now() - startTime);
      return partnerApiError('Failed to fetch comparison data', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    // Analyze each dimension
    const dimensionAnalyses: DimensionAnalysis[] = [];

    for (const dim of DIMENSIONS) {
      const dimScores = cohortScores?.map(s => s[dim] as number).filter(v => v != null) || [];
      const sortedDimScores = [...dimScores].sort((a, b) => a - b);
      const dimStats = calculateStats(dimScores);
      const userDimScore = userScore[dim] as number || 0;
      const dimPercentile = calculatePercentile(userDimScore, sortedDimScores);
      const gap = userDimScore - dimStats.mean;

      dimensionAnalyses.push({
        dimension: dim,
        userScore: userDimScore,
        cohortMean: dimStats.mean,
        percentileRank: dimPercentile,
        gap,
      });
    }

    // Sort by gap (ascending) to find weakest dimensions
    const sortedByGap = [...dimensionAnalyses].sort((a, b) => a.gap - b.gap);

    // Get 2 weakest dimensions for recommendations
    const weakestTwo = sortedByGap.slice(0, 2);

    // Get strongest dimensions (top 2 by gap)
    const strongestTwo = sortedByGap.slice(-2).reverse();

    // Build recommendations
    const recommendations = weakestTwo.map((analysis, index) => {
      const priority = index === 0 ? 'primary' : 'secondary';
      const actions = DIMENSION_ACTIONS[analysis.dimension];

      // Select 3 relevant actions
      const selectedActions = actions.slice(0, 3);

      return {
        dimension: analysis.dimension,
        currentScore: analysis.userScore,
        cohortAverage: analysis.cohortMean,
        percentileRank: analysis.percentileRank,
        priority,
        insight: generateInsight(analysis.dimension, analysis, priority as 'primary' | 'secondary'),
        suggestedActions: selectedActions,
      };
    });

    // Build strengths
    const strengths = strongestTwo
      .filter(a => a.percentileRank >= 60) // Only include if actually above average
      .map(analysis => ({
        dimension: analysis.dimension,
        percentileRank: analysis.percentileRank,
        note: generateInsight(analysis.dimension, analysis, 'primary', true),
      }));

    const response = {
      userId: externalId,
      currentScore: userScore.score,
      currentStage: userScore.stage,
      recommendations,
      strengths,
    };

    await logPartnerApiUsage(partnerId, `/api/v1/partner/ers/${externalId}/recommendations`, 'GET', 200, Date.now() - startTime);
    return partnerApiSuccess(response, 200, undefined, rateLimit);
  } catch (error) {
    console.error('ERS recommendations error:', error);
    await logPartnerApiUsage(validation.partnerId!, `/api/v1/partner/ers/${externalId}/recommendations`, 'GET', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined);
  }
}
