import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Changelog | Paceful Partners',
  description: 'Stay up to date with the latest changes to the Paceful ERS API.',
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
    description: 'Customize how ERS results are presented to your users with configurable verbosity, tone, and score formats.',
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
    title: 'Core ERS API',
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
  added: { bg: '#E8F5E9', text: '#2E7D32', label: 'Added' },
  changed: { bg: '#FFF8E1', text: '#F57C00', label: 'Changed' },
  removed: { bg: '#FFEBEE', text: '#C62828', label: 'Removed' },
  fixed: { bg: '#E3F2FD', text: '#1565C0', label: 'Fixed' },
  deprecated: { bg: '#FFF3E0', text: '#E65100', label: 'Deprecated' },
  security: { bg: '#FCE4EC', text: '#AD1457', label: 'Security' },
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
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
            <Link href="/partners/changelog" style={{
              fontSize: '14px',
              color: '#5B8A72',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              Changelog
            </Link>
            <Link href="/changelog/rss" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#5B8A72',
              textDecoration: 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/>
              </svg>
              RSS
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#1F1D1A',
              marginBottom: '12px',
            }}>
              API Changelog
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6B6560',
              lineHeight: 1.6,
              margin: 0,
            }}>
              Track changes, new features, and deprecations in the Paceful Partner API.
            </p>
          </div>
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
        </div>

        {/* Versioning Policy */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E0D9',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '32px',
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1F1D1A',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Versioning Policy
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6B6560',
            lineHeight: 1.6,
            margin: 0,
          }}>
            All API responses include <code style={{ backgroundColor: '#F5F5F5', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>X-API-Version</code> and <code style={{ backgroundColor: '#F5F5F5', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>X-API-Min-Version</code> headers.
            Endpoints are supported for a minimum of 12 months after deprecation notice.
            Deprecated endpoints return <code style={{ backgroundColor: '#F5F5F5', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>Sunset</code> and <code style={{ backgroundColor: '#F5F5F5', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>Deprecation</code> headers.
          </p>
        </div>

        {/* Changelog Entries */}
        {CHANGELOG.map((version) => (
          <div
            key={version.version}
            id={`v${version.version}`}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E0D9',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              scrollMarginTop: '100px',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}>
              <Link
                href={`#v${version.version}`}
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#1F1D1A',
                  textDecoration: 'none',
                }}
              >
                v{version.version}
              </Link>
              <span style={{
                fontSize: '14px',
                color: '#9A938A',
              }}>
                {new Date(version.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1F1D1A',
              marginBottom: '8px',
            }}>
              {version.title}
            </h3>

            <p style={{
              fontSize: '15px',
              color: '#6B6560',
              lineHeight: 1.6,
              marginBottom: '20px',
            }}>
              {version.description}
            </p>

            {version.changes.map((changeGroup, groupIdx) => {
              const style = TYPE_STYLES[changeGroup.type];
              return (
                <div key={groupIdx} style={{ marginBottom: groupIdx < version.changes.length - 1 ? '16px' : 0 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    backgroundColor: style.bg,
                    color: style.text,
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px',
                  }}>
                    {style.label}
                  </span>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}>
                    {changeGroup.items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 0',
                        borderBottom: itemIdx < changeGroup.items.length - 1 ? '1px solid #F0EBE5' : 'none',
                      }}>
                        <span style={{
                          color: style.text,
                          fontWeight: 600,
                          fontSize: '14px',
                          lineHeight: 1.5,
                        }}>
                          +
                        </span>
                        <span style={{
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
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {version.docsLink && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #E5E0D9',
              }}>
                <Link href={version.docsLink} style={{
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
        ))}

        {/* API Endpoint Link */}
        <div style={{
          backgroundColor: '#F5F5F5',
          borderRadius: '8px',
          padding: '16px 20px',
          fontSize: '14px',
          color: '#6B6560',
        }}>
          <strong>API Access:</strong> Get this changelog as JSON via{' '}
          <code style={{
            backgroundColor: '#FFFFFF',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}>
            GET /api/v1/partner/changelog
          </code>
          {' or subscribe via '}
          <Link href="/changelog/rss" style={{ color: '#5B8A72', fontWeight: 500 }}>
            RSS feed
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #E5E0D9',
        padding: '24px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '14px',
          color: '#9A938A',
          margin: 0,
        }}>
          Paceful Partner API — Current Version {CHANGELOG[0].version}
        </p>
      </footer>
    </div>
  );
}
