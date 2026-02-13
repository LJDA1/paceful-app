'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';

// ============================================================================
// Types
// ============================================================================

interface UserData {
  moodCount: number;
  journalCount: number;
  exerciseCount: number;
  daysSinceStart: number;
  ersScore: number | null;
  ersStage: string | null;
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

// ============================================================================
// Main Page Component
// ============================================================================

export default function PredictionsPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch user data for predictions
  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [moodRes, journalRes, exerciseRes, ersRes, profileRes] = await Promise.all([
        supabase.from('mood_entries').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('journal_entries').select('id', { count: 'exact' }).eq('user_id', userId).is('deleted_at', null),
        supabase.from('exercise_completions').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('ers_scores').select('ers_score, ers_stage').eq('user_id', userId).order('calculated_at', { ascending: false }).limit(1).single(),
        supabase.from('profiles').select('relationship_ended_at').eq('user_id', userId).single(),
      ]);

      let daysSinceStart = 30;
      if (profileRes.data?.relationship_ended_at) {
        const startDate = new Date(profileRes.data.relationship_ended_at);
        daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      setUserData({
        moodCount: moodRes.count || 0,
        journalCount: journalRes.count || 0,
        exerciseCount: exerciseRes.count || 0,
        daysSinceStart,
        ersScore: ersRes.data?.ers_score || null,
        ersStage: ersRes.data?.ers_stage || null,
      });
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  const totalEntries = (userData?.moodCount || 0) + (userData?.journalCount || 0) + (userData?.exerciseCount || 0);
  const ersScore = userData?.ersScore || 0;
  const ersStage = userData?.ersStage || 'healing';

  // Milestones based on ERS stage
  const milestones = [
    { label: 'Started journey', done: true, achieved: true },
    { label: 'First week complete', done: (userData?.daysSinceStart || 0) >= 7, achieved: (userData?.daysSinceStart || 0) >= 7 },
    { label: 'Reached Rebuilding', done: ersStage === 'rebuilding' || ersStage === 'ready', estimate: ersStage === 'healing' ? '~3 weeks' : null },
    { label: 'Reached Ready', done: ersStage === 'ready', estimate: ersStage !== 'ready' ? '~8 weeks' : null },
  ];

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
              {isLoading ? (
                <div className="h-6 w-20 rounded bg-white/20 animate-pulse" />
              ) : (
                <>
                  <p className="text-[20px] font-bold text-white">{totalEntries} entries</p>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    across {userData?.daysSinceStart || 0} days
                  </p>
                </>
              )}
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
        {ersScore > 0 && (
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
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Your progress + projected path</p>
            </div>

            {/* Chart */}
            <div className="relative h-32 mb-3">
              <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
                {/* Threshold lines */}
                <line x1="0" y1="65" x2="300" y2="65" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="35" x2="300" y2="35" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />

                {/* Area fill */}
                <path
                  d={`M0,${100 - ersScore} L150,${100 - ersScore} L150,100 L0,100 Z`}
                  fill="rgba(91,138,114,0.1)"
                />

                {/* Actual line */}
                <path
                  d={`M0,${100 - ersScore * 0.8} Q75,${100 - ersScore * 0.9} 150,${100 - ersScore}`}
                  fill="none"
                  stroke="#5B8A72"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Projected line */}
                <path
                  d={`M150,${100 - ersScore} Q225,${100 - Math.min(ersScore + 15, 95)} 300,${100 - Math.min(ersScore + 20, 100)}`}
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
                    {milestone.estimate && (
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
              className="text-[26px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {ersStage === 'rebuilding' || ersStage === 'ready' ? '0' : '~21'}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Days to Rebuilding</p>
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
              className="text-[26px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {ersStage === 'ready' ? '0' : '~56'}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Days to Ready</p>
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
              className="text-[26px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Low
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
              className="text-[26px] font-bold mb-0.5"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Steady
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
