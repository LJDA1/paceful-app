'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

type ERSStage = 'healing' | 'rebuilding' | 'ready';

interface ERSData {
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
  calculated_at: string;
}

interface ERSDashboardProps {
  userId: string;
  compact?: boolean;
  showRecalculate?: boolean;
}

// ============================================================================
// Stage Configuration
// ============================================================================

const stageConfig = {
  healing: {
    label: 'Healing',
    description: 'Focus on self-care and processing',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    bgGradient: 'from-amber-50 to-orange-50',
    textColor: 'text-amber-700',
    ringColor: 'stroke-amber-500',
    accentColor: 'bg-amber-500',
    iconBg: 'bg-gradient-to-br from-amber-400 to-rose-500',
  },
  rebuilding: {
    label: 'Rebuilding',
    description: 'Building new patterns and strength',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    bgGradient: 'from-cyan-50 to-blue-50',
    textColor: 'text-blue-700',
    ringColor: 'stroke-blue-500',
    accentColor: 'bg-blue-500',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-indigo-500',
  },
  ready: {
    label: 'Ready',
    description: 'Open to meaningful connections',
    gradient: 'from-emerald-500 via-green-500 to-lime-500',
    bgGradient: 'from-emerald-50 to-green-50',
    textColor: 'text-emerald-700',
    ringColor: 'stroke-emerald-500',
    accentColor: 'bg-emerald-500',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-lime-500',
  },
};

// ============================================================================
// Circular Progress Component
// ============================================================================

function CircularProgress({
  score,
  stage,
  size = 200,
  strokeWidth = 12,
}: {
  score: number;
  stage: ERSStage;
  size?: number;
  strokeWidth?: number;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = stageConfig[stage];

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const center = size / 2;

  // Animate score on mount/change
  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startScore = animatedScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startScore + (score - startScore) * eased;

      setAnimatedScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow effect */}
      <div
        className={`absolute inset-0 blur-2xl opacity-20 rounded-full bg-gradient-to-r ${config.gradient}`}
        style={{ width: size, height: size }}
      />

      <svg
        width={size}
        height={size}
        className="transform -rotate-90 drop-shadow-sm"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${stage}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {stage === 'healing' && (
              <>
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#f43f5e" />
              </>
            )}
            {stage === 'rebuilding' && (
              <>
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </>
            )}
            {stage === 'ready' && (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#84cc16" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${stage})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-100"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-light text-gray-900 tabular-nums">
          {animatedScore.toFixed(0)}
        </span>
        <span className="text-sm font-medium text-gray-400 mt-1">ERS Score</span>
      </div>
    </div>
  );
}

// ============================================================================
// Stage Badge Component
// ============================================================================

function StageBadge({ stage }: { stage: ERSStage }) {
  const config = stageConfig[stage];

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${config.bgGradient} border border-white/50 shadow-sm`}
    >
      <div className={`w-2 h-2 rounded-full ${config.accentColor} animate-pulse`} />
      <span className={`text-sm font-semibold ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}

// ============================================================================
// Delta Indicator Component
// ============================================================================

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <div className="flex items-center gap-1.5 text-gray-400">
        <span className="text-sm">No previous data</span>
      </div>
    );
  }

  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < 0.5;

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1.5 text-gray-500">
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-xs">—</span>
        </div>
        <span className="text-sm font-medium">Steady this week</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 ${
        isPositive ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center ${
          isPositive ? 'bg-emerald-100' : 'bg-rose-100'
        }`}
      >
        <svg
          className={`w-3.5 h-3.5 ${!isPositive ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
          />
        </svg>
      </div>
      <span className="text-sm font-semibold">
        {isPositive ? '+' : ''}
        {delta.toFixed(1)}
      </span>
      <span className="text-sm text-gray-500">this week</span>
    </div>
  );
}

// ============================================================================
// Confidence Indicator Component
// ============================================================================

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const segments = 5;
  const filledSegments = Math.round((confidence * segments));

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Confidence
      </span>
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-4 rounded-full transition-colors duration-300 ${
              i < filledSegments ? 'bg-gray-400' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">{percentage}%</span>
    </div>
  );
}

// ============================================================================
// Component Score Bar
// ============================================================================

