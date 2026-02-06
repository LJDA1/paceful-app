/**
 * Risk Prediction Engine for Paceful
 *
 * This module identifies and predicts risk factors that could impede
 * emotional recovery. By analyzing user data patterns, significant dates,
 * and behavioral signals, we can proactively intervene before setbacks occur.
 *
 * Risk Categories:
 * - Setback Risk: Regression in emotional recovery
 * - Contact/Reconciliation Risk: Urge to reach out to ex
 * - Rebound Relationship Risk: Premature new relationship
 * - Isolation Risk: Social withdrawal patterns
 *
 * Protective Factors:
 * - Daily journaling, therapy, social support
 * - Healthy coping mechanisms, support circle engagement
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Types of risks we track and predict
 */
export type RiskType =
  | 'setback'
  | 'contact_temptation'
  | 'reconciliation'
  | 'rebound_relationship'
  | 'isolation'
  | 'valentine_setback'
  | 'anniversary_setback'
  | 'birthday_setback'
  | 'holiday_setback';

/**
 * Risk severity levels
 */
export type RiskLevel = 'high' | 'medium' | 'low';

/**
 * Types of protective factors
 */
export type ProtectiveFactorType =
  | 'daily_journaling'
  | 'therapy_engagement'
  | 'strong_social_support'
  | 'support_circle_active'
  | 'healthy_coping'
  | 'regular_exercise'
  | 'mindfulness_practice'
  | 'professional_help'
  | 'consistent_routine'
  | 'new_hobbies';

/**
 * A single identified risk
 */
export interface IdentifiedRisk {
  risk_type: RiskType;
  level: RiskLevel;
  probability: number;        // 0-1 probability of risk materializing
  date?: string;              // ISO date if date-specific
  daysUntil?: number;         // Days until date-specific risk
  description: string;
  factors: string[];          // Contributing factors
  recommendations: string[];  // Actionable recommendations
  urgency: number;            // 0-1 urgency score for prioritization
}

/**
 * A protective factor with its impact
 */
export interface ProtectiveFactor {
  factor: ProtectiveFactorType;
  label: string;
  present: boolean;
  strength: number;           // 0-1 how strongly present
  impact: string;             // Human-readable impact description
  riskReduction: number;      // % reduction in overall risk
}

/**
 * Complete risk assessment result
 */
export interface RiskAssessment {
  userId: string;
  high_risks: IdentifiedRisk[];
  medium_risks: IdentifiedRisk[];
  low_risks: IdentifiedRisk[];
  protective_factors: ProtectiveFactor[];
  overall_risk_score: number;     // 0-1 composite risk score
  net_risk_score: number;         // Risk after protective factors
  risk_trend: 'increasing' | 'stable' | 'decreasing';
  assessment_period: {
    start: Date;
    end: Date;
    weeks: number;
  };
  interventions_triggered: InterventionTrigger[];
  assessedAt: Date;
  nextAssessmentRecommended: Date;
  metadata: {
    dataQuality: 'high' | 'medium' | 'low';
    factorsAnalyzed: number;
    daysOfData: number;
  };
}

/**
 * Intervention triggered by risk detection
 */
