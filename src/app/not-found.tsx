import Link from 'next/link';

export default function NotFound() {
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
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
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
        Page not found
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
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/dashboard"
        style={{
          background: '#5B8A72',
          color: '#fff',
          border: 'none',
          borderRadius: 50,
          padding: '12px 28px',
          fontSize: 15,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Go home
      </Link>
    </div>
  );
}
