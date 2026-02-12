'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { ERSDashboard, ERSComponentBreakdown } from '@/components/ers';

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
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-stone-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-64 bg-stone-200 rounded mb-2" />
          <div className="h-4 w-48 bg-stone-100 rounded" />
        </div>
      </header>

      {/* Content Skeleton */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Dashboard Skeleton */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-full bg-stone-200" />
              <div className="flex-1 space-y-3">
                <div className="h-8 w-24 bg-stone-200 rounded-full" />
                <div className="h-4 w-32 bg-stone-100 rounded" />
                <div className="h-4 w-28 bg-stone-100 rounded" />
              </div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="h-5 w-28 bg-stone-200 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-stone-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown Skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="h-5 w-36 bg-stone-200 rounded mb-6" />
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-32 bg-stone-200 rounded" />
                  <div className="h-4 w-12 bg-stone-100 rounded" />
                </div>
                <div className="h-2.5 bg-stone-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-rose-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-stone-900 mb-2">
          Unable to Load ERS Data
        </h2>
        <p className="text-stone-500 mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ onCalculate }: { onCalculate: () => void }) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-stone-900">
            Your Emotional Readiness Score
          </h1>
          <p className="text-stone-600 mt-1">
            A holistic view of your healing journey
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-stone-900 mb-3">
            No ERS Score Yet
          </h2>
          <p className="text-stone-500 max-w-md mx-auto mb-8">
            Your Emotional Readiness Score helps you understand where you are in
            your healing journey. Start by logging some activities.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCalculate}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium inline-flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
                />
              </svg>
              Calculate My ERS
            </button>
            <a
              href="/journal"
              className="px-6 py-3 bg-stone-100 text-gray-700 rounded-xl hover:bg-stone-200 transition-colors font-medium"
            >
              Start Journaling
            </a>
          </div>

          {/* What contributes section - Mood Focused */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide mb-6">
              What Builds Your ERS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
              <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Mood Stability</p>
                    <p className="text-xs text-indigo-600">60% of your score</p>
                  </div>
                </div>
                <p className="text-sm text-stone-600">
                  Consistent, stable moods indicate emotional readiness. Lower variance = higher score.
                </p>
              </div>
              <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Daily Logging</p>
                    <p className="text-xs text-emerald-600">40% of your score</p>
                  </div>
                </div>
                <p className="text-sm text-stone-600">
                  Consistent daily check-ins show self-awareness. Build streaks for bonus points.
                </p>
              </div>
            </div>
            <p className="text-sm text-stone-500 mt-6 text-center">
              Log at least 3 moods in the last 14 days to calculate your score
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Quick Stats Card
// ============================================================================

function QuickStatsCard({ ersData }: { ersData: ERSData }) {
  const stats = [
    {
      label: 'Current Stage',
      value: ersData.ers_stage,
      format: (v: string) => v.charAt(0).toUpperCase() + v.slice(1),
    },
    {
      label: 'Weekly Change',
      value: ersData.ers_delta,
      format: (v: number | null) =>
        v === null
          ? 'No data'
          : v > 0
          ? `+${v.toFixed(1)}`
          : v.toFixed(1),
      color: (v: number | null) =>
        v === null
          ? 'text-stone-500'
          : v > 0
          ? 'text-emerald-600'
          : v < 0
          ? 'text-rose-600'
          : 'text-stone-600',
    },
    {
      label: 'Data Confidence',
      value: ersData.ers_confidence,
      format: (v: number) => `${Math.round(v * 100)}%`,
    },
    {
      label: 'Data Points',
      value: ersData.data_points_used,
      format: (v: number | null) => v?.toString() ?? '—',
    },
    {
      label: 'Last Calculated',
      value: ersData.calculated_at,
      format: (v: string) =>
        new Date(v).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide mb-4">
        Quick Insights
      </h3>
      <div className="space-y-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
          >
            <span className="text-sm text-stone-600">{stat.label}</span>
            <span
              className={`text-sm font-semibold ${
                'color' in stat && typeof stat.color === 'function'
                  ? stat.color(stat.value as number | null)
                  : 'text-stone-900'
              }`}
            >
              {stat.format(stat.value as never)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// History Chart (Simple)
// ============================================================================

function HistoryMiniChart({ history }: { history: ERSHistory[] }) {
  if (history.length < 2) return null;

  const maxScore = Math.max(...history.map((h) => h.ers_score));
  const minScore = Math.min(...history.map((h) => h.ers_score));
  const range = maxScore - minScore || 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide mb-4">
        Recent Trend
      </h3>
      <div className="flex items-end gap-2 h-24">
        {history.slice(0, 8).reverse().map((h, i) => {
          const height = ((h.ers_score - minScore) / range) * 100;
          const isLatest = i === history.length - 1;

          return (
            <div key={h.week_of} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t transition-all ${
                  isLatest ? 'bg-indigo-500' : 'bg-stone-200'
                }`}
                style={{ height: `${Math.max(height, 10)}%` }}
              />
              <span className="text-[10px] text-stone-500">
                {new Date(h.week_of).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Stage Info Section
// ============================================================================

function StageInfoSection() {
  const stages = [
    {
      name: 'Healing',
      range: '0-49',
      color: 'from-amber-400 to-rose-400',
      bgColor: 'bg-amber-50',
      icon: '🌱',
      description:
        'Focus on self-care, processing emotions, and building a foundation for recovery. This is a time for gentle introspection.',
    },
    {
      name: 'Rebuilding',
      range: '50-74',
      color: 'from-cyan-400 to-blue-400',
      bgColor: 'bg-blue-50',
      icon: '🔨',
      description:
        'Developing new patterns, building resilience, and cautiously exploring connections. You\'re growing stronger.',
    },
    {
      name: 'Ready',
      range: '75-100',
      color: 'from-emerald-400 to-lime-400',
      bgColor: 'bg-emerald-50',
      icon: '✨',
      description:
        'Emotionally available and prepared for meaningful new relationships. You\'ve done the work.',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide mb-6">
        Understanding the Stages
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <div key={stage.name} className={`${stage.bgColor} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{stage.icon}</span>
              <span className="font-semibold text-stone-900">{stage.name}</span>
              <span className="text-xs text-stone-500 ml-auto">{stage.range}</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              {stage.description}
            </p>
          </div>
        ))}
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
            // Refresh history on new data
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

      // Update local state immediately
      setErsData({
        id: result.id || ersData?.id || '',
        user_id: result.userId,
        ers_score: result.ersScore,
        ers_stage: result.ersStage,
        ers_confidence: result.ersConfidence,
        ers_delta: result.ersDelta,
        self_reflection_score: result.components.selfReflection
          ? parseFloat(result.components.selfReflection)
          : null,
        emotional_stability_score: result.components.emotionalStability
          ? parseFloat(result.components.emotionalStability)
          : null,
        trust_openness_score: result.components.trustOpenness
          ? parseFloat(result.components.trustOpenness)
          : null,
        engagement_consistency_score: result.components.engagementConsistency
          ? parseFloat(result.components.engagementConsistency)
          : null,
        recovery_behavior_score: result.components.recoveryBehavior
          ? parseFloat(result.components.recoveryBehavior)
          : null,
        social_readiness_score: result.components.socialReadiness
          ? parseFloat(result.components.socialReadiness)
          : null,
        data_points_used: result.dataPointsUsed,
        calculation_method: 'v1_weighted',
        calculated_at: result.calculatedAt,
        week_of: result.weekOf,
      });

      // Refresh history
      fetchERSData();
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
    return <EmptyState onCalculate={handleRecalculate} />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">
                Your Emotional Readiness Score
              </h1>
              <p className="text-stone-600 mt-1">
                A holistic view of your healing journey
              </p>
            </div>
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow"
            >
              {recalculating ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                  Calculating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Recalculate
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Error Toast */}
      {error && ersData && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-rose-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <p className="text-sm text-rose-700 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Top Section: Dashboard + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {userId && <ERSDashboard userId={userId} compact />}
          <QuickStatsCard ersData={ersData} />
        </div>

        {/* History Chart */}
        {history.length >= 2 && (
          <div className="mb-8">
            <HistoryMiniChart history={history} />
          </div>
        )}

        {/* Component Breakdown */}
        <div className="mb-8">
          <ERSComponentBreakdown
            components={{
              selfReflection: ersData.self_reflection_score,
              emotionalStability: ersData.emotional_stability_score,
              trustOpenness: ersData.trust_openness_score,
              engagementConsistency: ersData.engagement_consistency_score,
              recoveryBehavior: ersData.recovery_behavior_score,
              socialReadiness: ersData.social_readiness_score,
            }}
            totalScore={ersData.ers_score}
          />
        </div>

        {/* Stage Info */}
        <StageInfoSection />

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-stone-500">
            Your ERS is recalculated weekly based on your activity.
            <br />
            Keep journaling, tracking moods, and completing exercises to improve your score.
          </p>
        </div>
      </div>
    </div>
  );
}