function ComponentScoreBar({
  label,
  score,
  stage,
}: {
  label: string;
  score: number | null;
  stage: ERSStage;
}) {
  const config = stageConfig[stage];
  const percentage = score !== null ? Math.round(score * 100) : 0;
  const hasData = score !== null;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className={`text-sm ${hasData ? 'text-gray-700' : 'text-gray-400'}`}>
          {label}
        </span>
        <span className={`text-sm font-medium ${hasData ? 'text-gray-900' : 'text-gray-400'}`}>
          {hasData ? `${percentage}%` : '—'}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            hasData ? `bg-gradient-to-r ${config.gradient}` : 'bg-gray-200'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="w-48 h-48 rounded-full bg-gray-100" />
        <div className="h-8 w-28 bg-gray-100 rounded-full mt-6" />
        <div className="h-4 w-36 bg-gray-100 rounded mt-3" />
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No ERS Score Yet
        </h3>
        <p className="text-gray-500 max-w-xs">
          Complete journal entries, mood check-ins, and exercises to generate your
          Emotional Readiness Score.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Recalculate Button Component
// ============================================================================

function RecalculateButton({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setError(null);

    try {
      const response = await fetch('/api/ers/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Recalculation failed');
      } else {
        onSuccess();
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRecalculate}
        disabled={isRecalculating}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`}
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
        {isRecalculating ? 'Recalculating...' : 'Recalculate'}
      </button>
      {error && (
        <span className="text-xs text-rose-500">{error}</span>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ERSDashboard({ userId, compact = false, showRecalculate = false }: ERSDashboardProps) {
  const [ersData, setErsData] = useState<ERSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchERSData = useCallback(async () => {
    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ers_scores')
        .select('*')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setErsData(data);
    } catch (err) {
      console.error('Error fetching ERS data:', err);
      setError('Unable to load ERS data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchERSData();
  }, [fetchERSData]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ers_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ers_scores',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setErsData(payload.new as ERSData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !ersData) {
    return <EmptyState />;
  }

  const config = stageConfig[ersData.ers_stage];

  if (compact) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-6">
          <CircularProgress
            score={ersData.ers_score}
            stage={ersData.ers_stage}
            size={120}
            strokeWidth={8}
          />
          <div className="flex-1 space-y-3">
            <StageBadge stage={ersData.ers_stage} />
            <DeltaIndicator delta={ersData.ers_delta} />
            <ConfidenceIndicator confidence={ersData.ers_confidence} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.bgGradient} px-6 py-4 border-b border-gray-100`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Emotional Readiness
            </h2>
            <p className="text-sm text-gray-500">
              Updated {new Date(ersData.calculated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ConfidenceIndicator confidence={ersData.ers_confidence} />
            {showRecalculate && (
              <RecalculateButton userId={userId} onSuccess={fetchERSData} />
            )}
          </div>
        </div>
      </div>

      {/* Main Score Section */}
      <div className="p-8">
        <div className="flex flex-col items-center">
          <CircularProgress
            score={ersData.ers_score}
            stage={ersData.ers_stage}
            size={200}
            strokeWidth={12}
          />

          {/* Stage Badge */}
          <div className="mt-6">
            <StageBadge stage={ersData.ers_stage} />
          </div>

          {/* Stage Description */}
          <p className="text-gray-500 text-center mt-3 max-w-xs">
            {config.description}
          </p>

          {/* Delta */}
          <div className="mt-4">
            <DeltaIndicator delta={ersData.ers_delta} />
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-gray-100" />

        {/* Component Breakdown - Mood Focused */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Score Breakdown
          </h3>
          <div className="space-y-4">
            <ComponentScoreBar
              label="Mood Stability (60%)"
              score={ersData.emotional_stability_score}
              stage={ersData.ers_stage}
            />
            <ComponentScoreBar
              label="Engagement Consistency (40%)"
              score={ersData.engagement_consistency_score}
              stage={ersData.ers_stage}
            />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Based on your mood logs from the last 14 days. Log moods daily for more accurate scores.
          </p>
        </div>

        {/* Journey Progress */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Your Journey
          </h3>
          <div className="relative">
            {/* Track */}
            <div className="flex gap-1">
              <div className="flex-1 h-2 rounded-l-full bg-gradient-to-r from-amber-400 to-orange-400" />
              <div className="flex-1 h-2 bg-gradient-to-r from-cyan-400 to-blue-400" />
              <div className="flex-1 h-2 rounded-r-full bg-gradient-to-r from-emerald-400 to-lime-400" />
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">Healing</span>
              <span className="text-xs text-gray-500">Rebuilding</span>
              <span className="text-xs text-gray-500">Ready</span>
            </div>

            {/* Position marker */}
            <div
              className="absolute top-0 -mt-1 transition-all duration-700"
              style={{ left: `${Math.min(Math.max(ersData.ers_score, 2), 98)}%` }}
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-900 shadow-md transform -translate-x-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
