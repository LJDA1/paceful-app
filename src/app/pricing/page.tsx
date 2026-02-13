'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================================================
// Icons
// ============================================================================

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ChevronDownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

// ============================================================================
// Feature List Item
// ============================================================================

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
      <span className="text-[15px]" style={{ color: 'var(--text-sec)' }}>{children}</span>
    </li>
  );
}

// ============================================================================
// FAQ Item
// ============================================================================

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="text-[16px] font-medium pr-4" style={{ color: 'var(--text)' }}>
          {question}
        </span>
        <ChevronDownIcon
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-40 pb-5' : 'max-h-0'}`}
      >
        <p className="text-[15px] leading-relaxed pr-8" style={{ color: 'var(--text-sec)' }}>
          {answer}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Pricing Card
// ============================================================================

interface PricingCardProps {
  title: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
}

function PricingCard({
  title,
  price,
  priceSuffix,
  description,
  features,
  ctaLabel,
  ctaHref,
  highlighted = false,
  badge,
}: PricingCardProps) {
  return (
    <div
      className={`relative rounded-3xl p-6 md:p-8 flex flex-col ${highlighted ? 'shadow-xl' : ''}`}
      style={{
        background: 'var(--bg-card)',
        border: highlighted ? '2px solid var(--primary)' : '1px solid var(--border-light)',
      }}
    >
      {/* Badge */}
      {badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[12px] font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          {badge}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3
          className="text-[24px] font-medium mb-2"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          {title}
        </h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span
            className="text-[36px] font-medium"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            {price}
          </span>
          <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {priceSuffix}
          </span>
        </div>
        <p className="text-[14px]" style={{ color: 'var(--text-sec)' }}>
          {description}
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <FeatureItem key={i}>{feature}</FeatureItem>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={ctaHref}
        className={`block w-full py-3.5 rounded-full text-center text-[15px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
          highlighted ? 'text-white' : ''
        }`}
        style={{
          background: highlighted ? 'var(--primary)' : 'transparent',
          color: highlighted ? 'white' : 'var(--primary)',
          border: highlighted ? 'none' : '2px solid var(--primary)',
        }}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PricingPage() {
  const faqItems = [
    {
      question: "What's included in the free plan?",
      answer: "The free plan includes daily mood logging, basic journaling with prompts, your ERS (Emotional Readiness Score) tracking, and access to 3 guided exercises. It's everything you need to start your healing journey.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, no commitment. Cancel anytime from your settings. If you cancel, you'll still have access to Pro features until the end of your billing period.",
    },
    {
      question: "How does the API pricing work?",
      answer: "API pricing is based on monthly active users and query volume. Contact us for a custom quote tailored to your platform's needs.",
    },
    {
      question: "Is my data private?",
      answer: "Always. We never sell your data and use industry-standard encryption. Your journal entries and mood data are yours alone. See our privacy policy for details.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "Coming soon — we're currently in early access. During the beta, all Pro features are available free of charge.",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Navigation */}
      <nav className="py-5 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-[22px] font-semibold"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--primary)' }}
          >
            Paceful
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="text-[14px] font-medium"
              style={{ color: 'var(--text-sec)' }}
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2.5 rounded-full text-[14px] font-semibold text-white"
              style={{ background: 'var(--primary)' }}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="text-center px-6 pt-12 pb-16">
        <h1
          className="text-[36px] md:text-[44px] font-medium mb-4 leading-tight"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          Simple, transparent pricing
        </h1>
        <p className="text-[17px] md:text-[18px]" style={{ color: 'var(--text-muted)' }}>
          Start free. Upgrade when you're ready.
        </p>
      </header>

      {/* Pricing Cards */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Mobile: Pro first, then Free, then API */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5">
            {/* Pro Card - First on mobile */}
            <div className="md:order-2">
              <PricingCard
                title="Pro"
                price="$9.99"
                priceSuffix="/month"
                description="Unlock your full potential"
                features={[
                  "Everything in Free",
                  "AI-powered insights",
                  "Personalized journal prompts",
                  "Unlimited guided exercises",
                  "Recovery forecast & predictions",
                  "Sentiment analysis",
                  "Weekly AI recaps",
                  "Priority support",
                ]}
                ctaLabel="Start free trial"
                ctaHref="/auth/signup"
                highlighted
                badge="Most popular"
              />
            </div>

            {/* Free Card */}
            <div className="md:order-1">
              <PricingCard
                title="Free"
                price="$0"
                priceSuffix="forever"
                description="Start your healing journey"
                features={[
                  "Daily mood logging",
                  "Basic journaling",
                  "ERS score tracking",
                  "3 guided exercises",
                ]}
                ctaLabel="Get started"
                ctaHref="/auth/signup"
              />
            </div>

            {/* API Card */}
            <div className="md:order-3">
              <PricingCard
                title="API"
                price="Custom"
                priceSuffix=""
                description="For platforms and partners"
                features={[
                  "ERS scoring API",
                  "Batch user queries",
                  "Aggregate analytics",
                  "Webhook notifications",
                  "Dedicated support",
                  "Custom integrations",
                  "SLA guarantee",
                ]}
                ctaLabel="Contact us"
                ctaHref="/design-partners"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Beta Notice */}
      <section className="px-6 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(91,138,114,0.1)' }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--primary)' }}>
              Currently in early access. All Pro features are free during the beta.
            </span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-[28px] font-medium mb-8 text-center"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Questions?
          </h2>
          <div
            className="rounded-3xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <div className="px-6">
              {faqItems.map((item, i) => (
                <FAQItem key={i} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="text-[28px] md:text-[32px] font-medium mb-6"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Start your healing journey today
          </h2>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 rounded-full text-[16px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--primary)' }}
          >
            Get started free
          </Link>
          <p className="mt-4 text-[14px]" style={{ color: 'var(--text-muted)' }}>
            No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-6 border-t"
        style={{ borderColor: 'var(--border-light)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            className="text-[18px] font-semibold"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--primary)' }}
          >
            Paceful
          </span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Privacy
            </Link>
            <Link href="/terms" className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Terms
            </Link>
            <Link href="/design-partners" className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Partners
            </Link>
          </div>
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Made with care for healing hearts
          </span>
        </div>
      </footer>
    </div>
  );
}
