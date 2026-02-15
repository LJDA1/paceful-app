'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// ============================================================================
// Types
// ============================================================================

interface DataVolume {
  moodEntries: { total: number; real: number; synthetic: number };
  journalEntries: { total: number; real: number; synthetic: number };
  extractedInsights: number;
  discoveredPatterns: number;
  recoveryTrajectories: number;
  aiMemoryFacts: number;
  chatSessionsWithSummary: number;
}

interface PatternQuality {
  byConfidence: { high: number; medium: number; low: number };
  topThemes: { theme: string; count: number }[];
  byRecoveryContext: { context: string; count: number }[];
  lastDiscoveryRun: string | null;
}

interface AIEngagement {
  chatSessionsPerDay: { date: string; count: number }[];
  avgMessagesPerSession: number;
  journalReflections: number;
  insightsPerDay: { date: string; count: number }[];
  avgMemoryFactsPerUser: number;
}

interface ERSValidation {
  usersWithBoth: number;
  correlationDirection: 'positive' | 'negative' | 'none' | 'insufficient';
  dataPoints: { userId: string; ersScore: number; selfReported: number }[];
  targetDataPoints: number;
}

interface DataMilestone {
  threshold: number;
  title: string;
  description: string;
  unlocked: boolean;
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({
  label,
  value,
  subtext,
  breakdown,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  breakdown?: { real: number; synthetic: number };
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200">
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p
        className="text-3xl font-bold"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        {value}
      </p>
      {breakdown && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
          {breakdown.real} real / {breakdown.synthetic} synthetic
        </p>
      )}
      {subtext && !breakdown && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{subtext}</p>
      )}
    </div>
  );
}

// ============================================================================
// Progress Bar Component
// ============================================================================

function ProgressBar({ current, target, label }: { current: number; target: number; label: string }) {
  const percent = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-sm" style={{ color: isComplete ? 'var(--primary)' : 'var(--text-muted)' }}>
          {current} / {target}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: isComplete
              ? 'var(--primary)'
              : 'linear-gradient(90deg, var(--primary-light) 0%, var(--calm) 100%)',
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Mini Line Chart Component
// ============================================================================

function MiniLineChart({ data, height = 80 }: { data: { date: string; count: number }[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-sm" style={{ color: 'var(--text-muted)' }}>
        No data yet
      </div>
    );
  }

  const width = 300;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const xScale = (i: number) => (i / (data.length - 1 || 1)) * chartWidth + padding.left;
  const yScale = (count: number) => chartHeight - (count / maxCount) * chartHeight + padding.top;

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.count)}`)
    .join(' ');

  const areaD = pathD + ` L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid lines */}
      {[0, maxCount / 2, maxCount].map((y, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={yScale(y)}
            x2={width - padding.right}
            y2={yScale(y)}
            stroke="var(--border-light)"
            strokeDasharray="2,2"
          />
          <text
            x={padding.left - 5}
            y={yScale(y) + 3}
            textAnchor="end"
            fontSize="8"
            fill="var(--text-muted)"
          >
            {Math.round(y)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="rgba(91,138,114,0.15)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.count)} r="3" fill="var(--primary)" />
      ))}
    </svg>
  );
}

// ============================================================================
// Milestone Timeline Component
// ============================================================================