export interface InterventionTrigger {
  interventionType: string;
  riskType: RiskType;
  priority: 'immediate' | 'soon' | 'scheduled';
  message: string;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Raw data collected for risk analysis
 */
interface UserRiskData {
  userId: string;
  profile: {
    breakupDate: Date | null;
    exBirthday: Date | null;
    anniversaryDate: Date | null;
    relationshipDuration: number | null;
  };
  recentMoods: Array<{
    mood: number;
    createdAt: Date;
    notes?: string;
  }>;
  recentJournals: Array<{
    content: string;
    sentiment: number;
    createdAt: Date;
  }>;
  activityPatterns: {
    lateNightUsage: number;     // % of activity between 11pm-4am
    weekendActivity: number;    // Average weekend engagement
    consistency: number;        // Regularity of app usage
    lastActiveAt: Date | null;
  };
  socialMetrics: {
    supportCircleSize: number;
    supportCircleEngagement: number;
    friendMentions: number;     // In journals
    isolationIndicators: number;
  };
  copingBehaviors: {
    journalingFrequency: number;    // Per week
    exerciseFrequency: number;
    therapyMentioned: boolean;
    mindfulnessEngagement: number;
    healthyCopingScore: number;
  };
  ersHistory: Array<{
    score: number;
    weekOf: Date;
  }>;
}

/**
 * Configuration for risk predictor
 */
export interface RiskPredictorConfig {
  lookAheadWeeks: number;         // How far ahead to predict
  lookBackDays: number;           // Historical data window
  moodVolatilityThreshold: number;
  isolationThreshold: number;
  lateNightThreshold: number;
  interventionThreshold: number;  // Risk level to trigger intervention
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: RiskPredictorConfig = {
  lookAheadWeeks: 4,
  lookBackDays: 28,
  moodVolatilityThreshold: 2.5,   // Std dev threshold
  isolationThreshold: 0.3,        // Engagement below 30%
  lateNightThreshold: 0.25,       // >25% late night usage is concerning
  interventionThreshold: 0.7,     // Trigger intervention at 70% risk
};

// Significant dates to monitor
const SIGNIFICANT_DATES = [
  { month: 2, day: 14, name: 'valentine', riskType: 'valentine_setback' as RiskType },
  { month: 12, day: 25, name: 'christmas', riskType: 'holiday_setback' as RiskType },
  { month: 12, day: 31, name: 'new_years', riskType: 'holiday_setback' as RiskType },
];

// Protective factor definitions with risk reduction percentages
const PROTECTIVE_FACTOR_IMPACTS: Record<ProtectiveFactorType, {
  label: string;
  riskReduction: number;
  threshold: number;
}> = {
  daily_journaling: {
    label: 'Daily journaling',
    riskReduction: 0.34,
    threshold: 5, // 5+ entries per week
  },
  therapy_engagement: {
    label: 'Therapy engagement',
    riskReduction: 0.42,
    threshold: 0.5,
  },
  strong_social_support: {
    label: 'Strong social support',
    riskReduction: 0.38,
    threshold: 3, // 3+ friends mentioned
  },
  support_circle_active: {
    label: 'Active support circle',
    riskReduction: 0.28,
    threshold: 2, // 2+ circle members
  },
  healthy_coping: {
    label: 'Healthy coping mechanisms',
    riskReduction: 0.31,
    threshold: 0.6,
  },
  regular_exercise: {
    label: 'Regular exercise',
    riskReduction: 0.25,
    threshold: 3, // 3+ times per week
  },
  mindfulness_practice: {
    label: 'Mindfulness practice',
    riskReduction: 0.22,
    threshold: 0.4,
  },
  professional_help: {
    label: 'Professional help',
    riskReduction: 0.45,
    threshold: 0.5,
  },
  consistent_routine: {
    label: 'Consistent daily routine',
    riskReduction: 0.20,
    threshold: 0.7,
  },
  new_hobbies: {
    label: 'New hobbies or activities',
    riskReduction: 0.18,
    threshold: 0.5,
  },
};

// Sentiment keywords for contact temptation detection
const CONTACT_TEMPTATION_KEYWORDS = [
  'miss', 'missing', 'miss them', 'miss him', 'miss her',
  'reach out', 'text', 'call', 'message', 'contact',
  'wondering what', 'thinking about calling', 'want to talk',
  'should i text', 'tempted to', 'urge to contact',
  'checking their', 'social media', 'stalking',
  'saw their post', 'mutual friend said',
];

const ISOLATION_KEYWORDS = [
  'alone', 'lonely', 'no one', 'nobody',
  'canceled plans', 'stayed home', 'don\'t want to see',
  'avoiding', 'isolated', 'withdrawn',
  'friends don\'t understand', 'burden',
];

const HEALTHY_COPING_KEYWORDS = [
  'therapy', 'therapist', 'counselor', 'counseling',
  'exercise', 'gym', 'workout', 'run', 'yoga',
  'meditat', 'mindful', 'breathing',
  'friends', 'family', 'support',
  'hobby', 'reading', 'learning', 'class',
  'self-care', 'boundaries',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate days until a date (next occurrence if annual)
 */
function daysUntilDate(targetDate: Date, fromDate: Date = new Date()): number {
  const target = new Date(targetDate);
  const from = new Date(fromDate);

  // Set target to current year
  target.setFullYear(from.getFullYear());

  // If date has passed this year, use next year
  if (target < from) {
    target.setFullYear(from.getFullYear() + 1);
  }

  return Math.ceil((target.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Count keyword occurrences in text
 */
function countKeywords(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(keyword.toLowerCase(), 'gi');
    const matches = lowerText.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

/**
 * Calculate sentiment from journal content (simple heuristic)
 */
function analyzeJournalSentiment(content: string): {
  contactTemptation: number;
  isolation: number;
  healthyCoping: number;
} {
  const contentLower = content.toLowerCase();

  const contactScore = countKeywords(contentLower, CONTACT_TEMPTATION_KEYWORDS);
  const isolationScore = countKeywords(contentLower, ISOLATION_KEYWORDS);
  const copingScore = countKeywords(contentLower, HEALTHY_COPING_KEYWORDS);

  // Normalize to 0-1 scale (assuming max ~10 keywords per category)
  return {
    contactTemptation: Math.min(contactScore / 5, 1),
    isolation: Math.min(isolationScore / 5, 1),
    healthyCoping: Math.min(copingScore / 10, 1),
  };
}

/**
 * Generate recommendations based on risk type
 */
function getRecommendations(riskType: RiskType): string[] {
  const recommendations: Record<RiskType, string[]> = {
    setback: [
      'Reach out to your support circle today',
      'Write in your journal about what triggered these feelings',
      'Practice the 5-4-3-2-1 grounding exercise',
      'Remember: setbacks are part of healing, not failure',
    ],
    contact_temptation: [
      'Wait 24 hours before making any contact decisions',
      'Write a letter you won\'t send to process your feelings',
      'Call a friend from your support circle instead',
      'Review your reasons for the breakup',
    ],
    reconciliation: [
      'Revisit your list of relationship red flags',
      'Talk to your therapist or a trusted friend first',
      'Consider if your needs have actually changed',
      'Remember the pain that led to this point',
    ],
    rebound_relationship: [
      'Focus on your own healing journey first',
      'Ensure you\'re not seeking validation externally',
      'Consider what you truly want vs. what feels comfortable',
      'Give yourself permission to be single',
    ],
    isolation: [
      'Schedule one social activity this week',
      'Reach out to someone in your support circle',
      'Consider joining a group activity or class',
      'Even a short walk outside can help',
    ],
    valentine_setback: [
      'Plan self-care activities for Valentine\'s Day',
      'Spend the day with friends or family',
      'Avoid social media that day',
      'Treat yourself to something special',
    ],
    anniversary_setback: [
      'Acknowledge the day but don\'t dwell on it',
      'Plan something meaningful for yourself',
      'Reach out to your support circle',
      'Journal about how far you\'ve come',
    ],
    birthday_setback: [
      'It\'s okay to feel sad on this day',
      'Don\'t send a birthday message',
      'Plan activities with people who support you',
      'Write about your feelings instead of acting on them',
    ],
    holiday_setback: [
      'Create new traditions for yourself',
      'Surround yourself with supportive people',
      'Limit alcohol and late-night scrolling',
      'Have a support person on standby',
    ],
  };

  return recommendations[riskType] || recommendations.setback;
}

// ============================================================================
// RISK PREDICTOR CLASS
// ============================================================================

/**
 * RiskPredictor identifies and quantifies risk factors that could
 * impede emotional recovery, and identifies protective factors.
 *
 * Usage:
 * ```typescript
 * const predictor = new RiskPredictor();
 * const assessment = await predictor.assess(userId);
 * ```
 */
export class RiskPredictor {
  private config: RiskPredictorConfig;

  constructor(config: Partial<RiskPredictorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch all relevant user data for risk analysis.
   */
  private async fetchUserRiskData(userId: string): Promise<UserRiskData | null> {
    try {
      const lookBackDate = new Date();
      lookBackDate.setDate(lookBackDate.getDate() - this.config.lookBackDays);

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          relationship_ended_at,
          relationship_duration_months,
          ex_birthday,
          anniversary_date
        `)
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Fetch recent moods
      const { data: moods } = await supabase
        .from('mood_entries')
        .select('mood_value, trigger_description, created_at')
        .eq('user_id', userId)
        .gte('created_at', lookBackDate.toISOString())
        .order('created_at', { ascending: false });

      // Fetch recent journals
      const { data: journals } = await supabase
        .from('journal_entries')
        .select('entry_content, sentiment_score, created_at')
        .eq('user_id', userId)
        .gte('created_at', lookBackDate.toISOString())
        .order('created_at', { ascending: false });

      // Fetch activity patterns
      const { data: activities } = await supabase
        .from('user_activity')
        .select('activity_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', lookBackDate.toISOString());

      // Fetch support circle
      const { data: supportCircle } = await supabase
        .from('support_circle')
        .select('id, last_interaction_at')
        .eq('user_id', userId);

      // Fetch ERS history
      const { data: ersHistory } = await supabase
        .from('ers_scores')
        .select('ers_score, week_of')
        .eq('user_id', userId)
        .order('week_of', { ascending: false })
        .limit(12);

      // Fetch exercise completions with exercise details
      const { data: exercises } = await supabase
        .from('exercise_completions')
        .select('exercise_id, created_at, exercises(exercise_type)')
        .eq('user_id', userId)
        .gte('created_at', lookBackDate.toISOString());

      // Calculate activity patterns
      const lateNightActivities = (activities || []).filter(a => {
        const hour = new Date(a.created_at).getHours();
        return hour >= 23 || hour < 4;
      });
      const lateNightUsage = activities?.length
        ? lateNightActivities.length / activities.length
        : 0;

      const weekendActivities = (activities || []).filter(a => {
        const day = new Date(a.created_at).getDay();
        return day === 0 || day === 6;
      });

      // Calculate consistency (days with activity / total days)
      const uniqueDays = new Set(
        (activities || []).map(a =>
          new Date(a.created_at).toISOString().split('T')[0]
        )
      );
      const consistency = uniqueDays.size / this.config.lookBackDays;

      // Analyze journal content for friend mentions
      const allJournalContent = (journals || [])
        .map(j => j.entry_content || '')
        .join(' ')
        .toLowerCase();
      const friendMentions = countKeywords(allJournalContent, [
        'friend', 'friends', 'buddy', 'pal', 'bestie',
        'met up', 'hung out', 'called', 'texted',
      ]);

      // Check for therapy mentions
      const therapyMentioned = countKeywords(allJournalContent, [
        'therapy', 'therapist', 'counselor', 'counseling',
        'session', 'psychologist', 'psychiatrist',
      ]) > 0;

      // Calculate healthy coping score from journals
      let healthyCopingTotal = 0;
      for (const journal of journals || []) {
        const sentiment = analyzeJournalSentiment(journal.entry_content || '');
        healthyCopingTotal += sentiment.healthyCoping;
      }
      const healthyCopingScore = journals?.length
        ? healthyCopingTotal / journals.length
        : 0;

      // Calculate isolation indicators
      const isolationTotal = (journals || []).reduce((sum, j) => {
        const sentiment = analyzeJournalSentiment(j.entry_content || '');
        return sum + sentiment.isolation;
      }, 0);
      const isolationIndicators = journals?.length
        ? isolationTotal / journals.length
        : 0;

      // Calculate support circle engagement
      const recentInteractions = (supportCircle || []).filter(s => {
        if (!s.last_interaction_at) return false;
        const interactionDate = new Date(s.last_interaction_at);
        return interactionDate >= lookBackDate;
      });

      return {
        userId,
        profile: {
          breakupDate: profile?.relationship_ended_at
            ? new Date(profile.relationship_ended_at)
            : null,
          exBirthday: profile?.ex_birthday
            ? new Date(profile.ex_birthday)
            : null,
          anniversaryDate: profile?.anniversary_date
            ? new Date(profile.anniversary_date)
            : null,
          relationshipDuration: profile?.relationship_duration_months || null,
        },
        recentMoods: (moods || []).map(m => ({
          mood: m.mood_value,
          createdAt: new Date(m.created_at),
          notes: m.trigger_description,
        })),
        recentJournals: (journals || []).map(j => ({
          content: j.entry_content,
          sentiment: j.sentiment_score || 0,
          createdAt: new Date(j.created_at),
        })),
        activityPatterns: {
          lateNightUsage,
          weekendActivity: activities?.length
            ? weekendActivities.length / (activities.length / 7 * 2)
            : 0,
          consistency,
          lastActiveAt: activities?.[0]
            ? new Date(activities[0].created_at)
            : null,
        },
        socialMetrics: {
          supportCircleSize: supportCircle?.length || 0,
          supportCircleEngagement: supportCircle?.length
            ? recentInteractions.length / supportCircle.length
            : 0,
          friendMentions,
          isolationIndicators,
        },
        copingBehaviors: {
          journalingFrequency: journals?.length
            ? (journals.length / this.config.lookBackDays) * 7
            : 0,
          exerciseFrequency: exercises?.length
            ? (exercises.length / this.config.lookBackDays) * 7
            : 0,
          therapyMentioned,
          mindfulnessEngagement: (exercises || []).filter(e => {
            const exerciseType = (e.exercises as { exercise_type?: string })?.exercise_type?.toLowerCase() || '';
            return exerciseType.includes('mindful') ||
              exerciseType.includes('meditation') ||
              exerciseType.includes('breathing');
          }).length / Math.max(exercises?.length || 1, 1),
          healthyCopingScore,
        },
        ersHistory: (ersHistory || []).map(e => ({
          score: e.ers_score,
          weekOf: new Date(e.week_of),
        })),
      };
    } catch (error) {
      console.error('Error fetching user risk data:', error);
      return null;
    }
  }

  /**
   * Identify upcoming significant dates and their risk levels.
   */
  private identifyDateRisks(data: UserRiskData): IdentifiedRisk[] {
    const risks: IdentifiedRisk[] = [];
    const now = new Date();
    const lookAheadDays = this.config.lookAheadWeeks * 7;

    // Check standard significant dates
    for (const date of SIGNIFICANT_DATES) {
      const targetDate = new Date(now.getFullYear(), date.month - 1, date.day);
      const days = daysUntilDate(targetDate);

      if (days <= lookAheadDays) {
        // Higher risk for longer relationships and more recent breakups
        let baseProbability = 0.5;

        if (data.profile.breakupDate) {
          const monthsSinceBreakup = Math.floor(
            (now.getTime() - data.profile.breakupDate.getTime()) /
            (30 * 24 * 60 * 60 * 1000)
          );
          if (monthsSinceBreakup < 3) baseProbability += 0.2;
          else if (monthsSinceBreakup < 6) baseProbability += 0.1;
        }

        if (data.profile.relationshipDuration) {
          if (data.profile.relationshipDuration > 24) baseProbability += 0.15;
          else if (data.profile.relationshipDuration > 12) baseProbability += 0.1;
        }

        // Proximity increases risk
        if (days <= 7) baseProbability += 0.15;
        else if (days <= 14) baseProbability += 0.1;

        const probability = Math.min(baseProbability, 0.95);
        const level = probability >= 0.7 ? 'high' : probability >= 0.4 ? 'medium' : 'low';

        risks.push({
          risk_type: date.riskType,
          level,
          probability,
          date: targetDate.toISOString().split('T')[0],
          daysUntil: days,
          description: `${date.name.charAt(0).toUpperCase() + date.name.slice(1)} is in ${days} days`,
          factors: [
            `${date.name} can trigger memories and emotions`,
            days <= 7 ? 'Date is very close' : 'Date is approaching',
          ],
          recommendations: getRecommendations(date.riskType),
          urgency: 1 - (days / lookAheadDays),
        });
      }
    }

    // Check ex's birthday
    if (data.profile.exBirthday) {
      const days = daysUntilDate(data.profile.exBirthday);
      if (days <= lookAheadDays) {
        const probability = days <= 7 ? 0.75 : days <= 14 ? 0.6 : 0.45;
        risks.push({
          risk_type: 'birthday_setback',
          level: probability >= 0.7 ? 'high' : 'medium',
          probability,
          date: new Date(
            now.getFullYear(),
            data.profile.exBirthday.getMonth(),
            data.profile.exBirthday.getDate()
          ).toISOString().split('T')[0],
          daysUntil: days,
          description: `Your ex's birthday is in ${days} days`,
          factors: [
            'Birthday may trigger urge to reach out',
            'Memories of past celebrations',
          ],
          recommendations: getRecommendations('birthday_setback'),
          urgency: 1 - (days / lookAheadDays),
        });
      }
    }

    // Check anniversary
    if (data.profile.anniversaryDate) {
      const days = daysUntilDate(data.profile.anniversaryDate);
      if (days <= lookAheadDays) {
        const probability = days <= 7 ? 0.8 : days <= 14 ? 0.65 : 0.5;
        risks.push({
          risk_type: 'anniversary_setback',
          level: probability >= 0.7 ? 'high' : 'medium',
          probability,
          date: new Date(
            now.getFullYear(),
            data.profile.anniversaryDate.getMonth(),
            data.profile.anniversaryDate.getDate()
          ).toISOString().split('T')[0],
          daysUntil: days,
          description: `Your anniversary date is in ${days} days`,
          factors: [
            'Anniversary dates often trigger intense emotions',
            'Memories of relationship milestones',
          ],
          recommendations: getRecommendations('anniversary_setback'),
          urgency: 1 - (days / lookAheadDays),
        });
      }
    }

    return risks;
  }

  /**
   * Analyze mood patterns for volatility and concerning trends.
   */
  private analyzeMoodRisks(data: UserRiskData): IdentifiedRisk[] {
    const risks: IdentifiedRisk[] = [];

    if (data.recentMoods.length < 5) return risks;

    const moodScores = data.recentMoods.map(m => m.mood);
    const stdDev = calculateStdDev(moodScores);
    const mean = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;

    // High volatility risk
    if (stdDev > this.config.moodVolatilityThreshold) {
      const probability = Math.min(0.4 + (stdDev - this.config.moodVolatilityThreshold) * 0.15, 0.85);
      risks.push({
        risk_type: 'setback',
        level: probability >= 0.7 ? 'high' : 'medium',
        probability,
        description: 'High mood volatility detected',
        factors: [
          `Mood variance is ${stdDev.toFixed(1)}, above normal threshold`,
          'Emotional instability increases setback risk',
        ],
        recommendations: getRecommendations('setback'),
        urgency: probability,
      });
    }

    // Declining mood trend
    const recentMoods = moodScores.slice(0, Math.min(7, moodScores.length));
    const olderMoods = moodScores.slice(7, 14);

    if (recentMoods.length >= 3 && olderMoods.length >= 3) {
      const recentAvg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
      const olderAvg = olderMoods.reduce((a, b) => a + b, 0) / olderMoods.length;

      if (recentAvg < olderAvg - 1.5) {
        const decline = olderAvg - recentAvg;
        const probability = Math.min(0.35 + decline * 0.1, 0.8);
        risks.push({
          risk_type: 'setback',
          level: probability >= 0.6 ? 'high' : 'medium',
          probability,
          description: 'Declining mood trend detected',
          factors: [
            `Average mood dropped by ${decline.toFixed(1)} points recently`,
            'Downward trends can indicate approaching setback',
          ],
          recommendations: getRecommendations('setback'),
          urgency: probability * 0.9,
        });
      }
    }

    return risks;
  }

  /**
   * Analyze journal content for contact temptation signals.
   */
  private analyzeContactRisks(data: UserRiskData): IdentifiedRisk[] {
    const risks: IdentifiedRisk[] = [];

    if (data.recentJournals.length === 0) return risks;

    // Analyze recent journals for contact temptation
    let totalContactTemptation = 0;
    let recentContactTemptation = 0;
    const recentCount = Math.min(5, data.recentJournals.length);

    for (let i = 0; i < data.recentJournals.length; i++) {
      const journal = data.recentJournals[i];
      const sentiment = analyzeJournalSentiment(journal.content);

      totalContactTemptation += sentiment.contactTemptation;
      if (i < recentCount) {
        recentContactTemptation += sentiment.contactTemptation;
      }
    }

    const avgContactTemptation = totalContactTemptation / data.recentJournals.length;
    const recentAvgTemptation = recentContactTemptation / recentCount;

    // High contact temptation
    if (recentAvgTemptation > 0.4 || avgContactTemptation > 0.3) {
      const probability = Math.min(recentAvgTemptation * 1.5, 0.9);
      risks.push({
        risk_type: 'contact_temptation',
        level: probability >= 0.7 ? 'high' : probability >= 0.4 ? 'medium' : 'low',
        probability,
        description: 'Contact temptation detected in journal entries',
        factors: [
          'Journal entries show thoughts about reaching out',
          'This is a common and normal part of healing',
        ],
        recommendations: getRecommendations('contact_temptation'),
        urgency: probability,
      });
    }

    // Escalating temptation
    if (recentAvgTemptation > avgContactTemptation * 1.5 && avgContactTemptation > 0.1) {
      risks.push({
        risk_type: 'reconciliation',
        level: 'medium',
        probability: 0.5,
        description: 'Increasing thoughts about ex-partner',
        factors: [
          'Contact temptation appears to be escalating',
          'This may lead to reconciliation attempts',
        ],
        recommendations: getRecommendations('reconciliation'),
        urgency: 0.6,
      });
    }

    return risks;
  }

  /**
   * Analyze social and behavioral patterns for isolation risk.
   */
  private analyzeIsolationRisks(data: UserRiskData): IdentifiedRisk[] {
    const risks: IdentifiedRisk[] = [];

    // Social metrics
    const {
      supportCircleSize,
      supportCircleEngagement,
      friendMentions,
      isolationIndicators,
    } = data.socialMetrics;

    // Low support circle engagement
    if (supportCircleSize > 0 && supportCircleEngagement < this.config.isolationThreshold) {
      const probability = 0.4 + (1 - supportCircleEngagement) * 0.3;
      risks.push({
        risk_type: 'isolation',
        level: probability >= 0.6 ? 'high' : 'medium',
        probability,
        description: 'Low support circle engagement',
        factors: [
          `Only ${Math.round(supportCircleEngagement * 100)}% of support circle recently contacted`,
          'Social support is crucial for recovery',
        ],
        recommendations: getRecommendations('isolation'),
        urgency: probability * 0.8,
      });
    }

    // No support circle at all
    if (supportCircleSize === 0) {
      risks.push({
        risk_type: 'isolation',
        level: 'high',
        probability: 0.75,
        description: 'No support circle established',
        factors: [
          'Having a support circle significantly improves recovery',
          'Consider adding trusted friends or family',
        ],
        recommendations: [
          'Add at least 2-3 people to your support circle',
          'Consider joining a support group',
          'Reach out to old friends you\'ve lost touch with',
        ],
        urgency: 0.8,
      });
    }

    // Journal isolation indicators
    if (isolationIndicators > 0.4) {
      const probability = Math.min(0.35 + isolationIndicators * 0.6, 0.85);
      risks.push({
        risk_type: 'isolation',
        level: probability >= 0.65 ? 'high' : 'medium',
        probability,
        description: 'Isolation themes in journal entries',
        factors: [
          'Journal content suggests feelings of loneliness',
          'Social withdrawal can slow recovery',
        ],
        recommendations: getRecommendations('isolation'),
        urgency: probability * 0.9,
      });
    }

    // Low friend mentions
    const weeksOfData = this.config.lookBackDays / 7;
    if (data.recentJournals.length > 3 && friendMentions < weeksOfData) {
      risks.push({
        risk_type: 'isolation',
        level: 'low',
        probability: 0.35,
        description: 'Minimal friend mentions in journals',
        factors: [
          'Journal entries rarely mention social interactions',
          'Consider reconnecting with friends',
        ],
        recommendations: getRecommendations('isolation'),
        urgency: 0.3,
      });
    }

    return risks;
  }

  /**
   * Analyze behavioral patterns for concerning habits.
   */
  private analyzeBehavioralRisks(data: UserRiskData): IdentifiedRisk[] {
    const risks: IdentifiedRisk[] = [];

    // Late night usage
    if (data.activityPatterns.lateNightUsage > this.config.lateNightThreshold) {
      const probability = Math.min(
        0.3 + data.activityPatterns.lateNightUsage * 0.5,
        0.7
      );
      risks.push({
        risk_type: 'setback',
        level: probability >= 0.5 ? 'medium' : 'low',
        probability,
        description: 'High late-night app usage',
        factors: [
          `${Math.round(data.activityPatterns.lateNightUsage * 100)}% of activity is between 11pm-4am`,
          'Late-night usage often correlates with rumination',
          'Sleep disruption can worsen emotional state',
        ],
        recommendations: [
          'Try to use the app during daytime hours',
          'Set a phone curfew 1 hour before bed',
          'Practice sleep hygiene routines',
          'Consider the Sleep Stories feature instead',
        ],
        urgency: 0.4,
      });
    }

    // Rebound risk (quick emotional shifts + dating app mentions)
    const daysPostBreakup = data.profile.breakupDate
      ? Math.floor((new Date().getTime() - data.profile.breakupDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    if (daysPostBreakup !== null && daysPostBreakup < 90) {
      // Check for dating-related mentions
      const allContent = data.recentJournals.map(j => j.content).join(' ');
      const datingMentions = countKeywords(allContent, [
        'dating app', 'tinder', 'bumble', 'hinge', 'match',
        'going on a date', 'seeing someone', 'met someone new',
        'attractive', 'flirting',
      ]);

      if (datingMentions > 0) {
        const probability = 0.4 + (90 - daysPostBreakup) / 180;
        risks.push({
          risk_type: 'rebound_relationship',
          level: probability >= 0.5 ? 'medium' : 'low',
          probability,
          description: 'Potential rebound relationship risk',
          factors: [
            `Only ${daysPostBreakup} days since breakup`,
            'Dating interests detected in journal entries',
            'Healing typically benefits from a period of self-focus',
          ],
          recommendations: getRecommendations('rebound_relationship'),
          urgency: 0.5,
        });
      }
    }

    return risks;
  }

  /**
   * Identify and score protective factors.
   */
  private identifyProtectiveFactors(data: UserRiskData): ProtectiveFactor[] {
    const factors: ProtectiveFactor[] = [];

    // Daily journaling
    const journalingFreq = data.copingBehaviors.journalingFrequency;
    const journalingThreshold = PROTECTIVE_FACTOR_IMPACTS.daily_journaling.threshold;
    factors.push({
      factor: 'daily_journaling',
      label: PROTECTIVE_FACTOR_IMPACTS.daily_journaling.label,
      present: journalingFreq >= journalingThreshold,
      strength: Math.min(journalingFreq / journalingThreshold, 1),
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.daily_journaling.riskReduction * 100)}%`,
      riskReduction: journalingFreq >= journalingThreshold
        ? PROTECTIVE_FACTOR_IMPACTS.daily_journaling.riskReduction
        : PROTECTIVE_FACTOR_IMPACTS.daily_journaling.riskReduction * (journalingFreq / journalingThreshold),
    });

    // Therapy engagement
    factors.push({
      factor: 'therapy_engagement',
      label: PROTECTIVE_FACTOR_IMPACTS.therapy_engagement.label,
      present: data.copingBehaviors.therapyMentioned,
      strength: data.copingBehaviors.therapyMentioned ? 0.8 : 0,
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.therapy_engagement.riskReduction * 100)}%`,
      riskReduction: data.copingBehaviors.therapyMentioned
        ? PROTECTIVE_FACTOR_IMPACTS.therapy_engagement.riskReduction
        : 0,
    });

    // Strong social support
    const friendMentionStrength = Math.min(data.socialMetrics.friendMentions / PROTECTIVE_FACTOR_IMPACTS.strong_social_support.threshold, 1);
    factors.push({
      factor: 'strong_social_support',
      label: PROTECTIVE_FACTOR_IMPACTS.strong_social_support.label,
      present: friendMentionStrength >= 0.7,
      strength: friendMentionStrength,
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.strong_social_support.riskReduction * 100)}%`,
      riskReduction: PROTECTIVE_FACTOR_IMPACTS.strong_social_support.riskReduction * friendMentionStrength,
    });

    // Support circle active
    const circleStrength = data.socialMetrics.supportCircleSize >= 2
      ? data.socialMetrics.supportCircleEngagement
      : 0;
    factors.push({
      factor: 'support_circle_active',
      label: PROTECTIVE_FACTOR_IMPACTS.support_circle_active.label,
      present: circleStrength >= 0.5,
      strength: circleStrength,
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.support_circle_active.riskReduction * 100)}%`,
      riskReduction: PROTECTIVE_FACTOR_IMPACTS.support_circle_active.riskReduction * circleStrength,
    });

    // Healthy coping mechanisms
    const copingStrength = data.copingBehaviors.healthyCopingScore;
    factors.push({
      factor: 'healthy_coping',
      label: PROTECTIVE_FACTOR_IMPACTS.healthy_coping.label,
      present: copingStrength >= 0.5,
      strength: copingStrength,
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.healthy_coping.riskReduction * 100)}%`,
      riskReduction: PROTECTIVE_FACTOR_IMPACTS.healthy_coping.riskReduction * copingStrength,
    });

    // Regular exercise
    const exerciseStrength = Math.min(
      data.copingBehaviors.exerciseFrequency / PROTECTIVE_FACTOR_IMPACTS.regular_exercise.threshold,
      1
    );
    factors.push({
      factor: 'regular_exercise',
      label: PROTECTIVE_FACTOR_IMPACTS.regular_exercise.label,
      present: exerciseStrength >= 0.7,
      strength: exerciseStrength,
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.regular_exercise.riskReduction * 100)}%`,
      riskReduction: PROTECTIVE_FACTOR_IMPACTS.regular_exercise.riskReduction * exerciseStrength,
    });

    // Mindfulness practice
    const mindfulnessStrength = data.copingBehaviors.mindfulnessEngagement;
    factors.push({
      factor: 'mindfulness_practice',
      label: PROTECTIVE_FACTOR_IMPACTS.mindfulness_practice.label,
      present: mindfulnessStrength >= 0.3,
      strength: mindfulnessStrength,
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.mindfulness_practice.riskReduction * 100)}%`,
      riskReduction: PROTECTIVE_FACTOR_IMPACTS.mindfulness_practice.riskReduction * mindfulnessStrength,
    });

    // Consistent routine
    const routineStrength = data.activityPatterns.consistency;
    factors.push({
      factor: 'consistent_routine',
      label: PROTECTIVE_FACTOR_IMPACTS.consistent_routine.label,
      present: routineStrength >= 0.6,
      strength: routineStrength,
      impact: `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS.consistent_routine.riskReduction * 100)}%`,
      riskReduction: PROTECTIVE_FACTOR_IMPACTS.consistent_routine.riskReduction * routineStrength,
    });

    return factors;
  }

  /**
   * Calculate overall risk score and trend.
   */
  private calculateOverallRisk(
    allRisks: IdentifiedRisk[],
    protectiveFactors: ProtectiveFactor[],
    ersHistory: Array<{ score: number; weekOf: Date }>
  ): {
    overallScore: number;
    netScore: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  } {
    // Base risk from identified risks (weighted by probability and urgency)
    let baseRisk = 0;
    let totalWeight = 0;

    for (const risk of allRisks) {
      const weight = risk.urgency * (risk.level === 'high' ? 1.5 : risk.level === 'medium' ? 1 : 0.5);
      baseRisk += risk.probability * weight;
      totalWeight += weight;
    }

    const overallScore = totalWeight > 0
      ? Math.min(baseRisk / totalWeight, 1)
      : 0;

    // Calculate total risk reduction from protective factors
    const totalReduction = protectiveFactors.reduce((sum, f) => sum + f.riskReduction, 0);
    const netScore = Math.max(0, overallScore * (1 - Math.min(totalReduction, 0.7)));

    // Determine trend from ERS history
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (ersHistory.length >= 4) {
      const recent = ersHistory.slice(0, 2).map(e => e.score);
      const older = ersHistory.slice(2, 4).map(e => e.score);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

      if (recentAvg < olderAvg - 5) trend = 'increasing';  // Risk increasing (ERS decreasing)
      else if (recentAvg > olderAvg + 5) trend = 'decreasing';  // Risk decreasing (ERS increasing)
    }

    return { overallScore, netScore, trend };
  }

  /**
   * Determine which interventions to trigger based on risks.
   */
  private determineInterventions(
    risks: IdentifiedRisk[],
    overallRisk: number
  ): InterventionTrigger[] {
    const interventions: InterventionTrigger[] = [];

    // Immediate interventions for high risks
    const highRisks = risks.filter(r => r.level === 'high');
    for (const risk of highRisks.slice(0, 2)) {
      interventions.push({
        interventionType: 'push_notification',
        riskType: risk.risk_type,
        priority: 'immediate',
        message: risk.recommendations[0],
        metadata: { probability: risk.probability },
      });
    }

    // Scheduled interventions for date-based risks
    const dateRisks = risks.filter(r => r.date && r.daysUntil);
    for (const risk of dateRisks) {
      if (risk.daysUntil! <= 3) {
        interventions.push({
          interventionType: 'proactive_checkin',
          riskType: risk.risk_type,
          priority: 'immediate',
          message: `We noticed ${risk.description}. How are you feeling about it?`,
          scheduledFor: new Date(risk.date!),
        });
      } else if (risk.daysUntil! <= 7) {
        interventions.push({
          interventionType: 'preparation_reminder',
          riskType: risk.risk_type,
          priority: 'soon',
          message: `${risk.description}. Let's prepare a plan together.`,
          scheduledFor: new Date(),
        });
      }
    }

    // Overall high risk intervention
    if (overallRisk >= this.config.interventionThreshold) {
      interventions.push({
        interventionType: 'support_outreach',
        riskType: 'setback',
        priority: 'immediate',
        message: 'You seem to be going through a tough time. Would you like to talk to someone from your support circle?',
      });
    }

    return interventions;
  }

  /**
   * Generate complete risk assessment for a user.
   *
   * @param userId - The user to assess
   * @returns RiskAssessment or null if insufficient data
   */
  async assess(userId: string): Promise<RiskAssessment | null> {
    try {
      // Fetch user data
      const data = await this.fetchUserRiskData(userId);
      if (!data) {
        console.error(`Could not fetch risk data for user ${userId}`);
        return null;
      }

      // Identify all risks
      const dateRisks = this.identifyDateRisks(data);
      const moodRisks = this.analyzeMoodRisks(data);
      const contactRisks = this.analyzeContactRisks(data);
      const isolationRisks = this.analyzeIsolationRisks(data);
      const behavioralRisks = this.analyzeBehavioralRisks(data);

      const allRisks = [
        ...dateRisks,
        ...moodRisks,
        ...contactRisks,
        ...isolationRisks,
        ...behavioralRisks,
      ];

      // Deduplicate similar risks (keep highest probability)
      const riskMap = new Map<RiskType, IdentifiedRisk>();
      for (const risk of allRisks) {
        const existing = riskMap.get(risk.risk_type);
        if (!existing || risk.probability > existing.probability) {
          riskMap.set(risk.risk_type, risk);
        }
      }
      const deduplicatedRisks = Array.from(riskMap.values());

      // Identify protective factors
      const protectiveFactors = this.identifyProtectiveFactors(data);

      // Calculate overall risk
      const { overallScore, netScore, trend } = this.calculateOverallRisk(
        deduplicatedRisks,
        protectiveFactors,
        data.ersHistory
      );

      // Categorize risks by level
      const highRisks = deduplicatedRisks
        .filter(r => r.level === 'high')
        .sort((a, b) => b.urgency - a.urgency);
      const mediumRisks = deduplicatedRisks
        .filter(r => r.level === 'medium')
        .sort((a, b) => b.urgency - a.urgency);
      const lowRisks = deduplicatedRisks
        .filter(r => r.level === 'low')
        .sort((a, b) => b.urgency - a.urgency);

      // Determine interventions
      const interventions = this.determineInterventions(deduplicatedRisks, netScore);

      // Assess data quality
      const daysOfData = data.recentMoods.length > 0
        ? Math.ceil(
          (new Date().getTime() - data.recentMoods[data.recentMoods.length - 1].createdAt.getTime()) /
          (24 * 60 * 60 * 1000)
        )
        : 0;

      const dataQuality: 'high' | 'medium' | 'low' =
        data.recentMoods.length >= 14 && data.recentJournals.length >= 7
          ? 'high'
          : data.recentMoods.length >= 7 || data.recentJournals.length >= 3
            ? 'medium'
            : 'low';

      // Build assessment
      const now = new Date();
      const assessment: RiskAssessment = {
        userId,
        high_risks: highRisks,
        medium_risks: mediumRisks,
        low_risks: lowRisks,
        protective_factors: protectiveFactors.filter(f => f.present || f.strength > 0.3),
        overall_risk_score: overallScore,
        net_risk_score: netScore,
        risk_trend: trend,
        assessment_period: {
          start: new Date(now.getTime() - this.config.lookBackDays * 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + this.config.lookAheadWeeks * 7 * 24 * 60 * 60 * 1000),
          weeks: this.config.lookAheadWeeks,
        },
        interventions_triggered: interventions,
        assessedAt: now,
        nextAssessmentRecommended: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          dataQuality,
          factorsAnalyzed: allRisks.length + protectiveFactors.length,
          daysOfData,
        },
      };

      // Save assessment and trigger interventions
      await this.saveAssessment(assessment);
      await this.triggerInterventions(assessment);

      return assessment;
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      return null;
    }
  }

  /**
   * Save risk assessment to database.
   */
  private async saveAssessment(assessment: RiskAssessment): Promise<void> {
    try {
      await supabase.from('user_predictions').insert({
        user_id: assessment.userId,
        prediction_type: 'risk_assessment',
        predicted_value: assessment.net_risk_score,
        probability: assessment.overall_risk_score,
        predicted_at: assessment.assessedAt.toISOString(),
        prediction_metadata: JSON.stringify({
          highRisks: assessment.high_risks.map(r => ({
            type: r.risk_type,
            probability: r.probability,
            date: r.date,
          })),
          mediumRisks: assessment.medium_risks.length,
          lowRisks: assessment.low_risks.length,
          protectiveFactors: assessment.protective_factors
            .filter(f => f.present)
            .map(f => f.factor),
          trend: assessment.risk_trend,
          dataQuality: assessment.metadata.dataQuality,
        }),
      });
    } catch (error) {
      console.error('Error saving risk assessment:', error);
    }
  }

  /**
   * Trigger interventions for high-risk situations.
   */
  private async triggerInterventions(assessment: RiskAssessment): Promise<void> {
    for (const intervention of assessment.interventions_triggered) {
      try {
        // Log intervention trigger
        await supabase.from('intervention_log').insert({
          user_id: assessment.userId,
          intervention_type: intervention.interventionType,
          risk_type: intervention.riskType,
          priority: intervention.priority,
          message: intervention.message,
          scheduled_for: intervention.scheduledFor?.toISOString(),
          triggered_at: new Date().toISOString(),
          metadata: JSON.stringify(intervention.metadata),
        });

        // Here you would integrate with your notification system
        // For example: await sendPushNotification(assessment.userId, intervention);

        console.log(`Intervention triggered for user ${assessment.userId}:`, intervention.interventionType);
      } catch (error) {
        console.error('Error triggering intervention:', error);
      }
    }
  }

  /**
   * Get existing assessment without regenerating.
   */
  async getExistingAssessment(userId: string): Promise<RiskAssessment | null> {
    try {
      const { data, error } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', userId)
        .eq('prediction_type', 'risk_assessment')
        .order('predicted_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      const metadata = typeof data.prediction_metadata === 'string'
        ? JSON.parse(data.prediction_metadata)
        : data.prediction_metadata;

      // Return simplified cached version
      return {
        userId,
        high_risks: (metadata?.highRisks || []).map((r: { type: RiskType; probability: number; date?: string }) => ({
          risk_type: r.type,
          level: 'high' as RiskLevel,
          probability: r.probability,
          date: r.date,
          description: '',
          factors: [],
          recommendations: getRecommendations(r.type),
          urgency: r.probability,
        })),
        medium_risks: [],
        low_risks: [],
        protective_factors: (metadata?.protectiveFactors || []).map((f: ProtectiveFactorType) => ({
          factor: f,
          label: PROTECTIVE_FACTOR_IMPACTS[f]?.label || f,
          present: true,
          strength: 0.7,
          impact: PROTECTIVE_FACTOR_IMPACTS[f]
            ? `reduces setback risk by ${Math.round(PROTECTIVE_FACTOR_IMPACTS[f].riskReduction * 100)}%`
            : '',
          riskReduction: PROTECTIVE_FACTOR_IMPACTS[f]?.riskReduction || 0,
        })),
        overall_risk_score: data.probability || 0,
        net_risk_score: data.predicted_value || 0,
        risk_trend: metadata?.trend || 'stable',
        assessment_period: {
          start: new Date(data.predicted_at),
          end: new Date(new Date(data.predicted_at).getTime() + 28 * 24 * 60 * 60 * 1000),
          weeks: 4,
        },
        interventions_triggered: [],
        assessedAt: new Date(data.predicted_at),
        nextAssessmentRecommended: new Date(
          new Date(data.predicted_at).getTime() + 7 * 24 * 60 * 60 * 1000
        ),
        metadata: {
          dataQuality: metadata?.dataQuality || 'low',
          factorsAnalyzed: 0,
          daysOfData: 0,
        },
      };
    } catch (error) {
      console.error('Error fetching existing assessment:', error);
      return null;
    }
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Create a risk predictor with default configuration.
 */
export function createRiskPredictor(
  config?: Partial<RiskPredictorConfig>
): RiskPredictor {
  return new RiskPredictor(config);
}

/**
 * Quick function to assess risk for a user.
 */
export async function assessUserRisk(userId: string): Promise<RiskAssessment | null> {
  const predictor = new RiskPredictor();
  return predictor.assess(userId);
}

/**
 * Format risk assessment for display in UI.
 */
export function formatRiskForDisplay(assessment: RiskAssessment): {
  riskLevel: 'High' | 'Medium' | 'Low';
  riskScore: string;
  topRisks: Array<{
    type: string;
    description: string;
    urgency: 'Immediate' | 'Soon' | 'Monitor';
  }>;
  protections: Array<{
    label: string;
    impact: string;
  }>;
  recommendation: string;
} {
  // Determine overall risk level
  const riskLevel: 'High' | 'Medium' | 'Low' =
    assessment.net_risk_score >= 0.6 ? 'High' :
      assessment.net_risk_score >= 0.35 ? 'Medium' : 'Low';

  // Format top risks
  const allRisks = [...assessment.high_risks, ...assessment.medium_risks];
  const topRisks = allRisks.slice(0, 3).map(r => ({
    type: r.risk_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: r.description,
    urgency: (r.urgency >= 0.7 ? 'Immediate' : r.urgency >= 0.4 ? 'Soon' : 'Monitor') as 'Immediate' | 'Soon' | 'Monitor',
  }));

  // Format protections
  const protections = assessment.protective_factors
    .filter(f => f.present)
    .slice(0, 4)
    .map(f => ({
      label: f.label,
      impact: f.impact,
    }));

  // Generate recommendation
  let recommendation: string;
  if (assessment.net_risk_score >= 0.7) {
    recommendation = 'Consider reaching out to a support person today. You don\'t have to go through this alone.';
  } else if (assessment.high_risks.length > 0) {
    recommendation = assessment.high_risks[0].recommendations[0];
  } else if (assessment.net_risk_score >= 0.4) {
    recommendation = 'Stay connected with your support circle and maintain your healthy routines.';
  } else {
    recommendation = 'You\'re doing well! Keep up with your positive habits.';
  }

  return {
    riskLevel,
    riskScore: `${Math.round(assessment.net_risk_score * 100)}%`,
    topRisks,
    protections,
    recommendation,
  };
}

/**
 * Check if user needs immediate intervention.
 */
export function needsImmediateIntervention(assessment: RiskAssessment): boolean {
  return (
    assessment.net_risk_score >= 0.8 ||
    assessment.high_risks.some(r => r.urgency >= 0.9) ||
    assessment.interventions_triggered.some(i => i.priority === 'immediate')
  );
}

export default RiskPredictor;
