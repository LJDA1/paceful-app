/**
 * POST /api/v1/assess/:vertical
 *
 * Generic vertical assessment endpoint.
 * Combines core ERS analysis with industry-specific signal detection.
 *
 * Flow:
 * 1. Look up vertical config from registry
 * 2. Run core ERS text analysis (same as /assess/analyze)
 * 3. Run vertical-specific signal detection via Claude
 * 4. Merge results into unified response
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  validatePartnerKey,
  checkEndpointRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
} from '@/lib/partner-auth';
import { extractApiKey, isSandboxRequest } from '@/lib/sandbox-middleware';
import { CURRENT_API_VERSION, MINIMUM_SUPPORTED_VERSION } from '@/lib/api-version';
import {
  getVertical,
  listVerticals,
  VerticalConfig,
  SignalDetection,
  VerticalAnalysisResult,
} from '@/lib/verticals';
import {
  analyzeTextWithClaude,
  calculateErsScore,
  getScoreLabel,
  getReadinessLabel,
  VALID_SOURCE_TYPES,
  SourceType,
  Dimension,
  VALID_DIMENSIONS,
} from '@/lib/text-analysis';

interface VerticalRequest {
  user_id: string;
  text: string;
  source_type?: string;
}

// ============================================================================
// Vertical Signal Analysis via Claude
// ============================================================================

async function analyzeVerticalSignals(
  text: string,
  verticalConfig: VerticalConfig
): Promise<VerticalAnalysisResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build signal catalog for prompt
  const signalCatalog = verticalConfig.signals.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    examples: s.examples,
    is_protective: s.risk_weight < 0,
  }));

  const systemPrompt = `${verticalConfig.prompt_context}

SIGNAL CATALOG:
${JSON.stringify(signalCatalog, null, 2)}

Respond with ONLY a valid JSON object in this exact format:
{
  "signals": [
    {
      "id": "signal_id",
      "detected": true,
      "confidence": "low" | "medium" | "high",
      "evidence": "Brief quote or description from text"
    }
  ]
}

Include ALL signals from the catalog in your response, marking each as detected: true or detected: false.
For signals not detected, set confidence to null and evidence to null.`;

  // Truncate text to reasonable length
  const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...[truncated]' : text;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze this text for the signals in the catalog:\n\n${truncatedText}`,
      },
    ],
  });

  // Extract text from response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON from response
  let signalResults: { signals: SignalDetection[] };
  try {
    const cleanedText = textBlock.text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    signalResults = JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('Failed to parse vertical analysis response:', textBlock.text);
    // Return empty signals on parse error
    signalResults = {
      signals: verticalConfig.signals.map((s) => ({
        id: s.id,
        detected: false,
        confidence: null,
        evidence: null,
      })),
    };
  }

  // Ensure all signals are present in response
  const signalMap = new Map(signalResults.signals.map((s) => [s.id, s]));
  const fullSignals: SignalDetection[] = verticalConfig.signals.map((configSignal) => {
    const detected = signalMap.get(configSignal.id);
    return detected || {
      id: configSignal.id,
      detected: false,
      confidence: null,
      evidence: null,
    };
  });

  // Calculate risk score
  const riskScore = calculateRiskScore(fullSignals, verticalConfig);

  // Determine risk level
  const riskLevel = getRiskLevel(riskScore, verticalConfig);

  // Get recommended action
  const riskLevelConfig = verticalConfig.risk_levels.find((r) => r.level === riskLevel);
  const recommendedAction = riskLevelConfig?.action || 'Review required';

  // Count detected signals
  const signalsDetected = fullSignals.filter((s) => s.detected).length;

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    recommended_action: recommendedAction,
    signals: fullSignals,
    signals_detected: signalsDetected,
    signals_total: verticalConfig.signals.length,
  };
}

function calculateRiskScore(signals: SignalDetection[], config: VerticalConfig): number {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const signal of signals) {
    const signalConfig = config.signals.find((s) => s.id === signal.id);
    if (!signalConfig) continue;

    const absWeight = Math.abs(signalConfig.risk_weight);
    totalWeight += absWeight;

    if (signal.detected) {
      // Confidence multiplier
      const confidenceMultiplier =
        signal.confidence === 'high' ? 1.0 :
        signal.confidence === 'medium' ? 0.7 :
        signal.confidence === 'low' ? 0.4 : 0;

      // If negative weight (protective), subtract from score
      if (signalConfig.risk_weight < 0) {
        weightedScore -= absWeight * confidenceMultiplier;
      } else {
        weightedScore += signalConfig.risk_weight * confidenceMultiplier;
      }
    }
  }

  // Normalize to 0-100
  if (totalWeight === 0) return 0;

  // Calculate as percentage of max possible positive score
  const maxPositiveWeight = config.signals
    .filter((s) => s.risk_weight > 0)
    .reduce((sum, s) => sum + s.risk_weight, 0);

  const score = (weightedScore / maxPositiveWeight) * 100;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRiskLevel(score: number, config: VerticalConfig): 'low' | 'moderate' | 'high' | 'critical' {
  for (const level of config.risk_levels) {
    if (score >= level.range[0] && score <= level.range[1]) {
      return level.level;
    }
  }
  return 'low';
}

// ============================================================================
// Sandbox Response Generator
// ============================================================================

function generateSandboxResponse(
  userId: string,
  vertical: string,
  verticalConfig: VerticalConfig,
  sourceType: string,
  textLength: number
): Record<string, unknown> {
  // Generate deterministic mock data based on user_id
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rng = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Generate mock ERS scores
  const baseScore = 45 + Math.floor(rng(hash) * 30);
  const dimensions: Record<string, { score: number; label: string; confidence: string }> = {};

  for (const dim of VALID_DIMENSIONS) {
    const dimScore = Math.max(20, Math.min(90, baseScore + Math.floor(rng(hash + dim.length) * 20) - 10));
    dimensions[dim] = {
      score: dimScore,
      label: getScoreLabel(dimScore),
      confidence: rng(hash + 1) > 0.3 ? 'medium' : 'high',
    };
  }

  const ersScore = Math.round(
    dimensions.emotional_stability.score * 0.25 +
    dimensions.self_reflection.score * 0.15 +
    dimensions.coping_capacity.score * 0.2 +
    dimensions.behavioral_engagement.score * 0.15 +
    dimensions.social_readiness.score * 0.25
  );

  // Generate mock vertical signals
  const signals: SignalDetection[] = verticalConfig.signals.map((sig, idx) => {
    const detected = rng(hash + idx) > 0.6;
    return {
      id: sig.id,
      detected,
      confidence: detected ? (rng(hash + idx + 100) > 0.5 ? 'high' : 'medium') : null,
      evidence: detected ? `Pattern detected in text analysis` : null,
    };
  });

  const signalsDetected = signals.filter((s) => s.detected).length;
  const riskScore = calculateRiskScore(signals, verticalConfig);
  const riskLevel = getRiskLevel(riskScore, verticalConfig);
  const riskLevelConfig = verticalConfig.risk_levels.find((r) => r.level === riskLevel);

  return {
    user_id: userId,
    vertical,
    ers: {
      ers_snapshot: ersScore,
      dimensions,
      readiness_label: getReadinessLabel(ersScore),
      confidence: textLength > 200 ? 'medium' : 'low',
    },
    vertical_analysis: {
      risk_score: riskScore,
      risk_level: riskLevel,
      recommended_action: riskLevelConfig?.action || 'Review required',
      signals,
      signals_detected: signalsDetected,
      signals_total: verticalConfig.signals.length,
    },
    source_type: sourceType,
    extraction_confidence: textLength > 200 ? 'medium' : 'low',
    assessed_at: new Date().toISOString(),
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vertical: string }> }
) {
  const { vertical: verticalSlug } = await params;
  const startTime = Date.now();

  // Check if vertical exists
  const verticalConfig = getVertical(verticalSlug);
  if (!verticalConfig) {
    const availableVerticals = listVerticals();
    return partnerApiError(
      `Vertical '${verticalSlug}' not found. Available verticals: ${availableVerticals.map((v) => v.slug).join(', ')}`,
      'NOT_FOUND',
      404
    );
  }

  // Extract API key
  const apiKey = extractApiKey(request.headers);
  if (!apiKey) {
    return partnerApiError('API key required. Provide X-API-Key header.', 'UNAUTHORIZED', 401);
  }

  // Check for sandbox mode
  const isSandbox = isSandboxRequest(apiKey);

  // Parse request body
  let body: VerticalRequest;
  try {
    body = await request.json();
  } catch {
    return partnerApiError('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { user_id, text, source_type } = body;

  // Validate required fields
  if (!user_id || typeof user_id !== 'string') {
    return partnerApiError('user_id is required', 'BAD_REQUEST', 400);
  }

  if (!text || typeof text !== 'string') {
    return partnerApiError('text is required', 'BAD_REQUEST', 400);
  }

  if (text.length < 20) {
    return partnerApiError('text must be at least 20 characters', 'BAD_REQUEST', 400);
  }

  // Validate source_type
  const validatedSourceType: SourceType = source_type && VALID_SOURCE_TYPES.includes(source_type as SourceType)
    ? (source_type as SourceType)
    : 'free_text';

  // Sandbox mode response
  if (isSandbox) {
    const sandboxData = generateSandboxResponse(
      user_id,
      verticalSlug,
      verticalConfig,
      validatedSourceType,
      text.length
    );
    return new NextResponse(JSON.stringify({ success: true, data: sandboxData }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Paceful-Sandbox': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'X-API-Version': CURRENT_API_VERSION,
        'X-API-Min-Version': MINIMUM_SUPPORTED_VERSION,
      },
    });
  }

  // Validate API key for production
  const partner = await validatePartnerKey(request);
  if (!partner.valid || !partner.partnerId) {
    return partnerApiError(partner.error || 'Invalid API key', 'UNAUTHORIZED', 401);
  }

  // Check rate limit
  const rateCheck = await checkEndpointRateLimit(partner.partnerId, `/assess/${verticalSlug}`);
  if (!rateCheck.allowed) {
    return partnerApiError(
      `Rate limit exceeded. Limit: ${rateCheck.limit}/hour`,
      'RATE_LIMITED',
      429,
      undefined,
      rateCheck
    );
  }

  try {
    // Step 1: Run core ERS text analysis
    const ersAnalysis = await analyzeTextWithClaude(text, validatedSourceType);

    // Calculate ERS score
    const ersScore = calculateErsScore(ersAnalysis.dimensions);

    // Build ERS response
    const dimensions: Record<string, { score: number; label: string; confidence: string }> = {};
    for (const dim of VALID_DIMENSIONS) {
      const dimData = ersAnalysis.dimensions[dim];
      dimensions[dim] = {
        score: dimData.score,
        label: getScoreLabel(dimData.score),
        confidence: dimData.confidence,
      };
    }

    // Step 2: Run vertical-specific signal analysis
    const verticalAnalysis = await analyzeVerticalSignals(text, verticalConfig);

    // Build response
    const response = {
      user_id,
      vertical: verticalSlug,
      ers: {
        ers_snapshot: ersScore,
        dimensions,
        readiness_label: getReadinessLabel(ersScore),
        confidence: ersAnalysis.overall_confidence,
      },
      vertical_analysis: verticalAnalysis,
      source_type: validatedSourceType,
      extraction_confidence: ersAnalysis.overall_confidence,
      assessed_at: new Date().toISOString(),
    };

    // Log usage
    const latencyMs = Date.now() - startTime;
    await logPartnerApiUsage(
      partner.partnerId,
      `/api/v1/assess/${verticalSlug}`,
      'POST',
      200,
      latencyMs,
      { vertical: verticalSlug, user_id }
    );

    return partnerApiSuccess({ success: true, data: response }, 200, undefined, rateCheck);
  } catch (error) {
    console.error(`[Vertical ${verticalSlug}] Analysis error:`, error);
    return partnerApiError('Analysis failed', 'INTERNAL_ERROR', 500);
  }
}
