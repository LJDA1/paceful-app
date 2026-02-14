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
    iconSvg: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  },
  rebuilding: {
    label: 'Rebuilding',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    ringColor: 'stroke-amber-500',
    bgLight: 'bg-amber-50',
    description: 'Building new patterns and connections',
    iconSvg: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  },
  ready: {
    label: 'Ready',
    color: 'text-paceful-primary',
    bgColor: 'bg-paceful-primary',
    ringColor: 'stroke-paceful-primary',
    bgLight: 'bg-paceful-primary-muted',
    description: 'Emotionally available for new relationships',
    iconSvg: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
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
          className="stroke-stone-200"
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
        <span className="text-sm text-stone-500 mt-1">ERS Score</span>
      </div>
    </div>
  );
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) {
    return (
      <span className="text-stone-400 text-sm">No previous data</span>
    );
  }

  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  return (
    <div className={`flex items-center gap-1 ${
      isNeutral
        ? 'text-stone-500'
        : isPositive
          ? 'text-paceful-primary'
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
          <span className={hasData ? 'text-stone-700' : 'text-stone-400'}>
            {label}
          </span>
          <span className={hasData ? 'text-stone-600' : 'text-stone-400'}>
            {hasData ? `${(displayScore * 100).toFixed(0)}%` : 'No data'}
          </span>
        </div>
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              hasData ? 'bg-paceful-primary' : 'bg-stone-300'
            }`}
            style={{ width: `${displayScore * 100}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-stone-400 w-10 text-right">
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
          <div className="w-48 h-48 rounded-full bg-stone-200" />
          <div className="h-6 w-32 bg-stone-200 rounded mt-4" />
          <div className="h-4 w-48 bg-stone-200 rounded mt-2" />
        </div>
      </div>
    );
  }

  if (error || !ersData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center text-stone-500">
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
        <h2 className="text-xl font-semibold text-stone-800">
          Emotional Readiness Score
        </h2>
        <p className="text-sm text-stone-600">
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
          <div className={`mt-6 px-4 py-2 rounded-full ${config.bgLight} flex items-center gap-2 ${config.color}`}>
            {config.iconSvg}
            <span className="font-semibold">
              {config.label}
            </span>
          </div>

          <p className="text-stone-600 text-center mt-2 max-w-xs">
            {config.description}
          </p>

          {/* Weekly Delta */}
          <div className="mt-4">
            <DeltaIndicator delta={ersData.ers_delta} />
          </div>

          {/* Confidence */}
          <div className="mt-2 text-sm text-stone-500">
            Confidence: {(ersData.ers_confidence * 100).toFixed(0)}%
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-stone-200" />

        {/* Component Breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-stone-800 mb-4">
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
          <h3 className="text-lg font-semibold text-stone-800 mb-4">
            Your Journey
          </h3>
          <div className="flex items-center gap-2">
            {/* Healing */}
            <div className="flex-1">
              <div className={`h-2 rounded-l-full ${
                ersData.ers_score >= 0 ? 'bg-rose-500' : 'bg-stone-200'
              }`} />
              <p className="text-xs text-center mt-1 text-stone-500">Healing</p>
            </div>
            {/* Rebuilding */}
            <div className="flex-1">
              <div className={`h-2 ${
                ersData.ers_score >= 40 ? 'bg-amber-500' : 'bg-stone-200'
              }`} />
              <p className="text-xs text-center mt-1 text-stone-500">Rebuilding</p>
            </div>
            {/* Ready */}
            <div className="flex-1">
              <div className={`h-2 rounded-r-full ${
                ersData.ers_score >= 70 ? 'bg-paceful-primary' : 'bg-stone-200'
              }`} />
              <p className="text-xs text-center mt-1 text-stone-500">Ready</p>
            </div>
          </div>
          {/* Current position marker */}
          <div className="relative mt-2">
            <div
              className="absolute w-3 h-3 rounded-full bg-paceful-primary border-2 border-white shadow-md transform -translate-x-1/2"
              style={{ left: `${ersData.ers_score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
