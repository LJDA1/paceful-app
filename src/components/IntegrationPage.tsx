'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface ArchStep {
  label: string;
  detail: string;
}

export interface UseCase {
  title: string;
  description: string;
}

export interface IntegrationPageConfig {
  title: string;
  subtitle: string;
  endpoint: string;
  archFlow: ArchStep[];
  codeExample: string;
  apiResponse: string;
  useCases: UseCase[];
  expectedResults: string;
}

function CopyableCode({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Minimal syntax highlighting
  const highlight = (text: string) =>
    text
      .replace(/(["'`])([^"'`\n]*)\1/g, '<span style="color:#CE9178">$&</span>')
      .replace(/\b(const|let|var|await|async|function|return|import|from|if|else)\b/g, '<span style="color:#569CD6">$1</span>')
      .replace(/\/\/.*/g, '<span style="color:#6A9955">$&</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span style="color:#569CD6">$1</span>');

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: '#1A1A1A',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid #333',
      }}>
        <span style={{ fontSize: '12px', color: '#9A938A', fontFamily: 'monospace' }}>{label}</span>
        <button
          onClick={handleCopy}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            background: copied ? '#5B8A72' : '#3D3D3A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '20px',
        background: '#2D2D2D',
        borderRadius: '0 0 8px 8px',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: '13px',
        lineHeight: 1.7,
        color: '#E5E0D9',
        overflowX: 'auto',
      }}
        dangerouslySetInnerHTML={{ __html: highlight(code) }}
      />
    </div>
  );
}

