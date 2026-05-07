'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// Types
type Dimension = 'emotional_stability' | 'self_reflection' | 'coping_capacity' | 'behavioral_engagement' | 'social_readiness';
type InputMode = 'text' | 'csv';
type AssessmentStatus = 'idle' | 'loading' | 'success' | 'error' | 'rate_limited';

interface DimensionResult {
  score: number;
  label: string;
  confidence: string;
  reasoning?: string;
  top_signals?: string[];
}

interface SingleResult {
  ers_snapshot: number;
  dimensions: Record<Dimension, DimensionResult>;
  readiness_label: string;
  confidence: string;
  assessment_id: string;
  timestamp: string;
}

interface BatchEntryResult {
  user_id: string;
  ers_score: number;
  readiness_label: string;
  confidence: string;
}

interface BatchResult {
  composite_ers_score: number;
  readiness_label: string;
  composite_confidence: string;
  trend: {
    direction: 'improving' | 'stable' | 'declining';
    delta: number;
  };
  dimensions: Record<Dimension, DimensionResult & { trend?: string }>;
  entries: BatchEntryResult[];
  entry_count: number;
  assessment_id: string;
  timestamp: string;
}

interface CSVEntry {
  user_id: string;
  text: string;
  source_type?: string;
  timestamp?: string;
}

// Sample data
const SAMPLE_JOURNAL = `Today was hard but I handled it better than I would have a few months ago. When Sarah canceled our lunch plans, my first instinct was to spiral into thinking she doesn't care about me. But I caught myself and reminded myself that she's been overwhelmed with her new job.

I've been doing the breathing exercises my therapist suggested whenever I feel that anxiety rising. It actually helps. I did a 10-minute meditation this morning too.

I'm starting to recognize my patterns - I tend to assume the worst when people are distant. But I know that's my fear talking, not reality. I'm getting better at separating my insecurities from what's actually happening.

Tomorrow I'm meeting with a small group from my hiking club. I'm nervous but excited. It's the first time I've voluntarily joined a group activity since the breakup. I think I'm ready to start putting myself out there again, slowly.`;

const SAMPLE_CSV = `user_id,text,source_type,timestamp
user_001,"Had a really tough day at work. Felt overwhelmed and couldn't focus. Went for a walk during lunch which helped a bit.",journal,2024-01-15
user_001,"Feeling more optimistic today. Applied for that promotion I've been thinking about. Even if I don't get it, I'm proud I tried.",journal,2024-01-18
user_001,"Great weekend! Went hiking with friends and actually felt present in the moment. Haven't laughed that much in months.",journal,2024-01-21
user_002,"Struggling with motivation lately. Everything feels pointless. Haven't left the house in 3 days.",journal,2024-01-16
user_002,"Forced myself to go to the gym today. Only stayed 20 minutes but it's something. Small steps.",journal,2024-01-19
user_003,"Therapy session went well. We talked about setting boundaries with family. I actually stood up for myself with my mom this week.",session_notes,2024-01-17`;

const DIMENSION_LABELS: Record<Dimension, string> = {
  emotional_stability: 'Emotional Stability',
  self_reflection: 'Self Reflection',
  coping_capacity: 'Coping Capacity',
  behavioral_engagement: 'Behavioral Engagement',
  social_readiness: 'Social Readiness',
};

const DIMENSION_COLORS: Record<Dimension, string> = {
  emotional_stability: '#5B8A72',
  self_reflection: '#5B7FB5',
  coping_capacity: '#7E71B5',
  behavioral_engagement: '#C4973B',
  social_readiness: '#D4A645',
};

// Storage keys
const STORAGE_KEY_SESSION = 'paceful_sandbox_session';
const STORAGE_KEY_COUNT = 'paceful_sandbox_count';
const MAX_FREE_ASSESSMENTS = 5;

