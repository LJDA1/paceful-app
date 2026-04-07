import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Changelog | Paceful',
  description: 'Stay up to date with the latest changes to the Paceful ERS API.',
};

// Changelog data - add new entries at the top
const CHANGELOG_ENTRIES = [
  {
    version: '1.3.0',
    date: '2026-04-05',
    title: 'Unstructured Text Analysis',
    type: 'feature' as const,
    description: 'Analyze raw text content directly without requiring structured data. Perfect for journal entries, session notes, and free-form text.',
    changes: [
      {
        type: 'added' as const,
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
    type: 'feature' as const,
    description: 'Customize how ERS results are presented to your users with configurable verbosity, tone, and score formats.',
    changes: [
      {
        type: 'added' as const,
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
    type: 'feature' as const,
    description: 'Industry-specific benchmarking and calibration for different use cases.',
    changes: [
      {
        type: 'added' as const,
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
    title: 'Core ERS API',
    type: 'release' as const,
    description: 'Initial release of the Emotional Readiness Score API with comprehensive assessment capabilities.',
    changes: [
      {
        type: 'added' as const,
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

const CHANGE_TYPE_LABELS = {
  added: { label: 'Added', color: '#5B8A72', bg: '#E8F5E9' },
  changed: { label: 'Changed', color: '#1565C0', bg: '#E3F2FD' },
  deprecated: { label: 'Deprecated', color: '#D4973B', bg: '#FEF9E7' },
  removed: { label: 'Removed', color: '#B56B6B', bg: '#FFEBEE' },
  fixed: { label: 'Fixed', color: '#7B1FA2', bg: '#F3E5F5' },
  security: { label: 'Security', color: '#C62828', bg: '#FFEBEE' },
};

const VERSION_TYPE_LABELS = {
  feature: { label: 'Feature', color: '#5B8A72' },
  release: { label: 'Release', color: '#1565C0' },
  patch: { label: 'Patch', color: '#6B6560' },
};

export default function ChangelogPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF9F7',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E0D9',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link href="/partners" style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#1F1D1A',
            textDecoration: 'none',
          }}>
            Paceful
          </Link>
          <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Link href="/partners/docs" style={{
              fontSize: '14px',
              color: '#6B6560',
              textDecoration: 'none',
            }}>
              Documentation
            </Link>
            <Link href="/changelog/rss" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#5B8A72',
              textDecoration: 'none',
              fontWeight: 500,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/>
              </svg>
              RSS Feed
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E0D9',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#1F1D1A',
            marginBottom: '12px',
          }}>
            API Changelog
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#6B6560',
            lineHeight: 1.6,
            marginBottom: '16px',
          }}>
            Stay up to date with the latest changes, improvements, and new features in the Paceful ERS API.
          </p>
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <Link href="/changelog/rss" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#5B8A72',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/>
              </svg>
              Subscribe to RSS
            </Link>
            <span style={{ fontSize: '14px', color: '#9A938A' }}>
              Current version: {CHANGELOG_ENTRIES[0].version}
            </span>
          </div>
        </div>
      </div>

      {/* Changelog Entries */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {CHANGELOG_ENTRIES.map((entry, index) => (
            <article
              key={entry.version}
              id={`v${entry.version}`}
              style={{
                scrollMarginTop: '100px',
              }}
            >
              {/* Version Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                marginBottom: '16px',
              }}>
                {/* Timeline dot */}
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: VERSION_TYPE_LABELS[entry.type].color,
                  marginTop: '8px',
                  flexShrink: 0,
                  boxShadow: `0 0 0 4px ${VERSION_TYPE_LABELS[entry.type].color}20`,
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '4px',
                  }}>
                    <Link
                      href={`#v${entry.version}`}
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#1F1D1A',
                        textDecoration: 'none',
                      }}
                    >
                      v{entry.version}
                    </Link>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      backgroundColor: `${VERSION_TYPE_LABELS[entry.type].color}15`,
                      color: VERSION_TYPE_LABELS[entry.type].color,
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {VERSION_TYPE_LABELS[entry.type].label}
                    </span>
                  </div>
                  <time style={{
                    fontSize: '14px',
                    color: '#9A938A',
                  }}>
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
              </div>

              {/* Content Card */}
              <div style={{
                marginLeft: '28px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E5E0D9',
                padding: '24px',
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#1F1D1A',
                  marginBottom: '8px',
                }}>
                  {entry.title}
                </h2>
                <p style={{
                  fontSize: '15px',
                  color: '#6B6560',
                  lineHeight: 1.6,
                  marginBottom: '20px',
                }}>
                  {entry.description}
                </p>

                {/* Changes */}
                {entry.changes.map((changeGroup, idx) => (
                  <div key={idx} style={{ marginBottom: idx < entry.changes.length - 1 ? '16px' : 0 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: CHANGE_TYPE_LABELS[changeGroup.type].bg,
                      color: CHANGE_TYPE_LABELS[changeGroup.type].color,
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '12px',
                    }}>
                      {CHANGE_TYPE_LABELS[changeGroup.type].label}
                    </div>
                    <ul style={{
                      margin: 0,
                      padding: '0 0 0 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      {changeGroup.items.map((item, itemIdx) => (
                        <li key={itemIdx} style={{
                          fontSize: '14px',
                          color: '#1F1D1A',
                          lineHeight: 1.5,
                        }}>
                          {item.includes('/api/') ? (
                            <code style={{
                              backgroundColor: '#F4F1ED',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                            }}>
                              {item}
                            </code>
                          ) : (
                            item
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Docs Link */}
                {entry.docsLink && (
                  <div style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid #E5E0D9',
                  }}>
                    <Link href={entry.docsLink} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#5B8A72',
                      textDecoration: 'none',
                    }}>
                      View documentation
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>

              {/* Timeline line */}
              {index < CHANGELOG_ENTRIES.length - 1 && (
                <div style={{
                  width: '2px',
                  height: '48px',
                  backgroundColor: '#E5E0D9',
                  marginLeft: '5px',
                  marginTop: '-8px',
                }} />
              )}
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #E5E0D9',
        padding: '24px',
        textAlign: 'center',
        marginTop: '48px',
      }}>
        <p style={{ fontSize: '14px', color: '#9A938A' }}>
          Built by Paceful ·{' '}
          <Link href="/partners" style={{ color: '#5B8A72', textDecoration: 'none' }}>
            Partner API
          </Link>
          {' · '}
          <Link href="/partners/docs" style={{ color: '#5B8A72', textDecoration: 'none' }}>
            Documentation
          </Link>
        </p>
      </footer>
    </div>
  );
}
