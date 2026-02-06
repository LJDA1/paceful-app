/**
 * Timeline Prediction Engine for Paceful
 *
 * This module predicts when users will reach emotional recovery milestones
 * based on outcomes from their similarity cohort. By analyzing when similar
 * users reached the Rebuilding and Ready stages, we can provide personalized
 * timeline predictions with confidence intervals.
 *
 * Statistical Methods:
 * - Kaplan-Meier survival analysis for milestone probability curves
 * - Percentile calculations for median/fastest/slowest times
 * - Bootstrap confidence intervals for probability estimates
 */

import { supabase } from '@/lib/supabase';
import { CohortMatcher, CohortResult, CohortMember } from './cohort-matcher';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ERS stages representing recovery milestones
 */
export type ERSStage = 'healing' | 'rebuilding' | 'ready';

/**
 * Milestone probability at a specific week
 */
export interface WeekProbability {
  week: number;
  probability: number;
  cumulativeProbability: number;
}

/**
 * Complete prediction for a single milestone
 */
export interface MilestonePrediction {
  stage: ERSStage;
  weekProbabilities: WeekProbability[];
  week4Probability: number;
  week8Probability: number;
  week12Probability: number;
  week16Probability: number;
  week24Probability: number;
  medianWeeks: number | null;
  fastestWeeks: number | null;
  slowestWeeks: number | null;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  confidence: number;
  sampleSize: number;
}

/**
 * Complete timeline prediction result
 */
export interface TimelinePrediction {
  userId: string;
  milestones: {
    rebuilding: MilestonePrediction;
    ready: MilestonePrediction;
  };
  cohortSize: number;
  similarityScore: number;
  currentStage: ERSStage;
  currentERS: number;
  predictedAt: Date;
  metadata: {
    cohortId: string;
    minCohortConfidence: number;
    dataQuality: 'high' | 'medium' | 'low';
  };
}

/**
 * Historical milestone achievement data for a cohort member
 */
interface CohortMemberOutcome {
  userId: string;
  similarity: number;
  startDate: Date;
  rebuildingReachedWeek: number | null;
  readyReachedWeek: number | null;
  currentStage: ERSStage;
  observationWeeks: number;
}

/**
 * Configuration for the timeline predictor
 */
export interface TimelinePredictorConfig {
  minCohortSize: number;
  maxPredictionWeeks: number;
  confidenceLevel: number;
  bootstrapIterations: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: TimelinePredictorConfig = {
  minCohortSize: 20,        // Minimum cohort members for reliable predictions
  maxPredictionWeeks: 52,   // Maximum weeks to predict forward
  confidenceLevel: 0.95,    // 95% confidence intervals
  bootstrapIterations: 100, // Bootstrap samples for CI calculation
};

// ERS thresholds for stages
const STAGE_THRESHOLDS = {
  rebuilding: 50,
  ready: 75,
};

// ============================================================================
// STATISTICAL UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate the percentile value from a sorted array.
 *
 * @param sortedArray - Array of numbers sorted in ascending order
 * @param percentile - Percentile to calculate (0-100)
 * @returns The value at the given percentile
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  if (sortedArray.length === 1) return sortedArray[0];

  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Calculate mean of an array.
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation of an array.
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
}

/**
 * Kaplan-Meier survival estimator for milestone achievement.
 *
 * This is a non-parametric statistic used to estimate the probability
 * of "surviving" past a certain time (in our case, NOT having reached
 * the milestone). We invert it to get milestone achievement probability.
 *
 * @param outcomes - Array of (time, achieved) tuples
 * @param maxWeeks - Maximum weeks to calculate
 * @returns Array of cumulative probabilities by week
 */
