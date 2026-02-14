'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { trackConversion } from '@/lib/conversion-track';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

// ============================================================================
// SVG Icons
// ============================================================================

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function ChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function BrainIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.5m14.8-.2-.8.2m-13 0 .8-.2m0 0a9.001 9.001 0 0 0 12.4 0" />
    </svg>
  );
}

function DocumentIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function TrendUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}

function CodeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function BuildingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function HeartHandIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

// ============================================================================
// ERS Ring Visualization
// ============================================================================

function ERSRingVisual() {
  const score = 72;
  const circumference = 2 * Math.PI * 80;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-[200px] h-[200px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        {/* Background ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#F3EFE9"
          strokeWidth="12"
        />
        {/* Progress ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#5B8A72"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[42px] font-bold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          {score}
        </span>
        <span className="text-[13px]" style={{ color: '#9A938A' }}>
          ERS Score
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Phone Mockup Component
// ============================================================================

function PhoneMockup() {
  const score = 67;
  const circumference = 2 * Math.PI * 38;
  const progress = (score / 100) * circumference;

  return (
    <div
      className="relative mt-12 lg:mt-16 flex justify-center lg:justify-start"
      style={{
        animation: 'float 4s ease-in-out infinite',
      }}
    >
      {/* Glow effect behind phone */}
      <div
        className="absolute inset-0 flex justify-center lg:justify-start"
        style={{
          background: 'radial-gradient(ellipse 300px 400px at center, rgba(91,138,114,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Phone frame */}
      <svg
        viewBox="0 0 280 560"
        className="w-[220px] h-[440px] sm:w-[260px] sm:h-[520px] lg:w-[280px] lg:h-[560px]"
        style={{
          filter: 'drop-shadow(0 20px 60px rgba(91,138,114,0.15))',
        }}
      >
        {/* Phone body */}
        <rect
          x="0"
          y="0"
          width="280"
          height="560"
          rx="40"
          fill="#FFFFFF"
          stroke="#E8E2DA"
          strokeWidth="2"
        />

        {/* Screen area */}
        <rect
          x="12"
          y="12"
          width="256"
          height="536"
          rx="32"
          fill="#F9F6F2"
        />

        {/* Status bar */}
        <g>
          {/* Time */}
          <text x="28" y="38" fontSize="12" fontWeight="600" fill="#1F1D1A">9:41</text>
          {/* Signal dots */}
          <circle cx="220" cy="34" r="2" fill="#5B8A72" />
          <circle cx="228" cy="34" r="2" fill="#5B8A72" />
          <circle cx="236" cy="34" r="2" fill="#5B8A72" />
          <circle cx="244" cy="34" r="2" fill="#9A938A" />
          {/* Battery */}
          <rect x="252" y="30" width="16" height="8" rx="2" fill="none" stroke="#1F1D1A" strokeWidth="1" />
          <rect x="254" y="32" width="10" height="4" rx="1" fill="#5B8A72" />
        </g>

        {/* Greeting */}
        <text x="28" y="80" fontSize="14" fill="#9A938A">Good morning,</text>
        <text x="28" y="100" fontSize="18" fontWeight="600" fill="#1F1D1A">Sarah</text>

        {/* ERS Card */}
        <rect x="20" y="120" width="240" height="200" rx="20" fill="#FFFFFF" />

        {/* ERS Ring - centered in card */}
        <g transform="translate(140, 200)">
          {/* Track */}
          <circle
            cx="0"
            cy="0"
            r="38"
            fill="none"
            stroke="#F0EBE4"
            strokeWidth="8"
          />
          {/* Progress - animated via CSS */}
          <circle
            cx="0"
            cy="0"
            r="38"
            fill="none"
            stroke="#5B8A72"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform="rotate(-90)"
            style={{
              animation: 'ersRingFill 1.5s ease-out forwards',
            }}
          />
          {/* Score text */}
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fontSize="28"
            fontWeight="700"
            fill="#1F1D1A"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {score}
          </text>
        </g>

        {/* Stage label */}
        <rect x="100" y="258" width="80" height="24" rx="12" fill="rgba(91,138,114,0.1)" />
        <text x="140" y="274" textAnchor="middle" fontSize="11" fontWeight="500" fill="#5B8A72">Rebuilding</text>

        {/* Stat cards row */}
        <g transform="translate(20, 340)">
          {/* Streak card */}
          <rect x="0" y="0" width="115" height="60" rx="12" fill="#FFFFFF" />
          {/* Flame icon */}
          <circle cx="20" cy="30" r="12" fill="rgba(212,151,59,0.1)" />
          <text x="20" y="34" textAnchor="middle" fontSize="12">🔥</text>
          <text x="42" y="26" fontSize="10" fill="#9A938A">Streak</text>
          <text x="42" y="42" fontSize="14" fontWeight="600" fill="#1F1D1A">7 days</text>

          {/* Mood card */}
          <rect x="125" y="0" width="115" height="60" rx="12" fill="#FFFFFF" />
          {/* Up arrow icon */}
          <circle cx="145" cy="30" r="12" fill="rgba(91,138,114,0.1)" />
          <path d="M145 35 L145 25 M141 29 L145 25 L149 29" stroke="#5B8A72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="167" y="26" fontSize="10" fill="#9A938A">Mood</text>
          <text x="167" y="42" fontSize="14" fontWeight="600" fill="#5B8A72">Good</text>
        </g>

        {/* Quick mood log hint */}
        <rect x="20" y="420" width="240" height="50" rx="14" fill="#FFFFFF" />
        <text x="40" y="450" fontSize="13" fontWeight="500" fill="#1F1D1A">How are you feeling?</text>
        <circle cx="230" cy="445" r="14" fill="rgba(91,138,114,0.1)" />
        <text x="230" y="450" textAnchor="middle" fontSize="14">+</text>

        {/* Bottom nav hint */}
        <g transform="translate(0, 490)">
          <rect x="20" y="0" width="240" height="50" rx="0" fill="#F9F6F2" />
          <circle cx="60" cy="25" r="4" fill="#5B8A72" />
          <circle cx="110" cy="25" r="4" fill="#D4D0C8" />
          <circle cx="170" cy="25" r="4" fill="#D4D0C8" />
          <circle cx="220" cy="25" r="4" fill="#D4D0C8" />
        </g>

        {/* Home indicator */}
        <rect x="105" y="530" width="70" height="5" rx="2.5" fill="#1F1D1A" opacity="0.2" />
      </svg>

      {/* CSS Keyframes - injected via style tag */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ersRingFill {
          from { stroke-dashoffset: ${circumference}; }
          to { stroke-dashoffset: ${circumference - progress}; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Product Preview Tabs
// ============================================================================

type PreviewTab = 'dashboard' | 'chat' | 'progress';

function ProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('dashboard');

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'chat', label: 'Talk to Pace' },
    { id: 'progress', label: 'Your progress' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-6 py-2.5 rounded-full text-[14px] font-medium transition-all"
            style={{
              background: activeTab === tab.id ? '#5B8A72' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#5C574F',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(91,138,114,0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview Container */}
      <div className="max-w-[480px] mx-auto">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid #F0EBE4',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            height: '520px',
          }}
        >
          {/* Dashboard Preview */}
          <div
            style={{
              opacity: activeTab === 'dashboard' ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: activeTab === 'dashboard' ? 'block' : 'none',
            }}
          >
            <DashboardPreview />
          </div>

          {/* Chat Preview */}
          <div
            style={{
              opacity: activeTab === 'chat' ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: activeTab === 'chat' ? 'block' : 'none',
            }}
          >
            <ChatPreview />
          </div>

          {/* Progress Preview */}
          <div
            style={{
              opacity: activeTab === 'progress' ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: activeTab === 'progress' ? 'block' : 'none',
            }}
          >
            <ProgressPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  const score = 67;
  const circumference = 2 * Math.PI * 50;
  const progress = (score / 100) * circumference;

  return (
    <div className="p-6" style={{ background: '#F9F6F2', height: '520px' }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[13px] mb-1" style={{ color: '#9A938A' }}>Good morning,</p>
        <p className="text-[20px] font-semibold" style={{ color: '#1F1D1A' }}>Sarah</p>
      </div>

      {/* ERS Card */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <div className="flex items-center gap-6">
          {/* Ring */}
          <div className="relative w-[100px] h-[100px] flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#F0EBE4" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="#5B8A72" strokeWidth="10"
                strokeLinecap="round" strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>{score}</span>
            </div>
          </div>
          {/* Stats */}
          <div className="flex-1">
            <div
              className="inline-block px-3 py-1 rounded-full text-[11px] font-medium mb-2"
              style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
            >
              Rebuilding
            </div>
            <p className="text-[13px]" style={{ color: '#9A938A' }}>7 day streak</p>
          </div>
        </div>
      </div>

      {/* Mood Selector */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <p className="text-[14px] font-medium mb-3" style={{ color: '#1F1D1A' }}>How are you feeling?</p>
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[13px]"
              style={{
                background: i === 4 ? '#5B8A72' : '#F3EFE9',
                color: i === 4 ? '#FFFFFF' : '#5C574F',
              }}
            >
              {i}
            </div>
          ))}
        </div>
      </div>

      {/* Insight Card */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,151,59,0.1)' }}
          >
            <SparkleIcon className="w-4 h-4" style={{ color: '#D4973B' }} />
          </div>
          <div>
            <p className="text-[13px] font-medium mb-1" style={{ color: '#1F1D1A' }}>Weekly insight</p>
            <p className="text-[12px] leading-relaxed" style={{ color: '#9A938A' }}>
              Your mood tends to be highest on days you journal in the morning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="p-6 flex flex-col" style={{ background: '#F9F6F2', height: '520px' }}>
      {/* Header */}
      <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #F0EBE4' }}>
        <p className="text-[16px] font-semibold" style={{ color: '#1F1D1A' }}>Pace</p>
        <p className="text-[12px]" style={{ color: '#9A938A' }}>Your recovery companion</p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-hidden">
        {/* Pace message 1 */}
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#5B8A72' }}
          >
            <span className="text-white text-[12px] font-semibold">P</span>
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"
            style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: '#1F1D1A' }}>
              Hey Sarah. I noticed your mood has been improving this week. What do you think is helping?
            </p>
          </div>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]"
            style={{ background: '#5B8A72' }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: '#FFFFFF' }}>
              I think journaling before bed is making a difference
            </p>
          </div>
        </div>

        {/* Pace message 2 */}
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#5B8A72' }}
          >
            <span className="text-white text-[12px] font-semibold">P</span>
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"
            style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: '#1F1D1A' }}>
              That&apos;s a real pattern I&apos;m seeing in your data too. Three of your best days followed evening journal entries.
            </p>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#5B8A72' }}
          >
            <span className="text-white text-[12px] font-semibold">P</span>
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3"
            style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
          >
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Input hint */}
      <div
        className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <span className="text-[13px]" style={{ color: '#9A938A' }}>Ask Pace anything...</span>
      </div>
    </div>
  );
}

