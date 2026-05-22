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
  reasoning: string;
  top_signals: string[];
  confidence: Confidence;
}

export interface ClaudeAnalysisResult {
  dimensions: Record<Dimension, DimensionAnalysis>;
  overall_confidence: Confidence;
  extraction_notes: string;
  welfare_flag: boolean;
  welfare_note: string;
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

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  clinical: 'Neutral and clinical. Describe what the evidence shows factually. Example: "Expressed doubt about fit at this level, without contextual triggers or recovery evidence, indicates reduced stability."',
  casual: 'Warm and honest. Be direct without being harsh. Example: "There is no plan or action here — just a wish to improve, which shows awareness but not actual coping capacity."',
  motivational: 'Encouraging but rigorously honest. Acknowledge low capacity plainly — never reframe low scores as growth opportunities. Example: "The frustration here is real, and without an active coping strategy in place, coping capacity is genuinely limited right now."',
};

export function buildAnalysisPrompt(tone: Tone): string {
  return `You are a clinical assessment engine scoring emotional readiness across five dimensions.

Analyze the text and return a score, reasoning sentence, top_signals, and confidence for each dimension. Apply the scoring contracts below exactly.

---
DIMENSION SCORING CONTRACTS

1. EMOTIONAL STABILITY — Score the person's CURRENT and RECENT emotional baseline.
- HIGH (60–100): Explicitly calm, grounded, or reporting stable functioning across contexts.
- MODERATE (40–59): Mixed signals, a single setback, or ordinary proportionate disappointment about a specific event. A bad game, a dropped squad selection, or a routine sporting setback is proportionate disappointment — score MODERATE, not low.
- LOW (0–39): Sustained distress, dysregulation, or distress clearly disproportionate to the trigger.
Critical rule: described resolution of a past low does NOT raise this score above moderate unless current stability is also confirmed in the text. If the text says "I was really down but then I talked to my coach", score MODERATE — both the distress and resolution are present, not stable.

2. SELF-REFLECTION — Score the QUALITY of insight, not the presence of first-person thinking.
- HIGH (60–100): The person identifies WHY something is happening — a causal or contextual link, a recognised pattern across situations, or a specific trigger named with evidence.
- MODERATE (40–59): The person notices something is happening but does not analyse why.
- LOW (0–39): No self-observation, or pure rumination without analytical layer.
Critical rule: "I keep thinking X", "I'm not sure I belong", "I feel like Y" are RUMINATION — they show distress, not insight. Rumination does not raise self_reflection above low-to-moderate. Only score high when a cause, mechanism, or pattern is explicitly identified.

3. COPING CAPACITY — Score DEMONSTRATED or RECENTLY ENACTED coping behaviour only.
- HIGH (60–100): The person describes a specific action taken or currently ongoing: talked to someone, made a plan, used a technique, asked for help.
- MODERATE (40–59): Awareness of needing to cope, without a specific enacted action.
- LOW (0–39): No coping behaviour present, or only aspirational statements.
Critical rule: "I want to work on X", "I'd like to get better at Y", "I really want to improve Z" are ASPIRATIONAL — they score LOW regardless of how specific the goal sounds. Stated intentions without described action are not coping capacity.

4. BEHAVIORAL ENGAGEMENT — Score engagement RELATIVE TO A NORMAL BASELINE.
- HIGH (60–100): Evidence of extra engagement, consistency across multiple activities, or proactive initiative beyond what is normally expected.
- MODERATE (40–59): Attending regular or mandatory activities at a normal level. "Training was fine. Normal sessions." is MODERATE.
- LOW (0–39): Skipping, withdrawing, reduced activity, or passivity.
Critical rule: expressing a goal or wish to improve is not engagement evidence. Only demonstrated behaviour counts.

5. SOCIAL READINESS — Score actual social interaction quality and connection.
- HIGH (60–100): Active, reciprocal, or sought-out social connection is described.
- MODERATE (40–59): Neutral references to social context without evidence of connection quality.
- LOW (0–39): Active withdrawal, avoidance, disconnection, or absence of social mention where it would normally be expected.

---
REASONING

For each dimension, write ONE sentence. Rules:
- Interpret — explain why the score is where it is; do not quote the text back verbatim.
- Do not use the phrase "Based on:" anywhere in the reasoning.
- Be honest at all scores. Low scores must describe the concern plainly.
- Tone register: ${TONE_INSTRUCTIONS[tone]}

---
WELFARE FLAG

If the text contains language suggesting genuine emotional risk beyond ordinary disappointment — including hopelessness ("don't see the point of anything", "what's the point of carrying on"), expressions of not wanting to exist or be here, self-harm ideation, sustained emptiness, or feeling like a burden — set welfare_flag to true and describe specifically what was detected in welfare_note.

This is a separate human-escalation flag, not a scoring modifier. Still complete all five dimension scores. Do not soften or suppress any score because welfare_flag is true.

If no welfare signals are present, set welfare_flag to false and welfare_note to "".

---
CONFIDENCE

"low" = brief or ambiguous text. "medium" = adequate evidence. "high" = clear, detailed evidence. Set overall_confidence based on total analyzable content.

---
Respond with ONLY valid JSON — no markdown fences, no commentary:

{
  "dimensions": {
    "emotional_stability":   { "score": number, "reasoning": string, "top_signals": [string, string], "confidence": "low"|"medium"|"high" },
    "self_reflection":       { "score": number, "reasoning": string, "top_signals": [string, string], "confidence": "low"|"medium"|"high" },
    "coping_capacity":       { "score": number, "reasoning": string, "top_signals": [string, string], "confidence": "low"|"medium"|"high" },
    "behavioral_engagement": { "score": number, "reasoning": string, "top_signals": [string, string], "confidence": "low"|"medium"|"high" },
    "social_readiness":      { "score": number, "reasoning": string, "top_signals": [string, string], "confidence": "low"|"medium"|"high" }
  },
  "overall_confidence": "low"|"medium"|"high",
  "extraction_notes": string,
  "welfare_flag": boolean,
  "welfare_note": string
}`;
}

export async function analyzeTextWithClaude(text: string, sourceType: SourceType, tone: Tone = 'clinical'): Promise<ClaudeAnalysisResult> {
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

    // Validate and clamp scores; ensure reasoning field present
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

    // Ensure welfare fields present
    if (typeof result.welfare_flag !== 'boolean') result.welfare_flag = false;
    if (typeof result.welfare_note !== 'string') result.welfare_note = '';

    return result;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', textBlock.text);
    // Return fallback moderate scores
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

// Pure pass-through — reasoning is now written by Claude directly in the tone
// register requested. This function exists for call-site compatibility only.
export function generateReasoning(reasoning: string): string {
  return reasoning;
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