function kaplanMeierEstimate(
  outcomes: Array<{ week: number; achieved: boolean; censored: boolean }>,
  maxWeeks: number
): WeekProbability[] {
  // Sort by week
  const sorted = [...outcomes].sort((a, b) => a.week - b.week);

  const probabilities: WeekProbability[] = [];
  let atRisk = sorted.length;
  let cumulativeSurvival = 1.0;

  for (let week = 1; week <= maxWeeks; week++) {
    // Count events and censoring at this week
    const eventsThisWeek = sorted.filter(o => o.week === week && o.achieved).length;
    const censoredThisWeek = sorted.filter(o => o.week === week && o.censored).length;

    if (atRisk > 0 && eventsThisWeek > 0) {
      // Kaplan-Meier product-limit formula
      const survivalRate = (atRisk - eventsThisWeek) / atRisk;
      cumulativeSurvival *= survivalRate;
    }

    // Update at-risk count
    atRisk -= eventsThisWeek + censoredThisWeek;

    // Achievement probability = 1 - survival probability
    const cumulativeAchievement = 1 - cumulativeSurvival;

    probabilities.push({
      week,
      probability: eventsThisWeek / (sorted.length || 1), // Instantaneous probability
      cumulativeProbability: Math.min(cumulativeAchievement, 1),
    });
  }

  return probabilities;
}

/**
 * Bootstrap confidence interval calculation.
 *
 * Resamples the data multiple times to estimate the uncertainty
 * in our probability estimates.
 *
 * @param values - Original sample values
 * @param iterations - Number of bootstrap samples
 * @param confidenceLevel - Confidence level (e.g., 0.95)
 * @returns Lower and upper bounds of the confidence interval
 */
function bootstrapConfidenceInterval(
  values: number[],
  iterations: number,
  confidenceLevel: number
): { lower: number; upper: number } {
  if (values.length < 3) {
    return { lower: 0, upper: values.length > 0 ? Math.max(...values) : 52 };
  }

  const bootstrapMeans: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Resample with replacement
    const sample: number[] = [];
    for (let j = 0; j < values.length; j++) {
      const randomIndex = Math.floor(Math.random() * values.length);
      sample.push(values[randomIndex]);
    }
    bootstrapMeans.push(calculateMean(sample));
  }

  // Sort bootstrap means
  bootstrapMeans.sort((a, b) => a - b);

  // Calculate confidence interval bounds
  const alpha = 1 - confidenceLevel;
  const lowerIndex = Math.floor((alpha / 2) * iterations);
  const upperIndex = Math.floor((1 - alpha / 2) * iterations);

  return {
    lower: bootstrapMeans[lowerIndex] || 0,
    upper: bootstrapMeans[upperIndex] || bootstrapMeans[bootstrapMeans.length - 1] || 52,
  };
}

/**
 * Calculate confidence score based on sample size and variance.
 *
 * @param sampleSize - Number of observations
 * @param stdDev - Standard deviation of observations
 * @param maxValue - Maximum possible value for normalization
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(sampleSize: number, stdDev: number, maxValue: number): number {
  // Base confidence from sample size (using logarithmic scaling)
  // 20 samples = ~0.6, 50 samples = ~0.75, 100 samples = ~0.85
  const sampleConfidence = Math.min(Math.log10(sampleSize + 1) / 2.5, 1);

  // Penalty for high variance (coefficient of variation)
  const cvPenalty = stdDev > 0 ? Math.min(stdDev / maxValue, 0.5) : 0;

  // Combined confidence
  return Math.max(0, Math.min(1, sampleConfidence - cvPenalty));
}

// ============================================================================
// TIMELINE PREDICTOR CLASS
// ============================================================================

/**
 * TimelinePredictor generates personalized recovery timeline predictions
 * based on outcomes from similar users.
 *
 * Usage:
 * ```typescript
 * const predictor = new TimelinePredictor();
 * const prediction = await predictor.predict(userId);
 * ```
 */
export class TimelinePredictor {
  private config: TimelinePredictorConfig;
  private cohortMatcher: CohortMatcher;

  constructor(config: Partial<TimelinePredictorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cohortMatcher = new CohortMatcher();
  }

