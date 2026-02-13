'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { trackEvent } from '@/lib/track';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, HomeIcon } from '@/components/ui/EmptyState';
import {
  calculateStreak,
  getMilestones,
  getWeekLoggingStatus,
  getNewlyAchievedMilestones,
  type Milestone,
} from '@/lib/streaks';
import MilestoneToast from '@/components/MilestoneToast';
import WeeklyRecap from '@/components/WeeklyRecap';
import CommunityInsights from '@/components/CommunityInsights';

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
// Milestone Icons
// ============================================================================

const MilestoneIcons: Record<string, (color: string) => React.ReactNode> = {
  star: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  flame: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color}>
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.42 1.112-4.468 2.39-6.217.812-1.11 1.69-2.09 2.431-2.925.356-.4.67-.742.93-1.031.166.189.371.44.609.74.616.777 1.37 1.85 2.06 3.03.69 1.178 1.32 2.468 1.71 3.75.39 1.284.54 2.513.37 3.578C15.19 19.13 13.8 21 12 23z" />
    </svg>
  ),
  pen: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    </svg>
  ),
  heart: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  sparkle: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color}>
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  ),
  shield: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  trophy: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color}>
      <path d="M12 15c-1.93 0-3.5-1.57-3.5-3.5V5h7v6.5c0 1.93-1.57 3.5-3.5 3.5z" />
      <path d="M8.5 5H5c0 2.5 1.5 4.5 3.5 5V5z" />
      <path d="M15.5 5H19c0 2.5-1.5 4.5-3.5 5V5z" />
      <path d="M14 17h-4v2H8v2h8v-2h-2v-2z" />
    </svg>
  ),
  book: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM6.5 17H6v2.5c0 .28.22.5.5.5H20v-3H6.5z" />
    </svg>
  ),
  check: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  target: (color: string) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

// ============================================================================
// Milestone Card Component
// ============================================================================

