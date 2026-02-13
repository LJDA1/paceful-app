'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

// ============================================================================
// Admin Email Check
// ============================================================================

const ADMIN_EMAILS = ['lewisjohnson004@gmail.com'];

// ============================================================================
// Types
// ============================================================================

interface KeyMetrics {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
}

interface RetentionData {
  d1: number;
  d7: number;
  d30: number;
  curve: { day: number; percent: number }[];
}

interface FeatureAdoption {
  feature: string;
  users: number;
  percentOfMAU: number;
}

interface EngagementDepth {
  avgMoodsPerUserPerWeek: number;
  avgJournalsPerUserPerWeek: number;
  avgWordsPerJournal: number;
  avgSessionsPerUserPerWeek: number;
  mostActiveHour: number;
  mostActiveDay: string;
}

interface UserJourney {
  signedUp: number;
  completedOnboarding: number;
  loggedFirstMood: number;
  wroteFirstJournal: number;
  returnedDay7: number;
  stillActive30: number;
}

interface ERSDistribution {
  healing: number;
  rebuilding: number;
  ready: number;
}

interface ActivityLog {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
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
  highlight?: 'green' | 'amber' | 'rose';
}) {
  const highlightColors = {
    green: 'var(--primary)',
    amber: '#D4973B',
    rose: '#B86B64',
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
      {subtext && <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{subtext}</p>}
    </div>
  );
}

// ============================================================================
// Retention Card
// ============================================================================

function RetentionCard({ label, value }: { label: string; value: number }) {
  const color = value >= 50 ? 'green' : value >= 25 ? 'amber' : 'rose';
  const colorMap = {
    green: 'var(--primary)',
    amber: '#D4973B',
    rose: '#B86B64',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200 text-center">
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p
        className="text-4xl font-bold"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: colorMap[color] }}
      >
        {value}%
      </p>
    </div>
  );
}

// ============================================================================
// Retention Curve Chart
// ============================================================================

function RetentionCurve({ data }: { data: { day: number; percent: number }[] }) {
  if (data.length === 0) return null;

  const width = 400;
  const height = 150;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxDay = Math.max(...data.map(d => d.day), 30);
  const xScale = (day: number) => (day / maxDay) * chartWidth + padding.left;
  const yScale = (percent: number) => chartHeight - (percent / 100) * chartHeight + padding.top;

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.day)} ${yScale(d.percent)}`)
    .join(' ');

  const areaD = pathD + ` L ${xScale(data[data.length - 1].day)} ${yScale(0)} L ${xScale(data[0].day)} ${yScale(0)} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(y => (
        <g key={y}>
          <line
            x1={padding.left}
            y1={yScale(y)}
            x2={width - padding.right}
            y2={yScale(y)}
            stroke="var(--border-light)"
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 8}
            y={yScale(y) + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--text-muted)"
          >
            {y}%
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {[1, 7, 14, 30].map(day => (
        <text
          key={day}
          x={xScale(day)}
          y={height - 8}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-muted)"
        >
          D{day}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="rgba(91,138,114,0.15)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(d.day)} cy={yScale(d.percent)} r="4" fill="var(--primary)" />
      ))}
    </svg>
  );
}

// ============================================================================
// Feature Adoption Bar
// ============================================================================

