'use client';

import { useEffect } from 'react';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <>
      <MarketingNav />
      <main
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          textAlign: 'center',
          background: 'var(--bg)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 4,
            background: '#F0EBE4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9A938A"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: '#1F1D1A',
            fontFamily: 'var(--font-fraunces, Fraunces, serif)',
            marginBottom: 10,
          }}
        >
          Something went wrong.
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#9A938A',
            maxWidth: 320,
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          We hit an unexpected issue. Try again or contact support if the problem persists.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              background: '#1C1917',
              color: '#FAFAF9',
              border: 'none',
              borderRadius: 4,
              padding: '11px 28px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: 'transparent',
              color: '#1C1917',
              border: '1px solid #C8C3BB',
              borderRadius: 4,
              padding: '11px 28px',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Back to homepage
          </a>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
