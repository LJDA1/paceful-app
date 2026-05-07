import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

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
    <>
      <MarketingNav />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-fraunces, Fraunces, serif)',
            fontSize: '36px',
            fontWeight: 500,
            color: '#1F1D1A',
            marginBottom: '48px',
          }}
        >
          Security
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {sections.map(({ heading, body }) => (
            <section key={heading}>
              <h2
                style={{
                  fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: '#1F1D1A',
                  marginBottom: '10px',
                }}
              >
                {heading}
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: 1.75,
                  color: '#5C574F',
                  margin: 0,
                }}
              >
                {body}
              </p>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
