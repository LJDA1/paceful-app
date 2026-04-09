import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Paceful',
  description: 'Terms governing access to and use of the Paceful API and partner services.',
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

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ fontSize: '14px', color: '#9A938A', marginBottom: '48px' }}>
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

          <Section n="1" heading="Acceptance of Terms">
            <p>By accessing or using the Paceful API, partner dashboard, or any associated services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you are accessing the Service on behalf of an organisation, you represent that you have the authority to bind that organisation to these Terms, and references to "you" shall mean that organisation.</p>
            <p>If you do not agree to these Terms, you must not access or use the Service.</p>
          </Section>

          <Section n="2" heading="Description of Service">
            <p>Paceful provides an application programming interface ("API") that analyses unstructured text and returns Emotional Readiness Scores ("ERS") across five clinical dimensions: emotional stability, self-reflection, coping capacity, behavioural engagement, and social readiness. Scores are expressed numerically on a scale of 0 to 100.</p>
            <p>The Service is made available to registered partners ("Partners") for integration into their own products and platforms. Access to the Service is subject to these Terms and any additional agreements entered into between Paceful and the Partner.</p>
          </Section>

          <Section n="3" heading="API Usage">
            <p>Upon registration, Partners are issued one or more API keys. Each API key is issued per environment (e.g. sandbox, production) and is unique to the Partner account.</p>
            <p>Partners must:</p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Keep API keys confidential and not share them with unauthorised third parties.</li>
              <li>Notify Paceful immediately upon becoming aware of any actual or suspected unauthorised use of an API key.</li>
              <li>Revoke and replace compromised keys promptly via the partner dashboard.</li>
            </ul>
            <p>Partners must not:</p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Attempt to reverse-engineer, reconstruct, or derive the ERS scoring methodology, model weights, or underlying algorithms.</li>
              <li>Resell, sublicense, or otherwise make the API available to third parties as a standalone product without express written consent from Paceful.</li>
              <li>Use the API in any manner that could damage, disable, or impair the Service or interfere with other partners' use of the Service.</li>
            </ul>
          </Section>

          <Section n="4" heading="Acceptable Use">
            <p>Partners are solely responsible for ensuring that their use of the Service complies with all applicable laws and regulations. Without limiting the foregoing, Partners must not:</p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Submit text for analysis without having obtained appropriate informed consent from the end-user whose text is being submitted.</li>
              <li>Use ERS scores as the sole or primary basis for making decisions that adversely affect an individual's legal rights, access to opportunities, or fundamental interests, including but not limited to decisions regarding employment, credit, housing, or healthcare.</li>
              <li>Use ERS scores to discriminate against individuals on the basis of any protected characteristic under applicable law.</li>
              <li>Submit text authored by or relating to individuals under the age of 16 without verified parental or guardian consent, or as otherwise required by applicable law.</li>
              <li>Represent ERS scores as clinical diagnoses or as substitutes for professional medical, psychological, or psychiatric assessment.</li>
            </ul>
          </Section>

          <Section n="5" heading="Rate Limits and Fair Use">
            <p>API usage is subject to rate limits that vary by subscription plan, as communicated in the partner dashboard and associated plan documentation. Rate limits are applied on a per-endpoint, per-hour basis.</p>
            <p>Paceful reserves the right to throttle, suspend, or terminate access to the Service in the event of usage that exceeds agreed limits, constitutes abuse of the Service, degrades performance for other partners, or otherwise violates these Terms.</p>
            <p>Partners who anticipate usage exceeding their plan limits should contact Paceful in advance to discuss upgraded capacity.</p>
          </Section>

          <Section n="6" heading="Data Processing">
            <p>For the purposes of applicable data protection legislation, including the UK GDPR and EU GDPR, Paceful acts as a data processor and the Partner acts as the data controller in respect of any personal data submitted via the API.</p>
            <p>Partners are responsible for ensuring they have a lawful basis for processing any personal data submitted to the Service, including obtaining necessary consents from end-users. Paceful's data handling practices are described in full in the <Link href="/privacy" style={{ color: '#5B8A72' }}>Privacy Policy</Link>.</p>
            <p>Where required by applicable law, Partners and Paceful may be required to enter into a separate Data Processing Agreement. Please contact <a href="mailto:legal@paceful.com" style={{ color: '#5B8A72' }}>legal@paceful.com</a> to arrange this.</p>
          </Section>

          <Section n="7" heading="Intellectual Property">
            <p>The Service, including the API, ERS scoring methodology, algorithms, models, documentation, trademarks, and all related technology and content, is the exclusive intellectual property of Paceful and its licensors. Nothing in these Terms transfers any intellectual property rights to the Partner.</p>
            <p>Partners are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the API solely for the purposes set out in these Terms and any applicable order or agreement. This licence does not include the right to copy, modify, create derivative works of, or distribute any part of the Service.</p>
          </Section>

          <Section n="8" heading="Limitation of Liability">
            <p>ERS scores are informational outputs derived from computational analysis of text. They are not clinical assessments, medical diagnoses, or professional opinions. Paceful makes no representation that scores are accurate, complete, or suitable for any particular purpose.</p>
            <p>To the fullest extent permitted by applicable law, Paceful shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of revenue, loss of data, or harm arising from decisions made on the basis of ERS scores.</p>
            <p>Paceful's total aggregate liability to a Partner in connection with these Terms shall not exceed the fees paid by that Partner to Paceful in the three months preceding the event giving rise to the claim.</p>
          </Section>

          <Section n="9" heading="Termination">
            <p>Either party may terminate these Terms by providing 30 days' written notice to the other party. Paceful may terminate immediately, without notice, in the event of a material breach of these Terms by the Partner, including but not limited to violation of the Acceptable Use provisions.</p>
            <p>Upon termination: all API keys issued to the Partner will be revoked; access to the Service will cease; and Paceful will retain assessment data in accordance with the Privacy Policy unless the Partner requests earlier deletion.</p>
            <p>Provisions of these Terms that by their nature should survive termination shall survive, including Sections 7, 8, and 11.</p>
          </Section>

          <Section n="10" heading="Changes to Terms">
            <p>Paceful may update these Terms from time to time. Where changes are material, Paceful will provide at least 30 days' notice via email to the registered account address before changes take effect. Continued use of the Service after the effective date of updated Terms constitutes acceptance of those changes.</p>
            <p>Partners who do not agree to updated Terms should cease using the Service and notify Paceful in writing before the effective date.</p>
          </Section>

          <Section n="11" heading="Governing Law">
            <p>These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales, except where mandatory local law requires otherwise.</p>
          </Section>

          <Section n="12" heading="Contact">
            <p>For questions regarding these Terms, please contact us at <a href="mailto:legal@paceful.com" style={{ color: '#5B8A72' }}>legal@paceful.com</a>.</p>
          </Section>

        </div>
      </main>

      <footer style={{ borderTop: '1px solid #E8E2DA', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#9A938A' }}>
          <Link href="/privacy" style={{ color: '#5B8A72' }}>Privacy Policy</Link>
          {' · '}
          <Link href="/security" style={{ color: '#5B8A72' }}>Security</Link>
        </p>
      </footer>

    </div>
  );
}
