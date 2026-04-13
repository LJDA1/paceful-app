/**
 * Gambling Signal Scoring Library
 *
 * Pure functions for mapping 14 structured behavioral signals to 5 RSP dimensions
 * and computing a Responsible Gambling Score (RGS, 0-100 where 100 = most responsible).
 *
 * No AI/Claude calls — scoring is deterministic from partner-provided signal values.
 */

// ============================================================================
// Types
// ============================================================================

export type Dimension =
  | 'emotional_stability'
  | 'self_reflection'
  | 'coping_capacity'
  | 'behavioral_engagement'
  | 'social_readiness';

export type Confidence = 'low' | 'medium' | 'high';
export type Verbosity = 'minimal' | 'standard' | 'clinical';
export type Tone = 'clinical' | 'casual' | 'motivational';
export type ScoreFormat = 'numerical' | 'percentage' | 'tier_label' | 'traffic_light';
export type RecommendedAction = 'monitor' | 'intervene' | 'restrict';

export interface GamblingSignals {
  // Context (informational, not scored)
  session_duration_minutes?: number;
  session_frequency_daily?: number;
  deposit_amount?: number;

  // Scored signals
  deposit_velocity_change_pct?: number;    // % change vs 7d avg; high positive = risk
  loss_chase_score?: number;               // 0-100; bet size increase after loss
  late_night_sessions_pct?: number;        // % of sessions after 11pm
  deposit_limit_set?: boolean;             // has active deposit limit
  deposit_limit_modified_down?: boolean;   // tightened limit (protective)
  self_exclusion_history?: boolean;        // has self-excluded before (self-awareness signal)
  bet_type_risk_score?: number;            // 0-100; accumulators vs singles
  withdrawal_cancellation_count?: number;  // last 30d
  rg_tool_engagement_score?: number;       // 0-100; interaction with RG tools
  session_break_compliance_pct?: number;   // % compliance with break reminders
  promo_response_rate?: number;            // 0-1; high = chasing promotions
}

export interface DimensionWeights {
  emotional_stability: number;
  self_reflection: number;
  coping_capacity: number;
  behavioral_engagement: number;
  social_readiness: number;
}

export interface DimensionResult {
  score: number;
  confidence: Confidence;
  contributing_signals: string[];
}

export interface ThresholdConfig {
  rgs_minimum: number;
  dimension_minimum: number;
  deposit_velocity_threshold: number;
  loss_chase_threshold: number;
  alert_on_rgs_breach: boolean;
  alert_on_dimension_breach: boolean;
  alert_on_velocity_breach: boolean;
  alert_on_loss_chase_breach: boolean;
}

export interface ThresholdAlert {
  type: string;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  message: string;
}

export interface GamblingConfig {
  dimension_weights: DimensionWeights;
  thresholds: ThresholdConfig;
  verbosity: Verbosity;
  tone: Tone;
  score_format: ScoreFormat;
  traffic_light_thresholds: { red_max: number; yellow_max: number };
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_DIMENSION_WEIGHTS: DimensionWeights = {
  emotional_stability: 0.25,
  self_reflection: 0.15,
  coping_capacity: 0.20,
  behavioral_engagement: 0.15,
  social_readiness: 0.25,
};

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  rgs_minimum: 40,
  dimension_minimum: 25,
  deposit_velocity_threshold: 200,
  loss_chase_threshold: 80,
  alert_on_rgs_breach: true,
  alert_on_dimension_breach: true,
  alert_on_velocity_breach: true,
  alert_on_loss_chase_breach: true,
};

export const DEFAULT_GAMBLING_CONFIG: GamblingConfig = {
  dimension_weights: DEFAULT_DIMENSION_WEIGHTS,
  thresholds: DEFAULT_THRESHOLD_CONFIG,
  verbosity: 'minimal',
  tone: 'clinical',
  score_format: 'numerical',
  traffic_light_thresholds: { red_max: 33, yellow_max: 66 },
};

// ============================================================================
// Signal normalizers (all return 0-100, higher = more responsible/safer)
// ============================================================================

