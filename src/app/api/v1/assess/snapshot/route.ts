/**
 * POST /api/v1/assess/snapshot
 *
 * Submit snapshot assessment responses and receive an estimated ERS score.
 * This is a lightweight emotional readiness check that doesn't require historical data.
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

// Valid dimensions
const VALID_DIMENSIONS = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
] as const;

type Dimension = (typeof VALID_DIMENSIONS)[number];

// Dimension weights for calculating overall ERS
const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  emotional_stability: 0.25,
  self_reflection: 0.15,
  coping_capacity: 0.20,
  behavioral_engagement: 0.15,
  social_readiness: 0.25,
};

// Question IDs per dimension
const QUESTIONS_PER_DIMENSION: Record<Dimension, number[]> = {
  emotional_stability: [1, 2],
  self_reflection: [3, 4],
  coping_capacity: [5, 6],
  behavioral_engagement: [7, 8],
  social_readiness: [9, 10],
};

interface ResponseItem {
  dimension: string;
  question_id: number;
  value: number;
}

interface DimensionScores {
  emotional_stability: number;
  self_reflection: number;
  coping_capacity: number;
  behavioral_engagement: number;
  social_readiness: number;
}

interface DimensionResult {
  score: number;
  label: string;
  insight: string;
}

// Question descriptions for insight generation
const QUESTION_CONTEXTS: Record<number, { low: string; high: string }> = {
  1: { low: 'frequent mood fluctuations', high: 'stable mood patterns' },
  2: { low: 'slow emotional recovery', high: 'quick emotional rebalancing' },
  3: { low: 'limited pattern awareness', high: 'strong self-awareness of emotional patterns' },
  4: { low: 'difficulty processing past experiences', high: 'healthy reflection on past experiences' },
  5: { low: 'limited coping strategies', high: 'effective stress management techniques' },
  6: { low: 'slow recovery from setbacks', high: 'resilient bounce-back from challenges' },
  7: { low: 'inconsistent daily routines', high: 'consistent self-care practices' },
  8: { low: 'low motivation for growth', high: 'active engagement in personal development' },
  9: { low: 'hesitation about new connections', high: 'openness to forming new relationships' },
  10: { low: 'difficulty being present socially', high: 'genuine engagement in social settings' },
};

function getScoreLabel(score: number): string {
  if (score < 25) return 'Needs Support';
  if (score < 50) return 'Developing';
  if (score < 75) return 'Progressing';
  return 'Strong';
}

function generateDimensionInsight(
  dimension: Dimension,
  values: number[],
  score: number
): string {
  const questionIds = QUESTIONS_PER_DIMENSION[dimension];
  const q1Context = QUESTION_CONTEXTS[questionIds[0]];
  const q2Context = QUESTION_CONTEXTS[questionIds[1]];

  const v1 = values[0];
  const v2 = values[1];
  const avg = (v1 + v2) / 2;

  // Determine primary signals based on response values
  const signal1 = v1 >= 4 ? q1Context.high : v1 <= 2 ? q1Context.low : null;
  const signal2 = v2 >= 4 ? q2Context.high : v2 <= 2 ? q2Context.low : null;

  // Build insight based on dimension and score range
  switch (dimension) {
    case 'emotional_stability':
      if (score >= 75) {
        return `Strong emotional regulation indicated by ${signal1 || 'moderate mood consistency'} and ${signal2 || 'reasonable recovery time'}. This suggests a stable emotional foundation.`;
      } else if (score >= 50) {
        return `Moderate emotional stability with ${v1 >= 3 ? 'some mood consistency' : 'occasional mood swings'} and ${v2 >= 3 ? 'adequate recovery capacity' : 'room to improve emotional rebalancing'}. Building resilience is in progress.`;
      } else if (score >= 25) {
        return `Developing emotional regulation. Responses indicate ${signal1 || 'variable mood patterns'} and ${signal2 || 'extended recovery periods'}. Focused support in this area may help.`;
      } else {
        return `Significant emotional volatility indicated by ${q1Context.low} and ${q2Context.low}. This dimension would benefit from targeted intervention and support.`;
      }

    case 'self_reflection':
      if (score >= 75) {
        return `High self-awareness demonstrated through ${signal1 || 'good pattern recognition'} and ${signal2 || 'healthy processing of experiences'}. Strong foundation for continued growth.`;
      } else if (score >= 50) {
        return `Moderate reflective capacity with ${v1 >= 3 ? 'emerging pattern awareness' : 'limited insight into emotional triggers'} and ${v2 >= 3 ? 'some ability to process experiences' : 'difficulty with past reflection'}. Journaling may accelerate progress.`;
      } else if (score >= 25) {
        return `Developing self-reflection skills. ${signal1 || 'Pattern recognition is still building'} and ${signal2 || 'processing past experiences remains challenging'}. Guided reflection exercises could help.`;
      } else {
        return `Limited self-reflection capacity indicated by ${q1Context.low} and ${q2Context.low}. Professional support may help develop these crucial skills.`;
      }

    case 'coping_capacity':
      if (score >= 75) {
        return `Strong coping toolkit evidenced by ${signal1 || 'effective stress strategies'} and ${signal2 || 'quick setback recovery'}. Well-equipped to handle challenges.`;
      } else if (score >= 50) {
        return `Adequate coping resources with ${v1 >= 3 ? 'some effective strategies' : 'limited stress relief options'} and ${v2 >= 3 ? 'reasonable recovery from setbacks' : 'extended disruption from challenges'}. Expanding coping skills would strengthen resilience.`;
      } else if (score >= 25) {
        return `Developing coping capacity. Responses suggest ${signal1 || 'few reliable coping strategies'} and ${signal2 || 'difficulty bouncing back'}. Building a broader toolkit is recommended.`;
      } else {
        return `Limited coping resources indicated by ${q1Context.low} and ${q2Context.low}. Priority should be placed on developing healthy stress management techniques.`;
      }

    case 'behavioral_engagement':
      if (score >= 75) {
        return `High behavioral engagement shown through ${signal1 || 'strong routine maintenance'} and ${signal2 || 'motivated self-improvement'}. Active participation in recovery is evident.`;
      } else if (score >= 50) {
        return `Moderate engagement with ${v1 >= 3 ? 'somewhat consistent routines' : 'irregular self-care habits'} and ${v2 >= 3 ? 'periodic growth efforts' : 'limited motivation for change'}. Incremental habit building may help.`;
      } else if (score >= 25) {
        return `Low behavioral engagement indicated by ${signal1 || 'disrupted daily routines'} and ${signal2 || 'minimal growth motivation'}. Small, achievable goals could rebuild momentum.`;
      } else {
        return `Minimal behavioral engagement with ${q1Context.low} and ${q2Context.low}. External structure and accountability support may be beneficial.`;
      }

    case 'social_readiness':
      if (score >= 75) {
        return `High social readiness demonstrated by ${signal1 || 'openness to connections'} and ${signal2 || 'genuine social engagement'}. Well-positioned for relationship building.`;
      } else if (score >= 50) {
        return `Moderate social readiness with ${v1 >= 3 ? 'cautious openness to connections' : 'significant hesitation about relationships'} and ${v2 >= 3 ? 'ability to engage when motivated' : 'difficulty being present socially'}. Gradual social exposure may help.`;
      } else if (score >= 25) {
        return `Developing social readiness. Responses indicate ${signal1 || 'reluctance toward new connections'} and ${signal2 || 'limited social presence'}. Low-pressure social activities are recommended.`;
      } else {
        return `Low social readiness indicated by ${q1Context.low} and ${q2Context.low}. Individual healing may need to progress before social re-engagement.`;
      }

    default:
      return `Score of ${score} based on assessment responses.`;
  }
}

function getReadinessLabel(score: number): string {
  if (score < 40) return 'Not Ready';
  if (score < 60) return 'Healing';
  if (score < 75) return 'Rebuilding';
  return 'Ready';
}

function calculateDimensionScore(values: number[]): number {
  // Each dimension has 2 questions scored 1-5
  // Convert to 0-100: ((sum - 2) / 8) * 100
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(((sum - 2) / 8) * 100);
}

function calculateOverallERS(dimensions: DimensionScores): number {
  let weightedSum = 0;
  for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    weightedSum += dimensions[dim as Dimension] * weight;
  }
  return Math.round(weightedSum);
}

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
    return partnerApiError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      { 'Retry-After': String(rateLimit.retryAfter || 3600) }
    );
  }

  try {
    const body = await request.json();
    const { responses, externalId } = body;

    // Validate responses array exists
    if (!responses || !Array.isArray(responses)) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/assess/snapshot',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'responses array is required',
        'BAD_REQUEST',
        400
      );
    }

    // Validate exactly 10 responses
    if (responses.length !== 10) {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/assess/snapshot',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Expected exactly 10 responses, received ${responses.length}`,
        'BAD_REQUEST',
        400
      );
    }

    // Track which questions have been answered
    const answeredQuestions = new Set<number>();
    const dimensionResponses: Record<Dimension, number[]> = {
      emotional_stability: [],
      self_reflection: [],
      coping_capacity: [],
      behavioral_engagement: [],
      social_readiness: [],
    };

    // Validate each response
    for (let i = 0; i < responses.length; i++) {
      const response: ResponseItem = responses[i];

      // Validate dimension
      if (!response.dimension || !VALID_DIMENSIONS.includes(response.dimension as Dimension)) {
        await logPartnerApiUsage(
          validation.partnerId!,
          '/api/v1/assess/snapshot',
          'POST',
          400,
          Date.now() - startTime
        );
        return partnerApiError(
          `Invalid dimension at index ${i}: "${response.dimension}". Valid dimensions: ${VALID_DIMENSIONS.join(', ')}`,
          'BAD_REQUEST',
          400
        );
      }

      // Validate question_id
      const questionId = response.question_id;
      if (typeof questionId !== 'number' || questionId < 1 || questionId > 10) {
        await logPartnerApiUsage(
          validation.partnerId!,
          '/api/v1/assess/snapshot',
          'POST',
          400,
          Date.now() - startTime
        );
        return partnerApiError(
          `Invalid question_id at index ${i}: "${questionId}". Must be 1-10`,
          'BAD_REQUEST',
          400
        );
      }

      // Validate question belongs to the specified dimension
      const dimension = response.dimension as Dimension;
      const expectedQuestions = QUESTIONS_PER_DIMENSION[dimension];
      if (!expectedQuestions.includes(questionId)) {
        await logPartnerApiUsage(
          validation.partnerId!,
          '/api/v1/assess/snapshot',
          'POST',
          400,
          Date.now() - startTime
        );
        return partnerApiError(
          `Question ${questionId} does not belong to dimension "${dimension}". Expected questions: ${expectedQuestions.join(', ')}`,
          'BAD_REQUEST',
          400
        );
      }

      // Check for duplicate questions
      if (answeredQuestions.has(questionId)) {
        await logPartnerApiUsage(
          validation.partnerId!,
          '/api/v1/assess/snapshot',
          'POST',
          400,
          Date.now() - startTime
        );
        return partnerApiError(
          `Duplicate response for question_id ${questionId}`,
          'BAD_REQUEST',
          400
        );
      }

      // Validate value
      const value = response.value;
      if (typeof value !== 'number' || value < 1 || value > 5 || !Number.isInteger(value)) {
        await logPartnerApiUsage(
          validation.partnerId!,
          '/api/v1/assess/snapshot',
          'POST',
          400,
          Date.now() - startTime
        );
        return partnerApiError(
          `Invalid value at index ${i}: "${value}". Must be integer 1-5`,
          'BAD_REQUEST',
          400
        );
      }

      answeredQuestions.add(questionId);
      dimensionResponses[dimension].push(value);
    }

    // Verify all 10 questions are answered
    if (answeredQuestions.size !== 10) {
      const missing = [];
      for (let i = 1; i <= 10; i++) {
        if (!answeredQuestions.has(i)) missing.push(i);
      }
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/assess/snapshot',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        `Missing responses for questions: ${missing.join(', ')}`,
        'BAD_REQUEST',
        400
      );
    }

    // Verify each dimension has exactly 2 responses
    for (const [dim, values] of Object.entries(dimensionResponses)) {
      if (values.length !== 2) {
        await logPartnerApiUsage(
          validation.partnerId!,
          '/api/v1/assess/snapshot',
          'POST',
          400,
          Date.now() - startTime
        );
        return partnerApiError(
          `Dimension "${dim}" requires exactly 2 responses, received ${values.length}`,
          'BAD_REQUEST',
          400
        );
      }
    }

    // Calculate dimension scores
    const dimensionScores: DimensionScores = {
      emotional_stability: calculateDimensionScore(dimensionResponses.emotional_stability),
      self_reflection: calculateDimensionScore(dimensionResponses.self_reflection),
      coping_capacity: calculateDimensionScore(dimensionResponses.coping_capacity),
      behavioral_engagement: calculateDimensionScore(dimensionResponses.behavioral_engagement),
      social_readiness: calculateDimensionScore(dimensionResponses.social_readiness),
    };

    // Calculate overall ERS
    const ersSnapshot = calculateOverallERS(dimensionScores);
    const readinessLabel = getReadinessLabel(ersSnapshot);

    // Generate assessment ID
    const assessmentId = `snap_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    // Store in database
    const supabase = getSupabaseAdmin();
    const { error: insertError } = await supabase
      .from('snapshot_assessments')
      .insert({
        id: assessmentId.replace('snap_', '').padEnd(36, '0').substring(0, 36).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
        partner_id: validation.partnerId,
        external_id: externalId || null,
        ers_snapshot: ersSnapshot,
        readiness_label: readinessLabel,
        confidence: 'estimated',
        dim_emotional_stability: dimensionScores.emotional_stability,
        dim_self_reflection: dimensionScores.self_reflection,
        dim_coping_capacity: dimensionScores.coping_capacity,
        dim_behavioral_engagement: dimensionScores.behavioral_engagement,
        dim_social_readiness: dimensionScores.social_readiness,
        responses: responses,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      });

    if (insertError) {
      console.error('Error storing assessment:', insertError);
      // Continue anyway - we still return the result even if storage fails
    }

    // Log API usage
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/assess/snapshot',
      'POST',
      200,
      Date.now() - startTime
    );

    // Generate dimension results with insights
    const dimensionResults: Record<Dimension, DimensionResult> = {
      emotional_stability: {
        score: dimensionScores.emotional_stability,
        label: getScoreLabel(dimensionScores.emotional_stability),
        insight: generateDimensionInsight('emotional_stability', dimensionResponses.emotional_stability, dimensionScores.emotional_stability),
      },
      self_reflection: {
        score: dimensionScores.self_reflection,
        label: getScoreLabel(dimensionScores.self_reflection),
        insight: generateDimensionInsight('self_reflection', dimensionResponses.self_reflection, dimensionScores.self_reflection),
      },
      coping_capacity: {
        score: dimensionScores.coping_capacity,
        label: getScoreLabel(dimensionScores.coping_capacity),
        insight: generateDimensionInsight('coping_capacity', dimensionResponses.coping_capacity, dimensionScores.coping_capacity),
      },
      behavioral_engagement: {
        score: dimensionScores.behavioral_engagement,
        label: getScoreLabel(dimensionScores.behavioral_engagement),
        insight: generateDimensionInsight('behavioral_engagement', dimensionResponses.behavioral_engagement, dimensionScores.behavioral_engagement),
      },
      social_readiness: {
        score: dimensionScores.social_readiness,
        label: getScoreLabel(dimensionScores.social_readiness),
        insight: generateDimensionInsight('social_readiness', dimensionResponses.social_readiness, dimensionScores.social_readiness),
      },
    };

    return partnerApiSuccess({
      ers_snapshot: ersSnapshot,
      dimensions: dimensionResults,
      readiness_label: readinessLabel,
      confidence: 'estimated',
      assessment_id: assessmentId,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error('Snapshot assessment error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/assess/snapshot',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
