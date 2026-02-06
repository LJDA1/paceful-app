/**
 * Outcome Prediction Engine for Paceful
 *
 * This module predicts the likelihood of specific emotional recovery outcomes
 * based on what happened to similar users in their cohort. By analyzing
 * 12-16 weeks of cohort behavior, we can provide personalized outcome
 * predictions for key recovery milestones.
 *
 * Tracked Outcomes:
 * - Stopped daily thoughts about ex (cognitive)
 * - Ready to date casually (emotional readiness)
 * - Reconnected with friends (social recovery)
 * - Developed new hobbies (personal growth)
 * - Felt grateful for breakup (perspective shift)
 * - Experienced major setback (risk factor)
 * - Attempted reconciliation (risk factor)
 * - Got back together (resolution)
 */

import { supabase } from '@/lib/supabase';
import { CohortMatcher, CohortResult } from './cohort-matcher';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * All trackable outcome types
 */
export type OutcomeType =
  | 'stopped_daily_thoughts'
  | 'ready_to_date'
  | 'reconnected_with_friends'
  | 'developed_new_hobbies'
  | 'felt_grateful'
  | 'experienced_setback'
  | 'attempted_reconciliation'
  | 'got_back_together';

/**
 * Outcome category for grouping related outcomes
 */
export type OutcomeCategory =
  | 'cognitive'      // Mental/thought patterns
  | 'emotional'      // Emotional readiness
  | 'social'         // Social connections
  | 'growth'         // Personal development
  | 'perspective'    // Mindset shifts
  | 'risk'           // Potential setbacks
  | 'resolution';    // Relationship resolution

/**
 * Metadata about an outcome type
 */
export interface OutcomeMetadata {
  type: OutcomeType;
  label: string;
  description: string;
  category: OutcomeCategory;
  isPositive: boolean;  // Whether this is a positive or negative outcome
  indicatorWeight: number; // How predictive this is of overall recovery (0-1)
}

/**
 * Raw outcome data from a cohort member
 */
interface CohortOutcomeData {
  userId: string;
  similarity: number;
  outcomeType: OutcomeType;
  occurred: boolean;
  weekOccurred: number | null;  // Week since breakup when outcome happened
  observationWeeks: number;     // How many weeks we've observed this user
}

/**
 * Single outcome prediction
 */
export interface OutcomePrediction {
  outcome: OutcomeType;
  label: string;
  category: OutcomeCategory;
  probability: number;           // 0-1, % of cohort who experienced this
  typical_timing: string;        // Human-readable median timing
  typicalWeeks: number | null;   // Raw median weeks
  fastestWeeks: number | null;   // 10th percentile
  slowestWeeks: number | null;   // 90th percentile
  confidence: number;            // 0-1, based on sample size
  sampleSize: number;            // Number of cohort members with data
  isPositive: boolean;
}

/**
 * Complete outcome prediction result
 */
export interface OutcomePredictionResult {
  userId: string;
  outcomes: OutcomePrediction[];
  positiveOutcomes: OutcomePrediction[];
  riskOutcomes: OutcomePrediction[];
  cohortSize: number;
  similarityScore: number;
  observationWindow: {
    minWeeks: number;
    maxWeeks: number;
    medianWeeks: number;
  };
  update_frequency: 'weekly' | 'biweekly' | 'monthly';
  predictedAt: Date;
  metadata: {
    cohortId: string;
    dataQuality: 'high' | 'medium' | 'low';
    outcomesCovered: number;
    totalOutcomes: number;
  };
}

/**
 * Tracked outcome event for accuracy calculation
 */
export interface TrackedOutcome {
  userId: string;
  outcomeType: OutcomeType;
  predictedProbability: number;
  predictedWeek: number | null;
  actuallyOccurred: boolean | null;  // null = not yet resolved
  actualWeek: number | null;
  predictionId: string;
  trackedAt: Date;
  resolvedAt: Date | null;
}

/**
 * Prediction accuracy metrics
 */
export interface AccuracyMetrics {
  outcomeType: OutcomeType;
  totalPredictions: number;
  resolvedPredictions: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  brierScore: number;  // Lower is better, measures probability calibration
  averageTimingError: number | null;  // Average weeks off in timing prediction
}

/**
 * Configuration for the outcome predictor
 */
