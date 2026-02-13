'use client';

import { useEffect } from 'react';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: "'DM Sans', sans-serif",
        background: '#F9F6F2',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: '#F3EFE9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <svg
          width="24"
          height="24"
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
          fontSize: 28,
          fontWeight: 700,
          color: '#1F1D1A',
          fontFamily: "'Fraunces', serif",
          marginBottom: 8,
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: 14,
          color: '#9A938A',
          maxWidth: 300,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        We hit an unexpected issue. Please try again.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            background: '#5B8A72',
            color: '#fff',
            border: 'none',
            borderRadius: 50,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <a
          href="/dashboard"
          style={{
            background: 'transparent',
            color: '#5B8A72',
            border: '1.5px solid #5B8A72',
            borderRadius: 50,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
