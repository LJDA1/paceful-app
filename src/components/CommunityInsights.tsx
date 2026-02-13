'use client';

import { useState, useEffect } from 'react';

interface CommunityStats {
  stage: 'healing' | 'rebuilding' | 'ready';
  usersInStage: number;
  source: 'community' | 'research';
  averageMoodInStage: number;
  topTriggers: string[];
  averageJournalFrequency: number;
  commonThemes: string[];
  percentImproving: number;
  averageDaysInStage: number;
  stageRange: string;
}

interface CommunityInsightsProps {
  userDaysInStage?: number;
}

// People icon SVG
function PeopleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
  );
}

function TrendUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
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

export default function CommunityInsights({ userDaysInStage = 0 }: CommunityInsightsProps) {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/community/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-3xl p-6 animate-pulse"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--border)' }} />
          <div className="flex-1">
            <div className="h-5 w-32 rounded mb-2" style={{ background: 'var(--border)' }} />
            <div className="h-3 w-48 rounded" style={{ background: 'var(--border)' }} />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return null; // Silently hide if stats unavailable
  }

  const stageLabels = {
    healing: 'Healing',
    rebuilding: 'Rebuilding',
    ready: 'Ready',
  };

  const stageLabel = stageLabels[stats.stage];

  // Determine timeline message
  let timelineMessage = '';
  if (stats.stage === 'ready') {
    timelineMessage = 'You\'ve reached the ready stage — focus on maintaining your growth';
  } else if (userDaysInStage > 0 && userDaysInStage < stats.averageDaysInStage) {
    timelineMessage = 'You\'re on pace';
  } else if (userDaysInStage > stats.averageDaysInStage) {
    timelineMessage = 'Everyone heals differently — there\'s no wrong timeline';
  } else {
    timelineMessage = `People typically spend ~${stats.averageDaysInStage} days here`;
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(94,141,176,0.1)' }}
          >
            <PeopleIcon className="w-5 h-5" style={{ color: 'var(--calm)' }} />
          </div>
          <div>
            <h3
              className="text-[18px] font-medium"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Others in your stage
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {stats.source === 'research' ? 'Based on healing research' : 'Anonymous insights from the Paceful community'}
            </p>
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="px-5 pb-5 space-y-0">
        {/* You're not alone */}
        <div
          className="py-4 border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <div className="flex items-start gap-3">
            <HeartIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--rose)' }} />
            <div>
              <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
                You're not alone
              </p>
              <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>
                {stats.source === 'community' && stats.usersInStage > 0
                  ? `${stats.usersInStage} people are in the ${stageLabel} stage right now`
                  : `Most people spend ${stats.stageRange} days in this stage`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Common triggers */}
        <div
          className="py-4 border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--text)' }}>
            Common triggers
          </p>
          <p className="text-[13px] mb-3" style={{ color: 'var(--text-sec)' }}>
            People in {stageLabel} most often report:
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topTriggers.map((trigger) => (
              <span
                key={trigger}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'var(--bg-warm)', color: 'var(--text-sec)' }}
              >
                {trigger}
              </span>
            ))}
          </div>
        </div>

        {/* Momentum */}
        <div
          className="py-4 border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <div className="flex items-start gap-3">
            <TrendUpIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
            <div className="flex-1">
              <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
                Momentum
              </p>
              <p className="text-[13px] mb-2" style={{ color: 'var(--text-sec)' }}>
                {stats.percentImproving}% of people at your stage improved last week
              </p>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.percentImproving}%`,
                    background: 'linear-gradient(90deg, var(--primary-light) 0%, var(--primary) 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Average time in stage */}
        {stats.stage !== 'ready' && (
          <div
            className="py-4 border-t"
            style={{ borderColor: 'var(--border-light)' }}
          >
            <div className="flex items-start gap-3">
              <ClockIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Average time in stage
                </p>
                <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>
                  {timelineMessage}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Condensed version for ERS page
export function CommunityInsightsCondensed() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/community/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-2xl p-4 animate-pulse"
        style={{ background: 'var(--bg-warm)' }}
      >
        <div className="h-4 w-48 rounded mb-2" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-32 rounded" style={{ background: 'var(--border)' }} />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const stageLabels = {
    healing: 'Healing',
    rebuilding: 'Rebuilding',
    ready: 'Ready',
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-warm)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <PeopleIcon className="w-4 h-4" style={{ color: 'var(--calm)' }} />
        <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--calm)' }}>
          Community Insight
        </span>
      </div>
      <p className="text-[14px] mb-1" style={{ color: 'var(--text)' }}>
        {stats.percentImproving}% of people at your stage are also improving
      </p>
      {stats.stage !== 'ready' && (
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Average time in {stageLabels[stats.stage]}: ~{stats.averageDaysInStage} days
        </p>
      )}
    </div>
  );
}
