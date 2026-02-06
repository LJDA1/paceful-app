/**
 * Prediction Module for Paceful
 *
 * This module provides cohort-based prediction capabilities for user outcomes.
 * It includes:
 * - Cohort matching based on similarity scoring
 * - Timeline prediction for milestone achievement
 */

// Cohort Matcher exports
export {
  CohortMatcher,
  createCohortMatcher,
  findUserCohort,
  type UserProfile,
  type ERSDataPoint,
  type BreakupContext,
  type BehavioralMetrics,
  type Demographics,
  type SimilarityScores,
  type CohortMember,
  type CohortResult,
  type CohortMatcherConfig,
} from './cohort-matcher';

// Timeline Predictor exports
export {
  TimelinePredictor,
  createTimelinePredictor,
  predictUserTimeline,
  formatPredictionForDisplay,
  type ERSStage,
  type WeekProbability,
  type MilestonePrediction,
  type TimelinePrediction,
  type TimelinePredictorConfig,
} from './timeline-predictor';

// Outcome Predictor exports
export {
  OutcomePredictor,
  createOutcomePredictor,
  predictUserOutcomes,
  trackUserOutcome,
  getAccuracyMetrics,
  formatOutcomesForDisplay,
  OUTCOME_DEFINITIONS,
  type OutcomeType,
  type OutcomeCategory,
  type OutcomeMetadata,
  type OutcomePrediction,
  type OutcomePredictionResult,
  type TrackedOutcome,
  type AccuracyMetrics,
  type OutcomePredictorConfig,
} from './outcome-predictor';

// Risk Predictor exports
export {
  RiskPredictor,
  createRiskPredictor,
  assessUserRisk,
  formatRiskForDisplay,
  needsImmediateIntervention,
  type RiskType,
  type RiskLevel,
  type ProtectiveFactorType,
  type IdentifiedRisk,
  type ProtectiveFactor,
  type RiskAssessment,
  type InterventionTrigger,
  type RiskPredictorConfig,
} from './risk-predictor';
