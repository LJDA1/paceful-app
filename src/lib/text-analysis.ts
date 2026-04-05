/**
 * Shared text analysis utilities for ERS extraction
 * Used by both /assess/analyze and /assess/analyze/batch endpoints
 */

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

// Types
export type Dimension = 'emotional_stability' | 'self_reflection' | 'coping_capacity' | 'behavioral_engagement' | 'social_readiness';
export type Verbosity = 'minimal' | 'standard' | 'clinical';
export type Tone = 'clinical' | 'casual' | 'motivational';
export type ScoreFormat = 'numerical' | 'percentage' | 'tier_label' | 'traffic_light';
export type SourceType = 'journal' | 'session_notes' | 'chat_transcript' | 'free_text';
export type Confidence = 'low' | 'medium' | 'high';
export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface TrafficLightThresholds {
  red_max: number;
  yellow_max: number;
}

export interface PartnerConfig {
  verbosity: Verbosity;
  tone: Tone;
  score_format: ScoreFormat;
  traffic_light_thresholds: TrafficLightThresholds;
  include_signals: boolean;
  include_trend: boolean;
}

export const DEFAULT_CONFIG: PartnerConfig = {
  verbosity: 'minimal',
  tone: 'clinical',
  score_format: 'numerical',
  traffic_light_thresholds: { red_max: 33, yellow_max: 66 },
  include_signals: true,
  include_trend: true,
};

// ERS dimension weights (matching ers-calculator.ts)
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  emotional_stability: 0.25,
  self_reflection: 0.15,
  coping_capacity: 0.20,
  behavioral_engagement: 0.15,
  social_readiness: 0.25,
};

export const VALID_DIMENSIONS: Dimension[] = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
];

export const VALID_SOURCE_TYPES: SourceType[] = ['journal', 'session_notes', 'chat_transcript', 'free_text'];

// Claude analysis result structure
export interface DimensionAnalysis {
  score: number;
  top_signals: string[];
  confidence: Confidence;
}

export interface ClaudeAnalysisResult {
  dimensions: Record<Dimension, DimensionAnalysis>;
  overall_confidence: Confidence;
  extraction_notes: string;
}

// ============================================================================
// Score Formatting
// ============================================================================

export function getScoreLabel(score: number): string {
  if (score < 25) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}

export function getTrafficLight(score: number, thresholds: TrafficLightThresholds): 'red' | 'yellow' | 'green' {
  if (score <= thresholds.red_max) return 'red';
  if (score <= thresholds.yellow_max) return 'yellow';
  return 'green';
}