function MilestoneCard({ milestone, streakData }: { milestone: Milestone; streakData: { current: number; longest: number } }) {
  const IconComponent = MilestoneIcons[milestone.icon];

  // Calculate progress for unachieved milestones
  let progress = 0;
  if (!milestone.achieved) {
    if (milestone.category === 'streak') {
      progress = Math.min(100, Math.round((streakData.current / milestone.threshold) * 100));
    }
  }

  return (
    <div
      className={`flex-shrink-0 w-[140px] p-4 rounded-2xl ${milestone.achieved ? '' : 'opacity-60'}`}
      style={{
        background: milestone.achieved ? 'var(--bg-card)' : 'var(--bg)',
        border: `1px solid ${milestone.achieved ? 'var(--border-light)' : 'var(--border)'}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: milestone.achieved ? `${milestone.color}20` : 'var(--border-light)',
        }}
      >
        {IconComponent && IconComponent(milestone.achieved ? milestone.color : 'var(--text-muted)')}
      </div>
      <p
        className="text-[13px] font-medium mb-1 leading-tight"
        style={{ color: milestone.achieved ? 'var(--text)' : 'var(--text-muted)' }}
      >
        {milestone.title}
      </p>
      {milestone.achieved ? (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill={milestone.color} viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-[11px]" style={{ color: milestone.color }}>Achieved</span>
        </div>
      ) : (
        <div>
          <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: milestone.color }}
            />
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {milestone.description}
          </span>
        </div>
      )}
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
  const [isLoading, setIsLoading] = useState(true);

  // AI Insights state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // ERS Info modal state
  const [showERSInfo, setShowERSInfo] = useState(false);

  // Streak and milestone state
  const [streakData, setStreakData] = useState<{ current: number; longest: number }>({ current: 0, longest: 0 });
  const [weekLogging, setWeekLogging] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showMilestoneToast, setShowMilestoneToast] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false);
  const [showReadinessCheck, setShowReadinessCheck] = useState(false);
  const [readinessSubmitted, setReadinessSubmitted] = useState(false);
  const [submittingReadiness, setSubmittingReadiness] = useState(false);
  const [weeklyRecapData, setWeeklyRecapData] = useState<{
    daysLogged: number;
    avgMood: number;
    moodTrend: 'up' | 'down' | 'steady';
    moodChange: number;
    journalEntries: number;
    journalWords: number;
    ersChange: number;
    currentStreak: number;
    aiInsight?: string;
  } | null>(null);

  const supabase = createClient();

  // Check if ERS has been explained before (first visit)
  useEffect(() => {
    const ersExplained = localStorage.getItem('ers_explained');
    if (!ersExplained && isAuthenticated && !userLoading) {
      // Show on first visit after a brief delay
      const timer = setTimeout(() => {
        setShowERSInfo(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userLoading]);

  const handleCloseERSInfo = () => {
    setShowERSInfo(false);
    localStorage.setItem('ers_explained', 'true');
  };

  const handleDismissMilestone = () => {
    setShowMilestoneToast(false);
    setCurrentMilestone(null);
  };

  const handleDismissWeeklyRecap = () => {
    setShowWeeklyRecap(false);
    localStorage.setItem('paceful_last_recap_seen', Date.now().toString());
  };

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
      const [profileRes, ersRes, moodRes, journalRes, exerciseRes, allMoodsRes, totalJournalRes, totalExerciseRes] = await Promise.all([
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

        // Moods this week (with dates for streak calculation)
        supabase
          .from('mood_entries')
          .select('id, logged_at, mood_value')
          .eq('user_id', userId)
          .gte('logged_at', weekStartStr),

        // Journal entries this week
        supabase
          .from('journal_entries')
          .select('id, word_count', { count: 'exact' })
          .eq('user_id', userId)
          .gte('created_at', weekStartStr)
          .is('deleted_at', null),

        // Exercises this week
        supabase
          .from('exercise_completions')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('completed_at', weekStartStr),

        // All moods for streak calculation (last 90 days)
        supabase
          .from('mood_entries')
          .select('logged_at')
          .eq('user_id', userId)
          .gte('logged_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('logged_at', { ascending: false }),

        // Total journal entries for milestones
        supabase
          .from('journal_entries')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .is('deleted_at', null),

        // Total exercises for milestones
        supabase
          .from('exercise_completions')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
      ]);

      setProfile(profileRes.data);
      setErsData(ersRes.data);

      // Calculate streak from mood dates
      const moodDates = allMoodsRes.data?.map(m => m.logged_at) || [];
      const streak = calculateStreak(moodDates);
      setStreakData(streak);

      // Get week logging status (Mon-Sun)
      const weekStatus = getWeekLoggingStatus(moodDates);
      setWeekLogging(weekStatus);

      // Calculate milestones
      const totalDays = new Set(moodDates.map(d => new Date(d).toISOString().split('T')[0])).size;
      const totalJournalEntries = totalJournalRes.count || 0;
      const totalExercises = totalExerciseRes.count || 0;
      const ersScore = ersRes.data?.ers_score || 0;
      const computedMilestones = getMilestones(
        totalDays,
        totalJournalEntries,
        totalExercises,
        streak.current,
        ersScore
      );
      setMilestones(computedMilestones);

      // Check for newly achieved milestones
      const celebratedKey = 'paceful_celebrated_milestones';
      const celebrated = JSON.parse(localStorage.getItem(celebratedKey) || '[]');
      const newlyAchieved = getNewlyAchievedMilestones(computedMilestones, celebrated);

      if (newlyAchieved.length > 0) {
        // Show first new milestone
        setCurrentMilestone(newlyAchieved[0]);
        setShowMilestoneToast(true);
        // Mark as celebrated
        localStorage.setItem(celebratedKey, JSON.stringify([...celebrated, newlyAchieved[0].id]));
      }

      setWeeklyProgress({
        moodsLogged: moodRes.data?.length || 0,
        journalEntries: journalRes.count || 0,
        exercisesCompleted: exerciseRes.count || 0,
        currentStreak: streak.current,
        ersChange: ersRes.data?.ers_delta || null,
      });

      // Calculate weekly recap data
      const weekMoods = moodRes.data || [];
      const avgMood = weekMoods.length > 0
        ? weekMoods.reduce((sum, m) => sum + (m.mood_value || 5), 0) / weekMoods.length
        : 0;
      const journalWords = journalRes.data?.reduce((sum, j) => sum + (j.word_count || 0), 0) || 0;

      setWeeklyRecapData({
        daysLogged: weekStatus.filter(Boolean).length,
        avgMood,
        moodTrend: ersRes.data?.ers_delta && ersRes.data.ers_delta > 0 ? 'up' : ersRes.data?.ers_delta && ersRes.data.ers_delta < 0 ? 'down' : 'steady',
        moodChange: Math.abs(ersRes.data?.ers_delta || 0) / 10,
        journalEntries: journalRes.count || 0,
        journalWords,
        ersChange: Math.round(ersRes.data?.ers_delta || 0),
        currentStreak: streak.current,
      });

      // Check if we should show weekly recap (once per week)
      const lastRecapKey = 'paceful_last_recap_seen';
      const lastRecap = localStorage.getItem(lastRecapKey);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      if (!lastRecap || parseInt(lastRecap) < oneWeekAgo) {
        // Only show if user has some activity
        if (weekMoods.length > 0 || (journalRes.count || 0) > 0) {
          // Delay showing recap to not overlap with milestone
          setTimeout(() => {
            setShowWeeklyRecap(true);
          }, newlyAchieved.length > 0 ? 6000 : 1000);
        }
      }
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

  // Check if we should show readiness check (once per week)
  useEffect(() => {
    if (!userId || !isAuthenticated || isLoading) return;

    const lastReadinessKey = 'paceful_last_readiness_check';
    const lastCheck = localStorage.getItem(lastReadinessKey);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Only show if it's been at least a week and user is not brand new
    if ((!lastCheck || parseInt(lastCheck) < oneWeekAgo) && ersData) {
      // Delay to not overlap with other modals
      const timer = setTimeout(() => {
        setShowReadinessCheck(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userId, isAuthenticated, isLoading, ersData]);

  const handleReadinessResponse = async (readiness: string) => {
    setSubmittingReadiness(true);
    try {
      const response = await fetch('/api/trajectory/self-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readiness }),
      });

      if (response.ok) {
        setReadinessSubmitted(true);
        localStorage.setItem('paceful_last_readiness_check', Date.now().toString());

        // Hide card after showing thanks
        setTimeout(() => {
          setShowReadinessCheck(false);
          setReadinessSubmitted(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit readiness:', error);
    } finally {
      setSubmittingReadiness(false);
    }
  };

  const handleDismissReadinessCheck = () => {
    setShowReadinessCheck(false);
    // Don't update localStorage - will ask again next session
  };

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
        <div className="max-w-lg mx-auto py-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Empty state for new users
  const isNewUser = !ersData && weeklyProgress?.moodsLogged === 0 && weeklyProgress?.journalEntries === 0;
  if (isNewUser) {
    return (
      <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-5 py-6">
          <div className="mb-6">
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-muted)' }}>{greeting}</p>
            <h1
              className="text-[28px] font-medium leading-tight"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Welcome, {firstName}
            </h1>
          </div>
          <div
            className="rounded-3xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <EmptyState
              icon={<HomeIcon />}
              title="Welcome to Paceful"
              description="Start by logging your mood or writing a journal entry. Your dashboard will come alive as you engage."
              actionLabel="Log your first mood"
              actionHref="/mood"
            />
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
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Emotional Readiness
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowERSInfo(true);
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                    aria-label="Learn more about Emotional Readiness Score"
                  >
                    <svg className="w-2.5 h-2.5" fill="white" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
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

        {/* Streak Card */}
        {streakData.current > 0 && (
          <div
            className="mb-6 p-5 rounded-[22px] flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(212,151,59,0.12) 0%, rgba(212,151,59,0.06) 100%)', border: '1px solid rgba(212,151,59,0.15)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(212,151,59,0.15)' }}
            >
              <svg className="w-7 h-7" style={{ color: '#D4973B' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.42 1.112-4.468 2.39-6.217.812-1.11 1.69-2.09 2.431-2.925.356-.4.67-.742.93-1.031.166.189.371.44.609.74.616.777 1.37 1.85 2.06 3.03.69 1.178 1.32 2.468 1.71 3.75.39 1.284.54 2.513.37 3.578C15.19 19.13 13.8 21 12 23zm0-19c-.94 1.094-3 3.6-3 6.5C9 12.68 10.343 15 12 15s3-2.32 3-4.5c0-2.9-2.06-5.406-3-6.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[32px] font-medium"
                  style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
                >
                  {streakData.current}
                </span>
                <span className="text-[15px]" style={{ color: 'var(--text-sec)' }}>
                  day streak
                </span>
              </div>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Longest: {streakData.longest} days
              </p>
            </div>
            {/* Week dots */}
            <div className="flex gap-1.5">
              {weekLogging.map((logged, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${logged ? '' : 'border'}`}
                  style={{
                    background: logged ? '#D4973B' : 'transparent',
                    borderColor: logged ? 'transparent' : 'var(--border)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

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
            className="rounded-3xl overflow-hidden mb-6"
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

        {/* Milestones Section */}
        {milestones.length > 0 && (
          <div className="mb-6">
            <h2
              className="text-[20px] font-semibold mb-4"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Milestones
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {milestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} streakData={streakData} />
              ))}
            </div>
          </div>
        )}

        {/* Community Insights */}
        {ersData && (
          <div className="mb-6">
            <CommunityInsights />
          </div>
        )}

        {/* Readiness Check Card */}
        {showReadinessCheck && ersData && (
          <div
            className="mb-6 rounded-2xl p-5 animate-fadeIn"
            style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            {readinessSubmitted ? (
              <div className="text-center py-2">
                <p className="text-[15px] font-medium" style={{ color: 'var(--primary)' }}>
                  Thanks for sharing
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                    Quick check
                  </h3>
                  <button
                    onClick={handleDismissReadinessCheck}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--bg-card)' }}
                    aria-label="Dismiss"
                  >
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-[14px] mb-4" style={{ color: 'var(--text-sec)' }}>
                  How ready do you feel to move forward emotionally?
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Not at all', value: 'not_at_all' },
                    { label: 'A little', value: 'a_little' },
                    { label: 'Mostly', value: 'mostly' },
                    { label: 'Completely', value: 'completely' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleReadinessResponse(option.value)}
                      disabled={submittingReadiness}
                      className="px-4 py-2 rounded-full text-[13px] font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'var(--bg-card)',
                        color: 'var(--text-sec)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ERS Info Modal */}
      {showERSInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCloseERSInfo}
            role="presentation"
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-xl"
            style={{ background: 'var(--bg-card)' }}
          >
            {/* Gradient header */}
            <div
              className="px-6 pt-6 pb-4"
              style={{ background: 'linear-gradient(155deg, #3D6B54 0%, #5B8A72 40%, #7BA896 100%)' }}
            >
              <h2
                className="text-xl font-semibold text-white mb-2"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
              >
                Emotional Readiness Score
              </h2>
              <p className="text-[14px] text-white/80 leading-relaxed">
                Your ERS is a number from 0-100 that reflects where you are in your healing journey.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Stages */}
              <div className="space-y-3">
                {/* Healing */}
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#7E71B5' }} />
                  <div>
                    <span className="text-[14px] font-semibold" style={{ color: '#7E71B5' }}>Healing</span>
                    <span className="text-[12px] text-stone-400 ml-2">0-49</span>
                    <p className="text-[13px] text-stone-500">Processing and adjusting</p>
                  </div>
                </div>

                {/* Rebuilding */}
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#5B8A72' }} />
                  <div>
                    <span className="text-[14px] font-semibold" style={{ color: '#5B8A72' }}>Rebuilding</span>
                    <span className="text-[12px] text-stone-400 ml-2">50-74</span>
                    <p className="text-[13px] text-stone-500">Finding your footing</p>
                  </div>
                </div>

                {/* Ready */}
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#D4973B' }} />
                  <div>
                    <span className="text-[14px] font-semibold" style={{ color: '#D4973B' }}>Ready</span>
                    <span className="text-[12px] text-stone-400 ml-2">75-100</span>
                    <p className="text-[13px] text-stone-500">Emotionally resilient</p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <p className="text-[13px] text-stone-500 pt-2">
                Your score updates based on mood logs, journal entries, and engagement.
              </p>

              {/* Close button */}
              <button
                onClick={handleCloseERSInfo}
                className="w-full py-3 rounded-xl font-medium text-white mt-2"
                style={{ background: 'var(--primary)' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Toast */}
      {showMilestoneToast && currentMilestone && (
        <MilestoneToast
          milestone={currentMilestone}
          onDismiss={handleDismissMilestone}
        />
      )}

      {/* Weekly Recap */}
      {showWeeklyRecap && weeklyRecapData && (
        <WeeklyRecap
          data={{
            ...weeklyRecapData,
            aiInsight: aiInsight || undefined,
          }}
          onDismiss={handleDismissWeeklyRecap}
        />
      )}
    </div>
  );
}
