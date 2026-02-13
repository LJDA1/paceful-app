import { supabase } from './supabase';

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
// Component Calculators
// ============================================================================

/**
 * Calculate Emotional Stability score from mood variance
 * Lower variance = more stable = higher score
 */
async function calculateEmotionalStabilityScore(
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
 * Score based on: frequency, depth (word count), variety (sentiments/tags)
 */
async function calculateSelfReflectionScore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ score: number | null; dataPoints: number }> {
  const { data: journals, error } = await supabase
    .from('journal_entries')
    .select('entry_content, sentiment, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error || !journals || journals.length < MIN_JOURNAL_ENTRIES) {
    return { score: null, dataPoints: journals?.length || 0 };
  }

  const totalDays = 14; // We're looking at 14-day window

  // Frequency score: (entries_count / 14) * 40, capped at 40
  const frequencyScore = Math.min(40, (journals.length / totalDays) * 40);

  // Depth score: based on average word count
  const wordCounts = journals.map(j => (j.entry_content || '').split(/\s+/).filter(Boolean).length);
  const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  let depthScore = 5;
  if (avgWordCount >= 100) depthScore = 30;
  else if (avgWordCount >= 50) depthScore = 20;
  else if (avgWordCount >= 20) depthScore = 15;

  // Variety score: count distinct sentiments
  const sentiments = new Set(journals.map(j => j.sentiment).filter(Boolean));
  let varietyScore = 0;
  if (sentiments.size >= 3) varietyScore = 30;
  else if (sentiments.size === 2) varietyScore = 20;
  else if (sentiments.size === 1) varietyScore = 10;

  // Total score capped at 100
  const totalScore = Math.min(100, frequencyScore + depthScore + varietyScore);
  const normalizedScore = totalScore / 100;

  return { score: normalizedScore, dataPoints: journals.length };
}

/**
 * Calculate Behavioral Engagement score from daily mood logging
 */
async function calculateBehavioralEngagementScore(
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
 * Measures: recovery rate, exercise response, bounce-back speed
 */
async function calculateCopingCapacityScore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ score: number | null; dataPoints: number }> {
  // Get mood entries
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

  // Find low mood entries (score <= 3 on 1-10 scale)
  const lowMoodEntries = moods.filter(m => m.mood_value <= 3);

  // If no low moods, default to 50 (absence of lows is positive but neutral)
  if (lowMoodEntries.length === 0) {
    return { score: 0.5, dataPoints: moods.length };
  }

  let recoveryCount = 0;
  let bounceBackFast = 0;
  let bounceBackSlow = 0;

  // Check recovery after each low mood
  for (const lowMood of lowMoodEntries) {
    const lowMoodTime = new Date(lowMood.logged_at).getTime();

    // Find next mood entry after this low
    const nextMoods = moods.filter(m => {
      const moodTime = new Date(m.logged_at).getTime();
      return moodTime > lowMoodTime;
    });

    if (nextMoods.length > 0) {
      const nextMood = nextMoods[0];
      const hoursUntilNext = (new Date(nextMood.logged_at).getTime() - lowMoodTime) / (1000 * 60 * 60);

      // Did mood improve?
      if (nextMood.mood_value > lowMood.mood_value) {
        recoveryCount++;

        // Bounce-back speed
        if (hoursUntilNext <= 48) {
          bounceBackFast++;
        } else {
          bounceBackSlow++;
        }
      }
    }
  }

  // Recovery rate: (improved / total_low) * 50
  const recoveryRate = (recoveryCount / lowMoodEntries.length) * 50;

  // Check for exercise response (activity_logs with exercise_completed within 24h of low mood)
  let exerciseResponseCount = 0;
  try {
    for (const lowMood of lowMoodEntries) {
      const lowMoodTime = new Date(lowMood.logged_at);
      const dayAfter = new Date(lowMoodTime.getTime() + 24 * 60 * 60 * 1000);

      const { data: exercises } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'exercise_completed')
        .gte('created_at', lowMood.logged_at)
        .lte('created_at', dayAfter.toISOString())
        .limit(1);

      if (exercises && exercises.length > 0) {
        exerciseResponseCount++;
      }
    }
  } catch {
    // Ignore activity_logs errors - table may not exist
  }

  const exerciseResponse = lowMoodEntries.length > 0
    ? (exerciseResponseCount / lowMoodEntries.length) * 30
    : 0;

  // Bounce-back speed score
  let bounceBackScore = 0;
  if (bounceBackFast > 0) bounceBackScore = 20;
  else if (bounceBackSlow > 0) bounceBackScore = 10;

  // Total score capped at 100
  const totalScore = Math.min(100, recoveryRate + exerciseResponse + bounceBackScore);
  const normalizedScore = totalScore / 100;

  return { score: normalizedScore, dataPoints: moods.length };
}

/**
 * Calculate Social Readiness score from self-reported readiness
 */
