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

interface OverviewStats {
  totalUsers: number;
  activeUsers7d: number;
  totalMoodEntries: number;
  totalJournalEntries: number;
}

interface ERSDistribution {
  healing: number;
  rebuilding: number;
  ready: number;
}

interface EngagementMetrics {
  avgMoodsPerUserPerWeek: number;
  avgJournalsPerUserPerWeek: number;
  avgWordsPerJournal: number;
  mostActiveHour: number;
}

interface ActivityLog {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
}

interface ApiKeyInfo {
  id: string;
  partner_name: string;
  last_used_at: string | null;
  is_active: boolean;
}

interface ConversionFunnel {
  landingViews: number;
  ctaClicks: number;
  signupPageViews: number;
  signupsCompleted: number;
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
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
      {subtext && <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{subtext}</p>}
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
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>ERS Distribution</h3>

      {total === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No ERS data available</p>
      ) : (
        <>
          <div className="h-6 rounded-lg overflow-hidden flex mb-4">
            <div className="bg-amber-500 transition-all" style={{ width: `${healingPct}%` }} />
            <div className="bg-paceful-calm transition-all" style={{ width: `${rebuildingPct}%` }} />
            <div className="bg-paceful-primary transition-all" style={{ width: `${readyPct}%` }} />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{healingPct.toFixed(0)}%</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Healing ({distribution.healing})</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-paceful-calm" />
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{rebuildingPct.toFixed(0)}%</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rebuilding ({distribution.rebuilding})</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-paceful-primary" />
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
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Recent Activity</h3>

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
              {activities.map((activity, idx) => (
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
// Conversion Funnel
// ============================================================================

function ConversionFunnel({ funnel }: { funnel: ConversionFunnel }) {
  const steps = [
    { label: 'Landing Views', value: funnel.landingViews, color: '#6366f1' },
    { label: 'CTA Clicks', value: funnel.ctaClicks, color: '#8b5cf6' },
    { label: 'Signup Page Views', value: funnel.signupPageViews, color: '#a855f7' },
    { label: 'Signups Completed', value: funnel.signupsCompleted, color: '#22c55e' },
  ];

  const maxValue = Math.max(funnel.landingViews, 1);

  const calcRate = (current: number, previous: number) => {
    if (previous === 0) return '--';
    return `${((current / previous) * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200">
      <h3 className="font-semibold mb-6" style={{ color: 'var(--text)' }}>Conversion Funnel</h3>

      {funnel.landingViews === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversion data available yet</p>
      ) : (
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const widthPct = Math.max((step.value / maxValue) * 100, 5);
            const prevValue = idx > 0 ? steps[idx - 1].value : step.value;
            const convRate = idx > 0 ? calcRate(step.value, prevValue) : null;

            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {step.label}
                  </span>
                  <div className="flex items-center gap-3">
                    {convRate && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100" style={{ color: 'var(--text-muted)' }}>
                        {convRate}
                      </span>
                    )}
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {step.value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div
                  className="h-8 rounded-lg transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    background: step.color,
                    minWidth: '40px',
                  }}
                />
              </div>
            );
          })}

          {/* Overall conversion rate */}
          <div className="pt-4 mt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Overall Conversion Rate
              </span>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: '#22c55e' }}
              >
                {calcRate(funnel.signupsCompleted, funnel.landingViews)}
              </span>
            </div>
          </div>
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

  const [overview, setOverview] = useState<OverviewStats>({
    totalUsers: 0,
    activeUsers7d: 0,
    totalMoodEntries: 0,
    totalJournalEntries: 0,
  });

  const [ersDistribution, setErsDistribution] = useState<ERSDistribution>({
    healing: 0,
    rebuilding: 0,
    ready: 0,
  });

  const [engagement, setEngagement] = useState<EngagementMetrics>({
    avgMoodsPerUserPerWeek: 0,
    avgJournalsPerUserPerWeek: 0,
    avgWordsPerJournal: 0,
    mostActiveHour: 12,
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel>({
    landingViews: 0,
    ctaClicks: 0,
    signupPageViews: 0,
    signupsCompleted: 0,
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Overview Stats
      const [
        { count: totalUsers },
        { count: totalMoodEntries },
        { count: totalJournalEntries },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('mood_logs').select('*', { count: 'exact', head: true }),
        supabase.from('journal_entries').select('*', { count: 'exact', head: true }),
      ]);

      // Active users in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: activeData } = await supabase
        .from('activity_logs')
        .select('user_id')
        .gte('created_at', sevenDaysAgo);

      const activeUsers7d = new Set((activeData || []).map(a => a.user_id)).size;

      setOverview({
        totalUsers: totalUsers || 0,
        activeUsers7d,
        totalMoodEntries: totalMoodEntries || 0,
        totalJournalEntries: totalJournalEntries || 0,
      });

      // 2. ERS Distribution
      const { data: ersScores } = await supabase
        .from('ers_scores')
        .select('user_id, ers_score, ers_stage')
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

      // 3. Engagement Metrics
      const { data: moodData } = await supabase
        .from('mood_logs')
        .select('user_id, logged_at')
        .gte('logged_at', sevenDaysAgo);

      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('user_id, created_at, content')
        .gte('created_at', sevenDaysAgo);

      const moodUsers = new Set((moodData || []).map(m => m.user_id)).size || 1;
      const journalUsers = new Set((journalData || []).map(j => j.user_id)).size || 1;
      const avgMoodsPerUserPerWeek = (moodData?.length || 0) / moodUsers;
      const avgJournalsPerUserPerWeek = (journalData?.length || 0) / journalUsers;

      // Average words per journal
      let totalWords = 0;
      (journalData || []).forEach(j => {
        if (j.content) {
          totalWords += j.content.split(/\s+/).length;
        }
      });
      const avgWordsPerJournal = journalData?.length ? totalWords / journalData.length : 0;

      // Most active hour
      const { data: allActivity } = await supabase
        .from('activity_logs')
        .select('created_at')
        .gte('created_at', sevenDaysAgo);

      const hourCounts: Record<number, number> = {};
      (allActivity || []).forEach(a => {
        const hour = new Date(a.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      let mostActiveHour = 12;
      let maxCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostActiveHour = parseInt(hour);
        }
      });

      setEngagement({
        avgMoodsPerUserPerWeek: Math.round(avgMoodsPerUserPerWeek * 10) / 10,
        avgJournalsPerUserPerWeek: Math.round(avgJournalsPerUserPerWeek * 10) / 10,
        avgWordsPerJournal: Math.round(avgWordsPerJournal),
        mostActiveHour,
      });

      // 4. Recent Activity Feed
      const { data: recentActivity } = await supabase
        .from('activity_logs')
        .select('id, user_id, event_type, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      setActivities(recentActivity || []);

      // 5. API Keys
      try {
        const { data: apiKeysData } = await supabase
          .from('api_keys')
          .select('id, partner_name, last_used_at, is_active')
          .eq('is_active', true)
          .order('last_used_at', { ascending: false, nullsFirst: false });

        setApiKeys(apiKeysData || []);
      } catch {
        // Table might not exist
        setApiKeys([]);
      }

      // 6. Conversion Funnel
      try {
        const { data: conversionEvents } = await supabase
          .from('activity_logs')
          .select('event_type')
          .like('event_type', 'conversion_%');

        const counts = {
          landingViews: 0,
          ctaClicks: 0,
          signupPageViews: 0,
          signupsCompleted: 0,
        };

        (conversionEvents || []).forEach(e => {
          if (e.event_type === 'conversion_landing_view') counts.landingViews++;
          else if (e.event_type === 'conversion_cta_click') counts.ctaClicks++;
          else if (e.event_type === 'conversion_signup_page_view') counts.signupPageViews++;
          else if (e.event_type === 'conversion_signup_complete') counts.signupsCompleted++;
        });

        setConversionFunnel(counts);
      } catch {
        // Table might not have conversion events yet
      }

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

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={overview.totalUsers} subtext="Registered accounts" />
          <StatCard label="Active Users (7d)" value={overview.activeUsers7d} subtext="Last 7 days" />
          <StatCard label="Mood Entries" value={overview.totalMoodEntries} subtext="Total logged" />
          <StatCard label="Journal Entries" value={overview.totalJournalEntries} subtext="Total written" />
        </div>

        {/* Conversion Funnel */}
        <ConversionFunnel funnel={conversionFunnel} />

        {/* ERS Distribution */}
        <ERSDistributionBar distribution={ersDistribution} />

        {/* Engagement Metrics */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Engagement Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Moods/User/Week</p>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {engagement.avgMoodsPerUserPerWeek}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Journals/User/Week</p>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {engagement.avgJournalsPerUserPerWeek}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Avg Words/Journal</p>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {engagement.avgWordsPerJournal}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Peak Activity Hour</p>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
                {formatHour(engagement.mostActiveHour)}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} />

        {/* API Usage */}
        {apiKeys.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-stone-200">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Active API Keys</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Partner</th>
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Last Used</th>
                    <th className="text-center py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key, idx) => (
                    <tr
                      key={key.id}
                      className={idx % 2 === 0 ? '' : 'bg-stone-50'}
                      style={{ borderBottom: '1px solid var(--border-light)' }}
                    >
                      <td className="py-2" style={{ color: 'var(--text)' }}>{key.partner_name}</td>
                      <td className="py-2" style={{ color: 'var(--text-muted)' }}>
                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`inline-flex w-2 h-2 rounded-full ${key.is_active ? 'bg-paceful-primary' : 'bg-stone-300'}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
