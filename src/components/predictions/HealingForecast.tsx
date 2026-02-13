'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Types for prediction data
interface MilestonePrediction {
  stage: 'rebuilding' | 'ready';
  weekProbabilities: Array<{ week: number; probability: number; cumulativeProbability: number }>;
  week4Probability: number;
  week8Probability: number;
  week12Probability: number;
  week16Probability: number;
  week24Probability: number;
  medianWeeks: number | null;
  fastestWeeks: number | null;
  slowestWeeks: number | null;
  confidenceInterval: { lower: number; upper: number };
  confidence: number;
  sampleSize: number;
}

interface TimelinePrediction {
  userId: string;
  milestones: {
    rebuilding: MilestonePrediction;
    ready: MilestonePrediction;
  };
  cohortSize: number;
  similarityScore: number;
  currentStage: 'healing' | 'rebuilding' | 'ready';
  currentERS: number;
  predictedAt: Date;
  metadata: {
    cohortId: string;
    minCohortConfidence: number;
    dataQuality: 'high' | 'medium' | 'low';
  };
}

interface OutcomePrediction {
  outcome: string;
  label: string;
  category: string;
  probability: number;
  typical_timing: string;
  typicalWeeks: number | null;
  fastestWeeks: number | null;
  slowestWeeks: number | null;
  confidence: number;
  sampleSize: number;
  isPositive: boolean;
}

interface OutcomePredictionResult {
  userId: string;
  outcomes: OutcomePrediction[];
  positiveOutcomes: OutcomePrediction[];
  riskOutcomes: OutcomePrediction[];
  cohortSize: number;
  similarityScore: number;
  observationWindow: { minWeeks: number; maxWeeks: number; medianWeeks: number };
  update_frequency: 'weekly' | 'biweekly' | 'monthly';
  predictedAt: Date;
  metadata: {
    cohortId: string;
    dataQuality: 'high' | 'medium' | 'low';
    outcomesCovered: number;
    totalOutcomes: number;
  };
}

interface IdentifiedRisk {
  risk_type: string;
  level: 'high' | 'medium' | 'low';
  probability: number;
  date?: string;
  daysUntil?: number;
  description: string;
  factors: string[];
  recommendations: string[];
  urgency: number;
}

interface ProtectiveFactor {
  factor: string;
  label: string;
  present: boolean;
  strength: number;
  impact: string;
  riskReduction: number;
}

interface RiskAssessment {
  userId: string;
  high_risks: IdentifiedRisk[];
  medium_risks: IdentifiedRisk[];
  low_risks: IdentifiedRisk[];
  protective_factors: ProtectiveFactor[];
  overall_risk_score: number;
  net_risk_score: number;
  risk_trend: 'increasing' | 'stable' | 'decreasing';
  assessment_period: { start: Date; end: Date; weeks: number };
  interventions_triggered: Array<{ interventionType: string; riskType: string; priority: string; message: string }>;
  assessedAt: Date;
  nextAssessmentRecommended: Date;
  metadata: {
    dataQuality: 'high' | 'medium' | 'low';
    factorsAnalyzed: number;
    daysOfData: number;
  };
}

// Database record type
interface PredictionRecord {
  id: string;
  user_id: string;
  prediction_type: string;
  predicted_value: number | null;
  probability: number | null;
  confidence_interval: string | { lower?: number; upper?: number; fastest?: number; slowest?: number } | null;
  predicted_at: string;
  prediction_metadata: string | Record<string, unknown> | null;
}

// Create Supabase client (outside component to prevent re-creation on every render)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface HealingForecastProps {
  userId?: string;
}

interface PredictionData {
  timeline: TimelinePrediction | null;
  outcomes: OutcomePredictionResult | null;
  risks: RiskAssessment | null;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 w-64 p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg -top-2 left-full ml-2 animate-fade-in">
          {content}
          <div className="absolute w-2 h-2 bg-white border-l border-b border-gray-200 transform rotate-45 -left-1 top-4" />
        </div>
      )}
    </div>
  );
}