function ProgressPreview() {
  const dimensions = [
    { label: 'Emotional Stability', score: 72, color: '#5B8A72' },
    { label: 'Self-Reflection', score: 68, color: '#5B8A72' },
    { label: 'Coping Capacity', score: 84, color: '#5B8A72' },
    { label: 'Behavioral Engagement', score: 45, color: '#D4973B' },
    { label: 'Social Readiness', score: 38, color: '#B86B64' },
  ];

  const weeklyData = [42, 48, 55, 67];

  return (
    <div className="p-6" style={{ background: '#F9F6F2', height: '520px' }}>
      {/* Header */}
      <div className="mb-5">
        <p className="text-[18px] font-semibold" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>Your ERS Breakdown</p>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-3 mb-5">
        {dimensions.map((dim) => (
          <div key={dim.label}>
            <div className="flex justify-between text-[12px] mb-1">
              <span style={{ color: '#5C574F' }}>{dim.label}</span>
              <span style={{ color: dim.color, fontWeight: 600 }}>{dim.score}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#F0EBE4' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${dim.score}%`, background: dim.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <p className="text-[13px] font-medium mb-3" style={{ color: '#1F1D1A' }}>4-Week Trend</p>
        <div className="flex items-end justify-between h-16 gap-2">
          {weeklyData.map((value, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${(value / 100) * 64}px`,
                  background: i === weeklyData.length - 1 ? '#5B8A72' : '#D4E8DC',
                }}
              />
              <span className="text-[10px]" style={{ color: '#9A938A' }}>W{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Area */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(91,138,114,0.08)', border: '1px solid rgba(91,138,114,0.15)' }}
      >
        <p className="text-[12px] font-medium mb-1" style={{ color: '#5B8A72' }}>Focus area</p>
        <p className="text-[13px]" style={{ color: '#1F1D1A' }}>
          Your coping capacity improved 12 points this week. Keep it up!
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LandingPage() {
  const scrollMidpointRef = useRef<HTMLDivElement>(null);
  const hasTrackedScroll = useRef(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  // Track landing page view
  useEffect(() => {
    trackConversion('landing_view');
  }, []);

  // Track scroll depth at 50%
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTrackedScroll.current) {
          hasTrackedScroll.current = true;
          trackConversion('scroll_50');
        }
      },
      { threshold: 0.1 }
    );

    if (scrollMidpointRef.current) {
      observer.observe(scrollMidpointRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCtaClick = (button: string) => {
    trackConversion('cta_click', { button });
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      <MarketingNav />

      {/* Hero Section */}
      <section className="pt-[88px] pb-16 px-6" style={{ background: '#F9F6F2' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium mb-6"
                style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
              >
                Science-backed emotional recovery
              </div>

              {/* Headline */}
              <h1
                className="text-[42px] sm:text-[52px] leading-[1.1] font-bold mb-5"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Heal at your pace.
                <br />
                <span style={{ color: '#D4973B' }}>See the progress.</span>
              </h1>

              {/* Subtitle */}
              <p
                className="text-[17px] leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
                style={{ color: '#5C574F' }}
              >
                Track your emotional journey, understand your patterns, and know
                when you&apos;re ready — backed by clinical research.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/signup"
                  onClick={() => handleCtaClick('hero')}
                  className="px-7 py-3.5 text-[16px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
                  style={{ background: '#5B8A72' }}
                >
                  Begin healing
                </Link>
                <button
                  onClick={scrollToHowItWorks}
                  className="px-7 py-3.5 text-[16px] font-semibold rounded-full transition-colors"
                  style={{
                    background: 'transparent',
                    color: '#5B8A72',
                    border: '2px solid #5B8A72',
                  }}
                >
                  See how it works
                </button>
              </div>

            </div>

            {/* Right - Phone Mockup */}
            <div className="flex-shrink-0">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
            {/* 5 Dimensions */}
            <div className="text-center lg:border-r lg:border-stone-200 lg:pr-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                5 Dimensions
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Clinical recovery scoring
              </div>
            </div>

            {/* AI-Powered */}
            <div className="text-center lg:border-r lg:border-stone-200 lg:px-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                AI-Powered
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Pattern recognition
              </div>
            </div>

            {/* Private by design */}
            <div className="text-center lg:border-r lg:border-stone-200 lg:px-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Private
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Your data stays yours
              </div>
            </div>

            {/* Adaptive */}
            <div className="text-center lg:pl-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Adaptive
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Gets smarter with you
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll tracking midpoint */}
      <div ref={scrollMidpointRef} className="h-0" aria-hidden="true" />

      {/* How It Works */}
      <section ref={howItWorksRef} className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            How Paceful works
          </h2>
          <p
            className="text-[16px] text-center mb-12 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            A simple daily practice that helps you understand your emotional journey.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 1
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <HeartIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Track daily
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                Log your mood and journal your thoughts. It takes just a few minutes each day.
              </p>
            </div>

            {/* Step 2 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 2
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <SparkleIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Get insights
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                AI analyzes your patterns to surface personalized insights about your recovery.
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 3
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <ChartIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                See your path
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                Watch your ERS score grow and see predictions for when you&apos;ll reach each milestone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 px-6" style={{ background: '#F9F6F2' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-3"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            This isn&apos;t another mood tracker
          </h2>
          <p
            className="text-[16px] text-center mb-12"
            style={{ color: '#9A938A' }}
          >
            Here&apos;s what makes Paceful different
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-[1080px] mx-auto">
            {/* Card 1: It remembers you */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0EBE4',
                borderTop: '3px solid #5B8A72',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#5B8A72' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <h3
                className="text-[17px] font-semibold mb-2"
                style={{ color: '#1F1D1A' }}
              >
                It remembers you
              </h3>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: '#5C574F' }}
              >
                Pace, your AI companion, builds a persistent understanding of your triggers, patterns, and what helps you heal. Every conversation makes it more attuned to you.
              </p>
            </div>

            {/* Card 2: It measures what matters */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0EBE4',
                borderTop: '3px solid #D4973B',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(212,151,59,0.1)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#D4973B' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21l3.75-3.75" />
                </svg>
              </div>
              <h3
                className="text-[17px] font-semibold mb-2"
                style={{ color: '#1F1D1A' }}
              >
                It measures what matters
              </h3>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: '#5C574F' }}
              >
                Most apps track mood. Paceful scores your recovery across 5 clinical dimensions — from emotional stability to coping capacity — so you can see the full picture.
              </p>
            </div>

            {/* Card 3: It gets smarter over time */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0EBE4',
                borderTop: '3px solid #7E9BB8',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(126,155,184,0.1)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#7E9BB8' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
              </div>
              <h3
                className="text-[17px] font-semibold mb-2"
                style={{ color: '#1F1D1A' }}
              >
                It gets smarter over time
              </h3>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: '#5C574F' }}
              >
                Every entry feeds our pattern discovery engine. The longer you use Paceful, the more accurate your insights, predictions, and recommendations become.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* See It In Action */}
      <section className="py-20 px-6" style={{ background: '#F3EFE9' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            See it in action
          </h2>
          <p
            className="text-[16px] text-center mb-10 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            A daily companion that understands your journey.
          </p>
          <ProductPreview />
        </div>
      </section>

      {/* ERS Explainer */}
      <section className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left - Ring */}
            <div className="flex-shrink-0">
              <div className="relative w-[220px] h-[220px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
                  {/* Healing segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#7E71B5"
                    strokeWidth="16"
                    strokeDasharray={`${(35 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                  {/* Rebuilding segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#D4973B"
                    strokeWidth="16"
                    strokeDasharray={`${(30 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeDashoffset={`-${(35 / 100) * 2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                  {/* Ready segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#5B8A72"
                    strokeWidth="16"
                    strokeDasharray={`${(35 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeDashoffset={`-${(65 / 100) * 2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-[14px] font-medium"
                    style={{ color: '#5C574F' }}
                  >
                    ERS
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="flex-1">
              <h2
                className="text-[32px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Your Emotional Readiness Score
              </h2>
              <p
                className="text-[16px] leading-relaxed mb-6"
                style={{ color: '#5C574F' }}
              >
                The ERS is a comprehensive measure of your emotional recovery progress,
                calculated from 6 key dimensions including emotional stability, self-reflection,
                and social readiness.
              </p>

              {/* Three stages */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#7E71B5' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Healing (0-35)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Processing and understanding
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#D4973B' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Rebuilding (35-65)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Growing and strengthening
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#5B8A72' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Ready (65-100)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Emotionally prepared
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Powered by intelligent analysis
          </h2>
          <p
            className="text-[16px] text-center mb-12 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            Advanced AI helps you understand your emotional patterns without judgment.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<BrainIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Personalized insights"
              description="AI analyzes your unique patterns to provide tailored guidance for your recovery journey."
            />
            <FeatureCard
              icon={<DocumentIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Sentiment analysis"
              description="Your journal entries are analyzed to understand emotional themes and track progress over time."
            />
            <FeatureCard
              icon={<TrendUpIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Recovery forecast"
              description="Predict when you'll reach each milestone based on your engagement and progress patterns."
            />
          </div>
        </div>
      </section>

      {/* For Platforms Section */}
      <section className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <div className="flex-1 lg:max-w-[60%]">
              <p
                className="text-[12px] uppercase tracking-wider mb-3"
                style={{ color: '#9A938A' }}
              >
                For platforms
              </p>
              <h2
                className="text-[28px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Bring emotional readiness to your users
              </h2>
              <p
                className="text-[15px] leading-relaxed mb-6"
                style={{ color: '#5C574F' }}
              >
                Paceful&apos;s API lets dating apps, therapy platforms, and HR tools integrate
                emotional readiness scoring directly into their products. One API call returns
                a user&apos;s ERS across 5 dimensions.
              </p>
              <div className="flex gap-6">
                <Link
                  href="/api-docs"
                  className="text-[14px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ color: '#5B8A72' }}
                >
                  Explore the API
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/design-partners"
                  className="text-[14px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ color: '#5B8A72' }}
                >
                  Become a partner
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right - Code block */}
            <div className="flex-shrink-0 w-full lg:w-auto lg:max-w-[40%]">
              <div
                className="rounded-2xl p-5 font-mono text-[13px] leading-relaxed overflow-x-auto"
                style={{ background: '#1F1D1A' }}
              >
                <p style={{ color: '#9A938A' }}>GET /api/v1/ers/&#123;userId&#125;</p>
                <br />
                <p style={{ color: '#9A938A' }}>&#123;</p>
                <p className="pl-4">
                  <span style={{ color: '#9A938A' }}>&quot;ers_score&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#D4973B' }}>67</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-4">
                  <span style={{ color: '#9A938A' }}>&quot;stage&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#7BA896' }}>&quot;rebuilding&quot;</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-4">
                  <span style={{ color: '#9A938A' }}>&quot;dimensions&quot;</span>
                  <span style={{ color: '#9A938A' }}>: &#123;</span>
                </p>
                <p className="pl-8">
                  <span style={{ color: '#9A938A' }}>&quot;emotional_stability&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#D4973B' }}>72</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-8">
                  <span style={{ color: '#9A938A' }}>&quot;self_reflection&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#D4973B' }}>58</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-8" style={{ color: '#5C574F' }}>...</p>
                <p className="pl-4" style={{ color: '#9A938A' }}>&#125;</p>
                <p style={{ color: '#9A938A' }}>&#125;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                5
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                ERS dimensions
              </p>
            </div>
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                AI
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                Powered insights
              </p>
            </div>
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                100%
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                Research-backed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6" style={{ background: '#F3EFE9' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-[36px] font-bold mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            You don&apos;t have to do this alone
          </h2>
          <p
            className="text-[16px] mb-8"
            style={{ color: '#5C574F' }}
          >
            Paceful gives you the tools, the insights, and a companion that understands your journey.
          </p>
          <Link
            href="/auth/signup"
            onClick={() => handleCtaClick('footer_cta')}
            className="inline-block px-8 py-4 text-[17px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
            style={{ background: '#5B8A72' }}
          >
            Begin healing — it&apos;s free
          </Link>
          <p className="mt-4 text-[13px]" style={{ color: '#9A938A' }}>
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

// ============================================================================
// Component: Feature Card
// ============================================================================

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 rounded-[24px]"
      style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(91,138,114,0.1)' }}
      >
        {icon}
      </div>
      <h3
        className="text-[18px] font-semibold mb-2"
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
        {description}
      </p>
    </div>
  );
}

