import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Paceful',
  description: 'How Paceful collects, processes, and protects data in connection with the Paceful API and partner services.',
};

const EFFECTIVE_DATE = 'April 8, 2026';

function Section({ n, heading, children }: { n: string; heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontFamily: "'Fraunces', serif",
        fontSize: '18px',
        fontWeight: 500,
        color: '#1F1D1A',
        marginBottom: '14px',
      }}>
        {n}. {heading}
      </h2>
      <div style={{
        fontSize: '15px',
        lineHeight: 1.8,
        color: '#5C574F',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
      }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
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

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '56px 24px 80px' }}>

        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '36px',
          fontWeight: 500,
          color: '#1F1D1A',
          marginBottom: '8px',
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '14px', color: '#9A938A', marginBottom: '48px' }}>
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

          <Section n="1" heading="Introduction">
            <p>Paceful Ltd ("Paceful", "we", "us", "our") operates the Paceful API and associated partner services. This Privacy Policy explains what data we collect, how we process it, and the rights available to individuals whose data may be involved in that processing.</p>
            <p>This policy applies to partners who access the Paceful API and, where relevant, to the end-users of those partners' products. It does not apply to third-party services or websites that may be linked from our platform.</p>
            <p>Paceful acts as a data processor on behalf of its partners. Partners are the data controllers for any personal data belonging to their end-users that is submitted via the API. Partners should refer to their own privacy policies for information about how they collect and use end-user data.</p>
          </Section>

          <Section n="2" heading="Data We Collect">
            <p>We collect and process the following categories of data in connection with the Service:</p>
            <p><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Partner account information.</strong> When a partner registers, we collect their business email address, company name, and the industry vertical for which they intend to use the API. This information is used to administer the account and to communicate about the Service.</p>
            <p><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>API usage logs.</strong> We retain logs of API activity, including the endpoints called, request timestamps, HTTP response codes, and response times. These logs are used for billing, rate limit enforcement, security monitoring, and service improvement. Logs do not contain the content of API requests.</p>
            <p><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Assessment scores.</strong> We retain the numerical outputs of each API call — ERS scores and dimension-level scores — associated with a hashed, non-reversible reference to the originating request. Assessment scores are anonymised and cannot be linked back to any individual without information held solely by the partner.</p>
          </Section>

          <Section n="3" heading="Data We Do Not Collect">
            <p>We do not store the raw text submitted to the API. All text input is processed in memory for the purpose of generating a score and is permanently discarded upon completion of that operation. No copy of submitted text is written to disk or retained in any database.</p>
            <p>We do not directly collect personal data about end-users of partner products. Partners are responsible for managing their end-users' data and for ensuring that appropriate consent or another lawful basis exists before submitting text to the API.</p>
          </Section>

          <Section n="4" heading="How We Process Data">
            <p>Text submitted via the API is loaded into memory, passed to our scoring infrastructure, and used solely to produce an ERS score. This process is ephemeral: the text exists in memory only for the duration required to compute the score and is not written to any persistent storage at any point.</p>
            <p>The resulting numerical scores, together with a one-way hashed reference derived from the request, are stored in our database. The hash is computed using a cryptographic function that does not permit reconstruction of the original text.</p>
            <p>Partner account information and API usage logs are stored in our secure database infrastructure and accessed only by authorised Paceful personnel for the purposes described in this policy.</p>
          </Section>

          <Section n="5" heading="Data Retention">
            <p>Assessment scores are retained for a period of 12 months from the date of generation, after which they are permanently deleted. Partners may request earlier deletion of their data at any time.</p>
            <p>Partner account data is retained for the duration of the active account relationship. Upon termination of a partner account, account data is retained for a further 90 days to facilitate dispute resolution and compliance obligations, after which it is deleted.</p>
            <p>API usage logs are retained for 12 months for security and billing purposes.</p>
            <p>To request deletion of data ahead of these schedules, partners should contact <a href="mailto:privacy@paceful.com" style={{ color: '#5B8A72' }}>privacy@paceful.com</a>.</p>
          </Section>

          <Section n="6" heading="Data Sharing">
            <p>We do not sell data to third parties. We do not share data with advertisers, data brokers, or any third party for commercial purposes unrelated to the operation of the Service.</p>
            <p>We engage a small number of sub-processors who provide infrastructure services necessary to operate the Service, including cloud hosting (Vercel) and database services (Supabase). These sub-processors are bound by data processing agreements and are contractually prohibited from using data for any purpose other than providing their respective services to us.</p>
            <p>We may disclose data where required to do so by applicable law, regulation, or lawful order of a competent authority.</p>
          </Section>

          <Section n="7" heading="Partner Responsibilities">
            <p>Partners are data controllers for the personal data of their end-users. As data controllers, partners are responsible for:</p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Establishing and maintaining a valid lawful basis for processing end-user data, including any text submitted to the API.</li>
              <li>Providing end-users with clear, accurate information about how their data is processed, including its submission to Paceful for scoring.</li>
              <li>Ensuring that end-users have provided appropriate consent, or that another lawful basis applies, before text is submitted to the API.</li>
              <li>Responding to any data subject requests received from their end-users in respect of personal data processed via the API.</li>
            </ul>
            <p>Partners who require a Data Processing Agreement ("DPA") to satisfy their obligations under applicable data protection law should contact <a href="mailto:legal@paceful.com" style={{ color: '#5B8A72' }}>legal@paceful.com</a>.</p>
          </Section>

          <Section n="8" heading="GDPR Rights">
            <p>To the extent that the UK GDPR or EU GDPR applies to the processing of personal data described in this policy, individuals may have the following rights in relation to their personal data:</p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Right of access.</strong> The right to obtain confirmation of whether personal data is being processed and, if so, to receive a copy of that data.</li>
              <li><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Right to rectification.</strong> The right to have inaccurate personal data corrected.</li>
              <li><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Right to erasure.</strong> The right to request deletion of personal data in certain circumstances.</li>
              <li><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Right to data portability.</strong> The right to receive personal data in a structured, commonly used, machine-readable format.</li>
              <li><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Right to object.</strong> The right to object to processing carried out on the basis of legitimate interests.</li>
              <li><strong style={{ color: '#1F1D1A', fontWeight: 600 }}>Right to restriction.</strong> The right to request that processing be restricted in certain circumstances.</li>
            </ul>
            <p>End-users wishing to exercise these rights should contact the partner through whose product their data was submitted, as the partner is the data controller. Partners may contact <a href="mailto:privacy@paceful.com" style={{ color: '#5B8A72' }}>privacy@paceful.com</a> to coordinate fulfilment of data subject requests where Paceful holds relevant data.</p>
          </Section>

          <Section n="9" heading="Cookies">
            <p>The Paceful partner dashboard and public website use essential cookies only. These cookies are necessary for the operation of the site — for example, to maintain a logged-in session — and are not used for tracking, advertising, or analytics purposes.</p>
            <p>We do not use third-party advertising cookies or tracking pixels. No data collected via cookies is shared with advertising networks.</p>
          </Section>

          <Section n="10" heading="Security">
            <p>We implement technical and organisational measures appropriate to the risk presented by our data processing activities. Details of our security practices, including encryption standards and infrastructure certifications, are described on our <Link href="/security" style={{ color: '#5B8A72' }}>Security page</Link>.</p>
            <p>To report a security vulnerability, please contact <a href="mailto:security@paceful.com" style={{ color: '#5B8A72' }}>security@paceful.com</a>.</p>
          </Section>

          <Section n="11" heading="Changes to This Policy">
            <p>We may update this Privacy Policy from time to time to reflect changes in our practices, the Service, or applicable law. Where changes are material, we will provide at least 30 days' notice via email to the registered account address before changes take effect.</p>
            <p>The effective date at the top of this policy reflects the date of the most recent revision. We encourage partners to review this policy periodically.</p>
          </Section>

          <Section n="12" heading="Contact">
            <p>For questions about this Privacy Policy or to exercise data rights, please contact:</p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>General privacy enquiries: <a href="mailto:privacy@paceful.com" style={{ color: '#5B8A72' }}>privacy@paceful.com</a></li>
              <li>Legal and contractual matters: <a href="mailto:legal@paceful.com" style={{ color: '#5B8A72' }}>legal@paceful.com</a></li>
            </ul>
          </Section>

        </div>
      </main>

      <footer style={{ borderTop: '1px solid #E8E2DA', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#9A938A' }}>
          <Link href="/terms" style={{ color: '#5B8A72' }}>Terms of Service</Link>
          {' · '}
          <Link href="/security" style={{ color: '#5B8A72' }}>Security</Link>
        </p>
      </footer>

    </div>
  );
}
