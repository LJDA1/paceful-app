'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

interface AnalyticsData {
  totalUsers: number;
  dailyActiveUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  avgErsScore: number;
  stageDistribution: {
    healing: number;
    rebuilding: number;
    ready: number;
  };
  moodEntriesPerDay: Array<{
    date: string;
    count: number;
  }>;
  dataQuality: {
    usersWithMinEntries: number;
    avgEntriesPerUser: number;
    avgMoodsPerUserPerWeek: number;
    usersWithErs: number;
  };
  retention: {
    day7: number;
    day30: number;
  };
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
    stage?: string;
  }>;
  apiUsage: {
    totalRequests: number;
    uniqueClients: number;
  };
}

// ============================================================================
// Admin Auth Check
// ============================================================================

const ADMIN_PASSWORD = 'paceful_admin_2025'; // Simple password for demo

function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      setError('Invalid password');
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="bg-stone-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-2">Admin Access</h1>
        <p className="text-stone-400 text-sm mb-6">Enter admin password to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 bg-stone-700 border border-stone-600 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Access Analytics
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({
  label,
  value,
  subtext,
  trend,
  color = 'indigo',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className={`rounded-xl p-5 border ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-stone-400 text-sm mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && <p className="text-stone-500 text-xs mt-1">{subtext}</p>}
        </div>
        {trend && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              trend === 'up'
                ? 'bg-emerald-500/20 text-emerald-400'
                : trend === 'down'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-stone-700 text-stone-400'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Stage Distribution Chart
// ============================================================================

function StageDistributionChart({
  distribution,
}: {
  distribution: { healing: number; rebuilding: number; ready: number };
}) {
  const total = distribution.healing + distribution.rebuilding + distribution.ready;
  const healingPct = total > 0 ? (distribution.healing / total) * 100 : 0;
  const rebuildingPct = total > 0 ? (distribution.rebuilding / total) * 100 : 0;
  const readyPct = total > 0 ? (distribution.ready / total) * 100 : 0;

  return (
    <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
      <h3 className="text-white font-medium mb-4">Stage Distribution</h3>

      {/* Bar chart */}
      <div className="h-8 rounded-lg overflow-hidden flex mb-4">
        <div
          className="bg-amber-500 transition-all"
          style={{ width: `${healingPct}%` }}
        />
        <div
          className="bg-cyan-500 transition-all"
          style={{ width: `${rebuildingPct}%` }}
        />
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${readyPct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <div>
            <p className="text-white font-medium">{healingPct.toFixed(0)}%</p>
            <p className="text-stone-400 text-xs">Healing ({distribution.healing})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500" />
          <div>
            <p className="text-white font-medium">{rebuildingPct.toFixed(0)}%</p>
            <p className="text-stone-400 text-xs">Rebuilding ({distribution.rebuilding})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <div>
            <p className="text-white font-medium">{readyPct.toFixed(0)}%</p>
            <p className="text-stone-400 text-xs">Ready ({distribution.ready})</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Mood Entries Trend Chart
// ============================================================================

function MoodEntriesTrendChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
        <h3 className="text-white font-medium mb-4">Mood Entries per Day</h3>
        <div className="h-32 flex items-center justify-center text-stone-500 text-sm">
          No data available
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
      <h3 className="text-white font-medium mb-4">Mood Entries per Day (Last 14 Days)</h3>

      <div className="flex items-end gap-1 h-32">
        {data.slice(-14).map((day, i) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-400"
              style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? 4 : 0 }}
              title={`${day.date}: ${day.count} entries`}
            />
            {i % 2 === 0 && (
              <span className="text-[10px] text-stone-500">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Data Quality Card
// ============================================================================

function DataQualityCard({
  quality,
  totalUsers,
}: {
  quality: AnalyticsData['dataQuality'];
  totalUsers: number;
}) {
  const qualityPct = totalUsers > 0
    ? Math.round((quality.usersWithMinEntries / totalUsers) * 100)
    : 0;

  return (
    <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
      <h3 className="text-white font-medium mb-4">Data Quality Metrics</h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-stone-400">Users with 7+ mood entries</span>
            <span className="text-white font-medium">{quality.usersWithMinEntries}</span>
          </div>
          <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${qualityPct}%` }}
            />
          </div>
          <p className="text-stone-500 text-xs mt-1">{qualityPct}% of total users</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-stone-700">
          <div>
            <p className="text-stone-400 text-xs">Avg entries/user</p>
            <p className="text-white font-medium">{quality.avgEntriesPerUser.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs">Users with ERS</p>
            <p className="text-white font-medium">{quality.usersWithErs}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Analytics Dashboard
// ============================================================================

function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch DAU (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: activeToday } = await supabase
        .from('mood_entries')
        .select('user_id')
        .gte('logged_at', oneDayAgo);

      const dailyActiveUsers = new Set((activeToday || []).map((m) => m.user_id)).size;

      // Fetch active users (7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: active7d } = await supabase
        .from('mood_entries')
        .select('user_id')
        .gte('logged_at', sevenDaysAgo);

      const activeUsers7d = new Set((active7d || []).map((m) => m.user_id)).size;

      // Fetch active users (30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: active30d } = await supabase
        .from('mood_entries')
        .select('user_id')
        .gte('logged_at', thirtyDaysAgo);

      const activeUsers30d = new Set((active30d || []).map((m) => m.user_id)).size;

      // Fetch ERS scores
      const { data: ersScores } = await supabase
        .from('ers_scores')
        .select('user_id, ers_score, ers_stage')
        .order('calculated_at', { ascending: false });

      // Get latest score per user
      const latestScoresByUser = new Map<string, { ers_score: number; ers_stage: string }>();
      (ersScores || []).forEach((score) => {
        if (!latestScoresByUser.has(score.user_id)) {
          latestScoresByUser.set(score.user_id, score);
        }
      });

      const scores = Array.from(latestScoresByUser.values());
      const avgErsScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s.ers_score, 0) / scores.length
        : 0;

      // Stage distribution
      const stageDistribution = { healing: 0, rebuilding: 0, ready: 0 };
      scores.forEach((s) => {
        if (s.ers_stage in stageDistribution) {
          stageDistribution[s.ers_stage as keyof typeof stageDistribution]++;
        }
      });

      // Mood entries per day (last 14 days)
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentMoods } = await supabase
        .from('mood_entries')
        .select('logged_at')
        .gte('logged_at', fourteenDaysAgo)
        .order('logged_at', { ascending: true });

      const moodsByDay = new Map<string, number>();
      (recentMoods || []).forEach((m) => {
        const day = m.logged_at.split('T')[0];
        moodsByDay.set(day, (moodsByDay.get(day) || 0) + 1);
      });

      // Fill in missing days
      const moodEntriesPerDay: Array<{ date: string; count: number }> = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        moodEntriesPerDay.push({
          date,
          count: moodsByDay.get(date) || 0,
        });
      }

      // Data quality
      const moodCountByUser = new Map<string, number>();
      (active30d || []).forEach((m) => {
        moodCountByUser.set(m.user_id, (moodCountByUser.get(m.user_id) || 0) + 1);
      });

      const usersWithMinEntries = Array.from(moodCountByUser.values()).filter(
        (count) => count >= 7
      ).length;
      const totalMoodEntries = Array.from(moodCountByUser.values()).reduce((a, b) => a + b, 0);
      const avgEntriesPerUser = moodCountByUser.size > 0
        ? totalMoodEntries / moodCountByUser.size
        : 0;

      // Calculate retention
      // Get users who signed up 7+ days ago
      const { data: usersOlderThan7d } = await supabase
        .from('profiles')
        .select('user_id, created_at')
        .lte('created_at', sevenDaysAgo);

      // Check which of those users are still active
      const oldUserIds = new Set((usersOlderThan7d || []).map(u => u.user_id));
      const activeOldUsers7d = (active7d || []).filter(m => oldUserIds.has(m.user_id));
      const retention7d = oldUserIds.size > 0
        ? (new Set(activeOldUsers7d.map(m => m.user_id)).size / oldUserIds.size) * 100
        : 0;

      // Get users who signed up 30+ days ago
      const { data: usersOlderThan30d } = await supabase
        .from('profiles')
        .select('user_id, created_at')
        .lte('created_at', thirtyDaysAgo);

      const oldUserIds30 = new Set((usersOlderThan30d || []).map(u => u.user_id));
      const activeOldUsers30d = (active30d || []).filter(m => oldUserIds30.has(m.user_id));
      const retention30d = oldUserIds30.size > 0
        ? (new Set(activeOldUsers30d.map(m => m.user_id)).size / oldUserIds30.size) * 100
        : 0;

      // Fetch recent signups with their ERS stage
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get emails for recent signups
      const recentSignups = await Promise.all(
        (recentProfiles || []).map(async (profile) => {
          const stage = latestScoresByUser.get(profile.user_id)?.ers_stage;
          return {
            id: profile.user_id,
            name: profile.first_name || 'Anonymous',
            email: `${profile.first_name?.toLowerCase() || 'user'}@paceful.test`,
            created_at: profile.created_at,
            stage,
          };
        })
      );

      // Calculate avg moods per user per week
      const avgMoodsPerUserPerWeek = activeUsers7d > 0
        ? (active7d?.length || 0) / activeUsers7d
        : 0;

      // API usage (try to fetch, may not exist yet)
      let apiUsage = { totalRequests: 0, uniqueClients: 0 };
      try {
        const { count: totalRequests } = await supabase
          .from('api_usage_logs')
          .select('*', { count: 'exact', head: true });

        const { data: clients } = await supabase
          .from('api_usage_logs')
          .select('client_id');

        apiUsage = {
          totalRequests: totalRequests || 0,
          uniqueClients: new Set((clients || []).map((c) => c.client_id)).size,
        };
      } catch {
        // Table doesn't exist yet
      }

      setData({
        totalUsers: totalUsers || 0,
        dailyActiveUsers,
        activeUsers7d,
        activeUsers30d,
        avgErsScore: Math.round(avgErsScore * 100) / 100,
        stageDistribution,
        moodEntriesPerDay,
        dataQuality: {
          usersWithMinEntries,
          avgEntriesPerUser: Math.round(avgEntriesPerUser * 100) / 100,
          avgMoodsPerUserPerWeek: Math.round(avgMoodsPerUserPerWeek * 10) / 10,
          usersWithErs: scores.length,
        },
        retention: {
          day7: Math.round(retention7d * 10) / 10,
          day30: Math.round(retention30d * 10) / 10,
        },
        recentSignups,
        apiUsage,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-stone-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-stone-800 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-stone-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Analytics</h1>
            <p className="text-stone-400 text-sm">
              {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Refresh
          </button>
        </div>

        {data && (
          <>
            {/* Top Stats Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={data.totalUsers}
                subtext="Registered accounts"
                color="indigo"
              />
              <StatCard
                label="DAU"
                value={data.dailyActiveUsers}
                subtext="Active in last 24h"
                color="emerald"
                trend={data.dailyActiveUsers > 0 ? 'up' : 'neutral'}
              />
              <StatCard
                label="WAU"
                value={data.activeUsers7d}
                subtext="Active this week"
                color="cyan"
              />
              <StatCard
                label="MAU"
                value={data.activeUsers30d}
                subtext="Active this month"
                color="amber"
              />
            </div>

            {/* Top Stats Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Avg ERS"
                value={data.avgErsScore}
                subtext="Across all users"
                color="indigo"
              />
              <StatCard
                label="Moods/User/Week"
                value={data.dataQuality.avgMoodsPerUserPerWeek}
                subtext="Weekly engagement"
                color="emerald"
              />
              <StatCard
                label="7-Day Retention"
                value={`${data.retention.day7}%`}
                subtext="Users still active"
                color={data.retention.day7 > 30 ? 'emerald' : 'amber'}
                trend={data.retention.day7 > 30 ? 'up' : 'down'}
              />
              <StatCard
                label="30-Day Retention"
                value={`${data.retention.day30}%`}
                subtext="Long-term retention"
                color={data.retention.day30 > 20 ? 'emerald' : 'rose'}
                trend={data.retention.day30 > 20 ? 'up' : 'down'}
              />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <StageDistributionChart distribution={data.stageDistribution} />
              <DataQualityCard quality={data.dataQuality} totalUsers={data.totalUsers} />
            </div>

            {/* Mood Trend */}
            <MoodEntriesTrendChart data={data.moodEntriesPerDay} />

            {/* Recent Signups */}
            <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
              <h3 className="text-white font-medium mb-4">Recent Signups (Last 10)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-stone-400 text-xs uppercase tracking-wide border-b border-stone-700">
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Stage</th>
                      <th className="text-left py-2 px-3">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-700/50">
                    {data.recentSignups.map((user) => (
                      <tr key={user.id} className="hover:bg-stone-700/30">
                        <td className="py-2 px-3 text-white font-medium">{user.name}</td>
                        <td className="py-2 px-3 text-stone-400">{user.email}</td>
                        <td className="py-2 px-3">
                          {user.stage ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              user.stage === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                              user.stage === 'rebuilding' ? 'bg-cyan-500/20 text-cyan-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {user.stage}
                            </span>
                          ) : (
                            <span className="text-stone-500 text-xs">No ERS yet</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-stone-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* API Usage */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
                <h3 className="text-white font-medium mb-4">B2B API Usage</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-stone-400 text-xs">Total Requests</p>
                    <p className="text-2xl font-bold text-white">{data.apiUsage.totalRequests}</p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-xs">Unique Clients</p>
                    <p className="text-2xl font-bold text-white">{data.apiUsage.uniqueClients}</p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
                <h3 className="text-white font-medium mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <a
                    href="/api/b2b/aggregate"
                    target="_blank"
                    className="block px-4 py-2 bg-stone-700 rounded-lg text-stone-300 hover:bg-stone-600 text-sm transition-colors"
                  >
                    View B2B API Response (needs auth)
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('pk_test_paceful_b2b_2025_demo');
                      alert('Test API key copied!');
                    }}
                    className="w-full px-4 py-2 bg-stone-700 rounded-lg text-stone-300 hover:bg-stone-600 text-sm text-left transition-colors"
                  >
                    Copy Test API Key
                  </button>
                </div>
              </div>
            </div>

            {/* API Keys Reference */}
            <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
              <h3 className="text-white font-medium mb-4">Test API Keys</h3>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex items-center justify-between p-3 bg-stone-900 rounded-lg">
                  <span className="text-stone-400">Basic Tier:</span>
                  <code className="text-emerald-400">pk_test_paceful_b2b_2025_demo</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-900 rounded-lg">
                  <span className="text-stone-400">Premium Tier:</span>
                  <code className="text-cyan-400">pk_test_research_partner_alpha</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-900 rounded-lg">
                  <span className="text-stone-400">Enterprise Tier:</span>
                  <code className="text-amber-400">pk_test_enterprise_corp</code>
                </div>
              </div>
              <p className="text-stone-500 text-xs mt-3">
                Use with header: <code className="text-stone-400">Authorization: Bearer &lt;key&gt;</code>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function AdminAnalyticsPage() {
  return (
    <AdminAuthGate>
      <AnalyticsDashboard />
    </AdminAuthGate>
  );
}
