'use client';

import { useEffect, useState } from 'react';
import { Milestone } from '@/lib/streaks';

interface MilestoneToastProps {
  milestone: Milestone;
  onDismiss: () => void;
}

// SVG Icons for milestones
const MilestoneIcons = {
  star: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  flame: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color}>
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.42 1.112-4.468 2.39-6.217.812-1.11 1.69-2.09 2.431-2.925.356-.4.67-.742.93-1.031.166.189.371.44.609.74.616.777 1.37 1.85 2.06 3.03.69 1.178 1.32 2.468 1.71 3.75.39 1.284.54 2.513.37 3.578C15.19 19.13 13.8 21 12 23zm0-19c-.94 1.094-3 3.6-3 6.5C9 12.68 10.343 15 12 15s3-2.32 3-4.5c0-2.9-2.06-5.406-3-6.5z" />
    </svg>
  ),
  pen: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  heart: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  sparkle: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color}>
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75L5 3z" />
      <path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75L18 14z" />
    </svg>
  ),
  shield: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  trophy: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color}>
      <path d="M12 15c-1.93 0-3.5-1.57-3.5-3.5V5h7v6.5c0 1.93-1.57 3.5-3.5 3.5z" />
      <path d="M8.5 5H5c0 2.5 1.5 4.5 3.5 5V5z" />
      <path d="M15.5 5H19c0 2.5-1.5 4.5-3.5 5V5z" />
      <path d="M14 17h-4v2H8v2h8v-2h-2v-2z" />
    </svg>
  ),
  check: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  target: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  book: (color: string) => (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill={color}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM6.5 17H6v2.5c0 .28.22.5.5.5H20v-3H6.5z" />
    </svg>
  ),
};

// Confetti particle component
function ConfettiParticle({ color, delay, left }: { color: string; delay: number; left: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function MilestoneToast({ milestone, onDismiss }: MilestoneToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(onDismiss, 300);
  };

  const IconComponent = MilestoneIcons[milestone.icon];
  const confettiColors = ['#5B8A72', '#D4973B', '#B86B64', '#5E8DB0', '#7E71B5'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-300 pointer-events-auto ${
          isVisible && !isLeaving ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Toast Card */}
      <div
        className={`relative pointer-events-auto transition-all duration-300 ${
          isVisible && !isLeaving
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Confetti container */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confettiColors.map((color, i) =>
            [0, 1, 2].map((j) => (
              <ConfettiParticle
                key={`${i}-${j}`}
                color={color}
                delay={i * 0.1 + j * 0.15}
                left={10 + i * 20 + j * 5}
              />
            ))
          )}
        </div>

        {/* Card */}
        <div
          className="relative rounded-3xl p-8 text-center max-w-sm mx-4 overflow-hidden"
          style={{
            background: 'linear-gradient(165deg, #FFFFFF 0%, #F9F6F2 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Decorative gradient circle */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${milestone.color} 0%, transparent 70%)` }}
          />

          {/* Icon with glow */}
          <div
            className="relative mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{
              background: `linear-gradient(145deg, ${milestone.color}15, ${milestone.color}30)`,
              boxShadow: `0 0 30px ${milestone.color}30`,
            }}
          >
            {IconComponent && IconComponent(milestone.color)}
          </div>

          {/* Title */}
          <h2
            className="text-[22px] font-medium mb-2"
            style={{
              fontFamily: 'var(--font-fraunces), Fraunces, serif',
              color: 'var(--text)',
            }}
          >
            {milestone.title}
          </h2>

          {/* Description */}
          <p
            className="text-[15px] mb-6"
            style={{ color: 'var(--text-muted)' }}
          >
            {milestone.description}
          </p>

          {/* Achievement badge */}
          <p
            className="text-[12px] font-medium uppercase tracking-wider mb-6"
            style={{ color: milestone.color }}
          >
            Milestone Achieved
          </p>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="px-8 py-3 rounded-full text-[15px] font-medium text-white transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'var(--primary)' }}
          >
            Nice!
          </button>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
