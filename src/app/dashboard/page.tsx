'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { trackEvent } from '@/lib/track';

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

// ============================================================================
// Helper Functions
// ============================================================================

function getGreetingText(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================================
// SVG Icons
// ============================================================================

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function PenIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function ArrowUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
    </svg>
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
  const [isLoading, setIsLoading] = useState(true);

  // AI Insights state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const supabase = createClient();

  // Greeting - client-side only to prevent hydration mismatch
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    setGreeting(getGreetingText());
  }, []);

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
      const [profileRes, ersRes, moodRes, journalRes, exerciseRes, streakRes] = await Promise.all([
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

        // Streak
        supabase
          .from('user_streaks')
          .select('current_streak_days')
          .eq('user_id', userId)
          .single(),
      ]);

      setProfile(profileRes.data);
      setErsData(ersRes.data);

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
      trackEvent('page_view', { page: 'dashboard' });
    }
  }, [userId, fetchDashboardData]);

  // Fetch AI insights (once per day, cached in localStorage)
  useEffect(() => {
    if (!userId || !isAuthenticated) return;

    const fetchInsight = async () => {
      // Check localStorage for cached insight
      const cacheKey = 'paceful_ai_insight';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { insight, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;
          const oneDayMs = 24 * 60 * 60 * 1000;
          if (cacheAge < oneDayMs && insight) {
            setAiInsight(insight);
            return;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }

      // Fetch fresh insight
      setInsightLoading(true);
      try {
        const response = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.insight) {
            setAiInsight(data.insight);
            // Cache in localStorage
            localStorage.setItem(cacheKey, JSON.stringify({
              insight: data.insight,
              timestamp: Date.now(),
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI insight:', err);
      } finally {
        setInsightLoading(false);
      }
    };

    fetchInsight();
  }, [userId, isAuthenticated]);

  const firstName = profile?.first_name || 'there';

  // Show loading while user is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-5 py-6 animate-pulse">
          <div className="h-4 w-24 rounded mb-2" style={{ background: 'var(--border)' }} />
          <div className="h-8 w-48 rounded mb-8" style={{ background: 'var(--border)' }} />
          <div className="h-48 rounded-3xl mb-5" style={{ background: 'var(--border)' }} />
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-[22px]" style={{ background: 'var(--border)' }} />)}
          </div>
          <div className="h-6 w-24 rounded mb-4" style={{ background: 'var(--border)' }} />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-[22px]" style={{ background: 'var(--border)' }} />)}
          </div>
        </div>
      </div>
    );
  }

  const score = ersData?.ers_score ?? 0;
  const stage = ersData?.ers_stage ?? 'healing';
  const delta = ersData?.ers_delta;
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;

  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-6">

        {/* Greeting Section */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-muted)' }}>{greeting}</p>
            <h1
              className="text-[28px] font-medium leading-tight"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Welcome back, {firstName}
            </h1>
          </div>
          {/* Mobile settings icon */}
          <Link
            href="/settings"
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-warm)' }}
            aria-label="Settings"
          >
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </Link>
        </div>

        {/* ERS Hero Card */}
        <Link href="/ers" className="block mb-5">
          <div
            className="relative rounded-[28px] p-6 overflow-hidden"
            style={{ background: 'linear-gradient(155deg, #3D6B54 0%, #5B8A72 40%, #7BA896 100%)' }}
          >
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

            <div className="relative flex items-center justify-between">
              {/* Left side: Score info */}
              <div className="flex-1">
                <p className="text-[11px] font-medium tracking-wider uppercase mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Emotional Readiness
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span
                    className="text-[54px] font-medium leading-none"
                    style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'white' }}
                  >
                    {Math.round(score)}
                  </span>
                  {delta !== null && delta !== undefined && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-medium"
                      style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                    >
                      <ArrowUpIcon className={`w-3 h-3 ${delta < 0 ? 'rotate-180' : ''}`} />
                      {delta >= 0 ? '+' : ''}{delta.toFixed(0)} this week
                    </span>
                  )}
                </div>

                {/* Stage progress bar */}
                <div className="mt-4">
                  <div className="h-[5px] rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        background: 'linear-gradient(90deg, #F5D590 0%, #E8A838 100%)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span className={stage === 'healing' ? 'text-white' : ''}>Healing</span>
                    <span className={stage === 'rebuilding' ? 'text-white' : ''}>Rebuilding</span>
                    <span className={stage === 'ready' ? 'text-white' : ''}>Ready</span>
                  </div>
                </div>
              </div>

              {/* Right side: Ring */}
              <div className="relative flex-shrink-0 ml-4">
                <svg width="120" height="120" className="transform -rotate-90">
                  {/* Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="8"
                  />
                  {/* Progress */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F5D590" />
                      <stop offset="100%" stopColor="#E8A838" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {stage}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Link
            href="/mood"
            className="flex flex-col items-center p-4 rounded-[22px] transition-transform active:scale-95"
            style={{ background: 'rgba(184,107,100,0.07)' }}
          >
            <div
              className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center mb-2 shadow-sm"
              style={{ background: 'white' }}
            >
              <HeartIcon className="w-5 h-5" style={{ color: 'var(--rose)' }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>Mood</span>
          </Link>

          <Link
            href="/journal"
            className="flex flex-col items-center p-4 rounded-[22px] transition-transform active:scale-95"
            style={{ background: 'rgba(94,141,176,0.07)' }}
          >
            <div
              className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center mb-2 shadow-sm"
              style={{ background: 'white' }}
            >
              <PenIcon className="w-5 h-5" style={{ color: 'var(--calm)' }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>Journal</span>
          </Link>

          <Link
            href="/exercises"
            className="flex flex-col items-center p-4 rounded-[22px] transition-transform active:scale-95"
            style={{ background: 'rgba(212,151,59,0.08)' }}
          >
            <div
              className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center mb-2 shadow-sm"
              style={{ background: 'white' }}
            >
              <SparkleIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>Exercises</span>
          </Link>
        </div>

        {/* This Week Section */}
        <h2
          className="text-[20px] font-semibold mb-4"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          This week
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Moods Logged */}
          <div
            className="p-[18px] rounded-[22px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div className="w-[6px] h-[6px] rounded-full mb-3" style={{ background: 'var(--rose)' }} />
            <p
              className="text-[28px] font-bold leading-none mb-1"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {weeklyProgress?.moodsLogged ?? 0}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>Moods logged</p>
            {weeklyProgress?.currentStreak && weeklyProgress.currentStreak > 0 && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {weeklyProgress.currentStreak} day streak
              </p>
            )}
          </div>

          {/* Journal Entries */}
          <div
            className="p-[18px] rounded-[22px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div className="w-[6px] h-[6px] rounded-full mb-3" style={{ background: 'var(--calm)' }} />
            <p
              className="text-[28px] font-bold leading-none mb-1"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {weeklyProgress?.journalEntries ?? 0}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>Journal entries</p>
          </div>

          {/* Exercises Completed */}
          <div
            className="p-[18px] rounded-[22px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div className="w-[6px] h-[6px] rounded-full mb-3" style={{ background: 'var(--accent)' }} />
            <p
              className="text-[28px] font-bold leading-none mb-1"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {weeklyProgress?.exercisesCompleted ?? 0}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>Exercises done</p>
          </div>

          {/* ERS Change */}
          <div
            className="p-[18px] rounded-[22px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div className="w-[6px] h-[6px] rounded-full mb-3" style={{ background: 'var(--primary)' }} />
            <p
              className="text-[28px] font-bold leading-none mb-1"
              style={{
                fontFamily: 'var(--font-fraunces), Fraunces, serif',
                color: weeklyProgress?.ersChange && weeklyProgress.ersChange > 0 ? 'var(--primary)' : 'var(--text)'
              }}
            >
              {weeklyProgress?.ersChange !== null && weeklyProgress?.ersChange !== undefined
                ? (weeklyProgress.ersChange >= 0 ? '+' : '') + weeklyProgress.ersChange.toFixed(1)
                : '--'}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>ERS change</p>
          </div>
        </div>

        {/* Weekly Insight Card */}
        {ersData && (
          <div
            className="rounded-3xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            {/* Gradient bar */}
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, var(--accent) 0%, var(--primary) 100%)' }} />

            <div className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(212,151,59,0.1)' }}
                >
                  <SparkleIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
                    Weekly insight
                  </h3>
                  <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
                    {aiInsight ? 'Powered by AI' : 'Based on your patterns'}
                  </p>
                  {insightLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded animate-pulse" style={{ background: 'var(--border)' }} />
                      <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'var(--border)' }} />
                    </div>
                  ) : (
                    <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-sec)' }}>
                      {aiInsight || (
                        <>
                          {stage === 'healing' && "Focus on consistent self-care routines. Small daily actions build the foundation for lasting recovery."}
                          {stage === 'rebuilding' && "You're making great progress. Keep building on your positive habits and trust the process."}
                          {stage === 'ready' && "Your emotional readiness is strong. Continue nurturing your growth while staying open to new connections."}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
