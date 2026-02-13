'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/track';

// ============================================================================
// Types
// ============================================================================

interface JournalReflectionProps {
  reflection: string;
  loading: boolean;
  onDismiss?: () => void;
}

// ============================================================================
// Icons
// ============================================================================

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function XIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ReflectionSkeleton() {
  return (
    <div className="space-y-2.5">
      <div
        className="h-4 rounded-full animate-shimmer"
        style={{
          width: '90%',
          background: 'linear-gradient(90deg, var(--border-light) 0%, var(--bg-warm) 50%, var(--border-light) 100%)',
          backgroundSize: '200% 100%',
        }}
      />
      <div
        className="h-4 rounded-full animate-shimmer"
        style={{
          width: '75%',
          background: 'linear-gradient(90deg, var(--border-light) 0%, var(--bg-warm) 50%, var(--border-light) 100%)',
          backgroundSize: '200% 100%',
          animationDelay: '0.15s',
        }}
      />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function JournalReflection({ reflection, loading, onDismiss }: JournalReflectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Delay visibility for fade-in effect
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    // Track reflection shown
    if (!loading && reflection) {
      trackEvent('journal_reflection_shown');
    }

    return () => clearTimeout(timer);
  }, [loading, reflection]);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  return (
    <>
      <div
        className="rounded-2xl p-5 relative transition-all duration-400"
        style={{
          background: '#F3EFE9',
          opacity: isVisible && !isClosing ? 1 : 0,
          transform: isVisible && !isClosing ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {/* Dismiss button */}
        {onDismiss && !loading && (
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-stone-200"
            aria-label="Dismiss reflection"
          >
            <XIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
        )}

        {/* Icon and label */}
        <div className="flex items-center gap-2 mb-3">
          <SparkleIcon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span
            className="text-[12px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Pace&apos;s reflection
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <ReflectionSkeleton />
        ) : (
          <p
            className="text-[14px] italic leading-[1.7]"
            style={{ color: '#5C574F' }}
          >
            {reflection}
          </p>
        )}
      </div>

      <style jsx>{`
        .duration-400 {
          transition-duration: 400ms;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </>
  );
}

// ============================================================================
// Inline version for entry view
// ============================================================================

export function JournalReflectionInline({ reflection }: { reflection: string }) {
  if (!reflection) return null;

  return (
    <div
      className="rounded-xl p-4 mt-4"
      style={{ background: '#F3EFE9' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <SparkleIcon className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Pace&apos;s reflection
        </span>
      </div>
      <p
        className="text-[13px] italic leading-[1.7]"
        style={{ color: '#5C574F' }}
      >
        {reflection}
      </p>
    </div>
  );
}
