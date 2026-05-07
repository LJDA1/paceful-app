import Link from 'next/link';
import { Metadata } from 'next';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata: Metadata = {
  title: 'API Changelog | Paceful Partners',
  description: 'Stay up to date with the latest changes to the Paceful API.',
};

type ChangeType = 'added' | 'changed' | 'removed' | 'fixed' | 'deprecated' | 'security';

interface ChangeGroup {
  type: ChangeType;
  items: string[];
}

interface VersionEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: ChangeGroup[];
  docsLink?: string;
}

// Changelog data - add new entries at the top
const CHANGELOG: VersionEntry[] = [
  {
    version: '1.3.0',
    date: '2026-04-05',
    title: 'Unstructured Text Analysis',
    description: 'Analyze raw text content directly without requiring structured data. Perfect for journal entries, session notes, and free-form text.',
    changes: [
      {
        type: 'added',
        items: [
          'POST /api/v1/assess/analyze - Single text analysis endpoint',
          'POST /api/v1/assess/analyze/batch - Batch text analysis for up to 50 entries',
          'Automatic source type detection (journal, session_notes, chat, free_text)',
          'Confidence scoring based on text quality and length',
          'Top signal extraction from analyzed content',
        ],
      },
    ],
    docsLink: '/partners/docs#text-analysis',
  },
  {
    version: '1.2.0',
    date: '2026-03-18',
    title: 'Explainability Layer',
    description: 'Customize how Emotional Readiness Score results are presented to your users with configurable verbosity, tone, and score formats.',
    changes: [
      {
        type: 'added',
        items: [
          'Verbosity levels: minimal, standard, clinical',
          'Tone options: clinical, casual, motivational',
          'Score formats: numerical, percentage, tier_label, traffic_light',
          'Partner config API for setting defaults',
          'Per-request overrides via query parameters',
          'Traffic light thresholds customization',
        ],
      },
    ],
    docsLink: '/partners/docs#explainability',
  },
  {
    version: '1.1.0',
    date: '2026-03-01',
    title: 'Multi-Vertical Support',
    description: 'Industry-specific benchmarking and calibration for different use cases.',
    changes: [
      {
        type: 'added',
        items: [
          'disruptionType parameter for vertical-specific scoring',
          'Supported verticals: dating, workplace, mental_health, insurance, gambling',
          'Vertical-specific benchmark comparisons',
          'Percentile rankings within your industry',
        ],
      },
    ],
    docsLink: '/partners/docs#verticals',
  },
  {
    version: '1.0.0',
    date: '2026-02-15',
    title: 'Core API',
    description: 'Initial release of the Emotional Readiness Score API with comprehensive assessment capabilities.',
    changes: [
      {
        type: 'added',
        items: [
          'GET /api/v1/partner/ers/get - Retrieve current ERS snapshot',
          'POST /api/v1/partner/ers/calculate - Calculate ERS from input data',
          'POST /api/v1/partner/ers/batch - Batch processing for multiple users',
          'GET /api/v1/partner/ers/history - Historical ERS data with trends',
          '5 clinical dimensions: Emotional Stability, Self Reflection, Coping Capacity, Behavioral Engagement, Social Readiness',
          'Readiness stages: Healing, Rebuilding, Ready',
          'Analytics dashboard endpoints',
          'Webhook support for score changes',
          'Rate limiting and usage tracking',
        ],
      },
    ],
    docsLink: '/partners/docs',
  },
];

const TYPE_STYLES: Record<ChangeType, { bg: string; text: string; label: string }> = {
  added:      { bg: 'rgba(91,138,114,0.12)',  text: '#3D6B54', label: 'Added' },
  changed:    { bg: 'rgba(212,151,59,0.12)',  text: '#92400E', label: 'Changed' },
  removed:    { bg: 'rgba(184,107,100,0.12)', text: '#8B3D3D', label: 'Removed' },
  fixed:      { bg: '#F4F1ED',               text: '#44403C', label: 'Fixed' },
  deprecated: { bg: 'rgba(212,151,59,0.12)',  text: '#92400E', label: 'Deprecated' },
  security:   { bg: 'rgba(184,107,100,0.12)', text: '#8B3D3D', label: 'Security' },
};

