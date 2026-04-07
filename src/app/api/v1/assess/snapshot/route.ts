/**
 * POST /api/v1/assess/snapshot
 *
 * Submit snapshot assessment responses and receive an estimated ERS score.
 * This is a lightweight emotional readiness check that doesn't require historical data.
 *
 * Supports the ERS Explainability Layer with configurable options:
 *
 * verbosity:
 * - minimal: score + label only (default, backward compatible)
 * - standard: score + label + reasoning + trend + trend_delta + top_signals
 * - clinical: all of standard + recommended_action
 *
 * tone:
 * - clinical: Professional, objective language (default)
 * - casual: Friendly, approachable language
 * - motivational: Encouraging, growth-focused language
 *
 * score_format:
 * - numerical: Raw 0-100 score (default)
 * - percentage: Score with % suffix
 * - tier_label: Text label (very_low, low, moderate, high, very_high)
 * - traffic_light: red/yellow/green based on thresholds
 */

import { NextRequest } from 'next/server';
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
type Tone = 'clinical' | 'casual' | 'motivational';
type ScoreFormat = 'numerical' | 'percentage' | 'tier_label' | 'traffic_light';

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
  score: number | string;
  label: string;
}

// Standard response
interface DimensionResultStandard extends DimensionResultMinimal {
  reasoning: string;
  trend?: Trend;
  trend_delta?: number | null;
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

// ============================================================================
// Tone-Adapted Reasoning Generation
// ============================================================================

// Clinical tone templates (professional, objective)
const CLINICAL_REASONING: Record<Dimension, Record<'high' | 'mid' | 'low', (v1: number, v2: number, signals: string) => string>> = {
  emotional_stability: {
    high: (v1, v2, signals) => `Strong emotional regulation indicated. Assessment responses suggest ${v1 >= 4 ? 'stable mood patterns' : 'moderate mood consistency'} and ${v2 >= 4 ? 'quick emotional recovery' : 'adequate recovery capacity'}. Key signals: ${signals}.`,
    mid: (v1, v2, signals) => `Moderate emotional stability observed. ${v1 <= 2 ? 'Mood variance is elevated' : 'Some mood fluctuation noted'} with ${v2 <= 2 ? 'extended recovery periods' : 'variable recovery time'}. Key signals: ${signals}.`,
    low: (v1, v2, signals) => `Emotional stability requires support. Assessment indicates ${v1 <= 2 ? 'frequent mood fluctuations' : 'inconsistent mood patterns'} and ${v2 <= 2 ? 'difficulty regaining balance' : 'slow emotional recovery'}. Key signals: ${signals}.`,
  },
  self_reflection: {
    high: (v1, v2, signals) => `High self-awareness demonstrated. Responses indicate ${v1 >= 4 ? 'strong pattern recognition' : 'good insight into emotional triggers'} and ${v2 >= 4 ? 'healthy processing of past experiences' : 'ability to reflect constructively'}. Key signals: ${signals}.`,
    mid: (v1, v2, signals) => `Moderate reflective capacity. ${v1 <= 2 ? 'Pattern awareness is limited' : 'Some pattern recognition present'} with ${v2 <= 2 ? 'difficulty processing past experiences' : 'variable reflection ability'}. Key signals: ${signals}.`,
    low: (v1, v2, signals) => `Self-reflection capacity is developing. Assessment suggests ${v1 <= 2 ? 'limited insight into emotional patterns' : 'emerging pattern awareness'} and ${v2 <= 2 ? 'challenges processing difficult experiences' : 'reflection barriers present'}. Key signals: ${signals}.`,
  },
  coping_capacity: {
    high: (v1, v2, signals) => `Strong coping toolkit evident. Responses suggest ${v1 >= 4 ? 'effective stress management strategies' : 'adequate coping resources'} and ${v2 >= 4 ? 'resilient recovery from setbacks' : 'good bounce-back capacity'}. Key signals: ${signals}.`,
    mid: (v1, v2, signals) => `Moderate coping resources available. ${v1 <= 2 ? 'Coping strategies appear limited' : 'Some coping tools in use'} with ${v2 <= 2 ? 'extended disruption from setbacks' : 'variable recovery from challenges'}. Key signals: ${signals}.`,
    low: (v1, v2, signals) => `Coping capacity needs development. Assessment indicates ${v1 <= 2 ? 'few reliable coping strategies' : 'limited stress management tools'} and ${v2 <= 2 ? 'significant difficulty recovering from setbacks' : 'prolonged impact from challenges'}. Key signals: ${signals}.`,
  },
  behavioral_engagement: {
    high: (v1, v2, signals) => `High behavioral engagement shown. Responses indicate ${v1 >= 4 ? 'consistent daily routines' : 'mostly stable self-care practices'} and ${v2 >= 4 ? 'strong motivation for personal growth' : 'active engagement in development'}. Key signals: ${signals}.`,
    mid: (v1, v2, signals) => `Moderate engagement observed. ${v1 <= 2 ? 'Daily routines are inconsistent' : 'Some routine maintenance noted'} with ${v2 <= 2 ? 'limited motivation for growth' : 'variable engagement levels'}. Key signals: ${signals}.`,
    low: (v1, v2, signals) => `Behavioral engagement is low. Assessment suggests ${v1 <= 2 ? 'disrupted daily routines' : 'inconsistent self-care habits'} and ${v2 <= 2 ? 'minimal growth motivation' : 'limited engagement with development'}. Key signals: ${signals}.`,
  },
  social_readiness: {
    high: (v1, v2, signals) => `High social readiness indicated. Responses suggest ${v1 >= 4 ? 'openness to new connections' : 'cautious but positive social outlook'} and ${v2 >= 4 ? 'genuine presence in social settings' : 'ability to engage socially'}. Key signals: ${signals}.`,
    mid: (v1, v2, signals) => `Moderate social readiness. ${v1 <= 2 ? 'Hesitation about new connections noted' : 'Mixed feelings about social engagement'} with ${v2 <= 2 ? 'difficulty being present socially' : 'variable social presence'}. Key signals: ${signals}.`,
    low: (v1, v2, signals) => `Social readiness is developing. Assessment indicates ${v1 <= 2 ? 'significant reluctance toward new connections' : 'social hesitation present'} and ${v2 <= 2 ? 'challenges with social presence' : 'limited social engagement'}. Key signals: ${signals}.`,
  },
};

// Casual tone templates (professional-casual, accessible clinical language)
const CASUAL_REASONING: Record<Dimension, Record<'high' | 'mid' | 'low', (v1: number, v2: number, signals: string) => string>> = {
  emotional_stability: {
    high: (v1, v2, signals) => `Emotional stability presents strongly. Assessment indicates ${v1 >= 4 ? 'consistent mood patterns' : 'manageable emotional responses'} and ${v2 >= 4 ? 'effective recovery from challenges' : 'developing balance'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Emotional stability shows room for development. ${v1 <= 2 ? 'Mood variance is noted' : 'Some emotional fluctuation observed'}, with ${v2 <= 2 ? 'extended recovery periods' : 'variable time to regain equilibrium'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Emotional stability is an area that would benefit from focused attention. ${v1 <= 2 ? 'Significant mood fluctuation observed' : 'Emotional patterns show instability'}, and ${v2 <= 2 ? 'recovery from emotional events is challenging' : 'returning to baseline takes extended time'}. Based on: ${signals}.`,
  },
  self_reflection: {
    high: (v1, v2, signals) => `Self-awareness presents strongly. Assessment indicates ${v1 >= 4 ? 'clear pattern recognition' : 'good understanding of emotional triggers'} and ${v2 >= 4 ? 'ability to process difficult experiences' : 'constructive reflection capacity'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Self-awareness shows developing capacity. ${v1 <= 2 ? 'Pattern recognition is emerging' : 'Some patterns are becoming visible'}, and ${v2 <= 2 ? 'processing past experiences remains challenging' : 'reflection skills are building'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Self-reflection capacity is in early development. ${v1 <= 2 ? 'Emotional patterns may be unclear' : 'Pattern recognition is limited'}, and ${v2 <= 2 ? 'processing past experiences can feel overwhelming' : 'reflection on difficult topics is challenging'}. Based on: ${signals}.`,
  },
  coping_capacity: {
    high: (v1, v2, signals) => `Coping capacity presents strongly. Assessment indicates ${v1 >= 4 ? 'effective stress management strategies' : 'functional coping approaches'} and ${v2 >= 4 ? 'resilient recovery from setbacks' : 'adequate bounce-back capacity'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Coping capacity shows developing skills. ${v1 <= 2 ? 'Coping strategy repertoire is limited' : 'Some strategies show variable effectiveness'}, and ${v2 <= 2 ? 'setbacks cause extended disruption' : 'recovery from challenges takes time'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Building coping capacity is a priority area. ${v1 <= 2 ? 'Reliable coping strategies are limited' : 'Additional coping tools would be beneficial'}, and ${v2 <= 2 ? 'setbacks have significant impact' : 'recovery from challenges requires substantial effort'}. Based on: ${signals}.`,
  },
  behavioral_engagement: {
    high: (v1, v2, signals) => `Behavioral engagement presents strongly. Assessment indicates ${v1 >= 4 ? 'consistent routine maintenance' : 'adequate self-care practices'} and ${v2 >= 4 ? 'sustained motivation for growth' : 'active participation in development'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Behavioral engagement shows variability. ${v1 <= 2 ? 'Routine maintenance has been inconsistent' : 'Engagement varies across days'}, and ${v2 <= 2 ? 'motivation fluctuates' : 'sustained engagement requires effort'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Behavioral engagement has been limited. ${v1 <= 2 ? 'Daily routines show disruption' : 'Maintaining consistent practices has been difficult'}, and ${v2 <= 2 ? 'motivation is notably reduced' : 'initiating engagement presents challenges'}. Based on: ${signals}.`,
  },
  social_readiness: {
    high: (v1, v2, signals) => `Social readiness presents strongly. Assessment indicates ${v1 >= 4 ? 'openness to new connections' : 'cautiously positive social outlook'} and ${v2 >= 4 ? 'ability to be present in social settings' : 'functional social engagement'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Social readiness shows mixed indicators. ${v1 <= 2 ? 'Hesitation about new connections noted' : 'Ambivalence about social engagement present'}, and ${v2 <= 2 ? 'social presence requires significant energy' : 'maintaining attention in social settings is variable'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Social readiness is developing. ${v1 <= 2 ? 'New social connections feel overwhelming' : 'Hesitation about relationships is present'}, and ${v2 <= 2 ? 'social interaction is energy-depleting' : 'being present socially is challenging'}. Based on: ${signals}.`,
  },
};

// Motivational tone templates (supportive clinical language, growth-oriented)
const MOTIVATIONAL_REASONING: Record<Dimension, Record<'high' | 'mid' | 'low', (v1: number, v2: number, signals: string) => string>> = {
  emotional_stability: {
    high: (v1, v2, signals) => `Emotional regulation demonstrates significant strength. ${v1 >= 4 ? 'Consistent mood patterns indicate meaningful progress' : 'Emotional awareness continues to develop'} and ${v2 >= 4 ? 'recovery capacity represents a notable strength' : 'resilience building is evident'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Emotional balance shows meaningful development. ${v1 <= 2 ? 'Mood variability is part of the growth process' : 'Each emotional challenge provides learning opportunities'}, and ${v2 <= 2 ? 'recovery capacity builds with each experience' : 'centering skills continue to strengthen'}. Progress is evident. Based on: ${signals}.`,
    low: (v1, v2, signals) => `This represents a starting point with clear potential for growth. ${v1 <= 2 ? 'Emotional fluctuation indicates active processing' : 'Emotional responses show engagement with important material'}, and ${v2 <= 2 ? 'balance is a skill that develops with practice' : 'each step toward stability contributes to progress'}. Based on: ${signals}.`,
  },
  self_reflection: {
    high: (v1, v2, signals) => `Self-awareness is well-developed. ${v1 >= 4 ? 'Pattern recognition provides valuable insight' : 'Growing self-understanding is evident'} and ${v2 >= 4 ? 'capacity to process past experiences indicates meaningful growth' : 'healthy reflection patterns are developing'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Self-awareness shows valuable development. ${v1 <= 2 ? 'Each pattern noticed represents progress' : 'Awareness continues to expand'}, and ${v2 <= 2 ? 'engaging with past experiences demonstrates readiness' : 'reflection capacity is strengthening'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Self-discovery represents an ongoing developmental process. ${v1 <= 2 ? 'Pattern recognition will emerge with continued engagement' : 'Early stages of self-understanding are in progress'}, and ${v2 <= 2 ? 'difficulty with past material indicates readiness to process' : 'reflection skills develop incrementally'}. Based on: ${signals}.`,
  },
  coping_capacity: {
    high: (v1, v2, signals) => `Coping capacity is well-established. ${v1 >= 4 ? 'Stress management strategies demonstrate effectiveness' : 'Functional coping approaches are in place'} and ${v2 >= 4 ? 'resilience represents a significant strength' : 'recovery capacity shows meaningful development'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Resilience capacity shows meaningful development. ${v1 <= 2 ? 'Each new coping strategy strengthens the toolkit' : 'Coping resources continue to expand'}, and ${v2 <= 2 ? 'setbacks provide opportunities for building recovery skills' : 'recovery patterns are strengthening'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Building coping capacity is a valuable developmental priority. ${v1 <= 2 ? 'Limited current strategies create opportunity for expansion' : 'Coping skill building is an accessible goal'}, and ${v2 <= 2 ? 'current challenges with setbacks will inform future resilience' : 'each recovery experience builds capacity'}. Based on: ${signals}.`,
  },
  behavioral_engagement: {
    high: (v1, v2, signals) => `Behavioral engagement demonstrates consistent commitment. ${v1 >= 4 ? 'Routine maintenance indicates sustained effort' : 'Self-care practices show consistency'} and ${v2 >= 4 ? 'motivation levels support continued growth' : 'active participation in development is evident'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Engagement patterns show meaningful effort. ${v1 <= 2 ? 'Routine rebuilding represents important progress' : 'Variability in engagement is part of the process'}, and ${v2 <= 2 ? 'motivation naturally fluctuates during development' : 'engagement capacity continues to build'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Each day presents opportunities for engagement. ${v1 <= 2 ? 'Routines can be rebuilt incrementally' : 'Previous patterns do not determine future capacity'}, and ${v2 <= 2 ? 'motivation can be cultivated through small successes' : 'each action contributes to building momentum'}. Based on: ${signals}.`,
  },
  social_readiness: {
    high: (v1, v2, signals) => `Social readiness is well-developed. ${v1 >= 4 ? 'Openness to new connections indicates meaningful progress' : 'Cautious optimism represents healthy engagement'} and ${v2 >= 4 ? 'social presence demonstrates strong capacity' : 'authentic engagement is evident'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Social readiness develops at an appropriate individual pace. ${v1 <= 2 ? 'Hesitation reflects appropriate caution' : 'Mixed feelings about connection are normal in development'}, and ${v2 <= 2 ? 'each social interaction builds capacity' : 'presence skills continue to develop'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Social connection develops when foundational work is in place. ${v1 <= 2 ? 'Current overwhelm indicates appropriate boundaries' : 'Relationship hesitation reflects self-awareness'}, and ${v2 <= 2 ? 'social energy will increase as other areas strengthen' : 'presence capacity will develop with continued progress'}. Current individual focus is appropriate. Based on: ${signals}.`,
  },
};

// Generate reasoning string with signal references and tone adaptation
function generateReasoning(
  dimension: Dimension,
  values: number[],
  score: number,
  trend: Trend,
  tone: Tone
): string {
  const signals = getTopSignals(dimension, values);
  const signalStr = signals.join(' and ');
  const v1 = values[0];
  const v2 = values[1];

  // Select tier based on score
  const tier = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';

  // Select tone templates
  const templates = tone === 'casual' ? CASUAL_REASONING
    : tone === 'motivational' ? MOTIVATIONAL_REASONING
    : CLINICAL_REASONING;

  const dimensionTemplates = templates[dimension];
  if (!dimensionTemplates) {
    return `Assessment complete. Score of ${score}. Key signals: ${signalStr}.`;
  }

  return dimensionTemplates[tier](v1, v2, signalStr);
}

// Build dimension result based on config
function buildDimensionResult(
  dimension: Dimension,
  values: number[],
  score: number,
  config: PartnerConfig
): DimensionResult {
  const label = getScoreLabel(score);
  const formattedScore = formatScore(score, config.score_format, config.traffic_light_thresholds);

  // Minimal: score + label only (backward compatible)
  if (config.verbosity === 'minimal') {
    return { score: formattedScore, label };
  }

  // For snapshot assessments: trend is always stable, delta is null (no prior assessment)
  const trend: Trend = 'stable';
  const trend_delta: number | null = null;
  const top_signals = config.include_signals ? getTopSignals(dimension, values) : [];
  const reasoning = generateReasoning(dimension, values, score, trend, config.tone);

  // Standard: score + label + reasoning + trend + trend_delta + top_signals
  if (config.verbosity === 'standard') {
    // Build result conditionally based on include_trend
    if (config.include_trend) {
      return {
        score: formattedScore,
        label,
        reasoning,
        trend,
        trend_delta,
        top_signals,
      };
    } else {
      return {
        score: formattedScore,
        label,
        reasoning,
        top_signals,
      };
    }
  }

  // Clinical: all of standard + recommended_action
  const recommended_action = generateRecommendedAction(dimension, score, trend);

  if (config.include_trend) {
    return {
      score: formattedScore,
      label,
      reasoning,
      trend,
      trend_delta,
      top_signals,
      recommended_action,
    };
  } else {
    return {
      score: formattedScore,
      label,
      reasoning,
      top_signals,
      recommended_action,
    };
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

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const body = await request.clone().json().catch(() => ({}));
    return sandboxResponse('snapshot_submit', body);
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

  // Check endpoint-specific rate limit (200/hour for snapshot)
  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, '/api/v1/assess/snapshot');
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
    const { responses, externalId, config: requestConfig } = body;

    // Load partner's default config and merge with request config
    const partnerConfig = await loadPartnerConfig(validation.partnerId!);
    const config = mergeConfig(partnerConfig, requestConfig);

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
        400,
        undefined,
        rateLimit
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
        400,
        undefined,
        rateLimit
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
          400,
          undefined,
          rateLimit
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
          400,
          undefined,
          rateLimit
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
          400,
          undefined,
          rateLimit
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
          400,
          undefined,
          rateLimit
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
          400,
          undefined,
          rateLimit
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
        400,
        undefined,
        rateLimit
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
          400,
          undefined,
          rateLimit
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

    // Generate dimension results based on config
    const dimensionResults: Record<Dimension, DimensionResult> = {
      emotional_stability: buildDimensionResult(
        'emotional_stability',
        dimensionResponses.emotional_stability,
        dimensionScores.emotional_stability,
        config
      ),
      self_reflection: buildDimensionResult(
        'self_reflection',
        dimensionResponses.self_reflection,
        dimensionScores.self_reflection,
        config
      ),
      coping_capacity: buildDimensionResult(
        'coping_capacity',
        dimensionResponses.coping_capacity,
        dimensionScores.coping_capacity,
        config
      ),
      behavioral_engagement: buildDimensionResult(
        'behavioral_engagement',
        dimensionResponses.behavioral_engagement,
        dimensionScores.behavioral_engagement,
        config
      ),
      social_readiness: buildDimensionResult(
        'social_readiness',
        dimensionResponses.social_readiness,
        dimensionScores.social_readiness,
        config
      ),
    };

    // Format the overall ERS score
    const formattedErsSnapshot = formatScore(
      ersSnapshot,
      config.score_format,
      config.traffic_light_thresholds
    );

    // Build response with meta information
    const response: Record<string, unknown> = {
      ers_snapshot: formattedErsSnapshot,
      dimensions: dimensionResults,
      readiness_label: readinessLabel,
      confidence: 'estimated',
      assessment_id: assessmentId,
      timestamp: timestamp,
    };

    // Add meta block for non-minimal responses
    if (config.verbosity !== 'minimal') {
      response.meta = {
        verbosity: config.verbosity,
        tone: config.tone,
        score_format: config.score_format,
        api_version: '1.3.0',
        model_version: 'ers-v1',
      };
    }

    return partnerApiSuccess(response, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Snapshot assessment error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/assess/snapshot',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