function ProgressBar({
  value,
  color = 'blue',
  animated = true,
  showLabel = true,
}: {
  value: number;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  animated?: boolean;
  showLabel?: boolean;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setWidth(value), 100);
      return () => clearTimeout(timer);
    } else {
      setWidth(value);
    }
  }, [value, animated]);

  const colorClasses = {
    green: 'bg-paceful-primary',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-400',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClasses[color]}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600 w-12 text-right">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SectionHeader({
  title,
  subtitle,
  tooltip,
}: {
  title: string;
  subtitle?: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          {title}
          {tooltip && (
            <Tooltip content={tooltip}>
              <InfoIcon />
            </Tooltip>
          )}
        </h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-paceful-primary-muted text-paceful-primary',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-blue-50 text-blue-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function TimelineSection({
  timeline,
  onMilestoneClick,
}: {
  timeline: TimelinePrediction | null;
  onMilestoneClick: (milestone: 'rebuilding' | 'ready') => void;
}) {
  if (!timeline) {
    return (
      <Card>
        <SectionHeader
          title="Your Healing Timeline"
          tooltip="These predictions are based on users who had similar breakup experiences and recovery patterns."
        />
        <div className="flex items-center justify-center h-48 text-gray-400">
          <p>Timeline predictions will appear as we gather more data</p>
        </div>
      </Card>
    );
  }

  const { rebuilding, ready } = timeline.milestones;

  const getProgressColor = (probability: number) => {
    if (probability >= 0.7) return 'green';
    if (probability >= 0.4) return 'yellow';
    return 'gray';
  };

  const formatWeeks = (weeks: number | null) => {
    if (weeks === null) return 'N/A';
    if (weeks < 1) return '<1 week';
    if (weeks === 1) return '1 week';
    return `${weeks.toFixed(1)} weeks`;
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const MilestoneCard = ({
    title,
    iconSvg,
    milestone,
    description,
    type,
  }: {
    title: string;
    iconSvg: React.ReactNode;
    milestone: typeof rebuilding;
    description: string;
    type: 'rebuilding' | 'ready';
  }) => {
    const isAchieved = milestone.confidence === 1 && milestone.medianWeeks === 0;

    return (
      <div
        onClick={() => onMilestoneClick(type)}
        className="p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-paceful-primary-muted flex items-center justify-center text-paceful-primary">
              {iconSvg}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          {isAchieved && <Badge variant="success">Achieved</Badge>}
        </div>

        {!isAchieved && (
          <>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Week 4</span>
                <ProgressBar
                  value={milestone.week4Probability * 100}
                  color={getProgressColor(milestone.week4Probability)}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Week 8</span>
                <ProgressBar
                  value={milestone.week8Probability * 100}
                  color={getProgressColor(milestone.week8Probability)}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Week 12</span>
                <ProgressBar
                  value={milestone.week12Probability * 100}
                  color={getProgressColor(milestone.week12Probability)}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Week 16</span>
                <ProgressBar
                  value={milestone.week16Probability * 100}
                  color={getProgressColor(milestone.week16Probability)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Median time:{' '}
                  <span className="font-semibold text-gray-900">
                    {formatWeeks(milestone.medianWeeks)}
                  </span>
                </span>
                <Tooltip
                  content={`Based on ${milestone.sampleSize} similar users. Fastest: ${formatWeeks(milestone.fastestWeeks)}, Slowest: ${formatWeeks(milestone.slowestWeeks)}`}
                >
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <InfoIcon className="w-3 h-3" />
                    {milestone.fastestWeeks !== null && milestone.slowestWeeks !== null && (
                      <>
                        {formatWeeks(milestone.fastestWeeks)} - {formatWeeks(milestone.slowestWeeks)}
                      </>
                    )}
                  </span>
                </Tooltip>
              </div>
            </div>
          </>
        )}

        {isAchieved && (
          <div className="flex items-center gap-2 text-paceful-primary">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">You&apos;ve reached this milestone!</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <SectionHeader
        title="Your Healing Timeline"
        subtitle={`Based on ${timeline.cohortSize} users with similar experiences`}
        tooltip="These predictions show the probability of reaching each milestone at different time points. Higher percentages mean you're more likely to reach that stage by that week."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <MilestoneCard
          title="Rebuilding Stage"
          iconSvg={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          milestone={rebuilding}
          description="ERS score reaches 50+"
          type="rebuilding"
        />
        <MilestoneCard
          title="Ready Stage"
          iconSvg={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
          milestone={ready}
          description="ERS score reaches 75+"
          type="ready"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-paceful-primary" />
              High likelihood (70%+)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              Moderate (40-70%)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              Lower (&lt;40%)
            </span>
          </div>
          <Badge
            variant={
              timeline.metadata.dataQuality === 'high'
                ? 'success'
                : timeline.metadata.dataQuality === 'medium'
                  ? 'warning'
                  : 'default'
            }
          >
            {timeline.metadata.dataQuality} confidence
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function OutcomesSection({ outcomes }: { outcomes: OutcomePredictionResult | null }) {
  if (!outcomes) {
    return (
      <Card>
        <SectionHeader
          title="Likely Outcomes"
          tooltip="These outcomes are based on what happened to users in your cohort over 12-16 weeks."
        />
        <div className="flex items-center justify-center h-32 text-gray-400">
          <p>Outcome predictions will appear soon</p>
        </div>
      </Card>
    );
  }

  const getOutcomeIcon = (isPositive: boolean, probability: number) => {
    if (isPositive) {
      if (probability >= 0.7) return '✓';
      if (probability >= 0.4) return '○';
      return '?';
    } else {
      if (probability >= 0.4) return '!';
      return '○';
    }
  };

  const getOutcomeColor = (isPositive: boolean, probability: number) => {
    if (isPositive) {
      if (probability >= 0.7) return 'text-paceful-primary';
      if (probability >= 0.4) return 'text-amber-600';
      return 'text-gray-500';
    } else {
      if (probability >= 0.4) return 'text-amber-600';
      if (probability >= 0.2) return 'text-rose-500';
      return 'text-gray-500';
    }
  };

  const getProgressColor = (isPositive: boolean, probability: number): 'green' | 'yellow' | 'red' | 'gray' => {
    if (isPositive) {
      if (probability >= 0.7) return 'green';
      if (probability >= 0.4) return 'yellow';
      return 'gray';
    } else {
      if (probability >= 0.4) return 'yellow';
      if (probability >= 0.2) return 'red';
      return 'gray';
    }
  };

  return (
    <Card>
      <SectionHeader
        title="Likely Outcomes"
        subtitle="What typically happens for users like you"
        tooltip="These predictions show the percentage of similar users who experienced each outcome, and approximately when it happened."
      />

      <div className="space-y-1">
        {/* Positive Outcomes */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Positive Milestones
          </h3>
          <div className="space-y-4">
            {outcomes.positiveOutcomes.slice(0, 5).map((outcome) => (
              <div key={outcome.outcome} className="group">
                <div className="flex items-start gap-3">
                  <span
                    className={`text-lg ${getOutcomeColor(true, outcome.probability)}`}
                  >
                    {getOutcomeIcon(true, outcome.probability)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {outcome.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        ~{outcome.typical_timing}
                      </span>
                    </div>
                    <ProgressBar
                      value={outcome.probability * 100}
                      color={getProgressColor(true, outcome.probability)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Outcomes */}
        {outcomes.riskOutcomes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Potential Challenges
            </h3>
            <div className="space-y-4">
              {outcomes.riskOutcomes.map((outcome) => (
                <div key={outcome.outcome} className="group">
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-lg ${getOutcomeColor(false, outcome.probability)}`}
                    >
                      {getOutcomeIcon(false, outcome.probability)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {outcome.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          ~{outcome.typical_timing}
                        </span>
                      </div>
                      <ProgressBar
                        value={outcome.probability * 100}
                        color={getProgressColor(false, outcome.probability)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <p className="flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            <strong>Remember:</strong> These are possibilities, not certainties. Your
            choices and actions can influence these outcomes. Use this as guidance, not
            a fixed future.
          </span>
        </p>
      </div>
    </Card>
  );
}

function RiskAlertsSection({ risks }: { risks: RiskAssessment | null }) {
  if (!risks) {
    return (
      <Card>
        <SectionHeader
          title="Risk Awareness"
          tooltip="We analyze patterns to help you prepare for potentially challenging moments."
        />
        <div className="flex items-center justify-center h-32 text-gray-400">
          <p>Risk analysis will appear soon</p>
        </div>
      </Card>
    );
  }

  const allRisks = [...risks.high_risks, ...risks.medium_risks, ...risks.low_risks];
  const dateBasedRisks = allRisks.filter((r) => r.date);
  const behavioralRisks = allRisks.filter((r) => !r.date);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return '!!';
      case 'medium':
        return '!';
      default:
        return '•';
    }
  };

  const getRiskBorderColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'border-l-rose-500';
      case 'medium':
        return 'border-l-amber-500';
      default:
        return 'border-l-gray-300';
    }
  };

  return (
    <Card>
      <SectionHeader
        title="Risk Awareness"
        subtitle={`Overall risk: ${Math.round(risks.net_risk_score * 100)}% (after protective factors)`}
        tooltip="We identify potential challenges ahead so you can prepare. Higher percentages mean you should pay more attention to that area."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Dates */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Upcoming Sensitive Dates
          </h3>
          {dateBasedRisks.length > 0 ? (
            <div className="space-y-3">
              {dateBasedRisks.slice(0, 4).map((risk, i) => (
                <div
                  key={i}
                  className={`p-4 bg-gray-50 rounded-lg border-l-4 ${getRiskBorderColor(risk.level)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{getRiskIcon(risk.level)}</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(risk.date!)}
                      </span>
                      {risk.daysUntil !== undefined && (
                        <Badge variant={risk.daysUntil <= 7 ? 'danger' : 'warning'}>
                          {risk.daysUntil === 0
                            ? 'Today'
                            : risk.daysUntil === 1
                              ? 'Tomorrow'
                              : `${risk.daysUntil} days`}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {Math.round(risk.probability * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                  {risk.recommendations && risk.recommendations.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Tip:</span>{' '}
                      {risk.recommendations[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              <p className="text-sm">No sensitive dates in the next few weeks</p>
            </div>
          )}
        </div>

        {/* Protective Factors */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Your Protective Factors
          </h3>
          {risks.protective_factors.length > 0 ? (
            <div className="space-y-3">
              {risks.protective_factors
                .filter((f) => f.present)
                .map((factor, i) => (
                  <div
                    key={i}
                    className="p-4 bg-paceful-primary-muted rounded-lg border-l-4 border-l-paceful-primary"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-paceful-primary">✓</span>
                      <span className="font-medium text-gray-900">{factor.label}</span>
                    </div>
                    <p className="text-sm text-paceful-primary">{factor.impact}</p>
                  </div>
                ))}

              {/* Missing protective factors as suggestions */}
              {risks.protective_factors.filter((f) => !f.present).length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Consider adding:</span>
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    {risks.protective_factors
                      .filter((f) => !f.present)
                      .slice(0, 3)
                      .map((factor, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-gray-400">○</span>
                          {factor.label}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <p className="text-sm text-amber-700">
                Build protective habits to reduce your risk score
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Behavioral Risks */}
      {behavioralRisks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Patterns to Watch
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {behavioralRisks.slice(0, 4).map((risk, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {risk.risk_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <Badge variant={risk.level === 'high' ? 'danger' : 'warning'}>
                    {Math.round(risk.probability * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Risk Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">Net Risk Score</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-32">
                <ProgressBar
                  value={risks.net_risk_score * 100}
                  color={
                    risks.net_risk_score >= 0.6
                      ? 'red'
                      : risks.net_risk_score >= 0.35
                        ? 'yellow'
                        : 'green'
                  }
                  showLabel={false}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(risks.net_risk_score * 100)}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-600">Trend</span>
            <div className="flex items-center gap-1 mt-1">
              {risks.risk_trend === 'decreasing' && (
                <>
                  <span className="text-paceful-primary">↓</span>
                  <span className="text-sm text-paceful-primary">Improving</span>
                </>
              )}
              {risks.risk_trend === 'stable' && (
                <>
                  <span className="text-gray-400">→</span>
                  <span className="text-sm text-gray-600">Stable</span>
                </>
              )}
              {risks.risk_trend === 'increasing' && (
                <>
                  <span className="text-rose-500">↑</span>
                  <span className="text-sm text-rose-600">Increasing</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CohortInfoSection({
  timeline,
  onInfoClick,
}: {
  timeline: TimelinePrediction | null;
  onInfoClick: () => void;
}) {
  if (!timeline) return null;

  const getConfidenceLevel = (size: number) => {
    if (size >= 100) return { level: 'High', color: 'success' as const };
    if (size >= 50) return { level: 'Medium', color: 'warning' as const };
    return { level: 'Low', color: 'default' as const };
  };

  const confidence = getConfidenceLevel(timeline.cohortSize);

  return (
    <Card className="bg-gradient-to-br from-gray-50 to-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Your Prediction Cohort</h3>
            <p className="text-sm text-gray-500">
              Predictions based on{' '}
              <span className="font-medium text-gray-700">
                {timeline.cohortSize} users
              </span>{' '}
              with {Math.round(timeline.similarityScore * 100)}% similar profiles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={confidence.color}>{confidence.level} Confidence</Badge>
          <button
            onClick={onInfoClick}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            How it works
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              How Predictions Work
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                  1
                </span>
                Finding Your Cohort
              </h3>
              <p className="text-sm text-gray-600 ml-8">
                We analyze your breakup context, emotional patterns, and recovery
                behaviors to find users who had similar experiences. The more similar
                the cohort, the more relevant the predictions.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                  2
                </span>
                Analyzing Outcomes
              </h3>
              <p className="text-sm text-gray-600 ml-8">
                We look at what happened to users in your cohort over 12-16 weeks:
                when they reached milestones, what challenges they faced, and what
                helped them recover.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                  3
                </span>
                Statistical Methods
              </h3>
              <p className="text-sm text-gray-600 ml-8">
                We use Kaplan-Meier survival analysis to calculate milestone
                probabilities, and bootstrap confidence intervals to measure
                uncertainty. The larger your cohort, the more reliable the
                predictions.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                  4
                </span>
                Understanding Confidence
              </h3>
              <p className="text-sm text-gray-600 ml-8">
                Confidence depends on cohort size and data consistency. Higher
                confidence means predictions are more reliable. We&apos;re transparent
                about uncertainty - predictions improve as we gather more data.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> These are statistical probabilities, not
                guarantees. Your individual journey may differ. Use predictions as
                helpful guidance while remembering that healing isn&apos;t linear, and your
                choices shape your future.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MilestoneDetailModal({
  isOpen,
  onClose,
  milestone,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  milestone: TimelinePrediction['milestones']['rebuilding'] | null;
  type: 'rebuilding' | 'ready';
}) {
  if (!isOpen || !milestone) return null;

  const title = type === 'rebuilding' ? 'Rebuilding Stage' : 'Ready Stage';
  const iconSvg = type === 'rebuilding'
    ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
  const threshold = type === 'rebuilding' ? 50 : 75;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-paceful-primary-muted flex items-center justify-center text-paceful-primary">
                {iconSvg}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              This milestone is reached when your Emotional Readiness Score (ERS)
              consistently stays at or above <strong>{threshold}</strong>.
            </p>

            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Median time</span>
                <span className="font-semibold text-gray-900">
                  {milestone.medianWeeks?.toFixed(1) ?? 'N/A'} weeks
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fastest observed</span>
                <span className="text-gray-900">
                  {milestone.fastestWeeks ?? 'N/A'} weeks
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Slowest observed</span>
                <span className="text-gray-900">
                  {milestone.slowestWeeks ?? 'N/A'} weeks
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sample size</span>
                <span className="text-gray-900">{milestone.sampleSize} users</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Confidence</span>
                <span className="text-gray-900">
                  {Math.round(milestone.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Probability by Week</h4>
              {[
                { week: 4, prob: milestone.week4Probability },
                { week: 8, prob: milestone.week8Probability },
                { week: 12, prob: milestone.week12Probability },
                { week: 16, prob: milestone.week16Probability },
                { week: 24, prob: milestone.week24Probability },
              ].map(({ week, prob }) => (
                <div key={week} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-16">Week {week}</span>
                  <div className="flex-1">
                    <ProgressBar
                      value={prob * 100}
                      color={prob >= 0.7 ? 'green' : prob >= 0.4 ? 'yellow' : 'gray'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HealingForecast({ userId = 'demo-user' }: HealingForecastProps) {
  const [data, setData] = useState<PredictionData>({
    timeline: null,
    outcomes: null,
    risks: null,
    lastUpdated: null,
    loading: true,
    error: null,
  });
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<{
    type: 'rebuilding' | 'ready';
    data: TimelinePrediction['milestones']['rebuilding'] | null;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch predictions from database
  useEffect(() => {
    async function fetchPredictions() {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Fetch timeline predictions
        const { data: timelinePreds } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', userId)
          .in('prediction_type', ['milestone_rebuilding', 'milestone_ready'])
          .order('predicted_at', { ascending: false })
          .limit(2);

        // Fetch outcome predictions
        const { data: outcomePreds } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', userId)
          .like('prediction_type', 'outcome_%')
          .order('predicted_at', { ascending: false })
          .limit(8);

        // Fetch risk assessment
        const { data: riskPreds } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', userId)
          .eq('prediction_type', 'risk_assessment')
          .order('predicted_at', { ascending: false })
          .limit(1)
          .single();

        // Parse timeline predictions
        let timeline: TimelinePrediction | null = null;
        const timelineRecords = (timelinePreds || []) as PredictionRecord[];
        if (timelineRecords.length > 0) {
          const rebuildingPred = timelineRecords.find(
            (p: PredictionRecord) => p.prediction_type === 'milestone_rebuilding'
          );
          const readyPred = timelineRecords.find(
            (p: PredictionRecord) => p.prediction_type === 'milestone_ready'
          );

          const parseMilestone = (pred: PredictionRecord | undefined): MilestonePrediction => {
            if (!pred) {
              return {
                stage: 'rebuilding' as const,
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

            const meta =
              typeof pred.prediction_metadata === 'string'
                ? JSON.parse(pred.prediction_metadata)
                : pred.prediction_metadata || {};

            const ci =
              typeof pred.confidence_interval === 'string'
                ? JSON.parse(pred.confidence_interval)
                : pred.confidence_interval || { lower: 0, upper: 52 };

            return {
              stage: pred.prediction_type.replace('milestone_', '') as 'rebuilding' | 'ready',
              weekProbabilities: [],
              week4Probability: meta?.weekProbabilities?.week4 ?? 0,
              week8Probability: meta?.weekProbabilities?.week8 ?? 0,
              week12Probability: pred.probability ?? 0,
              week16Probability: meta?.weekProbabilities?.week16 ?? 0,
              week24Probability: meta?.weekProbabilities?.week24 ?? 0,
              medianWeeks: pred.predicted_value,
              fastestWeeks: meta?.fastestWeeks ?? null,
              slowestWeeks: meta?.slowestWeeks ?? null,
              confidenceInterval: ci,
              confidence: meta?.confidence ?? 0,
              sampleSize: meta?.sampleSize ?? 0,
            };
          };

          const meta =
            typeof rebuildingPred?.prediction_metadata === 'string'
              ? JSON.parse(rebuildingPred.prediction_metadata)
              : rebuildingPred?.prediction_metadata || {};

          timeline = {
            userId,
            milestones: {
              rebuilding: parseMilestone(rebuildingPred),
              ready: parseMilestone(readyPred),
            },
            cohortSize: meta?.cohortSize ?? 50,
            similarityScore: meta?.similarityScore ?? 0.7,
            currentStage: 'healing',
            currentERS: 0,
            predictedAt: new Date(rebuildingPred?.predicted_at || Date.now()),
            metadata: {
              cohortId: '',
              minCohortConfidence: Math.min(
                parseMilestone(rebuildingPred).confidence,
                parseMilestone(readyPred).confidence
              ),
              dataQuality: meta?.dataQuality ?? 'medium',
            },
          };
        }

        // Parse outcome predictions
        let outcomes: OutcomePredictionResult | null = null;
        const outcomeRecords = (outcomePreds || []) as PredictionRecord[];
        if (outcomeRecords.length > 0) {
          const parsedOutcomes = outcomeRecords.map((pred: PredictionRecord) => {
            const meta =
              typeof pred.prediction_metadata === 'string'
                ? JSON.parse(pred.prediction_metadata)
                : pred.prediction_metadata || {};

            const ci =
              typeof pred.confidence_interval === 'string'
                ? JSON.parse(pred.confidence_interval)
                : pred.confidence_interval || {};

            return {
              outcome: pred.prediction_type.replace('outcome_', ''),
              label: meta?.label || pred.prediction_type.replace('outcome_', '').replace(/_/g, ' '),
              category: meta?.category || 'cognitive',
              probability: pred.probability || 0,
              typical_timing: pred.predicted_value
                ? `${Math.round(pred.predicted_value)} weeks`
                : 'Unknown',
              typicalWeeks: pred.predicted_value,
              fastestWeeks: ci?.fastest ?? null,
              slowestWeeks: ci?.slowest ?? null,
              confidence: meta?.confidence ?? 0.5,
              sampleSize: meta?.sampleSize ?? 0,
              isPositive: meta?.isPositive ?? true,
            };
          });

          const firstMeta =
            typeof outcomeRecords[0]?.prediction_metadata === 'string'
              ? JSON.parse(outcomeRecords[0].prediction_metadata)
              : (outcomeRecords[0]?.prediction_metadata as Record<string, unknown>) || {};

          outcomes = {
            userId,
            outcomes: parsedOutcomes,
            positiveOutcomes: parsedOutcomes.filter((o: OutcomePrediction) => o.isPositive),
            riskOutcomes: parsedOutcomes.filter((o: OutcomePrediction) => !o.isPositive),
            cohortSize: (firstMeta?.cohortSize as number) ?? 50,
            similarityScore: (firstMeta?.similarityScore as number) ?? 0.7,
            observationWindow: { minWeeks: 0, maxWeeks: 16, medianWeeks: 8 },
            update_frequency: 'weekly',
            predictedAt: new Date(outcomeRecords[0]?.predicted_at || Date.now()),
            metadata: {
              cohortId: '',
              dataQuality: firstMeta?.dataQuality ?? 'medium',
              outcomesCovered: parsedOutcomes.length,
              totalOutcomes: 8,
            },
          };
        }

        // Parse risk assessment
        let risks: RiskAssessment | null = null;
        const riskRecord = riskPreds as PredictionRecord | null;
        if (riskRecord) {
          const meta =
            typeof riskRecord.prediction_metadata === 'string'
              ? JSON.parse(riskRecord.prediction_metadata)
              : (riskRecord.prediction_metadata as Record<string, unknown>) || {};

          risks = {
            userId,
            high_risks: (meta?.highRisks || []).map((r: { type: string; probability: number; date?: string }) => ({
              risk_type: r.type,
              level: 'high' as const,
              probability: r.probability,
              date: r.date,
              daysUntil: r.date
                ? Math.ceil(
                    (new Date(r.date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                  )
                : undefined,
              description: `High risk: ${r.type.replace(/_/g, ' ')}`,
              factors: [],
              recommendations: [],
              urgency: r.probability,
            })),
            medium_risks: [],
            low_risks: [],
            protective_factors: (meta?.protectiveFactors || []).map((f: string) => ({
              factor: f,
              label: f.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              present: true,
              strength: 0.7,
              impact: 'Reduces setback risk',
              riskReduction: 0.3,
            })),
            overall_risk_score: riskRecord.probability || 0,
            net_risk_score: riskRecord.predicted_value || 0,
            risk_trend: meta?.trend || 'stable',
            assessment_period: {
              start: new Date(),
              end: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
              weeks: 4,
            },
            interventions_triggered: [],
            assessedAt: new Date(riskRecord.predicted_at || Date.now()),
            nextAssessmentRecommended: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            metadata: {
              dataQuality: meta?.dataQuality || 'medium',
              factorsAnalyzed: 0,
              daysOfData: 28,
            },
          };
        }

        // Find latest update time
        const allDates = [
          timeline?.predictedAt,
          outcomes?.predictedAt,
          risks?.assessedAt,
        ].filter(Boolean) as Date[];
        const lastUpdated = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null;

        setData({
          timeline,
          outcomes,
          risks,
          lastUpdated,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to load predictions',
        }));
      }
    }

    fetchPredictions();
  }, [userId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // In production, this would trigger a re-calculation of predictions
    // For now, just refetch from database
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const handleMilestoneClick = (type: 'rebuilding' | 'ready') => {
    if (data.timeline) {
      setSelectedMilestone({
        type,
        data: data.timeline.milestones[type],
      });
    }
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  if (data.loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">{data.error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const hasNoPredictions = !data.timeline && !data.outcomes && !data.risks;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Healing Forecast</h1>
          <p className="text-gray-500 mt-1">
            Personalized predictions based on your recovery journey
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Updated {formatLastUpdated(data.lastUpdated)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Update
              </>
            )}
          </button>
        </div>
      </div>

      {hasNoPredictions ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Building Your Predictions
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              We&apos;re analyzing your data to create personalized predictions. Keep
              journaling and tracking your mood - predictions will appear as we gather
              more insights about your healing journey.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Cohort Info */}
          <CohortInfoSection
            timeline={data.timeline}
            onInfoClick={() => setShowHowItWorks(true)}
          />

          {/* Timeline Section */}
          <TimelineSection
            timeline={data.timeline}
            onMilestoneClick={handleMilestoneClick}
          />

          {/* Outcomes Section */}
          <OutcomesSection outcomes={data.outcomes} />

          {/* Risk Alerts Section */}
          <RiskAlertsSection risks={data.risks} />
        </>
      )}

      {/* Modals */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      <MilestoneDetailModal
        isOpen={selectedMilestone !== null}
        onClose={() => setSelectedMilestone(null)}
        milestone={selectedMilestone?.data ?? null}
        type={selectedMilestone?.type ?? 'rebuilding'}
      />

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
