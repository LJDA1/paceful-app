import { supabase as defaultSupabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type ERSStage = 'healing' | 'rebuilding' | 'ready';

export interface ERSComponentScores {
  emotionalStability: number | null;      // From mood variance (30%)
  selfReflection: number | null;          // From journal entries (20%)
  behavioralEngagement: number | null;    // From daily mood log frequency (15%)
  copingCapacity: number | null;          // From recovery after low moods (20%)
  socialReadiness: number | null;         // From self-reported readiness (15%)
}

export interface ERSResult {
  userId: string;
  ersScore: number;
  ersStage: ERSStage;
  ersConfidence: number;
  ersDelta: number | null;
  components: ERSComponentScores;
  moodEntriesCount: number;
  totalDataPoints: number;
  calculatedAt: Date;
  weekOf: string;
}

// New weights (5 dimensions, total = 1.0)
const COMPONENT_WEIGHTS = {
  emotionalStability: 0.30,      // Was moodStability at 0.60
  selfReflection: 0.20,          // NEW
  behavioralEngagement: 0.15,    // Was engagementConsistency at 0.40
  copingCapacity: 0.20,          // NEW - maps to recovery_behavior_score
  socialReadiness: 0.15,         // NEW - maps to trust_openness_score
} as const;

// Updated stage thresholds per spec
const STAGE_THRESHOLDS = {
  healing: { min: 0, max: 49 },
  rebuilding: { min: 50, max: 74 },
  ready: { min: 75, max: 100 },
} as const;

// Minimum data requirements
const MIN_MOOD_ENTRIES = 3;
const MIN_JOURNAL_ENTRIES = 2;

// ============================================================================
// Safety Functions - Prevent numeric overflow in database
// ============================================================================

/**
 * Safely clamp and round a score to 0-100 range with 2 decimal places
 * Returns null for invalid values (NaN, Infinity, undefined)
 */
function safeScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return null;
  }
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped * 100) / 100;
}

/**
 * Safely clamp and round a confidence value to 0-1 range with 2 decimal places
 * Returns null for invalid values
 */
function safeConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return null;
  }
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * 100) / 100;
}

/**
 * Safely clamp and round a normalized score (0-1) with 2 decimal places
 * Returns null for invalid values
 */
function safeNormalizedScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return null;
  }
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * 100) / 100;
}

// ============================================================================
// Component Calculators
// ============================================================================

/**
 * Calculate Emotional Stability score from mood variance
 * Lower variance = more stable = higher score
 */
async function calculateEmotionalStabilityScore(
  userId: string,
  startDate: Date,
  endDate: Date,
  supabase: SupabaseClient = defaultSupabase
): Promise<{ score: number | null; dataPoints: number }> {
  const { data: moods, error } = await supabase
    .from('mood_entries')
    .select('mood_value, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString())
    .lte('logged_at', endDate.toISOString())
    .order('logged_at', { ascending: true });

  if (error || !moods || moods.length < MIN_MOOD_ENTRIES) {
    return { score: null, dataPoints: moods?.length || 0 };
  }

  const moodValues = moods.map((m) => m.mood_value);

  // Calculate mean
  const mean = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;

  // Calculate variance
  const variance = moodValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / moodValues.length;
  const stdDev = Math.sqrt(variance);

  // Stability score from variance
  // Lower variance = higher stability
  const stabilityFromVariance = Math.max(0, 1 - (stdDev / 4));

  // Calculate trend (positive trend is good)
  const n = moodValues.length;
  if (n >= 4) {
    const midpoint = Math.floor(n / 2);
    const firstHalfAvg = moodValues.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg = moodValues.slice(midpoint).reduce((a, b) => a + b, 0) / (n - midpoint);

    // Trend bonus: improving moods add up to 0.2 to score
    const trendBonus = secondHalfAvg > firstHalfAvg
      ? Math.min(0.2, (secondHalfAvg - firstHalfAvg) / 5)
      : 0;

    const score = Math.min(1, stabilityFromVariance + trendBonus);
    return { score, dataPoints: moods.length };
  }

  return { score: stabilityFromVariance, dataPoints: moods.length };
}

/**
 * Calculate Self-Reflection score from journal entries
 * Score based on: frequency, depth (word count), variety
 */
async function calculateSelfReflectionScore(
  userId: string,
  supabase: SupabaseClient = defaultSupabase
): Promise<{ score: number | null; dataPoints: number }> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('entry_content, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error || !entries || entries.length < MIN_JOURNAL_ENTRIES) {
      return { score: null, dataPoints: entries?.length || 0 };
    }

    // Frequency score: (entries_count / 7) * 40, capped at 40
    const frequency = Math.min((entries.length / 7) * 40, 40);

    // Depth score: based on average word count
    const avgWords = entries.reduce((sum, e) => sum + ((e.entry_content || '').split(/\s+/).filter(Boolean).length || 0), 0) / entries.length;
    const depth = avgWords >= 100 ? 30 : avgWords >= 50 ? 20 : avgWords >= 20 ? 15 : 5;

    // Variety score: give benefit of doubt (simplified)
    const variety = 30;

    const score = Math.min(frequency + depth + variety, 100) / 100; // normalize to 0-1
    return { score, dataPoints: entries.length };
  } catch {
    return { score: null, dataPoints: 0 };
  }
}