export default function IntegrationPage({ config }: { config: IntegrationPageConfig }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F2', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Logo Bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #E8E2DA', background: '#FFFFFF' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#5B8A72" />
              <path d="M10 16C10 12.686 12.686 10 16 10C19.314 10 22 12.686 22 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="16" cy="19" r="3" fill="white" />
            </svg>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 500, color: '#1F1D1A' }}>
              Paceful
            </span>
          </Link>
          <Link href="/partners/docs" style={{ fontSize: '14px', color: '#5B8A72', textDecoration: 'none', fontWeight: 500 }}>
            ← API Docs
          </Link>
        </div>
      </div>

      {/* Hero */}
      <header style={{
        background: 'linear-gradient(135deg, #1F1D1A 0%, #3D3B38 100%)',
        padding: '56px 24px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: 'rgba(91,138,114,0.25)',
            border: '1px solid rgba(91,138,114,0.4)',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#7EC4A0',
            letterSpacing: '0.05em',
            marginBottom: '20px',
          }}>
            INTEGRATION GUIDE
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 500,
            color: '#FFFFFF',
            marginBottom: '16px',
            lineHeight: 1.2,
          }}>
            {config.title}
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', maxWidth: '560px', lineHeight: 1.6 }}>
            {config.subtitle}
          </p>
          <div style={{
            marginTop: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#7EC4A0',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>POST</span>
            {config.endpoint}
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

        {/* How it works */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 500, color: '#1F1D1A', marginBottom: '24px' }}>
            How it works
          </h2>
          <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
            {[
              { num: '1', title: 'Send data', desc: 'Your app sends user text — a bio, journal entry, chat log, or survey response.' },
              { num: '2', title: 'Get scores', desc: 'Paceful returns an ERS score (0–100) with dimension breakdown in milliseconds.' },
              { num: '3', title: 'Act on insights', desc: 'Gate features, flag users for review, or personalize experiences based on score.' },
            ].map((step, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'stretch', gap: 0 }}>
                <div style={{
                  flex: 1,
                  background: '#FFFFFF',
                  border: '1px solid #E8E2DA',
                  borderLeft: i > 0 ? 'none' : '1px solid #E8E2DA',
                  borderRadius: i === 0 ? '12px 0 0 12px' : i === 2 ? '0 12px 12px 0' : '0',
                  padding: '24px',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: '#5B8A72',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    marginBottom: '12px',
                    flexShrink: 0,
                  }}>
                    {step.num}
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '15px', color: '#1F1D1A', marginBottom: '6px' }}>{step.title}</p>
                  <p style={{ fontSize: '13px', color: '#5C574F', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
                {i < 2 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#F0EBE4',
                    padding: '0 4px',
                    color: '#9A938A',
                    fontSize: '16px',
                    zIndex: 1,
                  }}>
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 500, color: '#1F1D1A', marginBottom: '24px' }}>
            Architecture
          </h2>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2DA',
            borderRadius: '12px',
            padding: '28px',
            overflowX: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', minWidth: '480px' }}>
              {config.archFlow.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i === Math.floor(config.archFlow.length / 2) ? 1.2 : 1 }}>
                  <div style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '16px 8px',
                    background: i === Math.floor(config.archFlow.length / 2) ? 'rgba(91,138,114,0.08)' : '#F9F6F2',
                    border: `1px solid ${i === Math.floor(config.archFlow.length / 2) ? 'rgba(91,138,114,0.3)' : '#E8E2DA'}`,
                    borderRadius: '8px',
                  }}>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: i === Math.floor(config.archFlow.length / 2) ? '#3D6B54' : '#1F1D1A',
                      marginBottom: '4px',
                    }}>
                      {step.label}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9A938A', lineHeight: 1.4 }}>{step.detail}</p>
                  </div>
                  {i < config.archFlow.length - 1 && (
                    <div style={{ padding: '0 6px', color: '#C4BEB6', fontSize: '18px', flexShrink: 0 }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Code Example */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 500, color: '#1F1D1A', marginBottom: '8px' }}>
            Integration code
          </h2>
          <p style={{ color: '#5C574F', fontSize: '15px', marginBottom: '20px' }}>
            Drop this into your backend. Swap in your API key and go.
          </p>
          <CopyableCode code={config.codeExample} label="Node.js · fetch" />
        </section>

        {/* Expected Response */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 500, color: '#1F1D1A', marginBottom: '8px' }}>
            Expected response
          </h2>
          <p style={{ color: '#5C574F', fontSize: '15px', marginBottom: '20px' }}>
            Typical API response for this use case.
          </p>
          <CopyableCode code={config.apiResponse} label="JSON response" />
        </section>

        {/* Use Cases */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 500, color: '#1F1D1A', marginBottom: '24px' }}>
            Use cases
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {config.useCases.map((uc, i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                border: '1px solid #E8E2DA',
                borderRadius: '12px',
                padding: '20px',
                borderTop: '3px solid #5B8A72',
              }}>
                <p style={{ fontWeight: 600, fontSize: '15px', color: '#1F1D1A', marginBottom: '6px' }}>{uc.title}</p>
                <p style={{ fontSize: '13px', color: '#5C574F', lineHeight: 1.5 }}>{uc.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Expected Results */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(91,138,114,0.08) 0%, rgba(61,107,84,0.12) 100%)',
            border: '1px solid rgba(91,138,114,0.25)',
            borderRadius: '12px',
            padding: '24px 28px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: '#5B8A72',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '16px',
              color: '#FFFFFF',
              fontWeight: 700,
            }}>
              ↑
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '15px', color: '#1F1D1A', marginBottom: '4px' }}>Expected results</p>
              <p style={{ fontSize: '14px', color: '#5C574F', lineHeight: 1.6 }}>{config.expectedResults}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div style={{
            background: 'linear-gradient(135deg, #1F1D1A 0%, #3D3B38 100%)',
            borderRadius: '16px',
            padding: '36px',
            textAlign: 'center',
          }}>
            <h3 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '22px',
              fontWeight: 500,
              color: '#FFFFFF',
              marginBottom: '8px',
            }}>
              Ready to build?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginBottom: '28px' }}>
              Try the API live in the sandbox, then get your keys.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/sandbox"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                }}
              >
                Try it now →
              </Link>
              <Link
                href="/partners/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  background: '#D4973B',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                }}
              >
                Get API keys →
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E8E2DA', padding: '24px', textAlign: 'center', marginTop: '48px' }}>
        <p style={{ fontSize: '13px', color: '#9A938A' }}>
          Built by Paceful ·{' '}
          <Link href="/partners/docs" style={{ color: '#5B8A72' }}>API Docs</Link> ·{' '}
          <Link href="/docs/integrations/dating" style={{ color: '#5B8A72' }}>Dating</Link> ·{' '}
          <Link href="/docs/integrations/mental-health" style={{ color: '#5B8A72' }}>Mental Health</Link> ·{' '}
          <Link href="/docs/integrations/workplace" style={{ color: '#5B8A72' }}>Workplace</Link> ·{' '}
          <Link href="/docs/integrations/gambling" style={{ color: '#5B8A72' }}>Gambling</Link>
        </p>
      </footer>

    </div>
  );
}
