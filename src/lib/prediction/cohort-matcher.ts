/**
 * Cohort Matching Algorithm for Paceful
 *
 * This module finds users with similar emotional recovery patterns to enable
 * cohort-based predictions. Users in similar cohorts tend to have comparable
 * outcomes, allowing us to predict future ERS trajectories and recovery milestones.
 *
 * Similarity Weights:
 * - ERS Trajectory Similarity: 40% (most predictive of future outcomes)
 * - Breakup Context Match: 30% (relationship type, duration, initiator)
 * - Behavioral Pattern Match: 20% (engagement, consistency, mood patterns)
 * - Demographics: 10% (age, gender - minimal weight to avoid bias)
 */

import { supabase as defaultSupabase } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Backwards compatibility - functions can be updated to accept supabaseClient parameter
const supabase = defaultSupabase;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ERS score data point with timestamp for trajectory analysis
 */
export interface ERSDataPoint {
  score: number;
  weekOf: Date;
  stage: 'healing' | 'rebuilding' | 'ready';
}

/**
 * User's breakup context for similarity matching
 */
export interface BreakupContext {
  relationshipDurationMonths: number | null;
  timeSinceBreakupDays: number;
  initiatedBy: 'self' | 'partner' | 'mutual' | 'unknown';
  relationshipType: string | null; // 'marriage', 'long-term', 'dating', etc.
}

/**
 * Behavioral metrics derived from user activity
 */
export interface BehavioralMetrics {
  journalEntriesPerWeek: number;
  moodCheckInsPerWeek: number;
  averageMoodVariance: number;
  streakDays: number;
  exerciseCompletionRate: number;
}

/**
 * Basic demographic data (used sparingly to minimize bias)
 */
export interface Demographics {
  ageRange: string | null; // '18-24', '25-34', '35-44', etc.
  gender: string | null;
}

/**
 * Complete user profile for cohort matching
 */
export interface UserProfile {
  userId: string;
  currentERS: number;
  ersTrajectory: ERSDataPoint[];
  breakupContext: BreakupContext;
  behavioralMetrics: BehavioralMetrics;
  demographics: Demographics;
}

/**
 * Similarity scores broken down by component
 */
export interface SimilarityScores {
  trajectoryScore: number;    // 0-1, weighted 40%
  breakupContextScore: number; // 0-1, weighted 30%
  behavioralScore: number;    // 0-1, weighted 20%
  demographicScore: number;   // 0-1, weighted 10%
  compositeScore: number;     // 0-1, final weighted score
}

/**
 * A matched user with their similarity scores
 */
export interface CohortMember {
  userId: string;
  similarity: SimilarityScores;
}

/**
 * Complete cohort result
 */
export interface CohortResult {
  targetUserId: string;
  cohortName: string;
  members: CohortMember[];
  cohortSize: number;
  averageSimilarity: number;
  createdAt: Date;
}

/**
 * Configuration for the cohort matcher
 */
export interface CohortMatcherConfig {
  minCohortSize: number;
  maxCohortSize: number;
  minSimilarityThreshold: number;
  weights: {
    trajectory: number;
    breakupContext: number;
    behavioral: number;
    demographic: number;
  };
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CohortMatcherConfig = {
  minCohortSize: 50,
  maxCohortSize: 200,
  minSimilarityThreshold: 0.5, // Minimum 50% similarity to be included
  weights: {
    trajectory: 0.40,
    breakupContext: 0.30,
    behavioral: 0.20,
    demographic: 0.10,
  },
};

// ============================================================================
// SIMILARITY ALGORITHMS
// ============================================================================

/**
 * Calculate cosine similarity between two vectors.
 *
 * Cosine similarity measures the angle between two vectors, making it ideal
 * for comparing trajectories regardless of absolute values. A score of 1
 * means identical direction, 0 means orthogonal, -1 means opposite.
 *
 * @param vectorA - First vector of numbers
 * @param vectorB - Second vector of numbers
 * @returns Similarity score between -1 and 1, normalized to 0-1 for our use
 */
function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  // Ensure vectors are the same length
  const minLength = Math.min(vectorA.length, vectorB.length);
  if (minLength === 0) return 0;

  const a = vectorA.slice(0, minLength);
  const b = vectorB.slice(0, minLength);

  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < minLength; i++) {
    dotProduct += a[i] * b[i];
  }

  // Calculate magnitudes
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  // Calculate cosine similarity and normalize from [-1, 1] to [0, 1]
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  return (similarity + 1) / 2;
}

