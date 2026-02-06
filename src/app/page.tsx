'use client';

import { useEffect, useState } from 'react';
import ERSDashboard from '@/components/ers/ERSDashboard';
import { supabase } from '@/lib/supabase';
import { DEMO_USER_ID } from '@/lib/constants';

interface UserStats {
  streak: number;
  journalCount: number;
  moodCount: number;
  exercisesCompleted: number;
}

interface RecentActivity {
  type: 'journal' | 'mood' | 'exercise';
  title: string;
  time: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch streak
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak_days')
          .eq('user_id', DEMO_USER_ID)
          .single();

        // Fetch counts
        const { count: journalCount } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', DEMO_USER_ID);

        const { count: moodCount } = await supabase
          .from('mood_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', DEMO_USER_ID);

        const { count: exerciseCount } = await supabase
          .from('exercise_completions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', DEMO_USER_ID);

        setStats({
          streak: streakData?.current_streak_days ?? 0,
          journalCount: journalCount ?? 0,
          moodCount: moodCount ?? 0,
          exercisesCompleted: exerciseCount ?? 0,
        });

        // Fetch recent journal entries for activity feed
        const { data: recentJournals } = await supabase
          .from('journal_entries')
          .select('entry_title, created_at')
          .eq('user_id', DEMO_USER_ID)
          .order('created_at', { ascending: false })
          .limit(3);

        const recentActivities: RecentActivity[] = (recentJournals ?? []).map((j) => ({
          type: 'journal' as const,
          title: j.entry_title || 'Journal entry',
          time: new Date(j.created_at).toLocaleDateString(),
        }));

        setActivities(recentActivities);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, James 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Your healing journey continues. Keep going!
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ERS Dashboard - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ERSDashboard userId={DEMO_USER_ID} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Your Progress
              </h3>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded-lg" />
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <StatCard
                    icon="🔥"
                    label="Current Streak"
                    value={`${stats.streak} days`}
                    color="bg-orange-50 text-orange-600"
                  />
                  <StatCard
                    icon="📝"
                    label="Journal Entries"
                    value={stats.journalCount.toString()}
                    color="bg-blue-50 text-blue-600"
                  />
                  <StatCard
                    icon="💜"
                    label="Mood Check-ins"
                    value={stats.moodCount.toString()}
                    color="bg-purple-50 text-purple-600"
                  />
                  <StatCard
                    icon="✨"
                    label="Exercises Done"
                    value={stats.exercisesCompleted.toString()}
                    color="bg-emerald-50 text-emerald-600"
                  />
                </div>
              ) : null}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Recent Activity
              </h3>
              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <span className="text-lg">
                        {activity.type === 'journal' && '📝'}
                        {activity.type === 'mood' && '💜'}
                        {activity.type === 'exercise' && '✨'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No recent activity</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 rounded-xl text-left transition-colors">
                  📝 Write in Journal
                </button>
                <button className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 rounded-xl text-left transition-colors">
                  💜 Log Your Mood
                </button>
                <button className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 rounded-xl text-left transition-colors">
                  ✨ Start Exercise
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