export default function SandboxPage() {
  // State
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');
  const [csvData, setCsvData] = useState<CSVEntry[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [status, setStatus] = useState<AssessmentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<SingleResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if banner was dismissed (stored in localStorage)
  useEffect(() => {
    const dismissed = localStorage.getItem('paceful_sandbox_banner_dismissed');
    if (dismissed === 'true') {
      setBannerDismissed(true);
    }
  }, []);

  // Initialize session
  useEffect(() => {
    let storedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!storedSession) {
      storedSession = `sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(STORAGE_KEY_SESSION, storedSession);
    }
    setSessionId(storedSession);

    const storedCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
    setAssessmentCount(storedCount);
  }, []);

  // Check rate limit
  const isRateLimited = assessmentCount >= MAX_FREE_ASSESSMENTS;
  const remainingAssessments = Math.max(0, MAX_FREE_ASSESSMENTS - assessmentCount);

  // Parse CSV
  const parseCSV = useCallback((text: string): CSVEntry[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const userIdIdx = headers.indexOf('user_id');
    const textIdx = headers.indexOf('text');
    const sourceTypeIdx = headers.indexOf('source_type');
    const timestampIdx = headers.indexOf('timestamp');

    if (userIdIdx === -1 || textIdx === -1) return [];

    const entries: CSVEntry[] = [];
    for (let i = 1; i < lines.length && entries.length < 20; i++) {
      const values = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
      if (values[userIdIdx] && values[textIdx]) {
        entries.push({
          user_id: values[userIdIdx],
          text: values[textIdx],
          source_type: sourceTypeIdx >= 0 ? values[sourceTypeIdx] : undefined,
          timestamp: timestampIdx >= 0 ? values[timestampIdx] : undefined,
        });
      }
    }
    return entries;
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const entries = parseCSV(text);
      if (entries.length === 0) {
        setError('Invalid CSV format. Required columns: user_id, text');
        return;
      }
      setCsvData(entries);
      setCsvFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
  }, [parseCSV]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const entries = parseCSV(text);
        if (entries.length === 0) {
          setError('Invalid CSV format. Required columns: user_id, text');
          return;
        }
        setCsvData(entries);
        setCsvFileName(file.name);
        setError(null);
      };
      reader.readAsText(file);
    }
  }, [parseCSV]);

  // Submit assessment
  const handleSubmit = useCallback(async () => {
    if (isRateLimited) {
      setStatus('rate_limited');
      return;
    }

    // Show email capture before first assessment
    if (assessmentCount === 0 && !emailSubmitted) {
      setShowEmailCapture(true);
      return;
    }

    setStatus('loading');
    setError(null);
    setSingleResult(null);
    setBatchResult(null);

    try {
      if (inputMode === 'text') {
        const response = await fetch('/api/sandbox/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textInput,
            source_type: 'journal',
            session_id: sessionId,
            email: email || undefined,
            company: company || undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 429) {
            setStatus('rate_limited');
            return;
          }
          throw new Error(data.error?.message || 'Analysis failed');
        }

        const data = await response.json();
        setSingleResult(data.data);
        setStatus('success');
      } else {
        // Batch mode
        const entries = csvData.map(e => ({
          user_id: e.user_id,
          text: e.text,
          source_type: e.source_type || 'free_text',
          timestamp: e.timestamp,
        }));

        const response = await fetch('/api/sandbox/analyze/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries,
            session_id: sessionId,
            email: email || undefined,
            company: company || undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 429) {
            setStatus('rate_limited');
            return;
          }
          throw new Error(data.error?.message || 'Batch analysis failed');
        }

        const data = await response.json();
        setBatchResult(data.data);
        setStatus('success');
      }

      // Update local count
      const newCount = assessmentCount + 1;
      setAssessmentCount(newCount);
      localStorage.setItem(STORAGE_KEY_COUNT, newCount.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }, [inputMode, textInput, csvData, sessionId, email, company, assessmentCount, isRateLimited, emailSubmitted]);

  // Handle email submit
  const handleEmailSubmit = useCallback(() => {
    setEmailSubmitted(true);
    setShowEmailCapture(false);
    // Continue with submission
    handleSubmit();
  }, [handleSubmit]);

  // Skip email
  const handleSkipEmail = useCallback(() => {
    setEmailSubmitted(true);
    setShowEmailCapture(false);
    handleSubmit();
  }, [handleSubmit]);

  // Load sample data
  const loadSampleData = useCallback(() => {
    if (inputMode === 'text') {
      setTextInput(SAMPLE_JOURNAL);
    } else {
      const entries = parseCSV(SAMPLE_CSV);
      setCsvData(entries);
      setCsvFileName('sample_data.csv');
    }
  }, [inputMode, parseCSV]);

  // Reset
  const handleReset = useCallback(() => {
    setStatus('idle');
    setSingleResult(null);
    setBatchResult(null);
    setError(null);
  }, []);

  // Share results
  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = useCallback(() => {
    let text = '';
    if (singleResult) {
      const d = singleResult.dimensions;
      text = `Paceful Emotional Readiness Score Analysis: Score ${singleResult.ers_snapshot}/100 (${singleResult.readiness_label}) — ` +
        `Emotional Stability: ${d.emotional_stability.score}, ` +
        `Self Reflection: ${d.self_reflection.score}, ` +
        `Coping Capacity: ${d.coping_capacity.score}, ` +
        `Behavioral Engagement: ${d.behavioral_engagement.score}, ` +
        `Social Readiness: ${d.social_readiness.score}. ` +
        `Try it yourself: paceful-app.vercel.app/sandbox`;
    } else if (batchResult) {
      text = `Paceful Emotional Readiness Score Batch Analysis: Composite Score ${batchResult.composite_ers_score}/100 (${batchResult.readiness_label}), ` +
        `${batchResult.entry_count} entries, trend: ${batchResult.trend.direction}. ` +
        `Try it yourself: paceful-app.vercel.app/sandbox`;
    }
    if (text) {
      navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [singleResult, batchResult]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Logo Bar */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #E8E2DA',
        background: '#FFFFFF',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="#5B8A72" />
            <path d="M10 16C10 12.686 12.686 10 16 10C19.314 10 22 12.686 22 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="19" r="3" fill="white" />
          </svg>
          <span style={{
            fontFamily: "'Fraunces', serif",
            fontSize: '20px',
            fontWeight: 500,
            color: '#1F1D1A',
          }}>
            Paceful
          </span>
        </Link>
      </div>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #5B8A72 0%, #3D6B54 100%)',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 500,
            color: '#FFFFFF',
            marginBottom: '12px',
          }}>
            Paceful API
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.85)',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            Emotional Readiness Score
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Email Capture Modal */}
        {showEmailCapture && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '24px',
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
              <h3 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '24px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#1F1D1A',
              }}>
                Before we analyze...
              </h3>
              <p style={{ color: '#5C574F', marginBottom: '24px', fontSize: '15px' }}>
                Want to receive insights about the Paceful API? (Optional)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #E8E2DA',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Company (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #E8E2DA',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  onClick={handleSkipEmail}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid #E8E2DA',
                    borderRadius: '8px',
                    fontSize: '15px',
                    color: '#5C574F',
                    cursor: 'pointer',
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={handleEmailSubmit}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#5B8A72',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results View */}
        {status === 'success' && (singleResult || batchResult) ? (
          <div>
            {/* Single Result */}
            {singleResult && <SingleResultView result={singleResult} />}

            {/* Batch Result */}
            {batchResult && <BatchResultView result={batchResult} />}

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              marginTop: '32px',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '14px 28px',
                  background: '#FFFFFF',
                  border: '2px solid #E8E2DA',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1F1D1A',
                  cursor: 'pointer',
                }}
              >
                Analyze Another
              </button>
              <button
                onClick={handleShare}
                style={{
                  padding: '14px 28px',
                  background: shareCopied ? '#5B8A72' : '#FFFFFF',
                  border: `2px solid ${shareCopied ? '#5B8A72' : '#E8E2DA'}`,
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: shareCopied ? '#FFFFFF' : '#1F1D1A',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {shareCopied ? 'Copied!' : 'Share results'}
              </button>
              <Link
                href="/partners/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  background: '#5B8A72',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                }}
              >
                Get Your API Key
                <span>→</span>
              </Link>
            </div>

            {/* Integration guide link */}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link
                href="/docs/integrations"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#5B8A72',
                  textDecoration: 'none',
                }}
              >
                See how to integrate this into your product →
              </Link>
            </div>

            {/* CTA Banner */}
            <div style={{
              marginTop: '48px',
              background: 'linear-gradient(135deg, #1F1D1A 0%, #3D3B38 100%)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <h3 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '24px',
                fontWeight: 500,
                color: '#FFFFFF',
                marginBottom: '8px',
              }}>
                Ready to integrate?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                Get your API key in 30 seconds and start building with the Paceful API.
              </p>
              <Link
                href="/partners/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 32px',
                  background: '#D4973B',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                }}
              >
                Get Your API Key
                <span style={{ fontSize: '18px' }}>→</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Input View */
          <div>
            {/* Mode Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
            }}>
              <button
                onClick={() => setInputMode('text')}
                style={{
                  padding: '12px 24px',
                  background: inputMode === 'text' ? '#5B8A72' : '#FFFFFF',
                  border: inputMode === 'text' ? 'none' : '1px solid #E8E2DA',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: inputMode === 'text' ? '#FFFFFF' : '#5C574F',
                  cursor: 'pointer',
                }}
              >
                Paste Text
              </button>
              <button
                onClick={() => setInputMode('csv')}
                style={{
                  padding: '12px 24px',
                  background: inputMode === 'csv' ? '#5B8A72' : '#FFFFFF',
                  border: inputMode === 'csv' ? 'none' : '1px solid #E8E2DA',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: inputMode === 'csv' ? '#FFFFFF' : '#5C574F',
                  cursor: 'pointer',
                }}
              >
                Upload CSV
              </button>
            </div>

            {/* Input Area */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #E8E2DA',
            }}>
              {inputMode === 'text' ? (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#5C574F',
                    marginBottom: '8px',
                  }}>
                    Journal Entry, Session Notes, or Free Text
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your text here... We'll analyze it for emotional readiness signals across 5 clinical dimensions."
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '16px',
                      border: '1px solid #E8E2DA',
                      borderRadius: '8px',
                      fontSize: '15px',
                      lineHeight: 1.6,
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    fontSize: '13px',
                    color: '#9A938A',
                  }}>
                    <span>{textInput.length} characters (min 20)</span>
                    <button
                      onClick={loadSampleData}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#5B8A72',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Try Sample Data
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#5C574F',
                    marginBottom: '8px',
                  }}>
                    Upload CSV (max 20 entries)
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #E8E2DA',
                      borderRadius: '8px',
                      padding: '48px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    {csvData.length > 0 ? (
                      <div>
                        <p style={{ fontWeight: 600, color: '#1F1D1A' }}>{csvFileName}</p>
                        <p style={{ color: '#5C574F', fontSize: '14px' }}>{csvData.length} entries loaded</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontWeight: 600, color: '#1F1D1A' }}>Drop CSV file here or click to upload</p>
                        <p style={{ color: '#9A938A', fontSize: '14px', marginTop: '4px' }}>
                          Required columns: user_id, text
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '8px',
                  }}>
                    <button
                      onClick={loadSampleData}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#5B8A72',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Try Sample Data
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: 'rgba(184, 107, 100, 0.1)',
                  border: '1px solid #B86B64',
                  borderRadius: '8px',
                  color: '#B86B64',
                  fontSize: '14px',
                }}>
                  {error}
                </div>
              )}

              {/* Rate Limited */}
              {status === 'rate_limited' && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(212, 151, 59, 0.1)',
                  border: '1px solid #D4973B',
                  borderRadius: '8px',
                  color: '#1F1D1A',
                }}>
                  <p style={{ fontWeight: 600, marginBottom: '8px' }}>Free assessment limit reached</p>
                  <p style={{ fontSize: '14px', color: '#5C574F' }}>
                    You've used all {MAX_FREE_ASSESSMENTS} free assessments.{' '}
                    <Link href="/partners/signup" style={{ color: '#5B8A72', fontWeight: 600 }}>
                      Get your API key
                    </Link>{' '}
                    for unlimited access.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={
                  status === 'loading' ||
                  isRateLimited ||
                  (inputMode === 'text' && textInput.length < 20) ||
                  (inputMode === 'csv' && csvData.length === 0)
                }
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '16px',
                  background: status === 'loading' || isRateLimited ? '#C4BEB6' : '#5B8A72',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: status === 'loading' || isRateLimited ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {status === 'loading' ? (
                  <>
                    <LoadingSpinner />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze {inputMode === 'csv' ? `${csvData.length} Entries` : 'Text'}
                  </>
                )}
              </button>
              {!isRateLimited && (
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#9A938A', textAlign: 'center' }}>
                  {remainingAssessments} free assessment{remainingAssessments !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>

            {/* Features Preview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginTop: '32px',
            }}>
              {[
                {
                  title: 'AI-Powered Analysis',
                  description: "Paceful's AI analyzes text for emotional signals across 5 clinical dimensions.",
                },
                {
                  title: 'Detailed Breakdown',
                  description: 'Get scores and reasoning for each dimension with confidence levels.',
                },
                {
                  title: 'Batch Processing',
                  description: 'Analyze up to 20 entries at once with trend detection.',
                },
              ].map((feature) => (
                <div key={feature.title} style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E8E2DA',
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{feature.title}</h3>
                  <p style={{ fontSize: '14px', color: '#5C574F' }}>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Conversion Banner - appears after 3+ assessments */}
      {assessmentCount >= 3 && !showEmailCapture && !bannerDismissed && status !== 'success' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #5B8A72 0%, #3D6B54 100%)',
          padding: '16px 24px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          zIndex: 40,
        }}>
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '16px',
                color: '#FFFFFF',
              }}>
                Ready to integrate?
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.85)',
              }}>
                Get your API keys in 60 seconds and start building
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Link
                href="/partners/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: '#D4973B',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Get API Keys
                <span>→</span>
              </Link>
              <button
                onClick={() => {
                  setBannerDismissed(true);
                  localStorage.setItem('paceful_sandbox_banner_dismissed', 'true');
                }}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '20px',
                  lineHeight: 1,
                }}
                aria-label="Dismiss banner"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #E8E2DA',
        padding: '24px',
        textAlign: 'center',
        marginTop: '48px',
        marginBottom: assessmentCount >= 3 && !bannerDismissed && status !== 'success' ? '80px' : 0,
      }}>
        <p style={{ fontSize: '14px', color: '#9A938A' }}>
          Built by Paceful · <Link href="/partners" style={{ color: '#5B8A72' }}>Partner API</Link> · <Link href="/partners/docs" style={{ color: '#5B8A72' }}>Documentation</Link>
        </p>
      </footer>
    </div>
  );
}

// Components

function LoadingSpinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" fill="none" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function SingleResultView({ result }: { result: SingleResult }) {
  const stage = getStage(result.ers_snapshot);
  const [showJson, setShowJson] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify({ success: true, data: result }, null, 2));
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  return (
    <div>
      {/* Score Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #E8E2DA',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '20px',
          fontWeight: 500,
          color: '#5C574F',
          marginBottom: '24px',
        }}>
          Emotional Readiness Score
        </h2>

        {/* Gauge */}
        <ERSGauge score={result.ers_snapshot} />

        {/* Stage Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: stage.bgLight,
          borderRadius: '20px',
          marginTop: '16px',
        }}>
          <span style={{ fontSize: '16px' }}>{stage.icon}</span>
          <span style={{ fontWeight: 600, color: stage.color }}>{result.readiness_label}</span>
        </div>

        <p style={{
          color: '#5C574F',
          fontSize: '14px',
          marginTop: '12px',
        }}>
          Confidence: {result.confidence}
        </p>
      </div>

      {/* Dimension Breakdown */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #E8E2DA',
        marginTop: '24px',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '20px',
        }}>
          Dimension Breakdown
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(Object.keys(result.dimensions) as Dimension[]).map((dim) => (
            <DimensionBar
              key={dim}
              dimension={dim}
              data={result.dimensions[dim]}
            />
          ))}
        </div>
      </div>

      {/* Reasoning */}
      {result.dimensions.emotional_stability.reasoning && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E8E2DA',
          marginTop: '24px',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            Analysis Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(Object.keys(result.dimensions) as Dimension[]).map((dim) => (
              <div key={dim} style={{
                padding: '12px 16px',
                background: '#F9F6F2',
                borderRadius: '8px',
                borderLeft: `3px solid ${DIMENSION_COLORS[dim]}`,
              }}>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                  {DIMENSION_LABELS[dim]}
                </p>
                <p style={{ fontSize: '14px', color: '#5C574F' }}>
                  {result.dimensions[dim].reasoning}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON Response Toggle */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={() => setShowJson(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            padding: '8px 0',
            fontSize: '13px',
            fontWeight: 600,
            color: '#5B8A72',
            cursor: 'pointer',
          }}
        >
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.2s',
            transform: showJson ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize: '10px',
          }}>▶</span>
          {showJson ? 'Hide' : 'See the'} JSON response
        </button>

        {showJson && (
          <div style={{ position: 'relative', marginTop: '8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              background: '#1A1A1A',
              borderRadius: '8px 8px 0 0',
              borderBottom: '1px solid #333',
            }}>
              <span style={{ fontSize: '12px', color: '#9A938A', fontFamily: 'monospace' }}>
                POST /api/v1/assess/analyze → 200 OK
              </span>
              <button
                onClick={handleCopyJson}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  background: jsonCopied ? '#5B8A72' : '#3D3D3A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {jsonCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: '16px',
              background: '#2D2D2D',
              borderRadius: '0 0 8px 8px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              color: '#E5E0D9',
              overflowX: 'auto',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {JSON.stringify({ success: true, data: result }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchResultView({ result }: { result: BatchResult }) {
  const stage = getStage(result.composite_ers_score);

  return (
    <div>
      {/* Composite Score Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #E8E2DA',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '20px',
          fontWeight: 500,
          color: '#5C574F',
          marginBottom: '24px',
        }}>
          Composite Emotional Readiness Score
        </h2>

        {/* Gauge */}
        <ERSGauge score={result.composite_ers_score} />

        {/* Stage Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: stage.bgLight,
          borderRadius: '20px',
          marginTop: '16px',
        }}>
          <span style={{ fontSize: '16px' }}>{stage.icon}</span>
          <span style={{ fontWeight: 600, color: stage.color }}>{result.readiness_label}</span>
        </div>

        {/* Trend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '20px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#9A938A' }}>Trend</p>
            <p style={{
              fontWeight: 600,
              color: result.trend.direction === 'improving' ? '#5B8A72' :
                result.trend.direction === 'declining' ? '#B86B64' : '#5C574F',
            }}>
              {result.trend.direction === 'improving' ? '↑' :
                result.trend.direction === 'declining' ? '↓' : '→'}{' '}
              {result.trend.direction.charAt(0).toUpperCase() + result.trend.direction.slice(1)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#9A938A' }}>Entries</p>
            <p style={{ fontWeight: 600 }}>{result.entry_count}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#9A938A' }}>Confidence</p>
            <p style={{ fontWeight: 600 }}>{result.composite_confidence}</p>
          </div>
        </div>
      </div>

      {/* User Scores Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #E8E2DA',
        marginTop: '24px',
        overflowX: 'auto',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
        }}>
          Individual Scores
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E2DA' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', color: '#9A938A', fontWeight: 600 }}>User ID</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', color: '#9A938A', fontWeight: 600 }}>Score</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', color: '#9A938A', fontWeight: 600 }}>Stage</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', color: '#9A938A', fontWeight: 600 }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {result.entries.map((entry, idx) => {
              const entryStage = getStage(entry.ers_score);
              return (
                <tr key={idx} style={{ borderBottom: idx < result.entries.length - 1 ? '1px solid #F0EBE4' : 'none' }}>
                  <td style={{ padding: '12px 8px', fontSize: '14px' }}>{entry.user_id}</td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>{entry.ers_score}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      background: entryStage.bgLight,
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: entryStage.color,
                    }}>
                      {entryStage.icon} {entry.readiness_label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', color: '#5C574F' }}>{entry.confidence}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Distribution Chart */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #E8E2DA',
        marginTop: '24px',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
        }}>
          Score Distribution
        </h3>
        <ScoreDistributionChart entries={result.entries} />
      </div>

      {/* Dimension Breakdown */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #E8E2DA',
        marginTop: '24px',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '20px',
        }}>
          Dimension Breakdown
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(Object.keys(result.dimensions) as Dimension[]).map((dim) => (
            <DimensionBar
              key={dim}
              dimension={dim}
              data={result.dimensions[dim]}
              showTrend={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ERSGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = Math.PI * radius; // Half circle
  const progress = (score / 100) * circumference;
  const stage = getStage(score);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Background arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="#E8E2DA"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke={stage.color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <span style={{
          fontSize: '36px',
          fontWeight: 700,
          color: stage.color,
        }}>
          {score}
        </span>
        <span style={{
          display: 'block',
          fontSize: '12px',
          color: '#9A938A',
          marginTop: '-4px',
        }}>
          out of 100
        </span>
      </div>
    </div>
  );
}

function DimensionBar({
  dimension,
  data,
  showTrend = false,
}: {
  dimension: Dimension;
  data: DimensionResult & { trend?: string };
  showTrend?: boolean;
}) {
  const color = DIMENSION_COLORS[dimension];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{DIMENSION_LABELS[dimension]}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showTrend && data.trend && (
            <span style={{
              fontSize: '12px',
              color: data.trend === 'improving' ? '#5B8A72' :
                data.trend === 'declining' ? '#B86B64' : '#9A938A',
            }}>
              {data.trend === 'improving' ? '↑' : data.trend === 'declining' ? '↓' : '→'}
            </span>
          )}
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{data.score}</span>
        </div>
      </div>
      <div style={{
        height: '8px',
        background: '#F0EBE4',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${data.score}%`,
          background: color,
          borderRadius: '4px',
          transition: 'width 0.5s ease-out',
        }} />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '4px',
        fontSize: '12px',
        color: '#9A938A',
      }}>
        <span>{data.label}</span>
        <span>Confidence: {data.confidence}</span>
      </div>
    </div>
  );
}

