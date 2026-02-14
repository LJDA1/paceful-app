'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// ============================================================================
// Types
// ============================================================================

interface DataVolume {
  totalSnapshots: number;
  uniqueUsers: number;
  avgPerUser: number;
  dateRange: { start: string | null; end: string | null };
}

interface StageStats {
  stage: string;
  count: number;
  avgDays: number;
}

interface TrendDistribution {
  improving: number;
  stable: number;
  declining: number;
}

interface ReadinessDistribution {
  not_at_all: number;
  a_little: number;
  mostly: number;
  completely: number;
}

// ============================================================================
// Icons
// ============================================================================

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function ChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: 'green' | 'amber' | 'rose' | 'lavender';
}) {
  const highlightColors = {
    green: 'var(--primary)',
    amber: '#D4973B',
    rose: '#B86B64',
    lavender: '#7E71B5',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200">
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p
        className="text-3xl font-bold"
        style={{
          fontFamily: 'var(--font-fraunces), Fraunces, serif',
          color: highlight ? highlightColors[highlight] : 'var(--text)',
        }}
      >
        {value}
      </p>
      {subtext && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtext}</p>
      )}
    </div>
  );
}

// ============================================================================
// Progress Bar Component
// ============================================================================

function ProgressBar({
  value,
  max,
  label,
  milestone,
}: {
  value: number;
  max: number;
  label: string;
  milestone?: string;
}) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, var(--primary) 0%, #7BA896 100%)',
          }}
        />
      </div>
      {milestone && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{milestone}</p>
      )}
    </div>
  );
}

// ============================================================================
// Horizontal Bar Component
// ============================================================================

