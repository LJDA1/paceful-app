'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface ApplicationForm {
  companyName: string;
  contactName: string;
  email: string;
  companyType: string;
  otherCompanyType: string;
  currentUsers: string;
  useCase: string;
  whyInterested: string;
}

// ============================================================================
// Components
// ============================================================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function BenefitCard({
  title,
  items,
  icon
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-indigo-200 hover:shadow-lg transition-all">
      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-600">
            <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UseCaseCard({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6">
      <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-900">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <p className="pb-5 text-gray-600 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DesignPartnersPage() {
  const [form, setForm] = useState<ApplicationForm>({
    companyName: '',
    contactName: '',
    email: '',
    companyType: '',
    otherCompanyType: '',
    currentUsers: '',
    useCase: '',
    whyInterested: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentYear, setCurrentYear] = useState('');

  // Set year client-side to prevent hydration mismatch
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, send to your backend
    console.log('Application submitted:', form);

    setSubmitted(true);
    setSubmitting(false);
  };

  const handleInputChange = (field: keyof ApplicationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const scrollToForm = () => {
    document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm">P</span>
            </div>
            <span className="font-semibold text-gray-900">Paceful</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600 text-sm">B2B</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/api/b2b/predictions/docs" className="text-sm text-gray-600 hover:text-gray-900">
              API Docs
            </Link>
            <button
              onClick={scrollToForm}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Apply Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-100/50 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              Limited to 3 companies
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Join Our Emotional Readiness Prediction API{' '}
              <span className="text-indigo-600">Design Partner Program</span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Help shape the future of relationship recovery data. Get exclusive early access,
              influence product development, and lock in founding pricing.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToForm}
                className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                Apply Now
              </button>
              <a
                href="/exports/paceful_sample_dataset.csv"
                download
                className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Sample Dataset
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What You Get</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Design partners receive exclusive benefits during the 60-day pilot program
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BenefitCard
              title="60-Day Free API Access"
              items={[
                'Full prediction API (timeline, outcomes, risks)',
                'Unlimited API calls during pilot',
                'Weekly data updates'
              ]}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                </svg>
              }
            />
            <BenefitCard
              title="Custom Model Development"
              items={[
                'Adapt predictions to your use case',
                'Fine-tune for your user base',
                'Co-design API features'
              ]}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              }
            />
            <BenefitCard
              title="Early Adopter Benefits"
              items={[
                'Lock in founding pricing ($2K/mo vs $5K)',
                'First access to new features',
                'Input on product roadmap'
              ]}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              }
            />
            <BenefitCard
              title="Marketing Value"
              items={[
                'Co-authored case study',
                'Press release opportunity',
                '"Powered by Paceful" badge'
              ]}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* What We Get (Mutual Value) */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Get</h2>
              <p className="text-gray-600 mb-8">
                This is a genuine partnership. Here&apos;s how you help us build a better product:
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Validation & Feedback</h3>
                    <p className="text-gray-600 text-sm">Test API with real use cases. Help improve prediction accuracy. Refine our documentation.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Success Metrics</h3>
                    <p className="text-gray-600 text-sm">Measure business impact. Track usage patterns. Validate our pricing model.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Reference Customer</h3>
                    <p className="text-gray-600 text-sm">For future sales conversations. For investor pitches. For credibility in the market.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Stats */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white">
              <h3 className="text-xl font-semibold mb-6">Current Dataset</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/20">
                  <span className="text-indigo-100">Tracked recovery journeys</span>
                  <span className="text-2xl font-bold">50+</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/20">
                  <span className="text-indigo-100">Validated predictions</span>
                  <span className="text-2xl font-bold">1,200+</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/20">
                  <span className="text-indigo-100">Average accuracy</span>
                  <span className="text-2xl font-bold">84%</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-indigo-100">Longitudinal data</span>
                  <span className="text-2xl font-bold">4+ weeks</span>
                </div>
              </div>
              <a
                href="/exports/paceful_sample_dataset.csv"
                download
                className="mt-6 w-full py-3 bg-white text-indigo-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Sample Dataset
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Use Cases</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our prediction API adapts to various industries focused on emotional wellness and relationship health
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <UseCaseCard
              title="Dating Apps"
              description="Filter matches by emotional readiness to reduce premature connections and improve relationship success rates."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              }
            />
            <UseCaseCard
              title="Mental Health Platforms"
              description="Measure treatment efficacy objectively and predict recovery timelines for clients going through relationship transitions."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              }
            />
            <UseCaseCard
              title="HR/Wellness Programs"
              description="Identify employees needing support during life transitions and predict return-to-productivity timelines."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Ideal Partners */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Ideal Design Partners</h2>
              <p className="text-gray-600 mb-8">
                We&apos;re looking for companies that can help us validate and improve the API
              </p>

              <div className="space-y-4">
                {[
                  'Active user base (dating, mental health, or HR)',
                  'Engineering team to integrate API',
                  'Willingness to provide honest feedback',
                  'Interest in publishing case study',
                  'Commitment to weekly check-ins (30 min)'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Not Required</h3>
              <div className="space-y-4">
                {[
                  { text: 'Large company', note: 'Startups welcome' },
                  { text: 'Big budget', note: 'Pilot is free' },
                  { text: 'Perfect use case', note: "We'll adapt together" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <XIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-gray-700">{item.text}</span>
                      <span className="text-gray-400 ml-2">({item.note})</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="mt-12 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pilot Timeline</h3>
                <div className="space-y-3">
                  {[
                    { week: 'Week 1-2', task: 'Onboarding & API Integration' },
                    { week: 'Week 3-4', task: 'Initial Testing & Feedback' },
                    { week: 'Week 5-6', task: 'Model Refinement' },
                    { week: 'Week 7-8', task: 'Success Metrics & Case Study' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-indigo-600 w-20">{item.week}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-gray-600 text-sm">{item.task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="application-form" className="py-20 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-4">Apply to the Design Partner Program</h2>
            <p className="text-indigo-100">
              We review applications within 48 hours and schedule intro calls the same week
            </p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted!</h3>
              <p className="text-gray-600 mb-6">
                Thank you for your interest. We&apos;ll review your application and get back to you within 48 hours.
              </p>
              <p className="text-sm text-gray-500">
                Questions? Email us at{' '}
                <a href="mailto:partners@paceful.com" className="text-indigo-600 hover:underline">
                  partners@paceful.com
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="Jane Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'dating', label: 'Dating/Relationship App' },
                    { value: 'mental_health', label: 'Mental Health Platform' },
                    { value: 'hr_wellness', label: 'HR/Employee Wellness' },
                    { value: 'research', label: 'Research Institution' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        form.companyType === option.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="companyType"
                        value={option.value}
                        checked={form.companyType === option.value}
                        onChange={(e) => handleInputChange('companyType', e.target.value)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
                <label
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors mt-3 ${
                    form.companyType === 'other'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="companyType"
                    value="other"
                    checked={form.companyType === 'other'}
                    onChange={(e) => handleInputChange('companyType', e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Other:</span>
                  <input
                    type="text"
                    value={form.otherCompanyType}
                    onChange={(e) => handleInputChange('otherCompanyType', e.target.value)}
                    className="flex-1 px-2 py-1 border-b border-gray-200 focus:border-indigo-500 outline-none text-sm"
                    placeholder="Describe your company type"
                    disabled={form.companyType !== 'other'}
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Active Users
                </label>
                <input
                  type="text"
                  value={form.currentUsers}
                  onChange={(e) => handleInputChange('currentUsers', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="e.g., 10,000 MAU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe Your Use Case *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.useCase}
                  onChange={(e) => handleInputChange('useCase', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"
                  placeholder="How would you use the emotional readiness prediction API?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why Are You Interested? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.whyInterested}
                  onChange={(e) => handleInputChange('whyInterested', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"
                  placeholder="What problem are you trying to solve? Why now?"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                By submitting, you agree to our{' '}
                <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Frequently Asked Questions</h2>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            <FAQItem
              question="Is this really free?"
              answer="Yes. No credit card required for the 60-day pilot. We're looking for partners to help us validate and improve the product, not revenue at this stage."
            />
            <FAQItem
              question="What happens after the pilot?"
              answer="You can convert to a paid plan at the early adopter rate ($2K/month vs $5K standard) or simply cancel with no obligation. We'll discuss options based on results."
            />
            <FAQItem
              question="Do you have real users?"
              answer="We're in private beta with our initial cohort of 50+ users tracking their emotional recovery. The design partner program helps us validate with real-world B2B use cases."
            />
            <FAQItem
              question="What if it doesn't work for our use case?"
              answer="No obligation. You can end the pilot anytime. Our goal is mutual success—if it's not working, we'd rather know early and learn from it."
            />
            <FAQItem
              question="How technical is the integration?"
              answer="Standard REST API with JSON responses. Most engineering teams integrate in 1-2 days. We provide SDKs, documentation, and dedicated support during onboarding."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm">P</span>
                </div>
                <span className="font-semibold text-gray-900">Paceful</span>
              </Link>
              <span className="text-gray-300">|</span>
              <a href="mailto:partners@paceful.com" className="text-gray-600 hover:text-gray-900">
                partners@paceful.com
              </a>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-700">Terms of Service</Link>
              <span>Data Processing Agreement available on request</span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            &copy; {currentYear} Paceful, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