function clamp(value: number, min = 0, max = 100): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function confidenceFromPresence(value: unknown): Confidence {
  return value === undefined || value === null ? 'low' : 'high';
}

function avgConfidence(a: Confidence, b: Confidence): Confidence {
  const order = { low: 0, medium: 1, high: 2 };
  const avg = (order[a] + order[b]) / 2;
  if (avg < 0.75) return 'low';
  if (avg < 1.5) return 'medium';
  return 'high';
}

function triConfidence(a: Confidence, b: Confidence, c: Confidence): Confidence {
  const order = { low: 0, medium: 1, high: 2 };
  const avg = (order[a] + order[b] + order[c]) / 3;
  if (avg < 0.75) return 'low';
  if (avg < 1.5) return 'medium';
  return 'high';
}

// Emotional Stability signals
// loss_chase_score: 0=no chasing (good), 100=severe chasing (bad) → invert
function normLossChase(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 50, conf: 'low' };
  return { norm: clamp(100 - v), conf: 'high' };
}

// late_night_sessions_pct: 0%=good, 100%=all night sessions (bad) → invert
function normLateNight(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 50, conf: 'low' };
  return { norm: clamp(100 - v), conf: 'high' };
}

// Self-Reflection signals
// rg_tool_engagement_score: 0=no engagement (bad), 100=high engagement (good) → direct
function normRgTool(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 40, conf: 'low' };
  return { norm: clamp(v), conf: 'high' };
}

// self_exclusion_history: true = has self-excluded before → protective (high self-awareness)
function normSelfExclusion(v?: boolean): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 45, conf: 'low' };
  return { norm: v ? 72 : 42, conf: 'medium' };
}

// Coping Capacity signals
// deposit_velocity_change_pct: negative% = good (reduced deposits), positive% = risk
// Mapped over ±300% range: -300→100, 0→50, +300→0
function normDepositVelocity(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 50, conf: 'low' };
  return { norm: clamp(50 - v / 6), conf: 'high' };
}

// withdrawal_cancellation_count: 0=good (80), each cancellation costs 15pts
function normWithdrawalCancellations(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 70, conf: 'low' };
  return { norm: clamp(80 - v * 15), conf: v > 0 ? 'high' : 'medium' };
}

// Behavioral Engagement signals
// deposit_limit_set + deposit_limit_modified_down: limit set=protective; tightening it=very protective
function normDepositLimit(set?: boolean, modifiedDown?: boolean): { norm: number; conf: Confidence } {
  if (set === undefined || set === null) return { norm: 38, conf: 'low' };
  let base = set ? 68 : 28;
  if (set && modifiedDown) base = Math.min(100, base + 22);
  else if (!set && modifiedDown) base = 55; // set a limit for the first time = still positive
  return { norm: base, conf: 'high' };
}

// session_break_compliance_pct: 0%=ignores all breaks (bad), 100%=fully compliant (good) → direct
function normSessionBreak(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 50, conf: 'low' };
  return { norm: clamp(v), conf: 'high' };
}

// Social Readiness signals
// promo_response_rate: 0=ignores promos (healthy), 1=clicks everything (chasing) → invert
function normPromoResponse(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 50, conf: 'low' };
  return { norm: clamp((1 - v) * 100), conf: 'high' };
}

// bet_type_risk_score: 0=low risk singles (good), 100=high risk accumulators (bad) → invert
function normBetTypeRisk(v?: number): { norm: number; conf: Confidence } {
  if (v === undefined || v === null) return { norm: 50, conf: 'low' };
  return { norm: clamp(100 - v), conf: 'high' };
}

// ============================================================================
// Dimension computation
// ============================================================================

