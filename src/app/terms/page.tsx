import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Paceful',
  description: 'Terms and conditions for using Paceful',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-stone-900 mb-8">Terms of Service</h1>

        <div className="prose prose-stone max-w-none">
          <p className="text-stone-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">1. Acceptance of Terms</h2>
            <p className="text-stone-600 mb-4">
              By accessing or using Paceful, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">2. Description of Service</h2>
            <p className="text-stone-600 mb-4">
              Paceful is a self-help emotional wellness platform that provides:
            </p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>Mood tracking and journaling tools</li>
              <li>Emotional Readiness Score (ERS) calculations</li>
              <li>Guided exercises and resources</li>
              <li>Community connection features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">3. Important Disclaimer</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 font-medium">
                Paceful is NOT a substitute for professional mental health care.
              </p>
            </div>
            <p className="text-stone-600 mb-4">
              Our services are designed for self-reflection and emotional tracking only. If you are experiencing a mental health crisis, please contact:
            </p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>Emergency services (911 in the US)</li>
              <li>National Suicide Prevention Lifeline: 988</li>
              <li>Crisis Text Line: Text HOME to 741741</li>
              <li>A licensed mental health professional</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">4. User Responsibilities</h2>
            <p className="text-stone-600 mb-4">As a user, you agree to:</p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>Provide accurate information when creating your account</li>
              <li>Keep your account credentials secure</li>
              <li>Use the service for personal, non-commercial purposes only</li>
              <li>Treat other community members with respect</li>
              <li>Not share harmful or inappropriate content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">5. Intellectual Property</h2>
            <p className="text-stone-600 mb-4">
              All content, features, and functionality of Paceful are owned by Paceful and are protected by intellectual property laws. You retain ownership of the content you create (mood entries, journal entries, etc.).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">6. Data and Privacy</h2>
            <p className="text-stone-600 mb-4">
              Your use of Paceful is also governed by our{' '}
              <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700">
                Privacy Policy
              </Link>
              . By using our services, you consent to the collection and use of your data as described in the Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">7. Account Termination</h2>
            <p className="text-stone-600 mb-4">
              You may delete your account at any time. We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">8. Limitation of Liability</h2>
            <p className="text-stone-600 mb-4">
              Paceful is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service, including but not limited to emotional distress, data loss, or service interruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">9. Changes to Terms</h2>
            <p className="text-stone-600 mb-4">
              We may update these terms from time to time. We will notify you of significant changes via email or in-app notification. Continued use of Paceful after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">10. Contact</h2>
            <p className="text-stone-600">
              For questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@paceful.com" className="text-indigo-600 hover:text-indigo-700">
                legal@paceful.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
