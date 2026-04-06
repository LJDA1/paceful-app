'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TrustStats {
  assessmentCount: number;
  partnerCount: number;
}

export default function PartnersLandingPage() {
  const [stats, setStats] = useState<TrustStats | null>(null);

  useEffect(() => {
    // Fetch trust stats from public endpoint
    fetch('/api/v1/public/stats')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setStats(data.data);
        }
      })
      .catch(() => {
        // Fallback stats
        setStats({ assessmentCount: 0, partnerCount: 0 });
      });
  }, []);

  const styles = {
    page: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1F1D1A',
      backgroundColor: '#F9F6F2',
    } as React.CSSProperties,

    // Hero
    hero: {
      backgroundColor: '#F9F6F2',
      padding: '100px 24px 120px',
      textAlign: 'center' as const,
      position: 'relative' as const,
      overflow: 'hidden',
    } as React.CSSProperties,
    heroInner: {
      maxWidth: '900px',
      margin: '0 auto',
      position: 'relative' as const,
      zIndex: 1,
    } as React.CSSProperties,
    heroTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: 'clamp(36px, 6vw, 64px)',
      fontWeight: 600,
      color: '#1F1D1A',
      marginBottom: '24px',
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
    } as React.CSSProperties,
    heroSubtitle: {
      fontSize: 'clamp(18px, 2.5vw, 22px)',
      color: '#6B6560',
      marginBottom: '40px',
      lineHeight: 1.6,
      maxWidth: '700px',
      marginLeft: 'auto',
      marginRight: 'auto',
    } as React.CSSProperties,
    heroCta: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '18px 36px',
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '18px',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 14px rgba(91, 138, 114, 0.3)',
    } as React.CSSProperties,
    heroSecondary: {
      display: 'flex',
      gap: '24px',
      justifyContent: 'center',
      marginTop: '20px',
      fontSize: '15px',
    } as React.CSSProperties,
    heroLink: {
      color: '#5B8A72',
      textDecoration: 'none',
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    } as React.CSSProperties,

    // Section base
    section: {
      padding: '100px 24px',
    } as React.CSSProperties,
    sectionInner: {
      maxWidth: '1100px',
      margin: '0 auto',
    } as React.CSSProperties,
    sectionLabel: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#D4A645',
      textTransform: 'uppercase' as const,
      letterSpacing: '1.5px',
      marginBottom: '12px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    sectionTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: 'clamp(28px, 4vw, 44px)',
      fontWeight: 600,
      textAlign: 'center' as const,
      marginBottom: '16px',
      color: '#1F1D1A',
      letterSpacing: '-0.02em',
    } as React.CSSProperties,
    sectionSubtitle: {
      fontSize: '18px',
      color: '#6B6560',
      textAlign: 'center' as const,
      marginBottom: '56px',
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto',
      lineHeight: 1.6,
    } as React.CSSProperties,

    // How it works
    howItWorksSection: {
      backgroundColor: '#FFFFFF',
    } as React.CSSProperties,
    stepsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '48px',
      position: 'relative' as const,
    } as React.CSSProperties,
    stepConnector: {
      position: 'absolute' as const,
      top: '48px',
      left: '16.67%',
      right: '16.67%',
      height: '2px',
      background: 'linear-gradient(90deg, #5B8A72 0%, #D4A645 100%)',
      zIndex: 0,
    } as React.CSSProperties,
    step: {
      textAlign: 'center' as const,
      position: 'relative' as const,
      zIndex: 1,
    } as React.CSSProperties,
    stepNumber: {
      width: '96px',
      height: '96px',
      backgroundColor: '#F9F6F2',
      border: '3px solid #5B8A72',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
    } as React.CSSProperties,
    stepIcon: {
      fontSize: '40px',
    } as React.CSSProperties,
    stepTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '22px',
      fontWeight: 600,
      marginBottom: '12px',
      color: '#1F1D1A',
    } as React.CSSProperties,
    stepDesc: {
      fontSize: '15px',
      color: '#6B6560',
      lineHeight: 1.6,
    } as React.CSSProperties,

    // Use cases
    useCasesSection: {
      backgroundColor: '#F9F6F2',
    } as React.CSSProperties,
    useCasesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '24px',
    } as React.CSSProperties,
    useCaseCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      padding: '36px',
      border: '1px solid #E5E0D9',
      transition: 'box-shadow 0.2s ease',
    } as React.CSSProperties,
    useCaseHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px',
    } as React.CSSProperties,
    useCaseIconWrapper: {
      width: '56px',
      height: '56px',
      backgroundColor: '#F9F6F2',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
    } as React.CSSProperties,
    useCaseVertical: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#D4A645',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    } as React.CSSProperties,
    useCaseTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '20px',
      fontWeight: 600,
      color: '#1F1D1A',
    } as React.CSSProperties,
    useCaseDesc: {
      fontSize: '15px',
      color: '#6B6560',
      marginBottom: '20px',
      lineHeight: 1.6,
    } as React.CSSProperties,
    useCaseExample: {
      backgroundColor: '#F9F6F2',
      borderRadius: '8px',
      padding: '16px',
      borderLeft: '3px solid #5B8A72',
    } as React.CSSProperties,
    useCaseExampleLabel: {
      fontSize: '11px',
      fontWeight: 600,
      color: '#9A938A',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '6px',
    } as React.CSSProperties,
    useCaseExampleText: {
      fontSize: '14px',
      color: '#1F1D1A',
      fontStyle: 'italic',
      lineHeight: 1.5,
    } as React.CSSProperties,

    // Why AI-native
    whySection: {
      backgroundColor: '#1F1D1A',
      color: '#FFFFFF',
    } as React.CSSProperties,
    whyGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '64px',
      alignItems: 'center',
    } as React.CSSProperties,
    whyComparison: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      overflow: 'hidden',
    } as React.CSSProperties,
    whyRow: (isHighlighted: boolean) => ({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    }) as React.CSSProperties,
    whyCell: (isHeader: boolean, isHighlighted: boolean) => ({
      padding: '16px 20px',
      fontSize: isHeader ? '13px' : '15px',
      fontWeight: isHeader ? 600 : 400,
      color: isHighlighted ? '#5B8A72' : isHeader ? '#9A938A' : 'rgba(255, 255, 255, 0.8)',
      backgroundColor: isHighlighted ? 'rgba(91, 138, 114, 0.15)' : 'transparent',
      textAlign: isHeader ? 'left' as const : 'center' as const,
    }) as React.CSSProperties,
    whyContent: {
      paddingLeft: '24px',
    } as React.CSSProperties,
    whyTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '36px',
      fontWeight: 600,
      marginBottom: '24px',
      color: '#FFFFFF',
      lineHeight: 1.2,
    } as React.CSSProperties,
    whyPoints: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    } as React.CSSProperties,
    whyPoint: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '20px',
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.85)',
      lineHeight: 1.5,
    } as React.CSSProperties,
    whyPointIcon: {
      width: '24px',
      height: '24px',
      backgroundColor: '#5B8A72',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: '2px',
    } as React.CSSProperties,

    // Pricing
    pricingSection: {
      backgroundColor: '#FFFFFF',
    } as React.CSSProperties,
    pricingCard: {
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#F9F6F2',
      borderRadius: '16px',
      padding: '48px',
      textAlign: 'center' as const,
      border: '2px solid #E5E0D9',
    } as React.CSSProperties,
    pricingHighlight: {
      display: 'inline-block',
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      fontSize: '12px',
      fontWeight: 600,
      padding: '6px 14px',
      borderRadius: '20px',
      marginBottom: '24px',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    } as React.CSSProperties,
    pricingTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '28px',
      fontWeight: 600,
      marginBottom: '12px',
      color: '#1F1D1A',
    } as React.CSSProperties,
    pricingDesc: {
      fontSize: '16px',
      color: '#6B6560',
      marginBottom: '32px',
      lineHeight: 1.6,
    } as React.CSSProperties,
    pricingTiers: {
      display: 'flex',
      justifyContent: 'center',
      gap: '32px',
      marginBottom: '32px',
      flexWrap: 'wrap' as const,
    } as React.CSSProperties,
    pricingTier: {
      textAlign: 'center' as const,
    } as React.CSSProperties,
    pricingTierLabel: {
      fontSize: '13px',
      color: '#9A938A',
      marginBottom: '4px',
    } as React.CSSProperties,
    pricingTierPrice: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '32px',
      fontWeight: 700,
      color: '#1F1D1A',
    } as React.CSSProperties,
    pricingTierUnit: {
      fontSize: '14px',
      color: '#6B6560',
    } as React.CSSProperties,
    pricingNote: {
      fontSize: '14px',
      color: '#5B8A72',
      fontWeight: 500,
    } as React.CSSProperties,

    // Benchmarks
    benchmarksSection: {
      backgroundColor: '#F9F6F2',
    } as React.CSSProperties,
    benchmarkCard: {
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      padding: '48px',
      border: '1px solid #E5E0D9',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '48px',
      alignItems: 'center',
    } as React.CSSProperties,
    benchmarkVisual: {
      position: 'relative' as const,
    } as React.CSSProperties,
    benchmarkBars: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
    } as React.CSSProperties,
    benchmarkBar: (width: number, color: string) => ({
      height: '32px',
      backgroundColor: color,
      borderRadius: '4px',
      width: `${width}%`,
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '12px',
      fontSize: '13px',
      fontWeight: 500,
      color: '#FFFFFF',
      transition: 'width 0.5s ease',
    }) as React.CSSProperties,
    benchmarkContent: {
    } as React.CSSProperties,
    benchmarkTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '28px',
      fontWeight: 600,
      marginBottom: '16px',
      color: '#1F1D1A',
    } as React.CSSProperties,
    benchmarkDesc: {
      fontSize: '16px',
      color: '#6B6560',
      marginBottom: '24px',
      lineHeight: 1.6,
    } as React.CSSProperties,
    benchmarkLink: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      color: '#5B8A72',
      fontWeight: 600,
      fontSize: '15px',
      textDecoration: 'none',
    } as React.CSSProperties,

    // Integration
    integrationSection: {
      backgroundColor: '#FFFFFF',
    } as React.CSSProperties,
    integrationGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '24px',
    } as React.CSSProperties,
    integrationCard: {
      backgroundColor: '#F9F6F2',
      borderRadius: '12px',
      padding: '28px',
      textAlign: 'center' as const,
      border: '1px solid #E5E0D9',
    } as React.CSSProperties,
    integrationIcon: {
      width: '56px',
      height: '56px',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      fontSize: '28px',
    } as React.CSSProperties,
    integrationTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '8px',
      color: '#1F1D1A',
    } as React.CSSProperties,
    integrationDesc: {
      fontSize: '14px',
      color: '#6B6560',
      lineHeight: 1.5,
    } as React.CSSProperties,
    codePreview: {
      marginTop: '48px',
      backgroundColor: '#1F1D1A',
      borderRadius: '12px',
      padding: '24px',
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#E5E0D9',
      overflowX: 'auto' as const,
      lineHeight: 1.6,
    } as React.CSSProperties,

    // Trust signals
    trustSection: {
      backgroundColor: '#5B8A72',
      padding: '64px 24px',
    } as React.CSSProperties,
    trustGrid: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      gap: '64px',
      maxWidth: '900px',
      margin: '0 auto',
    } as React.CSSProperties,
    trustStat: {
      textAlign: 'center' as const,
    } as React.CSSProperties,
    trustNumber: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '48px',
      fontWeight: 700,
      color: '#FFFFFF',
      lineHeight: 1,
    } as React.CSSProperties,
    trustLabel: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: '8px',
    } as React.CSSProperties,

    // Final CTA
    finalCta: {
      backgroundColor: '#1F1D1A',
      padding: '100px 24px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    finalCtaTitle: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: 'clamp(28px, 4vw, 44px)',
      fontWeight: 600,
      color: '#FFFFFF',
      marginBottom: '16px',
      lineHeight: 1.2,
    } as React.CSSProperties,
    finalCtaSubtitle: {
      fontSize: '18px',
      color: 'rgba(255, 255, 255, 0.7)',
      marginBottom: '40px',
      maxWidth: '500px',
      marginLeft: 'auto',
      marginRight: 'auto',
    } as React.CSSProperties,
    finalCtaButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '18px 36px',
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '18px',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
    } as React.CSSProperties,
    finalCtaLinks: {
      display: 'flex',
      gap: '32px',
      justifyContent: 'center',
      marginTop: '32px',
    } as React.CSSProperties,
    finalCtaLink: {
      color: 'rgba(255, 255, 255, 0.6)',
      textDecoration: 'none',
      fontSize: '14px',
    } as React.CSSProperties,

    // Footer
    footer: {
      backgroundColor: '#F9F6F2',
      padding: '48px 24px',
      borderTop: '1px solid #E5E0D9',
    } as React.CSSProperties,
    footerInner: {
      maxWidth: '1100px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: '24px',
    } as React.CSSProperties,
    footerLogo: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontSize: '20px',
      fontWeight: 600,
      color: '#1F1D1A',
    } as React.CSSProperties,
    footerLinks: {
      display: 'flex',
      gap: '24px',
      flexWrap: 'wrap' as const,
    } as React.CSSProperties,
    footerLink: {
      fontSize: '14px',
      color: '#6B6560',
      textDecoration: 'none',
    } as React.CSSProperties,
    footerCopyright: {
      fontSize: '14px',
      color: '#9A938A',
    } as React.CSSProperties,
  };

  const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="#FFFFFF">
      <path d="M5.5 10L2 6.5l1-1 2.5 2.5L11 2.5l1 1z" />
    </svg>
  );

  const ArrowIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.5 5L15.5 10L10.5 15M4 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div style={styles.page}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap');

        @media (max-width: 768px) {
          .steps-grid { grid-template-columns: 1fr !important; }
          .use-cases-grid { grid-template-columns: 1fr !important; }
          .why-grid { grid-template-columns: 1fr !important; }
          .benchmark-card { grid-template-columns: 1fr !important; }
          .integration-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .integration-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Turn any text into an Emotional Readiness Score.<br />
            <span style={{ color: '#5B8A72' }}>In 60 seconds.</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Paste a journal entry, session transcript, or chat log. Get a clinically-grounded
            ERS score across 5 dimensions. No integration needed to try it.
          </p>
          <Link href="/sandbox" style={styles.heroCta}>
            Try the Sandbox
            <ArrowIcon />
          </Link>
          <div style={styles.heroSecondary}>
            <Link href="/partners/docs" style={styles.heroLink}>
              View API Docs
            </Link>
            <Link href="/partners/signup" style={styles.heroLink}>
              Get API Key
            </Link>
            <Link href="/partners/dashboard" style={styles.heroLink}>
              Partner Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ ...styles.section, ...styles.howItWorksSection }}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>How It Works</div>
          <h2 style={styles.sectionTitle}>Three steps to emotional intelligence</h2>
          <p style={styles.sectionSubtitle}>
            From raw text to actionable insights in seconds
          </p>
          <div style={styles.stepsGrid} className="steps-grid">
            <div style={styles.stepConnector} />
            <div style={styles.step}>
              <div style={styles.stepNumber}>
                <span style={styles.stepIcon}>📝</span>
              </div>
              <h3 style={styles.stepTitle}>Send Text</h3>
              <p style={styles.stepDesc}>
                Journal entries, therapy transcripts, chat logs, support tickets —
                any text where emotion matters.
              </p>
            </div>
            <div style={styles.step}>
              <div style={{ ...styles.stepNumber, borderColor: '#D4A645' }}>
                <span style={styles.stepIcon}>🎯</span>
              </div>
              <h3 style={styles.stepTitle}>Get Scores</h3>
              <p style={styles.stepDesc}>
                Receive a 0-100 ERS score with breakdowns across 5 clinical dimensions
                and confidence intervals.
              </p>
            </div>
            <div style={styles.step}>
              <div style={{ ...styles.stepNumber, borderColor: '#5B8A72' }}>
                <span style={styles.stepIcon}>💡</span>
              </div>
              <h3 style={styles.stepTitle}>Act on Insights</h3>
              <p style={styles.stepDesc}>
                Route users to appropriate resources, personalize experiences,
                or flag concerning patterns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ ...styles.section, ...styles.useCasesSection }}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>Use Cases</div>
          <h2 style={styles.sectionTitle}>Built for every vertical</h2>
          <p style={styles.sectionSubtitle}>
            See how leading platforms use emotional intelligence
          </p>
          <div style={styles.useCasesGrid} className="use-cases-grid">
            {/* Dating */}
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseHeader}>
                <div style={styles.useCaseIconWrapper}>💕</div>
                <div>
                  <div style={styles.useCaseVertical}>Dating Apps</div>
                  <div style={styles.useCaseTitle}>Reduce rebound churn</div>
                </div>
              </div>
              <p style={styles.useCaseDesc}>
                40% of users aren't emotionally ready to date. Identify them before
                they churn, route to healing resources, and match ready users together.
              </p>
              <div style={styles.useCaseExample}>
                <div style={styles.useCaseExampleLabel}>Example Input</div>
                <div style={styles.useCaseExampleText}>
                  "I'm so over my ex. Ready to get back out there and find someone new
                  who actually appreciates me for once..."
                </div>
              </div>
            </div>

            {/* Mental Health */}
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseHeader}>
                <div style={styles.useCaseIconWrapper}>🧠</div>
                <div>
                  <div style={styles.useCaseVertical}>Mental Health</div>
                  <div style={styles.useCaseTitle}>Quantify recovery progress</div>
                </div>
              </div>
              <p style={styles.useCaseDesc}>
                Transform subjective therapy sessions into measurable outcomes.
                Track progress across dimensions. Prove clinical ROI to payers.
              </p>
              <div style={styles.useCaseExample}>
                <div style={styles.useCaseExampleLabel}>Example Input</div>
                <div style={styles.useCaseExampleText}>
                  "Session transcript: Patient discussed coping strategies for
                  workplace stress. Showed improved self-awareness..."
                </div>
              </div>
            </div>

            {/* Workplace */}
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseHeader}>
                <div style={styles.useCaseIconWrapper}>🏢</div>
                <div>
                  <div style={styles.useCaseVertical}>Workplace Wellness</div>
                  <div style={styles.useCaseTitle}>Predict burnout early</div>
                </div>
              </div>
              <p style={styles.useCaseDesc}>
                Analyze 1:1 notes, pulse surveys, and Slack messages to detect
                emotional struggles before they become resignations.
              </p>
              <div style={styles.useCaseExample}>
                <div style={styles.useCaseExampleLabel}>Example Input</div>
                <div style={styles.useCaseExampleText}>
                  "Feeling overwhelmed with Q4 deadlines. Team dynamics have been
                  challenging lately. Not sure how much longer I can keep this up."
                </div>
              </div>
            </div>

            {/* Gambling */}
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseHeader}>
                <div style={styles.useCaseIconWrapper}>🎰</div>
                <div>
                  <div style={styles.useCaseVertical}>Responsible Gaming</div>
                  <div style={styles.useCaseTitle}>Flag at-risk players</div>
                </div>
              </div>
              <p style={styles.useCaseDesc}>
                Analyze chat logs and support interactions to identify emotional
                distress patterns that precede problem gambling behaviors.
              </p>
              <div style={styles.useCaseExample}>
                <div style={styles.useCaseExampleLabel}>Example Input</div>
                <div style={styles.useCaseExampleText}>
                  "Just need one big win to get back on track. I know my luck
                  is about to turn around. I can feel it this time."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why AI-native */}
      <section style={{ ...styles.section, ...styles.whySection }}>
        <div style={styles.sectionInner}>
          <div style={styles.whyGrid} className="why-grid">
            <div style={styles.whyComparison}>
              <div style={styles.whyRow(false)}>
                <div style={styles.whyCell(true, false)}></div>
                <div style={styles.whyCell(true, false)}>Incumbents</div>
                <div style={styles.whyCell(true, true)}>Paceful</div>
              </div>
              <div style={styles.whyRow(false)}>
                <div style={styles.whyCell(true, false)}>Integration Time</div>
                <div style={styles.whyCell(false, false)}>6-12 weeks</div>
                <div style={styles.whyCell(false, true)}>30 minutes</div>
              </div>
              <div style={styles.whyRow(false)}>
                <div style={styles.whyCell(true, false)}>Input Method</div>
                <div style={styles.whyCell(false, false)}>Structured forms</div>
                <div style={styles.whyCell(false, true)}>Any text</div>
              </div>
              <div style={styles.whyRow(false)}>
                <div style={styles.whyCell(true, false)}>Assessment Time</div>
                <div style={styles.whyCell(false, false)}>15-20 min</div>
                <div style={styles.whyCell(false, true)}>Instant</div>
              </div>
              <div style={styles.whyRow(false)}>
                <div style={styles.whyCell(true, false)}>Pricing Model</div>
                <div style={styles.whyCell(false, false)}>Per-seat license</div>
                <div style={styles.whyCell(false, true)}>Usage-based</div>
              </div>
              <div style={{ ...styles.whyRow(false), borderBottom: 'none' }}>
                <div style={styles.whyCell(true, false)}>Try Before Buy</div>
                <div style={styles.whyCell(false, false)}>Sales call</div>
                <div style={styles.whyCell(false, true)}>Free sandbox</div>
              </div>
            </div>
            <div style={styles.whyContent}>
              <h2 style={styles.whyTitle}>Why AI-native wins</h2>
              <ul style={styles.whyPoints}>
                <li style={styles.whyPoint}>
                  <div style={styles.whyPointIcon}><CheckIcon /></div>
                  <div><strong>No forms, no friction.</strong> Analyze text users are already writing — journals, messages, transcripts.</div>
                </li>
                <li style={styles.whyPoint}>
                  <div style={styles.whyPointIcon}><CheckIcon /></div>
                  <div><strong>Clinically grounded.</strong> Five dimensions based on attachment theory and emotional readiness research.</div>
                </li>
                <li style={styles.whyPoint}>
                  <div style={styles.whyPointIcon}><CheckIcon /></div>
                  <div><strong>Real-time scoring.</strong> Get results in milliseconds, not minutes. Scale to millions of assessments.</div>
                </li>
                <li style={styles.whyPoint}>
                  <div style={styles.whyPointIcon}><CheckIcon /></div>
                  <div><strong>Developer-first.</strong> TypeScript SDK, REST API, webhooks. Ship in an afternoon.</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ ...styles.section, ...styles.pricingSection }}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>Pricing</div>
          <h2 style={styles.sectionTitle}>Usage-based, starts free</h2>
          <p style={styles.sectionSubtitle}>
            No minimums, no commitments. Pay only for what you use.
          </p>
          <div style={styles.pricingCard}>
            <div style={styles.pricingHighlight}>Simple pricing</div>
            <h3 style={styles.pricingTitle}>Pay per assessment</h3>
            <p style={styles.pricingDesc}>
              Every API call that analyzes text counts as one assessment.
              Volume discounts available for high-traffic partners.
            </p>
            <div style={styles.pricingTiers}>
              <div style={styles.pricingTier}>
                <div style={styles.pricingTierLabel}>Sandbox</div>
                <div style={styles.pricingTierPrice}>Free</div>
                <div style={styles.pricingTierUnit}>100 assessments/month</div>
              </div>
              <div style={styles.pricingTier}>
                <div style={styles.pricingTierLabel}>Production</div>
                <div style={styles.pricingTierPrice}>$0.05</div>
                <div style={styles.pricingTierUnit}>per assessment</div>
              </div>
              <div style={styles.pricingTier}>
                <div style={styles.pricingTierLabel}>Enterprise</div>
                <div style={styles.pricingTierPrice}>Custom</div>
                <div style={styles.pricingTierUnit}>volume pricing</div>
              </div>
            </div>
            <p style={styles.pricingNote}>
              Design Partners: 90 days free on any tier →{' '}
              <a href="mailto:partners@paceful.com?subject=Design Partner Application" style={{ color: '#5B8A72', textDecoration: 'underline' }}>
                Apply now
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Benchmarks */}
      <section style={{ ...styles.section, ...styles.benchmarksSection }}>
        <div style={styles.sectionInner}>
          <div style={styles.benchmarkCard} className="benchmark-card">
            <div style={styles.benchmarkVisual}>
              <div style={styles.benchmarkBars}>
                <div style={styles.benchmarkBar(85, '#5B8A72')}>Your Users</div>
                <div style={styles.benchmarkBar(62, '#9A938A')}>Industry Avg</div>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9A938A' }}>
                <span>0</span>
                <span>ERS Score</span>
                <span>100</span>
              </div>
            </div>
            <div style={styles.benchmarkContent}>
              <h3 style={styles.benchmarkTitle}>See how your users compare</h3>
              <p style={styles.benchmarkDesc}>
                Benchmark your user base against others in your vertical.
                Identify where you're outperforming and where there's room to improve.
              </p>
              <Link href="/partners/dashboard" style={styles.benchmarkLink}>
                View your benchmarks
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Integration */}
      <section style={{ ...styles.section, ...styles.integrationSection }}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>Integration</div>
          <h2 style={styles.sectionTitle}>Ship in an afternoon</h2>
          <p style={styles.sectionSubtitle}>
            Multiple ways to integrate — choose what fits your stack
          </p>
          <div style={styles.integrationGrid} className="integration-grid">
            <div style={styles.integrationCard}>
              <div style={styles.integrationIcon}>📦</div>
              <h4 style={styles.integrationTitle}>TypeScript SDK</h4>
              <p style={styles.integrationDesc}>
                Full-featured SDK with types, retries, and streaming support.
              </p>
            </div>
            <div style={styles.integrationCard}>
              <div style={styles.integrationIcon}>🔌</div>
              <h4 style={styles.integrationTitle}>REST API</h4>
              <p style={styles.integrationDesc}>
                Simple JSON API. Works with any language or platform.
              </p>
            </div>
            <div style={styles.integrationCard}>
              <div style={styles.integrationIcon}>🔔</div>
              <h4 style={styles.integrationTitle}>Webhooks</h4>
              <p style={styles.integrationDesc}>
                Real-time notifications for threshold alerts and batch jobs.
              </p>
            </div>
            <div style={styles.integrationCard}>
              <div style={styles.integrationIcon}>⚛️</div>
              <h4 style={styles.integrationTitle}>React Widgets</h4>
              <p style={styles.integrationDesc}>
                Drop-in components for mood tracking, journaling, and scores.
              </p>
            </div>
          </div>
          <div style={styles.codePreview}>
            <span style={{ color: '#569CD6' }}>const</span> result = <span style={{ color: '#569CD6' }}>await</span> paceful.assess.analyze({'{'}<br />
            {'  '}text: <span style={{ color: '#CE9178' }}>"I've been feeling more hopeful lately..."</span>,<br />
            {'  '}context: {'{'} type: <span style={{ color: '#CE9178' }}>"journal_entry"</span> {'}'}<br />
            {'}'});<br /><br />
            <span style={{ color: '#6A9955' }}>// Returns: {'{'} ersScore: 72, stage: "ready", dimensions: [...] {'}'}</span>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section style={styles.trustSection}>
        <div style={styles.trustGrid}>
          <div style={styles.trustStat}>
            <div style={styles.trustNumber}>
              {stats && stats.assessmentCount > 0 ? formatNumber(stats.assessmentCount) : '—'}
            </div>
            <div style={styles.trustLabel}>Assessments Processed</div>
          </div>
          {stats && stats.partnerCount > 0 && (
            <div style={styles.trustStat}>
              <div style={styles.trustNumber}>{stats.partnerCount}</div>
              <div style={styles.trustLabel}>Active Partners</div>
            </div>
          )}
          <div style={styles.trustStat}>
            <div style={styles.trustNumber}>99.9%</div>
            <div style={styles.trustLabel}>Uptime</div>
          </div>
          <div style={styles.trustStat}>
            <div style={styles.trustNumber}>&lt;100ms</div>
            <div style={styles.trustLabel}>Response Time</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={styles.finalCta}>
        <h2 style={styles.finalCtaTitle}>Ready to add emotional intelligence?</h2>
        <p style={styles.finalCtaSubtitle}>
          Try the sandbox now — no signup required.
        </p>
        <Link href="/sandbox" style={styles.finalCtaButton}>
          Try the Sandbox
          <ArrowIcon />
        </Link>
        <div style={styles.finalCtaLinks}>
          <Link href="/partners/signup" style={styles.finalCtaLink}>
            Get API Key
          </Link>
          <Link href="/partners/docs" style={styles.finalCtaLink}>
            Read the Docs
          </Link>
          <a href="mailto:partners@paceful.com" style={styles.finalCtaLink}>
            Contact Sales
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLogo}>Paceful</div>
          <div style={styles.footerLinks}>
            <Link href="/" style={styles.footerLink}>Home</Link>
            <Link href="/partners" style={styles.footerLink}>Partners</Link>
            <Link href="/partners/docs" style={styles.footerLink}>API Docs</Link>
            <Link href="/partners/changelog" style={styles.footerLink}>Changelog</Link>
            <Link href="/privacy" style={styles.footerLink}>Privacy</Link>
            <Link href="/terms" style={styles.footerLink}>Terms</Link>
          </div>
          <div style={styles.footerCopyright}>
            © 2026 Paceful
          </div>
        </div>
      </footer>
    </div>
  );
}