export function computeDimensions(
  signals: GamblingSignals
): Record<Dimension, DimensionResult> {
  const lossChase = normLossChase(signals.loss_chase_score);
  const lateNight = normLateNight(signals.late_night_sessions_pct);

  const rgTool = normRgTool(signals.rg_tool_engagement_score);
  const selfExcl = normSelfExclusion(signals.self_exclusion_history);

  const velocity = normDepositVelocity(signals.deposit_velocity_change_pct);
  const withdrawal = normWithdrawalCancellations(signals.withdrawal_cancellation_count);

  const depositLimit = normDepositLimit(signals.deposit_limit_set, signals.deposit_limit_modified_down);
  const sessionBreak = normSessionBreak(signals.session_break_compliance_pct);
  const modConfidence: Confidence = confidenceFromPresence(signals.deposit_limit_modified_down);

  const promo = normPromoResponse(signals.promo_response_rate);
  const betType = normBetTypeRisk(signals.bet_type_risk_score);

  return {
    emotional_stability: {
      score: clamp((lossChase.norm + lateNight.norm) / 2),
      confidence: avgConfidence(lossChase.conf, lateNight.conf),
      contributing_signals: ['loss_chase_score', 'late_night_sessions_pct'],
    },
    self_reflection: {
      score: clamp(rgTool.norm * 0.6 + selfExcl.norm * 0.4),
      confidence: avgConfidence(rgTool.conf, selfExcl.conf),
      contributing_signals: ['rg_tool_engagement_score', 'self_exclusion_history'],
    },
    coping_capacity: {
      score: clamp(velocity.norm * 0.6 + withdrawal.norm * 0.4),
      confidence: avgConfidence(velocity.conf, withdrawal.conf),
      contributing_signals: ['deposit_velocity_change_pct', 'withdrawal_cancellation_count'],
    },
    behavioral_engagement: {
      score: clamp(depositLimit.norm * 0.4 + sessionBreak.norm * 0.4 + (signals.deposit_limit_modified_down ? 85 : 45) * 0.2),
      confidence: triConfidence(depositLimit.conf, sessionBreak.conf, modConfidence),
      contributing_signals: ['deposit_limit_set', 'session_break_compliance_pct', 'deposit_limit_modified_down'],
    },
    social_readiness: {
      score: clamp(promo.norm * 0.4 + betType.norm * 0.6),
      confidence: avgConfidence(promo.conf, betType.conf),
      contributing_signals: ['promo_response_rate', 'bet_type_risk_score'],
    },
  };
}

// ============================================================================
// RGS composite score
// ============================================================================

export function computeRgsScore(
  dimensions: Record<Dimension, DimensionResult>,
  weights: DimensionWeights = DEFAULT_DIMENSION_WEIGHTS
): number {
  let weightedSum = 0;
  for (const [dim, weight] of Object.entries(weights) as [Dimension, number][]) {
    weightedSum += (dimensions[dim]?.score ?? 50) * weight;
  }
  return Math.round(weightedSum);
}

export function getRgsLabel(score: number): string {
  if (score >= 75) return 'Low Risk';
  if (score >= 50) return 'Moderate Risk';
  if (score >= 25) return 'High Risk';
  return 'Critical Risk';
}

export function getOverallConfidence(dimensions: Record<Dimension, DimensionResult>): Confidence {
  const order = { low: 0, medium: 1, high: 2 };
  const avg = Object.values(dimensions).reduce((sum, d) => sum + order[d.confidence], 0) / 5;
  if (avg < 0.75) return 'low';
  if (avg < 1.5) return 'medium';
  return 'high';
}

// ============================================================================
// Threshold checking
// ============================================================================