function MilestoneTimeline({ milestones, currentUsers }: { milestones: DataMilestone[]; currentUsers: number }) {
  return (
    <div className="space-y-4">
      <ProgressBar current={currentUsers} target={50} label="Real users" />

      <div className="relative pl-6">
        {/* Vertical line */}
        <div
          className="absolute left-2 top-2 bottom-2 w-0.5"
          style={{ background: 'var(--border-light)' }}
        />

        {milestones.map((milestone, idx) => (
          <div key={idx} className="relative pb-6 last:pb-0">
            {/* Dot */}
            <div
              className="absolute left-0 w-4 h-4 rounded-full border-2"
              style={{
                background: milestone.unlocked ? 'var(--primary)' : 'white',
                borderColor: milestone.unlocked ? 'var(--primary)' : 'var(--border)',
                transform: 'translateX(-6px)',
              }}
            />

            {/* Content */}
            <div className="ml-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: milestone.unlocked ? 'var(--primary)' : 'var(--text)' }}
                >
                  {milestone.threshold.toLocaleString()} users
                </span>
                {milestone.unlocked && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                  >
                    Unlocked
                  </span>
                )}
              </div>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--text)' }}>
                {milestone.title}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {milestone.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Section Header Component
// ============================================================================

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2
        className="text-xl font-semibold"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );
}

// ============================================================================
// Main Dashboard
// ============================================================================

function AIProgressDashboard() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dataVolume, setDataVolume] = useState<DataVolume>({
    moodEntries: { total: 0, real: 0, synthetic: 0 },
    journalEntries: { total: 0, real: 0, synthetic: 0 },
    extractedInsights: 0,
    discoveredPatterns: 0,
    recoveryTrajectories: 0,
    aiMemoryFacts: 0,
    chatSessionsWithSummary: 0,
  });

  const [patternQuality, setPatternQuality] = useState<PatternQuality>({
    byConfidence: { high: 0, medium: 0, low: 0 },
    topThemes: [],
    byRecoveryContext: [],
    lastDiscoveryRun: null,
  });

  const [aiEngagement, setAIEngagement] = useState<AIEngagement>({
    chatSessionsPerDay: [],
    avgMessagesPerSession: 0,
    journalReflections: 0,
    insightsPerDay: [],
    avgMemoryFactsPerUser: 0,
  });

  const [ersValidation, setERSValidation] = useState<ERSValidation>({
    usersWithBoth: 0,
    correlationDirection: 'insufficient',
    dataPoints: [],
    targetDataPoints: 50,
  });

  const [realUserCount, setRealUserCount] = useState(0);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // ========== 1. DATA VOLUME ==========

      // Mood entries
      const { data: moodData } = await supabase
        .from('mood_entries')
        .select('id, is_synthetic');
      const moodTotal = moodData?.length || 0;
      const moodSynthetic = moodData?.filter(m => m.is_synthetic).length || 0;
      const moodReal = moodTotal - moodSynthetic;

      // Journal entries
      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('id, is_synthetic')
        .is('deleted_at', null);
      const journalTotal = journalData?.length || 0;
      const journalSynthetic = journalData?.filter(j => j.is_synthetic).length || 0;
      const journalReal = journalTotal - journalSynthetic;

      // Extracted insights
      const { count: insightsCount } = await supabase
        .from('extracted_insights')
        .select('*', { count: 'exact', head: true });

      // Discovered patterns
      const { count: patternsCount } = await supabase
        .from('discovered_patterns')
        .select('*', { count: 'exact', head: true });

      // Recovery trajectories
      const { count: trajectoriesCount } = await supabase
        .from('recovery_trajectories')
        .select('*', { count: 'exact', head: true });

      // AI memory facts
      const { count: memoryCount } = await supabase
        .from('ai_memory')
        .select('*', { count: 'exact', head: true });

      // Chat sessions with summary
      const { count: chatWithSummaryCount } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .not('summary', 'is', null);

      setDataVolume({
        moodEntries: { total: moodTotal, real: moodReal, synthetic: moodSynthetic },
        journalEntries: { total: journalTotal, real: journalReal, synthetic: journalSynthetic },
        extractedInsights: insightsCount || 0,
        discoveredPatterns: patternsCount || 0,
        recoveryTrajectories: trajectoriesCount || 0,
        aiMemoryFacts: memoryCount || 0,
        chatSessionsWithSummary: chatWithSummaryCount || 0,
      });

      // ========== 2. PATTERN QUALITY ==========

      const { data: patterns } = await supabase
        .from('discovered_patterns')
        .select('id, confidence_score, pattern_type, recovery_context, created_at')
        .order('created_at', { ascending: false });

      // By confidence level
      const byConfidence = { high: 0, medium: 0, low: 0 };
      (patterns || []).forEach(p => {
        const score = p.confidence_score || 0;
        if (score >= 0.7) byConfidence.high++;
        else if (score >= 0.4) byConfidence.medium++;
        else byConfidence.low++;
      });

      // Top themes (by pattern_type)
      const themeCounts: Record<string, number> = {};
      (patterns || []).forEach(p => {
        const theme = p.pattern_type || 'unknown';
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
      const topThemes = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([theme, count]) => ({ theme, count }));

      // By recovery context
      const contextCounts: Record<string, number> = {};
      (patterns || []).forEach(p => {
        const context = p.recovery_context || 'unspecified';
        contextCounts[context] = (contextCounts[context] || 0) + 1;
      });
      const byRecoveryContext = Object.entries(contextCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([context, count]) => ({ context, count }));

      // Last discovery run
      const lastDiscoveryRun = patterns?.[0]?.created_at || null;

      setPatternQuality({
        byConfidence,
        topThemes,
        byRecoveryContext,
        lastDiscoveryRun,
      });

      // ========== 3. AI ENGAGEMENT ==========

      // Chat sessions per day (last 30 days)
      const { data: chatSessions } = await supabase
        .from('chat_sessions')
        .select('id, started_at, message_count')
        .gte('started_at', thirtyDaysAgo)
        .order('started_at', { ascending: true });

      const chatByDay: Record<string, number> = {};
      let totalMessages = 0;
      (chatSessions || []).forEach(session => {
        const date = new Date(session.started_at).toISOString().split('T')[0];
        chatByDay[date] = (chatByDay[date] || 0) + 1;
        totalMessages += session.message_count || 0;
      });
      const chatSessionsPerDay = Object.entries(chatByDay)
        .map(([date, count]) => ({ date, count }))
        .slice(-30);

      const avgMessagesPerSession = chatSessions?.length
        ? totalMessages / chatSessions.length
        : 0;

      // Journal reflections (activity_logs where event_type contains 'reflect')
      const { count: reflectionsCount } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .ilike('event_type', '%reflect%')
        .gte('created_at', thirtyDaysAgo);

      // Insights per day
      const { data: insightsData } = await supabase
        .from('extracted_insights')
        .select('id, created_at')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });

      const insightsByDay: Record<string, number> = {};
      (insightsData || []).forEach(insight => {
        const date = new Date(insight.created_at).toISOString().split('T')[0];
        insightsByDay[date] = (insightsByDay[date] || 0) + 1;
      });
      const insightsPerDay = Object.entries(insightsByDay)
        .map(([date, count]) => ({ date, count }))
        .slice(-30);

      // Memory facts per user
      const { data: memoryData } = await supabase
        .from('ai_memory')
        .select('user_id');
      const userMemoryCounts: Record<string, number> = {};
      (memoryData || []).forEach(m => {
        userMemoryCounts[m.user_id] = (userMemoryCounts[m.user_id] || 0) + 1;
      });
      const userIds = Object.keys(userMemoryCounts);
      const avgMemoryFactsPerUser = userIds.length
        ? Object.values(userMemoryCounts).reduce((a, b) => a + b, 0) / userIds.length
        : 0;

      setAIEngagement({
        chatSessionsPerDay,
        avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
        journalReflections: reflectionsCount || 0,
        insightsPerDay,
        avgMemoryFactsPerUser: Math.round(avgMemoryFactsPerUser * 10) / 10,
      });

      // ========== 4. ERS VALIDATION ==========

      // Get users with self_reported_readiness in recovery_trajectories
      const { data: trajectories } = await supabase
        .from('recovery_trajectories')
        .select('user_id, self_reported_readiness, updated_at')
        .not('self_reported_readiness', 'is', null)
        .order('updated_at', { ascending: false });

      // Get latest ERS scores for those users
      const userIdsWithSelfReport = [...new Set((trajectories || []).map(t => t.user_id))];

      const dataPoints: { userId: string; ersScore: number; selfReported: number }[] = [];

      if (userIdsWithSelfReport.length > 0) {
        const { data: ersScores } = await supabase
          .from('ers_scores')
          .select('user_id, ers_score, calculated_at')
          .in('user_id', userIdsWithSelfReport)
          .order('calculated_at', { ascending: false });

        // Get latest ERS per user
        const latestERS: Record<string, number> = {};
        (ersScores || []).forEach(score => {
          if (!latestERS[score.user_id]) {
            latestERS[score.user_id] = score.ers_score;
          }
        });

        // Get latest self-report per user
        const latestSelfReport: Record<string, number> = {};
        (trajectories || []).forEach(t => {
          if (!latestSelfReport[t.user_id] && t.self_reported_readiness !== null) {
            latestSelfReport[t.user_id] = t.self_reported_readiness;
          }
        });

        // Build data points
        Object.keys(latestERS).forEach(userId => {
          if (latestSelfReport[userId] !== undefined) {
            dataPoints.push({
              userId,
              ersScore: latestERS[userId],
              selfReported: latestSelfReport[userId],
            });
          }
        });
      }

      // Calculate correlation direction (simple sign of covariance)
      let correlationDirection: 'positive' | 'negative' | 'none' | 'insufficient' = 'insufficient';
      if (dataPoints.length >= 10) {
        const avgERS = dataPoints.reduce((a, b) => a + b.ersScore, 0) / dataPoints.length;
        const avgSelf = dataPoints.reduce((a, b) => a + b.selfReported, 0) / dataPoints.length;

        let covariance = 0;
        dataPoints.forEach(dp => {
          covariance += (dp.ersScore - avgERS) * (dp.selfReported - avgSelf);
        });

        if (Math.abs(covariance) < 0.1) {
          correlationDirection = 'none';
        } else if (covariance > 0) {
          correlationDirection = 'positive';
        } else {
          correlationDirection = 'negative';
        }
      }

      setERSValidation({
        usersWithBoth: dataPoints.length,
        correlationDirection,
        dataPoints: dataPoints.slice(0, 20), // Show top 20
        targetDataPoints: 50,
      });

      // ========== 5. REAL USER COUNT ==========

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, is_synthetic');
      const realUsers = (profiles || []).filter(p => !p.is_synthetic).length;
      setRealUserCount(realUsers);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching AI progress data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const milestones: DataMilestone[] = [
    {
      threshold: 50,
      title: 'Basic pattern validation',
      description: 'Compare synthetic vs real patterns for accuracy',
      unlocked: realUserCount >= 50,
    },
    {
      threshold: 200,
      title: 'ERS weight optimization',
      description: 'Enough data to tune dimension weights',
      unlocked: realUserCount >= 200,
    },
    {
      threshold: 500,
      title: 'Cohort-based predictions',
      description: 'Predict recovery timeline by archetype',
      unlocked: realUserCount >= 500,
    },
    {
      threshold: 1000,
      title: 'Fine-tuning candidate',
      description: 'Enough labeled data for a specialized model',
      unlocked: realUserCount >= 1000,
    },
    {
      threshold: 5000,
      title: 'Cross-platform patterns',
      description: 'Data network effects unlock',
      unlocked: realUserCount >= 5000,
    },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-8 w-64 rounded" style={{ background: 'var(--border)' }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--border)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              AI System Health
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-warm)', color: 'var(--text-sec)' }}
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ========== SECTION 1: DATA VOLUME ========== */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200">
          <SectionHeader title="Training Data Pipeline" subtitle="Volume of data feeding the AI systems" />

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard
              label="Mood Entries"
              value={dataVolume.moodEntries.total.toLocaleString()}
              breakdown={{ real: dataVolume.moodEntries.real, synthetic: dataVolume.moodEntries.synthetic }}
            />
            <StatCard
              label="Journal Entries"
              value={dataVolume.journalEntries.total.toLocaleString()}
              breakdown={{ real: dataVolume.journalEntries.real, synthetic: dataVolume.journalEntries.synthetic }}
            />
            <StatCard
              label="Extracted Insights"
              value={dataVolume.extractedInsights.toLocaleString()}
              subtext="From journals"
            />
            <StatCard
              label="Patterns"
              value={dataVolume.discoveredPatterns.toLocaleString()}
              subtext="Discovered"
            />
            <StatCard
              label="Trajectories"
              value={dataVolume.recoveryTrajectories.toLocaleString()}
              subtext="Recovery paths"
            />
            <StatCard
              label="AI Memory"
              value={dataVolume.aiMemoryFacts.toLocaleString()}
              subtext="Facts stored"
            />
            <StatCard
              label="Chat Summaries"
              value={dataVolume.chatSessionsWithSummary.toLocaleString()}
              subtext="Sessions summarized"
            />
          </div>
        </section>

        {/* ========== SECTION 2: PATTERN QUALITY ========== */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200">
          <SectionHeader title="Pattern Discovery" subtitle="Quality and distribution of discovered patterns" />

          <div className="grid md:grid-cols-3 gap-6">
            {/* By confidence */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>By Confidence Level</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>High (&ge;70%)</span>
                  <span className="font-semibold" style={{ color: 'var(--primary)' }}>{patternQuality.byConfidence.high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Medium (40-70%)</span>
                  <span className="font-semibold" style={{ color: 'var(--calm)' }}>{patternQuality.byConfidence.medium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Low (&lt;40%)</span>
                  <span className="font-semibold" style={{ color: '#B86B64' }}>{patternQuality.byConfidence.low}</span>
                </div>
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
                Last run: {formatDate(patternQuality.lastDiscoveryRun)}
              </p>
            </div>

            {/* Top themes */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Top Pattern Themes</h4>
              {patternQuality.topThemes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No patterns yet</p>
              ) : (
                <div className="space-y-1">
                  {patternQuality.topThemes.slice(0, 5).map((theme, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                        {theme.theme.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{theme.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By recovery context */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>By Recovery Context</h4>
              {patternQuality.byRecoveryContext.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No context data yet</p>
              ) : (
                <div className="space-y-1">
                  {patternQuality.byRecoveryContext.slice(0, 5).map((ctx, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm truncate capitalize" style={{ color: 'var(--text-muted)' }}>
                        {ctx.context.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ctx.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========== SECTION 3: AI ENGAGEMENT ========== */}
        <section className="rounded-2xl p-6" style={{ background: 'var(--bg-warm)' }}>
          <SectionHeader title="AI Feature Usage" subtitle="How users interact with AI-powered features" />

          <div className="grid md:grid-cols-2 gap-6">
            {/* Chat sessions chart */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Chat Sessions (Last 30 Days)</h4>
              <MiniLineChart data={aiEngagement.chatSessionsPerDay} />
            </div>

            {/* Insights chart */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Insights Extracted (Last 30 Days)</h4>
              <MiniLineChart data={aiEngagement.insightsPerDay} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {aiEngagement.avgMessagesPerSession}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Avg msgs/session</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {aiEngagement.journalReflections}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Journal reflections</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {aiEngagement.avgMemoryFactsPerUser}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Avg facts/user</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {aiEngagement.insightsPerDay.reduce((a, b) => a + b.count, 0)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Insights (30d)</p>
            </div>
          </div>
        </section>

        {/* ========== SECTION 4: ERS VALIDATION ========== */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200">
          <SectionHeader
            title="ERS Validation"
            subtitle="Comparing calculated ERS scores with user self-reported readiness"
          />

          <div className="grid md:grid-cols-2 gap-6">
            {/* Progress toward statistical significance */}
            <div>
              <ProgressBar
                current={ersValidation.usersWithBoth}
                target={ersValidation.targetDataPoints}
                label="Data points for validation"
              />

              {ersValidation.usersWithBoth < 10 ? (
                <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-warm)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Collecting data - need {ersValidation.targetDataPoints - ersValidation.usersWithBoth} more
                    self-reports for statistical significance.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Correlation:</span>
                    <span
                      className="text-sm px-2 py-0.5 rounded-full"
                      style={{
                        background: ersValidation.correlationDirection === 'positive'
                          ? 'var(--primary-light)'
                          : ersValidation.correlationDirection === 'negative'
                            ? '#fecaca'
                            : 'var(--bg-warm)',
                        color: ersValidation.correlationDirection === 'positive'
                          ? 'var(--primary)'
                          : ersValidation.correlationDirection === 'negative'
                            ? '#B86B64'
                            : 'var(--text-muted)',
                      }}
                    >
                      {ersValidation.correlationDirection === 'positive' && 'Positive - ERS formula is working'}
                      {ersValidation.correlationDirection === 'negative' && 'Negative - ERS may need adjustment'}
                      {ersValidation.correlationDirection === 'none' && 'No correlation detected'}
                      {ersValidation.correlationDirection === 'insufficient' && 'Need more data'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Based on {ersValidation.usersWithBoth} users with both ERS scores and self-reported readiness.
                  </p>
                </div>
              )}
            </div>

            {/* Data points table */}
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Recent Comparisons
              </h4>
              {ersValidation.dataPoints.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No self-reported readiness data yet
                </p>
              ) : (
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                        <th className="text-right py-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>ERS</th>
                        <th className="text-right py-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>Self</th>
                        <th className="text-right py-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ersValidation.dataPoints.slice(0, 8).map((dp, idx) => {
                        const diff = dp.ersScore - dp.selfReported;
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-stone-50'}>
                            <td className="py-1.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                              {dp.userId.slice(0, 6)}
                            </td>
                            <td className="py-1.5 text-right" style={{ color: 'var(--text)' }}>
                              {dp.ersScore}
                            </td>
                            <td className="py-1.5 text-right" style={{ color: 'var(--text)' }}>
                              {dp.selfReported}
                            </td>
                            <td
                              className="py-1.5 text-right"
                              style={{
                                color: Math.abs(diff) <= 10 ? 'var(--primary)' : '#B86B64',
                              }}
                            >
                              {diff > 0 ? '+' : ''}{diff}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========== SECTION 5: DATA MILESTONES ========== */}
        <section className="bg-white rounded-2xl p-6 border border-stone-200">
          <SectionHeader
            title="Training Milestones"
            subtitle="Data thresholds that unlock AI capabilities"
          />

          <MilestoneTimeline milestones={milestones} currentUsers={realUserCount} />
        </section>

        {/* Quick links */}
        <div className="grid md:grid-cols-3 gap-4">
          <a
            href="/admin/patterns"
            className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-stone-300 transition-colors"
          >
            <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>Pattern Browser</h4>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Explore discovered patterns</p>
          </a>
          <a
            href="/admin/trajectories"
            className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-stone-300 transition-colors"
          >
            <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>Trajectory Viewer</h4>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Browse recovery trajectories</p>
          </a>
          <a
            href="/admin/analytics"
            className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-stone-300 transition-colors"
          >
            <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>User Analytics</h4>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>View user engagement metrics</p>
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page Export with Admin Auth
// ============================================================================

export default function AdminAIProgressPage() {
  const { isAdmin, loading } = useAdminCheck();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <AIProgressDashboard />;
}
