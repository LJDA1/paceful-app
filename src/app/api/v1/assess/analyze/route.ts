/**
 * POST /api/v1/assess/analyze
 *
 * Analyze unstructured text and return an ERS score.
 * Uses Claude AI to extract emotional readiness signals from text.
 *
 * Supports the same ERS Explainability Layer as /assess/snapshot:
 * - verbosity: minimal, standard, clinical
 * - tone: clinical, casual, motivational
 * - score_format: numerical, percentage, tier_label, traffic_light
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  validatePartnerKey,
  checkEndpointRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
  getSupabaseAdmin,
} from '@/lib/partner-auth';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';
import { buildAnalysisPrompt } from '@/lib/text-analysis';

// Types
type Dimension = 'emotional_stability' | 'self_reflection' | 'coping_capacity' | 'behavioral_engagement' | 'social_readiness';
type Verbosity = 'minimal' | 'standard' | 'clinical';
type Tone = 'clinical' | 'casual' | 'motivational';
type ScoreFormat = 'numerical' | 'percentage' | 'tier_label' | 'traffic_light';
type SourceType = 'journal' | 'session_notes' | 'chat_transcript' | 'free_text';
type Confidence = 'low' | 'medium' | 'high';

interface TrafficLightThresholds {
  red_max: number;
  yellow_max: number;
}

interface PartnerConfig {
  verbosity: Verbosity;
  tone: Tone;
  score_format: ScoreFormat;
  traffic_light_thresholds: TrafficLightThresholds;
  include_signals: boolean;
  include_trend: boolean;
}

const DEFAULT_CONFIG: PartnerConfig = {
  verbosity: 'minimal',
  tone: 'clinical',
  score_format: 'numerical',
  traffic_light_thresholds: { red_max: 33, yellow_max: 66 },
  include_signals: true,
  include_trend: true,
};

// ERS dimension weights (matching ers-calculator.ts)
const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  emotional_stability: 0.25,
  self_reflection: 0.15,
  coping_capacity: 0.20,
  behavioral_engagement: 0.15,
  social_readiness: 0.25,
};

const VALID_DIMENSIONS: Dimension[] = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
];

// Claude analysis result structure
interface ClaudeAnalysisResult {
  dimensions: {
    emotional_stability: { score: number; reasoning: string; top_signals: string[]; confidence: Confidence };
    self_reflection: { score: number; reasoning: string; top_signals: string[]; confidence: Confidence };
    coping_capacity: { score: number; reasoning: string; top_signals: string[]; confidence: Confidence };
    behavioral_engagement: { score: number; reasoning: string; top_signals: string[]; confidence: Confidence };
    social_readiness: { score: number; reasoning: string; top_signals: string[]; confidence: Confidence };
  };
  overall_confidence: Confidence;
  extraction_notes: string;
  welfare_flag: boolean;
  welfare_note: string;
}

// ============================================================================
// Partner Config Loading
// ============================================================================

async function loadPartnerConfig(partnerId: string): Promise<PartnerConfig> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('partner_configs')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    if (error || !data) {
      return DEFAULT_CONFIG;
    }

    return {
      verbosity: data.verbosity || DEFAULT_CONFIG.verbosity,
      tone: data.tone || DEFAULT_CONFIG.tone,
      score_format: data.score_format || DEFAULT_CONFIG.score_format,
      traffic_light_thresholds: data.traffic_light_thresholds || DEFAULT_CONFIG.traffic_light_thresholds,
      include_signals: data.include_signals ?? DEFAULT_CONFIG.include_signals,
      include_trend: data.include_trend ?? DEFAULT_CONFIG.include_trend,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function mergeConfig(partnerConfig: PartnerConfig, requestConfig: Record<string, unknown> | undefined): PartnerConfig {
  if (!requestConfig) return partnerConfig;

  return {
    verbosity: (['minimal', 'standard', 'clinical'].includes(requestConfig.verbosity as string)
      ? requestConfig.verbosity as Verbosity
      : partnerConfig.verbosity),
    tone: (['clinical', 'casual', 'motivational'].includes(requestConfig.tone as string)
      ? requestConfig.tone as Tone
      : partnerConfig.tone),
    score_format: (['numerical', 'percentage', 'tier_label', 'traffic_light'].includes(requestConfig.score_format as string)
      ? requestConfig.score_format as ScoreFormat
      : partnerConfig.score_format),
    traffic_light_thresholds: (requestConfig.traffic_light_thresholds && typeof requestConfig.traffic_light_thresholds === 'object')
      ? requestConfig.traffic_light_thresholds as TrafficLightThresholds
      : partnerConfig.traffic_light_thresholds,
    include_signals: typeof requestConfig.include_signals === 'boolean'
      ? requestConfig.include_signals
      : partnerConfig.include_signals,
    include_trend: typeof requestConfig.include_trend === 'boolean'
      ? requestConfig.include_trend
      : partnerConfig.include_trend,
  };
}

// ============================================================================
// Score Formatting
// ============================================================================

function getScoreLabel(score: number): string {
  if (score < 25) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}

function getTrafficLight(score: number, thresholds: TrafficLightThresholds): 'red' | 'yellow' | 'green' {
  if (score <= thresholds.red_max) return 'red';
  if (score <= thresholds.yellow_max) return 'yellow';
  return 'green';
}

function formatScore(
  score: number,
  format: ScoreFormat,
  thresholds: TrafficLightThresholds
): number | string {
  switch (format) {
    case 'numerical':
      return score;
    case 'percentage':
      return `${score}%`;
    case 'tier_label':
      return getScoreLabel(score);
    case 'traffic_light':
      return getTrafficLight(score, thresholds);
    default:
      return score;
  }
}

function getReadinessLabel(score: number): string {
  if (score < 40) return 'Not Ready';
  if (score < 60) return 'Healing';
  if (score < 75) return 'Rebuilding';
  return 'Ready';
}

// ============================================================================
// Claude Analysis
// ============================================================================

async function analyzeTextWithClaude(text: string, sourceType: SourceType, tone: Tone = 'clinical'): Promise<ClaudeAnalysisResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const contextHint = sourceType === 'journal' ? 'This is a personal journal entry.'
    : sourceType === 'session_notes' ? 'These are clinical session notes.'
    : sourceType === 'chat_transcript' ? 'This is a chat/conversation transcript.'
    : 'This is free-form text for analysis.';

  // Truncate text to reasonable length (8k chars ~ 2k tokens)
  const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...[truncated]' : text;

  const model = process.env.ERS_MODEL ?? 'claude-sonnet-4-20250514';
  const message = await anthropic.messages.create({
    model,
    max_tokens: 1200,
    system: buildAnalysisPrompt(tone),
    messages: [
      {
        role: 'user',
        content: `${contextHint}\n\nText to analyze:\n\n${truncatedText}`,
      },
    ],
  });

  // Extract text from response
  const textBlock = message.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON from response
  try {
    const cleanedText = textBlock.text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const result = JSON.parse(cleanedText) as ClaudeAnalysisResult;

    // Validate and clamp scores; ensure reasoning and welfare fields present
    for (const dim of VALID_DIMENSIONS) {
      if (result.dimensions[dim]) {
        result.dimensions[dim].score = Math.max(0, Math.min(100, Math.round(result.dimensions[dim].score)));
        if (!['low', 'medium', 'high'].includes(result.dimensions[dim].confidence)) {
          result.dimensions[dim].confidence = 'medium';
        }
        if (typeof result.dimensions[dim].reasoning !== 'string') {
          result.dimensions[dim].reasoning = '';
        }
      }
    }
    if (typeof result.welfare_flag !== 'boolean') result.welfare_flag = false;
    if (typeof result.welfare_note !== 'string') result.welfare_note = '';

    return result;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', textBlock.text);
    return {
      dimensions: {
        emotional_stability: { score: 50, reasoning: '', top_signals: ['insufficient_data'], confidence: 'low' },
        self_reflection: { score: 50, reasoning: '', top_signals: ['insufficient_data'], confidence: 'low' },
        coping_capacity: { score: 50, reasoning: '', top_signals: ['insufficient_data'], confidence: 'low' },
        behavioral_engagement: { score: 50, reasoning: '', top_signals: ['insufficient_data'], confidence: 'low' },
        social_readiness: { score: 50, reasoning: '', top_signals: ['insufficient_data'], confidence: 'low' },
      },
      overall_confidence: 'low',
      extraction_notes: 'Failed to parse analysis response - using fallback scores',
      welfare_flag: false,
      welfare_note: '',
    };
  }
}

// Pure pass-through — reasoning is written by Claude in the partner's tone register.
function generateReasoning(reasoning: string): string {
  return reasoning;
}

function generateRecommendedAction(dimension: Dimension, score: number): string {
  const isLow = score < 40;
  const isMid = score >= 40 && score < 70;

  const actions: Record<Dimension, { low: string; mid: string; high: string }> = {
    emotional_stability: {
      low: 'Consider exploring emotional regulation techniques and identifying stress triggers.',
      mid: 'Continue building emotional awareness. Mindfulness practices may help stabilize mood patterns.',
      high: 'Emotional stability is strong. Maintain current practices and consider supporting others.',
    },
    self_reflection: {
      low: 'Introduce structured journaling or guided reflection exercises to build self-awareness.',
      mid: 'Deepen reflection practice with more complex prompts exploring emotional patterns.',
      high: 'Self-reflection is well-developed. Consider exploring more nuanced emotional territories.',
    },
    coping_capacity: {
      low: 'Priority: build a basic coping toolkit with breathing exercises and grounding techniques.',
      mid: 'Expand coping repertoire with new strategies for different stress types.',
      high: 'Strong coping skills evident. Consider stress-testing with more challenging scenarios.',
    },
    behavioral_engagement: {
      low: 'Focus on establishing small, consistent daily routines to rebuild engagement.',
      mid: 'Build on existing routines with habit stacking or accountability structures.',
      high: 'Strong engagement patterns. Consider expanding to new growth areas.',
    },
    social_readiness: {
      low: 'Individual healing should progress before social re-engagement. Low-pressure connections first.',
      mid: 'Ready for gradual social exposure. Consider peer support or small group activities.',
      high: 'Social readiness is strong. May be ready for deeper connections or group activities.',
    },
  };

  return isLow ? actions[dimension].low : isMid ? actions[dimension].mid : actions[dimension].high;
}


// ============================================================================
// Main Handler
// ============================================================================

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const body = await request.clone().json().catch(() => ({}));
    return sandboxResponse('text_analyze', body);
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

  // Parallelize rate-limit check and config load — both need partnerId but not each other
  const [rateLimit, partnerConfig] = await Promise.all([
    checkEndpointRateLimit(validation.partnerId!, '/api/v1/assess/analyze'),
    loadPartnerConfig(validation.partnerId!),
  ]);

  if (!rateLimit.allowed) {
    return partnerApiError(
      `Rate limit exceeded. Limit: ${rateLimit.limit}/hour. Retry after ${rateLimit.retryAfter} seconds.`,
      'RATE_LIMITED',
      429,
      undefined,
      rateLimit
    );
  }

  try {
    const body = await request.json();
    const { user_id, text, source_type, config: requestConfig } = body;

    // Validate required fields
    if (!user_id || typeof user_id !== 'string') {
      logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze', 'POST', 400, Date.now() - startTime).catch(() => {});
      return partnerApiError('user_id is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (!text || typeof text !== 'string') {
      logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze', 'POST', 400, Date.now() - startTime).catch(() => {});
      return partnerApiError('text is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (text.length < 20) {
      logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze', 'POST', 400, Date.now() - startTime).catch(() => {});
      return partnerApiError('text must be at least 20 characters', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const validSourceTypes: SourceType[] = ['journal', 'session_notes', 'chat_transcript', 'free_text'];
    const sourceType: SourceType = validSourceTypes.includes(source_type) ? source_type : 'free_text';

    const config = mergeConfig(partnerConfig, requestConfig);

    // Analyze text with Claude (pass partner tone so reasoning is written in the right register)
    const analysis = await analyzeTextWithClaude(text, sourceType, config.tone);

    // Calculate weighted ERS score
    let weightedSum = 0;
    for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
      const dimScore = analysis.dimensions[dim as Dimension]?.score ?? 50;
      weightedSum += dimScore * weight;
    }
    const ersScore = Math.round(weightedSum);
    const readinessLabel = getReadinessLabel(ersScore);

    // Generate assessment ID
    const assessmentId = `anlz_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    // Log API usage — fire and forget; must not block or crash the response
    logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze', 'POST', 200, Date.now() - startTime).catch(() => {});

    // Build dimension results based on config
    const dimensionResults: Record<Dimension, Record<string, unknown>> = {} as Record<Dimension, Record<string, unknown>>;

    for (const dim of VALID_DIMENSIONS) {
      const dimData = analysis.dimensions[dim];
      const formattedScore = formatScore(dimData.score, config.score_format, config.traffic_light_thresholds);
      const label = getScoreLabel(dimData.score);

      if (config.verbosity === 'minimal') {
        dimensionResults[dim] = {
          score: formattedScore,
          label,
          confidence: dimData.confidence,
        };
      } else {
        const result: Record<string, unknown> = {
          score: formattedScore,
          label,
          confidence: dimData.confidence,
          reasoning: generateReasoning(dimData.reasoning),
          top_signals: config.include_signals ? dimData.top_signals : undefined,
        };

        if (config.verbosity === 'clinical') {
          result.recommended_action = generateRecommendedAction(dim, dimData.score);
        }

        dimensionResults[dim] = result;
      }
    }

    // Format overall score
    const formattedErsScore = formatScore(ersScore, config.score_format, config.traffic_light_thresholds);

    // Build response (same shape as snapshot + additional fields)
    const response: Record<string, unknown> = {
      ers_snapshot: formattedErsScore,
      dimensions: dimensionResults,
      readiness_label: readinessLabel,
      confidence: analysis.overall_confidence,
      assessment_id: assessmentId,
      timestamp,
      // Additional fields for text analysis
      source_type: sourceType,
      text_length: text.length,
      extraction_confidence: analysis.overall_confidence,
      // Welfare flag — always present; true signals human escalation is needed
      welfare_flag: analysis.welfare_flag,
      welfare_note: analysis.welfare_note,
    };

    // Add meta block for non-minimal responses
    if (config.verbosity !== 'minimal') {
      response.meta = {
        verbosity: config.verbosity,
        tone: config.tone,
        score_format: config.score_format,
        api_version: '1.3.0',
        model_version: 'ers-text-v1',
        extraction_notes: analysis.extraction_notes,
      };
    }

    return partnerApiSuccess(response, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Text analysis error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze', 'POST', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