export function checkThresholds(
  signals: GamblingSignals,
  rgsScore: number,
  dimensions: Record<Dimension, DimensionResult>,
  config: ThresholdConfig
): { breached: boolean; alerts: ThresholdAlert[]; recommended_action: RecommendedAction } {
  const alerts: ThresholdAlert[] = [];

  const DIM_LABELS: Record<Dimension, string> = {
    emotional_stability: 'Emotional Stability',
    self_reflection: 'Self-Reflection',
    coping_capacity: 'Coping Capacity',
    behavioral_engagement: 'Behavioral Engagement',
    social_readiness: 'Social Readiness',
  };

  // RGS composite breach
  if (config.alert_on_rgs_breach && rgsScore < config.rgs_minimum) {
    alerts.push({
      type: 'rgs_below_minimum',
      severity: rgsScore < config.rgs_minimum * 0.5 ? 'critical' : 'warning',
      value: rgsScore,
      threshold: config.rgs_minimum,
      message: `RGS ${rgsScore} is below configured minimum of ${config.rgs_minimum}`,
    });
  }

  // Per-dimension breaches
  if (config.alert_on_dimension_breach) {
    for (const [dim, data] of Object.entries(dimensions) as [Dimension, DimensionResult][]) {
      if (data.score < config.dimension_minimum) {
        alerts.push({
          type: `dimension_below_minimum.${dim}`,
          severity: data.score < config.dimension_minimum * 0.5 ? 'critical' : 'warning',
          value: data.score,
          threshold: config.dimension_minimum,
          message: `${DIM_LABELS[dim]} score ${data.score} is below minimum of ${config.dimension_minimum}`,
        });
      }
    }
  }

  // Deposit velocity breach
  if (
    config.alert_on_velocity_breach &&
    signals.deposit_velocity_change_pct !== undefined &&
    signals.deposit_velocity_change_pct !== null &&
    signals.deposit_velocity_change_pct > config.deposit_velocity_threshold
  ) {
    const val = signals.deposit_velocity_change_pct;
    alerts.push({
      type: 'deposit_velocity_exceeded',
      severity: val > config.deposit_velocity_threshold * 1.5 ? 'critical' : 'warning',
      value: Math.round(val * 10) / 10,
      threshold: config.deposit_velocity_threshold,
      message: `Deposit velocity +${val.toFixed(1)}% exceeds threshold of +${config.deposit_velocity_threshold}%`,
    });
  }

  // Loss chase breach
  if (
    config.alert_on_loss_chase_breach &&
    signals.loss_chase_score !== undefined &&
    signals.loss_chase_score !== null &&
    signals.loss_chase_score > config.loss_chase_threshold
  ) {
    const val = signals.loss_chase_score;
    alerts.push({
      type: 'loss_chase_exceeded',
      severity: val > 90 ? 'critical' : 'warning',
      value: val,
      threshold: config.loss_chase_threshold,
      message: `Loss chasing score ${val} exceeds threshold of ${config.loss_chase_threshold}`,
    });
  }

  const breached = alerts.length > 0;
  const hasCritical = alerts.some(a => a.severity === 'critical');

  const shouldRestrict =
    rgsScore < 20 ||
    hasCritical ||
    (
      signals.loss_chase_score !== undefined &&
      signals.loss_chase_score > 80 &&
      signals.deposit_velocity_change_pct !== undefined &&
      signals.deposit_velocity_change_pct > 200
    );

  const recommended_action: RecommendedAction = shouldRestrict
    ? 'restrict'
    : breached
    ? 'intervene'
    : 'monitor';

  return { breached, alerts, recommended_action };
}

// ============================================================================
// Explainability layer (mirrors analyze/route.ts patterns)
// ============================================================================

export function getScoreLabel(score: number): string {
  if (score < 25) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}

export function formatScore(
  score: number,
  format: ScoreFormat,
  thresholds: { red_max: number; yellow_max: number }
): number | string {
  switch (format) {
    case 'numerical':    return score;
    case 'percentage':   return `${score}%`;
    case 'tier_label':   return getScoreLabel(score);
    case 'traffic_light':
      if (score <= thresholds.red_max) return 'red';
      if (score <= thresholds.yellow_max) return 'yellow';
      return 'green';
    default: return score;
  }
}

const DIM_DISPLAY_LABELS: Record<Dimension, string> = {
  emotional_stability: 'Emotional Stability',
  self_reflection: 'Self-Reflection',
  coping_capacity: 'Coping Capacity',
  behavioral_engagement: 'Behavioral Engagement',
  social_readiness: 'Social Readiness',
};

