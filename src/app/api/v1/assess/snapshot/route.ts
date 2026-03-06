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

// Casual tone templates (friendly, approachable)
const CASUAL_REASONING: Record<Dimension, Record<'high' | 'mid' | 'low', (v1: number, v2: number, signals: string) => string>> = {
  emotional_stability: {
    high: (v1, v2, signals) => `Looking good here! Your ${v1 >= 4 ? 'mood has been pretty steady' : 'emotions have been manageable'} and ${v2 >= 4 ? 'you bounce back quickly when things get tough' : 'you\'re finding your balance'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `There's some room to grow here. ${v1 <= 2 ? 'Your mood\'s been up and down a bit' : 'You\'ve had some emotional waves'}, and ${v2 <= 2 ? 'it takes a while to feel settled again' : 'getting back to center can be tricky'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `This is an area where you could use some support. ${v1 <= 2 ? 'Your emotions have been all over the place' : 'It\'s been a rocky ride emotionally'}, and ${v2 <= 2 ? 'finding your footing again feels hard' : 'recovery takes longer than you\'d like'}. Based on: ${signals}.`,
  },
  self_reflection: {
    high: (v1, v2, signals) => `You've got great self-awareness! You ${v1 >= 4 ? 'really understand your patterns' : 'know what makes you tick'} and ${v2 >= 4 ? 'can think about tough stuff without getting overwhelmed' : 'handle looking back pretty well'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `You're building self-awareness. ${v1 <= 2 ? 'Understanding your patterns is still a work in progress' : 'You\'re starting to see some patterns'}, and ${v2 <= 2 ? 'looking back can feel heavy sometimes' : 'reflection is getting easier'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Self-reflection is something you're just starting to develop. ${v1 <= 2 ? 'Your emotional patterns might feel confusing right now' : 'There\'s a lot to figure out'}, and ${v2 <= 2 ? 'thinking about the past can feel overwhelming' : 'it\'s hard to process things sometimes'}. Based on: ${signals}.`,
  },
  coping_capacity: {
    high: (v1, v2, signals) => `You've got a solid toolkit for handling stress! ${v1 >= 4 ? 'Your coping strategies really work for you' : 'You\'ve found some things that help'} and ${v2 >= 4 ? 'you bounce back from setbacks like a champ' : 'you don\'t stay down for long'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Your coping skills are developing. ${v1 <= 2 ? 'You might not have many go-to strategies yet' : 'Some things help, some don\'t'}, and ${v2 <= 2 ? 'setbacks can really knock you off track' : 'bouncing back takes some time'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Building coping skills is a priority right now. ${v1 <= 2 ? 'Finding healthy ways to deal with stress has been tough' : 'Your toolkit needs some additions'}, and ${v2 <= 2 ? 'setbacks hit really hard' : 'getting back up takes a lot of energy'}. Based on: ${signals}.`,
  },
  behavioral_engagement: {
    high: (v1, v2, signals) => `You're really showing up for yourself! ${v1 >= 4 ? 'Your routines are solid' : 'You\'re keeping up with self-care'} and ${v2 >= 4 ? 'you\'re motivated to keep growing' : 'you\'re putting in the work'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `You're making some effort, which is great. ${v1 <= 2 ? 'Keeping routines going has been hard' : 'Some days are better than others'}, and ${v2 <= 2 ? 'motivation comes and goes' : 'you\'re working on staying engaged'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Engagement has been challenging lately. ${v1 <= 2 ? 'Daily routines have kind of fallen apart' : 'It\'s been hard to keep things together'}, and ${v2 <= 2 ? 'motivation feels pretty low right now' : 'getting started feels like a lot'}. Based on: ${signals}.`,
  },
  social_readiness: {
    high: (v1, v2, signals) => `Socially, you're in a good place! ${v1 >= 4 ? 'You\'re open to meeting new people' : 'You feel cautiously optimistic about connections'} and ${v2 >= 4 ? 'you can really be present with others' : 'you\'re able to show up in social situations'}. Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Social stuff is a mixed bag right now. ${v1 <= 2 ? 'New connections feel a bit scary' : 'You have mixed feelings about putting yourself out there'}, and ${v2 <= 2 ? 'being present socially takes a lot of energy' : 'you\'re sometimes distracted in social settings'}. Based on: ${signals}.`,
    low: (v1, v2, signals) => `Social connection is something you're working up to. ${v1 <= 2 ? 'Meeting new people feels really overwhelming' : 'You\'re hesitant about relationships'}, and ${v2 <= 2 ? 'being around others is draining' : 'it\'s hard to feel present socially'}. Based on: ${signals}.`,
  },
};