  /**
   * Fetch historical milestone outcomes for cohort members.
   *
   * For each cohort member, we determine:
   * - When they first reached the Rebuilding stage (ERS >= 50)
   * - When they first reached the Ready stage (ERS >= 75)
   * - How long they've been observed
   */
  private async fetchCohortOutcomes(
    cohort: CohortResult
  ): Promise<CohortMemberOutcome[]> {
    const outcomes: CohortMemberOutcome[] = [];

    for (const member of cohort.members) {
      try {
        // Fetch all ERS scores for this user, ordered by date
        const { data: ersScores, error } = await supabase
          .from('ers_scores')
          .select('ers_score, ers_stage, week_of, calculated_at')
          .eq('user_id', member.userId)
          .order('week_of', { ascending: true });

        if (error || !ersScores || ersScores.length === 0) continue;

        // Find first occurrence of each stage
        let rebuildingWeek: number | null = null;
        let readyWeek: number | null = null;
        const startDate = new Date(ersScores[0].week_of);

        for (const score of ersScores) {
          const scoreDate = new Date(score.week_of);
          const weeksSinceStart = Math.floor(
            (scoreDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
          );

          // Check for Rebuilding milestone (first time >= 50)
          if (rebuildingWeek === null && score.ers_score >= STAGE_THRESHOLDS.rebuilding) {
            rebuildingWeek = weeksSinceStart;
          }

          // Check for Ready milestone (first time >= 75)
          if (readyWeek === null && score.ers_score >= STAGE_THRESHOLDS.ready) {
            readyWeek = weeksSinceStart;
          }
        }

        // Calculate observation period
        const lastScore = ersScores[ersScores.length - 1];
        const observationWeeks = Math.floor(
          (new Date(lastScore.week_of).getTime() - startDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
        );

        outcomes.push({
          userId: member.userId,
          similarity: member.similarity.compositeScore,
          startDate,
          rebuildingReachedWeek: rebuildingWeek,
          readyReachedWeek: readyWeek,
          currentStage: lastScore.ers_stage as ERSStage,
          observationWeeks: Math.max(observationWeeks, 1),
        });
      } catch (error) {
        console.error(`Error fetching outcomes for user ${member.userId}:`, error);
      }
    }

    return outcomes;
  }

  /**
   * Calculate milestone prediction from cohort outcomes.
   *
   * Uses Kaplan-Meier survival analysis to estimate the probability
   * of reaching the milestone at each week, accounting for censoring
   * (users who haven't reached the milestone yet but are still being observed).
   */
  private calculateMilestonePrediction(
    stage: ERSStage,
    outcomes: CohortMemberOutcome[],
    targetCurrentlyAtOrPastStage: boolean
  ): MilestonePrediction {
    // Extract milestone achievement times
    const milestoneWeeks = stage === 'rebuilding'
      ? outcomes.map(o => o.rebuildingReachedWeek)
      : outcomes.map(o => o.readyReachedWeek);

    // Prepare data for Kaplan-Meier
    const kmData = outcomes.map((o, i) => {
      const week = milestoneWeeks[i];
      const achieved = week !== null;
      const censored = !achieved && o.observationWeeks > 0;

      return {
        week: week ?? o.observationWeeks, // Use observation time if not achieved
        achieved,
        censored,
      };
    });

    // Calculate Kaplan-Meier probabilities
    const weekProbabilities = kaplanMeierEstimate(kmData, this.config.maxPredictionWeeks);

    // Extract probabilities at key timepoints
    const getProbAtWeek = (week: number): number => {
      const entry = weekProbabilities.find(p => p.week === week);
      return entry?.cumulativeProbability ?? 0;
    };

    // Calculate summary statistics for those who achieved the milestone
    const achievedWeeks = milestoneWeeks.filter((w): w is number => w !== null);
    achievedWeeks.sort((a, b) => a - b);

    let medianWeeks: number | null = null;
    let fastestWeeks: number | null = null;
    let slowestWeeks: number | null = null;
    let confidenceInterval = { lower: 0, upper: this.config.maxPredictionWeeks };
    let confidence = 0;

    if (achievedWeeks.length >= 3) {
      medianWeeks = calculatePercentile(achievedWeeks, 50);
      fastestWeeks = achievedWeeks[0];
      slowestWeeks = achievedWeeks[achievedWeeks.length - 1];

      // Bootstrap confidence interval for median
      confidenceInterval = bootstrapConfidenceInterval(
        achievedWeeks,
        this.config.bootstrapIterations,
        this.config.confidenceLevel
      );

      // Calculate confidence score
      const stdDev = calculateStdDev(achievedWeeks);
      confidence = calculateConfidence(achievedWeeks.length, stdDev, this.config.maxPredictionWeeks);
    } else if (achievedWeeks.length > 0) {
      // Limited data - provide estimates with low confidence
      medianWeeks = calculateMean(achievedWeeks);
      fastestWeeks = achievedWeeks[0];
      slowestWeeks = achievedWeeks[achievedWeeks.length - 1];
      confidence = 0.3; // Low confidence indicator
    }

    // If user has already reached this stage, set probability to 1
    if (targetCurrentlyAtOrPastStage) {
      return {
        stage,
        weekProbabilities: weekProbabilities.map(p => ({
          ...p,
          cumulativeProbability: 1,
        })),
        week4Probability: 1,
        week8Probability: 1,
        week12Probability: 1,
        week16Probability: 1,
        week24Probability: 1,
        medianWeeks: 0,
        fastestWeeks: 0,
        slowestWeeks: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        confidence: 1,
        sampleSize: achievedWeeks.length,
      };
    }

    return {
      stage,
      weekProbabilities,
      week4Probability: getProbAtWeek(4),
      week8Probability: getProbAtWeek(8),
      week12Probability: getProbAtWeek(12),
      week16Probability: getProbAtWeek(16),
      week24Probability: getProbAtWeek(24),
      medianWeeks,
      fastestWeeks,
      slowestWeeks,
      confidenceInterval,
      confidence,
      sampleSize: achievedWeeks.length,
    };
  }

  /**
   * Get user's current ERS stage and score.
   */
  private async getUserCurrentState(userId: string): Promise<{
    currentERS: number;
    currentStage: ERSStage;
  }> {
    const { data, error } = await supabase
      .from('ers_scores')
      .select('ers_score, ers_stage')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { currentERS: 0, currentStage: 'healing' };
    }

    return {
      currentERS: data.ers_score,
      currentStage: data.ers_stage as ERSStage,
    };
  }

  /**
   * Determine data quality based on cohort characteristics.
   */
  private assessDataQuality(
    cohortSize: number,
    rebuildingSampleSize: number,
    readySampleSize: number
  ): 'high' | 'medium' | 'low' {
    if (cohortSize >= 100 && rebuildingSampleSize >= 50 && readySampleSize >= 30) {
      return 'high';
    }
    if (cohortSize >= 50 && rebuildingSampleSize >= 20 && readySampleSize >= 10) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate timeline predictions for a user.
   *
   * @param userId - The user to generate predictions for
   * @returns TimelinePrediction or null if insufficient data
   */
  async predict(userId: string): Promise<TimelinePrediction | null> {
    try {
      // Step 1: Find or retrieve cohort
      let cohort = await this.cohortMatcher.getExistingCohort(userId);

      if (!cohort || cohort.cohortSize < this.config.minCohortSize) {
        // Generate new cohort
        cohort = await this.cohortMatcher.findCohort(userId);
      }

      if (!cohort || cohort.cohortSize < this.config.minCohortSize) {
        console.warn(`Insufficient cohort size for user ${userId}: ${cohort?.cohortSize ?? 0}`);
        return null;
      }

      // Step 2: Get user's current state
      const { currentERS, currentStage } = await this.getUserCurrentState(userId);

      // Step 3: Fetch historical outcomes for cohort
      const outcomes = await this.fetchCohortOutcomes(cohort);

      if (outcomes.length < this.config.minCohortSize) {
        console.warn(`Insufficient outcome data for user ${userId}: ${outcomes.length}`);
        return null;
      }

      // Step 4: Calculate milestone predictions
      const rebuildingPrediction = this.calculateMilestonePrediction(
        'rebuilding',
        outcomes,
        currentStage === 'rebuilding' || currentStage === 'ready'
      );

      const readyPrediction = this.calculateMilestonePrediction(
        'ready',
        outcomes,
        currentStage === 'ready'
      );

      // Step 5: Assess data quality
      const dataQuality = this.assessDataQuality(
        outcomes.length,
        rebuildingPrediction.sampleSize,
        readyPrediction.sampleSize
      );

      // Step 6: Build prediction result
      const prediction: TimelinePrediction = {
        userId,
        milestones: {
          rebuilding: rebuildingPrediction,
          ready: readyPrediction,
        },
        cohortSize: cohort.cohortSize,
        similarityScore: cohort.averageSimilarity,
        currentStage,
        currentERS,
        predictedAt: new Date(),
        metadata: {
          cohortId: cohort.cohortName,
          minCohortConfidence: Math.min(
            rebuildingPrediction.confidence,
            readyPrediction.confidence
          ),
          dataQuality,
        },
      };

      // Step 7: Save predictions to database
      await this.savePredictions(prediction);

      return prediction;
    } catch (error) {
      console.error('Error generating timeline prediction:', error);
      return null;
    }
  }

  /**
   * Save predictions to the user_predictions table.
   */
  private async savePredictions(prediction: TimelinePrediction): Promise<void> {
    const predictions = [
      {
        type: 'rebuilding',
        milestone: prediction.milestones.rebuilding,
      },
      {
        type: 'ready',
        milestone: prediction.milestones.ready,
      },
    ];

    for (const pred of predictions) {
      // Skip if already achieved
      if (pred.milestone.medianWeeks === 0 && pred.milestone.confidence === 1) {
        continue;
      }

      try {
        await supabase.from('user_predictions').insert({
          user_id: prediction.userId,
          prediction_type: `milestone_${pred.type}`,
          predicted_value: pred.milestone.medianWeeks,
          confidence_interval: JSON.stringify(pred.milestone.confidenceInterval),
          probability: pred.milestone.week12Probability, // 12-week probability as primary
          predicted_at: prediction.predictedAt.toISOString(),
          resolve_date: this.calculateResolveDate(pred.milestone.medianWeeks),
          prediction_metadata: JSON.stringify({
            weekProbabilities: {
              week4: pred.milestone.week4Probability,
              week8: pred.milestone.week8Probability,
              week12: pred.milestone.week12Probability,
              week16: pred.milestone.week16Probability,
              week24: pred.milestone.week24Probability,
            },
            fastestWeeks: pred.milestone.fastestWeeks,
            slowestWeeks: pred.milestone.slowestWeeks,
            sampleSize: pred.milestone.sampleSize,
            confidence: pred.milestone.confidence,
            cohortSize: prediction.cohortSize,
            similarityScore: prediction.similarityScore,
            dataQuality: prediction.metadata.dataQuality,
          }),
        });
      } catch (error) {
        console.error(`Error saving ${pred.type} prediction:`, error);
      }
    }
  }

  /**
   * Calculate the date when a prediction should be resolved.
   */
  private calculateResolveDate(medianWeeks: number | null): string | null {
    if (medianWeeks === null) return null;

    const resolveDate = new Date();
    resolveDate.setDate(resolveDate.getDate() + Math.ceil(medianWeeks * 7));
    return resolveDate.toISOString().split('T')[0];
  }

  /**
   * Get existing prediction for a user without regenerating.
   */
  async getExistingPrediction(userId: string): Promise<TimelinePrediction | null> {
    try {
      const { data: predictions, error } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', userId)
        .in('prediction_type', ['milestone_rebuilding', 'milestone_ready'])
        .order('predicted_at', { ascending: false })
        .limit(2);

      if (error || !predictions || predictions.length === 0) {
        return null;
      }

      // Reconstruct prediction from stored data
      const rebuildingPred = predictions.find(p => p.prediction_type === 'milestone_rebuilding');
      const readyPred = predictions.find(p => p.prediction_type === 'milestone_ready');

      if (!rebuildingPred && !readyPred) return null;

      const { currentERS, currentStage } = await this.getUserCurrentState(userId);

      const parseMilestone = (data: typeof rebuildingPred, stage: ERSStage): MilestonePrediction => {
        if (!data) {
          return {
            stage,
            weekProbabilities: [],
            week4Probability: 0,
            week8Probability: 0,
            week12Probability: 0,
            week16Probability: 0,
            week24Probability: 0,
            medianWeeks: null,
            fastestWeeks: null,
            slowestWeeks: null,
            confidenceInterval: { lower: 0, upper: 52 },
            confidence: 0,
            sampleSize: 0,
          };
        }

        const metadata = typeof data.prediction_metadata === 'string'
          ? JSON.parse(data.prediction_metadata)
          : data.prediction_metadata;

        const confidenceInterval = typeof data.confidence_interval === 'string'
          ? JSON.parse(data.confidence_interval)
          : data.confidence_interval;

        return {
          stage,
          weekProbabilities: [],
          week4Probability: metadata?.weekProbabilities?.week4 ?? 0,
          week8Probability: metadata?.weekProbabilities?.week8 ?? 0,
          week12Probability: data.probability ?? 0,
          week16Probability: metadata?.weekProbabilities?.week16 ?? 0,
          week24Probability: metadata?.weekProbabilities?.week24 ?? 0,
          medianWeeks: data.predicted_value,
          fastestWeeks: metadata?.fastestWeeks ?? null,
          slowestWeeks: metadata?.slowestWeeks ?? null,
          confidenceInterval: confidenceInterval ?? { lower: 0, upper: 52 },
          confidence: metadata?.confidence ?? 0,
          sampleSize: metadata?.sampleSize ?? 0,
        };
      };

      const metadata = rebuildingPred?.prediction_metadata
        ? (typeof rebuildingPred.prediction_metadata === 'string'
          ? JSON.parse(rebuildingPred.prediction_metadata)
          : rebuildingPred.prediction_metadata)
        : {};

      return {
        userId,
        milestones: {
          rebuilding: parseMilestone(rebuildingPred, 'rebuilding'),
          ready: parseMilestone(readyPred, 'ready'),
        },
        cohortSize: metadata?.cohortSize ?? 0,
        similarityScore: metadata?.similarityScore ?? 0,
        currentStage,
        currentERS,
        predictedAt: new Date(rebuildingPred?.predicted_at ?? readyPred?.predicted_at ?? Date.now()),
        metadata: {
          cohortId: '',
          minCohortConfidence: Math.min(
            parseMilestone(rebuildingPred, 'rebuilding').confidence,
            parseMilestone(readyPred, 'ready').confidence
          ),
          dataQuality: metadata?.dataQuality ?? 'low',
        },
      };
    } catch (error) {
      console.error('Error fetching existing prediction:', error);
      return null;
    }
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Create a timeline predictor with default configuration.
 */
export function createTimelinePredictor(
  config?: Partial<TimelinePredictorConfig>
): TimelinePredictor {
  return new TimelinePredictor(config);
}

/**
 * Quick function to generate predictions for a user.
 */
export async function predictUserTimeline(userId: string): Promise<TimelinePrediction | null> {
  const predictor = new TimelinePredictor();
  return predictor.predict(userId);
}

/**
 * Format prediction for display in UI.
 */
export function formatPredictionForDisplay(prediction: TimelinePrediction): {
  rebuilding: {
    status: 'achieved' | 'in_progress';
    probability12Week: string;
    estimatedWeeks: string;
    confidence: string;
  };
  ready: {
    status: 'achieved' | 'in_progress';
    probability12Week: string;
    estimatedWeeks: string;
    confidence: string;
  };
} {
  const formatMilestone = (milestone: MilestonePrediction, achieved: boolean) => ({
    status: achieved ? 'achieved' as const : 'in_progress' as const,
    probability12Week: achieved ? '100%' : `${Math.round(milestone.week12Probability * 100)}%`,
    estimatedWeeks: achieved
      ? 'Completed'
      : milestone.medianWeeks !== null
        ? `~${Math.round(milestone.medianWeeks)} weeks`
        : 'Insufficient data',
    confidence: milestone.confidence >= 0.7
      ? 'High'
      : milestone.confidence >= 0.4
        ? 'Medium'
        : 'Low',
  });

  const currentStage = prediction.currentStage;

  return {
    rebuilding: formatMilestone(
      prediction.milestones.rebuilding,
      currentStage === 'rebuilding' || currentStage === 'ready'
    ),
    ready: formatMilestone(
      prediction.milestones.ready,
      currentStage === 'ready'
    ),
  };
}

export default TimelinePredictor;
