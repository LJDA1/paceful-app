'use client';

/**
 * Paceful Pricing Page
 */

import React, { useState } from 'react';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

// ============================================================
// PRICING DATA
// ============================================================

const TIERS = [
  {
    id: 'signal',
    name: 'Signal',
    tagline: 'Validate the value',
    price: 2500,
    priceSuffix: '/mo',
    priceNote: 'or $25,000/year (save 17%)',
    description: 'For platforms validating whether emotional readiness scoring moves their metrics.',
    features: [
      '50K analyses per month included',
      'All verticals unlocked',
      'Standard ERS + vertical signal packs',
      '$0.05 per analysis overage',
      'Email support, 48-hour response',
      '99.5% uptime SLA',
      'Monthly or annual contract',
    ],
    cta: 'Start with Signal',
    ctaHref: '#contact',
  },
  {
    id: 'safeguard',
    name: 'Safeguard',
    tagline: 'Production infrastructure',
    price: 12000,
    priceSuffix: '/mo',
    priceNote: 'annual contract, $144K billed upfront',
    description: 'For platforms with active user safety, claims, or CX obligations. Most customers land here.',
    launchPrice: 7200,
    launchBadge: '2 of 5 slots remaining',
    launchNote: 'First 5 customers. Rate locked for 12 months.',
    features: [
      '500K analyses per month included',
      'All verticals + custom signal configuration',
      'Conversation trajectory analysis',
      'Advanced webhooks with retry logic',
      '$0.03 per analysis overage',
      'Dedicated Slack channel, 4-hour response SLA',
      '99.9% uptime SLA',
      'Quarterly business review',
      'Annual contract only',
    ],
    cta: 'Claim a launch slot',
    ctaHref: '#contact',
    recommended: true,
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    tagline: 'Enterprise and regulated',
    price: 'From $40,000',
    priceSuffix: '/mo',
    priceNote: '2-year minimum, custom terms',
    description: 'For regulated enterprises, platforms with 1M+ MAU, and TPAs serving multiple carriers.',
    features: [
      'Unlimited analyses',
      'All verticals + custom vertical development',
      'Private deployment (VPC or on-premise) available',
      'SOC 2, HIPAA, and regulatory audit support',
      'Named Customer Success Manager',
      '99.99% uptime SLA with financial penalties',
      '2-hour incident response',
      'White-label options',
      '2-year minimum contract',
    ],
    cta: 'Contact sales',
    ctaHref: '#contact',
  },
];

const FAQ = [
  {
    q: 'What counts as an "analysis"?',
    a: 'One analysis is a single API call to /v1/analyze or /v1/analyze/[vertical]. Batch and conversation endpoints count each individual text evaluation as one analysis.',
  },
  {
    q: 'Do verticals cost extra?',
    a: 'No. Every tier includes access to all current verticals (Insurance, CX, Gambling, Dating, Healthcare) and any future verticals we launch. You pay for volume, not for SKUs unlocked.',
  },
  {
    q: 'What if I need a custom vertical built for my use case?',
    a: 'Custom vertical development is available to Sovereign-tier customers as a one-time engagement, typically priced between $50K and $150K depending on scope. You get full ownership of the custom configuration.',
  },
  {
    q: 'Is raw text stored?',
    a: 'Never. Paceful analyzes text in-memory and discards it immediately. Only hashed references and numerical scores are persisted. This policy applies to every tier.',
  },
  {
    q: 'Can I start on Signal and upgrade later?',
    a: 'Yes. Upgrades are prorated and take effect immediately. Your historical score data carries forward.',
  },
  {
    q: 'What happens if I exceed my analysis limit?',
    a: "Overages bill at the stated per-analysis rate for your tier. Your service is never interrupted. You can also prepay for a higher volume commitment and lock in a lower effective rate.",
  },
  {
    q: 'Do you offer a free tier or trial?',
    a: 'We do not run a free tier. We do offer Launch Pricing for the first 5 founding customers — $7,200/mo on Safeguard, rate locked for 12 months. See above for details.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Self-serve integration (Signal tier) is typically live in 30 minutes. Safeguard onboarding with custom configuration averages 5 business days. Sovereign enterprise deployments average 2-6 weeks depending on security review requirements.',
  },
];

// ============================================================
// COMPONENTS
// ============================================================

function formatPrice(price: number | string) {
  if (typeof price === 'string') return price;
  return `${price.toLocaleString()}`;
}

