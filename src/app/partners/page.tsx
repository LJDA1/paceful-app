'use client';

import Link from 'next/link';

export default function PartnersLandingPage() {
  const styles = {
    page: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1F1D1A',
    } as React.CSSProperties,

    // Hero
    hero: {
      background: 'linear-gradient(135deg, #5B8A72 0%, #3D6B54 100%)',
      padding: '80px 24px 100px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    heroInner: {
      maxWidth: '800px',
      margin: '0 auto',
    } as React.CSSProperties,
    heroTitle: {
      fontSize: 'clamp(32px, 5vw, 56px)',
      fontWeight: 700,
      color: '#FFFFFF',
      marginBottom: '16px',
      lineHeight: 1.1,
    } as React.CSSProperties,
    heroSubtitle: {
      fontSize: 'clamp(16px, 2vw, 20px)',
      color: 'rgba(255, 255, 255, 0.85)',
      marginBottom: '32px',
      lineHeight: 1.5,
    } as React.CSSProperties,
    heroCtas: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      marginBottom: '24px',
    } as React.CSSProperties,
    ctaPrimary: {
      display: 'inline-block',
      padding: '14px 28px',
      backgroundColor: '#FFFFFF',
      color: '#5B8A72',
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '16px',
      textDecoration: 'none',
      transition: 'transform 0.15s ease',
    } as React.CSSProperties,
    ctaSecondary: {
      display: 'inline-block',
      padding: '14px 28px',
      backgroundColor: 'transparent',
      color: '#FFFFFF',
      border: '2px solid rgba(255, 255, 255, 0.5)',
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '16px',
      textDecoration: 'none',
      transition: 'border-color 0.15s ease',
    } as React.CSSProperties,
    heroNote: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.7)',
    } as React.CSSProperties,

    // Section base
    section: {
      padding: '80px 24px',
    } as React.CSSProperties,
    sectionInner: {
      maxWidth: '1100px',
      margin: '0 auto',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: 'clamp(28px, 4vw, 40px)',
      fontWeight: 700,
      textAlign: 'center' as const,
      marginBottom: '16px',
    } as React.CSSProperties,
    sectionSubtitle: {
      fontSize: '18px',
      color: '#6B6560',
      textAlign: 'center' as const,
      marginBottom: '48px',
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto',
    } as React.CSSProperties,

    // How it works
    howItWorks: {
      backgroundColor: '#F9F6F2',
    } as React.CSSProperties,
    stepsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '32px',
    } as React.CSSProperties,
    step: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '32px',
      position: 'relative' as const,
    } as React.CSSProperties,
    stepNumber: {
      width: '40px',
      height: '40px',
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: 700,
      marginBottom: '16px',
    } as React.CSSProperties,
    stepTitle: {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '12px',
    } as React.CSSProperties,
    codeBlock: {
      backgroundColor: '#1F1D1A',
      borderRadius: '8px',
      padding: '16px',
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#E5E0D9',
      overflowX: 'auto' as const,
    } as React.CSSProperties,

    // ERS section
    ersSection: {
      backgroundColor: '#FFFFFF',
    } as React.CSSProperties,
    dimensionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '48px',
    } as React.CSSProperties,
    dimensionCard: {
      border: '1px solid #E5E0D9',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    dimensionDot: (color: string) => ({
      width: '12px',
      height: '12px',
      backgroundColor: color,
      borderRadius: '50%',
      margin: '0 auto 12px',
    }) as React.CSSProperties,
    dimensionTitle: {
      fontSize: '15px',
      fontWeight: 600,
      marginBottom: '4px',
    } as React.CSSProperties,
    dimensionDesc: {
      fontSize: '13px',
      color: '#6B6560',
    } as React.CSSProperties,
    stageBar: {
      display: 'flex',
      borderRadius: '8px',
      overflow: 'hidden',
      height: '48px',
      maxWidth: '700px',
      margin: '0 auto',
    } as React.CSSProperties,
    stageSegment: (color: string, flex: number) => ({
      backgroundColor: color,
      flex,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
      fontSize: '14px',
      fontWeight: 600,
    }) as React.CSSProperties,

    // Use cases
    useCasesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
    } as React.CSSProperties,
    useCaseCard: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E0D9',
      borderRadius: '12px',
      padding: '32px',
      transition: 'box-shadow 0.15s ease',
    } as React.CSSProperties,
    useCaseIcon: {
      fontSize: '32px',
      marginBottom: '16px',
    } as React.CSSProperties,
    useCaseTitle: {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '12px',
    } as React.CSSProperties,
    useCaseDesc: {
      fontSize: '15px',
      color: '#6B6560',
      marginBottom: '16px',
      lineHeight: 1.5,
    } as React.CSSProperties,
    useCaseStat: {
      fontSize: '13px',
      color: '#5B8A72',
      fontWeight: 500,
    } as React.CSSProperties,

    // Widgets
    widgetsSection: {
      backgroundColor: '#F9F6F2',
    } as React.CSSProperties,
    widgetsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '24px',
      marginBottom: '32px',
    } as React.CSSProperties,
    widgetMockup: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #E5E0D9',
    } as React.CSSProperties,
    widgetTitle: {
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '16px',
      color: '#6B6560',
    } as React.CSSProperties,

    // Stats bar
    statsBar: {
      backgroundColor: '#5B8A72',
      padding: '48px 24px',
    } as React.CSSProperties,
    statsGrid: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      gap: '48px',
      maxWidth: '1100px',
      margin: '0 auto',
    } as React.CSSProperties,
    stat: {
      textAlign: 'center' as const,
    } as React.CSSProperties,
    statNumber: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#FFFFFF',
    } as React.CSSProperties,
    statLabel: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.8)',
    } as React.CSSProperties,

    // Pricing
    pricingGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      marginBottom: '32px',
    } as React.CSSProperties,
    pricingCard: (highlighted: boolean) => ({
      backgroundColor: '#FFFFFF',
      border: highlighted ? '2px solid #D4A645' : '1px solid #E5E0D9',
      borderRadius: '12px',
      padding: '32px',
      position: 'relative' as const,
    }) as React.CSSProperties,
    pricingBadge: {
      position: 'absolute' as const,
      top: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#D4A645',
      color: '#FFFFFF',
      fontSize: '12px',
      fontWeight: 600,
      padding: '4px 12px',
      borderRadius: '12px',
    } as React.CSSProperties,
    pricingTier: {
      fontSize: '20px',
      fontWeight: 600,
      marginBottom: '8px',
    } as React.CSSProperties,
    pricingPrice: {
      fontSize: '36px',
      fontWeight: 700,
      marginBottom: '4px',
    } as React.CSSProperties,
    pricingPeriod: {
      fontSize: '14px',
      color: '#6B6560',
      marginBottom: '24px',
    } as React.CSSProperties,
    pricingFeatures: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    } as React.CSSProperties,
    pricingFeature: {
      fontSize: '14px',
      color: '#6B6560',
      padding: '8px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    pricingNote: {
      textAlign: 'center' as const,
      fontSize: '16px',
      color: '#5B8A72',
      fontWeight: 500,
    } as React.CSSProperties,

    // Final CTA
    finalCta: {
      backgroundColor: '#1F1D1A',
      padding: '80px 24px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    finalCtaTitle: {
      fontSize: 'clamp(24px, 4vw, 36px)',
      fontWeight: 700,
      color: '#FFFFFF',
      marginBottom: '12px',
    } as React.CSSProperties,
    finalCtaSubtitle: {
      fontSize: '18px',
      color: 'rgba(255, 255, 255, 0.7)',
      marginBottom: '32px',
    } as React.CSSProperties,
    finalCtaButton: {
      display: 'inline-block',
      padding: '16px 32px',
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '16px',
      textDecoration: 'none',
      marginBottom: '16px',
    } as React.CSSProperties,
    finalCtaEmail: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.6)',
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
      fontSize: '18px',
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
    <svg width="16" height="16" viewBox="0 0 16 16" fill="#5B8A72">
      <path d="M6.5 11.5L3 8l1-1 2.5 2.5L12 4l1 1z" />
    </svg>
  );

  return (
    <div style={styles.page}>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>Add Emotional Intelligence to Your Platform</h1>
          <p style={styles.heroSubtitle}>
            The Paceful ERS API measures emotional readiness across 5 clinical dimensions.
            Integrate it in minutes.
          </p>
          <div style={styles.heroCtas}>
            <Link
              href="/partners/signup"
              style={{
                ...styles.ctaPrimary,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                padding: '16px 32px',
              }}
            >
              Get Your API Key in 30 Seconds
              <span style={{ fontSize: '20px' }}>→</span>
            </Link>
          </div>
          <div style={{ ...styles.heroCtas, marginTop: '12px' }}>
            <Link href="/partners/docs" style={styles.ctaSecondary}>
              View Documentation
            </Link>
            <a
              href="mailto:partners@paceful.com?subject=Design Partner Program Application"
              style={styles.ctaSecondary}
            >
              Design Partner Program
            </a>
          </div>
          <p style={styles.heroNote}>
            Instant sandbox access · No credit card required · Start building now
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ ...styles.section, ...styles.howItWorks }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSubtitle}>Three steps to emotional intelligence</p>
          <div style={styles.stepsGrid}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Install the SDK</h3>
              <div style={styles.codeBlock}>
                <span style={{ color: '#CE9178' }}>npm install</span> @paceful/sdk
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>Register Your Users</h3>
              <div style={styles.codeBlock}>
                <span style={{ color: '#569CD6' }}>await</span> paceful.users.register({'{'}<br />
                {'  '}externalId: <span style={{ color: '#CE9178' }}>'user-123'</span><br />
                {'}'})
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Get ERS Scores</h3>
              <div style={styles.codeBlock}>
                <span style={{ color: '#569CD6' }}>const</span> ers = <span style={{ color: '#569CD6' }}>await</span> paceful.ers.get(<span style={{ color: '#CE9178' }}>'user-123'</span>)<br />
                <span style={{ color: '#6A9955' }}>// {'{'} score: 66, stage: "ready" {'}'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is ERS */}
      <section style={{ ...styles.section, ...styles.ersSection }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>The Emotional Readiness Score</h2>
          <p style={styles.sectionSubtitle}>
            A 0-100 score quantifying emotional recovery across 5 clinical dimensions
          </p>
          <div style={styles.dimensionsGrid}>
            <div style={styles.dimensionCard}>
              <div style={styles.dimensionDot('#5B8A72')} />
              <div style={styles.dimensionTitle}>Emotional Stability</div>
              <div style={styles.dimensionDesc}>Mood variance & regulation</div>
            </div>
            <div style={styles.dimensionCard}>
              <div style={styles.dimensionDot('#5B7FB5')} />
              <div style={styles.dimensionTitle}>Self Reflection</div>
              <div style={styles.dimensionDesc}>Journaling depth & self-awareness</div>
            </div>
            <div style={styles.dimensionCard}>
              <div style={styles.dimensionDot('#C4973B')} />
              <div style={styles.dimensionTitle}>Engagement</div>
              <div style={styles.dimensionDesc}>Consistency of healthy behaviors</div>
            </div>
            <div style={styles.dimensionCard}>
              <div style={styles.dimensionDot('#7E71B5')} />
              <div style={styles.dimensionTitle}>Coping Capacity</div>
              <div style={styles.dimensionDesc}>Exercise & coping pattern quality</div>
            </div>
            <div style={styles.dimensionCard}>
              <div style={styles.dimensionDot('#D4A645')} />
              <div style={styles.dimensionTitle}>Social Readiness</div>
              <div style={styles.dimensionDesc}>Openness to connection</div>
            </div>
          </div>
          <div style={styles.stageBar}>
            <div style={styles.stageSegment('#7E71B5', 35)}>
              Healing 0-35
            </div>
            <div style={styles.stageSegment('#5B8A72', 30)}>
              Rebuilding 36-65
            </div>
            <div style={styles.stageSegment('#D4A645', 35)}>
              Ready 66-100
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ ...styles.section, backgroundColor: '#F9F6F2' }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Built for Every Platform</h2>
          <p style={styles.sectionSubtitle}>See how leading platforms use emotional intelligence</p>
          <div style={styles.useCasesGrid}>
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseIcon}>💕</div>
              <h3 style={styles.useCaseTitle}>Dating Apps</h3>
              <p style={styles.useCaseDesc}>
                Reduce churn from emotionally unready users. Factor ERS into match quality
                and route healing users to support.
              </p>
              <div style={styles.useCaseStat}>40% of users aren't emotionally ready</div>
            </div>
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseIcon}>🧠</div>
              <h3 style={styles.useCaseTitle}>Mental Health Platforms</h3>
              <p style={styles.useCaseDesc}>
                Give users measurable recovery progress. Track outcomes across 5 dimensions.
                Prove clinical ROI.
              </p>
              <div style={styles.useCaseStat}>70% of users can't quantify their progress</div>
            </div>
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseIcon}>🏢</div>
              <h3 style={styles.useCaseTitle}>HR / Employee Wellness</h3>
              <p style={styles.useCaseDesc}>
                Detect emotional struggles before they become resignations. Anonymous team
                wellness monitoring.
              </p>
              <div style={styles.useCaseStat}>$300B lost annually to mental health</div>
            </div>
            <div style={styles.useCaseCard}>
              <div style={styles.useCaseIcon}>💬</div>
              <h3 style={styles.useCaseTitle}>Relationship Coaching</h3>
              <p style={styles.useCaseDesc}>
                Turn subjective coaching into measurable outcomes. Show clients their
                progress with data.
              </p>
              <div style={styles.useCaseStat}>Prove coaching efficacy with real scores</div>
            </div>
          </div>
        </div>
      </section>

      {/* Widgets */}
      <section style={{ ...styles.section, ...styles.widgetsSection }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Drop-In Components</h2>
          <p style={styles.sectionSubtitle}>
            Pre-built React widgets your users interact with. One line of code.
          </p>
          <div style={styles.widgetsGrid}>
            {/* MoodWidget mockup */}
            <div style={styles.widgetMockup}>
              <div style={styles.widgetTitle}>MoodWidget</div>
              <div style={{ padding: '16px', backgroundColor: '#F9F6F2', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>How are you feeling?</div>
                {[
                  { label: 'Great', color: '#3D6B54' },
                  { label: 'Good', color: '#5B8A72' },
                  { label: 'Okay', color: '#C4973B' },
                ].map((mood) => (
                  <div key={mood.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #E5E0D9' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: mood.color }} />
                    <span style={{ fontSize: '13px' }}>{mood.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* JournalWidget mockup */}
            <div style={styles.widgetMockup}>
              <div style={styles.widgetTitle}>JournalWidget</div>
              <div style={{ padding: '16px', backgroundColor: '#F9F6F2', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#6B6560', marginBottom: '8px' }}>What's on your mind?</div>
                <div style={{ height: '60px', backgroundColor: '#FFFFFF', borderRadius: '4px', border: '1px solid #E5E0D9', marginBottom: '12px' }} />
                <div style={{ borderLeft: '3px solid #5B8A72', padding: '8px 12px', backgroundColor: 'rgba(91, 138, 114, 0.1)', borderRadius: '0 4px 4px 0' }}>
                  <div style={{ fontSize: '11px', color: '#5B8A72', fontWeight: 500, marginBottom: '4px' }}>AI Reflection</div>
                  <div style={{ fontSize: '12px', color: '#6B6560', fontStyle: 'italic' }}>Your entry shows growth...</div>
                </div>
              </div>
            </div>
            {/* ERSDisplay mockup */}
            <div style={styles.widgetMockup}>
              <div style={styles.widgetTitle}>ERSDisplay</div>
              <div style={{ padding: '16px', backgroundColor: '#F9F6F2', borderRadius: '8px', textAlign: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" stroke="#E5E0D9" strokeWidth="6" fill="none" />
                  <circle cx="40" cy="40" r="34" stroke="#5B8A72" strokeWidth="6" fill="none"
                    strokeDasharray="214" strokeDashoffset="75" strokeLinecap="round"
                    transform="rotate(-90 40 40)" />
                  <text x="40" y="44" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1F1D1A">66</text>
                </svg>
                <div style={{ fontSize: '12px', color: '#5B8A72', fontWeight: 500, marginTop: '8px' }}>READY</div>
                <div style={{ marginTop: '12px', fontSize: '11px', color: '#6B6560' }}>
                  ↑ +3.2 from last week
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...styles.codeBlock, maxWidth: '700px', margin: '0 auto' }}>
            {'<'}<span style={{ color: '#569CD6' }}>MoodWidget</span>{' '}
            <span style={{ color: '#9CDCFE' }}>apiKey</span>=<span style={{ color: '#CE9178' }}>"pk_live_..."</span>{' '}
            <span style={{ color: '#9CDCFE' }}>userId</span>=<span style={{ color: '#CE9178' }}>"user-123"</span>{' '}
            <span style={{ color: '#9CDCFE' }}>theme</span>=<span style={{ color: '#CE9178' }}>"light"</span>{' '}
            {'/>'}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={styles.statsBar}>
        <div style={styles.statsGrid}>
          <div style={styles.stat}>
            <div style={styles.statNumber}>5</div>
            <div style={styles.statLabel}>Clinical Dimensions</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>84%</div>
            <div style={styles.statLabel}>Prediction Accuracy</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>&lt;100ms</div>
            <div style={styles.statLabel}>Response Time</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>99.9%</div>
            <div style={styles.statLabel}>Uptime</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNumber}>$8.2B</div>
            <div style={styles.statLabel}>TAM</div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Simple, Scalable Pricing</h2>
          <p style={styles.sectionSubtitle}>Start free, scale as you grow</p>
          <div style={styles.pricingGrid}>
            <div style={styles.pricingCard(false)}>
              <div style={styles.pricingTier}>Starter</div>
              <div style={styles.pricingPrice}>$2,000</div>
              <div style={styles.pricingPeriod}>per month</div>
              <ul style={styles.pricingFeatures}>
                <li style={styles.pricingFeature}><CheckIcon /> 10K API calls/month</li>
                <li style={styles.pricingFeature}><CheckIcon /> 5 dimensions</li>
                <li style={styles.pricingFeature}><CheckIcon /> Email support</li>
                <li style={styles.pricingFeature}><CheckIcon /> Basic analytics</li>
              </ul>
            </div>
            <div style={styles.pricingCard(true)}>
              <div style={styles.pricingBadge}>Most Popular</div>
              <div style={styles.pricingTier}>Growth</div>
              <div style={styles.pricingPrice}>$5,000</div>
              <div style={styles.pricingPeriod}>per month</div>
              <ul style={styles.pricingFeatures}>
                <li style={styles.pricingFeature}><CheckIcon /> 50K API calls/month</li>
                <li style={styles.pricingFeature}><CheckIcon /> 5 dimensions + custom</li>
                <li style={styles.pricingFeature}><CheckIcon /> Slack + monthly call</li>
                <li style={styles.pricingFeature}><CheckIcon /> Advanced analytics</li>
                <li style={styles.pricingFeature}><CheckIcon /> Webhook support</li>
              </ul>
            </div>
            <div style={styles.pricingCard(false)}>
              <div style={styles.pricingTier}>Enterprise</div>
              <div style={styles.pricingPrice}>$15,000</div>
              <div style={styles.pricingPeriod}>per month</div>
              <ul style={styles.pricingFeatures}>
                <li style={styles.pricingFeature}><CheckIcon /> Unlimited API calls</li>
                <li style={styles.pricingFeature}><CheckIcon /> Custom dimensions</li>
                <li style={styles.pricingFeature}><CheckIcon /> Dedicated support</li>
                <li style={styles.pricingFeature}><CheckIcon /> White-label widgets</li>
                <li style={styles.pricingFeature}><CheckIcon /> Custom models</li>
                <li style={styles.pricingFeature}><CheckIcon /> SLA guarantee</li>
              </ul>
            </div>
          </div>
          <p style={styles.pricingNote}>
            Design Partners get 90 days free on any tier. Apply now.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section style={styles.finalCta}>
        <h2 style={styles.finalCtaTitle}>Ready to integrate emotional intelligence?</h2>
        <p style={styles.finalCtaSubtitle}>Get your sandbox API key instantly — start building in 30 seconds</p>
        <Link
          href="/partners/signup"
          style={{
            ...styles.finalCtaButton,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            padding: '16px 36px',
          }}
        >
          Get Your Free API Key
          <span style={{ fontSize: '20px' }}>→</span>
        </Link>
        <p style={{ ...styles.finalCtaEmail, marginTop: '24px' }}>
          Need a production key?{' '}
          <a href="mailto:partners@paceful.com?subject=Production API Key Request" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Contact us
          </a>
          {' '}for approval within 24 hours
        </p>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLogo}>Paceful</div>
          <div style={styles.footerLinks}>
            <Link href="/" style={styles.footerLink}>Home</Link>
            <Link href="/partners" style={styles.footerLink}>Partners</Link>
            <Link href="/partners/signup" style={styles.footerLink}>Get API Key</Link>
            <Link href="/partners/docs" style={styles.footerLink}>Docs</Link>
            <Link href="/partners/changelog" style={styles.footerLink}>Changelog</Link>
            <Link href="/privacy" style={styles.footerLink}>Privacy</Link>
          </div>
          <div style={styles.footerCopyright}>
            Built by LJ · © 2026 Paceful
          </div>
        </div>
      </footer>
    </div>
  );
}
