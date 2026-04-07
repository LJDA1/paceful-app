'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type LoginState = 'form' | 'submitting' | 'success' | 'error';

function LoginContent() {
  const [loginState, setLoginState] = useState<LoginState>('form');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const searchParams = useSearchParams();

  // Check for error query params on mount
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_token: 'Invalid login link. Please request a new one.',
        invalid_token: 'This login link is invalid or has already been used.',
        token_expired: 'This login link has expired. Please request a new one.',
        verification_failed: 'Login failed. Please try again.',
      };
      setErrorMessage(errorMessages[error] || 'An error occurred. Please try again.');
      setLoginState('error');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/partner/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || 'Something went wrong. Please try again.');
        setLoginState('error');
        return;
      }

      setLoginState('success');
    } catch (err) {
      setErrorMessage('Network error. Please check your connection and try again.');
      setLoginState('error');
    }
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
      maxWidth: '400px',
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
      maxWidth: '400px',
      margin: '0 auto',
      padding: '80px 24px',
    } as React.CSSProperties,
    title: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#1F1D1A',
      marginBottom: '8px',
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
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '1px solid #E5E0D9',
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      color: '#1F1D1A',
      boxSizing: 'border-box' as const,
      outline: 'none',
    },
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
      marginBottom: '8px',
      lineHeight: 1.6,
    },
    successEmail: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#1F1D1A',
      marginBottom: '32px',
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
    hint: {
      fontSize: '13px',
      color: '#9A938A',
      marginTop: '8px',
    } as React.CSSProperties,
  };

  if (loginState === 'success') {
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
            <div style={styles.successIcon}>📧</div>
            <h1 style={styles.successTitle}>Check your email</h1>
            <p style={styles.successText}>
              We sent a login link to:
            </p>
            <p style={styles.successEmail}>{email}</p>
            <p style={{ ...styles.successText, marginBottom: '32px' }}>
              Click the link in the email to log in to your dashboard. The link expires in 15 minutes.
            </p>
            <button
              onClick={() => {
                setLoginState('form');
                setEmail('');
              }}
              style={styles.link}
            >
              Try a different email
            </button>
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
          <Link href="/partners/signup" style={{ color: '#5B8A72', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
            Sign up
          </Link>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>Partner Login</h1>
        <p style={styles.subtitle}>
          Enter your email and we&apos;ll send you a magic link to log in.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {(loginState === 'error' && errorMessage) && (
            <div style={styles.error}>{errorMessage}</div>
          )}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
            />
            <p style={styles.hint}>Use the email you signed up with</p>
          </div>

          <button
            type="submit"
            disabled={loginState === 'submitting' || !email.trim()}
            style={{
              ...styles.submitButton,
              ...(loginState === 'submitting' || !email.trim() ? styles.submitButtonDisabled : {}),
            }}
          >
            {loginState === 'submitting' ? 'Sending...' : 'Send login link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#9A938A' }}>
          Don&apos;t have an account?{' '}
          <Link href="/partners/signup" style={{ color: '#5B8A72' }}>
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF9F7',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{ color: '#6B6560' }}>Loading...</p>
    </div>
  );
}

// Export wrapped in Suspense for useSearchParams
export default function PartnerLogin() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
