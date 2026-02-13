'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { trackEvent } from '@/lib/track';
import { ERSSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ChartIcon } from '@/components/ui/EmptyState';
import { CommunityInsightsCondensed } from '@/components/CommunityInsights';

// ============================================================================
// Types
// ============================================================================

type ERSStage = 'healing' | 'rebuilding' | 'ready';

interface ERSData {
  id: string;
  user_id: string;
  ers_score: number;
  ers_stage: ERSStage;
  ers_confidence: number;
  ers_delta: number | null;
  self_reflection_score: number | null;
  emotional_stability_score: number | null;
  trust_openness_score: number | null;
  engagement_consistency_score: number | null;
  recovery_behavior_score: number | null;
  social_readiness_score: number | null;
  data_points_used: number | null;
  calculation_method: string;
  calculated_at: string;
  week_of: string;
}

interface ERSHistory {
  ers_score: number;
  ers_stage: ERSStage;
  week_of: string;
  calculated_at: string;
}

// ============================================================================
// SVG Icons
// ============================================================================

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function ArrowUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
    </svg>
  );
}

function RefreshIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

// ============================================================================
// Dimension Configuration
// ============================================================================

const dimensionConfig = [
  {
    key: 'emotional_stability_score',
    label: 'Emotional Stability',
    color: '#5B8A72',
    description: 'Consistency in mood patterns',
    tip: 'Try logging your mood at the same time each day to build awareness.'
  },
  {
    key: 'self_reflection_score',
    label: 'Self Reflection',
    color: '#5E8DB0',
    description: 'Depth of journaling insights',
    tip: 'Writing even a few sentences helps. Try today\'s journal prompt.'
  },
  {
    key: 'engagement_consistency_score',
    label: 'Engagement',
    color: '#D4973B',
    description: 'Daily activity consistency',
    tip: 'Consistency matters more than intensity. Try one exercise today.'
  },
  {
    key: 'recovery_behavior_score',
    label: 'Coping Capacity',
    color: '#B86B64',
    description: 'How you recover from tough moments',
    tip: 'Next time a tough moment hits, try a grounding exercise before reacting.'
  },
  {
    key: 'trust_openness_score',
    label: 'Social Readiness',
    color: '#7E71B5',
    description: 'Openness to connection',
    tip: 'This takes time. The weekly readiness check-in helps track this.'
  },
];

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto py-8">
        <ERSSkeleton />
      </div>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-sm w-full text-center">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(184,107,100,0.1)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--rose)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Unable to Load</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl font-medium text-white transition-colors"
          style={{ background: 'var(--primary)' }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ERS Empty State
// ============================================================================

function ERSEmptyState({ onCalculate, isCalculating }: { onCalculate: () => void; isCalculating: boolean }) {
  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-[28px] font-bold mb-1"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Your ERS
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Emotional Readiness Score</p>
        </div>

        {/* Empty State Card */}
        <div
          className="rounded-3xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <EmptyState
            icon={<ChartIcon />}
            title="Building your score"
            description="Log your mood for at least 3 days so we can calculate your Emotional Readiness Score."
            actionLabel="Log mood"
            actionHref="/mood"
          />
        </div>

        {/* Calculate Button */}
        <div className="mt-6">
          <button
            onClick={onCalculate}
            disabled={isCalculating}
            className="w-full py-3.5 rounded-full font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--bg-warm)', color: 'var(--text-sec)' }}
          >
            {isCalculating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Calculating...
              </>
            ) : (
              'Try calculating anyway'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ERSPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [ersData, setErsData] = useState<ERSData | null>(null);
  const [history, setHistory] = useState<ERSHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const supabase = createClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch ERS data
  const fetchERSData = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);

      // Fetch latest ERS score
      const { data, error: fetchError } = await supabase
        .from('ers_scores')
        .select('*')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(fetchError.message);
      }

      setErsData(data);

      // Fetch history
      const { data: historyData } = await supabase
        .from('ers_scores')
        .select('ers_score, ers_stage, week_of, calculated_at')
        .eq('user_id', userId)
        .order('week_of', { ascending: false })
        .limit(8);

      setHistory(historyData || []);
    } catch (err) {
      console.error('Error fetching ERS data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ERS data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchERSData();
      trackEvent('page_view', { page: 'ers' });
    }
  }, [userId, fetchERSData]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`ers_page_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ers_scores',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setErsData(payload.new as ERSData);
            fetchERSData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchERSData]);

  // Recalculate handler
  const handleRecalculate = async () => {
    if (!userId) return;
    setRecalculating(true);
    try {
      const response = await fetch('/api/ers/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Calculation failed');
      }

      const { result } = await response.json();

      // Convert 0-1 scores to 0-100 for display
      const toDisplayScale = (score: number | null | undefined): number | null => {
        if (score === null || score === undefined) return null;
        // Scores from calculator are 0-1, convert to 0-100
        return Math.round(score * 100 * 100) / 100;
      };

      setErsData({
        id: result.id || ersData?.id || '',
        user_id: result.userId,
        ers_score: result.ersScore,
        ers_stage: result.ersStage,
        ers_confidence: result.ersConfidence,
        ers_delta: result.ersDelta,
        emotional_stability_score: toDisplayScale(result.components.emotionalStability),
        self_reflection_score: toDisplayScale(result.components.selfReflection),
        engagement_consistency_score: toDisplayScale(result.components.behavioralEngagement),
        recovery_behavior_score: toDisplayScale(result.components.copingCapacity),
        trust_openness_score: toDisplayScale(result.components.socialReadiness),
        social_readiness_score: null, // Not used - socialReadiness maps to trust_openness_score
        data_points_used: result.moodEntriesCount,
        calculation_method: 'v3_five_dimensions',
        calculated_at: result.calculatedAt,
        week_of: result.weekOf,
      });

      fetchERSData();

      // Track recalculation event
      trackEvent('ers_recalculated', { score: result.ersScore });
    } catch (err) {
      console.error('Recalculation failed:', err);
      setError(err instanceof Error ? err.message : 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error && !ersData) {
    return <ErrorState message={error} onRetry={fetchERSData} />;
  }

  // Empty state
  if (!ersData) {
    return <ERSEmptyState onCalculate={handleRecalculate} isCalculating={recalculating} />;
  }

  const score = ersData.ers_score;
  const stage = ersData.ers_stage;
  const delta = ersData.ers_delta;
  const circumference = 2 * Math.PI * 80;
  const progress = (score / 100) * circumference;

  // Find lowest dimension for focus tip
  const ersDataRecord = ersData as unknown as Record<string, number | null>;
  const dimensions = dimensionConfig.map(d => ({
    ...d,
    value: ersDataRecord[d.key] ?? 0
  })).filter(d => d.value !== null);
  const lowestDimension = dimensions.reduce((min, d) => d.value < min.value ? d : min, dimensions[0]);

  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-8">

        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-[28px] font-bold mb-1"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Your ERS
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Emotional Readiness Score</p>
        </div>

        {/* Score Ring */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {/* Glow effect */}
            <svg width="180" height="180" className="absolute inset-0 blur-md opacity-30">
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="url(#glowGradient)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                className="transform -rotate-90 origin-center"
              />
            </svg>

            {/* Main ring */}
            <svg width="180" height="180">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8A838" />
                  <stop offset="50%" stopColor="#5B8A72" />
                  <stop offset="100%" stopColor="#7BA896" />
                </linearGradient>
                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8A838" />
                  <stop offset="100%" stopColor="#5B8A72" />
                </linearGradient>
              </defs>

              {/* Track */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="var(--bg-warm)"
                strokeWidth="10"
              />

              {/* Progress */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                className="transform -rotate-90 origin-center transition-all duration-700"
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-[46px] font-bold leading-none"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                {Math.round(score)}
              </span>
              <span
                className="text-[11px] font-medium uppercase tracking-wider mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {stage}
              </span>
            </div>
          </div>
        </div>

        {/* Change Indicator */}
        {delta !== null && (
          <div className="flex justify-center mb-6">
            <div
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full"
              style={{ background: 'rgba(91,138,114,0.06)' }}
            >
              <ArrowUpIcon
                className={`w-4 h-4 ${delta < 0 ? 'rotate-180' : ''}`}
                style={{ color: 'var(--primary)' }}
              />
              <span className="text-[13px] font-medium" style={{ color: 'var(--primary)' }}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)} from last week
              </span>
            </div>
          </div>
        )}

        {/* What does this mean? Collapsible */}
        <div className="mb-8">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full flex items-center justify-center gap-2 py-2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-[13px] font-medium">What does this mean?</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showExplanation ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showExplanation ? 'max-h-48 opacity-100 mt-3' : 'max-h-0 opacity-0'
            }`}
          >
            <div
              className="rounded-2xl p-4 text-[13px] leading-relaxed"
              style={{ background: 'var(--bg-warm)', color: 'var(--text-sec)' }}
            >
              {stage === 'healing' && (
                <p>
                  You&apos;re in the <strong style={{ color: 'var(--accent)' }}>Healing</strong> stage — a time for processing emotions and building self-awareness. Your score reflects five dimensions: emotional stability, self-reflection, engagement, coping capacity, and social readiness. Focus on consistent journaling and mood tracking to build momentum.
                </p>
              )}
              {stage === 'rebuilding' && (
                <p>
                  You&apos;re in the <strong style={{ color: 'var(--primary)' }}>Rebuilding</strong> stage — you&apos;ve done significant healing work and are establishing new patterns. Your score combines emotional stability, self-reflection, engagement, coping capacity, and social readiness. Keep nurturing the dimensions where you&apos;re growing.
                </p>
              )}
              {stage === 'ready' && (
                <p>
                  You&apos;re in the <strong style={{ color: 'var(--primary)' }}>Ready</strong> stage — you&apos;ve built strong emotional foundations. Your score reflects emotional stability, self-reflection, engagement, coping capacity, and social readiness. You have the tools to navigate future challenges with resilience.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recalculate button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--bg-warm)', color: 'var(--text-sec)' }}
          >
            <RefreshIcon className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Calculating...' : 'Recalculate'}
          </button>
        </div>

        {/* Dimensions Section */}
        <h2
          className="text-[20px] font-semibold mb-4"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          Dimensions
        </h2>

        <div
          className="rounded-3xl overflow-hidden mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          {dimensionConfig.map((dim, index) => {
            const value = ersDataRecord[dim.key];
            const isNull = value === null || value === undefined;
            const normalizedValue = !isNull ? Math.min(100, Math.max(0, value)) : 0;
            const isLast = index === dimensionConfig.length - 1;
            const trend = !isNull && value >= 50 ? 'up' : 'down';

            return (
              <div
                key={dim.key}
                className="px-5 py-4"
                style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-light)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                    {dim.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {isNull ? (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg-warm)', color: 'var(--text-muted)' }}
                      >
                        Needs data
                      </span>
                    ) : (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          background: trend === 'up' ? 'rgba(91,138,114,0.1)' : 'rgba(184,107,100,0.1)',
                          color: trend === 'up' ? 'var(--primary)' : 'var(--rose)'
                        }}
                      >
                        {trend === 'up' ? 'Good' : 'Focus'}
                      </span>
                    )}
                    <span className="text-[14px] font-semibold" style={{ color: isNull ? 'var(--text-muted)' : 'var(--text)' }}>
                      {isNull ? '--' : Math.round(value)}
                    </span>
                  </div>
                </div>
                <div
                  className="h-[5px] rounded-full overflow-hidden"
                  style={{
                    background: isNull
                      ? 'repeating-linear-gradient(90deg, var(--bg-warm) 0px, var(--bg-warm) 4px, transparent 4px, transparent 8px)'
                      : 'var(--bg-warm)'
                  }}
                >
                  {!isNull && (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${normalizedValue}%`,
                        background: `linear-gradient(90deg, ${dim.color}88 0%, ${dim.color} 100%)`
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Focus Area Tip */}
        {lowestDimension && lowestDimension.value !== null && lowestDimension.value < 60 && (
          <div className="rounded-[22px] p-5 mb-5" style={{ background: 'var(--bg-warm)' }}>
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'white' }}
              >
                <SparkleIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  Focus area: <span style={{ color: lowestDimension.color }}>{lowestDimension.label}</span>
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                  {(lowestDimension as typeof dimensionConfig[0]).tip || `${lowestDimension.description} can help improve this dimension.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Community Insights (Condensed) */}
        <CommunityInsightsCondensed />

        {/* Error Toast */}
        {error && ersData && (
          <div
            className="mt-6 rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(184,107,100,0.1)', border: '1px solid rgba(184,107,100,0.2)' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--rose)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-sm flex-1" style={{ color: 'var(--rose)' }}>{error}</p>
            <button onClick={() => setError(null)} style={{ color: 'var(--rose)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
