import { supabase } from './supabase';

// ============================================================================
// Types
// ============================================================================

export type ERSStage = 'healing' | 'rebuilding' | 'ready';

export interface ERSComponentScores {
  moodStability: number | null;      // From mood variance (60%)
  engagementConsistency: number | null; // From daily mood log frequency (40%)
}

export interface ERSResult {
  userId: string;
  ersScore: number;
  ersStage: ERSStage;
  ersConfidence: number;
  ersDelta: number | null;
  components: ERSComponentScores;
  moodEntriesCount: number;
  calculatedAt: Date;
  weekOf: string;
}

// Simplified weights (boosted for mood-only calculation)
// Total = 100%
const COMPONENT_WEIGHTS = {
  moodStability: 0.60,        // Boosted from 20% - mood variance inverted
  engagementConsistency: 0.40, // Boosted from 15% - daily logging frequency
} as const;

// Updated stage thresholds per spec
const STAGE_THRESHOLDS = {
  healing: { min: 0, max: 49 },
  rebuilding: { min: 50, max: 74 },
  ready: { min: 75, max: 100 },
} as const;

// Minimum mood entries needed for calculation
const MIN_MOOD_ENTRIES = 3;

// ============================================================================
// Component Calculators
// ============================================================================

/**
 * Calculate Mood Stability score from mood variance
 * Lower variance = more stable = higher score
 *
 * Score calculation:
 * - Get all mood entries from last 14 days
 * - Calculate variance of mood_value (1-10 scale)
 * - Invert and normalize: lower variance = higher stability score
 * - Also factor in trend (improving moods boost score)
 */
async function calculateMoodStabilityScore(
  userId: string,
  startDate: Date,
  endDate: Date
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
  // Max std dev for 1-10 scale is ~4.5 (all extremes)
  // Lower variance = higher stability
  // We want variance of 0 = 1.0, variance of ~4 = 0.0
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
 * Calculate Engagement Consistency score from daily mood logging
 *
 * Score calculation:
 * - Count unique days with mood entries in period
 * - Calculate logging rate (days logged / total days)
 * - Bonus for consistent streaks
 */
async function calculateEngagementConsistencyScore(
  userId: string,
  startDate: Date,
  endDate: Date
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

  // Base score: percentage of days logged (0-1)
  // 14 days logged out of 14 = 1.0
  // 7 days logged out of 14 = 0.5
  const loggingRate = Math.min(1, daysWithEntries / Math.max(1, totalDays));

  // Streak bonus: check for consecutive days
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

  // Final score: logging rate + streak bonus (capped at 1)
  const score = Math.min(1, loggingRate + streakBonus);

  return { score, dataPoints: moods.length };
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
 * Calculate confidence based on number of mood entries
 * More entries = higher confidence
 */
function calculateConfidence(moodEntriesCount: number, components: ERSComponentScores): number {
  // Base confidence from data volume
  // 20 entries = 100% data confidence
  const dataConfidence = Math.min(1, moodEntriesCount / 20);

  // Component coverage (both components needed for full confidence)
  const componentCoverage =
    (components.moodStability !== null ? 0.5 : 0) +
    (components.engagementConsistency !== null ? 0.5 : 0);

  // Weighted: 60% data volume, 40% component coverage
  return dataConfidence * 0.6 + componentCoverage * 0.4;
}

/**
 * Get previous ERS score for delta calculation
 */
async function getPreviousScore(userId: string, currentWeekOf: string): Promise<number | null> {
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
 * Main ERS calculation function - SIMPLIFIED FOR MOOD DATA ONLY
 */
export async function calculateERSScore(userId: string): Promise<ERSResult> {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekOf = formatDate(weekStart);

  // Date range: last 14 days for mood analysis
  const endDate = now;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 14);

  // Calculate component scores
  const [moodStability, engagementConsistency] = await Promise.all([
    calculateMoodStabilityScore(userId, startDate, endDate),
    calculateEngagementConsistencyScore(userId, startDate, endDate),
  ]);

  const components: ERSComponentScores = {
    moodStability: moodStability.score,
    engagementConsistency: engagementConsistency.score,
  };

  // Calculate weighted score
  let weightedSum = 0;
  let weightSum = 0;

  if (components.moodStability !== null) {
    weightedSum += components.moodStability * COMPONENT_WEIGHTS.moodStability;
    weightSum += COMPONENT_WEIGHTS.moodStability;
  }

  if (components.engagementConsistency !== null) {
    weightedSum += components.engagementConsistency * COMPONENT_WEIGHTS.engagementConsistency;
    weightSum += COMPONENT_WEIGHTS.engagementConsistency;
  }

  // Normalize to 0-100 scale
  const ersScore = weightSum > 0 ? (weightedSum / weightSum) * 100 : 0;

  // Total mood entries
  const moodEntriesCount = Math.max(moodStability.dataPoints, engagementConsistency.dataPoints);

  // Determine stage and confidence
  const ersStage = determineStage(ersScore);
  const ersConfidence = calculateConfidence(moodEntriesCount, components);

  // Get previous score for delta
  const previousScore = await getPreviousScore(userId, weekOf);
  const ersDelta = previousScore !== null ? ersScore - previousScore : null;

  const result: ERSResult = {
    userId,
    ersScore: Math.round(ersScore * 100) / 100,
    ersStage,
    ersConfidence: Math.round(ersConfidence * 100) / 100,
    ersDelta: ersDelta !== null ? Math.round(ersDelta * 100) / 100 : null,
    components,
    moodEntriesCount,
    calculatedAt: now,
    weekOf,
  };

  return result;
}

/**
 * Calculate and store ERS score in database
 */
export async function calculateAndStoreERSScore(userId: string): Promise<ERSResult> {
  const result = await calculateERSScore(userId);

  // Store in database - using simplified schema
  const { error } = await supabase.from('ers_scores').upsert(
    {
      user_id: result.userId,
      ers_score: result.ersScore,
      ers_stage: result.ersStage,
      ers_confidence: result.ersConfidence,
      ers_delta: result.ersDelta,
      // Map new components to existing columns where possible
      emotional_stability_score: result.components.moodStability,
      engagement_consistency_score: result.components.engagementConsistency,
      // Set unused components to null
      self_reflection_score: null,
      trust_openness_score: null,
      recovery_behavior_score: null,
      social_readiness_score: null,
      data_points_used: result.moodEntriesCount,
      calculation_method: 'v2_mood_focused',
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
export async function calculateERSForAllUsers(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
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
    return processUserBatch(users.map(u => u.user_id));
  }

  return processUserBatch(profiles.map(p => p.user_id));
}

async function processUserBatch(userIds: string[]): Promise<{
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
      await calculateAndStoreERSScore(userId);
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
