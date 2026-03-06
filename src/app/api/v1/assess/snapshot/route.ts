/**
 * POST /api/v1/assess/snapshot
 *
 * Submit snapshot assessment responses and receive an estimated ERS score.
 * This is a lightweight emotional readiness check that doesn't require historical data.
 *
 * Supports the ERS Explainability Layer with configurable verbosity:
 * - minimal: score + label only (default, backward compatible)
 * - standard: score + label + reasoning + trend + trend_delta + top_signals
 * - clinical: all of standard + recommended_action
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
type Verbosity = 'minimal' | 'standard' | 'clinical';
type Trend = 'improving' | 'stable' | 'declining';

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

// Minimal response (backward compatible)
interface DimensionResultMinimal {
  score: number;
  label: string;
}

// Standard response
interface DimensionResultStandard extends DimensionResultMinimal {
  reasoning: string;
  trend: Trend;
  trend_delta: number | null;
  top_signals: string[];
}

// Clinical response
interface DimensionResultClinical extends DimensionResultStandard {
  recommended_action: string;
}

type DimensionResult = DimensionResultMinimal | DimensionResultStandard | DimensionResultClinical;

// Signal catalog - behavioral metadata inputs the reasoning engine references
const DIMENSION_SIGNALS: Record<Dimension, string[]> = {
  emotional_stability: ['mood_variance', 'time_of_day_consistency', 'session_frequency'],
  self_reflection: ['reflection_completions', 'session_duration', 'feature_usage_breadth'],
  coping_capacity: ['coping_tool_usage', 'goal_completion_rate', 'session_duration'],
  behavioral_engagement: ['session_frequency', 'streak_length', 'feature_usage_breadth'],
  social_readiness: ['social_feature_usage', 'session_frequency', 'feature_usage_breadth'],
};

function getScoreLabel(score: number): string {
  if (score < 25) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}

// Determine top 2 signals based on response values
function getTopSignals(dimension: Dimension, values: number[]): string[] {
  const signals = DIMENSION_SIGNALS[dimension];
  // For snapshot assessments, signals are derived from the question responses
  // Return the top 2 most relevant signals for this dimension
  return signals.slice(0, 2);
}

// Generate recommended action for clinical verbosity
function generateRecommendedAction(
  dimension: Dimension,
  score: number,
  trend: Trend
): string {
  const isLow = score < 40;
  const isMid = score >= 40 && score < 70;
  const isHigh = score >= 70;

  switch (dimension) {
    case 'emotional_stability':
      if (isLow) return 'Consider exploring recent stressors — mood variance indicators suggest emotional regulation challenges.';
      if (isMid) return 'Emotional baseline is moderate. May benefit from introducing mindfulness or grounding exercises.';
      return 'Emotional stability is strong. Consider maintenance strategies to sustain current patterns.';

    case 'self_reflection':
      if (isLow) return 'Consider introducing structured reflection prompts — current self-awareness indicators are limited.';
      if (isMid) return 'Reflection engagement is developing. May be a good time to introduce deeper journaling prompts.';
      return 'Self-reflection capacity is strong. Consider exploring more complex emotional patterns.';

    case 'coping_capacity':
      if (isLow) return 'Priority should be placed on building a basic coping toolkit — current resources appear limited.';
      if (isMid) return 'Coping tool usage is developing. Consider introducing a new technique to build range.';
      return 'Coping capacity is well-developed. Consider stress-testing with more challenging scenarios.';

    case 'behavioral_engagement':
      if (isLow) return 'Consider a re-engagement check-in or goal reset — routine indicators suggest disconnection.';
      if (isMid) return 'Engagement is moderate. May benefit from habit stacking or accountability structures.';
      return 'Behavioral engagement is strong. Consider expanding to new growth areas.';

    case 'social_readiness':
      if (isLow) return 'Individual healing may need to progress before social re-engagement — readiness indicators are low.';
      if (isMid) return 'Social readiness is developing. Consider low-pressure social activities or peer support.';
      return 'User may be ready for group or peer-based activities — social indicators are strong.';

    default:
      return 'Continue monitoring progress and adjust support as needed.';
  }
}

// Generate reasoning string with signal references
function generateReasoning(
  dimension: Dimension,
  values: number[],
  score: number,
  trend: Trend
): string {
  const signals = getTopSignals(dimension, values);
  const signalStr = signals.join(' and ');
  const v1 = values[0];
  const v2 = values[1];

  // Generate reasoning based on dimension and score tier
  switch (dimension) {
    case 'emotional_stability':
      if (score >= 70) {
        return `Strong emotional regulation indicated. Assessment responses suggest ${v1 >= 4 ? 'stable mood patterns' : 'moderate mood consistency'} and ${v2 >= 4 ? 'quick emotional recovery' : 'adequate recovery capacity'}. Key signals: ${signalStr}.`;
      } else if (score >= 40) {
        return `Moderate emotional stability observed. ${v1 <= 2 ? 'Mood variance is elevated' : 'Some mood fluctuation noted'} with ${v2 <= 2 ? 'extended recovery periods' : 'variable recovery time'}. Key signals: ${signalStr}.`;
      } else {
        return `Emotional stability requires support. Assessment indicates ${v1 <= 2 ? 'frequent mood fluctuations' : 'inconsistent mood patterns'} and ${v2 <= 2 ? 'difficulty regaining balance' : 'slow emotional recovery'}. Key signals: ${signalStr}.`;
      }

    case 'self_reflection':
      if (score >= 70) {
        return `High self-awareness demonstrated. Responses indicate ${v1 >= 4 ? 'strong pattern recognition' : 'good insight into emotional triggers'} and ${v2 >= 4 ? 'healthy processing of past experiences' : 'ability to reflect constructively'}. Key signals: ${signalStr}.`;
      } else if (score >= 40) {
        return `Moderate reflective capacity. ${v1 <= 2 ? 'Pattern awareness is limited' : 'Some pattern recognition present'} with ${v2 <= 2 ? 'difficulty processing past experiences' : 'variable reflection ability'}. Key signals: ${signalStr}.`;
      } else {
        return `Self-reflection capacity is developing. Assessment suggests ${v1 <= 2 ? 'limited insight into emotional patterns' : 'emerging pattern awareness'} and ${v2 <= 2 ? 'challenges processing difficult experiences' : 'reflection barriers present'}. Key signals: ${signalStr}.`;
      }

    case 'coping_capacity':
      if (score >= 70) {
        return `Strong coping toolkit evident. Responses suggest ${v1 >= 4 ? 'effective stress management strategies' : 'adequate coping resources'} and ${v2 >= 4 ? 'resilient recovery from setbacks' : 'good bounce-back capacity'}. Key signals: ${signalStr}.`;
      } else if (score >= 40) {
        return `Moderate coping resources available. ${v1 <= 2 ? 'Coping strategies appear limited' : 'Some coping tools in use'} with ${v2 <= 2 ? 'extended disruption from setbacks' : 'variable recovery from challenges'}. Key signals: ${signalStr}.`;
      } else {
        return `Coping capacity needs development. Assessment indicates ${v1 <= 2 ? 'few reliable coping strategies' : 'limited stress management tools'} and ${v2 <= 2 ? 'significant difficulty recovering from setbacks' : 'prolonged impact from challenges'}. Key signals: ${signalStr}.`;
      }

    case 'behavioral_engagement':
      if (score >= 70) {
        return `High behavioral engagement shown. Responses indicate ${v1 >= 4 ? 'consistent daily routines' : 'mostly stable self-care practices'} and ${v2 >= 4 ? 'strong motivation for personal growth' : 'active engagement in development'}. Key signals: ${signalStr}.`;
      } else if (score >= 40) {
        return `Moderate engagement observed. ${v1 <= 2 ? 'Daily routines are inconsistent' : 'Some routine maintenance noted'} with ${v2 <= 2 ? 'limited motivation for growth' : 'variable engagement levels'}. Key signals: ${signalStr}.`;
      } else {
        return `Behavioral engagement is low. Assessment suggests ${v1 <= 2 ? 'disrupted daily routines' : 'inconsistent self-care habits'} and ${v2 <= 2 ? 'minimal growth motivation' : 'limited engagement with development'}. Key signals: ${signalStr}.`;
      }

    case 'social_readiness':
      if (score >= 70) {
        return `High social readiness indicated. Responses suggest ${v1 >= 4 ? 'openness to new connections' : 'cautious but positive social outlook'} and ${v2 >= 4 ? 'genuine presence in social settings' : 'ability to engage socially'}. Key signals: ${signalStr}.`;
      } else if (score >= 40) {
        return `Moderate social readiness. ${v1 <= 2 ? 'Hesitation about new connections noted' : 'Mixed feelings about social engagement'} with ${v2 <= 2 ? 'difficulty being present socially' : 'variable social presence'}. Key signals: ${signalStr}.`;
      } else {
        return `Social readiness is developing. Assessment indicates ${v1 <= 2 ? 'significant reluctance toward new connections' : 'social hesitation present'} and ${v2 <= 2 ? 'challenges with social presence' : 'limited social engagement'}. Key signals: ${signalStr}.`;
      }

    default:
      return `Assessment complete. Score of ${score} based on evaluation responses. Key signals: ${signalStr}.`;
  }
}

// Build dimension result based on verbosity level
function buildDimensionResult(
  dimension: Dimension,
  values: number[],
  score: number,
  verbosity: Verbosity
): DimensionResult {
  const label = getScoreLabel(score);

  // Minimal: score + label only (backward compatible)
  if (verbosity === 'minimal') {
    return { score, label };
  }

  // For snapshot assessments: trend is always stable, delta is null (no prior assessment)
  const trend: Trend = 'stable';
  const trend_delta: number | null = null;
  const top_signals = getTopSignals(dimension, values);
  const reasoning = generateReasoning(dimension, values, score, trend);

  // Standard: score + label + reasoning + trend + trend_delta + top_signals
  if (verbosity === 'standard') {
    return {
      score,
      label,
      reasoning,
      trend,
      trend_delta,
      top_signals,
    };
  }

  // Clinical: all of standard + recommended_action
  const recommended_action = generateRecommendedAction(dimension, score, trend);
  return {
    score,
    label,
    reasoning,
    trend,
    trend_delta,
    top_signals,
    recommended_action,
  };
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
    const { responses, externalId, config } = body;

    // Parse verbosity from config, default to 'minimal' for backward compatibility
    const verbosity: Verbosity =
      config?.verbosity && ['minimal', 'standard', 'clinical'].includes(config.verbosity)
        ? config.verbosity
        : 'minimal';

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

    // Generate dimension results based on verbosity level
    const dimensionResults: Record<Dimension, DimensionResult> = {
      emotional_stability: buildDimensionResult(
        'emotional_stability',
        dimensionResponses.emotional_stability,
        dimensionScores.emotional_stability,
        verbosity
      ),
      self_reflection: buildDimensionResult(
        'self_reflection',
        dimensionResponses.self_reflection,
        dimensionScores.self_reflection,
        verbosity
      ),
      coping_capacity: buildDimensionResult(
        'coping_capacity',
        dimensionResponses.coping_capacity,
        dimensionScores.coping_capacity,
        verbosity
      ),
      behavioral_engagement: buildDimensionResult(
        'behavioral_engagement',
        dimensionResponses.behavioral_engagement,
        dimensionScores.behavioral_engagement,
        verbosity
      ),
      social_readiness: buildDimensionResult(
        'social_readiness',
        dimensionResponses.social_readiness,
        dimensionScores.social_readiness,
        verbosity
      ),
    };

    // Build response with meta information
    const response: Record<string, unknown> = {
      ers_snapshot: ersSnapshot,
      dimensions: dimensionResults,
      readiness_label: readinessLabel,
      confidence: 'estimated',
      assessment_id: assessmentId,
      timestamp: timestamp,
    };

    // Add meta block for non-minimal responses
    if (verbosity !== 'minimal') {
      response.meta = {
        verbosity,
        api_version: '1.2.0',
        model_version: 'ers-v1',
      };
    }

    return partnerApiSuccess(response);
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
