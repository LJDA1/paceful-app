/**
 * Partner ERS Calculator
 *
 * Calculates Emotional Readiness Score (ERS) for partner users.
 * Uses the same algorithm as the consumer app but pulls data from partner tables.
 *
 * ERS Stages:
 * - Healing: 0-35
 * - Rebuilding: 36-65
 * - Ready: 66-100
 *
 * Dimensions (weighted average):
 * - Emotional Stability: 25% (mood variance over 14 days)
 * - Self Reflection: 20% (journal depth and sentiment)
 * - Engagement: 20% (logging frequency)
 * - Coping Capacity: 20% (positive sentiment ratio)
 * - Social Readiness: 15% (trend direction and stability)
 */

import { getSupabaseAdmin } from './partner-auth';

// ============================================================================
// Types
// ============================================================================

export interface ERSDimensions {
  emotional_stability: number;
  self_reflection: number;
  engagement: number;
  coping_capacity: number;
  social_readiness: number;
}

export interface ERSCalculationResult {
  score: number;
  stage: 'healing' | 'rebuilding' | 'ready';
  dimensions: ERSDimensions;
  dataPointsUsed: number;
  calculatedAt: string;
}

interface MoodLog {
  score: number;
  logged_at: string;
}

interface JournalEntry {
  word_count: number;
  sentiment_score: number | null;
  created_at: string;
}

// ============================================================================
// Dimension Calculations
// ============================================================================

/**
 * Calculate emotional stability from mood score variance
 * Lower variance = higher stability = higher score
 */