function FeatureAdoptionBar({ features }: { features: FeatureAdoption[] }) {
  const maxPercent = Math.max(...features.map(f => f.percentOfMAU), 1);

  return (
    <div className="space-y-4">
      {features.map((feature) => (
        <div key={feature.feature}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {feature.feature}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {feature.users} users ({feature.percentOfMAU}%)
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(feature.percentOfMAU / maxPercent) * 100}%`,
                background: 'linear-gradient(90deg, var(--primary-light) 0%, var(--primary) 100%)',
                minWidth: feature.percentOfMAU > 0 ? '8px' : '0',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// User Journey Funnel
// ============================================================================

function UserJourneyFunnel({ journey }: { journey: UserJourney }) {
  const steps = [
    { label: 'Signed up', value: journey.signedUp, color: '#5E8DB0' },
    { label: 'Completed onboarding', value: journey.completedOnboarding, color: '#7E71B5' },
    { label: 'Logged first mood', value: journey.loggedFirstMood, color: '#D4973B' },
    { label: 'Wrote first journal', value: journey.wroteFirstJournal, color: '#B86B64' },
    { label: 'Returned day 7', value: journey.returnedDay7, color: '#7BA896' },
    { label: 'Still active (30d)', value: journey.stillActive30, color: '#5B8A72' },
  ];

  const maxValue = Math.max(journey.signedUp, 1);

  const calcDropoff = (current: number, previous: number) => {
    if (previous === 0) return null;
    return Math.round((current / previous) * 100);
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const widthPct = Math.max((step.value / maxValue) * 100, 8);
        const prevValue = idx > 0 ? steps[idx - 1].value : step.value;
        const convRate = idx > 0 ? calcDropoff(step.value, prevValue) : null;

        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                {step.label}
              </span>
              <div className="flex items-center gap-2">
                {convRate !== null && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-warm)', color: 'var(--text-muted)' }}
                  >
                    {convRate}%
                  </span>
                )}
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {step.value}
                </span>
              </div>
            </div>
            <div
              className="h-6 rounded-lg transition-all duration-500 mx-auto"
              style={{
                width: `${widthPct}%`,
                background: step.color,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// ERS Distribution Bar
// ============================================================================

function ERSDistributionBar({ distribution }: { distribution: ERSDistribution }) {
  const total = distribution.healing + distribution.rebuilding + distribution.ready;
  const healingPct = total > 0 ? (distribution.healing / total) * 100 : 0;
  const rebuildingPct = total > 0 ? (distribution.rebuilding / total) * 100 : 0;
  const readyPct = total > 0 ? (distribution.ready / total) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200">
      <h3
        className="font-semibold mb-4"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        ERS Distribution
      </h3>

      {total === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No ERS data available</p>
      ) : (
        <>
          <div className="h-6 rounded-lg overflow-hidden flex mb-4">
            <div className="transition-all" style={{ width: `${healingPct}%`, background: '#7E71B5' }} />
            <div className="transition-all" style={{ width: `${rebuildingPct}%`, background: 'var(--calm)' }} />
            <div className="transition-all" style={{ width: `${readyPct}%`, background: 'var(--primary)' }} />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: '#7E71B5' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{healingPct.toFixed(0)}%</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Healing ({distribution.healing})</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--calm)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{rebuildingPct.toFixed(0)}%</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rebuilding ({distribution.rebuilding})</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--primary)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{readyPct.toFixed(0)}%</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ready ({distribution.ready})</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Activity Feed
// ============================================================================

function ActivityFeed({ activities }: { activities: ActivityLog[] }) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const anonymizeId = (id: string) => id.slice(0, 6);

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200">
      <h3
        className="font-semibold mb-4"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        Recent Activity
      </h3>

      {activities.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent activity</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Event</th>
                <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                <th className="text-right py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.slice(0, 10).map((activity, idx) => (
                <tr
                  key={activity.id}
                  className={idx % 2 === 0 ? '' : 'bg-stone-50'}
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                >
                  <td className="py-2" style={{ color: 'var(--text)' }}>
                    {activity.event_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {anonymizeId(activity.user_id)}
                  </td>
                  <td className="py-2 text-right" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(activity.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Dashboard
// ============================================================================

function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasEnoughData, setHasEnoughData] = useState(true);

  const [keyMetrics, setKeyMetrics] = useState<KeyMetrics>({
    totalUsers: 0,
    dau: 0,
    wau: 0,
    mau: 0,
  });

  const [retention, setRetention] = useState<RetentionData>({
    d1: 0,
    d7: 0,
    d30: 0,
    curve: [],
  });

  const [featureAdoption, setFeatureAdoption] = useState<FeatureAdoption[]>([]);

  const [engagement, setEngagement] = useState<EngagementDepth>({
    avgMoodsPerUserPerWeek: 0,
    avgJournalsPerUserPerWeek: 0,
    avgWordsPerJournal: 0,
    avgSessionsPerUserPerWeek: 0,
    mostActiveHour: 12,
    mostActiveDay: 'Monday',
  });

  const [userJourney, setUserJourney] = useState<UserJourney>({
    signedUp: 0,
    completedOnboarding: 0,
    loggedFirstMood: 0,
    wroteFirstJournal: 0,
    returnedDay7: 0,
    stillActive30: 0,
  });

  const [ersDistribution, setErsDistribution] = useState<ERSDistribution>({
    healing: 0,
    rebuilding: 0,
    ready: 0,
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // ========== 1. KEY METRICS ==========
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Check if we have enough data
      if ((totalUsers || 0) < 5) {
        setHasEnoughData(false);
        setKeyMetrics({ totalUsers: totalUsers || 0, dau: 0, wau: 0, mau: 0 });
        setLoading(false);
        return;
      }
      setHasEnoughData(true);

      // DAU
      const { data: dauData } = await supabase
        .from('activity_logs')
        .select('user_id')
        .gte('created_at', todayStart);
      const dau = new Set((dauData || []).map(a => a.user_id)).size;

      // WAU
      const { data: wauData } = await supabase
        .from('activity_logs')
        .select('user_id, created_at')
        .gte('created_at', sevenDaysAgo);
      const wau = new Set((wauData || []).map(a => a.user_id)).size;

      // MAU
      const { data: mauData } = await supabase
        .from('activity_logs')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo);
      const mau = new Set((mauData || []).map(a => a.user_id)).size;

      setKeyMetrics({ totalUsers: totalUsers || 0, dau, wau, mau });

      // ========== 2. RETENTION ==========
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, created_at, onboarding_completed');

      const { data: allActivityLogs } = await supabase
        .from('activity_logs')
        .select('user_id, created_at');

      // Build activity map: user_id -> set of dates (YYYY-MM-DD)
      const userActivityDates = new Map<string, Set<string>>();
      (allActivityLogs || []).forEach(log => {
        const dateStr = new Date(log.created_at).toISOString().split('T')[0];
        if (!userActivityDates.has(log.user_id)) {
          userActivityDates.set(log.user_id, new Set());
        }
        userActivityDates.get(log.user_id)!.add(dateStr);
      });

      // Calculate retention
      let d1Count = 0, d7Count = 0, d30Count = 0;
      const eligibleD1 = (profiles || []).filter(p => {
        const signupDate = new Date(p.created_at);
        return Date.now() - signupDate.getTime() >= 1 * 24 * 60 * 60 * 1000;
      });
      const eligibleD7 = (profiles || []).filter(p => {
        const signupDate = new Date(p.created_at);
        return Date.now() - signupDate.getTime() >= 7 * 24 * 60 * 60 * 1000;
      });
      const eligibleD30 = (profiles || []).filter(p => {
        const signupDate = new Date(p.created_at);
        return Date.now() - signupDate.getTime() >= 30 * 24 * 60 * 60 * 1000;
      });

      eligibleD1.forEach(p => {
        const signupDate = new Date(p.created_at);
        const nextDay = new Date(signupDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        if (userActivityDates.get(p.user_id)?.has(nextDayStr)) {
          d1Count++;
        }
      });

      eligibleD7.forEach(p => {
        const signupDate = new Date(p.created_at);
        const day7 = new Date(signupDate);
        day7.setDate(day7.getDate() + 7);
        const day7Str = day7.toISOString().split('T')[0];
        if (userActivityDates.get(p.user_id)?.has(day7Str)) {
          d7Count++;
        }
      });

      eligibleD30.forEach(p => {
        const signupDate = new Date(p.created_at);
        const day30 = new Date(signupDate);
        day30.setDate(day30.getDate() + 30);
        const day30Str = day30.toISOString().split('T')[0];
        if (userActivityDates.get(p.user_id)?.has(day30Str)) {
          d30Count++;
        }
      });

      const d1Pct = eligibleD1.length > 0 ? Math.round((d1Count / eligibleD1.length) * 100) : 0;
      const d7Pct = eligibleD7.length > 0 ? Math.round((d7Count / eligibleD7.length) * 100) : 0;
      const d30Pct = eligibleD30.length > 0 ? Math.round((d30Count / eligibleD30.length) * 100) : 0;

      // Retention curve
      const curveDays = [1, 3, 7, 14, 30];
      const curve = curveDays.map(day => {
        const eligible = (profiles || []).filter(p => {
          const signupDate = new Date(p.created_at);
          return Date.now() - signupDate.getTime() >= day * 24 * 60 * 60 * 1000;
        });
        let retained = 0;
        eligible.forEach(p => {
          const signupDate = new Date(p.created_at);
          const targetDay = new Date(signupDate);
          targetDay.setDate(targetDay.getDate() + day);
          const targetDayStr = targetDay.toISOString().split('T')[0];
          if (userActivityDates.get(p.user_id)?.has(targetDayStr)) {
            retained++;
          }
        });
        return { day, percent: eligible.length > 0 ? Math.round((retained / eligible.length) * 100) : 0 };
      });

      setRetention({ d1: d1Pct, d7: d7Pct, d30: d30Pct, curve });

      // ========== 3. FEATURE ADOPTION ==========
      const featureEvents = [
        { event: 'mood_logged', label: 'Mood logging' },
        { event: 'journal_saved', label: 'Journaling' },
        { event: 'exercise_completed', label: 'Exercises' },
        { event: 'ers_recalculated', label: 'ERS recalculation' },
        { event: 'page_view', label: 'Predictions viewed' },
      ];

      const featureData: FeatureAdoption[] = [];
      for (const f of featureEvents) {
        const { data: eventData } = await supabase
          .from('activity_logs')
          .select('user_id')
          .eq('event_type', f.event)
          .gte('created_at', thirtyDaysAgo);

        const uniqueUsers = new Set((eventData || []).map(e => e.user_id)).size;
        const percentOfMAU = mau > 0 ? Math.round((uniqueUsers / mau) * 100) : 0;
        featureData.push({ feature: f.label, users: uniqueUsers, percentOfMAU });
      }

      featureData.sort((a, b) => b.percentOfMAU - a.percentOfMAU);
      setFeatureAdoption(featureData);

      // ========== 4. ENGAGEMENT DEPTH ==========
      const { data: moodData } = await supabase
        .from('mood_entries')
        .select('user_id, logged_at')
        .gte('logged_at', sevenDaysAgo);

      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('user_id, created_at, word_count')
        .gte('created_at', sevenDaysAgo)
        .is('deleted_at', null);

      const moodUsers = new Set((moodData || []).map(m => m.user_id)).size || 1;
      const journalUsers = new Set((journalData || []).map(j => j.user_id)).size || 1;
      const avgMoodsPerUserPerWeek = (moodData?.length || 0) / moodUsers;
      const avgJournalsPerUserPerWeek = (journalData?.length || 0) / journalUsers;

      const totalWords = (journalData || []).reduce((sum, j) => sum + (j.word_count || 0), 0);
      const avgWordsPerJournal = journalData?.length ? totalWords / journalData.length : 0;

      // Sessions per user
      const sessionUsers = new Set((wauData || []).map(a => a.user_id)).size || 1;
      const avgSessionsPerUserPerWeek = (wauData?.length || 0) / sessionUsers;

      // Most active hour
      const hourCounts: Record<number, number> = {};
      (wauData || []).forEach(a => {
        const hour = new Date(a.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      let mostActiveHour = 12;
      let maxHourCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxHourCount) {
          maxHourCount = count;
          mostActiveHour = parseInt(hour);
        }
      });

      // Most active day
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayCounts: Record<number, number> = {};
      (wauData || []).forEach(a => {
        const day = new Date(a.created_at).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      let mostActiveDay = 'Monday';
      let maxDayCount = 0;
      Object.entries(dayCounts).forEach(([day, count]) => {
        if (count > maxDayCount) {
          maxDayCount = count;
          mostActiveDay = dayNames[parseInt(day)];
        }
      });

      setEngagement({
        avgMoodsPerUserPerWeek: Math.round(avgMoodsPerUserPerWeek * 10) / 10,
        avgJournalsPerUserPerWeek: Math.round(avgJournalsPerUserPerWeek * 10) / 10,
        avgWordsPerJournal: Math.round(avgWordsPerJournal),
        avgSessionsPerUserPerWeek: Math.round(avgSessionsPerUserPerWeek * 10) / 10,
        mostActiveHour,
        mostActiveDay,
      });

      // ========== 5. USER JOURNEY FUNNEL ==========
      const completedOnboarding = (profiles || []).filter(p => p.onboarding_completed).length;

      const { data: moodUsers2 } = await supabase
        .from('mood_entries')
        .select('user_id');
      const loggedFirstMood = new Set((moodUsers2 || []).map(m => m.user_id)).size;

      const { data: journalUsers2 } = await supabase
        .from('journal_entries')
        .select('user_id')
        .is('deleted_at', null);
      const wroteFirstJournal = new Set((journalUsers2 || []).map(j => j.user_id)).size;

      setUserJourney({
        signedUp: totalUsers || 0,
        completedOnboarding,
        loggedFirstMood,
        wroteFirstJournal,
        returnedDay7: d7Count,
        stillActive30: d30Count,
      });

      // ========== 6. ERS Distribution ==========
      const { data: ersScores } = await supabase
        .from('ers_scores')
        .select('user_id, ers_stage')
        .order('calculated_at', { ascending: false });

      const latestByUser = new Map<string, string>();
      (ersScores || []).forEach(score => {
        if (!latestByUser.has(score.user_id)) {
          latestByUser.set(score.user_id, score.ers_stage);
        }
      });

      const distribution = { healing: 0, rebuilding: 0, ready: 0 };
      latestByUser.forEach(stage => {
        if (stage in distribution) {
          distribution[stage as keyof typeof distribution]++;
        }
      });
      setErsDistribution(distribution);

      // ========== 7. Recent Activity ==========
      const { data: recentActivity } = await supabase
        .from('activity_logs')
        .select('id, user_id, event_type, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      setActivities(recentActivity || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-8 w-48 rounded" style={{ background: 'var(--border)' }} />
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Admin Analytics
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

        {/* Low Data Warning */}
        {!hasEnoughData && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Gathering data
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Metrics will populate as users join. Currently {keyMetrics.totalUsers} users registered.
            </p>
          </div>
        )}

        {hasEnoughData && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={keyMetrics.totalUsers} subtext="Registered accounts" />
              <StatCard label="DAU" value={keyMetrics.dau} subtext="Daily active" />
              <StatCard label="WAU" value={keyMetrics.wau} subtext="Weekly active" />
              <StatCard label="MAU" value={keyMetrics.mau} subtext="Monthly active" />
            </div>

            {/* Retention Section */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200">
              <h2
                className="text-xl font-semibold mb-6"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                Retention
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Retention metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <RetentionCard label="D1" value={retention.d1} />
                  <RetentionCard label="D7" value={retention.d7} />
                  <RetentionCard label="D30" value={retention.d30} />
                </div>

                {/* Retention curve */}
                <div className="flex items-center justify-center">
                  <RetentionCurve data={retention.curve} />
                </div>
              </div>
            </div>

            {/* Feature Adoption */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200">
              <h2
                className="text-xl font-semibold mb-6"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                Feature Adoption
              </h2>
              <FeatureAdoptionBar features={featureAdoption} />
            </div>

            {/* Engagement Depth */}
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-warm)' }}>
              <h2
                className="text-xl font-semibold mb-6"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                Engagement Depth
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                    {engagement.avgMoodsPerUserPerWeek}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Moods/user/week</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                    {engagement.avgJournalsPerUserPerWeek}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Journals/user/week</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                    {engagement.avgWordsPerJournal}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Words/journal</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                    {engagement.avgSessionsPerUserPerWeek}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sessions/user/week</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                    {formatHour(engagement.mostActiveHour)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Peak hour</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                    {engagement.mostActiveDay.slice(0, 3)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Peak day</p>
                </div>
              </div>
            </div>

            {/* User Journey Funnel */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200">
              <h2
                className="text-xl font-semibold mb-6"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                User Journey
              </h2>
              <UserJourneyFunnel journey={userJourney} />
            </div>

            {/* ERS Distribution */}
            <ERSDistributionBar distribution={ersDistribution} />

            {/* Activity Feed */}
            <ActivityFeed activities={activities} />

            {/* Quick Links */}
            <div className="grid md:grid-cols-3 gap-4">
              <a
                href="/admin/api-keys"
                className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-stone-300 transition-colors"
              >
                <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>API Key Management</h4>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create and manage B2B API keys</p>
              </a>
              <a
                href="/admin/usage"
                className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-stone-300 transition-colors"
              >
                <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>API Usage Logs</h4>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>View detailed API request logs</p>
              </a>
              <a
                href="/admin/predictions"
                className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-stone-300 transition-colors"
              >
                <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>Prediction Analytics</h4>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>View prediction accuracy metrics</p>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Page Export with Admin Auth
// ============================================================================

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
        setIsAdmin(true);
      } else {
        router.push('/dashboard');
      }

      setChecking(false);
    };

    checkAdmin();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <AnalyticsDashboard />;
}
