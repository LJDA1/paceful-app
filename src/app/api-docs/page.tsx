'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// SVG ICONS
// ============================================================================

function RocketIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  );
}

function LockIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function ChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function SignalIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function CodeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function AlertIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function ClockIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ChatIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function KeyIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  );
}

function MailIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function BriefcaseIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

function StatusIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function CodeBlock({
  code,
  language: _language = 'bash',
  title
}: {
  code: string;
  language?: string;
  title?: string;
}) {
  void _language;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting
  const highlightCode = (text: string) => {
    return text.split('\n').map((line, i) => {
      let highlighted = line;
      // Keys in JSON
      highlighted = highlighted.replace(/"([^"]+)":/g, '<span style="color:#7BA896">"$1"</span>:');
      // String values
      highlighted = highlighted.replace(/: "([^"]+)"/g, ': <span style="color:#D4973B">"$1"</span>');
      // Numbers
      highlighted = highlighted.replace(/: (\d+\.?\d*)/g, ': <span style="color:#A5C4B8">$1</span>');
      // Booleans
      highlighted = highlighted.replace(/(true|false)/g, '<span style="color:#5B8A72">$1</span>');
      // Array string items
      highlighted = highlighted.replace(/"([^"]+)"(,?\s*$)/g, '<span style="color:#D4973B">"$1"</span>$2');
      return <div key={i} dangerouslySetInnerHTML={{ __html: highlighted }} />;
    });
  };

  return (
    <div className="relative group rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E2DA' }}>
      {title && (
        <div
          className="px-4 py-2 text-[12px] font-medium"
          style={{ background: '#F3EFE9', color: '#9A938A', borderBottom: '1px solid #E8E2DA' }}
        >
          {title}
        </div>
      )}
      <pre
        className="p-5 overflow-x-auto text-[13px] leading-relaxed font-mono"
        style={{ background: '#1F1D1A', color: '#E8E2DA' }}
      >
        <code>{highlightCode(code)}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.1)', color: '#9A938A' }}
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#5B8A72">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
        )}
      </button>
    </div>
  );
}

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  return (
    <span
      className="inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full"
      style={{
        background: method === 'GET' ? 'rgba(91,138,114,0.1)' : 'rgba(212,151,59,0.1)',
        color: method === 'GET' ? '#5B8A72' : '#D4973B'
      }}
    >
      {method}
    </span>
  );
}

