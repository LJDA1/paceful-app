import Link from 'next/link';

const sections = [
  {
    heading: 'Data Handling',
    body: 'Paceful never stores raw text from partner API calls. All input is processed in memory and discarded after scoring. Only hashed references and assessment scores are retained.',
  },
  {
    heading: 'Encryption',
    body: 'All data in transit is encrypted via TLS 1.2+. Data at rest is encrypted with AES-256 via our infrastructure providers.',
  },
  {
    heading: 'Authentication',
    body: 'Partner API access requires unique API keys issued per environment. Keys are hashed server-side and never stored in plaintext. All requests are authenticated and logged.',
  },
  {
    heading: 'Privacy & Compliance',
    body: 'Paceful is designed to be GDPR-compliant. We act as a data processor on behalf of partners. No personal data is shared with third parties. Assessment scores are retained for 12 months unless partners request earlier deletion. Partners can request full data deletion at any time.',
  },
  {
    heading: 'Infrastructure',
    body: 'Hosted on Vercel (SOC 2 Type II certified). Database on Supabase (SOC 2 Type II certified). No data leaves these certified environments.',
  },
  {
    heading: 'SOC 2',
    body: 'Paceful is pursuing SOC 2 Type II certification. Our infrastructure providers are already independently certified.',
  },
  {
    heading: 'Responsible Disclosure',
    body: 'To report a security vulnerability, contact security@paceful.com.',
  },
];

export default function SecurityPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F2', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Logo Bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #E8E2DA', background: '#FFFFFF' }}>
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
      </div>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '56px 24px 80px' }}>

        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '36px',
          fontWeight: 500,
          color: '#1F1D1A',
          marginBottom: '48px',
        }}>
          Security
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {sections.map(({ heading, body }) => (
            <section key={heading}>
              <h2 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '18px',
                fontWeight: 500,
                color: '#1F1D1A',
                marginBottom: '10px',
              }}>
                {heading}
              </h2>
              <p style={{
                fontSize: '15px',
                lineHeight: 1.75,
                color: '#5C574F',
                margin: 0,
              }}>
                {body}
              </p>
            </section>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E8E2DA', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#9A938A' }}>
          <Link href="/terms" style={{ color: '#5B8A72' }}>Terms</Link>
          {' · '}
          <Link href="/privacy" style={{ color: '#5B8A72' }}>Privacy</Link>
          {' · '}
          <Link href="/status" style={{ color: '#5B8A72' }}>Status</Link>
        </p>
      </footer>

    </div>
  );
}
