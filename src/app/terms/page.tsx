import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Paceful',
  description: 'Terms and conditions for using Paceful',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      <div className="max-w-[680px] mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[14px] font-medium mb-8 transition-opacity hover:opacity-80"
          style={{ color: '#5B8A72' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div
          className="bg-white rounded-3xl p-8 sm:p-10"
          style={{ border: '1px solid #F0EBE4' }}
        >
          <h1
            className="text-[28px] sm:text-[32px] font-bold mb-2"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Terms of Service
          </h1>
          <p className="text-[14px] mb-8" style={{ color: '#9A938A' }}>
            Last updated: February 1, 2026
          </p>

          <div className="space-y-8" style={{ lineHeight: 1.7 }}>
            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                1. Acceptance of Terms
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                By accessing or using Paceful, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                2. Description of Service
              </h2>
              <p className="text-[15px] mb-3" style={{ color: '#5C574F' }}>
                Paceful is a self-help emotional wellness platform that provides:
              </p>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li>Mood tracking and journaling tools</li>
                <li>Emotional Readiness Score (ERS) calculations</li>
                <li>Guided exercises and resources</li>
                <li>Community connection features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                3. Important Disclaimer
              </h2>
              <div
                className="rounded-2xl p-4 mb-4"
                style={{ background: 'rgba(212,151,59,0.08)', border: '1px solid rgba(212,151,59,0.2)' }}
              >
                <p className="font-medium text-[15px]" style={{ color: '#D4973B' }}>
                  Paceful is NOT a substitute for professional mental health care.
                </p>
              </div>
              <p className="text-[15px] mb-3" style={{ color: '#5C574F' }}>
                Our services are designed for self-reflection and emotional tracking only. If you are experiencing a mental health crisis, please contact:
              </p>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li>Emergency services (911 in the US)</li>
                <li>National Suicide Prevention Lifeline: 988</li>
                <li>Crisis Text Line: Text HOME to 741741</li>
                <li>A licensed mental health professional</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                4. User Responsibilities
              </h2>
              <p className="text-[15px] mb-3" style={{ color: '#5C574F' }}>As a user, you agree to:</p>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li>Provide accurate information when creating your account</li>
                <li>Keep your account credentials secure</li>
                <li>Use the service for personal, non-commercial purposes only</li>
                <li>Treat other community members with respect</li>
                <li>Not share harmful or inappropriate content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                5. Intellectual Property
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                All content, features, and functionality of Paceful are owned by Paceful and are protected by intellectual property laws. You retain ownership of the content you create (mood entries, journal entries, etc.).
              </p>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                6. Data and Privacy
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                Your use of Paceful is also governed by our{' '}
                <Link href="/privacy" className="font-medium" style={{ color: '#5B8A72' }}>
                  Privacy Policy
                </Link>
                . By using our services, you consent to the collection and use of your data as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                7. Account Termination
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                You may delete your account at any time. We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior.
              </p>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                8. Limitation of Liability
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                Paceful is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the service, including but not limited to emotional distress, data loss, or service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                9. Changes to Terms
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                We may update these terms from time to time. We will notify you of significant changes via email or in-app notification. Continued use of Paceful after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                10. Contact
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                For questions about these Terms of Service, please contact us at{' '}
                <a
                  href="mailto:legal@paceful.com"
                  className="font-medium"
                  style={{ color: '#5B8A72' }}
                >
                  legal@paceful.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
