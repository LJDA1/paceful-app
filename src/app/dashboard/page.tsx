'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DEMO_USER_ID } from '@/lib/constants';
import QuickMoodLog from '@/components/mood/QuickMoodLog';
import {
  fetchMoodEntries,
  calculateMoodStats,
  getMoodColor,
  getMoodLabel,
  type MoodEntry,
} from '@/lib/mood-calculator';

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

interface WeeklyStats {
  moodsLogged: number;
  currentStreak: number;
  avgMood: number;
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
  },
  rebuilding: {
    label: 'Rebuilding',
    description: 'Building new patterns and emotional strength',
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  ready: {
    label: 'Ready',
    description: 'Emotionally prepared for meaningful connections',
    gradient: 'from-emerald-500 to-green-500',
    bgGradient: 'from-emerald-50 to-green-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
};

// ============================================================================
// ERS Score Widget (Large, Prominent)
// ============================================================================

function ERSScoreWidget({ ersData, isLoading }: { ersData: ERSData | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 animate-pulse">
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-full bg-stone-100" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-24 bg-stone-100 rounded" />
            <div className="h-4 w-40 bg-stone-100 rounded" />
            <div className="h-4 w-32 bg-stone-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!ersData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-full bg-stone-100 flex items-center justify-center">
            <span className="text-4xl text-stone-300">?</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-800 mb-1">No ERS Score Yet</h3>
            <p className="text-stone-500 text-sm mb-3">
              Log at least 3 moods to calculate your Emotional Readiness Score
            </p>
            <Link
              href="/ers"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Learn more about ERS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const config = stageConfig[ersData.ers_stage];
  const circumference = 2 * Math.PI * 52;
  const progress = (ersData.ers_score / 100) * circumference;

  return (
    <Link href="/ers" className="block">
      <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl shadow-sm border ${config.borderColor} p-6 hover:shadow-md transition-shadow`}>
        <div className="flex items-center gap-6">
          {/* Circular Score */}
          <div className="relative">
            <svg width="128" height="128" className="transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke="white"
                strokeWidth="10"
                opacity="0.5"
              />
              <defs>
                <linearGradient id="ers-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  {ersData.ers_stage === 'healing' && (
                    <>
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#f97316" />
                    </>
                  )}
                  {ersData.ers_stage === 'rebuilding' && (
                    <>
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </>
                  )}
                  {ersData.ers_stage === 'ready' && (
                    <>
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </>
                  )}
                </linearGradient>
              </defs>
              <circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke="url(#ers-gradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-stone-800">{Math.round(ersData.ers_score)}</span>
              <span className="text-xs text-stone-500">ERS</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 mb-2`}>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`} />
              <span className={`text-sm font-semibold ${config.textColor}`}>{config.label}</span>
            </div>
            <p className="text-stone-600 text-sm mb-2">{config.description}</p>
            {ersData.ers_delta !== null && (
              <div className={`flex items-center gap-1 text-sm ${ersData.ers_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <svg className={`w-4 h-4 ${ersData.ers_delta < 0 ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
                <span className="font-medium">{ersData.ers_delta >= 0 ? '+' : ''}{ersData.ers_delta.toFixed(1)}</span>
                <span className="text-stone-500">this week</span>
              </div>
            )}
          </div>

          {/* Arrow */}
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Weekly Stats
// ============================================================================

function WeeklyStatsCard({ stats, isLoading }: { stats: WeeklyStats | null; isLoading: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 animate-pulse">
        <div className="h-4 w-20 bg-stone-100 rounded mb-3" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="text-center">
              <div className="h-6 w-8 bg-stone-100 rounded mx-auto mb-1" />
              <div className="h-3 w-12 bg-stone-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
      <h3 className="text-sm font-medium text-stone-600 mb-3">This Week</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.moodsLogged}</div>
          <div className="text-xs text-stone-500">Moods Logged</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.currentStreak}</div>
          <div className="text-xs text-stone-500">Day Streak</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.avgMood >= 7 ? 'text-emerald-600' : stats.avgMood >= 4 ? 'text-amber-600' : 'text-rose-600'}`}>
            {stats.avgMood.toFixed(1)}
          </div>
          <div className="text-xs text-stone-500">Avg Mood</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Recent Mood Entries
// ============================================================================

function RecentMoodEntries({ entries, isLoading }: { entries: MoodEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 animate-pulse">
        <div className="h-4 w-24 bg-stone-100 rounded mb-3" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-stone-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
        <h3 className="text-sm font-medium text-stone-600 mb-3">Recent Moods</h3>
        <div className="text-center py-6">
          <p className="text-stone-400 text-sm mb-2">No mood entries yet</p>
          <p className="text-stone-500 text-xs">Log your first mood to start tracking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-stone-600">Recent Moods</h3>
        <Link href="/mood" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          View All
        </Link>
      </div>
      <div className="space-y-2">
        {entries.slice(0, 3).map((entry) => {
          const colors = getMoodColor(entry.mood_score);
          const time = new Date(entry.logged_at).toLocaleDateString('en-US', {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          });

          return (
            <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg}`}>
              <div className={`w-10 h-10 rounded-full bg-white/50 flex items-center justify-center ${colors.text} font-bold`}>
                {entry.mood_score}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${colors.text}`}>
                  {getMoodLabel(entry.mood_score)}
                </div>
                {entry.emotions && entry.emotions.length > 0 && (
                  <div className="text-xs text-stone-500 truncate">
                    {entry.emotions.join(', ')}
                  </div>
                )}
              </div>
              <div className="text-xs text-stone-400">{time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Quick Actions
// ============================================================================

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/mood"
        className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-stone-800">Mood Tracker</div>
          <div className="text-xs text-stone-500">View trends</div>
        </div>
      </Link>

      <Link
        href="/ers"
        className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-stone-800">ERS Details</div>
          <div className="text-xs text-stone-500">Full breakdown</div>
        </div>
      </Link>

      <Link
        href="/journal"
        className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-stone-800">Journal</div>
          <div className="text-xs text-stone-500">Write entry</div>
        </div>
      </Link>

      <Link
        href="/exercises"
        className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-stone-800">Exercises</div>
          <div className="text-xs text-stone-500">Healing tools</div>
        </div>
      </Link>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function DashboardPage() {
  const [ersData, setErsData] = useState<ERSData | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      // Fetch ERS data
      const { data: ersResult } = await supabase
        .from('ers_scores')
        .select('ers_score, ers_stage, ers_confidence, ers_delta, calculated_at')
        .eq('user_id', DEMO_USER_ID)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      setErsData(ersResult);

      // Fetch mood entries
      const entries = await fetchMoodEntries(DEMO_USER_ID, 14);
      setMoodEntries(entries);

      // Calculate weekly stats
      const stats = calculateMoodStats(entries);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const weekEntries = entries.filter(e => new Date(e.logged_at) >= weekStart);
      const uniqueDays = new Set(weekEntries.map(e => e.logged_at.split('T')[0]));

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        if (entries.some(e => e.logged_at.split('T')[0] === dateStr)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      setWeeklyStats({
        moodsLogged: weekEntries.length,
        currentStreak: streak,
        avgMood: stats.averageMood || 0,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">Welcome back</h1>
              <p className="text-stone-500 text-sm">How are you feeling today?</p>
            </div>
            <QuickMoodLog userId={DEMO_USER_ID} onSave={fetchData} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ERS Score Widget - Prominent */}
        <ERSScoreWidget ersData={ersData} isLoading={isLoading} />

        {/* Weekly Stats */}
        <WeeklyStatsCard stats={weeklyStats} isLoading={isLoading} />

        {/* Recent Moods */}
        <RecentMoodEntries entries={moodEntries} isLoading={isLoading} />

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <QuickActions />
        </div>
      </main>
    </div>
  );
}
