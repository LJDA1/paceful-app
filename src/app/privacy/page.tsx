import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Paceful',
  description: 'How Paceful protects your data and privacy',
};

export default function PrivacyPage() {
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

        <h1 className="text-3xl font-bold text-stone-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-stone max-w-none">
          <p className="text-stone-600 mb-6">
            Last updated: February 1, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">Our Commitment to Privacy</h2>
            <p className="text-stone-600 mb-4">
              At Paceful, we understand that emotional healing is deeply personal. We are committed to protecting your privacy and ensuring that your data is handled with the utmost care and security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">What We Collect</h2>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li><strong>Account Information:</strong> Email address and password (encrypted)</li>
              <li><strong>Profile Data:</strong> Name, date of birth, and optional demographic information</li>
              <li><strong>Mood Entries:</strong> Your mood ratings, emotions, and optional notes</li>
              <li><strong>Journal Entries:</strong> Your written reflections (can be marked private)</li>
              <li><strong>Usage Data:</strong> How you interact with the app to improve your experience</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">How We Use Your Data</h2>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>To calculate your Emotional Readiness Score (ERS)</li>
              <li>To provide personalized insights and recommendations</li>
              <li>To match you with community members at similar healing stages</li>
              <li>To improve our services and develop new features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">Data Security</h2>
            <p className="text-stone-600 mb-4">
              Your data is protected using industry-standard encryption. We use Supabase for secure data storage with Row Level Security (RLS) policies ensuring you can only access your own data.
            </p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>All data is encrypted in transit and at rest</li>
              <li>We never sell your personal data to third parties</li>
              <li>You can delete your account and all associated data at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">Research Data (Optional)</h2>
            <p className="text-stone-600 mb-4">
              If you consent, we may use anonymized and aggregated data for research purposes to better understand emotional recovery patterns. This data:
            </p>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li>Is completely anonymized and cannot be traced back to you</li>
              <li>Helps improve mental health understanding</li>
              <li>May be shared with research partners under strict data agreements</li>
              <li>You can opt out at any time in your settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">Your Rights</h2>
            <ul className="list-disc pl-6 text-stone-600 space-y-2">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Update or correct your information</li>
              <li><strong>Deletion:</strong> Delete your account and all data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-out:</strong> Withdraw consent for research data sharing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">Contact Us</h2>
            <p className="text-stone-600">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@paceful.com" className="text-indigo-600 hover:text-indigo-700">
                privacy@paceful.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
