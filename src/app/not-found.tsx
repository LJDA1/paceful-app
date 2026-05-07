import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export default function NotFound() {
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
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
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
          Page not found.
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
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          style={{
            background: '#1C1917',
            color: '#FAFAF9',
            border: 'none',
            borderRadius: 4,
            padding: '11px 28px',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Back to homepage
        </Link>
      </main>
      <MarketingFooter />
    </>
  );
}