function ScoreDistributionChart({ entries }: { entries: BatchEntryResult[] }) {
  // Group scores into buckets
  const buckets = [
    { label: '0-25', min: 0, max: 25, count: 0, color: '#B86B64' },
    { label: '26-50', min: 26, max: 50, count: 0, color: '#D4973B' },
    { label: '51-75', min: 51, max: 75, count: 0, color: '#7BA896' },
    { label: '76-100', min: 76, max: 100, count: 0, color: '#5B8A72' },
  ];

  entries.forEach((entry) => {
    for (const bucket of buckets) {
      if (entry.ers_score >= bucket.min && entry.ers_score <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  });

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '120px' }}>
      {buckets.map((bucket) => (
        <div key={bucket.label} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            height: `${(bucket.count / maxCount) * 100}px`,
            background: bucket.color,
            borderRadius: '4px 4px 0 0',
            marginBottom: '8px',
            transition: 'height 0.5s ease-out',
            minHeight: bucket.count > 0 ? '20px' : '4px',
          }} />
          <span style={{ fontSize: '12px', color: '#5C574F', fontWeight: 500 }}>
            {bucket.count}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: '#9A938A' }}>
            {bucket.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function getStage(score: number) {
  if (score < 40) {
    return {
      label: 'Healing',
      color: '#B86B64',
      bgLight: 'rgba(184, 107, 100, 0.1)',
      icon: '',
    };
  }
  if (score < 70) {
    return {
      label: 'Rebuilding',
      color: '#D4973B',
      bgLight: 'rgba(212, 151, 59, 0.1)',
      icon: '',
    };
  }
  return {
    label: 'Ready',
    color: '#5B8A72',
    bgLight: 'rgba(91, 138, 114, 0.1)',
    icon: '',
  };
}
