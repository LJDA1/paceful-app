'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { trackEvent } from '@/lib/track';

// ============================================================================
// Types
// ============================================================================

interface MoodEntry {
  id: string;
  mood_value: number;
  logged_at: string;
}

interface ERSScore {
  ers_score: number;
  ers_stage: string;
  calculated_at: string;
}

interface ForecastData {
  moodEntries: MoodEntry[];
  journalCount: number;
  ersHistory: ERSScore[];
  daysSinceStart: number;
  daysActive: number;
  totalEntries: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function calculateWeeklyERSGain(ersHistory: ERSScore[]): number {
  if (ersHistory.length < 2) return 0;

  // Sort by date ascending
  const sorted = [...ersHistory].sort((a, b) =>
    new Date(a.calculated_at).getTime() - new Date(b.calculated_at).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const daysDiff = (new Date(last.calculated_at).getTime() - new Date(first.calculated_at).getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < 1) return 0;

  const scoreDiff = last.ers_score - first.ers_score;
  return (scoreDiff / daysDiff) * 7; // Weekly rate
}

function getSetbackRisk(moodEntries: MoodEntry[]): 'Low' | 'Moderate' | 'Elevated' {
  // Get moods from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMoods = moodEntries
    .filter(m => new Date(m.logged_at) >= sevenDaysAgo)
    .map(m => m.mood_value);

  if (recentMoods.length < 2) return 'Low';

  const stdDev = calculateStdDev(recentMoods);

  if (stdDev > 2.5) return 'Elevated';
  if (stdDev > 1.5) return 'Moderate';
  return 'Low';
}

function getTrajectory(ersHistory: ERSScore[]): 'Improving' | 'Steady' | 'Needs attention' {
  if (ersHistory.length < 2) return 'Steady';

  const weeklyGain = calculateWeeklyERSGain(ersHistory);

  if (weeklyGain > 2) return 'Improving';
  if (weeklyGain < -2) return 'Needs attention';
  return 'Steady';
}

function getDaysToStage(currentScore: number, targetScore: number, weeklyGain: number): string {
  if (currentScore >= targetScore) return 'Achieved';
  if (weeklyGain <= 0) return 'Keep logging';

  const scoreNeeded = targetScore - currentScore;
  const daysNeeded = Math.ceil((scoreNeeded / weeklyGain) * 7);

  if (daysNeeded > 180) return '6+ months';
  if (daysNeeded > 90) return '~3 months';

  return `~${daysNeeded} days`;
}

function hasConsistentEngagement(moodEntries: MoodEntry[]): boolean {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentDates = new Set(
    moodEntries
      .filter(m => new Date(m.logged_at) >= sevenDaysAgo)
      .map(m => new Date(m.logged_at).toDateString())
  );

  return recentDates.size >= 5;
}

function hasStableWeek(moodEntries: MoodEntry[]): boolean {
  if (moodEntries.length < 7) return false;

  // Check any 7-day window
  const sorted = [...moodEntries].sort((a, b) =>
    new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );

  for (let i = 0; i <= sorted.length - 7; i++) {
    const window = sorted.slice(i, i + 7).map(m => m.mood_value);
    if (calculateStdDev(window) < 1.0) return true;
  }

  return false;
}

// ============================================================================
// Icons
// ============================================================================

function ActivityIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function BookIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
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

function ClockIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ShieldIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function TrendUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen pb-28 md:pb-8 animate-pulse" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="h-8 w-32 rounded mb-2" style={{ background: 'var(--border)' }} />
        <div className="h-4 w-48 rounded mb-6" style={{ background: 'var(--border-light)' }} />
        <div className="h-36 rounded-3xl mb-6" style={{ background: 'var(--border)' }} />
        <div className="h-40 rounded-3xl mb-6" style={{ background: 'var(--border-light)' }} />
        <div className="h-6 w-24 rounded mb-4" style={{ background: 'var(--border)' }} />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-[18px]" style={{ background: 'var(--border-light)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ daysLogged }: { daysLogged: number }) {
  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="mb-6">
          <h1
            className="text-[28px] font-bold mb-1"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Forecast
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            Your personalized recovery timeline
          </p>
        </div>

        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-warm)' }}
          >
            <TrendUpIcon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
          </div>

