'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { ERSScore } from '@/types/database';

type ERSData = ERSScore;

interface ERSDashboardProps {
  userId: string;
}

const stageConfig = {
  healing: {
    label: 'Healing',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500',
    ringColor: 'stroke-rose-500',
    bgLight: 'bg-rose-50',
    description: 'Focus on self-care and processing emotions',
    icon: '🌱',
  },
  rebuilding: {
    label: 'Rebuilding',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    ringColor: 'stroke-amber-500',
    bgLight: 'bg-amber-50',
    description: 'Building new patterns and connections',
    icon: '🔨',
  },
  ready: {
    label: 'Ready',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    ringColor: 'stroke-emerald-500',
    bgLight: 'bg-emerald-50',
    description: 'Emotionally available for new relationships',
    icon: '✨',
  },
};

function CircularProgress({
  score,
  stage
}: {
  score: number;
  stage: 'healing' | 'rebuilding' | 'ready';
}) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const config = stageConfig[stage];

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-48 h-48 transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          className="stroke-gray-200"
          strokeWidth="12"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          className={config.ringColor}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            transition: 'stroke-dashoffset 1s ease-in-out',
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${config.color}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 mt-1">ERS Score</span>
      </div>
    </div>
  );
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) {
    return (
      <span className="text-gray-400 text-sm">No previous data</span>
    );
  }

  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  return (
    <div className={`flex items-center gap-1 ${
      isNeutral
        ? 'text-gray-500'
        : isPositive
          ? 'text-emerald-600'
          : 'text-rose-600'
    }`}>
      {!isNeutral && (
        <svg
          className={`w-4 h-4 ${!isPositive ? 'rotate-180' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="font-semibold">
        {isPositive ? '+' : ''}{delta.toFixed(2)}
      </span>
      <span className="text-sm">this week</span>
    </div>
  );
}

function ComponentScore({
  label,
  score,
  weight
}: {
  label: string;
  score: number | null;
  weight: number;
}) {
  const displayScore = score !== null ? score : 0;
  const hasData = score !== null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className={hasData ? 'text-gray-700' : 'text-gray-400'}>
            {label}
          </span>
          <span className={hasData ? 'text-gray-600' : 'text-gray-400'}>
            {hasData ? `${(displayScore * 100).toFixed(0)}%` : 'No data'}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              hasData ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
            style={{ width: `${displayScore * 100}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">
        {weight}%
      </span>
    </div>
  );
}

export default function ERSDashboard({ userId }: ERSDashboardProps) {
  const [ersData, setErsData] = useState<ERSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchERSData() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('ers_scores')
          .select('*')
          .eq('user_id', userId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        setErsData(data);
      } catch (err) {
        console.error('Error fetching ERS data:', err);
        setError('Failed to load ERS data');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchERSData();
    }
  }, [userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('ers_updates')
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
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 animate-pulse">
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 rounded-full bg-gray-200" />
          <div className="h-6 w-32 bg-gray-200 rounded mt-4" />
          <div className="h-4 w-48 bg-gray-200 rounded mt-2" />
        </div>
      </div>
    );
  }

  if (error || !ersData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg">{error || 'No ERS data available'}</p>
          <p className="text-sm mt-2">Complete activities to generate your ERS score</p>
        </div>
      </div>
    );
  }

  const config = stageConfig[ersData.ers_stage];

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`${config.bgLight} px-6 py-4 border-b`}>
        <h2 className="text-xl font-semibold text-gray-800">
          Emotional Readiness Score
        </h2>
        <p className="text-sm text-gray-600">
          Last updated: {new Date(ersData.calculated_at).toLocaleDateString()}
        </p>
      </div>

      {/* Main Score */}
      <div className="p-8">
        <div className="flex flex-col items-center">
          <CircularProgress
            score={ersData.ers_score}
            stage={ersData.ers_stage}
          />

          {/* Stage Badge */}
          <div className={`mt-6 px-4 py-2 rounded-full ${config.bgLight} flex items-center gap-2`}>
            <span className="text-xl">{config.icon}</span>
            <span className={`font-semibold ${config.color}`}>
              {config.label}
            </span>
          </div>

          <p className="text-gray-600 text-center mt-2 max-w-xs">
            {config.description}
          </p>

          {/* Weekly Delta */}
          <div className="mt-4">
            <DeltaIndicator delta={ersData.ers_delta} />
          </div>

          {/* Confidence */}
          <div className="mt-2 text-sm text-gray-500">
            Confidence: {(ersData.ers_confidence * 100).toFixed(0)}%
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-gray-200" />

        {/* Component Breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Score Breakdown
          </h3>
          <div className="space-y-4">
            <ComponentScore
              label="Self-Reflection"
              score={ersData.self_reflection_score}
              weight={25}
            />
            <ComponentScore
              label="Emotional Stability"
              score={ersData.emotional_stability_score}
              weight={20}
            />
            <ComponentScore
              label="Trust & Openness"
              score={ersData.trust_openness_score}
              weight={20}
            />
            <ComponentScore
              label="Engagement"
              score={ersData.engagement_consistency_score}
              weight={15}
            />
            <ComponentScore
              label="Recovery Behavior"
              score={ersData.recovery_behavior_score}
              weight={10}
            />
            <ComponentScore
              label="Social Readiness"
              score={ersData.social_readiness_score}
              weight={10}
            />
          </div>
        </div>

        {/* Stage Progress */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Your Journey
          </h3>
          <div className="flex items-center gap-2">
            {/* Healing */}
            <div className="flex-1">
              <div className={`h-2 rounded-l-full ${
                ersData.ers_score >= 0 ? 'bg-rose-500' : 'bg-gray-200'
              }`} />
              <p className="text-xs text-center mt-1 text-gray-500">Healing</p>
            </div>
            {/* Rebuilding */}
            <div className="flex-1">
              <div className={`h-2 ${
                ersData.ers_score >= 40 ? 'bg-amber-500' : 'bg-gray-200'
              }`} />
              <p className="text-xs text-center mt-1 text-gray-500">Rebuilding</p>
            </div>
            {/* Ready */}
            <div className="flex-1">
              <div className={`h-2 rounded-r-full ${
                ersData.ers_score >= 70 ? 'bg-emerald-500' : 'bg-gray-200'
              }`} />
              <p className="text-xs text-center mt-1 text-gray-500">Ready</p>
            </div>
          </div>
          {/* Current position marker */}
          <div className="relative mt-2">
            <div
              className="absolute w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-md transform -translate-x-1/2"
              style={{ left: `${ersData.ers_score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