export interface OutcomePredictorConfig {
  minCohortSize: number;
  observationWindowWeeks: number;  // 12-16 weeks analysis window
  confidenceThreshold: number;
  highConfidenceThreshold: number;
}

// ============================================================================
// OUTCOME DEFINITIONS
// ============================================================================

/**
 * Complete metadata for all tracked outcomes
 */
export const OUTCOME_DEFINITIONS: Record<OutcomeType, OutcomeMetadata> = {
  stopped_daily_thoughts: {
    type: 'stopped_daily_thoughts',
    label: 'Stopped daily thoughts about ex',
    description: 'No longer thinking about ex-partner on a daily basis',
    category: 'cognitive',
    isPositive: true,
    indicatorWeight: 0.85,
  },
  ready_to_date: {
    type: 'ready_to_date',
    label: 'Ready to date casually',
    description: 'Feeling emotionally ready to meet new people and date',
    category: 'emotional',
    isPositive: true,
    indicatorWeight: 0.75,
  },
  reconnected_with_friends: {
    type: 'reconnected_with_friends',
    label: 'Reconnected with friends',
    description: 'Rebuilt or strengthened friendships that may have been neglected',
    category: 'social',
    isPositive: true,
    indicatorWeight: 0.70,
  },
  developed_new_hobbies: {
    type: 'developed_new_hobbies',
    label: 'Developed new hobbies',
    description: 'Started new activities or hobbies for personal enrichment',
    category: 'growth',
    isPositive: true,
    indicatorWeight: 0.65,
  },
  felt_grateful: {
    type: 'felt_grateful',
    label: 'Felt grateful for breakup',
    description: 'Reached a point of gratitude or acceptance about the relationship ending',
    category: 'perspective',
    isPositive: true,
    indicatorWeight: 0.90,
  },
  experienced_setback: {
    type: 'experienced_setback',
    label: 'Experienced major setback',
    description: 'Had a significant emotional regression during recovery',
    category: 'risk',
    isPositive: false,
    indicatorWeight: 0.60,
  },
  attempted_reconciliation: {
    type: 'attempted_reconciliation',
    label: 'Attempted reconciliation',
    description: 'Tried to get back together with ex-partner',
    category: 'risk',
    isPositive: false,
    indicatorWeight: 0.55,
  },
  got_back_together: {
    type: 'got_back_together',
    label: 'Got back together',
    description: 'Successfully reconciled with ex-partner',
    category: 'resolution',
    isPositive: false,  // Neutral, but we track as non-positive for recovery context
    indicatorWeight: 0.40,
  },
};

const ALL_OUTCOME_TYPES: OutcomeType[] = Object.keys(OUTCOME_DEFINITIONS) as OutcomeType[];

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: OutcomePredictorConfig = {
  minCohortSize: 20,
  observationWindowWeeks: 16,  // Analyze 16 weeks of outcomes
  confidenceThreshold: 0.5,
  highConfidenceThreshold: 0.75,
};

// ============================================================================
// STATISTICAL UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate percentile from sorted array
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
 * Calculate confidence score based on sample size
 */
function calculateConfidence(sampleSize: number, totalPossible: number): number {
  // Base confidence from coverage ratio
  const coverageRatio = sampleSize / Math.max(totalPossible, 1);

  // Sample size factor (logarithmic scaling)
  // 10 samples = ~0.5, 30 samples = ~0.7, 100 samples = ~0.85
  const sampleFactor = Math.min(Math.log10(sampleSize + 1) / 2.3, 1);

  // Combined confidence
  return Math.min(coverageRatio * 0.3 + sampleFactor * 0.7, 1);
}

/**
 * Format weeks into human-readable timing string
 */
function formatTiming(weeks: number | null): string {
  if (weeks === null) return 'Insufficient data';

  if (weeks < 1) return 'Within first week';
  if (weeks === 1) return '~1 week';
  if (weeks < 4) return `~${Math.round(weeks)} weeks`;

  const months = weeks / 4.33;
  if (months < 2) return `~${Math.round(weeks)} weeks`;
  if (months < 12) return `~${months.toFixed(1)} months`;

  return `${(months / 12).toFixed(1)} years`;
}

// ============================================================================
// OUTCOME PREDICTOR CLASS
// ============================================================================

/**
 * OutcomePredictor analyzes cohort outcomes to predict which milestones
 * a user is likely to experience and when.
 *
 * Usage:
 * ```typescript
 * const predictor = new OutcomePredictor();
 * const prediction = await predictor.predict(userId);
 * ```
 */
