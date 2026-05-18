'use client';

/**
 * Paceful Signal Analysis Sandbox — /sandbox
 * Interactive UI for testing the vertical signal engine.
 */

import { useState } from 'react';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

// ─── Example texts ────────────────────────────────────────────────────────────

const EXAMPLES: Record<string, string> = {
  insurance: `I've been waiting six weeks for my claim to be processed and I've had enough. I've spoken to four different adjusters and every time I call I'm told something different. I want to speak to a manager immediately. If this claim is not resolved by Friday I will be contacting my attorney and filing a formal complaint with the Department of Insurance. I've lost everything in this fire — I can't pay my rent, I can't afford food, and I'm borrowing money from family. This is completely unacceptable. You people are negligent and I will be reporting you to every regulator I can find.`,

  cx: `I'm calling about this billing issue for the THIRD TIME this month. I already explained everything to two of your agents who both promised it would be fixed. It's STILL not fixed!!! I've been a customer for 5 years and I've never been treated this badly. I'm seriously considering cancelling my subscription and switching to your competitor — they quoted me a much better rate. I'm going to post about this on Twitter and Reddit so others know to avoid your company. Case number 84921 — look it up.`,

  gambling: `Lost another £400 tonight. I told myself I'd stop but I was so close to winning it back. My wife still doesn't know how bad it's got. The mortgage payment is due on Friday and I don't have it. I can't sleep. I keep thinking if I could just get one good run I could fix everything. I've tried stopping three times this month but I can't.`,

  dating: `Why won't you answer me? I've sent 12 messages and you're just ignoring me. You owe me a response after everything we talked about. I know you've been online — I can see it. Don't think you can just ghost me. I've been nothing but nice to you and this is how you treat me? You need to respond RIGHT NOW or I'm going to find another way to get your attention. You don't get to just disappear on me.`,

  healthcare: `I haven't been able to get out of bed most days this week. Everything feels completely pointless and I don't see the point in trying any more. I skipped my last two therapy appointments because I couldn't face it. I've barely eaten. I haven't told my doctor how bad it's really got because I don't think they'll understand. I'm exhausted all the time and I can't concentrate on anything. My friends have stopped calling because I never pick up.`,
};

const VERTICALS = [
  { value: 'insurance', label: 'Insurance Claims' },
  { value: 'cx', label: 'Customer Experience' },
  { value: 'gambling', label: 'Gambling Harm' },
  { value: 'dating', label: 'Dating Safety' },
  { value: 'healthcare', label: 'Healthcare & Therapy' },
];

// ─── Severity styling ─────────────────────────────────────────────────────────