function calculateEmotionalStability(moodLogs: MoodLog[]): number {
  if (moodLogs.length < 3) {
    return 50; // Default score when insufficient data
  }

  const scores = moodLogs.map(m => m.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Map standard deviation to score (lower stdDev = higher score)
  // stdDev of 0 = 100, stdDev of 2 (high for 1-5 scale) = 0
  const score = Math.max(0, Math.min(100, 100 - (stdDev * 50)));

  // Boost score slightly if average mood is higher
  const avgMoodBonus = ((mean - 1) / 4) * 20; // 0-20 bonus based on average mood
  return Math.min(100, score + avgMoodBonus);
}

/**
 * Calculate self-reflection score from journal entries
 * Based on: entry count, word depth, and sentiment diversity
 */
function calculateSelfReflection(journalEntries: JournalEntry[], daysInPeriod: number): number {
  if (journalEntries.length === 0) {
    return 30; // Base score for no journaling
  }

  // Frequency score (0-40): target is 3+ entries per week
  const entriesPerWeek = (journalEntries.length / daysInPeriod) * 7;
  const frequencyScore = Math.min(40, (entriesPerWeek / 3) * 40);

  // Depth score (0-40): based on average word count
  // Target: 100+ words per entry
  const avgWordCount = journalEntries.reduce((sum, e) => sum + (e.word_count || 0), 0) / journalEntries.length;
  const depthScore = Math.min(40, (avgWordCount / 100) * 40);

  // Sentiment awareness score (0-20): varied sentiment shows self-awareness
  const sentimentScores = journalEntries
    .map(e => e.sentiment_score)
    .filter((s): s is number => s !== null);

  let sentimentScore = 10; // Default
  if (sentimentScores.length >= 2) {
    const sentimentVariance = calculateVariance(sentimentScores);
    // Some variance is good (0.2-0.5 is ideal), too much or too little is not
    if (sentimentVariance >= 0.1 && sentimentVariance <= 0.6) {
      sentimentScore = 20;
    } else if (sentimentVariance > 0.6) {
      sentimentScore = 15;
    }
  }

  return Math.min(100, frequencyScore + depthScore + sentimentScore);
}

/**
 * Calculate engagement score from logging frequency
 */
function calculateEngagement(moodLogs: MoodLog[], journalEntries: JournalEntry[], daysInPeriod: number): number {
  // Mood logging: target is daily (7 per week)
  const moodsPerWeek = (moodLogs.length / daysInPeriod) * 7;
  const moodScore = Math.min(50, (moodsPerWeek / 7) * 50);

  // Journal logging: target is 2-3 per week
  const journalsPerWeek = (journalEntries.length / daysInPeriod) * 7;
  const journalScore = Math.min(50, (journalsPerWeek / 2.5) * 50);

  return Math.min(100, moodScore + journalScore);
}

/**
 * Calculate coping capacity from positive sentiment ratio
 */
function calculateCopingCapacity(journalEntries: JournalEntry[], moodLogs: MoodLog[]): number {
  let score = 50; // Base score

  // Sentiment component (0-50)
  const sentimentScores = journalEntries
    .map(e => e.sentiment_score)
    .filter((s): s is number => s !== null);

  if (sentimentScores.length > 0) {
    // Count positive (> 0.2) vs negative (< -0.2) entries
    const positiveCount = sentimentScores.filter(s => s > 0.2).length;
    const negativeCount = sentimentScores.filter(s => s < -0.2).length;
    const totalCounted = positiveCount + negativeCount;

    if (totalCounted > 0) {
      const positiveRatio = positiveCount / totalCounted;
      // More positive entries = higher coping capacity
      score = 30 + (positiveRatio * 40); // 30-70 range from sentiment
    }
  }

  // Mood trend component (0-30)
  if (moodLogs.length >= 5) {
    const recentMoods = moodLogs.slice(0, 5).map(m => m.score);
    const olderMoods = moodLogs.slice(-5).map(m => m.score);

    const recentAvg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
    const olderAvg = olderMoods.reduce((a, b) => a + b, 0) / olderMoods.length;

    if (recentAvg > olderAvg) {
      score += 15; // Improving mood trend
    } else if (recentAvg === olderAvg) {
      score += 10; // Stable mood
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate social readiness from sentiment trend and stability
 */
function calculateSocialReadiness(
  emotionalStability: number,
  copingCapacity: number,
  moodLogs: MoodLog[]
): number {
  // Base on emotional stability (40% weight)
  let score = emotionalStability * 0.4;

  // Add coping capacity influence (30% weight)
  score += copingCapacity * 0.3;

  // Recent mood trend (30% weight)
  if (moodLogs.length >= 3) {
    const recentMoods = moodLogs.slice(0, 3).map(m => m.score);
    const avgRecentMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;

    // Scale 1-5 mood to 0-30 score contribution
    score += ((avgRecentMood - 1) / 4) * 30;
  } else {
    score += 15; // Default when insufficient data
  }

  return Math.min(100, Math.max(0, score));
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
}

function determineStage(score: number): 'healing' | 'rebuilding' | 'ready' {
  if (score <= 35) return 'healing';
  if (score <= 65) return 'rebuilding';
  return 'ready';
}

// ============================================================================
// Main Calculator
// ============================================================================

/**
 * Calculate ERS for a partner user
 */
export async function calculatePartnerERS(partnerUserId: string): Promise<ERSCalculationResult> {
  const supabase = getSupabaseAdmin();

  // Get data from the last 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch mood logs
  const { data: moodData, error: moodError } = await supabase
    .from('partner_mood_logs')
    .select('score, logged_at')
    .eq('partner_user_id', partnerUserId)
    .gte('logged_at', fourteenDaysAgo)
    .order('logged_at', { ascending: false });

  if (moodError) {
    console.error('Error fetching partner mood logs:', moodError);
  }

  const moodLogs: MoodLog[] = (moodData || []).map(m => ({
    score: m.score,
    logged_at: m.logged_at,
  }));

  // Fetch journal entries
  const { data: journalData, error: journalError } = await supabase
    .from('partner_journal_entries')
    .select('word_count, sentiment_score, created_at')
    .eq('partner_user_id', partnerUserId)
    .gte('created_at', fourteenDaysAgo)
    .order('created_at', { ascending: false });

  if (journalError) {
    console.error('Error fetching partner journal entries:', journalError);
  }

  const journalEntries: JournalEntry[] = (journalData || []).map(j => ({
    word_count: j.word_count || 0,
    sentiment_score: j.sentiment_score,
    created_at: j.created_at,
  }));

  const dataPointsUsed = moodLogs.length + journalEntries.length;
  const daysInPeriod = 14;

  // Calculate individual dimensions
  const emotional_stability = calculateEmotionalStability(moodLogs);
  const self_reflection = calculateSelfReflection(journalEntries, daysInPeriod);
  const engagement = calculateEngagement(moodLogs, journalEntries, daysInPeriod);
  const coping_capacity = calculateCopingCapacity(journalEntries, moodLogs);
  const social_readiness = calculateSocialReadiness(emotional_stability, coping_capacity, moodLogs);

  const dimensions: ERSDimensions = {
    emotional_stability: Math.round(emotional_stability * 10) / 10,
    self_reflection: Math.round(self_reflection * 10) / 10,
    engagement: Math.round(engagement * 10) / 10,
    coping_capacity: Math.round(coping_capacity * 10) / 10,
    social_readiness: Math.round(social_readiness * 10) / 10,
  };

  // Calculate weighted average
  // Emotional Stability: 25%, Self Reflection: 20%, Engagement: 20%, Coping Capacity: 20%, Social Readiness: 15%
  const score =
    emotional_stability * 0.25 +
    self_reflection * 0.20 +
    engagement * 0.20 +
    coping_capacity * 0.20 +
    social_readiness * 0.15;

  const roundedScore = Math.round(score * 10) / 10;
  const stage = determineStage(roundedScore);

  return {
    score: roundedScore,
    stage,
    dimensions,
    dataPointsUsed,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Save ERS score to database
 */
export async function savePartnerERSScore(
  partnerUserId: string,
  result: ERSCalculationResult
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('partner_ers_scores')
    .insert({
      partner_user_id: partnerUserId,
      ers_score: result.score,
      ers_stage: result.stage,
      emotional_stability: result.dimensions.emotional_stability,
      self_reflection: result.dimensions.self_reflection,
      engagement: result.dimensions.engagement,
      coping_capacity: result.dimensions.coping_capacity,
      social_readiness: result.dimensions.social_readiness,
      data_points_used: result.dataPointsUsed,
      calculated_at: result.calculatedAt,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving partner ERS score:', error);
    throw error;
  }

  return data.id;
}

/**
 * Get latest ERS score for a partner user
 */
export async function getLatestPartnerERS(partnerUserId: string): Promise<{
  score: number;
  stage: string;
  dimensions: ERSDimensions;
  calculatedAt: string;
} | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('partner_ers_scores')
    .select('*')
    .eq('partner_user_id', partnerUserId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    score: data.ers_score,
    stage: data.ers_stage,
    dimensions: {
      emotional_stability: data.emotional_stability,
      self_reflection: data.self_reflection,
      engagement: data.engagement,
      coping_capacity: data.coping_capacity,
      social_readiness: data.social_readiness,
    },
    calculatedAt: data.calculated_at,
  };
}

/**
 * Calculate ERS trend comparing current to previous score
 */
export async function getPartnerERSTrend(partnerUserId: string): Promise<{
  direction: 'improving' | 'stable' | 'declining';
  weeklyChange: number;
  daysTracked: number;
}> {
  const supabase = getSupabaseAdmin();

  // Get the two most recent scores
  const { data: scores, error } = await supabase
    .from('partner_ers_scores')
    .select('ers_score, calculated_at')
    .eq('partner_user_id', partnerUserId)
    .order('calculated_at', { ascending: false })
    .limit(2);

  if (error || !scores || scores.length === 0) {
    return { direction: 'stable', weeklyChange: 0, daysTracked: 0 };
  }

  // Calculate days tracked from first mood log
  const { data: firstMood } = await supabase
    .from('partner_mood_logs')
    .select('logged_at')
    .eq('partner_user_id', partnerUserId)
    .order('logged_at', { ascending: true })
    .limit(1)
    .single();

  const daysTracked = firstMood
    ? Math.floor((Date.now() - new Date(firstMood.logged_at).getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  if (scores.length < 2) {
    return { direction: 'stable', weeklyChange: 0, daysTracked };
  }

  const currentScore = scores[0].ers_score;
  const previousScore = scores[1].ers_score;
  const weeklyChange = Math.round((currentScore - previousScore) * 10) / 10;

  let direction: 'improving' | 'stable' | 'declining' = 'stable';
  if (weeklyChange > 2) {
    direction = 'improving';
  } else if (weeklyChange < -2) {
    direction = 'declining';
  }

  return { direction, weeklyChange, daysTracked };
}
