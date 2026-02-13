'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/track';

// ============================================================================
// Types
// ============================================================================

interface ExerciseNudgeProps {
  moodScore: number;
  onDismiss: () => void;
  onStart: (exerciseId: string) => void;
}

interface ExerciseRecommendation {
  id: string;
  name: string;
  description: string;
  duration: number;
  color: string;
  type: 'grounding' | 'breathing' | 'reframe' | 'gratitude' | 'self-compassion';
}

// ============================================================================
// Exercise Recommendations
// ============================================================================

const exerciseRecommendations: Record<number, ExerciseRecommendation> = {
  1: {
    id: 'grounding',
    name: 'Grounding',
    description: 'When things feel overwhelming, grounding can help bring you back to the present.',
    duration: 5,
    color: '#B86B64', // rose
    type: 'grounding',
  },
  2: {
    id: 'breathing',
    name: 'Breathing',
    description: 'A few minutes of calm breathing can help ease what you\'re feeling.',
    duration: 4,
    color: '#5E8DB0', // calm
    type: 'breathing',
  },
  3: {
    id: 'reframe',
    name: 'Reframe',
    description: 'You might find it helpful to explore what\'s on your mind from a new angle.',
    duration: 6,
    color: '#D4973B', // accent
    type: 'reframe',
  },
  4: {
    id: 'gratitude',
    name: 'Gratitude',
    description: 'Great day to capture what\'s going well and build on it.',
    duration: 5,
    color: '#5B8A72', // primary
    type: 'gratitude',
  },
  5: {
    id: 'self-compassion',
    name: 'Self-Compassion',
    description: 'A perfect moment to acknowledge how far you\'ve come.',
    duration: 6,
    color: '#7E71B5', // lavender
    type: 'self-compassion',
  },
};

// Map mood values (2, 4, 6, 8, 10) to recommendation keys (1-5)
function getMoodKey(moodScore: number): number {
  if (moodScore <= 2) return 1; // Struggling
  if (moodScore <= 4) return 2; // Low
  if (moodScore <= 6) return 3; // Okay
  if (moodScore <= 8) return 4; // Good
  return 5; // Great
}

// ============================================================================
// Icons
// ============================================================================

function GroundingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function BreathingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0 4.142-3.358 7.5-7.5 7.5S4.5 16.142 4.5 12 7.858 4.5 12 4.5s7.5 3.358 7.5 7.5z" />
    </svg>
  );
}

function ReframeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function GratitudeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function SelfCompassionIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 11.5h4.5m-2.25-2.25v4.5" />
    </svg>
  );
}

function ClockIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ExerciseIcon({ type, className, style }: { type: string; className?: string; style?: React.CSSProperties }) {
  switch (type) {
    case 'grounding':
      return <GroundingIcon className={className} style={style} />;
    case 'breathing':
      return <BreathingIcon className={className} style={style} />;
    case 'reframe':
      return <ReframeIcon className={className} style={style} />;
    case 'gratitude':
      return <GratitudeIcon className={className} style={style} />;
    case 'self-compassion':
      return <SelfCompassionIcon className={className} style={style} />;
    default:
      return <BreathingIcon className={className} style={style} />;
  }
}

// ============================================================================
// Frequency Control
// ============================================================================

const NUDGE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const NUDGE_STORAGE_KEY = 'paceful_last_nudge_shown';

export function shouldShowNudge(moodScore: number): boolean {
  // Always show for struggling/low moods
  if (moodScore <= 4) {
    return true;
  }

  // Check cooldown for other moods
  const lastShown = localStorage.getItem(NUDGE_STORAGE_KEY);
  if (!lastShown) {
    return true;
  }

  const lastShownTime = parseInt(lastShown, 10);
  const now = Date.now();
  return now - lastShownTime > NUDGE_COOLDOWN_MS;
}

export function markNudgeShown(): void {
  localStorage.setItem(NUDGE_STORAGE_KEY, Date.now().toString());
}

// ============================================================================
// Component
// ============================================================================

export default function ExerciseNudge({ moodScore, onDismiss, onStart }: ExerciseNudgeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const moodKey = getMoodKey(moodScore);
  const recommendation = exerciseRecommendations[moodKey];

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Track nudge shown
    trackEvent('exercise_nudge_shown', {
      moodScore,
      exerciseType: recommendation.type,
    });

    // Mark as shown for frequency control
    markNudgeShown();
  }, [moodScore, recommendation.type]);

  const handleDismiss = () => {
    trackEvent('exercise_nudge_dismissed', { exerciseType: recommendation.type });
    setIsClosing(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const handleStart = () => {
    trackEvent('exercise_nudge_accepted', { exerciseType: recommendation.type });
    setIsClosing(true);
    setTimeout(() => {
      onStart(recommendation.id);
    }, 300);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.3)',
          opacity: isVisible && !isClosing ? 1 : 0,
        }}
        onClick={handleDismiss}
      />

      {/* Card */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 transition-transform duration-400"
        style={{
          transform: isVisible && !isClosing ? 'translateY(0)' : 'translateY(100%)',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="rounded-t-3xl px-6 pt-6 pb-8 shadow-lg"
          style={{
            background: 'white',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center mb-5">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: 'var(--border)' }}
            />
          </div>

          {/* Content */}
          <div
            className="rounded-2xl p-5 mb-5"
            style={{
              background: `linear-gradient(135deg, ${recommendation.color}08 0%, ${recommendation.color}15 100%)`,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${recommendation.color}20` }}
              >
                <ExerciseIcon
                  type={recommendation.type}
                  className="w-6 h-6"
                  style={{ color: recommendation.color }}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3
                  className="text-[15px] font-semibold mb-1"
                  style={{ color: 'var(--text)' }}
                >
                  {recommendation.name}
                </h3>
                <p
                  className="text-[13px] leading-relaxed mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {recommendation.description}
                </p>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    ~{recommendation.duration} minutes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStart}
              className="flex-1 py-3.5 rounded-full font-semibold text-white transition-transform active:scale-[0.98]"
              style={{ background: 'var(--primary)' }}
            >
              Try it now
            </button>
            <button
              onClick={handleDismiss}
              className="px-5 py-3.5 text-[14px] font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .duration-400 {
          transition-duration: 400ms;
        }
      `}</style>
    </>
  );
}
