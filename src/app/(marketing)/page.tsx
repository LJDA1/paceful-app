'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xl">💜</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Paceful</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="text-gray-600 hover:text-gray-900">
              Demo
            </Link>
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full text-indigo-700 text-sm mb-6">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            Now with AI-powered predictions
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Heal at your pace.
            <br />
            <span className="text-indigo-600">See the progress.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The science-backed platform that helps you navigate emotional recovery
            with personalized insights, predictions, and support.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              Start Free Journey
            </Link>
            <Link
              href="/demo"
              className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition border border-gray-200"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat value="50+" label="Active Users" />
            <Stat value="84%" label="Prediction Accuracy" />
            <Stat value="4,400+" label="Data Points" />
            <Stat value="3" label="B2B Partners" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything you need to heal
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Track your journey with tools designed by psychologists and data scientists.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon="📊"
              title="ERS Score"
              description="Your Emotional Readiness Score, updated weekly based on 6 key dimensions."
            />
            <FeatureCard
              icon="🎯"
              title="Predictions"
              description="Know when you'll reach each stage with cohort-based ML predictions."
            />
            <FeatureCard
              icon="📝"
              title="Journaling"
              description="Process your thoughts with AI-powered sentiment analysis."
            />
            <FeatureCard
              icon="💜"
              title="Mood Tracking"
              description="Log daily check-ins and see patterns in your emotional journey."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Step number={1} title="Sign Up" description="Create your account and tell us about your situation." />
            <Step number={2} title="Track Daily" description="Log moods, journal entries, and complete exercises." />
            <Step number={3} title="Get Insights" description="Watch your ERS score rise and predictions improve." />
          </div>
        </div>
      </section>

      {/* B2B Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">For Enterprise</h2>
          <p className="text-indigo-100 mb-8">
            Integrate emotional wellness predictions into your platform with our B2B API.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/api-docs"
              className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition"
            >
              API Documentation
            </Link>
            <Link
              href="/design-partners"
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 transition"
            >
              Become a Partner
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start healing?</h2>
          <p className="text-gray-600 mb-8">
            Join thousands of people who are tracking their emotional recovery journey.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            Start Your Free Journey
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm">💜</span>
                </div>
                <span className="font-bold text-white">Paceful</span>
              </div>
              <p className="text-sm">Heal at your pace.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
                <li><Link href="/predictions" className="hover:text-white">Predictions</Link></li>
                <li><Link href="/ers" className="hover:text-white">ERS Score</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Enterprise</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/api-docs" className="hover:text-white">API Docs</Link></li>
                <li><Link href="/design-partners" className="hover:text-white">Partners</Link></li>
                <li><Link href="/investors" className="hover:text-white">Investors</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-sm text-center">
            © 2026 Paceful, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-indigo-600">{value}</p>
      <p className="text-gray-600">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