async function calculateSocialReadinessScore(
  userId: string,
): Promise<{ score: number | null; dataPoints: number }> {
  // Check recovery_trajectories for latest self_reported_readiness
  try {
    const { data: trajectory } = await supabase
      .from('recovery_trajectories')
      .select('self_reported_readiness')
      .eq('user_id', userId)
      .not('self_reported_readiness', 'is', null)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (trajectory?.self_reported_readiness) {
      // Map readiness to score
      const readinessMap: Record<string, number> = {
        'not_at_all': 15,
        'a_little': 35,
        'mostly': 65,
        'completely': 90,
      };

      const score = readinessMap[trajectory.self_reported_readiness] || 30;
      return { score: score / 100, dataPoints: 1 };
    }
  } catch {
    // Table may not exist or query failed
  }

  // Fallback: check mood entries with social-related emotions
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: moods } = await supabase
      .from('mood_entries')
      .select('mood_value, emotions')
      .eq('user_id', userId)
      .gte('logged_at', fourteenDaysAgo.toISOString())
      .order('logged_at', { ascending: true });

    if (moods && moods.length >= 3) {
      // Check for social-related emotions
      const socialEmotions = ['lonely', 'connected', 'isolated', 'supported', 'social'];
      const socialMoods = moods.filter(m => {
        if (!m.emotions) return false;
        const emotions = Array.isArray(m.emotions) ? m.emotions : [];
        return emotions.some((e: string) => socialEmotions.some(se => e.toLowerCase().includes(se)));
      });

      if (socialMoods.length >= 2) {
        // Calculate trend
        const midpoint = Math.floor(socialMoods.length / 2);
        const firstHalf = socialMoods.slice(0, midpoint);
        const secondHalf = socialMoods.slice(midpoint);

        const firstAvg = firstHalf.reduce((a, b) => a + b.mood_value, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b.mood_value, 0) / secondHalf.length;

        if (secondAvg > firstAvg + 0.5) return { score: 0.5, dataPoints: socialMoods.length }; // Trending up
        if (secondAvg < firstAvg - 0.5) return { score: 0.2, dataPoints: socialMoods.length }; // Trending down
        return { score: 0.35, dataPoints: socialMoods.length }; // Stable
      }
    }
  } catch {
    // Ignore errors
  }

  // Default: no data
  return { score: 0.3, dataPoints: 0 };
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
 */
function calculateConfidence(components: ERSComponentScores): number {
  const nonNullCount = Object.values(components).filter(v => v !== null).length;
  return nonNullCount / 5;
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
 * Main ERS calculation function - ALL 5 DIMENSIONS
 */
export async function calculateERSScore(userId: string): Promise<ERSResult> {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekOf = formatDate(weekStart);

  // Date range: last 14 days for analysis
  const endDate = now;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 14);

  // Calculate all component scores in parallel
  const [
    emotionalStability,
    selfReflection,
    behavioralEngagement,
    copingCapacity,
    socialReadiness,
  ] = await Promise.all([
    calculateEmotionalStabilityScore(userId, startDate, endDate),
    calculateSelfReflectionScore(userId, startDate, endDate),
    calculateBehavioralEngagementScore(userId, startDate, endDate),
    calculateCopingCapacityScore(userId, startDate, endDate),
    calculateSocialReadinessScore(userId),
  ]);

  const components: ERSComponentScores = {
    emotionalStability: emotionalStability.score,
    selfReflection: selfReflection.score,
    behavioralEngagement: behavioralEngagement.score,
    copingCapacity: copingCapacity.score,
    socialReadiness: socialReadiness.score,
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
  const ersScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  // Total mood entries for data health
  const moodEntriesCount = Math.max(
    emotionalStability.dataPoints,
    behavioralEngagement.dataPoints,
    copingCapacity.dataPoints
  );

  // Determine stage and confidence
  const ersStage = determineStage(ersScore);
  const ersConfidence = calculateConfidence(components);

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

  // Convert scores to 0-100 scale for storage
  const toStorageScale = (score: number | null): number | null => {
    return score !== null ? Math.round(score * 100 * 100) / 100 : null;
  };

  // Store in database - mapping components to database columns
  const { error } = await supabase.from('ers_scores').upsert(
    {
      user_id: result.userId,
      ers_score: result.ersScore,
      ers_stage: result.ersStage,
      ers_confidence: result.ersConfidence,
      ers_delta: result.ersDelta,
      // Map components to database columns
      emotional_stability_score: toStorageScale(result.components.emotionalStability),
      self_reflection_score: toStorageScale(result.components.selfReflection),
      engagement_consistency_score: toStorageScale(result.components.behavioralEngagement),
      recovery_behavior_score: toStorageScale(result.components.copingCapacity),
      trust_openness_score: toStorageScale(result.components.socialReadiness),
      social_readiness_score: null, // We use trust_openness_score for socialReadiness
      data_points_used: result.moodEntriesCount,
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
