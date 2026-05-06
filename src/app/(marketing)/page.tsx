/**
 * Paceful Homepage — /
 */

import { Metadata } from 'next';
import Script from 'next/script';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Paceful — Emotional Readiness Scoring Infrastructure',
  description:
    'API-first emotional readiness scoring for insurance, CX, and gambling platforms. Drop a JSON config, get a new vertical.',
};

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, marginTop: 2 }}
    >
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SIGNALS = [
  { vertical: 'Insurance Claims', count: 14, examples: 'escalation risk, litigation intent, bereavement sensitivity' },
  { vertical: 'Customer Experience', count: 12, examples: 'churn risk, frustration trajectory, advocacy potential' },
  { vertical: 'Gambling Safeguarding', count: 14, examples: 'harm risk, addiction indicators, self-exclusion triggers' },
  { vertical: 'Dating Safety', count: 13, examples: 'harassment escalation, coercion language, stalking indicators' },
  { vertical: 'Healthcare & Therapy', count: 11, examples: 'depressive symptoms, treatment adherence risk, distress trajectory' },
];

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingNav />

      <main style={{ flex: 1, paddingTop: '72px' }}>

        {/* ── HERO ── */}
        <section style={{ padding: '5rem 0 4rem', borderBottom: '1px solid var(--color-border)' }}>
          <div className="wrap" style={{ maxWidth: '1280px' }}>
            <div className="eyebrow"><span className="eyebrow-line" />API Infrastructure</div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--color-text)',
                margin: '0 0 1.5rem',
                maxWidth: '18ch',
              }}
            >
              Emotional readiness scoring.
              <br />
              <em style={{ fontStyle: 'italic', color: 'var(--color-text-subtle)' }}>As infrastructure.</em>
            </h1>
            <p
              style={{
                fontSize: '1.25rem',
                color: 'var(--color-text-subtle)',
                lineHeight: 1.6,
                maxWidth: '42rem',
                margin: '0 0 2.5rem',
              }}
            >
              One API. Every signal your team needs to identify distress, prevent escalation, and act
              before a claim goes wrong. Drop a JSON config and get a new vertical. No ML team required.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="/sandbox" className="btn btn-primary">Try the sandbox →</a>
              <a href="/pricing" className="btn btn-outline">See pricing</a>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding: '5rem 0', borderBottom: '1px solid var(--color-border)' }}>
          <div className="wrap" style={{ maxWidth: '1280px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
              }}
            >
              {[
                {
                  step: '01',
                  title: 'POST a text',
                  body: 'Send any text — claim note, transcript, chat message — to /api/v1/analyze/[vertical]. One call, synchronous response.',
                },
                {
                  step: '02',
                  title: 'Get scored signals',
                  body: 'Receive individual signal scores, composite scores, severity levels, and recommended actions. Verbosity is configurable.',
                },
                {
                  step: '03',
                  title: 'Receive webhooks',
                  body: 'Subscribe to signal.critical, signal.escalation, and conversation.escalating events. Retried automatically on failure.',
                },
              ].map(({ step, title, body }) => (
                <div key={step} style={{ borderTop: '2px solid var(--color-text)', paddingTop: '1.5rem' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-whisper)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {step}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.5rem',
                      color: 'var(--color-text)',
                      margin: '0 0 0.75rem',
                      lineHeight: 1.15,
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-subtle)', lineHeight: 1.65, margin: 0 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VERTICALS ── */}
        <section
          style={{
            padding: '5rem 0',
            background: 'var(--color-surface-alt)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="wrap" style={{ maxWidth: '1280px' }}>
            <div className="eyebrow"><span className="eyebrow-line" />Verticals</div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2rem, 3vw, 3rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--color-text)',
                margin: '0 0 3rem',
              }}
            >
              Five verticals, live today.
              <br />
              <em style={{ fontStyle: 'italic', color: 'var(--color-text-subtle)' }}>More on the roadmap.</em>
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {SIGNALS.map(({ vertical, count, examples }) => (
                <div
                  key={vertical}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-strong)',
                    padding: '2rem',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.25rem',
                      color: 'var(--color-text)',
                      margin: '0 0 0.5rem',
                    }}
                  >
                    {vertical}
                  </h3>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-whisper)',
                      marginBottom: '1rem',
                    }}
                  >
                    {count} signals
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', lineHeight: 1.6, margin: 0 }}>
                    {examples}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DARK CTA ── */}
        <section style={{ background: 'var(--color-inverted)', color: 'var(--color-on-dark)', padding: '5rem 0' }}>
          <div className="wrap" style={{ maxWidth: '1280px' }}>
            <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 400px', minWidth: 0 }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(2rem, 3vw, 3rem)',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-on-dark)',
                    margin: '0 0 1rem',
                  }}
                >
                  Ready to see it live?
                </h2>
                <p
                  style={{
                    fontSize: '1.125rem',
                    color: 'var(--color-on-dark-subtle)',
                    lineHeight: 1.6,
                    margin: 0,
                    maxWidth: '36rem',
                  }}
                >
                  The sandbox is open. No account, no credit card. Paste text and see every signal scored in real time.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }}>
                <a
                  href="/sandbox"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.875rem 2rem',
                    background: 'var(--color-accent)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                  }}
                >
                  Try the sandbox →
                </a>
                <a
                  href="/pricing"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.875rem 2rem',
                    border: '1px solid var(--color-border-dark)',
                    color: 'var(--color-on-dark)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  View pricing
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROOF POINTS ── */}
        <section style={{ padding: '5rem 0', borderBottom: '1px solid var(--color-border)' }}>
          <div className="wrap" style={{ maxWidth: '1280px' }}>
            <div className="eyebrow"><span className="eyebrow-line" />Why Paceful</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '2rem',
                marginTop: '1rem',
              }}
            >
              {[
                {
                  point: 'No raw text stored',
                  desc: 'Text analyzed in-memory and discarded immediately. Only hashed references and numerical scores are persisted.',
                },
                {
                  point: 'Config-driven verticals',
                  desc: 'Drop a signals.config.json and get a new vertical with zero code changes. Insurance to gambling in minutes.',
                },
                {
                  point: 'Conversation trajectory',
                  desc: 'Track escalation velocity across message sequences. Know when a conversation is heading somewhere before it gets there.',
                },
                {
                  point: 'Webhook delivery',
                  desc: 'Subscribe to signal.critical, signal.escalation, and conversation.escalating events. HMAC-signed, retried on failure.',
                },
              ].map(({ point, desc }) => (
                <div key={point} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ color: 'var(--color-text)', flexShrink: 0, marginTop: 3 }}>
                    <Check />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        marginBottom: '0.375rem',
                      }}
                    >
                      {point}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', lineHeight: 1.6, margin: 0 }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <MarketingFooter />
      <Script
        id="org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Paceful",
            "url": "https://paceful-app.vercel.app",
            "logo": "https://paceful-app.vercel.app/og-image.png",
            "description": "API-first emotional readiness scoring for insurance, CX, gambling, dating, and healthcare platforms.",
            "founder": { "@type": "Person", "name": "LJ" }
          })
        }}
      />
    </div>
  );
}