          <h2
            className="text-[20px] font-semibold mb-2"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Building your forecast
          </h2>

          <p className="text-[14px] mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            Log your mood for at least 3 days so we can start mapping your recovery journey. The more you log, the more accurate your predictions become.
          </p>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3].map(day => (
                <div
                  key={day}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold"
                  style={{
                    background: day <= daysLogged ? 'var(--primary)' : 'var(--bg-warm)',
                    color: day <= daysLogged ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {day <= daysLogged ? <CheckIcon className="w-5 h-5" /> : day}
                </div>
              ))}
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>
              {daysLogged} of 3 days logged
            </p>
          </div>

          <Link
            href="/mood"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white"
            style={{ background: 'var(--primary)' }}
          >
            <HeartIcon className="w-5 h-5" />
            Log today&apos;s mood
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PredictionsPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch all forecast data
  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const [moodRes, journalRes, ersRes, profileRes] = await Promise.all([
        // Get actual mood entries (not just count)
        supabase
          .from('mood_entries')
          .select('id, mood_value, logged_at')
          .eq('user_id', userId)
          .gte('logged_at', ninetyDaysAgo.toISOString())
          .order('logged_at', { ascending: false }),

        // Get journal count
        supabase
          .from('journal_entries')
          .select('id, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .is('deleted_at', null)
          .gte('created_at', ninetyDaysAgo.toISOString()),

        // Get ERS history
        supabase
          .from('ers_scores')
          .select('ers_score, ers_stage, calculated_at')
          .eq('user_id', userId)
          .order('calculated_at', { ascending: false })
          .limit(20),

        // Get profile for days since start
        supabase
          .from('profiles')
          .select('relationship_ended_at, created_at')
          .eq('user_id', userId)
          .single(),
      ]);

      const moodEntries = (moodRes.data || []) as MoodEntry[];
      const journalCount = journalRes.count || 0;
      const ersHistory = (ersRes.data || []) as ERSScore[];

      // Calculate days since start
      let daysSinceStart = 30;
      if (profileRes.data?.relationship_ended_at) {
        const startDate = new Date(profileRes.data.relationship_ended_at);
        daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      } else if (profileRes.data?.created_at) {
        const startDate = new Date(profileRes.data.created_at);
        daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate days active (distinct days with mood entries)
      const moodDates = new Set(moodEntries.map(m => new Date(m.logged_at).toDateString()));
      const journalDates = new Set(
        (journalRes.data || []).map((j: { created_at: string }) => new Date(j.created_at).toDateString())
      );
      const allDates = new Set([...moodDates, ...journalDates]);

      setForecastData({
        moodEntries,
        journalCount,
        ersHistory,
        daysSinceStart: Math.max(daysSinceStart, 1),
        daysActive: allDates.size,
        totalEntries: moodEntries.length + journalCount,
      });
    } catch (err) {
      console.error('Error fetching forecast data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      fetchData();
      trackEvent('page_view', { page: 'forecast' });
    }
  }, [userId, fetchData]);

  // Show loading state
  if (isLoading || userLoading) {
    return <LoadingSkeleton />;
  }

  // Calculate unique days with mood entries for empty state
  const moodDaysLogged = forecastData
    ? new Set(forecastData.moodEntries.map(m => new Date(m.logged_at).toDateString())).size
    : 0;

  // Show empty state if fewer than 3 mood entries
  if (!forecastData || moodDaysLogged < 3) {
    return <EmptyState daysLogged={moodDaysLogged} />;
  }

  // Calculate all projections
  const ersScore = forecastData.ersHistory[0]?.ers_score || 0;
  const ersStage = forecastData.ersHistory[0]?.ers_stage || 'healing';
  const weeklyGain = calculateWeeklyERSGain(forecastData.ersHistory);
  const setbackRisk = getSetbackRisk(forecastData.moodEntries);
  const trajectory = getTrajectory(forecastData.ersHistory);
  const daysToRebuilding = getDaysToStage(ersScore, 35, weeklyGain);
  const daysToReady = getDaysToStage(ersScore, 65, weeklyGain);
  const consistentEngagement = hasConsistentEngagement(forecastData.moodEntries);
  const stableWeek = hasStableWeek(forecastData.moodEntries);

  // Early data warning
  const isEarlyData = moodDaysLogged < 7;

  // Build milestones
  const milestones = [
    {
      label: 'Consistent daily engagement',
      done: consistentEngagement,
      achieved: consistentEngagement,
      estimate: !consistentEngagement ? 'In progress' : null,
    },
    {
      label: 'Reach Rebuilding stage',
      done: ersStage === 'rebuilding' || ersStage === 'ready',
      achieved: ersStage === 'rebuilding' || ersStage === 'ready',
      estimate: ersStage === 'healing' ? daysToRebuilding : null,
    },
    {
      label: 'First stable week',
      done: stableWeek,
      achieved: stableWeek,
      estimate: !stableWeek ? 'In progress' : null,
    },
    {
      label: 'Reach Ready stage',
      done: ersStage === 'ready',
      achieved: ersStage === 'ready',
      estimate: ersStage !== 'ready' ? daysToReady : null,
    },
  ];

  // Build chart path from ERS history
  const buildChartPath = () => {
    if (forecastData.ersHistory.length < 2) {
      // Single point - just show current
      return {
        actualPath: `M0,${100 - ersScore} L150,${100 - ersScore}`,
        projectedPath: `M150,${100 - ersScore} L300,${100 - Math.min(ersScore + 10, 100)}`,
      };
    }

    // Sort ascending by date
    const sorted = [...forecastData.ersHistory]
      .sort((a, b) => new Date(a.calculated_at).getTime() - new Date(b.calculated_at).getTime());

    // Map to chart coordinates (0-150 for actual, 150-300 for projected)
    const points = sorted.map((score, i) => {
      const x = (i / (sorted.length - 1)) * 150;
      const y = 100 - score.ers_score;
      return `${x},${y}`;
    });

    const actualPath = `M${points.join(' L')}`;

    // Project forward
    const lastScore = sorted[sorted.length - 1].ers_score;
    const projectedEnd = Math.min(lastScore + (weeklyGain > 0 ? weeklyGain * 8 : 10), 100);
    const projectedPath = `M150,${100 - lastScore} Q225,${100 - (lastScore + projectedEnd) / 2} 300,${100 - projectedEnd}`;

    return { actualPath, projectedPath };
  };

  const { actualPath, projectedPath } = buildChartPath();

  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-[28px] font-bold mb-1"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Forecast
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            Your personalized recovery timeline
          </p>
        </div>

        {/* Early data warning */}
        {isEarlyData && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
            style={{ background: 'rgba(212,151,59,0.1)', border: '1px solid rgba(212,151,59,0.2)' }}
          >
            <SparkleIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>
              Early predictions — accuracy improves with more data
            </p>
          </div>
        )}

        {/* Data Foundation Banner */}
        <div
          className="rounded-3xl p-5 mb-6 overflow-hidden"
          style={{ background: 'linear-gradient(155deg, #3D6B54 0%, #5B8A72 100%)' }}
        >
          <div className="flex gap-4 mb-4">
            {/* Your Data */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ActivityIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
                <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Your data</span>
              </div>
              <p className="text-[20px] font-bold text-white">{forecastData.totalEntries} entries</p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                across {forecastData.daysActive} active days
              </p>
            </div>

            {/* Divider */}
            <div className="w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* Research */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BookIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
                <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Research</span>
              </div>
              <p className="text-[13px] text-white leading-snug">Peer-reviewed emotional recovery models</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>clinical psychology literature</p>
            </div>
          </div>

          {/* Bottom note */}
          <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <SparkleIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Predictions become more personalized as you log more entries
            </p>
          </div>
        </div>

        {/* ERS Trajectory Chart */}
        {forecastData.ersHistory.length >= 1 && (
          <div
            className="rounded-3xl p-5 mb-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div className="mb-4">
              <h3
                className="text-[17px] font-semibold mb-0.5"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                ERS trajectory
              </h3>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {forecastData.ersHistory.length < 3
                  ? 'Keep logging to see your trajectory'
                  : 'Your progress + projected path'}
              </p>
            </div>

            {/* Chart */}
            <div className="relative h-32 mb-3">
              <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
                {/* Threshold lines */}
                <line x1="0" y1="65" x2="300" y2="65" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="35" x2="300" y2="35" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />

                {/* Area fill */}
                <path
                  d={`${actualPath} L150,100 L0,100 Z`}
                  fill="rgba(91,138,114,0.1)"
                />

                {/* Actual line */}
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#5B8A72"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Projected line */}
                <path
                  d={projectedPath}
                  fill="none"
                  stroke="#D4973B"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />

                {/* Current position dot */}
                <circle cx="150" cy={100 - ersScore} r="6" fill="#5B8A72" />
                <circle cx="150" cy={100 - ersScore} r="10" fill="#5B8A72" opacity="0.3">
                  <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>

              {/* Threshold labels */}
              <div className="absolute right-0 top-[30%] text-[10px]" style={{ color: 'var(--text-muted)' }}>Ready (65+)</div>
              <div className="absolute right-0 top-[60%] text-[10px]" style={{ color: 'var(--text-muted)' }}>Rebuilding (35+)</div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded" style={{ background: '#5B8A72' }} />
                <span style={{ color: 'var(--text-muted)' }}>Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded" style={{ background: '#D4973B', borderStyle: 'dashed' }} />
                <span style={{ color: 'var(--text-muted)' }}>Projected</span>
              </div>
            </div>
          </div>
        )}

        {/* Milestones */}
        <h3
          className="text-[20px] font-semibold mb-4"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          Milestones
        </h3>

        <div className="relative mb-8">
          {/* Timeline line */}
          <div
            className="absolute left-[11px] top-2 bottom-2 w-[2px]"
            style={{ background: 'var(--border-light)' }}
          />

          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex gap-4">
                {/* Dot */}
                <div
                  className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: milestone.done ? 'var(--primary)' : 'var(--bg-card)',
                    border: milestone.done ? 'none' : '2px solid var(--border)',
                  }}
                >
                  {milestone.done && <CheckIcon className="w-3 h-3 text-white" />}
                </div>

                {/* Card */}
                <div
                  className="flex-1 rounded-[18px] p-4"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    opacity: milestone.done ? 1 : 0.65,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                      {milestone.label}
                    </span>
                    {milestone.achieved && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(91,138,114,0.1)', color: 'var(--primary)' }}>
                        Achieved
                      </span>
                    )}
                    {milestone.estimate && !milestone.achieved && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <ClockIcon className="w-3 h-3" />
                        {milestone.estimate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projected Outlook Grid */}
        <h3
          className="text-[20px] font-semibold mb-4"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          Projected outlook
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div
            className="rounded-[22px] p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(91,138,114,0.1)' }}
            >
              <ClockIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <p
              className="text-[22px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {daysToRebuilding}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>To Rebuilding</p>
          </div>

          <div
            className="rounded-[22px] p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(212,151,59,0.1)' }}
            >
              <SparkleIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <p
              className="text-[22px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {daysToReady}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>To Ready</p>
          </div>

          <div
            className="rounded-[22px] p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(184,107,100,0.1)' }}
            >
              <ShieldIcon className="w-5 h-5" style={{ color: 'var(--rose)' }} />
            </div>
            <p
              className="text-[22px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {setbackRisk}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Setback risk</p>
          </div>

          <div
            className="rounded-[22px] p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(94,141,176,0.1)' }}
            >
              <TrendUpIcon className="w-5 h-5" style={{ color: 'var(--calm)' }} />
            </div>
            <p
              className="text-[22px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {trajectory}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Trajectory</p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="rounded-[22px] p-5" style={{ background: 'var(--bg-warm)' }}>
          <h4 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            How your forecast works
          </h4>

          <div className="space-y-0">
            {[
              { icon: ActivityIcon, text: 'Your mood, journal, and activity data feeds the model' },
              { icon: BookIcon, text: 'Patterns are matched against clinical recovery research' },
              { icon: SparkleIcon, text: 'Projections update as you add more data' },
              { icon: ShieldIcon, text: 'Your personal data is never shared' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: index < 3 ? '1px solid var(--border-light)' : 'none' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <item.icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
