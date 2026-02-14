'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// ============================================================================
// Types
// ============================================================================

interface ThemeData {
  theme: string;
  count: number;
  avg_confidence: number;
}

interface TriggerData {
  trigger: string;
  count: number;
  avg_impact: number;
  effect: string;
}

interface PhaseData {
  phase: string;
  count: number;
}

interface RiskIndicator {
  id: string;
  user_id: string;
  indicator: string;
  severity: string;
  trend: string;
  created_at: string;
  confidence: number;
}

interface InsightVolume {
  source_type: string;
  insight_type: string;
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

function ExclamationTriangleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
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
// Bar Chart Component
// ============================================================================

function HorizontalBar({
  label,
  value,
  maxValue,
  color,
  subtext,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  subtext?: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {value} {subtext && `(${subtext})`}
        </span>
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
// Main Page
// ============================================================================

export default function AdminInsightsPage() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  // Data states
  const [totalInsights, setTotalInsights] = useState(0);
  const [weeklyInsights, setWeeklyInsights] = useState(0);
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [triggers, setTriggers] = useState<TriggerData[]>([]);
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [riskIndicators, setRiskIndicators] = useState<RiskIndicator[]>([]);
  const [volumeBySource, setVolumeBySource] = useState<InsightVolume[]>([]);
  const [volumeByType, setVolumeByType] = useState<InsightVolume[]>([]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    try {
      // Get date for "this week" filter
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString();

      // Fetch total insights count
      const { count: total } = await supabase
        .from('extracted_insights')
        .select('*', { count: 'exact', head: true });
      setTotalInsights(total || 0);

      // Fetch weekly insights count
      const { count: weekly } = await supabase
        .from('extracted_insights')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgoStr);
      setWeeklyInsights(weekly || 0);

      // Fetch top emotional themes
      const { data: themesData } = await supabase
        .from('extracted_insights')
        .select('content, confidence')
        .eq('insight_type', 'emotional_theme');

      if (themesData) {
        const themeMap = new Map<string, { count: number; totalConfidence: number }>();
        themesData.forEach(row => {
          const theme = (row.content as { theme?: string })?.theme || 'unknown';
          const existing = themeMap.get(theme) || { count: 0, totalConfidence: 0 };
          themeMap.set(theme, {
            count: existing.count + 1,
            totalConfidence: existing.totalConfidence + (row.confidence || 0.5),
          });
        });
        const themesArray: ThemeData[] = Array.from(themeMap.entries())
          .map(([theme, data]) => ({
            theme,
            count: data.count,
            avg_confidence: data.totalConfidence / data.count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setThemes(themesArray);
      }

      // Fetch common triggers
      const { data: triggersData } = await supabase
        .from('extracted_insights')
        .select('content, confidence')
        .eq('insight_type', 'trigger_correlation');

      if (triggersData) {
        const triggerMap = new Map<string, { count: number; totalImpact: number; effect: string }>();
        triggersData.forEach(row => {
          const content = row.content as { trigger?: string; mood_impact?: number; effect?: string };
          const trigger = content?.trigger || 'unknown';
          const existing = triggerMap.get(trigger) || { count: 0, totalImpact: 0, effect: 'neutral' };
          triggerMap.set(trigger, {
            count: existing.count + 1,
            totalImpact: existing.totalImpact + (content?.mood_impact || 0),
            effect: content?.effect || existing.effect,
          });
        });
        const triggersArray: TriggerData[] = Array.from(triggerMap.entries())
          .map(([trigger, data]) => ({
            trigger,
            count: data.count,
            avg_impact: data.totalImpact / data.count,
            effect: data.effect,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTriggers(triggersArray);
      }

      // Fetch recovery phase distribution
      const { data: phasesData } = await supabase
        .from('extracted_insights')
        .select('content')
        .eq('insight_type', 'recovery_phase');

      if (phasesData) {
        const phaseMap = new Map<string, number>();
        phasesData.forEach(row => {
          const phase = (row.content as { phase?: string })?.phase || 'unknown';
          phaseMap.set(phase, (phaseMap.get(phase) || 0) + 1);
        });
        const phasesArray: PhaseData[] = Array.from(phaseMap.entries())
          .map(([phase, count]) => ({ phase, count }))
          .sort((a, b) => b.count - a.count);
        setPhases(phasesArray);
      }

      // Fetch risk indicators (high severity)
      const { data: risksData } = await supabase
        .from('extracted_insights')
        .select('id, user_id, content, confidence, created_at')
        .eq('insight_type', 'risk_indicator')
        .order('created_at', { ascending: false })
        .limit(20);

      if (risksData) {
        const risks: RiskIndicator[] = risksData
          .map(row => {
            const content = row.content as { indicator?: string; severity?: string; trend?: string };
            return {
              id: row.id,
              user_id: row.user_id,
              indicator: content?.indicator || 'Unknown',
              severity: content?.severity || 'low',
              trend: content?.trend || 'stable',
              created_at: row.created_at,
              confidence: row.confidence || 0.5,
            };
          })
          .filter(r => r.severity === 'high' || r.severity === 'moderate')
          .sort((a, b) => {
            const severityOrder = { high: 0, moderate: 1, low: 2 };
            return (severityOrder[a.severity as keyof typeof severityOrder] || 2) -
                   (severityOrder[b.severity as keyof typeof severityOrder] || 2);
          });
        setRiskIndicators(risks);
      }

      // Fetch volume by source type
      const { data: sourceData } = await supabase
        .from('extracted_insights')
        .select('source_type');

      if (sourceData) {
        const sourceMap = new Map<string, number>();
        sourceData.forEach(row => {
          sourceMap.set(row.source_type, (sourceMap.get(row.source_type) || 0) + 1);
        });
        const sourceArray: InsightVolume[] = Array.from(sourceMap.entries())
          .map(([source_type, count]) => ({ source_type, insight_type: '', count }))
          .sort((a, b) => b.count - a.count);
        setVolumeBySource(sourceArray);
      }

      // Fetch volume by insight type
      const { data: typeData } = await supabase
        .from('extracted_insights')
        .select('insight_type');

      if (typeData) {
        const typeMap = new Map<string, number>();
        typeData.forEach(row => {
          typeMap.set(row.insight_type, (typeMap.get(row.insight_type) || 0) + 1);
        });
        const typeArray: InsightVolume[] = Array.from(typeMap.entries())
          .map(([insight_type, count]) => ({ source_type: '', insight_type, count }))
          .sort((a, b) => b.count - a.count);
        setVolumeByType(typeArray);
      }
    } catch (error) {
      console.error('Error fetching insights data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format user ID for anonymization (show first 4 chars)
  const anonymizeUserId = (userId: string) => userId.substring(0, 4) + '...';

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#B86B64';
      case 'moderate': return '#D4973B';
      default: return 'var(--text-muted)';
    }
  };

  // Get trend indicator
  const getTrendIndicator = (trend: string) => {
    switch (trend) {
      case 'worsening': return '↑';
      case 'improving': return '↓';
      default: return '→';
    }
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
              Extracted Insights
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Structured data extracted from AI interactions
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Insights" value={totalInsights.toLocaleString()} highlight="lavender" />
              <StatCard label="This Week" value={weeklyInsights.toLocaleString()} subtext="insights extracted" />
              <StatCard label="Unique Themes" value={themes.length} />
              <StatCard label="Risk Alerts" value={riskIndicators.length} highlight={riskIndicators.length > 0 ? 'rose' : undefined} />
            </div>

            {/* Risk Indicators Section */}
            {riskIndicators.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-stone-200 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <ExclamationTriangleIcon className="w-5 h-5" style={{ color: '#B86B64' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                    Risk Indicators
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    Requires attention
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                        <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                        <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Indicator</th>
                        <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Severity</th>
                        <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Trend</th>
                        <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Confidence</th>
                        <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskIndicators.map(risk => (
                        <tr key={risk.id} className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                          <td className="py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                            {anonymizeUserId(risk.user_id)}
                          </td>
                          <td className="py-3" style={{ color: 'var(--text)' }}>{risk.indicator}</td>
                          <td className="py-3">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: risk.severity === 'high' ? 'rgba(184,107,100,0.15)' : 'rgba(212,151,59,0.15)',
                                color: getSeverityColor(risk.severity),
                              }}
                            >
                              {risk.severity}
                            </span>
                          </td>
                          <td className="py-3" style={{ color: 'var(--text)' }}>
                            {getTrendIndicator(risk.trend)} {risk.trend}
                          </td>
                          <td className="py-3" style={{ color: 'var(--text-muted)' }}>
                            {(risk.confidence * 100).toFixed(0)}%
                          </td>
                          <td className="py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDate(risk.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Top Emotional Themes */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <div className="flex items-center gap-2 mb-4">
                  <SparklesIcon className="w-5 h-5" style={{ color: '#7E71B5' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                    Top Emotional Themes
                  </h2>
                </div>
                {themes.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No themes extracted yet
                  </p>
                ) : (
                  <div>
                    {themes.map(theme => (
                      <HorizontalBar
                        key={theme.theme}
                        label={theme.theme}
                        value={theme.count}
                        maxValue={themes[0]?.count || 1}
                        color="#7E71B5"
                        subtext={`${(theme.avg_confidence * 100).toFixed(0)}% conf`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Common Triggers */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  Common Triggers
                </h2>
                {triggers.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No triggers identified yet
                  </p>
                ) : (
                  <div>
                    {triggers.map(trigger => (
                      <HorizontalBar
                        key={trigger.trigger}
                        label={trigger.trigger}
                        value={trigger.count}
                        maxValue={triggers[0]?.count || 1}
                        color={trigger.effect === 'negative' ? '#B86B64' : trigger.effect === 'positive' ? '#5B8A72' : '#D4973B'}
                        subtext={`${trigger.avg_impact > 0 ? '+' : ''}${trigger.avg_impact.toFixed(1)} impact`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Recovery Phase Distribution */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  Recovery Phase Distribution
                </h2>
                {phases.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No phase data yet
                  </p>
                ) : (
                  <div>
                    {phases.map(phase => {
                      const phaseColors: Record<string, string> = {
                        denial: '#5E8DB0',
                        anger: '#B86B64',
                        bargaining: '#D4973B',
                        depression: '#7E71B5',
                        acceptance: '#5B8A72',
                        growth: '#5B8A72',
                      };
                      return (
                        <HorizontalBar
                          key={phase.phase}
                          label={phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1)}
                          value={phase.count}
                          maxValue={phases[0]?.count || 1}
                          color={phaseColors[phase.phase] || 'var(--text-muted)'}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Insight Volume */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  Insight Volume
                </h2>
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    By Source
                  </h3>
                  {volumeBySource.length === 0 ? (
                    <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>No data</p>
                  ) : (
                    volumeBySource.map(item => (
                      <HorizontalBar
                        key={item.source_type}
                        label={item.source_type.replace('_', ' ')}
                        value={item.count}
                        maxValue={volumeBySource[0]?.count || 1}
                        color="#5E8DB0"
                      />
                    ))
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    By Type
                  </h3>
                  {volumeByType.length === 0 ? (
                    <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>No data</p>
                  ) : (
                    volumeByType.map(item => (
                      <HorizontalBar
                        key={item.insight_type}
                        label={item.insight_type.replace('_', ' ')}
                        value={item.count}
                        maxValue={volumeByType[0]?.count || 1}
                        color="#D4973B"
                      />
                    ))
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
