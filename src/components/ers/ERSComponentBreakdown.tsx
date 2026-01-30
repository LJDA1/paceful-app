'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ComponentData {
  selfReflection: number | null;
  emotionalStability: number | null;
  trustOpenness: number | null;
  engagementConsistency: number | null;
  recoveryBehavior: number | null;
  socialReadiness: number | null;
}

interface ERSComponentBreakdownProps {
  components: ComponentData;
  totalScore: number;
  animated?: boolean;
}

// ============================================================================
// Component Configuration
// ============================================================================

const componentConfig = {
  selfReflection: {
    key: 'selfReflection' as const,
    label: 'Self-Reflection',
    weight: 0.25,
    color: {
      bar: 'bg-violet-500',
      light: 'bg-violet-100',
      text: 'text-violet-600',
      ring: 'ring-violet-200',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    description: 'Measures your ability to process emotions through journaling',
    details: [
      'Journal sentiment analysis',
      'Presence of personal insights',
      'Gratitude expressions',
      'Future-oriented thinking',
      'Writing depth and complexity',
    ],
    tip: 'Write regularly and honestly about your feelings to improve this score.',
  },
  emotionalStability: {
    key: 'emotionalStability' as const,
    label: 'Emotional Stability',
    weight: 0.20,
    color: {
      bar: 'bg-sky-500',
      light: 'bg-sky-100',
      text: 'text-sky-600',
      ring: 'ring-sky-200',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    description: 'Tracks consistency and trends in your mood over time',
    details: [
      'Mood variance (lower is better)',
      'Upward mood trends',
      'Average mood level',
      'Consistency of check-ins',
    ],
    tip: 'Regular mood tracking helps identify patterns. Stability improves naturally over time.',
  },
  trustOpenness: {
    key: 'trustOpenness' as const,
    label: 'Trust & Openness',
    weight: 0.20,
    color: {
      bar: 'bg-rose-500',
      light: 'bg-rose-100',
      text: 'text-rose-600',
      ring: 'ring-rose-200',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
    description: 'Reflects your willingness to be vulnerable and connect',
    details: [
      'Profile visibility settings',
      'Bio completeness',
      'Sharing ERS publicly',
      'Profile completion rate',
    ],
    tip: 'Opening up at your own pace is key. There\'s no rush to share more than you\'re comfortable with.',
  },
  engagementConsistency: {
    key: 'engagementConsistency' as const,
    label: 'Engagement',
    weight: 0.15,
    color: {
      bar: 'bg-amber-500',
      light: 'bg-amber-100',
      text: 'text-amber-600',
      ring: 'ring-amber-200',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
      </svg>
    ),
    description: 'Measures how consistently you engage with your healing practice',
    details: [
      'Current streak length',
      'Daily activity frequency',
      'Variety of activities',
      'Long-term commitment',
    ],
    tip: 'Consistency matters more than intensity. Even 5 minutes daily builds lasting habits.',
  },
  recoveryBehavior: {
    key: 'recoveryBehavior' as const,
    label: 'Recovery Behavior',
    weight: 0.10,
    color: {
      bar: 'bg-emerald-500',
      light: 'bg-emerald-100',
      text: 'text-emerald-600',
      ring: 'ring-emerald-200',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    description: 'Tracks your active participation in healing exercises',
    details: [
      'Exercises completed',
      'Helpfulness ratings given',
      'Mood improvement after exercises',
      'Exercise variety',
    ],
    tip: 'Try different exercises to find what works for you. Rating them helps us personalize recommendations.',
  },
  socialReadiness: {
    key: 'socialReadiness' as const,
    label: 'Social Readiness',
    weight: 0.10,
    color: {
      bar: 'bg-indigo-500',
      light: 'bg-indigo-100',
      text: 'text-indigo-600',
      ring: 'ring-indigo-200',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    description: 'Evaluates your readiness to form new connections',
    details: [
      'Active matches',
      'Message frequency',
      'Conversation quality',
      'Response engagement',
    ],
    tip: 'This develops naturally as you heal. Focus on other areas first - social readiness follows.',
  },
};

const componentOrder = [
  'selfReflection',
  'emotionalStability',
  'trustOpenness',
  'engagementConsistency',
  'recoveryBehavior',
  'socialReadiness',
] as const;

// ============================================================================
// Tooltip Component
// ============================================================================

function Tooltip({
  children,
  content,
  details,
  tip,
}: {
  children: React.ReactNode;
  content: string;
  details: string[];
  tip: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      setPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-help"
      >
        {children}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 w-72 p-4 bg-white rounded-xl shadow-xl border border-gray-100
            ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            left-0 transform transition-all duration-200 animate-in fade-in zoom-in-95`}
        >
          {/* Arrow */}
          <div
            className={`absolute left-6 w-3 h-3 bg-white border-gray-100 transform rotate-45
              ${position === 'top' ? 'bottom-0 translate-y-1/2 border-r border-b' : 'top-0 -translate-y-1/2 border-l border-t'}`}
          />

          {/* Content */}
          <p className="text-sm text-gray-700 mb-3">{content}</p>

          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              What we measure:
            </p>
            <ul className="space-y-1">
              {details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-gray-400 mt-0.5">•</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Tip:</span> {tip}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Progress Bar Component
// ============================================================================

function ComponentBar({
  config,
  score,
  totalScore,
  animated,
  delay,
}: {
  config: (typeof componentConfig)[keyof typeof componentConfig];
  score: number | null;
  totalScore: number;
  animated: boolean;
  delay: number;
}) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const hasData = score !== null;
  const percentage = hasData ? Math.round(score * 100) : 0;
  const contribution = hasData ? score * config.weight * 100 : 0;
  const contributionPercentage = totalScore > 0 ? (contribution / totalScore) * 100 : 0;

  useEffect(() => {
    if (!animated) {
      setAnimatedWidth(percentage);
      return;
    }

    const timer = setTimeout(() => {
      const duration = 800;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatedWidth(percentage * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [percentage, animated, delay]);

  return (
    <div className={`group ${!hasData ? 'opacity-60' : ''}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <Tooltip
          content={config.description}
          details={config.details}
          tip={config.tip}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${config.color.light} ${config.color.text}`}>
              {config.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              {config.label}
            </span>
            <svg
              className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
          </div>
        </Tooltip>

        <div className="flex items-center gap-3">
          {/* Weight Badge */}
          <span className="text-xs text-gray-400 tabular-nums">
            {Math.round(config.weight * 100)}% weight
          </span>

          {/* Score */}
          <span className={`text-sm font-semibold tabular-nums min-w-[3rem] text-right ${hasData ? 'text-gray-900' : 'text-gray-400'}`}>
            {hasData ? `${percentage}%` : '—'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${config.color.bar}`}
            style={{ width: `${animatedWidth}%` }}
          />
        </div>

        {/* Contribution indicator */}
        {hasData && contributionPercentage > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 border-l-2 border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${Math.min(animatedWidth, 98)}%` }}
          >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 whitespace-nowrap">
              <span className="text-[10px] font-medium text-gray-500 bg-white px-1 rounded">
                +{contribution.toFixed(1)} pts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* No Data Message */}
      {!hasData && (
        <p className="text-xs text-gray-400 mt-1.5 italic">
          Not enough data yet — keep using the app!
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Summary Stats Component
// ============================================================================

function SummaryStats({
  components,
  totalScore,
}: {
  components: ComponentData;
  totalScore: number;
}) {
  const activeComponents = componentOrder.filter(
    (key) => components[key] !== null
  ).length;

  const strongestComponent = componentOrder
    .filter((key) => components[key] !== null)
    .sort((a, b) => (components[b] || 0) - (components[a] || 0))[0];

  const weakestComponent = componentOrder
    .filter((key) => components[key] !== null)
    .sort((a, b) => (components[a] || 0) - (components[b] || 0))[0];

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
      <div className="text-center">
        <p className="text-2xl font-semibold text-gray-900">{activeComponents}/6</p>
        <p className="text-xs text-gray-500">Components Active</p>
      </div>
      <div className="text-center border-x border-gray-200">
        <div className="flex items-center justify-center gap-1.5">
          {strongestComponent && (
            <>
              <div className={`p-1 rounded ${componentConfig[strongestComponent].color.light} ${componentConfig[strongestComponent].color.text}`}>
                {componentConfig[strongestComponent].icon}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Strongest Area</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5">
          {weakestComponent && (
            <>
              <div className={`p-1 rounded ${componentConfig[weakestComponent].color.light} ${componentConfig[weakestComponent].color.text}`}>
                {componentConfig[weakestComponent].icon}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Growth Area</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ERSComponentBreakdown({
  components,
  totalScore,
  animated = true,
}: ERSComponentBreakdownProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Score Breakdown
            </h3>
            <p className="text-sm text-gray-500">
              Understand what contributes to your ERS
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-900">{totalScore.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Total Score</p>
          </div>
        </div>
      </div>

      {/* Component Bars */}
      <div className="p-6 space-y-5">
        {componentOrder.map((key, index) => (
          <ComponentBar
            key={key}
            config={componentConfig[key]}
            score={components[key]}
            totalScore={totalScore}
            animated={animated}
            delay={index * 100}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="px-6 pb-6">
        <SummaryStats components={components} totalScore={totalScore} />
      </div>

      {/* Educational Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">How scores are calculated</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Each component is weighted differently. Your total ERS is the weighted sum of all
              active components, normalized to 0-100. Hover over each component for details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