/**
 * Calculate Behavioral Engagement score from daily mood logging
 */
async function calculateBehavioralEngagementScore(
  userId: string,
  startDate: Date,
  endDate: Date,
  supabase: SupabaseClient = defaultSupabase
): Promise<{ score: number | null; dataPoints: number }> {
  const { data: moods, error } = await supabase
    .from('mood_entries')
    .select('logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString())
    .lte('logged_at', endDate.toISOString())
    .order('logged_at', { ascending: true });

  if (error || !moods || moods.length === 0) {
    return { score: null, dataPoints: 0 };
  }

  // Count unique days with entries
  const uniqueDays = new Set<string>();
  moods.forEach(m => {
    const day = m.logged_at.split('T')[0];
    uniqueDays.add(day);
  });

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysWithEntries = uniqueDays.size;

  // Base score: percentage of days logged
  const loggingRate = Math.min(1, daysWithEntries / Math.max(1, totalDays));

  // Streak bonus
  const sortedDays = Array.from(uniqueDays).sort();
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1]);
    const currDate = new Date(sortedDays[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  // Streak bonus: up to 0.15 for streaks of 7+ days
  const streakBonus = Math.min(0.15, (maxStreak / 7) * 0.15);

  const score = Math.min(1, loggingRate + streakBonus);
  return { score, dataPoints: moods.length };
}

/**
 * Calculate Coping Capacity score from recovery after low moods
 */
async function calculateCopingCapacityScore(
  userId: string,
  supabase: SupabaseClient = defaultSupabase
): Promise<{ score: number | null; dataPoints: number }> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const { data: moods, error } = await supabase
      .from('mood_entries')
      .select('mood_value, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', sevenDaysAgo.toISOString())
      .order('logged_at', { ascending: true });

    if (error || !moods || moods.length < MIN_MOOD_ENTRIES) {
      return { score: null, dataPoints: moods?.length || 0 };
    }

    // Find low mood entries (score <= 2 on scale)
    const lowMoods = moods.filter(m => m.mood_value <= 2);

    // If no low moods, that's neutral-positive
    if (lowMoods.length === 0) {
      return { score: 0.5, dataPoints: moods.length };
    }

    // Count recoveries (next mood higher than low mood)
    let recovered = 0;
    for (const low of lowMoods) {
      const lowTime = new Date(low.logged_at).getTime();
      const nextMood = moods.find(m => new Date(m.logged_at).getTime() > lowTime);
      if (nextMood && nextMood.mood_value > low.mood_value) {
        recovered++;
      }
    }

    const recoveryRate = (recovered / lowMoods.length) * 0.7;
    const baseScore = 0.3; // baseline
    const score = Math.min(baseScore + recoveryRate, 1.0);

    return { score, dataPoints: moods.length };
  } catch {
    return { score: null, dataPoints: 0 };
  }
}

/**
 * Calculate Social Readiness score from self-reported readiness
 */
async function calculateSocialReadinessScore(
  userId: string,
  supabase: SupabaseClient = defaultSupabase
): Promise<{ score: number | null; dataPoints: number }> {
  // Check recovery_trajectories for latest self_reported_readiness
  try {
    const { data: trajectory } = await supabase
      .from('recovery_trajectories')
      .select('self_reported_readiness')
      .eq('user_id', userId)
      .not('self_reported_readiness', 'is', null)
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (trajectory && trajectory.length > 0 && trajectory[0].self_reported_readiness) {
      // Map readiness to score (handle various formats)
      const readinessMap: Record<string, number> = {
        'Not at all': 0.15,
        'not_at_all': 0.15,
        'A little': 0.35,
        'a_little': 0.35,
        'Mostly': 0.65,
        'mostly': 0.65,
        'Completely': 0.90,
        'completely': 0.90,
      };

      const score = readinessMap[trajectory[0].self_reported_readiness] || 0.30;
      return { score, dataPoints: 1 };
    }
  } catch {
    // Table may not exist or query failed - that's OK
  }

  // Default: no data available
  return { score: 0.30, dataPoints: 0 };
}

