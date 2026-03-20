'use client';

import Link from 'next/link';

type ChangeType = 'added' | 'changed' | 'removed' | 'fixed' | 'deprecated' | 'security';

interface ChangelogEntry {
  type: ChangeType;
  description: string;
}

interface VersionEntry {
  version: string;
  date: string;
  changes: ChangelogEntry[];
}

const CHANGELOG: VersionEntry[] = [
  {
    version: '1.0.0',
    date: '2026-03-18',
    changes: [
      { type: 'added', description: 'Sandbox mode — test all endpoints with pk_sandbox_paceful_demo' },
      { type: 'added', description: 'ERS History API — time series scores with trend analysis' },
      { type: 'added', description: 'Aggregate trend endpoint for portfolio-level insights' },
      { type: 'added', description: 'Webhook delivery logs with retry support' },
      { type: 'added', description: 'Batch import endpoints for users and mood data' },
      { type: 'added', description: 'Interactive API playground on docs page' },
      { type: 'added', description: 'Rate limit headers on all responses' },
      { type: 'added', description: 'Health check and status endpoints' },
      { type: 'added', description: 'ERS Explainability Layer with configurable verbosity and tone' },
      { type: 'added', description: 'Partner configuration API for customizing ERS output' },
      { type: 'added', description: 'Batch ERS scoring for multiple users' },
      { type: 'added', description: 'Journal entry API with AI sentiment analysis' },
      { type: 'added', description: 'Mood logging with emotion tracking' },
      { type: 'added', description: 'User registration with context metadata' },
      { type: 'added', description: 'Analytics summary endpoint' },
      { type: 'added', description: 'API usage tracking and reporting' },
    ],
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
          <nav style={{ display: 'flex', gap: '24px' }}>
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
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
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
          marginBottom: '32px',
          lineHeight: 1.6,
        }}>
          Track changes, new features, and deprecations in the Paceful Partner API.
        </p>

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
          <div key={version.version} style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E0D9',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1F1D1A',
                margin: 0,
              }}>
                v{version.version}
              </h2>
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

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}>
              {version.changes.map((change, index) => {
                const style = TYPE_STYLES[change.type];
                return (
                  <li key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 0',
                    borderBottom: index < version.changes.length - 1 ? '1px solid #F0EBE5' : 'none',
                  }}>
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
                      flexShrink: 0,
                      minWidth: '70px',
                      textAlign: 'center',
                    }}>
                      {style.label}
                    </span>
                    <span style={{
                      fontSize: '15px',
                      color: '#1F1D1A',
                      lineHeight: 1.5,
                    }}>
                      {change.description}
                    </span>
                  </li>
                );
              })}
            </ul>
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
          Paceful Partner API — Current Version 1.0.0
        </p>
      </footer>
    </div>
  );
}
