'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { trackConversion } from '@/lib/conversion-track';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

// ============================================================================
// SVG Icons
// ============================================================================

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function ChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function BrainIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.5m14.8-.2-.8.2m-13 0 .8-.2m0 0a9.001 9.001 0 0 0 12.4 0" />
    </svg>
  );
}

function DocumentIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function TrendUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}

function CodeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function BuildingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function HeartHandIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

// ============================================================================
// ERS Ring Visualization
// ============================================================================

function ERSRingVisual() {
  const score = 72;
  const circumference = 2 * Math.PI * 80;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-[200px] h-[200px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        {/* Background ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#F3EFE9"
          strokeWidth="12"
        />
        {/* Progress ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#5B8A72"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[42px] font-bold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          {score}
        </span>
        <span className="text-[13px]" style={{ color: '#9A938A' }}>
          ERS Score
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LandingPage() {
  const scrollMidpointRef = useRef<HTMLDivElement>(null);
  const hasTrackedScroll = useRef(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  // Track landing page view
  useEffect(() => {
    trackConversion('landing_view');
  }, []);

  // Track scroll depth at 50%
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTrackedScroll.current) {
          hasTrackedScroll.current = true;
          trackConversion('scroll_50');
        }
      },
      { threshold: 0.1 }
    );

    if (scrollMidpointRef.current) {
      observer.observe(scrollMidpointRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCtaClick = (button: string) => {
    trackConversion('cta_click', { button });
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      <MarketingNav />

      {/* Hero Section */}
      <section className="pt-[88px] pb-16 px-6" style={{ background: '#F9F6F2' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium mb-6"
                style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
              >
                Science-backed emotional recovery
              </div>

              {/* Headline */}
              <h1
                className="text-[42px] sm:text-[52px] leading-[1.1] font-bold mb-5"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Heal at your pace.
                <br />
                <span style={{ color: '#D4973B' }}>See the progress.</span>
              </h1>

              {/* Subtitle */}
              <p
                className="text-[17px] leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
                style={{ color: '#5C574F' }}
              >
                Track your emotional journey, understand your patterns, and know
                when you&apos;re ready — backed by clinical research.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/signup"
                  onClick={() => handleCtaClick('hero')}
                  className="px-7 py-3.5 text-[16px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
                  style={{ background: '#5B8A72' }}
                >
                  Start free
                </Link>
                <button
                  onClick={scrollToHowItWorks}
                  className="px-7 py-3.5 text-[16px] font-semibold rounded-full transition-colors"
                  style={{
                    background: 'transparent',
                    color: '#5B8A72',
                    border: '2px solid #5B8A72',
                  }}
                >
                  See how it works
                </button>
              </div>
            </div>

            {/* Right - ERS visualization */}
            <div className="flex-shrink-0">
              <div
                className="relative p-8 rounded-[32px]"
                style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
              >
                <ERSRingVisual />
                <div className="mt-4 text-center">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[12px] font-medium"
                    style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
                  >
                    Rebuilding
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll tracking midpoint */}
      <div ref={scrollMidpointRef} className="h-0" aria-hidden="true" />

      {/* How It Works */}
      <section ref={howItWorksRef} className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            How Paceful works
          </h2>
          <p
            className="text-[16px] text-center mb-12 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            A simple daily practice that helps you understand your emotional journey.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 1
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <HeartIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Track daily
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                Log your mood and journal your thoughts. It takes just a few minutes each day.
              </p>
            </div>

            {/* Step 2 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 2
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <SparkleIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Get insights
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                AI analyzes your patterns to surface personalized insights about your recovery.
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 3
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <ChartIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                See your path
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                Watch your ERS score grow and see predictions for when you&apos;ll reach each milestone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ERS Explainer */}
      <section className="py-20 px-6" style={{ background: '#F3EFE9' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left - Ring */}
            <div className="flex-shrink-0">
              <div className="relative w-[220px] h-[220px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
                  {/* Healing segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#7E71B5"
                    strokeWidth="16"
                    strokeDasharray={`${(35 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                  {/* Rebuilding segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#D4973B"
                    strokeWidth="16"
                    strokeDasharray={`${(30 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeDashoffset={`-${(35 / 100) * 2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                  {/* Ready segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#5B8A72"
                    strokeWidth="16"
                    strokeDasharray={`${(35 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeDashoffset={`-${(65 / 100) * 2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-[14px] font-medium"
                    style={{ color: '#5C574F' }}
                  >
                    ERS
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="flex-1">
              <h2
                className="text-[32px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Your Emotional Readiness Score
              </h2>
              <p
                className="text-[16px] leading-relaxed mb-6"
                style={{ color: '#5C574F' }}
              >
                The ERS is a comprehensive measure of your emotional recovery progress,
                calculated from 6 key dimensions including emotional stability, self-reflection,
                and social readiness.
              </p>

              {/* Three stages */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#7E71B5' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Healing (0-35)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Processing and understanding
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#D4973B' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Rebuilding (35-65)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Growing and strengthening
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#5B8A72' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Ready (65-100)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Emotionally prepared
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Powered by intelligent analysis
          </h2>
          <p
            className="text-[16px] text-center mb-12 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            Advanced AI helps you understand your emotional patterns without judgment.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<BrainIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Personalized insights"
              description="AI analyzes your unique patterns to provide tailored guidance for your recovery journey."
            />
            <FeatureCard
              icon={<DocumentIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Sentiment analysis"
              description="Your journal entries are analyzed to understand emotional themes and track progress over time."
            />
            <FeatureCard
              icon={<TrendUpIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Recovery forecast"
              description="Predict when you'll reach each milestone based on your engagement and progress patterns."
            />
          </div>
        </div>
      </section>

      {/* For Partners Section */}
      <section className="py-20 px-6" style={{ background: '#F9F6F2' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Built for integration
          </h2>
          <p
            className="text-[16px] text-center mb-12 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            Our B2B API brings emotional readiness insights to your platform.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <PartnerCard
              icon={<HeartHandIcon className="w-6 h-6" style={{ color: '#D4973B' }} />}
              title="Dating apps"
              description="Help users understand their emotional readiness before seeking new relationships."
            />
            <PartnerCard
              icon={<BuildingIcon className="w-6 h-6" style={{ color: '#D4973B' }} />}
              title="HR platforms"
              description="Support employee wellness with emotional health scoring and resources."
            />
            <PartnerCard
              icon={<UsersIcon className="w-6 h-6" style={{ color: '#D4973B' }} />}
              title="Clinical integration"
              description="Give therapists data-driven insights into their clients' progress."
            />
          </div>

          <div className="text-center">
            <Link
              href="/design-partners"
              className="inline-block px-7 py-3.5 text-[16px] font-semibold rounded-full transition-opacity hover:opacity-90"
              style={{ background: '#D4973B', color: '#FFFFFF' }}
            >
              Become a design partner
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                6
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                ERS dimensions
              </p>
            </div>
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                AI
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                Powered insights
              </p>
            </div>
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                100%
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                Research-backed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6" style={{ background: '#F3EFE9' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-[36px] font-bold mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Ready to start healing?
          </h2>
          <p
            className="text-[16px] mb-8"
            style={{ color: '#5C574F' }}
          >
            Join others who are tracking their emotional recovery journey.
          </p>
          <Link
            href="/auth/signup"
            onClick={() => handleCtaClick('footer_cta')}
            className="inline-block px-8 py-4 text-[17px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
            style={{ background: '#5B8A72' }}
          >
            Get started
          </Link>
          <p className="mt-4 text-[13px]" style={{ color: '#9A938A' }}>
            Free to use. No credit card required.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

// ============================================================================
// Component: Feature Card
// ============================================================================

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 rounded-[24px]"
      style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(91,138,114,0.1)' }}
      >
        {icon}
      </div>
      <h3
        className="text-[18px] font-semibold mb-2"
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
        {description}
      </p>
    </div>
  );
}

// ============================================================================
// Component: Partner Card
// ============================================================================

function PartnerCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 rounded-[24px]"
      style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(212,151,59,0.1)' }}
      >
        {icon}
      </div>
      <h3
        className="text-[18px] font-semibold mb-2"
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
        {description}
      </p>
    </div>
  );
}