// ============================================================================
// Main Calculator
// ============================================================================

/**
 * Get the start of the current week (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Determine ERS stage from score
 */
function determineStage(score: number): ERSStage {
  if (score >= STAGE_THRESHOLDS.ready.min) return 'ready';
  if (score >= STAGE_THRESHOLDS.rebuilding.min) return 'rebuilding';
  return 'healing';
}

/**
 * Calculate confidence based on how many dimensions have data
 * Returns a value clamped between 0 and 1
 */
function calculateConfidence(components: ERSComponentScores): number {
  const nonNullCount = Object.values(components).filter(v => v !== null).length;
  const confidence = nonNullCount / 5;
  // Clamp to 0-1 range (should always be valid but safety check)
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Get previous ERS score for delta calculation
 */
async function getPreviousScore(userId: string, currentWeekOf: string, supabase: SupabaseClient = defaultSupabase): Promise<number | null> {
  const { data } = await supabase
    .from('ers_scores')
    .select('ers_score')
    .eq('user_id', userId)
    .lt('week_of', currentWeekOf)
    .order('week_of', { ascending: false })
    .limit(1)
    .single();

  return data?.ers_score ?? null;
}

/**
 * Main ERS calculation function - ALL 5 DIMENSIONS
 */
export async function calculateERSScore(userId: string, supabaseClient?: SupabaseClient): Promise<ERSResult> {
  const supabase = supabaseClient || defaultSupabase;
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekOf = formatDate(weekStart);

  // Date range: last 7 days for analysis
  const endDate = now;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7);

  // Calculate all component scores in parallel
  const [
    emotionalStability,
    selfReflection,
    behavioralEngagement,
    copingCapacity,
    socialReadiness,
  ] = await Promise.all([
    calculateEmotionalStabilityScore(userId, startDate, endDate, supabase),
    calculateSelfReflectionScore(userId, supabase),
    calculateBehavioralEngagementScore(userId, startDate, endDate, supabase),
    calculateCopingCapacityScore(userId, supabase),
    calculateSocialReadinessScore(userId, supabase),
  ]);

  // Apply safety clamping to all component scores (0-1 range)
  const components: ERSComponentScores = {
    emotionalStability: safeNormalizedScore(emotionalStability.score),
    selfReflection: safeNormalizedScore(selfReflection.score),
    behavioralEngagement: safeNormalizedScore(behavioralEngagement.score),
    copingCapacity: safeNormalizedScore(copingCapacity.score),
    socialReadiness: safeNormalizedScore(socialReadiness.score),
  };

  // Calculate weighted score with weight redistribution for null dimensions
  let weightedSum = 0;
  let totalWeight = 0;

  if (components.emotionalStability !== null) {
    weightedSum += components.emotionalStability * COMPONENT_WEIGHTS.emotionalStability;
    totalWeight += COMPONENT_WEIGHTS.emotionalStability;
  }

  if (components.selfReflection !== null) {
    weightedSum += components.selfReflection * COMPONENT_WEIGHTS.selfReflection;
    totalWeight += COMPONENT_WEIGHTS.selfReflection;
  }

  if (components.behavioralEngagement !== null) {
    weightedSum += components.behavioralEngagement * COMPONENT_WEIGHTS.behavioralEngagement;
    totalWeight += COMPONENT_WEIGHTS.behavioralEngagement;
  }

  if (components.copingCapacity !== null) {
    weightedSum += components.copingCapacity * COMPONENT_WEIGHTS.copingCapacity;
    totalWeight += COMPONENT_WEIGHTS.copingCapacity;
  }

  if (components.socialReadiness !== null) {
    weightedSum += components.socialReadiness * COMPONENT_WEIGHTS.socialReadiness;
    totalWeight += COMPONENT_WEIGHTS.socialReadiness;
  }

  // Normalize to 0-100 scale (weight redistribution happens automatically)
  // Apply safety clamping to ensure score is within valid range
  const rawErsScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  const ersScore = Math.max(0, Math.min(100, rawErsScore));

  // Total data points for data health tracking
  const totalDataPoints =
    emotionalStability.dataPoints +
    selfReflection.dataPoints +
    behavioralEngagement.dataPoints +
    copingCapacity.dataPoints +
    socialReadiness.dataPoints;

  const moodEntriesCount = Math.max(
    emotionalStability.dataPoints,
    behavioralEngagement.dataPoints,
    copingCapacity.dataPoints
  );

  // Determine stage and confidence
  const ersStage = determineStage(ersScore);
  const ersConfidence = calculateConfidence(components);

  // Get previous score for delta
  const previousScore = await getPreviousScore(userId, weekOf, supabase);
  const ersDelta = previousScore !== null ? ersScore - previousScore : null;

  // Build result with all values safely clamped and rounded
  const finalErsScore = Math.round(Math.max(0, Math.min(100, ersScore)) * 100) / 100;
  const finalConfidence = Math.round(Math.max(0, Math.min(1, ersConfidence)) * 100) / 100;
  const finalDelta = ersDelta !== null
    ? Math.round(Math.max(-100, Math.min(100, ersDelta)) * 100) / 100
    : null;

  const result: ERSResult = {
    userId,
    ersScore: finalErsScore,
    ersStage,
    ersConfidence: finalConfidence,
    ersDelta: finalDelta,
    components,
    moodEntriesCount,
    totalDataPoints,
    calculatedAt: now,
    weekOf,
  };

  return result;
}

