'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WeeklyRecapData {
  daysLogged: number;
  avgMood: number;
  moodTrend: 'up' | 'down' | 'steady';
  moodChange: number;
  journalEntries: number;
  journalWords: number;
  ersChange: number;
  currentStreak: number;
  aiInsight?: string;
}

interface WeeklyRecapProps {
  data: WeeklyRecapData;
  onDismiss: () => void;
}

// Day dot component
function DayDot({ filled, day }: { filled: boolean; day: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-6 h-6 rounded-full transition-colors ${
          filled ? '' : 'border-2'
        }`}
        style={{
          background: filled ? 'var(--primary)' : 'transparent',
          borderColor: filled ? 'transparent' : 'var(--border)',
        }}
      />
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {day}
      </span>
    </div>
  );
}

// Stat row component
function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-warm)' }}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>{value}</p>
      </div>
    </div>
  );
}

export default function WeeklyRecap({ data, onDismiss }: WeeklyRecapProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(onDismiss, 300);
  };

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Generate which days were logged (mock based on daysLogged count)
  const daysFilled = Array(7).fill(false);
  for (let i = 0; i < Math.min(data.daysLogged, 7); i++) {
    daysFilled[i] = true;
  }

  const moodTrendText = data.moodTrend === 'up'
    ? `up ${data.moodChange.toFixed(1)} from last week`
    : data.moodTrend === 'down'
    ? `down ${Math.abs(data.moodChange).toFixed(1)} from last week`
    : 'steady from last week';

  const ersChangeText = data.ersChange > 0
    ? `+${data.ersChange} points this week`
    : data.ersChange < 0
    ? `${data.ersChange} points this week`
    : 'Steady this week';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 pointer-events-auto ${
          isVisible && !isLeaving ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Card */}
      <div
        className={`relative pointer-events-auto max-w-md w-full mx-4 transition-all duration-300 ${
          isVisible && !isLeaving
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-8'
        }`}
      >
        <div
          className="rounded-3xl p-6 overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--primary)' }}>
              Weekly Recap
            </p>
            <h2
              className="text-[24px] font-medium"
              style={{
                fontFamily: 'var(--font-fraunces), Fraunces, serif',
                color: 'var(--text)',
              }}
            >
              Your week in review
            </h2>
          </div>

          {/* Days logged visualization */}
          <div className="mb-6">
            <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>
              Days logged: {data.daysLogged}/7
            </p>
            <div className="flex justify-between px-2">
              {days.map((day, i) => (
                <DayDot key={i} day={day} filled={daysFilled[i]} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6">
            <StatRow
              icon={
                <svg className="w-4 h-4" style={{ color: 'var(--primary)' }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-3.536 4.536a2 2 0 01-2.828 0" />
                </svg>
              }
              label="Mood trend"
              value={`Averaged ${data.avgMood.toFixed(1)}, ${moodTrendText}`}
            />

            <StatRow
              icon={
                <svg className="w-4 h-4" style={{ color: 'var(--calm)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              }
              label="Journal"
              value={`${data.journalWords.toLocaleString()} words across ${data.journalEntries} entries`}
            />

            <StatRow
              icon={
                <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              }
              label="ERS progress"
              value={ersChangeText}
            />

            <div className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-warm)' }}>
                <svg className="w-4 h-4" style={{ color: '#D4973B' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.42 1.112-4.468 2.39-6.217.812-1.11 1.69-2.09 2.431-2.925.356-.4.67-.742.93-1.031.166.189.371.44.609.74.616.777 1.37 1.85 2.06 3.03.69 1.178 1.32 2.468 1.71 3.75.39 1.284.54 2.513.37 3.578C15.19 19.13 13.8 21 12 23z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Streak</p>
                <p className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>
                  {data.currentStreak} day streak — keep it going!
                </p>
              </div>
            </div>
          </div>

          {/* AI Insight */}
          {data.aiInsight && (
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: 'var(--bg-warm)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--primary-light)' }}
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--primary)' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--primary)' }}>
                    Weekly insight
                  </p>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text)' }}>
                    {data.aiInsight}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link
              href="/predictions"
              className="block w-full py-3 rounded-full text-center text-[15px] font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--primary)' }}
              onClick={handleDismiss}
            >
              See your forecast
            </Link>
            <button
              onClick={handleDismiss}
              className="text-[14px] py-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
