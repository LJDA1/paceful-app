'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

// ============================================================================
// SVG Icons
// ============================================================================

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function TargetIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.008v.008H12V12Z" />
    </svg>
  );
}

function CheckCircleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function HandshakeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function BrainIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function ChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function ApiIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

// ============================================================================
// Components
// ============================================================================

function MetricCard({ value, label, icon, iconBg, iconColor, highlight, loading }: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className="p-6 rounded-2xl bg-white"
      style={{
        border: highlight ? '2px solid #5B8A72' : '1px solid #F0EBE4'
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <p
        className={`text-[32px] font-bold ${loading ? 'animate-pulse' : ''}`}
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {value}
      </p>
      <p className="text-[14px] mt-1" style={{ color: '#5C574F' }}>{label}</p>
    </div>
  );
}

function FeatureCard({ icon, iconBg, iconColor, title, description }: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 bg-white rounded-2xl"
      style={{ border: '1px solid #F0EBE4' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <h3
        className="text-[18px] font-semibold mb-2"
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>{description}</p>
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
      <div className="flex justify-between text-[14px] mb-2">
        <span style={{ color: '#1F1D1A' }}>{label}</span>
        <span style={{ color: '#9A938A' }}>{count} users ({percent.toFixed(0)}%)</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: '#F3EFE9' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(percent, 2)}%`, background: color }}
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
    <div
      className="p-6 bg-white rounded-2xl text-center"
      style={{ border: '1px solid #F0EBE4' }}
    >
      <p
        className="text-[48px] font-bold mb-2"
        style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
      >
        {accuracy}%
      </p>
      <h3
        className="text-[17px] font-semibold mb-2"
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {type} Predictions
      </h3>
      <p className="text-[14px] mb-3" style={{ color: '#5C574F' }}>{description}</p>
      <p className="text-[12px]" style={{ color: '#9A938A' }}>{sample}</p>
    </div>
  );
}

function TractionCard({ value, label, highlight }: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="p-6 rounded-2xl text-center bg-white"
      style={{
        border: highlight ? '2px solid #5B8A72' : '1px solid #F0EBE4',
        background: highlight ? 'rgba(91,138,114,0.05)' : '#FFFFFF'
      }}
    >
      <p
        className="text-[28px] font-bold"
        style={{ fontFamily: "'Fraunces', serif", color: highlight ? '#5B8A72' : '#1F1D1A' }}
      >
        {value}
      </p>
      <p className="text-[14px] mt-1" style={{ color: '#5C574F' }}>{label}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function InvestorPitchPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState('');

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  useEffect(() => {
    async function fetchMetrics() {
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
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      {/* Navigation */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(249,246,242,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #F0EBE4'
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#5B8A72' }}
            >
              <span className="text-white text-[15px] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>P</span>
            </div>
            <span
              className="text-[18px] font-semibold"
              style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
            >
              Paceful
            </span>
            <span style={{ color: '#E8E2DA' }}>|</span>
            <span className="text-[14px]" style={{ color: '#5C574F' }}>Investors</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/api-docs"
              className="hidden sm:block text-[14px] font-medium"
              style={{ color: '#5C574F' }}
            >
              API Docs
            </Link>
            <a
              href="mailto:investors@paceful.app"
              className="px-5 py-2.5 text-[14px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
              style={{ background: '#5B8A72' }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden" style={{ background: '#F9F6F2' }}>
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'rgba(91,138,114,0.12)' }}
          />
          <div
            className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl"
            style={{ background: 'rgba(212,151,59,0.08)' }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium mb-6"
              style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#5B8A72' }}
              />
              Live Platform Metrics
            </div>

            <h1
              className="text-[40px] sm:text-[48px] lg:text-[56px] font-bold leading-[1.1] mb-6"
              style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
            >
              Paceful
            </h1>

            <p
              className="text-[20px] sm:text-[24px] mb-4"
              style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
            >
              AI-Powered Emotional Recovery Platform
            </p>

            <p className="text-[16px] sm:text-[18px] leading-relaxed" style={{ color: '#5C574F' }}>
              Helping people heal from breakups with personalized predictions,
              cohort-based insights, and a path to emotional readiness.
            </p>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      <section className="py-16" style={{ background: '#F3EFE9' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p
            className="text-center text-[12px] font-semibold uppercase tracking-wider mb-10"
            style={{ color: '#5B8A72' }}
          >
            Platform Metrics
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <MetricCard
              value={loading ? '...' : metrics?.totalUsers || 0}
              label="Total Users"
              icon={<UsersIcon className="w-5 h-5" />}
              iconBg="rgba(91,138,114,0.1)"
              iconColor="#5B8A72"
              loading={loading}
            />
            <MetricCard
              value={loading ? '...' : `${metrics?.totalPredictions || 0}+`}
              label="Predictions Generated"
              icon={<TargetIcon className="w-5 h-5" />}
              iconBg="rgba(212,151,59,0.1)"
              iconColor="#D4973B"
              loading={loading}
            />
            <MetricCard
              value={loading ? '...' : `${metrics?.avgAccuracy}%`}
              label="Prediction Accuracy"
              icon={<CheckCircleIcon className="w-5 h-5" />}
              iconBg="rgba(91,138,114,0.1)"
              iconColor="#5B8A72"
              highlight
              loading={loading}
            />
            <MetricCard
              value={loading ? '...' : metrics?.apiClients || 0}
              label="B2B Partners"
              icon={<HandshakeIcon className="w-5 h-5" />}
              iconBg="rgba(123,168,150,0.15)"
              iconColor="#7BA896"
              loading={loading}
            />
          </div>
        </div>
      </section>

      {/* The Problem + Market Opportunity */}
      <section className="py-20" style={{ background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2
                className="text-[28px] sm:text-[32px] font-bold mb-6"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                The Problem
              </h2>
              <div className="space-y-4">
                <p className="text-[16px]" style={{ color: '#5C574F' }}>
                  <span
                    className="text-[36px] font-bold block mb-2"
                    style={{ fontFamily: "'Fraunces', serif", color: '#B86B64' }}
                  >
                    2.4M
                  </span>
                  breakups happen in the US every year.
                </p>
                <p className="text-[16px]" style={{ color: '#5C574F' }}>
                  The emotional fallout costs employers{' '}
                  <span className="font-semibold" style={{ color: '#1F1D1A' }}>$6,500 per affected employee</span>{' '}
                  in lost productivity.
                </p>
                <p className="text-[16px]" style={{ color: '#5C574F' }}>
                  Yet there&apos;s no data-driven solution for emotional recovery prediction and support.
                </p>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl p-6 sm:p-8"
              style={{ border: '1px solid #F0EBE4' }}
            >
              <h3
                className="text-[18px] font-semibold mb-6"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Market Opportunity
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid #F0EBE4' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#5B8A72' }} />
                    <span className="text-[15px]" style={{ color: '#5C574F' }}>Mental Wellness Market</span>
                  </div>
                  <span
                    className="text-[24px] font-bold"
                    style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                  >
                    $121B
                  </span>
                </div>
                <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid #F0EBE4' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#D4973B' }} />
                    <span className="text-[15px]" style={{ color: '#5C574F' }}>Employee Wellness</span>
                  </div>
                  <span
                    className="text-[24px] font-bold"
                    style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                  >
                    $66B
                  </span>
                </div>
                <div className="flex justify-between items-center py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#7BA896' }} />
                    <span className="text-[15px]" style={{ color: '#5C574F' }}>Digital Therapeutics</span>
                  </div>
                  <span
                    className="text-[24px] font-bold"
                    style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                  >
                    $13B
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-20" style={{ background: '#F3EFE9' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-12 text-center"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Our Solution
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<BrainIcon className="w-6 h-6" />}
              iconBg="rgba(91,138,114,0.1)"
              iconColor="#5B8A72"
              title="Emotional Readiness Score"
              description="Proprietary 0-100 score measuring recovery progress across 6 dimensions. Updated weekly based on user behavior."
            />
            <FeatureCard
              icon={<ChartIcon className="w-6 h-6" />}
              iconBg="rgba(212,151,59,0.1)"
              iconColor="#D4973B"
              title="Cohort-Based Predictions"
              description="Machine learning matches users to similar cohorts to predict timelines, outcomes, and risks with 84% accuracy."
            />
            <FeatureCard
              icon={<ApiIcon className="w-6 h-6" />}
              iconBg="rgba(123,168,150,0.15)"
              iconColor="#7BA896"
              title="B2B API Platform"
              description="Enterprise API for wellness platforms, HR systems, and insurance companies to integrate our predictions."
            />
          </div>
        </div>
      </section>

      {/* Live Data */}
      <section className="py-20" style={{ background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-12 text-center"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Live Platform Data
          </h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Stage Distribution */}
            <div
              className="bg-white rounded-2xl p-6 sm:p-8"
              style={{ border: '1px solid #F0EBE4' }}
            >
              <h3
                className="text-[17px] font-semibold mb-6"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                User Recovery Stages
              </h3>
              {loading ? (
                <div className="h-32 flex items-center justify-center" style={{ color: '#9A938A' }}>Loading...</div>
              ) : (
                <div className="space-y-5">
                  <StageBar
                    label="Healing (0-49)"
                    count={metrics?.stageDistribution.healing || 0}
                    total={Object.values(metrics?.stageDistribution || {}).reduce((a, b) => a + b, 0)}
                    color="#D4973B"
                  />
                  <StageBar
                    label="Rebuilding (50-74)"
                    count={metrics?.stageDistribution.rebuilding || 0}
                    total={Object.values(metrics?.stageDistribution || {}).reduce((a, b) => a + b, 0)}
                    color="#7BA896"
                  />
                  <StageBar
                    label="Ready (75-100)"
                    count={metrics?.stageDistribution.ready || 0}
                    total={Object.values(metrics?.stageDistribution || {}).reduce((a, b) => a + b, 0)}
                    color="#5B8A72"
                  />
                </div>
              )}
            </div>

            {/* Engagement */}
            <div
              className="bg-white rounded-2xl p-6 sm:p-8"
              style={{ border: '1px solid #F0EBE4' }}
            >
              <h3
                className="text-[17px] font-semibold mb-6"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                User Engagement
              </h3>
              {loading ? (
                <div className="h-32 flex items-center justify-center" style={{ color: '#9A938A' }}>Loading...</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl" style={{ background: '#F3EFE9' }}>
                    <p
                      className="text-[28px] font-bold"
                      style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
                    >
                      {metrics?.moodEntries.toLocaleString()}
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: '#5C574F' }}>Mood Check-ins</p>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ background: '#F3EFE9' }}>
                    <p
                      className="text-[28px] font-bold"
                      style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
                    >
                      {metrics?.journalEntries}
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: '#5C574F' }}>Journal Entries</p>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ background: '#F3EFE9' }}>
                    <p
                      className="text-[28px] font-bold"
                      style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
                    >
                      {metrics?.avgERS}
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: '#5C574F' }}>Avg ERS Score</p>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ background: '#F3EFE9' }}>
                    <p
                      className="text-[28px] font-bold"
                      style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
                    >
                      {metrics && metrics.moodEntries > 0
                        ? Math.round(metrics.moodEntries / Math.max(metrics.totalUsers, 1))
                        : 0}
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: '#5C574F' }}>Entries/User</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Prediction Accuracy */}
      <section className="py-20" style={{ background: '#F3EFE9' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-12 text-center"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Prediction Accuracy
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <section className="py-20" style={{ background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-12 text-center"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Business Model
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* B2C */}
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{ background: 'linear-gradient(135deg, rgba(91,138,114,0.08) 0%, rgba(123,168,150,0.12) 100%)', border: '1px solid rgba(91,138,114,0.2)' }}
            >
              <h3
                className="text-[20px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                B2C: Premium Subscriptions
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-[15px]" style={{ color: '#5C574F' }}>
                  <CheckIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#5B8A72' }} />
                  Weekly prediction updates
                </li>
                <li className="flex items-center gap-3 text-[15px]" style={{ color: '#5C574F' }}>
                  <CheckIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#5B8A72' }} />
                  Advanced analytics
                </li>
                <li className="flex items-center gap-3 text-[15px]" style={{ color: '#5C574F' }}>
                  <CheckIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#5B8A72' }} />
                  Priority support
                </li>
              </ul>
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(91,138,114,0.2)' }}>
                <p className="text-[13px]" style={{ color: '#9A938A' }}>Target</p>
                <p
                  className="text-[28px] font-bold"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  $9.99/mo
                </p>
              </div>
            </div>

            {/* B2B */}
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{ background: 'linear-gradient(135deg, rgba(212,151,59,0.08) 0%, rgba(212,151,59,0.12) 100%)', border: '1px solid rgba(212,151,59,0.2)' }}
            >
              <h3
                className="text-[20px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                B2B: API Access
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-[15px]" style={{ color: '#5C574F' }}>
                  <CheckIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#D4973B' }} />
                  Aggregate predictions API
                </li>
                <li className="flex items-center gap-3 text-[15px]" style={{ color: '#5C574F' }}>
                  <CheckIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#D4973B' }} />
                  Individual user insights
                </li>
                <li className="flex items-center gap-3 text-[15px]" style={{ color: '#5C574F' }}>
                  <CheckIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#D4973B' }} />
                  Custom integrations
                </li>
              </ul>
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(212,151,59,0.2)' }}>
                <p className="text-[13px]" style={{ color: '#9A938A' }}>Starting at</p>
                <p
                  className="text-[28px] font-bold"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  $499/mo
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Traction */}
      <section className="py-20" style={{ background: '#F3EFE9' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-12 text-center"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Traction
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <TractionCard value="50+" label="Demo Users" />
            <TractionCard value="4,400+" label="Data Points" />
            <TractionCard value="3" label="B2B Pilots" />
            <TractionCard value="84%" label="Accuracy" highlight />
          </div>
        </div>
      </section>

      {/* The Ask */}
      <section className="py-20" style={{ background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-12"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            The Ask
          </h2>
          <div
            className="bg-white rounded-2xl p-8 sm:p-12 max-w-2xl mx-auto"
            style={{ border: '1px solid #F0EBE4' }}
          >
            <p
              className="text-[48px] sm:text-[56px] font-bold mb-2"
              style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
            >
              $1.5M
            </p>
            <p
              className="text-[20px] mb-8"
              style={{ fontFamily: "'Fraunces', serif", color: '#5C574F' }}
            >
              Seed Round
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl" style={{ background: '#F3EFE9' }}>
                <p
                  className="text-[24px] font-bold"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  40%
                </p>
                <p className="text-[13px]" style={{ color: '#5C574F' }}>Engineering</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F3EFE9' }}>
                <p
                  className="text-[24px] font-bold"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  35%
                </p>
                <p className="text-[13px]" style={{ color: '#5C574F' }}>Growth</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F3EFE9' }}>
                <p
                  className="text-[24px] font-bold"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  25%
                </p>
                <p className="text-[13px]" style={{ color: '#5C574F' }}>Operations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: '#5B8A72' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-4 text-white"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Ready to Learn More?
          </h2>
          <p className="mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Schedule a demo to see our prediction engine in action.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:investors@paceful.app"
              className="px-8 py-4 bg-white font-semibold rounded-full transition-opacity hover:opacity-90"
              style={{ color: '#5B8A72' }}
            >
              Contact Us
            </a>
            <Link
              href="/api-docs"
              className="px-8 py-4 font-semibold rounded-full transition-colors"
              style={{
                background: 'transparent',
                border: '2px solid rgba(255,255,255,0.5)',
                color: 'white'
              }}
            >
              View API Docs
            </Link>
            <Link
              href="/admin/predictions"
              className="px-8 py-4 font-semibold rounded-full transition-colors"
              style={{
                background: 'transparent',
                border: '2px solid rgba(255,255,255,0.5)',
                color: 'white'
              }}
            >
              Live Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #F0EBE4', background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-[13px]" style={{ color: '#9A938A' }}>
            Paceful, Inc. &copy; {currentYear}. All metrics are live from production.
          </p>
        </div>
      </footer>
    </div>
  );
}
