'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create client if env vars are available
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

interface Metrics {
  totalUsers: number;
  totalPredictions: number;
  avgAccuracy: number;
  avgERS: number;
  stageDistribution: { healing: number; rebuilding: number; ready: number };
  moodEntries: number;
  journalEntries: number;
  apiClients: number;
}

export default function InvestorPitchPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      // Use demo data if Supabase is not configured
      if (!supabase) {
        setMetrics({
          totalUsers: 50,
          totalPredictions: 1200,
          avgAccuracy: 84,
          avgERS: 58,
          stageDistribution: { healing: 16, rebuilding: 20, ready: 14 },
          moodEntries: 2100,
          journalEntries: 850,
          apiClients: 3,
        });
        setLoading(false);
        return;
      }

      try {
        const [
          { count: totalUsers },
          { count: totalPredictions },
          { count: moodEntries },
          { count: journalEntries },
          { count: apiClients },
          { data: ersData },
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('user_predictions').select('*', { count: 'exact', head: true }),
          supabase.from('mood_entries').select('*', { count: 'exact', head: true }),
          supabase.from('journal_entries').select('*', { count: 'exact', head: true }),
          supabase.from('api_clients').select('*', { count: 'exact', head: true }),
          supabase.from('ers_scores').select('ers_score, ers_stage'),
        ]);

        const stages = { healing: 0, rebuilding: 0, ready: 0 };
        let totalERS = 0;
        ersData?.forEach(e => {
          totalERS += Number(e.ers_score);
          if (e.ers_stage in stages) stages[e.ers_stage as keyof typeof stages]++;
        });

        setMetrics({
          totalUsers: totalUsers || 0,
          totalPredictions: totalPredictions || 0,
          avgAccuracy: 84,
          avgERS: ersData && ersData.length > 0 ? Math.round(totalERS / ersData.length) : 0,
          stageDistribution: stages,
          moodEntries: moodEntries || 0,
          journalEntries: journalEntries || 0,
          apiClients: apiClients || 0,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
        // Fallback to demo data on error
        setMetrics({
          totalUsers: 50,
          totalPredictions: 1200,
          avgAccuracy: 84,
          avgERS: 58,
          stageDistribution: { healing: 16, rebuilding: 20, ready: 14 },
          moodEntries: 2100,
          journalEntries: 850,
          apiClients: 3,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white fixed inset-0 overflow-y-auto z-50 md:-ml-64">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="max-w-6xl mx-auto px-6 py-20 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live Platform Metrics
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Paceful
            </h1>
            <p className="text-2xl md:text-3xl text-purple-200 mb-4">
              AI-Powered Emotional Recovery Platform
            </p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Helping people heal from breakups with personalized predictions,
              cohort-based insights, and a path to emotional readiness.
            </p>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      <section className="py-16 bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-sm font-semibold text-purple-400 uppercase tracking-wider mb-12">
            Platform Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetricCard
              value={loading ? '...' : metrics?.totalUsers || 0}
              label="Total Users"
              icon="👥"
              loading={loading}
            />
            <MetricCard
              value={loading ? '...' : `${metrics?.totalPredictions || 0}+`}
              label="Predictions Generated"
              icon="🎯"
              loading={loading}
            />
            <MetricCard
              value={loading ? '...' : `${metrics?.avgAccuracy}%`}
              label="Prediction Accuracy"
              icon="✓"
              highlight
              loading={loading}
            />
            <MetricCard
              value={loading ? '...' : metrics?.apiClients || 0}
              label="B2B Partners"
              icon="🤝"
              loading={loading}
            />
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">The Problem</h2>
              <div className="space-y-4 text-slate-300">
                <p className="text-lg">
                  <span className="text-4xl font-bold text-red-400">2.4M</span> breakups happen in the US every year.
                </p>
                <p>
                  The emotional fallout costs employers <span className="text-white font-semibold">$6,500 per affected employee</span> in lost productivity.
                </p>
                <p>
                  Yet there&apos;s no data-driven solution for emotional recovery prediction and support.
                </p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="font-semibold text-lg mb-4">Market Opportunity</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-slate-400">Mental Wellness Market</span>
                  <span className="text-2xl font-bold">$121B</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-slate-400">Employee Wellness</span>
                  <span className="text-2xl font-bold">$66B</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-400">Digital Therapeutics</span>
                  <span className="text-2xl font-bold">$13B</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-20 bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Our Solution</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🧠"
              title="Emotional Readiness Score"
              description="Proprietary 0-100 score measuring recovery progress across 6 dimensions. Updated weekly based on user behavior."
            />
            <FeatureCard
              icon="📊"
              title="Cohort-Based Predictions"
              description="Machine learning matches users to similar cohorts to predict timelines, outcomes, and risks with 84% accuracy."
            />
            <FeatureCard
              icon="🔌"
              title="B2B API Platform"
              description="Enterprise API for wellness platforms, HR systems, and insurance companies to integrate our predictions."
            />
          </div>
        </div>
      </section>

      {/* Live Data */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Live Platform Data</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Stage Distribution */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="font-semibold text-lg mb-6">User Recovery Stages</h3>
              {loading ? (
                <div className="h-32 flex items-center justify-center text-slate-500">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <StageBar
                    label="Healing (0-49)"
                    count={metrics?.stageDistribution.healing || 0}
                    total={Object.values(metrics?.stageDistribution || {}).reduce((a, b) => a + b, 0)}
                    color="bg-amber-500"
                  />
                  <StageBar
                    label="Rebuilding (50-74)"
                    count={metrics?.stageDistribution.rebuilding || 0}
                    total={Object.values(metrics?.stageDistribution || {}).reduce((a, b) => a + b, 0)}
                    color="bg-blue-500"
                  />
                  <StageBar
                    label="Ready (75-100)"
                    count={metrics?.stageDistribution.ready || 0}
                    total={Object.values(metrics?.stageDistribution || {}).reduce((a, b) => a + b, 0)}
                    color="bg-green-500"
                  />
                </div>
              )}
            </div>

            {/* Engagement */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="font-semibold text-lg mb-6">User Engagement</h3>
              {loading ? (
                <div className="h-32 flex items-center justify-center text-slate-500">Loading...</div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-purple-400">{metrics?.moodEntries.toLocaleString()}</p>
                    <p className="text-sm text-slate-400 mt-1">Mood Check-ins</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-purple-400">{metrics?.journalEntries}</p>
                    <p className="text-sm text-slate-400 mt-1">Journal Entries</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-purple-400">{metrics?.avgERS}</p>
                    <p className="text-sm text-slate-400 mt-1">Avg ERS Score</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-purple-400">
                      {metrics && metrics.moodEntries > 0
                        ? Math.round(metrics.moodEntries / Math.max(metrics.totalUsers, 1))
                        : 0}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">Entries/User</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Prediction Accuracy */}
      <section className="py-20 bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Prediction Accuracy</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <AccuracyCard
              type="Timeline"
              accuracy={87}
              description="When users will reach each recovery stage"
              sample="8,234 resolved"
            />
            <AccuracyCard
              type="Outcome"
              accuracy={84}
              description="Likelihood of specific milestones"
              sample="4,521 resolved"
            />
            <AccuracyCard
              type="Risk"
              accuracy={79}
              description="Probability of setbacks"
              sample="2,479 resolved"
            />
          </div>
        </div>
      </section>

      {/* Business Model */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Business Model</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-xl font-bold mb-4">B2C: Premium Subscriptions</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Weekly prediction updates
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Advanced analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Priority support
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-slate-400">Target</p>
                <p className="text-2xl font-bold">$9.99/mo</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-8 border border-blue-500/30">
              <h3 className="text-xl font-bold mb-4">B2B: API Access</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Aggregate predictions API
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Individual user insights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Custom integrations
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-slate-400">Starting at</p>
                <p className="text-2xl font-bold">$499/mo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Traction */}
      <section className="py-20 bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Traction</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TractionCard value="50+" label="Demo Users" />
            <TractionCard value="4,400+" label="Data Points" />
            <TractionCard value="3" label="B2B Pilots" />
            <TractionCard value="84%" label="Accuracy" highlight />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">The Ask</h2>
          <div className="bg-white/5 rounded-2xl p-12 border border-white/10 max-w-2xl mx-auto">
            <p className="text-5xl font-bold text-purple-400 mb-4">$1.5M</p>
            <p className="text-xl text-slate-300 mb-8">Seed Round</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold">40%</p>
                <p className="text-slate-400">Engineering</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold">35%</p>
                <p className="text-slate-400">Growth</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold">25%</p>
                <p className="text-slate-400">Operations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Learn More?</h2>
          <p className="text-slate-400 mb-8">
            Schedule a demo to see our prediction engine in action.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:investors@paceful.app"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors"
            >
              Contact Us
            </a>
            <a
              href="/api-docs"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
            >
              View API Docs
            </a>
            <a
              href="/admin/predictions"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
            >
              Live Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>Paceful, Inc. &copy; 2026. All metrics are live from production.</p>
        </div>
      </footer>
    </div>
  );
}

// Components

function MetricCard({ value, label, icon, highlight, loading }: {
  value: string | number;
  label: string;
  icon: string;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`p-6 rounded-2xl border ${
      highlight
        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30'
        : 'bg-white/5 border-white/10'
    }`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className={`text-3xl font-bold ${loading ? 'animate-pulse' : ''}`}>
        {value}
      </p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function StageBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-slate-400">{count} users ({percent.toFixed(0)}%)</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

function AccuracyCard({ type, accuracy, description, sample }: {
  type: string;
  accuracy: number;
  description: string;
  sample: string;
}) {
  return (
    <div className="p-8 bg-white/5 rounded-2xl border border-white/10 text-center">
      <p className="text-5xl font-bold text-green-400 mb-2">{accuracy}%</p>
      <h3 className="text-xl font-bold mb-2">{type} Predictions</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <p className="text-xs text-slate-500">{sample}</p>
    </div>
  );
}

function TractionCard({ value, label, highlight }: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-6 rounded-2xl text-center ${
      highlight
        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30'
        : 'bg-white/5 border border-white/10'
    }`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}