const SEV: Record<string, { color: string; bg: string; border: string; label: string }> = {
  low: { color: '#84CC16', bg: 'rgba(132,204,22,0.08)', border: 'rgba(132,204,22,0.3)', label: '#365314' },
  moderate: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', label: '#78350F' },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', label: '#78350F' },
  high: { color: '#EA580C', bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.3)', label: '#7C2D12' },
  critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)', label: '#7F1D1D' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEV[severity] || SEV.low;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        fontSize: '0.6875rem',
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        background: s.bg,
        color: s.label,
        border: `1px solid ${s.border}`,
      }}
    >
      {severity}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let color = SEV.low.color;
  if (score >= 0.7) color = SEV.critical.color;
  else if (score >= 0.5) color = SEV.high.color;
  else if (score >= 0.3) color = SEV.medium.color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 400ms' }} />
      </div>
      <span
        style={{
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-quiet)',
          minWidth: 30,
          textAlign: 'right',
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─── Results components ───────────────────────────────────────────────────────

interface CompositeScore {
  score: number;
  severity: string;
  tier?: string;
  tier_reason?: string;
  description?: string;
}

interface Signal {
  id: string;
  name?: string;
  display_name?: string;
  score: number;
  severity: string;
  recommended_action?: string;
}

interface Action {
  priority: string;
  signal: string;
  action: string;
}

interface AnalysisResult {
  vertical?: string;
  analysis_id?: string;
  input_metadata?: { word_count?: number };
  composite_scores?: Record<string, CompositeScore>;
  signals?: Signal[];
  recommended_actions?: Action[];
}

function CompositeScores({ scores }: { scores: Record<string, CompositeScore> }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-text-quiet)',
          marginBottom: 16,
        }}
      >
        Composite Scores
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {Object.entries(scores).map(([key, composite]) => (
          <div
            key={key}
            style={{
              padding: '1.25rem',
              border: '1px solid var(--color-border-strong)',
              background: 'var(--color-surface)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {key.replace(/_/g, ' ')}
              </span>
              <SeverityBadge severity={composite.severity} />
            </div>
            <ScoreBar score={composite.score} />
            {composite.tier_reason && composite.tier_reason !== 'Weighted aggregation' && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-quiet)', marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
                {composite.tier_reason}
              </p>
            )}
            {composite.description && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: 8, lineHeight: 1.5 }}>
                {composite.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals || signals.length === 0) return null;
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-text-quiet)',
          marginBottom: 16,
        }}
      >
        Individual Signals
        <span
          style={{
            fontWeight: 400,
            color: 'var(--color-text-whisper)',
            marginLeft: 8,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          — {signals.length} scored
        </span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((signal) => {
          const s = SEV[signal.severity] || SEV.low;
          return (
            <div
              key={signal.id}
              style={{
                padding: '0.875rem 1rem',
                border: `1px solid var(--color-border)`,
                borderLeft: `3px solid ${s.color}`,
                background: signal.severity === 'low' ? 'var(--color-surface)' : s.bg,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-whisper)' }}>
                      {signal.id}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
                      {signal.display_name || signal.name}
                    </span>
                    <SeverityBadge severity={signal.severity} />
                  </div>
                  <ScoreBar score={signal.score} />
                  {signal.recommended_action && signal.severity !== 'low' && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: 8, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Action: </span>
                      {signal.recommended_action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionList({ actions }: { actions: Action[] }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div>
      <h3
        style={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-text-quiet)',
          marginBottom: 16,
        }}
      >
        Recommended Actions
        <span
          style={{
            fontWeight: 400,
            color: 'var(--color-text-whisper)',
            marginLeft: 8,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          — priority order
        </span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {actions.map((action, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '0.75rem 1rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <SeverityBadge severity={action.priority} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-quiet)', marginRight: 6 }}>
                {action.signal}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{action.action}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SandboxPage() {
  const [vertical, setVertical] = useState('insurance');
  const [text, setText] = useState(EXAMPLES.insurance);
  const [verbosity, setVerbosity] = useState('standard');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleVerticalChange(v: string) {
    setVertical(v);
    setText(EXAMPLES[v] || '');
    setResult(null);
    setError(null);
  }

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/analyze/${vertical}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey || 'sandbox',
        },
        body: JSON.stringify({ text, verbosity }),
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const raw = await res.text();
        throw new Error(
          `Server returned ${res.status} with non-JSON response. ` +
          `First 200 chars: ${raw.slice(0, 200)}`
        );
      }
      const data = await res.json();
      if (!res.ok) setError(data.error || `Request failed (${res.status})`);
      else setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingNav />

      <main style={{ flex: 1, paddingTop: '72px' }}>
        {/* Page header */}
        <div style={{ borderBottom: '1px solid var(--color-border)', padding: '3rem 0 2.5rem' }}>
          <div className="wrap">
            <div className="eyebrow">
              <span className="eyebrow-line" />Signal Engine
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--color-text)',
                margin: '0 0 1rem',
              }}
            >
              Live sandbox.
              <br />
              <em style={{ fontStyle: 'italic', color: 'var(--color-text-subtle)' }}>Real signals, real output.</em>
            </h1>
            <p
              style={{
                fontSize: '1.125rem',
                color: 'var(--color-text-subtle)',
                lineHeight: 1.6,
                maxWidth: '40rem',
                margin: 0,
              }}
            >
              Paste customer text, pick a vertical, and see exactly what the engine surfaces. No account
              required.
            </p>
          </div>
        </div>

        <div className="wrap" style={{ padding: '2rem 1.5rem', maxWidth: '1100px' }}>

          {/* Input panel */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-strong)',
              padding: '2rem',
              marginBottom: '1.5rem',
            }}
          >

            {/* Controls row */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-quiet)',
                  }}
                >
                  Vertical
                </label>
                <select
                  value={vertical}
                  onChange={(e) => handleVerticalChange(e.target.value)}
                  className="field-select"
                  style={{ width: 'auto' }}
                >
                  {VERTICALS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-quiet)',
                  }}
                >
                  Verbosity
                </label>
                <select
                  value={verbosity}
                  onChange={(e) => setVerbosity(e.target.value)}
                  className="field-select"
                  style={{ width: 'auto' }}
                >
                  <option value="minimal">Minimal</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: '180px' }}>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-quiet)',
                  }}
                >
                  API Key{' '}
                  <span
                    style={{
                      fontWeight: 400,
                      color: 'var(--color-text-whisper)',
                      textTransform: 'none',
                      letterSpacing: 0,
                    }}
                  >
                    (optional)
                  </span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pk_live_..."
                  className="field-input"
                  style={{ fontFamily: 'var(--font-mono)', width: '100%' }}
                />
              </div>
            </div>

            {/* Textarea */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-quiet)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Text to analyze
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text)',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-text)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-strong)')}
                placeholder="Paste customer text, claim notes, or chat transcript…"
              />
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-whisper)',
                  marginTop: 6,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {text.length.toLocaleString()} / 50,000 characters
              </div>
            </div>

            {/* Example buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-quiet)' }}>Load example:</span>
              {VERTICALS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => {
                    setVertical(v.value);
                    setText(EXAMPLES[v.value]);
                    setResult(null);
                    setError(null);
                  }}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid var(--color-border-strong)',
                    fontSize: '0.8125rem',
                    background: vertical === v.value ? 'var(--color-inverted)' : 'var(--color-surface)',
                    color: vertical === v.value ? 'var(--color-on-dark)' : 'var(--color-text-subtle)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="btn btn-primary"
              style={{
                opacity: loading || !text.trim() ? 0.5 : 1,
                cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Analyzing…' : 'Analyze →'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.25)',
                borderLeft: '3px solid #DC2626',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                color: '#7F1D1D',
                fontSize: '0.875rem',
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-strong)',
                padding: '2rem',
              }}
            >
              {/* Meta bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '2rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    <span className="eyebrow-line" />Analysis Results
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
                      Vertical:{' '}
                      <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>{result.vertical}</strong>
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
                      Words:{' '}
                      <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                        {result.input_metadata?.word_count}
                      </strong>
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-whisper)',
                  }}
                >
                  {result.analysis_id}
                </span>
              </div>

              {result.composite_scores && <CompositeScores scores={result.composite_scores} />}
              {result.signals && <SignalList signals={result.signals} />}
              {result.recommended_actions && <ActionList actions={result.recommended_actions} />}
            </div>
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