/**
 * Calculate and store ERS score in database
 */
export async function calculateAndStoreERSScore(userId: string, supabaseClient?: SupabaseClient): Promise<ERSResult> {
  const supabase = supabaseClient || defaultSupabase;
  const result = await calculateERSScore(userId, supabase);

  // Apply safety checks to all values before storage
  const safeErsScore = safeScore(result.ersScore);
  const safeErsConfidence = safeConfidence(result.ersConfidence);
  // Delta can be negative (score went down) or positive, clamp to -100 to +100 range
  const safeErsDelta = (() => {
    if (result.ersDelta === null || result.ersDelta === undefined || isNaN(result.ersDelta) || !isFinite(result.ersDelta)) {
      return null;
    }
    const clamped = Math.max(-100, Math.min(100, result.ersDelta));
    return Math.round(clamped * 100) / 100;
  })();

  // Debug logging to see exactly what values are being stored
  // Store in database - mapping components to database columns
  const { error } = await supabase.from('ers_scores').upsert(
    {
      user_id: result.userId,
      ers_score: safeErsScore,
      ers_stage: result.ersStage,
      ers_confidence: safeErsConfidence,
      ers_delta: safeErsDelta,
      // Map components to database columns (store as 0-1 normalized values)
      emotional_stability_score: safeNormalizedScore(result.components.emotionalStability),
      self_reflection_score: safeNormalizedScore(result.components.selfReflection),
      engagement_consistency_score: safeNormalizedScore(result.components.behavioralEngagement),
      trust_openness_score: safeNormalizedScore(result.components.socialReadiness),
      recovery_behavior_score: safeNormalizedScore(result.components.copingCapacity),
      data_points_used: result.totalDataPoints,
      calculation_method: 'v3_five_dimensions',
      week_of: result.weekOf,
    },
    {
      onConflict: 'user_id,week_of',
    }
  );

  if (error) {
    console.error('Failed to store ERS score:', error);
    throw new Error(`Failed to store ERS score: ${error.message}`);
  }

  return result;
}

/**
 * Batch calculate ERS for multiple users
 */
export async function calculateERSForAllUsers(supabaseClient?: SupabaseClient): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const supabase = supabaseClient || defaultSupabase;
  // Get users who have ERS tracking consent
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('ers_tracking_consent', true);

  if (error || !profiles) {
    // Fallback: try to get users from auth
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id');

    if (usersError || !users) {
      throw new Error('Failed to fetch users');
    }

    // Process all users
    return processUserBatch(users.map(u => u.user_id), supabase);
  }

  return processUserBatch(profiles.map(p => p.user_id), supabase);
}

async function processUserBatch(userIds: string[], supabase: SupabaseClient = defaultSupabase): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  };

  for (const userId of userIds) {
    try {
      await calculateAndStoreERSScore(userId, supabase);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({
        userId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Get stage display info
 */
export function getStageInfo(stage: ERSStage): {
  label: string;
  description: string;
  minScore: number;
  maxScore: number;
} {
  switch (stage) {
    case 'healing':
      return {
        label: 'Healing',
        description: 'Focus on self-care and emotional processing',
        minScore: 0,
        maxScore: 49,
      };
    case 'rebuilding':
      return {
        label: 'Rebuilding',
        description: 'Building new patterns and emotional strength',
        minScore: 50,
        maxScore: 74,
      };
    case 'ready':
      return {
        label: 'Ready',
        description: 'Emotionally prepared for meaningful connections',
        minScore: 75,
        maxScore: 100,
      };
  }
}