export function formatScore(
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

export function getReadinessLabel(score: number): string {
  if (score < 40) return 'Not Ready';
  if (score < 60) return 'Healing';
  if (score < 75) return 'Rebuilding';
  return 'Ready';
}

// ============================================================================
// Claude Analysis
// ============================================================================

const ANALYSIS_SYSTEM_PROMPT = `You are an expert clinical psychologist analyzing text for emotional readiness signals.

Analyze the provided text and extract signals for each of these 5 ERS (Emotional Readiness Score) dimensions:

1. emotional_stability: Look for mood variance indicators, emotional regulation patterns, reaction proportionality, recovery from emotional events
2. self_reflection: Look for self-awareness indicators, pattern recognition, insight depth, ability to examine one's own thoughts/feelings
3. coping_capacity: Look for healthy coping mentions, resource awareness, adaptive strategies, problem-solving approaches
4. behavioral_engagement: Look for activity levels, routine consistency, goal-directed behavior, follow-through on intentions
5. social_readiness: Look for social mention frequency, connection quality indicators, openness to relationships, trust signals

For each dimension, provide:
- score: 0-100 (based on evidence in the text)
- top_signals: Array of 2-3 specific phrases or indicators from the text that support your score
- confidence: "low" (minimal text evidence), "medium" (some evidence), or "high" (strong evidence)

Also provide an overall_confidence based on the total amount of analyzable content.

IMPORTANT: Be conservative with scores when evidence is limited. Default toward moderate scores (40-60) unless clear positive or negative signals exist.

Respond with ONLY a valid JSON object in this exact format:
{
  "dimensions": {
    "emotional_stability": { "score": number, "top_signals": string[], "confidence": "low"|"medium"|"high" },
    "self_reflection": { "score": number, "top_signals": string[], "confidence": "low"|"medium"|"high" },
    "coping_capacity": { "score": number, "top_signals": string[], "confidence": "low"|"medium"|"high" },
    "behavioral_engagement": { "score": number, "top_signals": string[], "confidence": "low"|"medium"|"high" },
    "social_readiness": { "score": number, "top_signals": string[], "confidence": "low"|"medium"|"high" }
  },
  "overall_confidence": "low"|"medium"|"high",
  "extraction_notes": "Brief note about the analysis quality and any limitations"
}`;

export async function analyzeTextWithClaude(text: string, sourceType: SourceType): Promise<ClaudeAnalysisResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const contextHint = sourceType === 'journal' ? 'This is a personal journal entry.'
    : sourceType === 'session_notes' ? 'These are clinical session notes.'
    : sourceType === 'chat_transcript' ? 'This is a chat/conversation transcript.'
    : 'This is free-form text for analysis.';

  // Truncate text to reasonable length (8k chars ~ 2k tokens)
  const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...[truncated]' : text;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: ANALYSIS_SYSTEM_PROMPT,
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

    // Validate and clamp scores
    for (const dim of VALID_DIMENSIONS) {
      if (result.dimensions[dim]) {
        result.dimensions[dim].score = Math.max(0, Math.min(100, Math.round(result.dimensions[dim].score)));
        if (!['low', 'medium', 'high'].includes(result.dimensions[dim].confidence)) {
          result.dimensions[dim].confidence = 'medium';
        }
      }
    }

    return result;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', textBlock.text);
    // Return fallback moderate scores
    return {
      dimensions: {
        emotional_stability: { score: 50, top_signals: ['insufficient_data'], confidence: 'low' },
        self_reflection: { score: 50, top_signals: ['insufficient_data'], confidence: 'low' },
        coping_capacity: { score: 50, top_signals: ['insufficient_data'], confidence: 'low' },
        behavioral_engagement: { score: 50, top_signals: ['insufficient_data'], confidence: 'low' },
        social_readiness: { score: 50, top_signals: ['insufficient_data'], confidence: 'low' },
      },
      overall_confidence: 'low',
      extraction_notes: 'Failed to parse analysis response - using fallback scores',
    };
  }
}

// ============================================================================
// ERS Calculation
// ============================================================================

export function calculateErsScore(dimensions: Record<Dimension, { score: number }>): number {
  let weightedSum = 0;
  for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    const dimScore = dimensions[dim as Dimension]?.score ?? 50;
    weightedSum += dimScore * weight;
  }
  return Math.round(weightedSum);
}

// ============================================================================
// Reasoning Generation
// ============================================================================

export function generateReasoning(
  dimension: Dimension,
  score: number,
  signals: string[],
  confidence: Confidence,
  tone: Tone
): string {
  const signalStr = signals.slice(0, 2).join(' and ') || 'text analysis';
  const tier = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
  const confNote = confidence === 'low' ? ' (limited text evidence)' : confidence === 'high' ? ' (strong text evidence)' : '';

  const dimensionLabels: Record<Dimension, string> = {
    emotional_stability: 'Emotional stability',
    self_reflection: 'Self-reflection capacity',
    coping_capacity: 'Coping capacity',
    behavioral_engagement: 'Behavioral engagement',
    social_readiness: 'Social readiness',
  };

  const label = dimensionLabels[dimension];

  if (tone === 'casual') {
    if (tier === 'high') return `${label} looks solid! Based on: ${signalStr}${confNote}.`;
    if (tier === 'mid') return `${label} is developing. Based on: ${signalStr}${confNote}.`;
    return `${label} could use some attention. Based on: ${signalStr}${confNote}.`;
  }

  if (tone === 'motivational') {
    if (tier === 'high') return `${label} is a real strength here! Based on: ${signalStr}${confNote}.`;
    if (tier === 'mid') return `${label} is building nicely - keep going! Based on: ${signalStr}${confNote}.`;
    return `${label} is an opportunity for growth! Based on: ${signalStr}${confNote}.`;
  }

  // Clinical (default)
  if (tier === 'high') return `${label} indicators are strong. Key signals: ${signalStr}${confNote}.`;
  if (tier === 'mid') return `${label} indicators are moderate. Key signals: ${signalStr}${confNote}.`;
  return `${label} indicators suggest need for support. Key signals: ${signalStr}${confNote}.`;
}

export function generateRecommendedAction(dimension: Dimension, score: number): string {
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
// Utilities
// ============================================================================

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function mergeConfig(partnerConfig: PartnerConfig, requestConfig: Record<string, unknown> | undefined): PartnerConfig {
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