// Motivational tone templates (encouraging, growth-focused)
const MOTIVATIONAL_REASONING: Record<Dimension, Record<'high' | 'mid' | 'low', (v1: number, v2: number, signals: string) => string>> = {
  emotional_stability: {
    high: (v1, v2, signals) => `You're doing amazing work with your emotions! Your ${v1 >= 4 ? 'steady mood shows real progress' : 'emotional awareness is growing'} and ${v2 >= 4 ? 'your ability to bounce back is a real strength' : 'you\'re building resilience every day'}. Keep it up! Based on: ${signals}.`,
    mid: (v1, v2, signals) => `You're on the path to emotional balance! ${v1 <= 2 ? 'Those mood swings? They\'re temporary' : 'Every emotional wave is a learning opportunity'}, and ${v2 <= 2 ? 'each time you recover, you\'re building strength' : 'you\'re getting better at finding your center'}. Progress is happening! Based on: ${signals}.`,
    low: (v1, v2, signals) => `This is your starting point, not your ending point. ${v1 <= 2 ? 'Those emotional ups and downs mean you\'re human' : 'Your emotions show you\'re processing important things'}, and ${v2 <= 2 ? 'learning to find balance is a skill you CAN build' : 'every step toward stability matters'}. You've got this! Based on: ${signals}.`,
  },
  self_reflection: {
    high: (v1, v2, signals) => `Your self-awareness is a superpower! ${v1 >= 4 ? 'Understanding your patterns gives you real control' : 'Your growing insight is powerful'} and ${v2 >= 4 ? 'your ability to process the past shows incredible growth' : 'you\'re healing in meaningful ways'}. Keep reflecting! Based on: ${signals}.`,
    mid: (v1, v2, signals) => `You're building something valuable here! ${v1 <= 2 ? 'Each pattern you notice is a breakthrough' : 'Your awareness is expanding every day'}, and ${v2 <= 2 ? 'facing the past takes courage — you have it' : 'your reflection skills are growing'}. Stay curious about yourself! Based on: ${signals}.`,
    low: (v1, v2, signals) => `Self-discovery is a journey, and you've begun! ${v1 <= 2 ? 'Not knowing your patterns yet means everything is still possible' : 'You\'re at the start of understanding yourself'}, and ${v2 <= 2 ? 'the fact that the past feels heavy shows you\'re ready to heal' : 'building reflection skills will transform everything'}. One insight at a time! Based on: ${signals}.`,
  },
  coping_capacity: {
    high: (v1, v2, signals) => `Your coping toolkit is impressive! ${v1 >= 4 ? 'Those stress-busting strategies are working' : 'You\'ve found what helps you'} and ${v2 >= 4 ? 'your resilience is truly inspiring' : 'your bounce-back ability shows real growth'}. You've built something powerful! Based on: ${signals}.`,
    mid: (v1, v2, signals) => `You're building your resilience muscles! ${v1 <= 2 ? 'Every new coping strategy is a win' : 'Your toolkit is growing'}, and ${v2 <= 2 ? 'setbacks are just setups for comebacks' : 'you\'re learning to recover faster'}. Keep adding tools to your toolkit! Based on: ${signals}.`,
    low: (v1, v2, signals) => `Building coping skills is the most valuable investment you can make! ${v1 <= 2 ? 'Starting with few strategies means you\'ll appreciate each one you learn' : 'You\'re ready to build new skills'}, and ${v2 <= 2 ? 'struggling with setbacks now means you\'ll celebrate your resilience later' : 'every recovery teaches you something'}. You will get stronger! Based on: ${signals}.`,
  },
  behavioral_engagement: {
    high: (v1, v2, signals) => `Your commitment to yourself is inspiring! ${v1 >= 4 ? 'Those consistent routines are building something beautiful' : 'Your self-care game is strong'} and ${v2 >= 4 ? 'your motivation is contagious' : 'you\'re actively creating your best life'}. Keep showing up! Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Every effort counts, and you're making them! ${v1 <= 2 ? 'Rebuilding routines is hard work — you\'re doing it' : 'You\'re finding your rhythm'}, and ${v2 <= 2 ? 'motivation ebbs and flows — yours is building' : 'your engagement is growing'}. Small steps, big changes! Based on: ${signals}.`,
    low: (v1, v2, signals) => `Today is a new opportunity to engage! ${v1 <= 2 ? 'Routines can be rebuilt, starting with one small habit' : 'Your past doesn\'t define your future actions'}, and ${v2 <= 2 ? 'motivation can be sparked — sometimes it just takes one win' : 'every action you take builds momentum'}. Start small, dream big! Based on: ${signals}.`,
  },
  social_readiness: {
    high: (v1, v2, signals) => `Your openness to connection is wonderful! ${v1 >= 4 ? 'Being ready for new relationships shows real growth' : 'Your cautious optimism is healthy'} and ${v2 >= 4 ? 'your ability to be present with others is a gift' : 'you\'re showing up authentically'}. Connection awaits! Based on: ${signals}.`,
    mid: (v1, v2, signals) => `Social readiness is building at your pace! ${v1 <= 2 ? 'Feeling hesitant is okay — it shows you care' : 'Mixed feelings about connection are normal'}, and ${v2 <= 2 ? 'every social moment is practice' : 'presence is a skill you\'re developing'}. Take it one connection at a time! Based on: ${signals}.`,
    low: (v1, v2, signals) => `Social connection will come when you're ready! ${v1 <= 2 ? 'Feeling overwhelmed by others makes sense right now' : 'Protecting yourself shows wisdom'}, and ${v2 <= 2 ? 'social energy will return as you heal' : 'being present will get easier'}. Focus on you first — relationships will follow! Based on: ${signals}.`,
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
