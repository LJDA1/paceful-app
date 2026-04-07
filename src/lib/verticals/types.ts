/**
 * Vertical Signal Engine - Shared Types
 *
 * Types for industry-specific signal detection on top of core ERS analysis.
 */

export interface VerticalSignal {
  /** Unique identifier for the signal */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this signal detects */
  description: string;
  /** Example phrases or patterns that indicate this signal */
  examples: string[];
  /**
   * Risk weight from -1 to 1
   * Positive = risk factor, Negative = protective factor
   * Higher absolute value = more significant
   */
  risk_weight: number;
}

export interface RiskLevel {
  /** Risk level identifier */
  level: 'low' | 'moderate' | 'high' | 'critical';
  /** Score range [min, max] inclusive */
  range: [number, number];
  /** Recommended action for this risk level */
  action: string;
}

export interface VerticalConfig {
  /** URL-safe identifier (e.g., "gambling", "workplace") */
  slug: string;
  /** Display name */
  name: string;
  /** Short description of the vertical's purpose */
  description: string;
  /** List of signals to detect */
  signals: VerticalSignal[];
  /** Risk level thresholds and actions */
  risk_levels: RiskLevel[];
  /** Context prompt for Claude analysis */
  prompt_context: string;
}

export interface SignalDetection {
  /** Signal ID from the vertical config */
  id: string;
  /** Whether this signal was detected */
  detected: boolean;
  /** Confidence level of detection */
  confidence: 'low' | 'medium' | 'high' | null;
  /** Evidence or reasoning for detection */
  evidence: string | null;
}

export interface VerticalAnalysisResult {
  /** Computed risk score 0-100 */
  risk_score: number;
  /** Risk level based on thresholds */
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  /** Recommended action from risk level config */
  recommended_action: string;
  /** Detection results for each signal */
  signals: SignalDetection[];
  /** Count of signals detected */
  signals_detected: number;
  /** Total signals in the vertical */
  signals_total: number;
}

export interface VerticalAssessmentResponse {
  user_id: string;
  vertical: string;
  ers: {
    ers_snapshot: number;
    dimensions: Record<string, {
      score: number;
      label: string;
      confidence: string;
    }>;
    readiness_label: string;
    confidence: string;
  };
  vertical_analysis: VerticalAnalysisResult;
  source_type: string;
  extraction_confidence: string;
  assessed_at: string;
}

export interface VerticalListItem {
  slug: string;
  name: string;
  description: string;
  signal_count: number;
}
