'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// ============================================================================
// Types
// ============================================================================

interface Pattern {
  id: string;
  user_id: string | null;
  scope: string;
  pattern_type: string;
  pattern_description: string;
  evidence: string | null;
  confidence: number;
  actionable_insight: string | null;
  created_at: string;
}

interface PatternTypeCount {
  type: string;
  count: number;
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

function SparklesIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function PlayIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
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
// Horizontal Bar Component
// ============================================================================

function HorizontalBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{value}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--border-light)' }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Pattern Card Component
// ============================================================================

function PatternCard({ pattern }: { pattern: Pattern }) {
  const typeColors: Record<string, { bg: string; text: string }> = {
    trigger_effect: { bg: 'rgba(184,107,100,0.1)', text: '#B86B64' },
    habit_impact: { bg: 'rgba(91,138,114,0.1)', text: '#5B8A72' },
    temporal_cycle: { bg: 'rgba(94,141,176,0.1)', text: '#5E8DB0' },
    progress_marker: { bg: 'rgba(212,151,59,0.1)', text: '#D4973B' },
    risk_signal: { bg: 'rgba(184,107,100,0.15)', text: '#B86B64' },
  };
  const typeLabels: Record<string, string> = {
    trigger_effect: 'Trigger Effect',
    habit_impact: 'Habit Impact',
    temporal_cycle: 'Temporal Cycle',
    progress_marker: 'Progress Marker',
    risk_signal: 'Risk Signal',
  };

  const colors = typeColors[pattern.pattern_type] || { bg: 'var(--bg-warm)', text: 'var(--text-muted)' };
  const confidenceColor = pattern.confidence >= 0.7 ? '#5B8A72' : pattern.confidence >= 0.5 ? '#D4973B' : 'var(--text-muted)';

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: colors.bg, color: colors.text }}
          >
            {typeLabels[pattern.pattern_type] || pattern.pattern_type}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: pattern.scope === 'aggregate' ? 'rgba(126,113,181,0.1)' : 'var(--bg-warm)',
              color: pattern.scope === 'aggregate' ? '#7E71B5' : 'var(--text-muted)',
            }}
          >
            {pattern.scope}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${pattern.confidence * 100}%`, background: confidenceColor }}
            />
          </div>
          <span className="text-[11px] font-medium" style={{ color: confidenceColor }}>
            {Math.round(pattern.confidence * 100)}%
          </span>
        </div>
      </div>
      <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
        {pattern.pattern_description}
      </p>
      {pattern.evidence && (
        <p className="text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
          Evidence: {pattern.evidence}
        </p>
      )}
      {pattern.actionable_insight && (
        <p className="text-[13px]" style={{ color: 'var(--text-sec)' }}>
          {pattern.actionable_insight}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AdminPatternsPage() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<string | null>(null);

  // Data states
  const [totalPatterns, setTotalPatterns] = useState(0);
  const [aggregatePatterns, setAggregatePatterns] = useState<Pattern[]>([]);
  const [topPatterns, setTopPatterns] = useState<Pattern[]>([]);
  const [usersWithPatterns, setUsersWithPatterns] = useState(0);
  const [patternTypeCounts, setPatternTypeCounts] = useState<PatternTypeCount[]>([]);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    try {
      // Fetch all patterns
      const { data: patterns, count } = await supabase
        .from('discovered_patterns')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      setTotalPatterns(count || 0);

      if (patterns && patterns.length > 0) {
        // Aggregate patterns
        const aggregate = patterns.filter(p => p.scope === 'aggregate');
        setAggregatePatterns(aggregate);

        // Top patterns by confidence
        const sorted = [...patterns].sort((a, b) => b.confidence - a.confidence);
        setTopPatterns(sorted.slice(0, 10));

        // Unique users with patterns
        const uniqueUsers = new Set(patterns.filter(p => p.user_id).map(p => p.user_id));
        setUsersWithPatterns(uniqueUsers.size);

        // Pattern type distribution
        const typeCounts = new Map<string, number>();
        patterns.forEach(p => {
          typeCounts.set(p.pattern_type, (typeCounts.get(p.pattern_type) || 0) + 1);
        });
        const typeArray = Array.from(typeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
        setPatternTypeCounts(typeArray);

        // Last run timestamp
        const mostRecent = patterns[0]?.created_at;
        setLastRunTimestamp(mostRecent || null);
      }
    } catch (error) {
      console.error('Error fetching pattern data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run discovery
  const handleRunDiscovery = async () => {
    setRunningDiscovery(true);
    setDiscoveryResult(null);

    try {
      const response = await fetch('/api/cron/discover-patterns', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setDiscoveryResult(`Discovery complete: ${data.individualAnalyzed} users analyzed, ${data.patternsFound} patterns found. Aggregate: ${data.aggregateRun ? 'Yes' : 'No'}`);
        // Refresh data
        await fetchData();
      } else {
        setDiscoveryResult(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setDiscoveryResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunningDiscovery(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Type colors
  const typeColors: Record<string, string> = {
    trigger_effect: '#B86B64',
    habit_impact: '#5B8A72',
    temporal_cycle: '#5E8DB0',
    progress_marker: '#D4973B',
    risk_signal: '#B86B64',
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
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
                Pattern Discovery
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                AI-discovered behavioral correlations
              </p>
            </div>
          </div>

          {/* Run Discovery Button */}
          <button
            onClick={handleRunDiscovery}
            disabled={runningDiscovery}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {runningDiscovery ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            {runningDiscovery ? 'Running...' : 'Run Discovery'}
          </button>
        </div>

        {/* Discovery Result */}
        {discoveryResult && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm"
            style={{
              background: discoveryResult.startsWith('Error') ? 'rgba(184,107,100,0.1)' : 'rgba(91,138,114,0.1)',
              color: discoveryResult.startsWith('Error') ? '#B86B64' : 'var(--primary)',
            }}
          >
            {discoveryResult}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
          </div>
        ) : totalPatterns === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center">
            <SparklesIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
              No patterns discovered yet
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Run pattern discovery to analyze user trajectories and find behavioral correlations.
            </p>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Patterns"
                value={totalPatterns}
                highlight="lavender"
              />
              <StatCard
                label="Aggregate Patterns"
                value={aggregatePatterns.length}
                subtext="Cross-user insights"
              />
              <StatCard
                label="Users with Patterns"
                value={usersWithPatterns}
              />
              <StatCard
                label="Last Run"
                value={formatDate(lastRunTimestamp).split(',')[0]}
                subtext={formatDate(lastRunTimestamp).split(',')[1]?.trim()}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Aggregate Patterns */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <div className="flex items-center gap-2 mb-4">
                  <SparklesIcon className="w-5 h-5" style={{ color: '#7E71B5' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                    Aggregate Patterns
                  </h2>
                </div>
                {aggregatePatterns.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No aggregate patterns yet. Need 10+ users with data.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {aggregatePatterns.slice(0, 5).map(pattern => (
                      <PatternCard key={pattern.id} pattern={pattern} />
                    ))}
                  </div>
                )}
              </div>

              {/* Pattern Type Distribution */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  Pattern Types
                </h2>
                {patternTypeCounts.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No patterns yet
                  </p>
                ) : (
                  <div>
                    {patternTypeCounts.map(({ type, count }) => (
                      <HorizontalBar
                        key={type}
                        label={type.replace('_', ' ')}
                        value={count}
                        maxValue={patternTypeCounts[0]?.count || 1}
                        color={typeColors[type] || 'var(--text-muted)'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Patterns by Confidence */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                Top Patterns by Confidence
              </h2>
              {topPatterns.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No patterns yet
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {topPatterns.map(pattern => (
                    <PatternCard key={pattern.id} pattern={pattern} />
                  ))}
                </div>
              )}
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