function StatusCode({ code }: { code: number }) {
  const colors: Record<number, { bg: string; text: string }> = {
    200: { bg: 'rgba(91,138,114,0.1)', text: '#5B8A72' },
    400: { bg: 'rgba(212,151,59,0.1)', text: '#D4973B' },
    401: { bg: 'rgba(184,107,100,0.1)', text: '#B86B64' },
    403: { bg: 'rgba(184,107,100,0.1)', text: '#B86B64' },
    404: { bg: 'rgba(212,151,59,0.1)', text: '#D4973B' },
    429: { bg: 'rgba(212,151,59,0.1)', text: '#D4973B' },
    500: { bg: 'rgba(184,107,100,0.1)', text: '#B86B64' },
  };
  const style = colors[code] || { bg: '#F3EFE9', text: '#5C574F' };

  return (
    <span
      className="inline-flex px-2 py-0.5 text-[11px] font-mono font-bold rounded"
      style={{ background: style.bg, color: style.text }}
    >
      {code}
    </span>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid #F0EBE4' }}>
      <table className="w-full text-[14px]">
        <thead>
          <tr style={{ background: '#F3EFE9' }}>
            <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Parameter</th>
            <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Type</th>
            <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Required</th>
            <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((param, i) => (
            <tr key={i} style={{ borderTop: '1px solid #F0EBE4' }}>
              <td className="px-4 py-3 font-mono" style={{ color: '#5B8A72' }}>{param.name}</td>
              <td className="px-4 py-3" style={{ color: '#5C574F' }}>{param.type}</td>
              <td className="px-4 py-3">
                {param.required ? (
                  <span className="font-medium" style={{ color: '#B86B64' }}>Required</span>
                ) : (
                  <span style={{ color: '#9A938A' }}>Optional</span>
                )}
              </td>
              <td className="px-4 py-3" style={{ color: '#5C574F' }}>{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// SIDEBAR
// ============================================================================

function Sidebar({ activeSection }: { activeSection: string }) {
  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: <RocketIcon className="w-4 h-4" /> },
    { id: 'authentication', label: 'Authentication', icon: <LockIcon className="w-4 h-4" /> },
    {
      id: 'ers-endpoints',
      label: 'ERS Endpoints',
      icon: <ChartIcon className="w-4 h-4" />,
      children: [
        { id: 'endpoint-ers-single', label: '/ers/:userId', method: 'GET' as const },
        { id: 'endpoint-ers-batch', label: '/ers/batch', method: 'GET' as const },
        { id: 'endpoint-analytics', label: '/analytics/summary', method: 'GET' as const },
      ]
    },
    {
      id: 'prediction-endpoints',
      label: 'Prediction Endpoints',
      icon: <SignalIcon className="w-4 h-4" />,
      children: [
        { id: 'endpoint-aggregate', label: '/aggregate', method: 'GET' as const },
        { id: 'endpoint-individual', label: '/individual', method: 'POST' as const },
        { id: 'endpoint-health', label: '/health', method: 'GET' as const },
      ]
    },
    { id: 'code-examples', label: 'Code Examples', icon: <CodeIcon className="w-4 h-4" /> },
    { id: 'error-handling', label: 'Error Handling', icon: <AlertIcon className="w-4 h-4" /> },
    { id: 'rate-limits', label: 'Rate Limits', icon: <ClockIcon className="w-4 h-4" /> },
    { id: 'support', label: 'Support', icon: <ChatIcon className="w-4 h-4" /> },
  ];

  return (
    <nav className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-1">
        {sections.map((section) => (
          <div key={section.id}>
            <a
              href={`#${section.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[14px] transition-colors"
              style={{
                background: activeSection === section.id ? 'rgba(91,138,114,0.1)' : 'transparent',
                color: activeSection === section.id ? '#5B8A72' : '#5C574F',
                fontWeight: activeSection === section.id ? 500 : 400
              }}
            >
              <span style={{ color: activeSection === section.id ? '#5B8A72' : '#9A938A' }}>{section.icon}</span>
              {section.label}
            </a>
            {section.children && (
              <div className="ml-6 mt-1 space-y-1">
                {section.children.map((child) => (
                  <a
                    key={child.id}
                    href={`#${child.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors"
                    style={{
                      background: activeSection === child.id ? 'rgba(91,138,114,0.1)' : 'transparent',
                      color: activeSection === child.id ? '#5B8A72' : '#9A938A',
                      fontWeight: activeSection === child.id ? 500 : 400
                    }}
                  >
                    <MethodBadge method={child.method} />
                    <span className="font-mono text-[11px]">{child.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'getting-started', 'authentication',
        'endpoint-ers-single', 'endpoint-ers-batch', 'endpoint-analytics',
        'endpoint-aggregate', 'endpoint-individual', 'endpoint-health',
        'code-examples', 'error-handling', 'rate-limits', 'support'
      ];

      for (const id of sections) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(249,246,242,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #F0EBE4'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
              <span className="text-[14px]" style={{ color: '#5C574F' }}>API Documentation</span>
              <span
                className="px-2 py-0.5 text-[11px] font-medium rounded-full"
                style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
              >
                v1.0
              </span>
            </div>
            <Link
              href="/design-partners"
              className="px-4 py-2 text-[14px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
              style={{ background: '#5B8A72' }}
            >
              Get API Key
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-12">
          <Sidebar activeSection={activeSection} />

          {/* Main Content */}
          <main className="flex-1 max-w-3xl space-y-16">

            {/* GETTING STARTED */}
            <section id="getting-started" className="scroll-mt-24">
              <h1
                className="text-[36px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Paceful API
              </h1>
              <p className="text-[17px] mb-8" style={{ color: '#5C574F' }}>
                Integrate emotional readiness data into your platform. Build powerful emotional
                wellness features using our cohort-based prediction engine.
              </p>

              <div
                className="bg-white rounded-2xl p-6 space-y-4"
                style={{ border: '1px solid #F0EBE4' }}
              >
                <h2
                  className="text-[17px] font-semibold"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  Base URL
                </h2>
                <CodeBlock code="https://api.paceful.app/api/b2b/predictions" language="text" />

                <h2
                  className="text-[17px] font-semibold pt-4"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  Quick Start
                </h2>
                <p className="text-[14px]" style={{ color: '#5C574F' }}>Make your first API call in seconds:</p>
                <CodeBlock
                  code={`curl -X GET "https://api.paceful.app/api/b2b/predictions/health" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                  language="bash"
                />
              </div>
            </section>

            {/* AUTHENTICATION */}
            <section id="authentication" className="scroll-mt-24">
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Authentication
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                All requests require an API key in the Authorization header:
              </p>

              <CodeBlock
                code="Authorization: Bearer pk_live_abc123xyz789..."
                language="http"
                title="Header Format"
              />

              <div className="mt-6 space-y-4">
                <h3
                  className="text-[17px] font-semibold"
                  style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
                >
                  API Key Types
                </h3>
                <div className="grid gap-4">
                  <div
                    className="flex items-start gap-4 p-4 bg-white rounded-2xl"
                    style={{ border: '1px solid #F0EBE4' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(212,151,59,0.1)' }}
                    >
                      <KeyIcon className="w-5 h-5" style={{ color: '#D4973B' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[15px]" style={{ color: '#1F1D1A' }}>Test Keys</h4>
                      <p className="text-[13px]" style={{ color: '#5C574F' }}>
                        Prefix: <code className="px-1 rounded" style={{ background: '#F3EFE9' }}>pk_test_</code>
                      </p>
                      <p className="text-[13px] mt-1" style={{ color: '#9A938A' }}>Use for development. Returns mock data, doesn&apos;t count against quota.</p>
                    </div>
                  </div>
                  <div
                    className="flex items-start gap-4 p-4 bg-white rounded-2xl"
                    style={{ border: '1px solid #F0EBE4' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(91,138,114,0.1)' }}
                    >
                      <LockIcon className="w-5 h-5" style={{ color: '#5B8A72' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[15px]" style={{ color: '#1F1D1A' }}>Live Keys</h4>
                      <p className="text-[13px]" style={{ color: '#5C574F' }}>
                        Prefix: <code className="px-1 rounded" style={{ background: '#F3EFE9' }}>pk_live_</code>
                      </p>
                      <p className="text-[13px] mt-1" style={{ color: '#9A938A' }}>Use in production. Returns real data, subject to rate limits.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="mt-6 p-4 rounded-2xl"
                style={{ background: 'rgba(212,151,59,0.08)', border: '1px solid rgba(212,151,59,0.2)' }}
              >
                <div className="flex items-start gap-3">
                  <AlertIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D4973B' }} />
                  <div>
                    <h4 className="font-semibold text-[14px]" style={{ color: '#D4973B' }}>Security Notice</h4>
                    <p className="text-[13px] mt-1" style={{ color: '#5C574F' }}>
                      Never expose API keys in client-side code. Always make API calls from your server.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ERS ENDPOINTS */}
            <section id="endpoint-ers-single" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[16px] font-mono" style={{ color: '#5C574F' }}>/api/v1/ers/:userId</code>
              </div>
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Get User ERS
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Retrieve the latest Emotional Readiness Score for a specific user.
              </p>

              <h3 className="text-[15px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>Path Parameters</h3>
              <ParamTable params={[
                { name: 'userId', type: 'string (UUID)', required: true, description: 'Unique identifier for the user' },
              ]} />

              <h3 className="text-[15px] font-semibold mt-8 mb-3" style={{ color: '#1F1D1A' }}>Example Request</h3>
              <CodeBlock
                code={`curl -X GET "https://api.paceful.app/api/v1/ers/550e8400-e29b-41d4-a716-446655440000" \\
  -H "Authorization: Bearer pk_your_api_key"`}
                language="bash"
              />

              <h3 className="text-[15px] font-semibold mt-8 mb-3" style={{ color: '#1F1D1A' }}>Response</h3>
              <div className="flex items-center gap-2 mb-2">
                <StatusCode code={200} />
                <span className="text-[13px]" style={{ color: '#5C574F' }}>Success</span>
              </div>
              <CodeBlock
                code={`{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "ers_score": 42,
  "ers_stage": "healing",
  "dimensions": {
    "emotional_stability": 52,
    "self_reflection": 45,
    "engagement_consistency": 38,
    "trust_openness": 41,
    "recovery_behavior": 44,
    "social_readiness": 35
  },
  "calculated_at": "2026-02-13T10:30:00Z",
  "trend": {
    "direction": "improving",
    "weekly_change": 3.2
  }
}`}
                language="json"
                title="Response Body"
              />
            </section>

            <section id="endpoint-ers-batch" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[16px] font-mono" style={{ color: '#5C574F' }}>/api/v1/ers/batch</code>
              </div>
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Batch ERS Lookup
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Retrieve ERS scores for multiple users in a single request.
              </p>

              <h3 className="text-[15px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>Query Parameters</h3>
              <ParamTable params={[
                { name: 'user_ids', type: 'string', required: true, description: 'Comma-separated list of user IDs (max 50)' },
              ]} />

              <h3 className="text-[15px] font-semibold mt-8 mb-3" style={{ color: '#1F1D1A' }}>Example Request</h3>
              <CodeBlock
                code={`curl -X GET "https://api.paceful.app/api/v1/ers/batch?user_ids=abc123,xyz789,def456" \\
  -H "Authorization: Bearer pk_your_api_key"`}
                language="bash"
              />
            </section>

            <section id="endpoint-analytics" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[16px] font-mono" style={{ color: '#5C574F' }}>/api/v1/analytics/summary</code>
              </div>
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Analytics Summary
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Retrieve anonymized aggregate statistics across all users.
              </p>

              <h3 className="text-[15px] font-semibold mt-8 mb-3" style={{ color: '#1F1D1A' }}>Example Request</h3>
              <CodeBlock
                code={`curl -X GET "https://api.paceful.app/api/v1/analytics/summary" \\
  -H "Authorization: Bearer pk_your_api_key"`}
                language="bash"
              />
            </section>

            {/* PREDICTION ENDPOINTS */}
            <section id="endpoint-aggregate" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[16px] font-mono" style={{ color: '#5C574F' }}>/aggregate</code>
              </div>
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Get Aggregate Predictions
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Retrieve aggregated prediction statistics across your user cohort.
              </p>

              <h3 className="text-[15px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>Query Parameters</h3>
              <ParamTable params={[
                { name: 'timeframe', type: 'string', required: false, description: 'Time period: "7d", "30d", "90d", "1y"' },
                { name: 'prediction_type', type: 'string', required: false, description: 'Filter: "timeline", "outcome", "risk"' },
                { name: 'include_trends', type: 'boolean', required: false, description: 'Include trend analysis' },
              ]} />

              <h3 className="text-[15px] font-semibold mt-8 mb-3" style={{ color: '#1F1D1A' }}>Example Request</h3>
              <CodeBlock
                code={`curl -X GET "https://api.paceful.app/api/b2b/predictions/aggregate?timeframe=30d" \\
  -H "Authorization: Bearer pk_live_abc123"`}
                language="bash"
              />
            </section>

            <section id="endpoint-individual" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-[16px] font-mono" style={{ color: '#5C574F' }}>/individual</code>
              </div>
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Get Individual Prediction
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Retrieve prediction data for a specific user.
              </p>

              <h3 className="text-[15px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>Request Body</h3>
              <ParamTable params={[
                { name: 'user_id', type: 'string (UUID)', required: true, description: 'Unique identifier for the user' },
                { name: 'prediction_types', type: 'string[]', required: false, description: 'Types: ["timeline", "outcome", "risk"]' },
                { name: 'include_confidence', type: 'boolean', required: false, description: 'Include confidence intervals' },
              ]} />

              <h3 className="text-[15px] font-semibold mt-8 mb-3" style={{ color: '#1F1D1A' }}>Example Request</h3>
              <CodeBlock
                code={`curl -X POST "https://api.paceful.app/api/b2b/predictions/individual" \\
  -H "Authorization: Bearer pk_live_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "prediction_types": ["timeline", "outcome", "risk"],
    "include_confidence": true
  }'`}
                language="bash"
              />
            </section>

            <section id="endpoint-health" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[16px] font-mono" style={{ color: '#5C574F' }}>/health</code>
              </div>
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Health Check
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Check API status and health. Use this for monitoring.
              </p>

              <h3 className="text-[15px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>Example Request</h3>
              <CodeBlock
                code={`curl -X GET "https://api.paceful.app/api/b2b/predictions/health" \\
  -H "Authorization: Bearer pk_live_abc123"`}
                language="bash"
              />
            </section>

            {/* CODE EXAMPLES */}
            <section id="code-examples" className="scroll-mt-24">
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Code Examples
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Copy-paste examples for popular languages.
              </p>

              <div className="space-y-8">
                <div>
                  <h3 className="text-[16px] font-semibold mb-3 flex items-center gap-2" style={{ color: '#1F1D1A' }}>
                    Python
                  </h3>
                  <CodeBlock
                    code={`import requests

API_KEY = "pk_live_abc123"
BASE_URL = "https://api.paceful.app/api/b2b/predictions"

response = requests.get(
    f"{BASE_URL}/aggregate",
    params={"timeframe": "30d"},
    headers={"Authorization": f"Bearer {API_KEY}"}
)
data = response.json()
print(f"Total predictions: {data['data']['total_predictions']}")`}
                    language="python"
                    title="python"
                  />
                </div>

                <div>
                  <h3 className="text-[16px] font-semibold mb-3 flex items-center gap-2" style={{ color: '#1F1D1A' }}>
                    JavaScript / Node.js
                  </h3>
                  <CodeBlock
                    code={`const API_KEY = 'pk_live_abc123';
const BASE_URL = 'https://api.paceful.app/api/b2b/predictions';

const response = await fetch(\`\${BASE_URL}/aggregate?timeframe=30d\`, {
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`
  }
});
const data = await response.json();
console.log(\`Total predictions: \${data.data.total_predictions}\`);`}
                    language="javascript"
                    title="javascript"
                  />
                </div>
              </div>
            </section>

            {/* ERROR HANDLING */}
            <section id="error-handling" className="scroll-mt-24">
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Error Handling
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                The API uses conventional HTTP response codes.
              </p>

              <div className="overflow-x-auto rounded-2xl mb-6" style={{ border: '1px solid #F0EBE4' }}>
                <table className="w-full text-[14px]">
                  <thead>
                    <tr style={{ background: '#F3EFE9' }}>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Code</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Meaning</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: 200, meaning: 'OK', desc: 'Request succeeded' },
                      { code: 400, meaning: 'Bad Request', desc: 'Invalid parameters' },
                      { code: 401, meaning: 'Unauthorized', desc: 'Missing or invalid API key' },
                      { code: 403, meaning: 'Forbidden', desc: 'No access to resource' },
                      { code: 429, meaning: 'Rate Limited', desc: 'Too many requests' },
                      { code: 500, meaning: 'Server Error', desc: 'Something went wrong' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #F0EBE4' }}>
                        <td className="px-4 py-3"><StatusCode code={row.code} /></td>
                        <td className="px-4 py-3 font-medium" style={{ color: '#1F1D1A' }}>{row.meaning}</td>
                        <td className="px-4 py-3" style={{ color: '#5C574F' }}>{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* RATE LIMITS */}
            <section id="rate-limits" className="scroll-mt-24">
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Rate Limits
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                Rate limits are applied per API key. Limits vary by plan tier.
              </p>

              <div className="overflow-x-auto rounded-2xl mb-6" style={{ border: '1px solid #F0EBE4' }}>
                <table className="w-full text-[14px]">
                  <thead>
                    <tr style={{ background: '#F3EFE9' }}>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Plan</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Aggregate</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Individual</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#5C574F' }}>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { plan: 'Basic', agg: '100/hour', ind: '500/hour', health: '1000/hour' },
                      { plan: 'Professional', agg: '500/hour', ind: '2000/hour', health: '1000/hour' },
                      { plan: 'Enterprise', agg: '2000/hour', ind: '10000/hour', health: 'Unlimited' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #F0EBE4' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: '#1F1D1A' }}>{row.plan}</td>
                        <td className="px-4 py-3" style={{ color: '#5C574F' }}>{row.agg}</td>
                        <td className="px-4 py-3" style={{ color: '#5C574F' }}>{row.ind}</td>
                        <td className="px-4 py-3" style={{ color: '#5C574F' }}>{row.health}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="p-4 rounded-2xl"
                style={{ background: 'rgba(91,138,114,0.08)', border: '1px solid rgba(91,138,114,0.2)' }}
              >
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#5B8A72' }} />
                  <div>
                    <h4 className="font-semibold text-[14px]" style={{ color: '#5B8A72' }}>Best Practice</h4>
                    <p className="text-[13px] mt-1" style={{ color: '#5C574F' }}>
                      Cache aggregate responses for 5-15 minutes. Use exponential backoff when rate limited.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SUPPORT */}
            <section id="support" className="scroll-mt-24">
              <h2
                className="text-[24px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Support
              </h2>
              <p className="text-[15px] mb-6" style={{ color: '#5C574F' }}>
                We&apos;re here to help you build with the Paceful API.
              </p>

              <div className="grid gap-4">
                <div
                  className="flex items-start gap-4 p-4 bg-white rounded-2xl"
                  style={{ border: '1px solid #F0EBE4' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(91,138,114,0.1)' }}
                  >
                    <MailIcon className="w-5 h-5" style={{ color: '#5B8A72' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[15px]" style={{ color: '#1F1D1A' }}>Email Support</h4>
                    <p className="text-[13px]" style={{ color: '#5C574F' }}>api-support@paceful.app</p>
                    <p className="text-[13px] mt-1" style={{ color: '#9A938A' }}>Response within 24 hours</p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-4 p-4 bg-white rounded-2xl"
                  style={{ border: '1px solid #F0EBE4' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(212,151,59,0.1)' }}
                  >
                    <BriefcaseIcon className="w-5 h-5" style={{ color: '#D4973B' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[15px]" style={{ color: '#1F1D1A' }}>Partnership Inquiries</h4>
                    <p className="text-[13px]" style={{ color: '#5C574F' }}>partners@paceful.app</p>
                    <p className="text-[13px] mt-1" style={{ color: '#9A938A' }}>For enterprise deals</p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-4 p-4 bg-white rounded-2xl"
                  style={{ border: '1px solid #F0EBE4' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(123,168,150,0.15)' }}
                  >
                    <StatusIcon className="w-5 h-5" style={{ color: '#7BA896' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[15px]" style={{ color: '#1F1D1A' }}>Status Page</h4>
                    <p className="text-[13px]" style={{ color: '#5C574F' }}>status.paceful.app</p>
                    <p className="text-[13px] mt-1" style={{ color: '#9A938A' }}>Real-time API status</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div
                className="mt-8 rounded-2xl p-8 text-center text-white"
                style={{ background: '#5B8A72' }}
              >
                <h3
                  className="text-[22px] font-bold mb-2"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  Ready to get started?
                </h3>
                <p className="mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Join our design partner program for early access and dedicated support.
                </p>
                <Link
                  href="/design-partners"
                  className="inline-flex px-6 py-3 bg-white font-semibold rounded-full transition-opacity hover:opacity-90"
                  style={{ color: '#5B8A72' }}
                >
                  Apply for API Access
                </Link>
              </div>
            </section>

            {/* Footer */}
            <footer className="pt-8 text-center text-[13px]" style={{ borderTop: '1px solid #F0EBE4', color: '#9A938A' }}>
              <p>Paceful API v1.0 - Last updated February 2026</p>
              <p className="mt-2">
                <Link href="/terms" className="hover:underline">Terms</Link>
                {' '}-{' '}
                <Link href="/privacy" className="hover:underline">Privacy</Link>
                {' '}-{' '}
                <a href="mailto:api-support@paceful.app" className="hover:underline">Contact</a>
              </p>
            </footer>

          </main>
        </div>
      </div>
    </div>
  );
}