function HorizontalBar({
  label,
  value,
  maxValue,
  color,
  percentage,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  percentage?: number;
}) {
  const barPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {value} {percentage !== undefined && `(${percentage.toFixed(0)}%)`}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--border-light)' }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${barPercentage}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AdminTrajectoriesPage() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  // Data states
  const [dataVolume, setDataVolume] = useState<DataVolume>({
    totalSnapshots: 0,
    uniqueUsers: 0,
    avgPerUser: 0,
    dateRange: { start: null, end: null },
  });
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [trendDistribution, setTrendDistribution] = useState<TrendDistribution>({
    improving: 0,
    stable: 0,
    declining: 0,
  });
  const [readinessDistribution, setReadinessDistribution] = useState<ReadinessDistribution>({
    not_at_all: 0,
    a_little: 0,
    mostly: 0,
    completely: 0,
  });
  const [selfReportCoverage, setSelfReportCoverage] = useState(0);
  const [journalCorrelation, setJournalCorrelation] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    try {
      // Fetch all trajectories
      const { data: trajectories } = await supabase
        .from('recovery_trajectories')
        .select('*')
        .order('snapshot_date', { ascending: true });

      if (!trajectories || trajectories.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate data volume metrics
      const uniqueUserIds = new Set(trajectories.map(t => t.user_id));
      const dates = trajectories.map(t => t.snapshot_date).filter(Boolean).sort();

      setDataVolume({
        totalSnapshots: trajectories.length,
        uniqueUsers: uniqueUserIds.size,
        avgPerUser: uniqueUserIds.size > 0 ? trajectories.length / uniqueUserIds.size : 0,
        dateRange: {
          start: dates[0] || null,
          end: dates[dates.length - 1] || null,
        },
      });

      // Calculate stage statistics
      const stageMap = new Map<string, { count: number; totalDays: number }>();
      trajectories.forEach(t => {
        if (t.ers_stage) {
          const existing = stageMap.get(t.ers_stage) || { count: 0, totalDays: 0 };
          stageMap.set(t.ers_stage, {
            count: existing.count + 1,
            totalDays: existing.totalDays + (t.days_since_breakup || 0),
          });
        }
      });

      const stages: StageStats[] = Array.from(stageMap.entries())
        .map(([stage, data]) => ({
          stage,
          count: data.count,
          avgDays: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
        }))
        .sort((a, b) => b.count - a.count);
      setStageStats(stages);

      // Calculate trend distribution
      const trends = { improving: 0, stable: 0, declining: 0 };
      trajectories.forEach(t => {
        if (t.mood_trend === 'improving') trends.improving++;
        else if (t.mood_trend === 'stable') trends.stable++;
        else if (t.mood_trend === 'declining') trends.declining++;
      });
      setTrendDistribution(trends);

      // Calculate self-reported readiness distribution
      const readiness: ReadinessDistribution = {
        not_at_all: 0,
        a_little: 0,
        mostly: 0,
        completely: 0,
      };
      let selfReportCount = 0;
      trajectories.forEach(t => {
        if (t.self_reported_readiness) {
          selfReportCount++;
          const key = t.self_reported_readiness as keyof ReadinessDistribution;
          if (key in readiness) {
            readiness[key]++;
          }
        }
      });
      setReadinessDistribution(readiness);

      // Calculate self-report coverage
      const coverage = uniqueUserIds.size > 0 ? (selfReportCount / trajectories.length) * 100 : 0;
      setSelfReportCoverage(coverage);

      // Calculate journal correlation (if enough data)
      const usersWithHighJournal = new Set<string>();
      const usersWithLowJournal = new Set<string>();
      const userStageProgression = new Map<string, number[]>();

      trajectories.forEach(t => {
        // Track users by journal frequency
        if ((t.journal_frequency_7d || 0) >= 3) {
          usersWithHighJournal.add(t.user_id);
        } else {
          usersWithLowJournal.add(t.user_id);
        }

        // Track ERS progression per user
        if (t.ers_score !== null) {
          const scores = userStageProgression.get(t.user_id) || [];
          scores.push(t.ers_score);
          userStageProgression.set(t.user_id, scores);
        }
      });

      // Calculate average ERS improvement
      let highJournalImprovement = 0;
      let highJournalCount = 0;
      let lowJournalImprovement = 0;
      let lowJournalCount = 0;

      userStageProgression.forEach((scores, userId) => {
        if (scores.length >= 2) {
          const improvement = scores[scores.length - 1] - scores[0];
          if (usersWithHighJournal.has(userId)) {
            highJournalImprovement += improvement;
            highJournalCount++;
          } else if (usersWithLowJournal.has(userId)) {
            lowJournalImprovement += improvement;
            lowJournalCount++;
          }
        }
      });

      if (highJournalCount >= 5 && lowJournalCount >= 5) {
        const avgHigh = highJournalImprovement / highJournalCount;
        const avgLow = lowJournalImprovement / lowJournalCount;
        if (avgHigh > avgLow && avgLow > 0) {
          const percentFaster = Math.round(((avgHigh - avgLow) / avgLow) * 100);
          if (percentFaster > 10) {
            setJournalCorrelation(`Users who journal 3+ times/week progress ${percentFaster}% faster`);
          }
        }
      } else {
        setJournalCorrelation('Insufficient data for correlation analysis');
      }
    } catch (error) {
      console.error('Error fetching trajectory data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get milestone info
  const getMilestoneInfo = (count: number) => {
    if (count >= 5000) return { next: 10000, label: 'Production-ready model', color: 'var(--primary)' };
    if (count >= 1000) return { next: 5000, label: 'Robust fine-tuning (5000)', color: 'var(--primary)' };
    if (count >= 500) return { next: 1000, label: 'Minimum for fine-tuning (1000)', color: '#D4973B' };
    if (count >= 100) return { next: 500, label: 'Early experimentation (500)', color: '#D4973B' };
    return { next: 100, label: 'Initial data collection (100)', color: '#B86B64' };
  };

  const milestoneInfo = getMilestoneInfo(dataVolume.totalSnapshots);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
      </div>
    );
  }

  const totalTrends = trendDistribution.improving + trendDistribution.stable + trendDistribution.declining;
  const totalReadiness = readinessDistribution.not_at_all + readinessDistribution.a_little +
                         readinessDistribution.mostly + readinessDistribution.completely;

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/analytics"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-stone-200"
          >
            <ArrowLeftIcon className="w-5 h-5 text-stone-600" />
          </Link>
          <div>
            <h1
              className="text-[28px] font-bold"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Recovery Trajectories
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Training data for model fine-tuning
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
          </div>
        ) : dataVolume.totalSnapshots === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center">
            <ChartIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
              No trajectory data yet
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Trajectory snapshots will be captured as users engage with the app.
            </p>
          </div>
        ) : (
          <>
            {/* Data Volume */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Snapshots"
                value={dataVolume.totalSnapshots.toLocaleString()}
                highlight="lavender"
              />
              <StatCard
                label="Unique Users"
                value={dataVolume.uniqueUsers.toLocaleString()}
              />
              <StatCard
                label="Avg per User"
                value={dataVolume.avgPerUser.toFixed(1)}
              />
              <StatCard
                label="Date Range"
                value={formatDate(dataVolume.dateRange.start)}
                subtext={`to ${formatDate(dataVolume.dateRange.end)}`}
              />
            </div>

            {/* Training Data Readiness */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <ChartIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  Training Data Readiness
                </h2>
              </div>
              <ProgressBar
                value={dataVolume.totalSnapshots}
                max={milestoneInfo.next}
                label={`Progress to ${milestoneInfo.next.toLocaleString()} snapshots`}
                milestone={milestoneInfo.label}
              />
              <div className="flex flex-wrap gap-2 mt-4">
                {[100, 500, 1000, 5000].map(milestone => (
                  <span
                    key={milestone}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      dataVolume.totalSnapshots >= milestone ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {milestone.toLocaleString()} {dataVolume.totalSnapshots >= milestone && '✓'}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Stage Distribution */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  ERS Stage Distribution
                </h2>
                {stageStats.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No stage data yet
                  </p>
                ) : (
                  <div>
                    {stageStats.map(stage => {
                      const stageColors: Record<string, string> = {
                        healing: '#7E71B5',
                        rebuilding: '#5B8A72',
                        ready: '#D4973B',
                      };
                      return (
                        <div key={stage.stage} className="mb-3">
                          <HorizontalBar
                            label={stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1)}
                            value={stage.count}
                            maxValue={stageStats[0]?.count || 1}
                            color={stageColors[stage.stage] || 'var(--text-muted)'}
                          />
                          <p className="text-xs ml-1 -mt-1" style={{ color: 'var(--text-muted)' }}>
                            Avg {stage.avgDays} days since breakup
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mood Trend Distribution */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  Mood Trend Distribution
                </h2>
                {totalTrends === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No trend data yet
                  </p>
                ) : (
                  <div>
                    <HorizontalBar
                      label="Improving"
                      value={trendDistribution.improving}
                      maxValue={Math.max(trendDistribution.improving, trendDistribution.stable, trendDistribution.declining)}
                      color="#5B8A72"
                      percentage={(trendDistribution.improving / totalTrends) * 100}
                    />
                    <HorizontalBar
                      label="Stable"
                      value={trendDistribution.stable}
                      maxValue={Math.max(trendDistribution.improving, trendDistribution.stable, trendDistribution.declining)}
                      color="#D4973B"
                      percentage={(trendDistribution.stable / totalTrends) * 100}
                    />
                    <HorizontalBar
                      label="Declining"
                      value={trendDistribution.declining}
                      maxValue={Math.max(trendDistribution.improving, trendDistribution.stable, trendDistribution.declining)}
                      color="#B86B64"
                      percentage={(trendDistribution.declining / totalTrends) * 100}
                    />
                  </div>
                )}

                {/* Correlation insight */}
                {journalCorrelation && (
                  <div
                    className="mt-4 p-3 rounded-xl text-sm"
                    style={{
                      background: journalCorrelation.includes('Insufficient') ? 'var(--bg-warm)' : 'rgba(91,138,114,0.1)',
                      color: journalCorrelation.includes('Insufficient') ? 'var(--text-muted)' : 'var(--primary)',
                    }}
                  >
                    {journalCorrelation}
                  </div>
                )}
              </div>
            </div>

            {/* Self-Report Coverage */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                Self-Reported Readiness
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-sec)' }}>
                    Coverage: <span className="font-semibold">{selfReportCoverage.toFixed(1)}%</span> of snapshots have self-reports
                  </p>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    Self-reported readiness is the ground truth label for training.
                  </p>
                </div>
                <div>
                  {totalReadiness === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      No self-reports yet
                    </p>
                  ) : (
                    <>
                      <HorizontalBar
                        label="Completely ready"
                        value={readinessDistribution.completely}
                        maxValue={Math.max(...Object.values(readinessDistribution))}
                        color="#5B8A72"
                        percentage={(readinessDistribution.completely / totalReadiness) * 100}
                      />
                      <HorizontalBar
                        label="Mostly ready"
                        value={readinessDistribution.mostly}
                        maxValue={Math.max(...Object.values(readinessDistribution))}
                        color="#7BA896"
                        percentage={(readinessDistribution.mostly / totalReadiness) * 100}
                      />
                      <HorizontalBar
                        label="A little ready"
                        value={readinessDistribution.a_little}
                        maxValue={Math.max(...Object.values(readinessDistribution))}
                        color="#D4973B"
                        percentage={(readinessDistribution.a_little / totalReadiness) * 100}
                      />
                      <HorizontalBar
                        label="Not at all"
                        value={readinessDistribution.not_at_all}
                        maxValue={Math.max(...Object.values(readinessDistribution))}
                        color="#B86B64"
                        percentage={(readinessDistribution.not_at_all / totalReadiness) * 100}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="text-center">
              <button
                onClick={fetchData}
                className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{ background: 'var(--bg-warm)', color: 'var(--text-sec)', border: '1px solid var(--border-light)' }}
              >
                Refresh Data
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
