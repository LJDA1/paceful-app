/**
 * Data Anonymizer for Paceful B2B API
 *
 * Provides functions to anonymize user data and generate
 * aggregate statistics for B2B partners.
 */

import { createHash } from 'crypto';
import { supabase as defaultSupabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Backwards compatibility - functions can be updated to accept supabaseClient parameter
const supabase = defaultSupabase;

// ============================================================================
// Types
// ============================================================================

export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '56+' | 'unknown';
export type Gender = 'male' | 'female' | 'non-binary' | 'other' | 'prefer_not_to_say' | 'unknown';

export interface AnonymizedUser {
  anonymousId: string;
  ageRange: AgeRange;
  gender: Gender;
  country: string | null;
  createdAt: string;
}

export interface AnonymizedERSData {
  anonymousUserId: string;
  ersScore: number;
  ersStage: 'healing' | 'rebuilding' | 'ready';
  ersConfidence: number;
  weekOf: string;
  calculatedAt: string;
}

export interface AnonymizedMoodData {
  anonymousUserId: string;
  moodValue: number;
  moodLabel: string | null;
  emotions: string[];
  loggedAt: string;
}

export interface StageDistribution {
  healing: number;
  rebuilding: number;
  ready: number;
}

export interface DemographicStats {
  ageRange: AgeRange;
  count: number;
  avgErsScore: number;
  stageDistribution: StageDistribution;
}

export interface AggregateStats {
  period: {
    start: string;
    end: string;
  };
  totalUsers: number;
  activeUsers: number;
  avgErsScore: number;
  medianErsScore: number;
  stageDistribution: StageDistribution;
  demographics: {
    byAge: DemographicStats[];
    byGender: Array<{
      gender: Gender;
      count: number;
      avgErsScore: number;
    }>;
  };
  moodTrends: Array<{
    date: string;
    avgMood: number;
    entryCount: number;
  }>;
  dataQuality: {
    usersWithMinMoodEntries: number;
    avgMoodEntriesPerUser: number;
    usersWithErsScore: number;
  };
  sampleSize: number;
  generatedAt: string;
}

// ============================================================================
// Anonymization Functions
// ============================================================================

/**
 * Hash a user ID to create an anonymous identifier
 * Uses SHA-256 with a salt for security
 */
export function hashUserId(userId: string, salt: string = 'paceful_b2b_2025'): string {
  return createHash('sha256')
    .update(`${userId}:${salt}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Calculate age range from date of birth
 */
export function calculateAgeRange(dateOfBirth: string | null): AgeRange {
  if (!dateOfBirth) return 'unknown';

  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 18) return '18-25'; // Group minors with youngest adult group
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  return '56+';
}

/**
 * Normalize gender value to standard categories
 */
export function normalizeGender(gender: string | null): Gender {
  if (!gender) return 'unknown';

  const normalized = gender.toLowerCase().trim();

  if (normalized === 'male' || normalized === 'm') return 'male';
  if (normalized === 'female' || normalized === 'f') return 'female';
  if (normalized === 'non-binary' || normalized === 'nonbinary' || normalized === 'nb') return 'non-binary';
  if (normalized === 'prefer_not_to_say' || normalized === 'prefer not to say') return 'prefer_not_to_say';
  if (normalized === 'other') return 'other';

  return 'unknown';
}

/**
 * Anonymize a single user record
 */
export function anonymizeUser(user: {
  id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  country?: string | null;
  created_at?: string;
}): AnonymizedUser {
  return {
    anonymousId: hashUserId(user.id),
    ageRange: calculateAgeRange(user.date_of_birth || null),
    gender: normalizeGender(user.gender || null),
    country: user.country || null,
    createdAt: user.created_at || new Date().toISOString(),
  };
}

/**
 * Anonymize ERS score data
 */
export function anonymizeERSData(ersData: {
  user_id: string;
  ers_score: number;
  ers_stage: string;
  ers_confidence: number;
  week_of: string;
  calculated_at: string;
}): AnonymizedERSData {
  return {
    anonymousUserId: hashUserId(ersData.user_id),
    ersScore: ersData.ers_score,
    ersStage: ersData.ers_stage as 'healing' | 'rebuilding' | 'ready',
    ersConfidence: ersData.ers_confidence,
    weekOf: ersData.week_of,
    calculatedAt: ersData.calculated_at,
  };
}

/**
 * Anonymize mood entry data
 */
export function anonymizeMoodData(moodData: {
  user_id: string;
  mood_value: number;
  mood_label?: string | null;
  emotions?: string[] | null;
  logged_at: string;
}): AnonymizedMoodData {
  return {
    anonymousUserId: hashUserId(moodData.user_id),
    moodValue: moodData.mood_value,
    moodLabel: moodData.mood_label || null,
    emotions: moodData.emotions || [],
    loggedAt: moodData.logged_at,
  };
}

// ============================================================================
// Aggregate Statistics Functions
// ============================================================================

/**
 * Calculate median from an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate stage distribution from ERS scores
 */
function calculateStageDistribution(ersScores: Array<{ ers_stage: string }>): StageDistribution {
  const total = ersScores.length;
  if (total === 0) {
    return { healing: 0, rebuilding: 0, ready: 0 };
  }

  const counts = {
    healing: 0,
    rebuilding: 0,
    ready: 0,
  };

  ersScores.forEach((score) => {
    const stage = score.ers_stage as keyof typeof counts;
    if (stage in counts) {
      counts[stage]++;
    }
  });

  return {
    healing: Math.round((counts.healing / total) * 100),
    rebuilding: Math.round((counts.rebuilding / total) * 100),
    ready: Math.round((counts.ready / total) * 100),
  };
}

/**
 * Generate aggregate statistics for B2B API
 */
export async function generateAggregateStats(
  startDate: Date,
  endDate: Date
): Promise<AggregateStats> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Fetch all users with profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, date_of_birth, gender, country, created_at');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  const users = profiles || [];
  const totalUsers = users.length;

  // Fetch active users (mood entry in period)
  const { data: activeMoods } = await supabase
    .from('mood_entries')
    .select('user_id')
    .gte('logged_at', startISO)
    .lte('logged_at', endISO);

  const activeUserIds = new Set((activeMoods || []).map((m) => m.user_id));
  const activeUsers = activeUserIds.size;

  // Fetch latest ERS scores
  const { data: ersScores } = await supabase
    .from('ers_scores')
    .select('user_id, ers_score, ers_stage, ers_confidence, week_of, calculated_at')
    .order('calculated_at', { ascending: false });

  type ERSScoreRow = {
    user_id: string;
    ers_score: number;
    ers_stage: string;
    ers_confidence: number;
    week_of: string;
    calculated_at: string;
  };

  // Get latest score per user
  const latestScoresByUser = new Map<string, ERSScoreRow>();
  ((ersScores || []) as ERSScoreRow[]).forEach((score) => {
    if (!latestScoresByUser.has(score.user_id)) {
      latestScoresByUser.set(score.user_id, score);
    }
  });

  const latestScores = Array.from(latestScoresByUser.values());
  const allErsValues = latestScores.map((s) => s.ers_score);

  // Calculate average and median ERS
  const avgErsScore = allErsValues.length > 0
    ? Math.round((allErsValues.reduce((a, b) => a + b, 0) / allErsValues.length) * 100) / 100
    : 0;
  const medianErsScore = Math.round(calculateMedian(allErsValues) * 100) / 100;

  // Stage distribution
  const stageDistribution = calculateStageDistribution(latestScores);

  // Demographics by age
  const ageGroups: Record<AgeRange, { scores: number[]; stages: string[] }> = {
    '18-25': { scores: [], stages: [] },
    '26-35': { scores: [], stages: [] },
    '36-45': { scores: [], stages: [] },
    '46-55': { scores: [], stages: [] },
    '56+': { scores: [], stages: [] },
    'unknown': { scores: [], stages: [] },
  };

  users.forEach((user) => {
    const ageRange = calculateAgeRange(user.date_of_birth);
    const userScore = latestScoresByUser.get(user.user_id);
    if (userScore) {
      ageGroups[ageRange].scores.push(userScore.ers_score);
      ageGroups[ageRange].stages.push(userScore.ers_stage);
    }
  });

  const demographicsByAge: DemographicStats[] = Object.entries(ageGroups)
    .filter(([_, data]) => data.scores.length > 0)
    .map(([ageRange, data]) => ({
      ageRange: ageRange as AgeRange,
      count: data.scores.length,
      avgErsScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100,
      stageDistribution: calculateStageDistribution(data.stages.map((s) => ({ ers_stage: s }))),
    }));

  // Demographics by gender
  const genderGroups: Record<Gender, number[]> = {
    'male': [],
    'female': [],
    'non-binary': [],
    'other': [],
    'prefer_not_to_say': [],
    'unknown': [],
  };

  users.forEach((user) => {
    const gender = normalizeGender(user.gender);
    const userScore = latestScoresByUser.get(user.user_id);
    if (userScore) {
      genderGroups[gender].push(userScore.ers_score);
    }
  });

  const demographicsByGender = Object.entries(genderGroups)
    .filter(([_, scores]) => scores.length > 0)
    .map(([gender, scores]) => ({
      gender: gender as Gender,
      count: scores.length,
      avgErsScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    }));

  // Mood trends (daily averages in period)
  const { data: moodEntries } = await supabase
    .from('mood_entries')
    .select('mood_value, logged_at')
    .gte('logged_at', startISO)
    .lte('logged_at', endISO)
    .order('logged_at', { ascending: true });

  const moodsByDay = new Map<string, number[]>();
  (moodEntries || []).forEach((entry) => {
    const day = entry.logged_at.split('T')[0];
    if (!moodsByDay.has(day)) {
      moodsByDay.set(day, []);
    }
    moodsByDay.get(day)!.push(entry.mood_value);
  });

  const moodTrends = Array.from(moodsByDay.entries()).map(([date, moods]) => ({
    date,
    avgMood: Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 100) / 100,
    entryCount: moods.length,
  }));

  // Data quality metrics
  const moodCountByUser = new Map<string, number>();
  (moodEntries || []).forEach((entry) => {
    // We need user_id from a separate query for this
  });

  // Fetch mood counts per user
  const { data: moodCounts } = await supabase
    .from('mood_entries')
    .select('user_id')
    .gte('logged_at', startISO)
    .lte('logged_at', endISO);

  const userMoodCounts = new Map<string, number>();
  (moodCounts || []).forEach((entry) => {
    userMoodCounts.set(entry.user_id, (userMoodCounts.get(entry.user_id) || 0) + 1);
  });

  const usersWithMinMoodEntries = Array.from(userMoodCounts.values()).filter((count) => count >= 7).length;
  const totalMoodEntries = Array.from(userMoodCounts.values()).reduce((a, b) => a + b, 0);
  const avgMoodEntriesPerUser = userMoodCounts.size > 0
    ? Math.round((totalMoodEntries / userMoodCounts.size) * 100) / 100
    : 0;

  return {
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    totalUsers,
    activeUsers,
    avgErsScore,
    medianErsScore,
    stageDistribution,
    demographics: {
      byAge: demographicsByAge,
      byGender: demographicsByGender,
    },
    moodTrends,
    dataQuality: {
      usersWithMinMoodEntries,
      avgMoodEntriesPerUser,
      usersWithErsScore: latestScores.length,
    },
    sampleSize: latestScores.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get anonymized individual records for research partners
 * (More detailed data with proper consent)
 */
export async function getAnonymizedDataset(
  startDate: Date,
  endDate: Date,
  options: {
    includeERS?: boolean;
    includeMoods?: boolean;
    sampleSize?: number;
  } = {}
): Promise<{
  users: AnonymizedUser[];
  ersData?: AnonymizedERSData[];
  moodData?: AnonymizedMoodData[];
}> {
  const { includeERS = true, includeMoods = true, sampleSize } = options;

  // Fetch users
  let usersQuery = supabase
    .from('profiles')
    .select('user_id, date_of_birth, gender, country, created_at')
    .eq('research_consent', true); // Only users who consented to research

  if (sampleSize) {
    usersQuery = usersQuery.limit(sampleSize);
  }

  const { data: profiles } = await usersQuery;
  const users = (profiles || []).map((p) => anonymizeUser({
    id: p.user_id,
    date_of_birth: p.date_of_birth,
    gender: p.gender,
    country: p.country,
    created_at: p.created_at,
  }));

  const userIds = (profiles || []).map((p) => p.user_id);
  const result: {
    users: AnonymizedUser[];
    ersData?: AnonymizedERSData[];
    moodData?: AnonymizedMoodData[];
  } = { users };

  if (includeERS && userIds.length > 0) {
    const { data: ersScores } = await supabase
      .from('ers_scores')
      .select('user_id, ers_score, ers_stage, ers_confidence, week_of, calculated_at')
      .in('user_id', userIds)
      .gte('calculated_at', startDate.toISOString())
      .lte('calculated_at', endDate.toISOString());

    result.ersData = (ersScores || []).map(anonymizeERSData);
  }

  if (includeMoods && userIds.length > 0) {
    const { data: moods } = await supabase
      .from('mood_entries')
      .select('user_id, mood_value, mood_label, emotions, logged_at')
      .in('user_id', userIds)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString());

    result.moodData = (moods || []).map(anonymizeMoodData);
  }

  return result;
}
