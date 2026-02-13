'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface ApplicationForm {
  companyName: string;
  contactName: string;
  email: string;
  companyType: string;
  otherCompanyType: string;
  currentUsers: string;
  useCase: string;
  whyInterested: string;
}

// ============================================================================
// SVG Icons
// ============================================================================

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ApiIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
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

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

// ============================================================================
// Components
// ============================================================================

function BenefitCard({
  title,
  items,
  icon,
  iconBg,
  iconColor
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-6 transition-all hover:shadow-md"
      style={{ border: '1px solid #F0EBE4' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <h3
        className="text-[17px] font-semibold mb-4"
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-[14px]" style={{ color: '#5C574F' }}>
            <CheckIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#5B8A72' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UseCaseCard({
  title,
  description,
  icon,
  iconBg,
  iconColor
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-6"
      style={{ border: '1px solid #F0EBE4' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <h3
        className="text-[17px] font-semibold mb-2"
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

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid #F0EBE4' }} className="last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium text-[15px]" style={{ color: '#1F1D1A' }}>{question}</span>
        <svg
          className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="#9A938A"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <p className="pb-5 text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>{answer}</p>
      )}
    </div>
  );
}

// ============================================================================
// API Code Preview
// ============================================================================

function ApiCodePreview() {
  const codeExample = `{
  "user_id": "usr_abc123",
  "ers_score": 72,
  "emotional_readiness": "ready_with_caution",
  "components": {
    "stability": 78,
    "openness": 65,
    "self_awareness": 74
  },
  "prediction": {
    "ready_for_dating": true,
    "confidence": 0.84,
    "recommended_wait_days": 14
  },
  "risk_factors": [
    "recent_contact_with_ex",
    "unresolved_anger"
  ]
}`;

  return (
    <div
      className="rounded-2xl p-6 overflow-hidden"
      style={{ background: '#1F1D1A' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ background: '#B86B64' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#D4973B' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#5B8A72' }} />
        <span className="ml-2 text-[12px]" style={{ color: '#9A938A' }}>GET /api/v1/ers/:userId</span>
      </div>
      <pre className="text-[13px] leading-relaxed overflow-x-auto">
        <code>
          {codeExample.split('\n').map((line, i) => {
            // Simple syntax highlighting
            let highlighted = line;
            // Keys
            highlighted = highlighted.replace(/"([^"]+)":/g, '<span style="color:#7BA896">"$1"</span>:');
            // String values
            highlighted = highlighted.replace(/: "([^"]+)"/g, ': <span style="color:#D4973B">"$1"</span>');
            // Numbers
            highlighted = highlighted.replace(/: (\d+\.?\d*)/g, ': <span style="color:#A5C4B8">$1</span>');
            // Booleans
            highlighted = highlighted.replace(/(true|false)/g, '<span style="color:#B86B64">$1</span>');
            // Array items (strings)
            highlighted = highlighted.replace(/"([^"]+)"(,?\s*$)/g, '<span style="color:#D4973B">"$1"</span>$2');

            return (
              <div key={i} dangerouslySetInnerHTML={{ __html: highlighted }} style={{ color: '#E8E2DA' }} />
            );
          })}
        </code>
      </pre>
    </div>
  );
}

// ============================================================================
// Interactive API Demo
// ============================================================================

type DemoScenario = 'dating' | 'hr' | 'therapy';

interface ScenarioData {
  label: string;
  request: string;
  response: string;
}

const DEMO_SCENARIOS: Record<DemoScenario, ScenarioData> = {
  dating: {
    label: 'Dating App',
    request: `GET /api/v1/ers/usr_sarah_m
Authorization: Bearer pk_your_api_key`,
    response: `{
  "ers_score": 42,
  "ers_stage": "healing",
  "recommendation": "gate_matches",
  "dimensions": {
    "mood_stability": 38,
    "engagement": 52,
    "self_awareness": 45
  },
  "risk_factors": ["recent_breakup", "low_mood_stability"],
  "confidence": 0.87
}`,
  },
  hr: {
    label: 'HR Platform',
    request: `GET /api/v1/analytics/summary
Authorization: Bearer pk_your_api_key
X-Organization-Id: org_acme_corp`,
    response: `{
  "team_wellness_score": 68,
  "total_employees": 10,
  "stage_distribution": {
    "healing": 3,
    "rebuilding": 5,
    "ready": 2
  },
  "average_ers_score": 58,
  "employees_needing_support": 1,
  "trend": "improving",
  "week_over_week_change": +4.2
}`,
  },
  therapy: {
    label: 'Therapy Tool',
    request: `GET /api/v1/ers/usr_client_123/trajectory
Authorization: Bearer pk_your_api_key`,
    response: `{
  "client_id": "usr_client_123",
  "current_stage": "rebuilding",
  "previous_stage": "healing",
  "days_in_current_stage": 23,
  "trajectory": [
    { "week": 1, "ers_score": 28 },
    { "week": 2, "ers_score": 35 },
    { "week": 3, "ers_score": 42 },
    { "week": 4, "ers_score": 54 }
  ],
  "patterns": [
    {
      "type": "habit_impact",
      "description": "Journaling 3x/week correlates with faster progress",
      "confidence": 0.82
    }
  ],
  "predicted_ready_date": "2026-03-15"
}`,
  },
};

function InteractiveApiDemo() {
  const [activeScenario, setActiveScenario] = useState<DemoScenario>('dating');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasAnimated, setHasAnimated] = useState<Record<DemoScenario, boolean>>({
    dating: false,
    hr: false,
    therapy: false,
  });

  useEffect(() => {
    const scenario = DEMO_SCENARIOS[activeScenario];

    // If already animated this scenario, show full response immediately
    if (hasAnimated[activeScenario]) {
      setDisplayedResponse(scenario.response);
      return;
    }

    // Start typewriter effect
    setDisplayedResponse('');
    setIsTyping(true);

    let index = 0;
    const chars = scenario.response.split('');

    const interval = setInterval(() => {
      if (index < chars.length) {
        setDisplayedResponse(prev => prev + chars[index]);
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setHasAnimated(prev => ({ ...prev, [activeScenario]: true }));
      }
    }, 12);

    return () => clearInterval(interval);
  }, [activeScenario, hasAnimated]);

  const handleScenarioChange = (scenario: DemoScenario) => {
    if (scenario !== activeScenario) {
      setActiveScenario(scenario);
    }
  };

  // Syntax highlighting for JSON
  const highlightJson = (code: string) => {
    return code.split('\n').map((line, i) => {
      let highlighted = line;
      // Keys
      highlighted = highlighted.replace(/"([^"]+)":/g, '<span style="color:#5B8A72">"$1"</span>:');
      // String values
      highlighted = highlighted.replace(/: "([^"]+)"/g, ': <span style="color:#D4973B">"$1"</span>');
      // Numbers (including negative)
      highlighted = highlighted.replace(/: (-?\d+\.?\d*)/g, ': <span style="color:#A5C4B8">$1</span>');
      // Standalone numbers in arrays
      highlighted = highlighted.replace(/\{ "week": <span style="color:#5B8A72">"week"<\/span>: (\d+)/g, '{ "week": $1');
      // Booleans
      highlighted = highlighted.replace(/(true|false)/g, '<span style="color:#B86B64">$1</span>');
      return (
        <div key={i} dangerouslySetInnerHTML={{ __html: highlighted }} />
      );
    });
  };

  return (
    <section className="py-20" style={{ background: '#F9F6F2' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            See it in action
          </h2>
          <p className="text-[16px] max-w-2xl mx-auto" style={{ color: '#5C574F' }}>
            Here&apos;s how Paceful integrates with your platform
          </p>
        </div>

        {/* Scenario Tabs */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex rounded-full p-1"
            style={{ background: '#F0EBE4' }}
          >
            {(['dating', 'hr', 'therapy'] as DemoScenario[]).map((scenario) => (
              <button
                key={scenario}
                onClick={() => handleScenarioChange(scenario)}
                className="px-5 py-2.5 rounded-full text-[14px] font-medium transition-all"
                style={{
                  background: activeScenario === scenario ? '#5B8A72' : 'transparent',
                  color: activeScenario === scenario ? '#FFFFFF' : '#5C574F',
                }}
              >
                {DEMO_SCENARIOS[scenario].label}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Mock Screen */}
          <div
            className="transition-all duration-300"
            style={{
              opacity: 1,
              transform: 'translateX(0)',
            }}
          >
            {activeScenario === 'dating' && <DatingAppMock />}
            {activeScenario === 'hr' && <HRPlatformMock />}
            {activeScenario === 'therapy' && <TherapyToolMock />}
          </div>

          {/* Right Side - API Terminal */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#1F1D1A' }}
          >
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #2A2826' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: '#B86B64' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#D4973B' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#5B8A72' }} />
              <span className="ml-2 text-[12px]" style={{ color: '#9A938A' }}>API Request</span>
            </div>

            {/* Request */}
            <div className="p-4" style={{ borderBottom: '1px solid #2A2826' }}>
              <pre className="text-[13px] font-mono" style={{ color: '#E8E2DA' }}>
                {DEMO_SCENARIOS[activeScenario].request.split('\n').map((line, i) => {
                  if (line.startsWith('GET') || line.startsWith('POST')) {
                    const [method, path] = line.split(' ');
                    return (
                      <div key={i}>
                        <span style={{ color: '#5B8A72' }}>{method}</span>{' '}
                        <span style={{ color: '#D4973B' }}>{path}</span>
                      </div>
                    );
                  }
                  if (line.includes(':')) {
                    const [key, ...valueParts] = line.split(':');
                    const value = valueParts.join(':');
                    return (
                      <div key={i}>
                        <span style={{ color: '#9A938A' }}>{key}:</span>
                        <span style={{ color: '#A5C4B8' }}>{value}</span>
                      </div>
                    );
                  }
                  return <div key={i}>{line}</div>;
                })}
              </pre>
            </div>

            {/* Response Header */}
            <div className="px-4 py-2" style={{ background: '#252320' }}>
              <span className="text-[12px] font-mono" style={{ color: '#5B8A72' }}>
                200 OK
              </span>
              <span className="text-[12px] ml-3" style={{ color: '#9A938A' }}>
                Response
              </span>
            </div>

            {/* Response Body */}
            <div className="p-4 max-h-[320px] overflow-y-auto">
              <pre className="text-[13px] font-mono leading-relaxed" style={{ color: '#E8E2DA' }}>
                {highlightJson(displayedResponse)}
                {isTyping && (
                  <span
                    className="inline-block w-2 h-4 ml-0.5 animate-pulse"
                    style={{ background: '#5B8A72' }}
                  />
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Mock Screen Components
// ============================================================================

function DatingAppMock() {
  return (
    <div
      className="rounded-3xl p-1 mx-auto max-w-[320px]"
      style={{
        background: 'linear-gradient(135deg, #E8E2DA 0%, #F0EBE4 100%)',
        boxShadow: '0 20px 40px rgba(31,29,26,0.1)',
      }}
    >
      <div
        className="rounded-[20px] overflow-hidden"
        style={{ background: '#FFFFFF' }}
      >
        {/* Phone Status Bar */}
        <div className="flex items-center justify-between px-4 py-2" style={{ background: '#F9F6F2' }}>
          <span className="text-[12px] font-medium" style={{ color: '#5C574F' }}>9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded-sm" style={{ background: '#5C574F' }} />
          </div>
        </div>

        {/* App Header */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0EBE4' }}>
          <span className="text-[14px] font-semibold" style={{ color: '#1F1D1A' }}>Discover</span>
        </div>

        {/* Profile Card */}
        <div className="p-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#F9F6F2', border: '1px solid #F0EBE4' }}
          >
            {/* Profile Image Placeholder */}
            <div
              className="h-40 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E8E2DA 0%, #D4D0C8 100%)' }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: '#FFFFFF' }}
              >
                <span className="text-[32px]" style={{ color: '#9A938A' }}>S</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[18px] font-semibold" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>
                  Sarah M.
                </span>
                <span className="text-[14px]" style={{ color: '#9A938A' }}>28</span>
              </div>

              {/* ERS Badge */}
              <div
                className="rounded-xl p-3 mb-3"
                style={{ background: 'rgba(212,151,59,0.1)', border: '1px solid rgba(212,151,59,0.2)' }}
              >
                <div className="flex items-center gap-3">
                  {/* ERS Ring */}
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#F0EBE4"
                        strokeWidth="4"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#D4973B"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${42 * 1.256} ${100 * 1.256}`}
                      />
                    </svg>
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[13px] font-bold"
                      style={{ color: '#D4973B' }}
                    >
                      42
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium" style={{ color: '#D4973B' }}>
                      Emotional Readiness
                    </p>
                    <p className="text-[11px]" style={{ color: '#5C574F' }}>
                      Stage: Healing
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <p className="text-[12px] mb-2" style={{ color: '#5C574F' }}>
                Sarah is still healing. Recommend gentle matches.
              </p>

              {/* Gated Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
                style={{ background: '#F0EBE4' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#9A938A' }} />
                <span className="text-[10px]" style={{ color: '#9A938A' }}>
                  ERS gated — not shown to high-readiness users
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HRPlatformMock() {
  return (
    <div
      className="rounded-2xl overflow-hidden mx-auto max-w-[400px]"
      style={{
        background: '#FFFFFF',
        border: '1px solid #F0EBE4',
        boxShadow: '0 20px 40px rgba(31,29,26,0.1)',
      }}
    >
      {/* Dashboard Header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0EBE4' }}>
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>
            Team Wellness Dashboard
          </span>
          <span className="text-[12px]" style={{ color: '#9A938A' }}>Acme Corp</span>
        </div>
      </div>

      <div className="p-5">
        {/* Overall Score */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: 'rgba(91,138,114,0.08)' }}
        >
          <p className="text-[12px] mb-1" style={{ color: '#5C574F' }}>Team Wellness Score</p>
          <div className="flex items-end gap-2">
            <span className="text-[36px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}>
              68
            </span>
            <span className="text-[14px] mb-2" style={{ color: '#5B8A72' }}>/ 100</span>
            <span
              className="text-[12px] ml-auto mb-2 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(91,138,114,0.15)', color: '#5B8A72' }}
            >
              +4.2 this week
            </span>
          </div>
        </div>

        {/* Stage Distribution */}
        <p className="text-[12px] font-medium mb-2" style={{ color: '#5C574F' }}>Stage Distribution</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] w-20" style={{ color: '#9A938A' }}>Healing</span>
            <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: '#F0EBE4' }}>
              <div className="h-full rounded-lg" style={{ width: '30%', background: '#D4973B' }} />
            </div>
            <span className="text-[12px] font-medium w-4" style={{ color: '#1F1D1A' }}>3</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] w-20" style={{ color: '#9A938A' }}>Rebuilding</span>
            <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: '#F0EBE4' }}>
              <div className="h-full rounded-lg" style={{ width: '50%', background: '#7BA896' }} />
            </div>
            <span className="text-[12px] font-medium w-4" style={{ color: '#1F1D1A' }}>5</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] w-20" style={{ color: '#9A938A' }}>Ready</span>
            <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: '#F0EBE4' }}>
              <div className="h-full rounded-lg" style={{ width: '20%', background: '#5B8A72' }} />
            </div>
            <span className="text-[12px] font-medium w-4" style={{ color: '#1F1D1A' }}>2</span>
          </div>
        </div>

        {/* Alert */}
        <div
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(184,107,100,0.08)', border: '1px solid rgba(184,107,100,0.2)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(184,107,100,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#B86B64">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-medium" style={{ color: '#B86B64' }}>
              1 team member may need support
            </p>
            <p className="text-[11px]" style={{ color: '#9A938A' }}>
              Low ERS score detected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TherapyToolMock() {
  return (
    <div
      className="rounded-2xl overflow-hidden mx-auto max-w-[400px]"
      style={{
        background: '#FFFFFF',
        border: '1px solid #F0EBE4',
        boxShadow: '0 20px 40px rgba(31,29,26,0.1)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0EBE4' }}>
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>
            Client Progress
          </span>
          <span
            className="text-[11px] px-2 py-1 rounded-full"
            style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
          >
            Active
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Progress Milestone */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: 'rgba(91,138,114,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckIcon className="w-5 h-5" style={{ color: '#5B8A72' }} />
            <span className="text-[13px] font-medium" style={{ color: '#5B8A72' }}>
              Stage Progression
            </span>
          </div>
          <p className="text-[14px]" style={{ color: '#1F1D1A' }}>
            Client progressed from <strong>Healing</strong> to <strong>Rebuilding</strong> in 23 days
          </p>
        </div>

        {/* ERS Timeline Chart */}
        <p className="text-[12px] font-medium mb-3" style={{ color: '#5C574F' }}>ERS Score Trajectory</p>
        <div className="relative h-24 mb-4" style={{ background: '#F9F6F2', borderRadius: '12px' }}>
          {/* Y-axis labels */}
          <div className="absolute left-2 top-1 text-[9px]" style={{ color: '#9A938A' }}>60</div>
          <div className="absolute left-2 bottom-1 text-[9px]" style={{ color: '#9A938A' }}>20</div>

          {/* Chart Line */}
          <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D4973B" />
                <stop offset="100%" stopColor="#5B8A72" />
              </linearGradient>
            </defs>
            <path
              d="M 30 65 L 100 52 L 170 40 L 240 22"
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Data points */}
            <circle cx="30" cy="65" r="4" fill="#D4973B" />
            <circle cx="100" cy="52" r="4" fill="#D4973B" />
            <circle cx="170" cy="40" r="4" fill="#7BA896" />
            <circle cx="240" cy="22" r="4" fill="#5B8A72" />
          </svg>

          {/* X-axis labels */}
          <div className="absolute bottom-[-18px] left-[10%] text-[9px]" style={{ color: '#9A938A' }}>W1</div>
          <div className="absolute bottom-[-18px] left-[33%] text-[9px]" style={{ color: '#9A938A' }}>W2</div>
          <div className="absolute bottom-[-18px] left-[56%] text-[9px]" style={{ color: '#9A938A' }}>W3</div>
          <div className="absolute bottom-[-18px] left-[80%] text-[9px]" style={{ color: '#9A938A' }}>W4</div>
        </div>

        {/* Pattern Insight */}
        <div
          className="rounded-xl p-3 mt-6"
          style={{ background: '#F9F6F2', border: '1px solid #F0EBE4' }}
        >
          <div className="flex items-start gap-2">
            <SparkleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D4973B' }} />
            <div>
              <p className="text-[11px] font-medium mb-1" style={{ color: '#D4973B' }}>
                Discovered Pattern
              </p>
              <p className="text-[12px]" style={{ color: '#5C574F' }}>
                Journaling 3x/week correlates with faster progress
              </p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: '#E8E2DA' }}>
                  <div className="h-full rounded-full" style={{ width: '82%', background: '#5B8A72' }} />
                </div>
                <span className="text-[10px]" style={{ color: '#9A938A' }}>82% confidence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DesignPartnersPage() {
  const [form, setForm] = useState<ApplicationForm>({
    companyName: '',
    contactName: '',
    email: '',
    companyType: '',
    otherCompanyType: '',
    currentUsers: '',
    useCase: '',
    whyInterested: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentYear, setCurrentYear] = useState('');

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSubmitted(true);
    setSubmitting(false);
  };

  const handleInputChange = (field: keyof ApplicationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const scrollToForm = () => {
    document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
  };

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
            <span className="text-[14px]" style={{ color: '#5C574F' }}>B2B Partners</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/api-docs"
              className="hidden sm:block text-[14px] font-medium transition-colors"
              style={{ color: '#5C574F' }}
            >
              API Docs
            </Link>
            <button
              onClick={scrollToForm}
              className="px-5 py-2.5 text-[14px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
              style={{ background: '#5B8A72' }}
            >
              Apply Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: '#F9F6F2' }}>
        <div className="absolute inset-0 opacity-40">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'rgba(91,138,114,0.15)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl"
            style={{ background: 'rgba(212,151,59,0.1)' }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium mb-6"
              style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#5B8A72' }}
              />
              Limited to 3 design partners
            </div>

            <h1
              className="text-[36px] sm:text-[44px] lg:text-[52px] font-bold leading-[1.1] mb-6"
              style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
            >
              Partner with Paceful
            </h1>

            <p className="text-[18px] sm:text-[20px] leading-relaxed mb-8" style={{ color: '#5C574F' }}>
              Integrate emotional readiness intelligence into your platform.
              Help your users build healthier relationships with science-backed predictions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToForm}
                className="px-8 py-4 text-[16px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
                style={{ background: '#5B8A72' }}
              >
                Apply for Access
              </button>
              <a
                href="/exports/paceful_sample_dataset.csv"
                download
                className="px-8 py-4 text-[16px] font-semibold rounded-full flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #E8E2DA',
                  color: '#1F1D1A'
                }}
              >
                <DownloadIcon className="w-5 h-5" />
                Sample Dataset
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition - What You Get */}
      <section className="py-20" style={{ background: '#F3EFE9' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2
              className="text-[28px] sm:text-[32px] font-bold mb-4"
              style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
            >
              What You Get
            </h2>
            <p className="text-[16px] max-w-2xl mx-auto" style={{ color: '#5C574F' }}>
              Design partners receive exclusive benefits during the 60-day pilot program
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <BenefitCard
              title="60-Day Free API Access"
              items={[
                'Full prediction API (timeline, outcomes, risks)',
                'Unlimited API calls during pilot',
                'Weekly data updates'
              ]}
              icon={<ApiIcon className="w-6 h-6" />}
              iconBg="rgba(91,138,114,0.1)"
              iconColor="#5B8A72"
            />
            <BenefitCard
              title="Custom Model Development"
              items={[
                'Adapt predictions to your use case',
                'Fine-tune for your user base',
                'Co-design API features'
              ]}
              icon={<GearIcon className="w-6 h-6" />}
              iconBg="rgba(212,151,59,0.1)"
              iconColor="#D4973B"
            />
            <BenefitCard
              title="Early Adopter Benefits"
              items={[
                'Lock in founding pricing ($2K/mo vs $5K)',
                'First access to new features',
                'Input on product roadmap'
              ]}
              icon={<StarIcon className="w-6 h-6" />}
              iconBg="rgba(123,168,150,0.15)"
              iconColor="#7BA896"
            />
            <BenefitCard
              title="Marketing Value"
              items={[
                'Co-authored case study',
                'Press release opportunity',
                '"Powered by Paceful" badge'
              ]}
              icon={<MegaphoneIcon className="w-6 h-6" />}
              iconBg="rgba(184,107,100,0.1)"
              iconColor="#B86B64"
            />
          </div>
        </div>
      </section>

      {/* API Preview */}
      <section className="py-20" style={{ background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-[28px] sm:text-[32px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Simple REST API
              </h2>
              <p className="text-[16px] mb-6" style={{ color: '#5C574F' }}>
                Get emotional readiness predictions with a single API call.
                Our response includes ERS score, component breakdown, and actionable recommendations.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(91,138,114,0.1)' }}
                  >
                    <CheckIcon className="w-4 h-4" style={{ color: '#5B8A72' }} />
                  </div>
                  <div>
                    <p className="font-medium text-[15px]" style={{ color: '#1F1D1A' }}>Real-time predictions</p>
                    <p className="text-[14px]" style={{ color: '#5C574F' }}>Sub-100ms response times</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(91,138,114,0.1)' }}
                  >
                    <CheckIcon className="w-4 h-4" style={{ color: '#5B8A72' }} />
                  </div>
                  <div>
                    <p className="font-medium text-[15px]" style={{ color: '#1F1D1A' }}>SDKs available</p>
                    <p className="text-[14px]" style={{ color: '#5C574F' }}>JavaScript, Python, Ruby</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(91,138,114,0.1)' }}
                  >
                    <CheckIcon className="w-4 h-4" style={{ color: '#5B8A72' }} />
                  </div>
                  <div>
                    <p className="font-medium text-[15px]" style={{ color: '#1F1D1A' }}>Webhook support</p>
                    <p className="text-[14px]" style={{ color: '#5C574F' }}>Get notified on score changes</p>
                  </div>
                </div>
              </div>
            </div>

            <ApiCodePreview />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20" style={{ background: '#F3EFE9' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2
              className="text-[28px] sm:text-[32px] font-bold mb-4"
              style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
            >
              Use Cases
            </h2>
            <p className="text-[16px] max-w-2xl mx-auto" style={{ color: '#5C574F' }}>
              Our prediction API adapts to various industries focused on emotional wellness
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <UseCaseCard
              title="Dating Apps"
              description="Gate matches by emotional readiness. Reduce premature connections and improve long-term relationship success rates for your users."
              icon={<HeartIcon className="w-5 h-5" />}
              iconBg="rgba(184,107,100,0.1)"
              iconColor="#B86B64"
            />
            <UseCaseCard
              title="Mental Health Platforms"
              description="Track client progress objectively. Predict recovery timelines and measure treatment efficacy for relationship transitions."
              icon={<SparkleIcon className="w-5 h-5" />}
              iconBg="rgba(212,151,59,0.1)"
              iconColor="#D4973B"
            />
            <UseCaseCard
              title="HR & Wellness Programs"
              description="Support employees through life transitions. Identify those needing extra support and predict return-to-productivity timelines."
              icon={<BriefcaseIcon className="w-5 h-5" />}
              iconBg="rgba(91,138,114,0.1)"
              iconColor="#5B8A72"
            />
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <InteractiveApiDemo />

      {/* How It Works */}
      <section className="py-20" style={{ background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2
              className="text-[28px] sm:text-[32px] font-bold mb-4"
              style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
            >
              How It Works
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Apply',
                description: 'Submit your application. We review within 48 hours and schedule an intro call.',
                color: '#5B8A72'
              },
              {
                step: '2',
                title: 'Integrate',
                description: 'Get API credentials and integrate with our documentation. Most teams ship in 1-2 days.',
                color: '#D4973B'
              },
              {
                step: '3',
                title: 'Launch',
                description: 'Go live with emotional readiness predictions. We provide ongoing support and iterate together.',
                color: '#7BA896'
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-[20px] font-bold text-white"
                  style={{ background: item.color, fontFamily: "'Fraunces', serif" }}
                >
                  {item.step}
                </div>
                <h3
                  className="text-[18px] font-semibold mb-2"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  {item.title}
                </h3>
                <p className="text-[14px]" style={{ color: '#5C574F' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current Dataset Stats */}
      <section className="py-20" style={{ background: '#F3EFE9' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-[28px] sm:text-[32px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                What We Get From You
              </h2>
              <p className="text-[16px] mb-8" style={{ color: '#5C574F' }}>
                This is a genuine partnership. Here&apos;s how you help us build a better product:
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(91,138,114,0.1)' }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#5B8A72">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] mb-1" style={{ color: '#1F1D1A' }}>Validation & Feedback</h3>
                    <p className="text-[14px]" style={{ color: '#5C574F' }}>Test API with real use cases. Help improve prediction accuracy. Refine our documentation.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,151,59,0.1)' }}
                  >
                    <ChartIcon className="w-5 h-5" style={{ color: '#D4973B' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] mb-1" style={{ color: '#1F1D1A' }}>Success Metrics</h3>
                    <p className="text-[14px]" style={{ color: '#5C574F' }}>Measure business impact. Track usage patterns. Validate our pricing model.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(123,168,150,0.15)' }}
                  >
                    <UsersIcon className="w-5 h-5" style={{ color: '#7BA896' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] mb-1" style={{ color: '#1F1D1A' }}>Reference Customer</h3>
                    <p className="text-[14px]" style={{ color: '#5C574F' }}>For future sales conversations. For investor pitches. For credibility in the market.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dataset Stats Card */}
            <div
              className="rounded-2xl p-8 text-white"
              style={{ background: 'linear-gradient(135deg, #5B8A72 0%, #7BA896 100%)' }}
            >
              <h3
                className="text-[20px] font-semibold mb-6"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Current Dataset
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Tracked recovery journeys</span>
                  <span className="text-[24px] font-bold">50+</span>
                </div>
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>ERS dimensions tracked</span>
                  <span className="text-[24px] font-bold">5</span>
                </div>
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>AI-powered patterns</span>
                  <span className="text-[24px] font-bold">Yes</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Longitudinal data</span>
                  <span className="text-[24px] font-bold">4+ weeks</span>
                </div>
              </div>
              <a
                href="/exports/paceful_sample_dataset.csv"
                download
                className="mt-6 w-full py-3 bg-white font-semibold rounded-full flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ color: '#5B8A72' }}
              >
                <DownloadIcon className="w-5 h-5" />
                Download Sample Dataset
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="application-form" className="py-20" style={{ background: '#5B8A72' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2
              className="text-[28px] sm:text-[32px] font-bold text-white mb-4"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Ready to Integrate?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
              We review applications within 48 hours and schedule intro calls the same week
            </p>
          </div>

          {submitted ? (
            <div
              className="bg-white rounded-2xl p-8 text-center"
              style={{ border: '1px solid #F0EBE4' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <CheckIcon className="w-8 h-8" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[20px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Application Submitted!
              </h3>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Thank you for your interest. We&apos;ll review your application and get back to you within 48 hours.
              </p>
              <p className="text-[14px]" style={{ color: '#9A938A' }}>
                Questions? Email us at{' '}
                <a href="mailto:partners@paceful.com" style={{ color: '#5B8A72' }}>
                  partners@paceful.com
                </a>
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-6 sm:p-8 space-y-6"
              style={{ border: '1px solid #F0EBE4' }}
            >
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[14px] font-medium mb-2" style={{ color: '#5C574F' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-colors"
                    style={{
                      background: '#F9F6F2',
                      border: '1px solid #E8E2DA',
                      color: '#1F1D1A'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#5B8A72';
                      e.target.style.background = '#F3EFE9';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E8E2DA';
                      e.target.style.background = '#F9F6F2';
                    }}
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium mb-2" style={{ color: '#5C574F' }}>
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-colors"
                    style={{
                      background: '#F9F6F2',
                      border: '1px solid #E8E2DA',
                      color: '#1F1D1A'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#5B8A72';
                      e.target.style.background = '#F3EFE9';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E8E2DA';
                      e.target.style.background = '#F9F6F2';
                    }}
                    placeholder="Jane Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium mb-2" style={{ color: '#5C574F' }}>
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-colors"
                  style={{
                    background: '#F9F6F2',
                    border: '1px solid #E8E2DA',
                    color: '#1F1D1A'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#5B8A72';
                    e.target.style.background = '#F3EFE9';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E8E2DA';
                    e.target.style.background = '#F9F6F2';
                  }}
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium mb-2" style={{ color: '#5C574F' }}>
                  Company Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'dating', label: 'Dating/Relationship App' },
                    { value: 'mental_health', label: 'Mental Health Platform' },
                    { value: 'hr_wellness', label: 'HR/Employee Wellness' },
                    { value: 'research', label: 'Research Institution' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                      style={{
                        background: form.companyType === option.value ? 'rgba(91,138,114,0.1)' : '#F9F6F2',
                        border: form.companyType === option.value ? '1px solid #5B8A72' : '1px solid #E8E2DA'
                      }}
                    >
                      <input
                        type="radio"
                        name="companyType"
                        value={option.value}
                        checked={form.companyType === option.value}
                        onChange={(e) => handleInputChange('companyType', e.target.value)}
                        className="accent-[#5B8A72]"
                      />
                      <span className="text-[14px]" style={{ color: '#1F1D1A' }}>{option.label}</span>
                    </label>
                  ))}
                </div>
                <label
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors mt-3"
                  style={{
                    background: form.companyType === 'other' ? 'rgba(91,138,114,0.1)' : '#F9F6F2',
                    border: form.companyType === 'other' ? '1px solid #5B8A72' : '1px solid #E8E2DA'
                  }}
                >
                  <input
                    type="radio"
                    name="companyType"
                    value="other"
                    checked={form.companyType === 'other'}
                    onChange={(e) => handleInputChange('companyType', e.target.value)}
                    className="accent-[#5B8A72]"
                  />
                  <span className="text-[14px]" style={{ color: '#1F1D1A' }}>Other:</span>
                  <input
                    type="text"
                    value={form.otherCompanyType}
                    onChange={(e) => handleInputChange('otherCompanyType', e.target.value)}
                    className="flex-1 px-2 py-1 text-[14px] outline-none bg-transparent"
                    style={{ borderBottom: '1px solid #E8E2DA', color: '#1F1D1A' }}
                    placeholder="Describe your company type"
                    disabled={form.companyType !== 'other'}
                  />
                </label>
              </div>

              <div>
                <label className="block text-[14px] font-medium mb-2" style={{ color: '#5C574F' }}>
                  Current Active Users
                </label>
                <input
                  type="text"
                  value={form.currentUsers}
                  onChange={(e) => handleInputChange('currentUsers', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-colors"
                  style={{
                    background: '#F9F6F2',
                    border: '1px solid #E8E2DA',
                    color: '#1F1D1A'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#5B8A72';
                    e.target.style.background = '#F3EFE9';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E8E2DA';
                    e.target.style.background = '#F9F6F2';
                  }}
                  placeholder="e.g., 10,000 MAU"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium mb-2" style={{ color: '#5C574F' }}>
                  Describe Your Use Case *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.useCase}
                  onChange={(e) => handleInputChange('useCase', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-colors resize-none"
                  style={{
                    background: '#F9F6F2',
                    border: '1px solid #E8E2DA',
                    color: '#1F1D1A'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#5B8A72';
                    e.target.style.background = '#F3EFE9';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E8E2DA';
                    e.target.style.background = '#F9F6F2';
                  }}
                  placeholder="How would you use the emotional readiness prediction API?"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium mb-2" style={{ color: '#5C574F' }}>
                  Why Are You Interested? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.whyInterested}
                  onChange={(e) => handleInputChange('whyInterested', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-colors resize-none"
                  style={{
                    background: '#F9F6F2',
                    border: '1px solid #E8E2DA',
                    color: '#1F1D1A'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#5B8A72';
                    e.target.style.background = '#F3EFE9';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E8E2DA';
                    e.target.style.background = '#F9F6F2';
                  }}
                  placeholder="What problem are you trying to solve? Why now?"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 text-[16px] font-semibold text-white rounded-full transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: '#5B8A72' }}
              >
                {submitting ? (
                  <>
                    <div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>

              <p className="text-center text-[13px]" style={{ color: '#9A938A' }}>
                By submitting, you agree to our{' '}
                <Link href="/privacy" style={{ color: '#5B8A72' }}>Privacy Policy</Link>
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20" style={{ background: '#F9F6F2' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2
            className="text-[28px] sm:text-[32px] font-bold mb-10 text-center"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Frequently Asked Questions
          </h2>

          <div
            className="bg-white rounded-2xl px-6"
            style={{ border: '1px solid #F0EBE4' }}
          >
            <FAQItem
              question="Is this really free?"
              answer="Yes. No credit card required for the 60-day pilot. We're looking for partners to help us validate and improve the product, not revenue at this stage."
            />
            <FAQItem
              question="What happens after the pilot?"
              answer="You can convert to a paid plan at the early adopter rate ($2K/month vs $5K standard) or simply cancel with no obligation. We'll discuss options based on results."
            />
            <FAQItem
              question="Do you have real users?"
              answer="We're in private beta with our initial cohort of 50+ users tracking their emotional recovery. The design partner program helps us validate with real-world B2B use cases."
            />
            <FAQItem
              question="What if it doesn't work for our use case?"
              answer="No obligation. You can end the pilot anytime. Our goal is mutual success—if it's not working, we'd rather know early and learn from it."
            />
            <FAQItem
              question="How technical is the integration?"
              answer="Standard REST API with JSON responses. Most engineering teams integrate in 1-2 days. We provide SDKs, documentation, and dedicated support during onboarding."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #F0EBE4', background: '#F9F6F2' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: '#5B8A72' }}
                >
                  <span className="text-white text-[14px] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>P</span>
                </div>
                <span
                  className="font-semibold text-[16px]"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  Paceful
                </span>
              </Link>
              <span style={{ color: '#E8E2DA' }}>|</span>
              <a
                href="mailto:partners@paceful.com"
                className="text-[14px]"
                style={{ color: '#5C574F' }}
              >
                partners@paceful.com
              </a>
            </div>

            <div className="flex items-center gap-6 text-[13px]" style={{ color: '#9A938A' }}>
              <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
              <Link href="/terms" className="hover:underline">Terms of Service</Link>
            </div>
          </div>

          <p className="text-center text-[13px] mt-8" style={{ color: '#9A938A' }}>
            &copy; {currentYear} Paceful, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