export function generateDimensionReasoning(
  dimension: Dimension,
  score: number,
  signals: string[],
  confidence: Confidence,
  tone: Tone
): string {
  const label = DIM_DISPLAY_LABELS[dimension];
  const confNote = confidence === 'low' ? ' (limited signal data)' : '';
  const tier = score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low';
  const signalStr = signals.join(', ');

  if (tone === 'casual') {
    if (tier === 'high')     return `${label} looks solid! Contributing signals: ${signalStr}${confNote}.`;
    if (tier === 'moderate') return `${label} is mixed. Contributing signals: ${signalStr}${confNote}.`;
    return `${label} needs attention. Contributing signals: ${signalStr}${confNote}.`;
  }

  if (tone === 'motivational') {
    if (tier === 'high')     return `${label} demonstrates responsible patterns. Contributing signals: ${signalStr}${confNote}.`;
    if (tier === 'moderate') return `${label} shows room for safer play. Contributing signals: ${signalStr}${confNote}.`;
    return `${label} indicates an opportunity for responsible gaming support. Contributing signals: ${signalStr}${confNote}.`;
  }

  // Clinical (default)
  if (tier === 'high')     return `${label} indicators are within responsible range. Contributing signals: ${signalStr}${confNote}.`;
  if (tier === 'moderate') return `${label} indicators are moderate. Contributing signals: ${signalStr}${confNote}.`;
  return `${label} indicators suggest elevated risk. Contributing signals: ${signalStr}${confNote}.`;
}

export function generateDimensionAction(dimension: Dimension, score: number): string {
  const isLow = score < 40;
  const isMid = score >= 40 && score < 70;

  const actions: Record<Dimension, { low: string; mid: string; high: string }> = {
    emotional_stability: {
      low: 'Trigger loss-limit notification and offer a cooling-off period.',
      mid: 'Monitor session timing patterns. Display responsible gambling messaging.',
      high: 'No immediate action required. Continue standard monitoring.',
    },
    self_reflection: {
      low: 'Prompt player to review RG tools. Consider proactive outreach from safer gambling team.',
      mid: 'Surface responsible gambling resources and self-assessment options.',
      high: 'Player is engaging with responsible gambling tools. Continue monitoring.',
    },
    coping_capacity: {
      low: 'Immediate review of deposit limits and transaction history required.',
      mid: 'Monitor deposit velocity trends. Consider triggering deposit limit review prompt.',
      high: 'Deposit patterns are within acceptable range.',
    },
    behavioral_engagement: {
      low: 'Enforce session break compliance. Review deposit limit settings with player.',
      mid: 'Remind player of available session limits and break reminders.',
      high: 'Player is actively using responsible gambling controls.',
    },
    social_readiness: {
      low: 'Reduce promotional exposure. Review marketing consent and cooling rules.',
      mid: 'Apply promotional cooling rules. Review bet type exposure for this player.',
      high: 'No promotional restriction required.',
    },
  };

  return isLow ? actions[dimension].low : isMid ? actions[dimension].mid : actions[dimension].high;
}

export function buildDimensionResults(
  dimensions: Record<Dimension, DimensionResult>,
  verbosity: Verbosity,
  tone: Tone,
  scoreFormat: ScoreFormat,
  thresholds: { red_max: number; yellow_max: number }
): Record<string, unknown> {
  const DIMS: Dimension[] = [
    'emotional_stability',
    'self_reflection',
    'coping_capacity',
    'behavioral_engagement',
    'social_readiness',
  ];
  const results: Record<string, Record<string, unknown>> = {};

  for (const dim of DIMS) {
    const d = dimensions[dim];
    const formattedScore = formatScore(d.score, scoreFormat, thresholds);

    if (verbosity === 'minimal') {
      results[dim] = {
        score: formattedScore,
        label: getScoreLabel(d.score),
        confidence: d.confidence,
      };
    } else {
      const entry: Record<string, unknown> = {
        score: formattedScore,
        label: getScoreLabel(d.score),
        confidence: d.confidence,
        reasoning: generateDimensionReasoning(dim, d.score, d.contributing_signals, d.confidence, tone),
        contributing_signals: d.contributing_signals,
      };
      if (verbosity === 'clinical') {
        entry.recommended_action = generateDimensionAction(dim, d.score);
      }
      results[dim] = entry;
    }
  }

  return results;
}
