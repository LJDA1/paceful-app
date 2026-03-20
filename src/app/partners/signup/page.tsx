'use client';

import { useState } from 'react';
import Link from 'next/link';

type FormState = 'form' | 'submitting' | 'success' | 'error';

interface FormData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  companyUrl: string;
  useCase: string;
  expectedVolume: string;
  description: string;
}

const USE_CASES = [
  { value: '', label: 'Select your industry...' },
  { value: 'Dating App', label: 'Dating App' },
  { value: 'Mental Health Platform', label: 'Mental Health Platform' },
  { value: 'Workplace Wellness', label: 'Workplace Wellness' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Coaching', label: 'Coaching' },
  { value: 'Education', label: 'Education' },
  { value: 'Gambling/Responsible Gaming', label: 'Gambling / Responsible Gaming' },
  { value: 'Other', label: 'Other' },
];

const VOLUMES = [
  { value: '', label: 'Select expected volume...' },
  { value: 'Just exploring', label: 'Just exploring' },
  { value: 'Under 1,000 calls', label: 'Under 1,000 calls/month' },
  { value: '1,000-10,000', label: '1,000 - 10,000 calls/month' },
  { value: '10,000-100,000', label: '10,000 - 100,000 calls/month' },
  { value: '100,000+', label: '100,000+ calls/month' },
];

export default function PartnerSignup() {
  const [formState, setFormState] = useState<FormState>('form');
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactName: '',
    contactEmail: '',
    companyUrl: '',
    useCase: '',
    expectedVolume: '',
    description: '',
  });
  const [sandboxKey, setSandboxKey] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/partner/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || 'Something went wrong. Please try again.');
        setFormState('error');
        return;
      }

      setSandboxKey(data.sandboxApiKey);
      setFormState('success');
    } catch (err) {
      setErrorMessage('Network error. Please check your connection and try again.');
      setFormState('error');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sandboxKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#FAF9F7',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    } as React.CSSProperties,
    header: {
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E5E0D9',
      padding: '16px 24px',
    } as React.CSSProperties,
    headerContent: {
      maxWidth: '600px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as React.CSSProperties,
    logo: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#1F1D1A',
      textDecoration: 'none',
    } as React.CSSProperties,
    main: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '48px 24px',
    } as React.CSSProperties,
    title: {
      fontSize: '32px',
      fontWeight: 700,
      color: '#1F1D1A',
      marginBottom: '12px',
      textAlign: 'center' as const,
    },
    subtitle: {
      fontSize: '16px',
      color: '#6B6560',
      marginBottom: '32px',
      textAlign: 'center' as const,
      lineHeight: 1.6,
    },
    form: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E5E0D9',
      padding: '32px',
    } as React.CSSProperties,
    fieldGroup: {
      marginBottom: '24px',
    } as React.CSSProperties,
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 600,
      color: '#1F1D1A',
      marginBottom: '8px',
    } as React.CSSProperties,
    required: {
      color: '#B56B6B',
      marginLeft: '4px',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '1px solid #E5E0D9',
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      color: '#1F1D1A',
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s',
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '1px solid #E5E0D9',
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      color: '#1F1D1A',
      boxSizing: 'border-box' as const,
      cursor: 'pointer',
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '1px solid #E5E0D9',
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      color: '#1F1D1A',
      boxSizing: 'border-box' as const,
      minHeight: '100px',
      resize: 'vertical' as const,
      fontFamily: 'inherit',
    },
    hint: {
      fontSize: '13px',
      color: '#9A938A',
      marginTop: '6px',
    } as React.CSSProperties,
    submitButton: {
      width: '100%',
      padding: '14px 24px',
      fontSize: '16px',
      fontWeight: 600,
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    } as React.CSSProperties,
    submitButtonDisabled: {
      backgroundColor: '#9A938A',
      cursor: 'not-allowed',
    } as React.CSSProperties,
    error: {
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      color: '#991B1B',
      fontSize: '14px',
    } as React.CSSProperties,
    successContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E5E0D9',
      padding: '48px 32px',
      textAlign: 'center' as const,
    },
    successIcon: {
      fontSize: '48px',
      marginBottom: '24px',
    },
    successTitle: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#1F1D1A',
      marginBottom: '12px',
    },
    successText: {
      fontSize: '15px',
      color: '#6B6560',
      marginBottom: '32px',
      lineHeight: 1.6,
    },
    keyContainer: {
      backgroundColor: '#F5F5F5',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
    } as React.CSSProperties,
    keyLabel: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#6B6560',
      marginBottom: '8px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    keyValue: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
    },
    keyText: {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#1F1D1A',
      backgroundColor: '#FFFFFF',
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #E5E0D9',
    } as React.CSSProperties,
    copyButton: {
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: 600,
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    } as React.CSSProperties,
    linkGroup: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      marginTop: '24px',
    },
    link: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 600,
      backgroundColor: '#FFFFFF',
      color: '#5B8A72',
      border: '1px solid #5B8A72',
      borderRadius: '8px',
      textDecoration: 'none',
      transition: 'background-color 0.2s',
    } as React.CSSProperties,
    primaryLink: {
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
    },
    note: {
      marginTop: '32px',
      padding: '16px',
      backgroundColor: '#FEF9E7',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#92400E',
      lineHeight: 1.5,
    } as React.CSSProperties,
  };

  if (formState === 'success') {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/partners" style={styles.logo}>
              Paceful
            </Link>
          </div>
        </header>

        <main style={styles.main}>
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>🎉</div>
            <h1 style={styles.successTitle}>You&apos;re All Set!</h1>
            <p style={styles.successText}>
              Your sandbox API key is active immediately. Start building your integration now.
            </p>

            <div style={styles.keyContainer}>
              <div style={styles.keyLabel}>Your Sandbox API Key</div>
              <div style={styles.keyValue}>
                <code style={styles.keyText}>{sandboxKey}</code>
                <button onClick={copyToClipboard} style={styles.copyButton}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={styles.linkGroup}>
              <Link href="/partners/docs#playground" style={{ ...styles.link, ...styles.primaryLink }}>
                Try the Playground
              </Link>
              <Link href="/partners/docs" style={styles.link}>
                Read the Docs
              </Link>
            </div>

            <div style={styles.note}>
              <strong>What&apos;s next?</strong> Your sandbox key works with all API endpoints using mock data.
              To upgrade to a production key with real data, we&apos;ll review your application and reach out within 24 hours.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/partners" style={styles.logo}>
            Paceful
          </Link>
          <Link href="/partners/docs" style={{ color: '#6B6560', fontSize: '14px', textDecoration: 'none' }}>
            Documentation
          </Link>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>Get Your API Key</h1>
        <p style={styles.subtitle}>
          Start building in 30 seconds. Your sandbox key works immediately — no approval needed.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {formState === 'error' && (
            <div style={styles.error}>{errorMessage}</div>
          )}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Company Name<span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Acme Health"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Your Name<span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Jane Smith"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Email<span style={styles.required}>*</span>
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="jane@acmehealth.com"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Company Website</label>
            <input
              type="url"
              name="companyUrl"
              value={formData.companyUrl}
              onChange={handleChange}
              style={styles.input}
              placeholder="https://acmehealth.com"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Industry / Use Case</label>
            <select
              name="useCase"
              value={formData.useCase}
              onChange={handleChange}
              style={styles.select}
            >
              {USE_CASES.map((uc) => (
                <option key={uc.value} value={uc.value}>
                  {uc.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Expected Monthly API Volume</label>
            <select
              name="expectedVolume"
              value={formData.expectedVolume}
              onChange={handleChange}
              style={styles.select}
            >
              {VOLUMES.map((vol) => (
                <option key={vol.value} value={vol.value}>
                  {vol.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Tell us about your integration</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="How do you plan to use Paceful's ERS in your product?"
            />
            <p style={styles.hint}>Optional — helps us understand your needs better</p>
          </div>

          <button
            type="submit"
            disabled={formState === 'submitting'}
            style={{
              ...styles.submitButton,
              ...(formState === 'submitting' ? styles.submitButtonDisabled : {}),
            }}
          >
            {formState === 'submitting' ? 'Creating your key...' : 'Get My Sandbox Key'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#9A938A' }}>
          Already have a key?{' '}
          <Link href="/partners/docs" style={{ color: '#5B8A72' }}>
            Go to Documentation
          </Link>
        </p>
      </main>
    </div>
  );
}