export default function ChangelogPage() {
  return (
    <>
      <MarketingNav />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 500,
            color: '#1C1917',
            marginBottom: '12px',
            fontFamily: 'var(--font-fraunces, Fraunces, serif)',
          }}>
            API Changelog
          </h1>
          <p style={{ fontSize: '15px', color: '#78716C', lineHeight: 1.6, margin: 0 }}>
            Track changes, new features, and deprecations in the Paceful Partner API.
          </p>
        </div>

        {/* Versioning Policy */}
        <div style={{
          backgroundColor: '#FAFAF9',
          border: '1px solid #E7E5E4',
          borderRadius: '4px',
          padding: '20px 24px',
          marginBottom: '32px',
        }}>
          <h2 style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#78716C',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Versioning Policy
          </h2>
          <p style={{ fontSize: '14px', color: '#5C574F', lineHeight: 1.6, margin: 0 }}>
            All API responses include{' '}
            <code style={{ backgroundColor: '#F4F1ED', padding: '2px 6px', borderRadius: '2px', fontSize: '13px', fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)' }}>X-API-Version</code>{' '}
            and{' '}
            <code style={{ backgroundColor: '#F4F1ED', padding: '2px 6px', borderRadius: '2px', fontSize: '13px', fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)' }}>X-API-Min-Version</code>{' '}
            headers. Endpoints are supported for a minimum of 12 months after deprecation notice.
          </p>
        </div>

        {/* Changelog Entries */}
        {CHANGELOG.map((version) => (
          <div
            key={version.version}
            id={`v${version.version}`}
            style={{
              backgroundColor: '#FAFAF9',
              border: '1px solid #E7E5E4',
              borderRadius: '4px',
              padding: '28px',
              marginBottom: '16px',
              scrollMarginTop: '80px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <Link
                href={`#v${version.version}`}
                style={{
                  fontSize: '22px',
                  fontWeight: 500,
                  color: '#1C1917',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-fraunces, Fraunces, serif)',
                }}
              >
                v{version.version}
              </Link>
              <span style={{ fontSize: '13px', color: '#9A938A' }}>
                {new Date(version.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <h3 style={{
              fontSize: '16px',
              fontWeight: 500,
              color: '#1C1917',
              marginBottom: '8px',
            }}>
              {version.title}
            </h3>

            <p style={{ fontSize: '14px', color: '#5C574F', lineHeight: 1.65, marginBottom: '20px' }}>
              {version.description}
            </p>

            {version.changes.map((changeGroup, groupIdx) => {
              const style = TYPE_STYLES[changeGroup.type];
              return (
                <div key={groupIdx} style={{ marginBottom: groupIdx < version.changes.length - 1 ? '16px' : 0 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    backgroundColor: style.bg,
                    color: style.text,
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '10px',
                  }}>
                    {style.label}
                  </span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {changeGroup.items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 0',
                        borderBottom: itemIdx < changeGroup.items.length - 1 ? '1px solid #F0EBE4' : 'none',
                      }}>
                        <span style={{ color: style.text, fontWeight: 600, fontSize: '14px', lineHeight: 1.5 }}>+</span>
                        <span style={{ fontSize: '14px', color: '#1C1917', lineHeight: 1.5 }}>
                          {item.includes('/api/') ? (
                            <code style={{
                              backgroundColor: '#F4F1ED',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              fontSize: '13px',
                              fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
                            }}>
                              {item}
                            </code>
                          ) : item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {version.docsLink && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E7E5E4' }}>
                <Link href={version.docsLink} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1C1917',
                  textDecoration: 'none',
                }}>
                  View documentation
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        ))}

        <div style={{
          backgroundColor: '#F4F1ED',
          borderRadius: '4px',
          padding: '16px 20px',
          fontSize: '14px',
          color: '#5C574F',
        }}>
          <strong>API Access:</strong> Get this changelog as JSON via{' '}
          <code style={{
            backgroundColor: '#FAFAF9',
            padding: '2px 8px',
            borderRadius: '2px',
            fontSize: '13px',
            fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
          }}>
            GET /api/v1/partner/changelog
          </code>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
