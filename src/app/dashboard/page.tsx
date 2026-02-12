'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import QuickMoodLog from '@/components/mood/QuickMoodLog';

// ============================================================================
// Types
// ============================================================================

type ERSStage = 'healing' | 'rebuilding' | 'ready';

interface ERSData {
  ers_score: number;
  ers_stage: ERSStage;
  ers_confidence: number;
  ers_delta: number | null;
  calculated_at: string;
}

interface ProfileData {
  first_name: string | null;
  relationship_ended_at: string | null;
}

interface WeeklyProgress {
  moodsLogged: number;
  journalEntries: number;
  exercisesCompleted: number;
  currentStreak: number;
  ersChange: number | null;
}

interface Prediction {
  id: string;
  prediction_type: string;
  probability: number;
  predicted_value: number | null;
  prediction_metadata: Record<string, unknown>;
  predicted_at: string;
}

interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Stage Configuration
// ============================================================================

const stageConfig = {
  healing: {
    label: 'Healing',
    description: 'Focus on self-care and emotional processing',
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-50 to-orange-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    ringColor: 'ring-amber-500',
  },
  rebuilding: {
    label: 'Rebuilding',
    description: 'Building new patterns and emotional strength',
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    ringColor: 'ring-blue-500',
  },
  ready: {
    label: 'Ready',
    description: 'Emotionally prepared for meaningful connections',
    gradient: 'from-emerald-500 to-green-500',
    bgGradient: 'from-emerald-50 to-green-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    ringColor: 'ring-emerald-500',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysSince(dateString: string | null): number {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatPredictionType(type: string): string {
  const labels: Record<string, string> = {
    timeline_rebuilding: 'Time to Rebuilding Stage',
    outcome_recovery: 'Healthy Recovery Outcome',
    risk_setback: 'Risk of Setback',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

// ============================================================================
// Welcome Header
// ============================================================================

function WelcomeHeader({
  profile,
  journeyDays,
  isLoading,
}: {
  profile: ProfileData | null;
  journeyDays: number;
  isLoading: boolean;
}) {
  const firstName = profile?.first_name || 'there';
  const greeting = getGreeting();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-stone-200 rounded mb-2" />
        <div className="h-5 w-36 bg-stone-100 rounded" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">
        {greeting}, {firstName}!
      </h1>
      {journeyDays > 0 && (
        <p className="text-stone-500 mt-1">
          Day {journeyDays} of your healing journey
        </p>
      )}
    </div>
  );
}

// ============================================================================
// ERS Score Card
// ============================================================================

function ERSScoreCard({ ersData, isLoading }: { ersData: ERSData | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 animate-pulse">
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 rounded-full bg-stone-100" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-32 bg-stone-100 rounded" />
            <div className="h-4 w-48 bg-stone-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!ersData) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 rounded-full bg-stone-100 flex items-center justify-center">
            <span className="text-4xl text-stone-300">--</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-800 mb-1">ERS Not Yet Calculated</h3>
            <p className="text-stone-500 text-sm mb-3">
              Log at least 3 moods to generate your Emotional Readiness Score
            </p>
            <Link
              href="/mood"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Start logging moods
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const config = stageConfig[ersData.ers_stage];
  const circumference = 2 * Math.PI * 46;
  const progress = (ersData.ers_score / 100) * circumference;

  return (
    <Link href="/ers" className="block group">
      <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl border ${config.borderColor} p-6 transition-all group-hover:shadow-lg`}>
        <div className="flex items-center gap-6">
          {/* Circular Score */}
          <div className="relative flex-shrink-0">
            <svg width="112" height="112" className="transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="46"
                fill="none"
                stroke="white"
                strokeWidth="8"
                opacity="0.5"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                className={config.textColor}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-stone-800">{Math.round(ersData.ers_score)}</span>
              <span className="text-xs text-stone-500 font-medium">ERS</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 mb-2`}>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`} />
              <span className={`text-sm font-semibold ${config.textColor}`}>{config.label}</span>
            </div>
            <p className="text-stone-600 text-sm mb-2 line-clamp-2">{config.description}</p>
            {ersData.ers_delta !== null && (
              <div className={`flex items-center gap-1 text-sm ${ersData.ers_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <svg className={`w-4 h-4 ${ersData.ers_delta < 0 ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
                <span className="font-medium">{ersData.ers_delta >= 0 ? '+' : ''}{ersData.ers_delta.toFixed(1)} this week</span>
              </div>
            )}
          </div>

          {/* Arrow */}
          <svg className="w-5 h-5 text-stone-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Quick Mood Section
// ============================================================================

function QuickMoodSection({ userId, onMoodLogged }: { userId: string; onMoodLogged: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-stone-800">Quick Mood Log</h3>
          <p className="text-sm text-stone-500">How are you feeling right now?</p>
        </div>
      </div>
      <QuickMoodLog userId={userId} onSave={onMoodLogged} />
    </div>
  );
}

// ============================================================================
// Weekly Progress
// ============================================================================

function WeeklyProgressCard({ progress, isLoading }: { progress: WeeklyProgress | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-5 animate-pulse">
        <div className="h-5 w-40 bg-stone-100 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-32 bg-stone-100 rounded" />
              <div className="h-4 w-16 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Moods logged',
      value: progress?.moodsLogged ?? 0,
      suffix: progress?.currentStreak ? `(streak: ${progress.currentStreak} days)` : '',
      icon: (
        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
        </svg>
      ),
    },
    {
      label: 'Journal entries',
      value: progress?.journalEntries ?? 0,
      suffix: '',
      icon: (
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      label: 'Exercises completed',
      value: progress?.exercisesCompleted ?? 0,
      suffix: '',
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      ),
    },
    {
      label: 'ERS change',
      value: (() => {
        const change = progress?.ersChange;
        if (change == null) return '--';
        return change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
      })(),
      suffix: 'points',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
        </svg>
      ),
      highlight: (progress?.ersChange ?? 0) > 0,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <h3 className="font-semibold text-stone-800">Your Progress This Week</h3>
      </div>
      <div className="space-y-3">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-3">
            {stat.icon}
            <span className="flex-1 text-sm text-stone-600">{stat.label}</span>
            <span className={`text-sm font-semibold ${stat.highlight ? 'text-emerald-600' : 'text-stone-800'}`}>
              {stat.value} {stat.suffix && <span className="font-normal text-stone-500">{stat.suffix}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Predictions Preview
// ============================================================================

function PredictionsPreview({ predictions, isLoading }: { predictions: Prediction[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-5 animate-pulse">
        <div className="h-5 w-32 bg-stone-100 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-stone-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
          <h3 className="font-semibold text-stone-800">Your Predictions</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-stone-500 text-sm">No predictions yet</p>
          <p className="text-stone-400 text-xs mt-1">Continue tracking to unlock personalized predictions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
          <h3 className="font-semibold text-stone-800">Your Predictions</h3>
        </div>
        <Link href="/predictions" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          View All
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
      <div className="space-y-3">
        {predictions.slice(0, 3).map((pred) => {
          const percentage = Math.round(pred.probability * 100);
          const isPositive = pred.prediction_type !== 'risk_setback';

          return (
            <div key={pred.id} className="p-3 bg-stone-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-stone-700">
                  {formatPredictionType(pred.prediction_type)}
                </span>
                <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {percentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {pred.predicted_value && (
                <p className="text-xs text-stone-500 mt-1">
                  Estimated: {Math.round(pred.predicted_value)} weeks
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Recommended Actions
// ============================================================================

function RecommendedActionsCard({ actions }: { actions: RecommendedAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
        <h3 className="font-semibold text-stone-800">Recommended Today</h3>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              action.priority === 'high' ? 'bg-rose-100' :
              action.priority === 'medium' ? 'bg-amber-100' : 'bg-stone-100'
            }`}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-800">{action.title}</span>
                {action.priority === 'high' && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-600 rounded">Due</span>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate">{action.description}</p>
            </div>
            <svg className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Dashboard
// ============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [ersData, setErsData] = useState<ERSData | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString();

      // Fetch all data in parallel
      const [profileRes, ersRes, moodRes, journalRes, exerciseRes, predictionsRes, streakRes] = await Promise.all([
        // Profile
        supabase
          .from('profiles')
          .select('first_name, relationship_ended_at')
          .eq('user_id', userId)
          .single(),

        // Latest ERS
        supabase
          .from('ers_scores')
          .select('ers_score, ers_stage, ers_confidence, ers_delta, calculated_at')
          .eq('user_id', userId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single(),

        // Moods this week
        supabase
          .from('mood_entries')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('logged_at', weekStartStr),

        // Journal entries this week
        supabase
          .from('journal_entries')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('created_at', weekStartStr)
          .is('deleted_at', null),

        // Exercises this week
        supabase
          .from('exercise_completions')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('completed_at', weekStartStr),

        // Predictions
        supabase
          .from('user_predictions')
          .select('id, prediction_type, probability, predicted_value, prediction_metadata, predicted_at')
          .eq('user_id', userId)
          .order('predicted_at', { ascending: false })
          .limit(3),

        // Streak
        supabase
          .from('user_streaks')
          .select('current_streak_days')
          .eq('user_id', userId)
          .single(),
      ]);

      setProfile(profileRes.data);
      setErsData(ersRes.data);
      setPredictions(predictionsRes.data || []);

      setWeeklyProgress({
        moodsLogged: moodRes.count || 0,
        journalEntries: journalRes.count || 0,
        exercisesCompleted: exerciseRes.count || 0,
        currentStreak: streakRes.data?.current_streak_days || 0,
        ersChange: ersRes.data?.ers_delta || null,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId, fetchDashboardData]);

  const journeyDays = getDaysSince(profile?.relationship_ended_at ?? null);

  // Generate recommended actions based on user data
  const recommendedActions: RecommendedAction[] = [
    {
      id: '1',
      title: 'Complete a breathing exercise',
      description: 'A 5-minute guided session to center yourself',
      icon: <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
      href: '/exercises',
      priority: 'medium',
    },
    {
      id: '2',
      title: 'Write a journal entry',
      description: 'Reflect on your thoughts and feelings today',
      icon: <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>,
      href: '/journal',
      priority: 'low',
    },
    {
      id: '3',
      title: 'Review your ERS breakdown',
      description: 'See what factors are affecting your score',
      icon: <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
      href: '/ers',
      priority: 'low',
    },
  ];

  // Show loading while user is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-stone-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <WelcomeHeader profile={profile} journeyDays={journeyDays} isLoading={isLoading} />
            {userId && <QuickMoodLog userId={userId} onSave={fetchDashboardData} />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Two-column layout for ERS and Quick Mood on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ERSScoreCard ersData={ersData} isLoading={isLoading} />
        </div>

        {/* Weekly Progress */}
        <WeeklyProgressCard progress={weeklyProgress} isLoading={isLoading} />

        {/* Predictions */}
        <PredictionsPreview predictions={predictions} isLoading={isLoading} />

        {/* Recommended Actions */}
        <RecommendedActionsCard actions={recommendedActions} />

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/mood"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-stone-700">Mood</span>
          </Link>

          <Link
            href="/journal"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-sm font-medium text-stone-700">Journal</span>
          </Link>

          <Link
            href="/exercises"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-stone-700">Exercises</span>
          </Link>

          <Link
            href="/predictions"
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              </svg>
            </div>
            <span className="text-sm font-medium text-stone-700">Predictions</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