/**
 * Calculate Euclidean distance between two points, normalized to similarity.
 *
 * Euclidean distance measures the straight-line distance between two points.
 * We normalize it to a 0-1 similarity score where 1 = identical, 0 = very different.
 *
 * @param valueA - First value
 * @param valueB - Second value
 * @param maxDistance - Maximum expected distance for normalization
 * @returns Similarity score between 0 and 1
 */
function euclideanSimilarity(valueA: number, valueB: number, maxDistance: number): number {
  const distance = Math.abs(valueA - valueB);
  // Convert distance to similarity: 1 when distance=0, 0 when distance>=maxDistance
  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * Calculate similarity for categorical values.
 *
 * Returns 1 for exact match, 0.5 for partial/related match, 0 for no match.
 *
 * @param valueA - First categorical value
 * @param valueB - Second categorical value
 * @param relatedValues - Optional map of related values for partial matching
 * @returns Similarity score: 1 (exact), 0.5 (related), or 0 (different)
 */
function categoricalSimilarity(
  valueA: string | null,
  valueB: string | null,
  relatedValues?: Map<string, string[]>
): number {
  // Both null = match, one null = no match
  if (valueA === null && valueB === null) return 1;
  if (valueA === null || valueB === null) return 0;

  // Exact match
  if (valueA.toLowerCase() === valueB.toLowerCase()) return 1;

  // Check for related values
  if (relatedValues) {
    const relatedA = relatedValues.get(valueA.toLowerCase()) || [];
    const relatedB = relatedValues.get(valueB.toLowerCase()) || [];

    if (relatedA.includes(valueB.toLowerCase()) || relatedB.includes(valueA.toLowerCase())) {
      return 0.5;
    }
  }

  return 0;
}

// ============================================================================
// COMPONENT SIMILARITY CALCULATORS
// ============================================================================

/**
 * Calculate ERS trajectory similarity between two users.
 *
 * This is the most important similarity metric (40% weight) because users
 * with similar recovery trajectories tend to have similar future outcomes.
 *
 * We analyze:
 * 1. Shape of the trajectory (direction changes, trends) using cosine similarity
 * 2. Current ERS proximity using Euclidean distance
 * 3. Trajectory volatility (how much scores fluctuate)
 */
function calculateTrajectorySimilarity(
  profileA: UserProfile,
  profileB: UserProfile
): number {
  // Extract score arrays from trajectories
  const scoresA = profileA.ersTrajectory.map(p => p.score);
  const scoresB = profileB.ersTrajectory.map(p => p.score);

  // 1. Trajectory shape similarity (cosine similarity)
  // Weight: 50% of trajectory score
  const shapeSimilarity = cosineSimilarity(scoresA, scoresB);

  // 2. Current ERS proximity (Euclidean distance, max distance = 100)
  // Weight: 30% of trajectory score
  const currentSimilarity = euclideanSimilarity(
    profileA.currentERS,
    profileB.currentERS,
    100 // ERS ranges from 0-100
  );

  // 3. Trajectory volatility similarity
  // Weight: 20% of trajectory score
  const volatilityA = calculateVolatility(scoresA);
  const volatilityB = calculateVolatility(scoresB);
  const volatilitySimilarity = euclideanSimilarity(volatilityA, volatilityB, 30);

  return (
    shapeSimilarity * 0.5 +
    currentSimilarity * 0.3 +
    volatilitySimilarity * 0.2
  );
}

/**
 * Calculate the volatility (standard deviation) of a score array.
 * Higher volatility means more emotional fluctuation.
 */
function calculateVolatility(scores: number[]): number {
  if (scores.length < 2) return 0;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;

  return Math.sqrt(variance);
}

/**
 * Calculate breakup context similarity between two users.
 *
 * This is the second most important metric (30% weight) because similar
 * breakup circumstances often lead to similar recovery patterns.
 *
 * We analyze:
 * 1. Relationship duration similarity
 * 2. Time since breakup similarity
 * 3. Who initiated (categorical)
 * 4. Relationship type (categorical)
 */
function calculateBreakupContextSimilarity(
  profileA: UserProfile,
  profileB: UserProfile
): number {
  const ctxA = profileA.breakupContext;
  const ctxB = profileB.breakupContext;

  // 1. Relationship duration similarity
  // Max difference considered: 60 months (5 years)
  // Weight: 25% of context score
  const durationSimilarity = ctxA.relationshipDurationMonths !== null && ctxB.relationshipDurationMonths !== null
    ? euclideanSimilarity(ctxA.relationshipDurationMonths, ctxB.relationshipDurationMonths, 60)
    : 0.5; // Neutral if unknown

  // 2. Time since breakup similarity
  // Max difference considered: 365 days (1 year)
  // Weight: 30% of context score
  const timeSimilarity = euclideanSimilarity(
    ctxA.timeSinceBreakupDays,
    ctxB.timeSinceBreakupDays,
    365
  );

  // 3. Initiator match
  // Weight: 25% of context score
  const initiatorSimilarity = categoricalSimilarity(ctxA.initiatedBy, ctxB.initiatedBy);

  // 4. Relationship type match
  // Weight: 20% of context score
  const relationshipTypeRelations = new Map<string, string[]>([
    ['marriage', ['long-term', 'engaged']],
    ['engaged', ['marriage', 'long-term']],
    ['long-term', ['marriage', 'engaged', 'dating']],
    ['dating', ['long-term', 'casual']],
    ['casual', ['dating']],
  ]);
  const typeSimilarity = categoricalSimilarity(
    ctxA.relationshipType,
    ctxB.relationshipType,
    relationshipTypeRelations
  );

  return (
    durationSimilarity * 0.25 +
    timeSimilarity * 0.30 +
    initiatorSimilarity * 0.25 +
    typeSimilarity * 0.20
  );
}

/**
 * Calculate behavioral pattern similarity between two users.
 *
 * Behavioral patterns indicate engagement level and coping style.
 * Weight: 20%
 *
 * We analyze:
 * 1. Journal frequency
 * 2. Mood check-in frequency
 * 3. Mood variance (emotional stability)
 * 4. Streak consistency
 * 5. Exercise engagement
 */
function calculateBehavioralSimilarity(
  profileA: UserProfile,
  profileB: UserProfile
): number {
  const metricsA = profileA.behavioralMetrics;
  const metricsB = profileB.behavioralMetrics;

  // 1. Journal frequency similarity (max diff: 7 per week)
  const journalSimilarity = euclideanSimilarity(
    metricsA.journalEntriesPerWeek,
    metricsB.journalEntriesPerWeek,
    7
  );

  // 2. Mood check-in frequency similarity (max diff: 14 per week)
  const moodFreqSimilarity = euclideanSimilarity(
    metricsA.moodCheckInsPerWeek,
    metricsB.moodCheckInsPerWeek,
    14
  );

  // 3. Mood variance similarity (max diff: 5 on 1-10 scale)
  const varianceSimilarity = euclideanSimilarity(
    metricsA.averageMoodVariance,
    metricsB.averageMoodVariance,
    5
  );

  // 4. Streak similarity (max diff: 30 days)
  const streakSimilarity = euclideanSimilarity(
    metricsA.streakDays,
    metricsB.streakDays,
    30
  );

  // 5. Exercise completion rate similarity (0-1 scale)
  const exerciseSimilarity = euclideanSimilarity(
    metricsA.exerciseCompletionRate,
    metricsB.exerciseCompletionRate,
    1
  );

  return (
    journalSimilarity * 0.25 +
    moodFreqSimilarity * 0.20 +
    varianceSimilarity * 0.25 +
    streakSimilarity * 0.15 +
    exerciseSimilarity * 0.15
  );
}

/**
 * Calculate demographic similarity between two users.
 *
 * Demographics have the lowest weight (10%) to minimize bias while still
 * acknowledging that age and gender can influence recovery patterns.
 */
function calculateDemographicSimilarity(
  profileA: UserProfile,
  profileB: UserProfile
): number {
  const demoA = profileA.demographics;
  const demoB = profileB.demographics;

  // Age range similarity with related values
  const ageRelations = new Map<string, string[]>([
    ['18-24', ['25-34']],
    ['25-34', ['18-24', '35-44']],
    ['35-44', ['25-34', '45-54']],
    ['45-54', ['35-44', '55-64']],
    ['55-64', ['45-54', '65+']],
    ['65+', ['55-64']],
  ]);
  const ageSimilarity = categoricalSimilarity(demoA.ageRange, demoB.ageRange, ageRelations);

  // Gender similarity (exact match only for now)
  const genderSimilarity = categoricalSimilarity(demoA.gender, demoB.gender);

  return ageSimilarity * 0.6 + genderSimilarity * 0.4;
}

// ============================================================================
// MAIN COHORT MATCHER CLASS
// ============================================================================

/**
 * CohortMatcher finds and manages user cohorts based on similarity scores.
 *
 * Usage:
 * ```typescript
 * const matcher = new CohortMatcher();
 * const cohort = await matcher.findCohort(targetUserId);
 * ```
 */
export class CohortMatcher {
  private config: CohortMatcherConfig;

  constructor(config: Partial<CohortMatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate complete similarity scores between two user profiles.
   */
  calculateSimilarity(profileA: UserProfile, profileB: UserProfile): SimilarityScores {
    const trajectoryScore = calculateTrajectorySimilarity(profileA, profileB);
    const breakupContextScore = calculateBreakupContextSimilarity(profileA, profileB);
    const behavioralScore = calculateBehavioralSimilarity(profileA, profileB);
    const demographicScore = calculateDemographicSimilarity(profileA, profileB);

    // Calculate weighted composite score
    const compositeScore =
      trajectoryScore * this.config.weights.trajectory +
      breakupContextScore * this.config.weights.breakupContext +
      behavioralScore * this.config.weights.behavioral +
      demographicScore * this.config.weights.demographic;

    return {
      trajectoryScore,
      breakupContextScore,
      behavioralScore,
      demographicScore,
      compositeScore,
    };
  }

  /**
   * Fetch user profile data from the database.
   */
  async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Fetch profile and breakup context
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          date_of_birth,
          gender,
          relationship_ended_at,
          relationship_duration_months,
          relationship_type,
          breakup_initiated_by
        `)
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) return null;

      // Fetch current ERS and trajectory (last 8 weeks)
      const { data: ersData, error: ersError } = await supabase
        .from('ers_scores')
        .select('ers_score, ers_stage, week_of')
        .eq('user_id', userId)
        .order('week_of', { ascending: false })
        .limit(8);

      if (ersError) return null;

      // Fetch behavioral metrics
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak_days')
        .eq('user_id', userId)
        .single();

      // Calculate weekly averages for journals and moods
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { count: journalCount } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', fourWeeksAgo.toISOString());

      const { count: moodCount } = await supabase
        .from('mood_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', fourWeeksAgo.toISOString());

      // Fetch mood variance
      const { data: varianceData } = await supabase
        .from('mood_variance_stats')
        .select('mood_variance')
        .eq('user_id', userId)
        .order('week_of', { ascending: false })
        .limit(1)
        .single();

      // Fetch exercise completion rate
      const { count: exerciseCompletions } = await supabase
        .from('exercise_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', fourWeeksAgo.toISOString());

      // Calculate age range from date of birth
      let ageRange: string | null = null;
      if (profile.date_of_birth) {
        const age = Math.floor(
          (Date.now() - new Date(profile.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
        );
        if (age < 25) ageRange = '18-24';
        else if (age < 35) ageRange = '25-34';
        else if (age < 45) ageRange = '35-44';
        else if (age < 55) ageRange = '45-54';
        else if (age < 65) ageRange = '55-64';
        else ageRange = '65+';
      }

      // Calculate time since breakup
      const timeSinceBreakup = profile.relationship_ended_at
        ? Math.floor((Date.now() - new Date(profile.relationship_ended_at).getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      // Build user profile
      const userProfile: UserProfile = {
        userId,
        currentERS: ersData?.[0]?.ers_score ?? 50,
        ersTrajectory: (ersData || []).map(e => ({
          score: e.ers_score,
          weekOf: new Date(e.week_of),
          stage: e.ers_stage as 'healing' | 'rebuilding' | 'ready',
        })),
        breakupContext: {
          relationshipDurationMonths: profile.relationship_duration_months,
          timeSinceBreakupDays: timeSinceBreakup,
          initiatedBy: (profile.breakup_initiated_by as 'self' | 'partner' | 'mutual') || 'unknown',
          relationshipType: profile.relationship_type,
        },
        behavioralMetrics: {
          journalEntriesPerWeek: (journalCount || 0) / 4,
          moodCheckInsPerWeek: (moodCount || 0) / 4,
          averageMoodVariance: varianceData?.mood_variance ?? 2,
          streakDays: streakData?.current_streak_days ?? 0,
          exerciseCompletionRate: Math.min((exerciseCompletions || 0) / 12, 1), // Assume 3/week target
        },
        demographics: {
          ageRange,
          gender: profile.gender,
        },
      };

      return userProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Find a cohort of similar users for the target user.
   *
   * @param targetUserId - The user to find a cohort for
   * @returns CohortResult with ranked similar users
   */
  async findCohort(targetUserId: string): Promise<CohortResult | null> {
    // Fetch target user's profile
    const targetProfile = await this.fetchUserProfile(targetUserId);
    if (!targetProfile) {
      console.error('Could not fetch target user profile');
      return null;
    }

    // Fetch all potential cohort members (users with ERS data)
    const { data: potentialMembers, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true)
      .neq('id', targetUserId)
      .limit(1000); // Consider pagination for larger user bases

    if (error || !potentialMembers) {
      console.error('Error fetching potential cohort members:', error);
      return null;
    }

    // Calculate similarity for each potential member
    const cohortMembers: CohortMember[] = [];

    for (const member of potentialMembers) {
      const memberProfile = await this.fetchUserProfile(member.id);
      if (!memberProfile) continue;

      // Skip users with insufficient data
      if (memberProfile.ersTrajectory.length < 2) continue;

      const similarity = this.calculateSimilarity(targetProfile, memberProfile);

      // Only include if above threshold
      if (similarity.compositeScore >= this.config.minSimilarityThreshold) {
        cohortMembers.push({
          userId: member.id,
          similarity,
        });
      }
    }

    // Sort by composite similarity score (descending)
    cohortMembers.sort((a, b) => b.similarity.compositeScore - a.similarity.compositeScore);

    // Trim to max cohort size
    const finalMembers = cohortMembers.slice(0, this.config.maxCohortSize);

    // Check if we have minimum cohort size
    if (finalMembers.length < this.config.minCohortSize) {
      console.warn(`Cohort size (${finalMembers.length}) below minimum (${this.config.minCohortSize})`);
    }

    // Calculate average similarity
    const averageSimilarity = finalMembers.length > 0
      ? finalMembers.reduce((sum, m) => sum + m.similarity.compositeScore, 0) / finalMembers.length
      : 0;

    const cohortResult: CohortResult = {
      targetUserId,
      cohortName: `cohort_${targetUserId.slice(0, 8)}_${Date.now()}`,
      members: finalMembers,
      cohortSize: finalMembers.length,
      averageSimilarity,
      createdAt: new Date(),
    };

    // Store cohort in database
    await this.storeCohort(cohortResult);

    return cohortResult;
  }

  /**
   * Store cohort results in the prediction_cohorts table.
   */
  async storeCohort(cohort: CohortResult): Promise<void> {
    try {
      const { error } = await supabase.from('prediction_cohorts').insert({
        user_id: cohort.targetUserId,
        cohort_name: cohort.cohortName,
        cohort_size: cohort.cohortSize,
        similarity_score: cohort.averageSimilarity,
        cohort_users: cohort.members.map(m => m.userId),
        cohort_metadata: {
          memberDetails: cohort.members.slice(0, 10).map(m => ({
            userId: m.userId,
            similarity: m.similarity.compositeScore,
            trajectoryScore: m.similarity.trajectoryScore,
            breakupScore: m.similarity.breakupContextScore,
          })),
          config: this.config,
        },
        created_at: cohort.createdAt.toISOString(),
      });

      if (error) {
        console.error('Error storing cohort:', error);
      }
    } catch (error) {
      console.error('Error storing cohort:', error);
    }
  }

  /**
   * Retrieve an existing cohort for a user.
   */
  async getExistingCohort(userId: string): Promise<CohortResult | null> {
    const { data, error } = await supabase
      .from('prediction_cohorts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      targetUserId: data.user_id,
      cohortName: data.cohort_name,
      members: (data.cohort_users || []).map((id: string) => ({
        userId: id,
        similarity: { compositeScore: data.similarity_score } as SimilarityScores,
      })),
      cohortSize: data.cohort_size,
      averageSimilarity: data.similarity_score,
      createdAt: new Date(data.created_at),
    };
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Create a cohort matcher with default configuration.
 */
export function createCohortMatcher(config?: Partial<CohortMatcherConfig>): CohortMatcher {
  return new CohortMatcher(config);
}

/**
 * Quick function to find a cohort for a user.
 */
export async function findUserCohort(userId: string): Promise<CohortResult | null> {
  const matcher = new CohortMatcher();
  return matcher.findCohort(userId);
}

export default CohortMatcher;
