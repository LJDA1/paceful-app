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

    return partnerApiSuccess({
      ers_snapshot: ersSnapshot,
      dimensions: {
        emotional_stability: dimensionScores.emotional_stability,
        self_reflection: dimensionScores.self_reflection,
        coping_capacity: dimensionScores.coping_capacity,
        behavioral_engagement: dimensionScores.behavioral_engagement,
        social_readiness: dimensionScores.social_readiness,
      },
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
