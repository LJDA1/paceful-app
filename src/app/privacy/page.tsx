import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata = {
  title: 'Privacy Policy - Paceful',
  description: 'How Paceful protects your data and privacy',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      <MarketingNav />

      <div className="max-w-[680px] mx-auto px-4 pt-[88px] pb-12">
        <div
          className="bg-white rounded-3xl p-8 sm:p-10"
          style={{ border: '1px solid #F0EBE4' }}
        >
          <h1
            className="text-[28px] sm:text-[32px] font-bold mb-2"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Privacy Policy
          </h1>
          <p className="text-[14px] mb-8" style={{ color: '#9A938A' }}>
            Last updated: February 1, 2026
          </p>

          <div className="space-y-8" style={{ lineHeight: 1.7 }}>
            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                Our Commitment to Privacy
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                At Paceful, we understand that emotional healing is deeply personal. We are committed to protecting your privacy and ensuring that your data is handled with the utmost care and security.
              </p>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                What We Collect
              </h2>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li><strong style={{ color: '#1F1D1A' }}>Account Information:</strong> Email address and password (encrypted)</li>
                <li><strong style={{ color: '#1F1D1A' }}>Profile Data:</strong> Name, date of birth, and optional demographic information</li>
                <li><strong style={{ color: '#1F1D1A' }}>Mood Entries:</strong> Your mood ratings, emotions, and optional notes</li>
                <li><strong style={{ color: '#1F1D1A' }}>Journal Entries:</strong> Your written reflections (can be marked private)</li>
                <li><strong style={{ color: '#1F1D1A' }}>Usage Data:</strong> How you interact with the app to improve your experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                How We Use Your Data
              </h2>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li>To calculate your Emotional Readiness Score (ERS)</li>
                <li>To provide personalized insights and recommendations</li>
                <li>To match you with community members at similar healing stages</li>
                <li>To improve our services and develop new features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                Data Security
              </h2>
              <p className="text-[15px] mb-3" style={{ color: '#5C574F' }}>
                Your data is protected using industry-standard encryption. We use Supabase for secure data storage with Row Level Security (RLS) policies ensuring you can only access your own data.
              </p>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li>All data is encrypted in transit and at rest</li>
                <li>We never sell your personal data to third parties</li>
                <li>You can delete your account and all associated data at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                Research Data (Optional)
              </h2>
              <p className="text-[15px] mb-3" style={{ color: '#5C574F' }}>
                If you consent, we may use anonymized and aggregated data for research purposes to better understand emotional recovery patterns. This data:
              </p>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li>Is completely anonymized and cannot be traced back to you</li>
                <li>Helps improve mental health understanding</li>
                <li>May be shared with research partners under strict data agreements</li>
                <li>You can opt out at any time in your settings</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                Your Rights
              </h2>
              <ul className="space-y-2 text-[15px]" style={{ color: '#5C574F' }}>
                <li><strong style={{ color: '#1F1D1A' }}>Access:</strong> Request a copy of your data</li>
                <li><strong style={{ color: '#1F1D1A' }}>Correction:</strong> Update or correct your information</li>
                <li><strong style={{ color: '#1F1D1A' }}>Deletion:</strong> Delete your account and all data</li>
                <li><strong style={{ color: '#1F1D1A' }}>Export:</strong> Download your data in a portable format</li>
                <li><strong style={{ color: '#1F1D1A' }}>Opt-out:</strong> Withdraw consent for research data sharing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[17px] font-semibold mb-3" style={{ color: '#1F1D1A' }}>
                Contact Us
              </h2>
              <p className="text-[15px]" style={{ color: '#5C574F' }}>
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a
                  href="mailto:privacy@paceful.com"
                  className="font-medium"
                  style={{ color: '#5B8A72' }}
                >
                  privacy@paceful.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