export class OutcomePredictor {
  private config: OutcomePredictorConfig;
  private cohortMatcher: CohortMatcher;

  constructor(config: Partial<OutcomePredictorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cohortMatcher = new CohortMatcher();
  }

  /**
   * Fetch outcome data for cohort members within the observation window.
   */
  private async fetchCohortOutcomes(
    cohort: CohortResult
  ): Promise<Map<OutcomeType, CohortOutcomeData[]>> {
    const outcomeMap = new Map<OutcomeType, CohortOutcomeData[]>();

    // Initialize map with empty arrays
    for (const outcomeType of ALL_OUTCOME_TYPES) {
      outcomeMap.set(outcomeType, []);
    }

    for (const member of cohort.members) {
      try {
        // Fetch tracked outcomes for this user
        const { data: outcomes, error } = await supabase
          .from('outcome_tracking')
          .select('*')
          .eq('user_id', member.userId)
          .order('tracked_at', { ascending: true });

        if (error) {
          console.error(`Error fetching outcomes for ${member.userId}:`, error);
          continue;
        }

        // Get user's breakup date to calculate weeks
        const { data: profile } = await supabase
          .from('profiles')
          .select('relationship_ended_at')
          .eq('user_id', member.userId)
          .single();

        const breakupDate = profile?.relationship_ended_at
          ? new Date(profile.relationship_ended_at)
          : null;

        if (!breakupDate) continue;

        // Calculate observation period
        const now = new Date();
        const observationWeeks = Math.floor(
          (now.getTime() - breakupDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        // Process each outcome type
        for (const outcomeType of ALL_OUTCOME_TYPES) {
          const outcomeRecord = outcomes?.find(
            o => o.outcome_type === outcomeType
          );

          let weekOccurred: number | null = null;
          let occurred = false;

          if (outcomeRecord) {
            occurred = outcomeRecord.occurred === true;
            if (occurred && outcomeRecord.occurred_at) {
              const occurredDate = new Date(outcomeRecord.occurred_at);
              weekOccurred = Math.floor(
                (occurredDate.getTime() - breakupDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
              );
            }
          }

          // Only include if within observation window
          if (observationWeeks <= this.config.observationWindowWeeks || occurred) {
            outcomeMap.get(outcomeType)!.push({
              userId: member.userId,
              similarity: member.similarity.compositeScore,
              outcomeType,
              occurred,
              weekOccurred,
              observationWeeks: Math.min(observationWeeks, this.config.observationWindowWeeks),
            });
          }
        }
      } catch (error) {
        console.error(`Error processing outcomes for ${member.userId}:`, error);
      }
    }

    return outcomeMap;
  }

  /**
   * Calculate prediction for a single outcome type.
   */
  private calculateOutcomePrediction(
    outcomeType: OutcomeType,
    outcomeData: CohortOutcomeData[],
    cohortSize: number
  ): OutcomePrediction {
    const metadata = OUTCOME_DEFINITIONS[outcomeType];

    // Filter to users with sufficient observation
    const validData = outcomeData.filter(d => d.observationWeeks >= 4);

    if (validData.length === 0) {
      return {
        outcome: outcomeType,
        label: metadata.label,
        category: metadata.category,
        probability: 0,
        typical_timing: 'Insufficient data',
        typicalWeeks: null,
        fastestWeeks: null,
        slowestWeeks: null,
        confidence: 0,
        sampleSize: 0,
        isPositive: metadata.isPositive,
      };
    }

    // Calculate probability (weighted by similarity)
    let weightedOccurred = 0;
    let totalWeight = 0;

    for (const data of validData) {
      const weight = data.similarity;
      totalWeight += weight;
      if (data.occurred) {
        weightedOccurred += weight;
      }
    }

    const probability = totalWeight > 0 ? weightedOccurred / totalWeight : 0;

    // Calculate timing statistics for those who experienced the outcome
    const timings = validData
      .filter(d => d.occurred && d.weekOccurred !== null)
      .map(d => d.weekOccurred as number)
      .sort((a, b) => a - b);

    let typicalWeeks: number | null = null;
    let fastestWeeks: number | null = null;
    let slowestWeeks: number | null = null;

    if (timings.length >= 3) {
      typicalWeeks = calculatePercentile(timings, 50);
      fastestWeeks = calculatePercentile(timings, 10);
      slowestWeeks = calculatePercentile(timings, 90);
    } else if (timings.length > 0) {
      typicalWeeks = timings[Math.floor(timings.length / 2)];
      fastestWeeks = timings[0];
      slowestWeeks = timings[timings.length - 1];
    }

    // Calculate confidence
    const confidence = calculateConfidence(validData.length, cohortSize);

    return {
      outcome: outcomeType,
      label: metadata.label,
      category: metadata.category,
      probability,
      typical_timing: formatTiming(typicalWeeks),
      typicalWeeks,
      fastestWeeks,
      slowestWeeks,
      confidence,
      sampleSize: validData.length,
      isPositive: metadata.isPositive,
    };
  }

  /**
   * Determine appropriate update frequency based on data quality.
   */
  private determineUpdateFrequency(
    cohortSize: number,
    dataQuality: 'high' | 'medium' | 'low'
  ): 'weekly' | 'biweekly' | 'monthly' {
    if (dataQuality === 'high' && cohortSize >= 100) {
      return 'weekly';
    }
    if (dataQuality === 'medium' || cohortSize >= 50) {
      return 'biweekly';
    }
    return 'monthly';
  }

  /**
   * Assess overall data quality.
   */
  private assessDataQuality(
    predictions: OutcomePrediction[]
  ): 'high' | 'medium' | 'low' {
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    const outcomesCovered = predictions.filter(p => p.sampleSize >= 10).length;

    if (avgConfidence >= 0.7 && outcomesCovered >= 6) return 'high';
    if (avgConfidence >= 0.4 && outcomesCovered >= 4) return 'medium';
    return 'low';
  }

  /**
   * Generate outcome predictions for a user.
   *
   * @param userId - The user to generate predictions for
   * @returns OutcomePredictionResult or null if insufficient data
   */
  async predict(userId: string): Promise<OutcomePredictionResult | null> {
    try {
      // Step 1: Find or retrieve cohort
      let cohort = await this.cohortMatcher.getExistingCohort(userId);

      if (!cohort || cohort.cohortSize < this.config.minCohortSize) {
        cohort = await this.cohortMatcher.findCohort(userId);
      }

      if (!cohort || cohort.cohortSize < this.config.minCohortSize) {
        console.warn(`Insufficient cohort size for user ${userId}: ${cohort?.cohortSize ?? 0}`);
        return null;
      }

      // Step 2: Fetch outcome data for cohort
      const outcomeMap = await this.fetchCohortOutcomes(cohort);

      // Step 3: Calculate predictions for each outcome
      const predictions: OutcomePrediction[] = [];

      for (const outcomeType of ALL_OUTCOME_TYPES) {
        const outcomeData = outcomeMap.get(outcomeType) || [];
        const prediction = this.calculateOutcomePrediction(
          outcomeType,
          outcomeData,
          cohort.cohortSize
        );
        predictions.push(prediction);
      }

      // Step 4: Separate positive and risk outcomes
      const positiveOutcomes = predictions
        .filter(p => p.isPositive)
        .sort((a, b) => b.probability - a.probability);

      const riskOutcomes = predictions
        .filter(p => !p.isPositive)
        .sort((a, b) => b.probability - a.probability);

      // Step 5: Calculate observation window stats
      const allObservations: number[] = [];
      for (const [, data] of outcomeMap) {
        for (const d of data) {
          allObservations.push(d.observationWeeks);
        }
      }
      allObservations.sort((a, b) => a - b);

      const observationWindow = {
        minWeeks: allObservations[0] || 0,
        maxWeeks: allObservations[allObservations.length - 1] || 0,
        medianWeeks: calculatePercentile(allObservations, 50),
      };

      // Step 6: Assess data quality
      const dataQuality = this.assessDataQuality(predictions);
      const updateFrequency = this.determineUpdateFrequency(cohort.cohortSize, dataQuality);

      // Step 7: Build result
      const result: OutcomePredictionResult = {
        userId,
        outcomes: predictions.sort((a, b) => b.probability - a.probability),
        positiveOutcomes,
        riskOutcomes,
        cohortSize: cohort.cohortSize,
        similarityScore: cohort.averageSimilarity,
        observationWindow,
        update_frequency: updateFrequency,
        predictedAt: new Date(),
        metadata: {
          cohortId: cohort.cohortName,
          dataQuality,
          outcomesCovered: predictions.filter(p => p.sampleSize >= 10).length,
          totalOutcomes: ALL_OUTCOME_TYPES.length,
        },
      };

      // Step 8: Save predictions
      await this.savePredictions(result);

      return result;
    } catch (error) {
      console.error('Error generating outcome predictions:', error);
      return null;
    }
  }

  /**
   * Save outcome predictions to user_predictions table.
   */
  private async savePredictions(result: OutcomePredictionResult): Promise<void> {
    for (const prediction of result.outcomes) {
      try {
        await supabase.from('user_predictions').insert({
          user_id: result.userId,
          prediction_type: `outcome_${prediction.outcome}`,
          predicted_value: prediction.typicalWeeks,
          probability: prediction.probability,
          confidence_interval: JSON.stringify({
            fastest: prediction.fastestWeeks,
            slowest: prediction.slowestWeeks,
          }),
          predicted_at: result.predictedAt.toISOString(),
          resolve_date: prediction.typicalWeeks
            ? this.calculateResolveDate(prediction.typicalWeeks)
            : null,
          prediction_metadata: JSON.stringify({
            label: prediction.label,
            category: prediction.category,
            confidence: prediction.confidence,
            sampleSize: prediction.sampleSize,
            isPositive: prediction.isPositive,
            cohortSize: result.cohortSize,
            similarityScore: result.similarityScore,
            dataQuality: result.metadata.dataQuality,
          }),
        });
      } catch (error) {
        console.error(`Error saving prediction for ${prediction.outcome}:`, error);
      }
    }
  }

  /**
   * Calculate resolve date for prediction tracking.
   */
  private calculateResolveDate(weeksFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + Math.ceil(weeksFromNow * 7));
    return date.toISOString().split('T')[0];
  }

  /**
   * Track when an outcome actually occurs for a user.
   */
  async trackOutcome(
    userId: string,
    outcomeType: OutcomeType,
    occurred: boolean,
    occurredAt?: Date
  ): Promise<void> {
    try {
      const now = new Date();

      // Upsert outcome tracking record
      await supabase.from('outcome_tracking').upsert({
        user_id: userId,
        outcome_type: outcomeType,
        occurred,
        occurred_at: occurred ? (occurredAt ?? now).toISOString() : null,
        tracked_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: 'user_id,outcome_type',
      });

      // Update related predictions with actual outcome
      await this.resolvePrediction(userId, outcomeType, occurred, occurredAt);
    } catch (error) {
      console.error(`Error tracking outcome ${outcomeType} for ${userId}:`, error);
    }
  }

  /**
   * Resolve a prediction when the actual outcome is known.
   */
  private async resolvePrediction(
    userId: string,
    outcomeType: OutcomeType,
    actuallyOccurred: boolean,
    occurredAt?: Date
  ): Promise<void> {
    try {
      // Find the most recent prediction for this outcome
      const { data: prediction, error } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', userId)
        .eq('prediction_type', `outcome_${outcomeType}`)
        .order('predicted_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !prediction) return;

      // Get user's breakup date to calculate actual week
      const { data: profile } = await supabase
        .from('profiles')
        .select('relationship_ended_at')
        .eq('user_id', userId)
        .single();

      let actualWeek: number | null = null;
      if (profile?.relationship_ended_at && occurredAt) {
        const breakupDate = new Date(profile.relationship_ended_at);
        actualWeek = Math.floor(
          (occurredAt.getTime() - breakupDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
      }

      // Update prediction with resolution
      await supabase
        .from('user_predictions')
        .update({
          actual_outcome: actuallyOccurred,
          resolved_at: new Date().toISOString(),
          prediction_metadata: JSON.stringify({
            ...JSON.parse(prediction.prediction_metadata || '{}'),
            actualWeek,
            predictionAccurate: this.isPredictionAccurate(
              prediction.probability,
              actuallyOccurred
            ),
          }),
        })
        .eq('id', prediction.id);
    } catch (error) {
      console.error(`Error resolving prediction for ${outcomeType}:`, error);
    }
  }

  /**
   * Determine if a probability prediction was accurate.
   * We consider >50% probability predictions accurate if the event occurred,
   * and <50% predictions accurate if it didn't occur.
   */
  private isPredictionAccurate(probability: number, actuallyOccurred: boolean): boolean {
    if (probability >= 0.5) {
      return actuallyOccurred;
    }
    return !actuallyOccurred;
  }

  /**
   * Calculate prediction accuracy metrics for all outcomes.
   */
  async calculateAccuracy(): Promise<AccuracyMetrics[]> {
    const metrics: AccuracyMetrics[] = [];

    for (const outcomeType of ALL_OUTCOME_TYPES) {
      try {
        // Fetch all resolved predictions for this outcome type
        const { data: predictions, error } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('prediction_type', `outcome_${outcomeType}`)
          .not('actual_outcome', 'is', null);

        if (error || !predictions || predictions.length === 0) {
          metrics.push(this.createEmptyMetrics(outcomeType));
          continue;
        }

        let truePositives = 0;
        let falsePositives = 0;
        let trueNegatives = 0;
        let falseNegatives = 0;
        let brierSum = 0;
        const timingErrors: number[] = [];

        for (const pred of predictions) {
          const probability = pred.probability || 0;
          const predictedPositive = probability >= 0.5;
          const actualPositive = pred.actual_outcome === true;

          // Count confusion matrix
          if (predictedPositive && actualPositive) {
            truePositives++;
          } else if (predictedPositive && !actualPositive) {
            falsePositives++;
          } else if (!predictedPositive && !actualPositive) {
            trueNegatives++;
          } else {
            falseNegatives++;
          }

          // Brier score component
          const actual = actualPositive ? 1 : 0;
          brierSum += Math.pow(probability - actual, 2);

          // Timing error if applicable
          const metadata = typeof pred.prediction_metadata === 'string'
            ? JSON.parse(pred.prediction_metadata)
            : pred.prediction_metadata;

          if (
            actualPositive &&
            pred.predicted_value !== null &&
            metadata?.actualWeek !== null
          ) {
            const error = Math.abs(pred.predicted_value - metadata.actualWeek);
            timingErrors.push(error);
          }
        }

        const total = predictions.length;
        const accuracy = (truePositives + trueNegatives) / total;
        const precision = truePositives / (truePositives + falsePositives) || 0;
        const recall = truePositives / (truePositives + falseNegatives) || 0;
        const brierScore = brierSum / total;
        const avgTimingError = timingErrors.length > 0
          ? timingErrors.reduce((a, b) => a + b, 0) / timingErrors.length
          : null;

        metrics.push({
          outcomeType,
          totalPredictions: total,
          resolvedPredictions: total,
          truePositives,
          falsePositives,
          trueNegatives,
          falseNegatives,
          accuracy,
          precision,
          recall,
          brierScore,
          averageTimingError: avgTimingError,
        });
      } catch (error) {
        console.error(`Error calculating accuracy for ${outcomeType}:`, error);
        metrics.push(this.createEmptyMetrics(outcomeType));
      }
    }

    return metrics;
  }

  /**
   * Create empty metrics object for outcomes with no data.
   */
  private createEmptyMetrics(outcomeType: OutcomeType): AccuracyMetrics {
    return {
      outcomeType,
      totalPredictions: 0,
      resolvedPredictions: 0,
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      brierScore: 1,  // Worst possible score
      averageTimingError: null,
    };
  }

  /**
   * Get existing prediction without regenerating.
   */
  async getExistingPrediction(userId: string): Promise<OutcomePredictionResult | null> {
    try {
      const { data: predictions, error } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', userId)
        .like('prediction_type', 'outcome_%')
        .order('predicted_at', { ascending: false });

      if (error || !predictions || predictions.length === 0) {
        return null;
      }

      // Group by prediction time (get most recent batch)
      const latestPredictedAt = predictions[0].predicted_at;
      const latestPredictions = predictions.filter(
        p => p.predicted_at === latestPredictedAt
      );

      const outcomes: OutcomePrediction[] = latestPredictions.map(p => {
        const metadata = typeof p.prediction_metadata === 'string'
          ? JSON.parse(p.prediction_metadata)
          : p.prediction_metadata;

        const confidenceInterval = typeof p.confidence_interval === 'string'
          ? JSON.parse(p.confidence_interval)
          : p.confidence_interval;

        const outcomeType = p.prediction_type.replace('outcome_', '') as OutcomeType;

        return {
          outcome: outcomeType,
          label: metadata?.label || OUTCOME_DEFINITIONS[outcomeType]?.label || outcomeType,
          category: metadata?.category || OUTCOME_DEFINITIONS[outcomeType]?.category || 'cognitive',
          probability: p.probability || 0,
          typical_timing: formatTiming(p.predicted_value),
          typicalWeeks: p.predicted_value,
          fastestWeeks: confidenceInterval?.fastest || null,
          slowestWeeks: confidenceInterval?.slowest || null,
          confidence: metadata?.confidence || 0,
          sampleSize: metadata?.sampleSize || 0,
          isPositive: metadata?.isPositive ?? true,
        };
      });

      const firstMetadata = latestPredictions[0]?.prediction_metadata;
      const meta = typeof firstMetadata === 'string'
        ? JSON.parse(firstMetadata)
        : firstMetadata;

      return {
        userId,
        outcomes: outcomes.sort((a, b) => b.probability - a.probability),
        positiveOutcomes: outcomes.filter(o => o.isPositive).sort((a, b) => b.probability - a.probability),
        riskOutcomes: outcomes.filter(o => !o.isPositive).sort((a, b) => b.probability - a.probability),
        cohortSize: meta?.cohortSize || 0,
        similarityScore: meta?.similarityScore || 0,
        observationWindow: {
          minWeeks: 0,
          maxWeeks: this.config.observationWindowWeeks,
          medianWeeks: this.config.observationWindowWeeks / 2,
        },
        update_frequency: 'weekly',
        predictedAt: new Date(latestPredictedAt),
        metadata: {
          cohortId: '',
          dataQuality: meta?.dataQuality || 'low',
          outcomesCovered: outcomes.filter(o => o.sampleSize >= 10).length,
          totalOutcomes: ALL_OUTCOME_TYPES.length,
        },
      };
    } catch (error) {
      console.error('Error fetching existing outcome predictions:', error);
      return null;
    }
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Create an outcome predictor with default configuration.
 */
export function createOutcomePredictor(
  config?: Partial<OutcomePredictorConfig>
): OutcomePredictor {
  return new OutcomePredictor(config);
}

/**
 * Quick function to generate outcome predictions for a user.
 */
export async function predictUserOutcomes(
  userId: string
): Promise<OutcomePredictionResult | null> {
  const predictor = new OutcomePredictor();
  return predictor.predict(userId);
}

/**
 * Track an outcome event for a user.
 */
export async function trackUserOutcome(
  userId: string,
  outcomeType: OutcomeType,
  occurred: boolean,
  occurredAt?: Date
): Promise<void> {
  const predictor = new OutcomePredictor();
  return predictor.trackOutcome(userId, outcomeType, occurred, occurredAt);
}

/**
 * Get prediction accuracy metrics.
 */
export async function getAccuracyMetrics(): Promise<AccuracyMetrics[]> {
  const predictor = new OutcomePredictor();
  return predictor.calculateAccuracy();
}

/**
 * Format outcome predictions for display in UI.
 */
export function formatOutcomesForDisplay(
  result: OutcomePredictionResult
): {
  positive: Array<{
    label: string;
    probability: string;
    timing: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  risks: Array<{
    label: string;
    probability: string;
    timing: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  summary: string;
} {
  const formatOutcome = (o: OutcomePrediction) => ({
    label: o.label,
    probability: `${Math.round(o.probability * 100)}%`,
    timing: o.typical_timing,
    confidence: (o.confidence >= 0.7 ? 'High' : o.confidence >= 0.4 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
  });

  const topPositive = result.positiveOutcomes.slice(0, 3);
  const topRisks = result.riskOutcomes.filter(r => r.probability >= 0.3);

  // Generate summary
  let summary: string;
  const highProbPositive = result.positiveOutcomes.filter(o => o.probability >= 0.7);
  const highProbRisks = result.riskOutcomes.filter(o => o.probability >= 0.5);

  if (highProbPositive.length >= 3) {
    summary = 'Based on similar users, you have a strong chance of reaching multiple positive milestones.';
  } else if (highProbRisks.length > 0) {
    summary = 'Your recovery journey may include some challenges. Focus on building support systems.';
  } else {
    summary = 'Your predicted outcomes are mixed. Consistent effort will improve your trajectory.';
  }

  return {
    positive: topPositive.map(formatOutcome),
    risks: topRisks.map(formatOutcome),
    summary,
  };
}

export default OutcomePredictor;