function Check({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 mt-1 ${className}`}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Tier {
  id: string;
  name: string;
  tagline: string;
  price: number | string;
  priceSuffix: string;
  priceNote: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  recommended?: boolean;
  launchPrice?: number;
  launchBadge?: string;
  launchNote?: string;
}

function TierCard({ tier }: { tier: Tier }) {
  const base = 'relative flex flex-col transition-all duration-300';
  const border = tier.recommended
    ? 'border border-stone-900 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]'
    : 'border border-stone-300';
  const padding = 'p-8 lg:p-10';

  return (
    <div className={`${base} ${border} ${padding}`}>
      {tier.recommended && !tier.launchPrice && (
        <div className="absolute -top-3 left-8 px-3 py-1 bg-stone-900 text-stone-50 text-[10px] font-medium tracking-[0.2em] uppercase">
          Most chosen
        </div>
      )}

      {tier.launchPrice && (
        <div className="mb-5 -mx-8 lg:-mx-10 -mt-8 lg:-mt-10 px-6 py-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-amber-700 mb-1">
                Launch Pricing
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-stone-900" style={{ fontFamily: "var(--font-fraunces)" }}>
                  ${tier.launchPrice.toLocaleString()}/mo
                </span>
                <span className="text-sm text-stone-400 line-through">
                  ${(tier.price as number).toLocaleString()}/mo
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">{tier.launchNote}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 whitespace-nowrap pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse flex-shrink-0" />
              {tier.launchBadge}
            </div>
          </div>
        </div>
      )}

      <div className="mb-2">
        <h3 className="text-2xl text-stone-900" style={{ fontFamily: "var(--font-fraunces)" }}>
          {tier.name}
        </h3>
        <p className="text-sm text-stone-500 mt-1">{tier.tagline}</p>
      </div>

      <div className="my-6 py-6 border-y border-stone-200">
        {tier.launchPrice ? (
          <>
            <div className="flex items-baseline gap-1">
              <span
                className="text-5xl text-stone-900 tracking-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {formatPrice(tier.launchPrice)}
              </span>
              <span className="text-base text-stone-600 ml-1">{tier.priceSuffix}</span>
            </div>
            <p className="text-xs text-stone-500 mt-2">annual contract, $86,400 billed upfront</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span
                className="text-5xl text-stone-900 tracking-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {formatPrice(tier.price)}
              </span>
              <span className="text-base text-stone-600 ml-1">{tier.priceSuffix}</span>
            </div>
            <p className="text-xs text-stone-500 mt-2">{tier.priceNote}</p>
          </>
        )}
      </div>

      <p className="text-sm text-stone-700 leading-relaxed mb-6">{tier.description}</p>

      <ul className="space-y-3 mb-8 flex-1">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-stone-700">
            <Check className="text-stone-900" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={tier.ctaHref}
        className={`block text-center py-3 px-6 text-sm font-medium tracking-wide transition-colors duration-200 ${
          tier.recommended
            ? 'bg-stone-900 text-stone-50 hover:bg-stone-800'
            : 'border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-stone-50'
        }`}
      >
        {tier.cta}
      </a>
    </div>
  );
}

function FAQItem({
  q,
  a,
  isOpen,
  onClick,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-stone-200 py-6">
      <button
        onClick={onClick}
        className="w-full flex items-start justify-between gap-8 text-left group"
      >
        <span
          className="text-base lg:text-lg text-stone-900 font-medium"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {q}
        </span>
        <span
          className={`text-stone-400 text-xl leading-none transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-96 mt-4' : 'max-h-0'
        }`}
      >
        <p className="text-sm text-stone-600 leading-relaxed pr-12">{a}</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <MarketingNav />

      <div style={{ paddingTop: '72px' }}>
        {/* ── HERO ── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-stone-500 mb-8">
              <span className="w-8 h-px bg-stone-400" />
              Pricing
            </div>
            <h1
              className="text-5xl lg:text-7xl leading-[1.05] tracking-tight text-stone-900 mb-8"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Pay for volume.
              <br />
              <em className="italic text-stone-600">Not for SKUs.</em>
            </h1>
            <p className="text-lg lg:text-xl text-stone-600 leading-relaxed max-w-2xl">
              Every tier includes every vertical. Insurance, CX, gambling, dating, healthcare — and every
              vertical we launch after. You pay for the analyses you run, not the endpoints you unlock.
            </p>
            <div className="mt-8">
              <a
                href="/roi"
                className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 border-b border-stone-400 pb-0.5 hover:text-stone-900 hover:border-stone-900 transition-colors"
              >
                Calculate your ROI →
              </a>
            </div>
          </div>
        </section>

        {/* ── PRICING GRID ── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>

          <p className="mt-12 text-center text-sm text-stone-500">
            All prices in USD. Annual contracts are invoiced upfront. Monthly contracts auto-renew.
          </p>
        </section>

        {/* ── LAUNCH PROGRAM DETAIL ── */}
        <section className="bg-stone-900 text-stone-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-amber-400 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Launch Program
                </div>
                <h2
                  className="text-4xl lg:text-5xl leading-tight mb-8"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  Five companies lock in founding pricing.
                </h2>
                <p className="text-stone-400 text-lg leading-relaxed mb-8">
                  We&apos;re accepting five founding customers in 2026. Get Safeguard at $7,200/mo —
                  40% off the standard rate — locked for 12 months. No experimental program.
                  Full production access from day one.
                </p>
                <p className="text-stone-400 text-lg leading-relaxed">
                  Once these five slots fill, launch pricing closes permanently.
                </p>
              </div>

              <div className="bg-stone-800 border border-stone-700 p-10">
                <div className="mb-8">
                  <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-stone-500 mb-2">
                    Launch Pricing
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>
                      $7,200
                    </span>
                    <span className="text-stone-400 ml-2">/mo</span>
                  </div>
                  <div className="mt-1 text-sm text-stone-500 line-through">Standard rate $12,000/mo</div>
                </div>

                <div className="space-y-4 mb-8 pb-8 border-b border-stone-700">
                  {[
                    'Full Safeguard production access',
                    'All five verticals included',
                    '500K analyses per month',
                    'Founding customer status, rate locked 12 months',
                    'Priority onboarding, dedicated Slack channel',
                    'Direct access to the founding team',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-stone-200">
                      <Check className="text-amber-400 mt-1" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-8">
                  <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-stone-500 mb-3">
                    After the 12-month lock-in
                  </div>
                  <p className="text-sm text-stone-300 leading-relaxed">
                    Renews at standard Safeguard pricing. Lock in now and save{' '}
                    <strong className="text-amber-400">$57,600</strong> over the first year compared to the
                    standard rate.
                  </p>
                </div>

                <a
                  href="#contact"
                  className="block text-center py-4 px-6 bg-amber-400 text-stone-900 font-medium hover:bg-amber-300 transition-colors"
                >
                  Claim a launch slot →
                </a>
                <p className="text-center text-xs text-stone-500 mt-3">2 of 5 slots remaining</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHAT'S INCLUDED ── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-24">
            <div className="lg:col-span-1">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-stone-500 mb-6">
                <span className="w-8 h-px bg-stone-400" />
                What&apos;s included
              </div>
              <h2
                className="text-3xl lg:text-4xl leading-tight text-stone-900"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Every tier. Every vertical.
              </h2>
              <p className="mt-4 text-stone-600 leading-relaxed">
                We don&apos;t believe in artificial scarcity. If we launch a new vertical in 2027, every
                existing customer gets it automatically.
              </p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  label: 'Insurance Claims',
                  desc: '14 signals: escalation risk, litigation intent, regulatory complaints, bereavement sensitivity, financial distress, and more.',
                },
                {
                  label: 'Customer Experience',
                  desc: '12 signals: churn risk, escalation risk, frustration trajectory, advocacy potential, VIP signals, and more.',
                },
                {
                  label: 'Gambling Safeguarding',
                  desc: '14 signals: harm risk, addiction indicators, financial distress, self-exclusion triggers, regulatory complaint risk, and more.',
                },
                {
                  label: 'Dating Safety',
                  desc: '13 signals: harassment escalation, coercion language, emotional manipulation, stalking indicators, minor safety risk, and more.',
                },
                {
                  label: 'Healthcare & Therapy',
                  desc: '11 signals: depressive symptoms, anxiety indicators, treatment adherence risk, distress trajectory, therapeutic alliance quality, and more.',
                },
                {
                  label: 'Future Verticals',
                  desc: 'Elder care, HR/employee wellbeing, family law, education — launched as market demand confirms, included in every tier.',
                },
              ].map((item, i) => (
                <div key={i} className="border-l-2 border-stone-900 pl-6">
                  <div className="text-xs font-medium tracking-[0.2em] uppercase text-stone-500 mb-2">
                    Vertical
                  </div>
                  <h3
                    className="text-xl text-stone-900 mb-3"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {item.label}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-stone-100">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] uppercase text-stone-500 mb-6">
                <span className="w-8 h-px bg-stone-400" />
                Questions
              </div>
              <h2
                className="text-4xl lg:text-5xl leading-tight text-stone-900"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Honest answers.
              </h2>
            </div>

            <div>
              {FAQ.map((item, i) => (
                <FAQItem
                  key={i}
                  q={item.q}
                  a={item.a}
                  isOpen={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section id="contact" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2
                className="text-4xl lg:text-6xl leading-tight text-stone-900 mb-8"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                The best way to find out if Paceful fits is to try it.
              </h2>
              <p className="text-lg text-stone-600 leading-relaxed mb-10">
                Play with the sandbox. Send a question to the founder. No gated demos, no discovery call
                gatekeeping. When you&apos;re ready to integrate, we&apos;re here.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/sandbox"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-stone-900 text-stone-50 text-sm font-medium tracking-wide hover:bg-stone-800 transition-colors"
                >
                  Try the sandbox →
                </a>
                <a
                  href="mailto:hello@paceful.com"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-stone-900 text-stone-900 text-sm font-medium tracking-wide hover:bg-stone-900 hover:text-stone-50 transition-colors"
                >
                  Email the founder
                </a>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 p-10">
              <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-stone-500 mb-4">
                For enterprise buyers
              </div>
              <h3
                className="text-2xl text-stone-900 mb-4"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Custom contracts available.
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-6">
                Volume commitments, private deployment, SOC 2 documentation, custom vertical development,
                and MSA-aligned terms are all negotiable at Sovereign tier. Typical enterprise onboarding:
                2-6 weeks.
              </p>
              <a
                href="mailto:enterprise@paceful.com"
                className="inline-block text-sm font-medium text-stone-900 border-b border-stone-900 pb-0.5 hover:border-amber-700 hover:text-amber-900 transition-colors"
              >
                enterprise@paceful.com
              </a>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </div>
  );
}
