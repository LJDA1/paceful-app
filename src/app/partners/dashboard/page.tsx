'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/v1/partner';

interface PartnerInfo {
  partnerName: string;
  apiKey: string;
  permissions: string[];
  rateLimit: number;
  createdAt: string;
  totalUsers: number;
}

interface UsageStats {
  totalCalls30d: number;
  callsToday: number;
  rateLimitPerHour: number;
  rateLimitRemaining: number;
  topEndpoints: { endpoint: string; calls: number }[];
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  deliveries7d: number;
  successRate: number;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  status: 'pending' | 'delivered' | 'retrying' | 'failed';
  httpStatusCode: number | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
  durationMs: number | null;
}

// Skeleton loader component
function Skeleton({ width, height, className }: { width?: string; height?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: width || '100%',
        height: height || '20px',
        backgroundColor: '#E5E0D9',
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

// Card component
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {children}
    </div>
  );
}

export default function PartnerDashboard() {
  // Auth state - API key stored in React state only (never localStorage/cookies)
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Data state
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'failed' | 'retrying' | 'delivered'>('all');
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);

  // Loading states
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);

  // Error states
  const [infoError, setInfoError] = useState('');
  const [usageError, setUsageError] = useState('');
  const [webhooksError, setWebhooksError] = useState('');
  const [deliveriesError, setDeliveriesError] = useState('');

  // Copy state
  const [copied, setCopied] = useState(false);

  const fetchWithAuth = useCallback(async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        setIsAuthenticated(false);
        setApiKey('');
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data;
  }, [apiKey]);

  const fetchDeliveries = useCallback(async (statusFilter?: string) => {
    setLoadingDeliveries(true);
    setDeliveriesError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const data = await fetchWithAuth(`/webhooks/deliveries?${params}`);
      setDeliveries(data.deliveries || []);
    } catch (err) {
      setDeliveriesError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
    } finally {
      setLoadingDeliveries(false);
    }
  }, [fetchWithAuth]);

  const retryDelivery = useCallback(async (deliveryId: string) => {
    setRetryingDeliveryId(deliveryId);
    try {
      await fetchWithAuth(`/webhooks/deliveries/${deliveryId}/retry`, { method: 'POST' });
      // Refresh deliveries after retry
      await fetchDeliveries(deliveryFilter);
    } catch (err) {
      console.error('Failed to retry delivery:', err);
      alert(err instanceof Error ? err.message : 'Failed to retry delivery');
    } finally {
      setRetryingDeliveryId(null);
    }
  }, [fetchWithAuth, fetchDeliveries, deliveryFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    try {
      // Validate API key by fetching partner info
      const response = await fetch(`${API_BASE}/info`, {
        headers: {
          'X-API-Key': apiKeyInput,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Invalid API key');
      }

      setApiKey(apiKeyInput);
      setIsAuthenticated(true);
      setPartnerInfo(data.data);
      setLoadingInfo(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setApiKey('');
    setApiKeyInput('');
    setIsAuthenticated(false);
    setPartnerInfo(null);
    setUsageStats(null);
    setWebhooks([]);
  };

  // Fetch all data when authenticated
  useEffect(() => {
    if (!isAuthenticated || !apiKey) return;

    // Fetch usage stats
    setLoadingUsage(true);
    setUsageError('');
    fetchWithAuth('/usage')
      .then(setUsageStats)
      .catch((err) => setUsageError(err.message))
      .finally(() => setLoadingUsage(false));

    // Fetch webhooks
    setLoadingWebhooks(true);
    setWebhooksError('');
    fetchWithAuth('/webhooks/list')
      .then((data) => setWebhooks(data.webhooks || []))
      .catch((err) => setWebhooksError(err.message))
      .finally(() => setLoadingWebhooks(false));

    // Fetch deliveries
    fetchDeliveries(deliveryFilter);
  }, [isAuthenticated, apiKey, fetchWithAuth, fetchDeliveries, deliveryFilter]);

  const handleCopySnippet = () => {
    const snippet = `import { PacefulClient } from '@paceful/sdk';

const paceful = new PacefulClient({
  apiKey: '${apiKey}'
});

const ers = await paceful.ers.get('user-123');`;

    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Styles
  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#F9F6F2',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    } as React.CSSProperties,
    header: {
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E5E0D9',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as React.CSSProperties,
    logo: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#1F1D1A',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 24px',
    } as React.CSSProperties,
    loginContainer: {
      maxWidth: '400px',
      margin: '80px auto',
      padding: '0 24px',
    } as React.CSSProperties,
    welcomeTitle: {
      fontSize: '28px',
      fontWeight: 600,
      color: '#1F1D1A',
      marginBottom: '8px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    welcomeSubtitle: {
      fontSize: '16px',
      color: '#6B6560',
      marginBottom: '32px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '1px solid #E5E0D9',
      borderRadius: '8px',
      outline: 'none',
      boxSizing: 'border-box' as const,
      fontFamily: 'monospace',
    } as React.CSSProperties,
    button: {
      width: '100%',
      padding: '12px 24px',
      fontSize: '15px',
      fontWeight: 500,
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginTop: '16px',
      transition: 'background-color 0.15s ease',
    } as React.CSSProperties,
    buttonDisabled: {
      backgroundColor: '#9A938A',
      cursor: 'not-allowed',
    } as React.CSSProperties,
    errorText: {
      color: '#B56B6B',
      fontSize: '14px',
      marginTop: '12px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      marginBottom: '24px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#9A938A',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '16px',
    } as React.CSSProperties,
    cardTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#1F1D1A',
      marginBottom: '16px',
    } as React.CSSProperties,
    statNumber: {
      fontSize: '32px',
      fontWeight: 700,
      color: '#1F1D1A',
      lineHeight: 1,
    } as React.CSSProperties,
    statLabel: {
      fontSize: '14px',
      color: '#6B6560',
      marginTop: '4px',
    } as React.CSSProperties,
    codeBlock: {
      backgroundColor: '#1F1D1A',
      color: '#E5E0D9',
      borderRadius: '8px',
      padding: '16px',
      fontFamily: 'monospace',
      fontSize: '13px',
      lineHeight: 1.6,
      overflow: 'auto',
      position: 'relative' as const,
    } as React.CSSProperties,
    copyButton: {
      position: 'absolute' as const,
      top: '12px',
      right: '12px',
      padding: '6px 12px',
      fontSize: '12px',
      backgroundColor: copied ? '#5B8A72' : '#3D3D3A',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    } as React.CSSProperties,
    tag: {
      display: 'inline-block',
      padding: '4px 8px',
      fontSize: '12px',
      borderRadius: '4px',
      marginRight: '4px',
      marginBottom: '4px',
    } as React.CSSProperties,
    tagActive: {
      backgroundColor: '#E8F5E9',
      color: '#2E7D32',
    } as React.CSSProperties,
    tagInactive: {
      backgroundColor: '#FFF3E0',
      color: '#E65100',
    } as React.CSSProperties,
    progressBar: {
      height: '8px',
      backgroundColor: '#E5E0D9',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '8px',
    } as React.CSSProperties,
    progressFill: (percent: number) => ({
      height: '100%',
      width: `${percent}%`,
      backgroundColor: percent > 80 ? '#5B8A72' : percent > 50 ? '#C4973B' : '#B56B6B',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    }) as React.CSSProperties,
    link: {
      color: '#5B8A72',
      textDecoration: 'none',
      fontWeight: 500,
    } as React.CSSProperties,
    logoutButton: {
      padding: '8px 16px',
      fontSize: '14px',
      backgroundColor: 'transparent',
      color: '#6B6560',
      border: '1px solid #E5E0D9',
      borderRadius: '6px',
      cursor: 'pointer',
    } as React.CSSProperties,
    statusBadge: (status: string) => {
      const colors: Record<string, { bg: string; text: string }> = {
        delivered: { bg: '#E8F5E9', text: '#2E7D32' },
        failed: { bg: '#FFEBEE', text: '#C62828' },
        retrying: { bg: '#FFF3E0', text: '#E65100' },
        pending: { bg: '#E3F2FD', text: '#1565C0' },
      };
      const color = colors[status] || colors.pending;
      return {
        display: 'inline-block',
        padding: '4px 8px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '4px',
        backgroundColor: color.bg,
        color: color.text,
        textTransform: 'capitalize' as const,
      } as React.CSSProperties;
    },
    filterButton: (isActive: boolean) => ({
      padding: '6px 12px',
      fontSize: '13px',
      backgroundColor: isActive ? '#5B8A72' : 'transparent',
      color: isActive ? '#FFFFFF' : '#6B6560',
      border: isActive ? 'none' : '1px solid #E5E0D9',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }) as React.CSSProperties,
    retryButton: {
      padding: '4px 8px',
      fontSize: '12px',
      backgroundColor: '#5B8A72',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    } as React.CSSProperties,
    retryButtonDisabled: {
      backgroundColor: '#9A938A',
      cursor: 'not-allowed',
    } as React.CSSProperties,
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <header style={styles.header}>
          <div style={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#5B8A72" />
              <path d="M8 12 L11 15 L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Paceful Partners
          </div>
        </header>
        <div style={styles.loginContainer}>
          <Card>
            <h1 style={styles.welcomeTitle}>Partner Dashboard</h1>
            <p style={styles.welcomeSubtitle}>Enter your API key to access your dashboard</p>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="pk_live_..."
                style={styles.input}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!apiKeyInput.trim() || isAuthenticating}
                style={{
                  ...styles.button,
                  ...((!apiKeyInput.trim() || isAuthenticating) ? styles.buttonDisabled : {}),
                }}
              >
                {isAuthenticating ? 'Authenticating...' : 'Access Dashboard'}
              </button>
            </form>
            {authError && <p style={styles.errorText}>{authError}</p>}
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#5B8A72" />
            <path d="M8 12 L11 15 L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Paceful Partners
          {partnerInfo && (
            <span style={{ color: '#6B6560', fontWeight: 400, marginLeft: '8px' }}>
              — {partnerInfo.partnerName}
            </span>
          )}
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Log out
        </button>
      </header>

      <div style={styles.container}>
        {/* Overview Stats */}
        <div style={styles.sectionTitle}>Overview</div>
        <div style={styles.grid}>
          {/* Total Users */}
          <Card>
            {loadingInfo ? (
              <>
                <Skeleton width="60px" height="40px" />
                <Skeleton width="100px" height="16px" className="mt-2" />
              </>
            ) : (
              <>
                <div style={styles.statNumber}>{partnerInfo?.totalUsers.toLocaleString() || 0}</div>
                <div style={styles.statLabel}>Total Users</div>
              </>
            )}
          </Card>

          {/* API Calls Today */}
          <Card>
            {loadingUsage ? (
              <>
                <Skeleton width="60px" height="40px" />
                <Skeleton width="100px" height="16px" className="mt-2" />
              </>
            ) : usageError ? (
              <div style={{ color: '#B56B6B', fontSize: '14px' }}>{usageError}</div>
            ) : (
              <>
                <div style={styles.statNumber}>{usageStats?.callsToday.toLocaleString() || 0}</div>
                <div style={styles.statLabel}>API Calls Today</div>
              </>
            )}
          </Card>

          {/* API Calls (30d) */}
          <Card>
            {loadingUsage ? (
              <>
                <Skeleton width="60px" height="40px" />
                <Skeleton width="100px" height="16px" className="mt-2" />
              </>
            ) : usageError ? (
              <div style={{ color: '#B56B6B', fontSize: '14px' }}>{usageError}</div>
            ) : (
              <>
                <div style={styles.statNumber}>{usageStats?.totalCalls30d.toLocaleString() || 0}</div>
                <div style={styles.statLabel}>API Calls (30 days)</div>
              </>
            )}
          </Card>

          {/* Rate Limit */}
          <Card>
            {loadingUsage ? (
              <>
                <Skeleton width="100px" height="40px" />
                <Skeleton width="150px" height="16px" className="mt-2" />
                <Skeleton width="100%" height="8px" className="mt-3" />
              </>
            ) : usageError ? (
              <div style={{ color: '#B56B6B', fontSize: '14px' }}>{usageError}</div>
            ) : (
              <>
                <div style={styles.statNumber}>
                  {usageStats?.rateLimitRemaining || 0}
                  <span style={{ fontSize: '16px', color: '#6B6560', fontWeight: 400 }}>
                    /{usageStats?.rateLimitPerHour || 100}
                  </span>
                </div>
                <div style={styles.statLabel}>Rate Limit Remaining</div>
                <div style={styles.progressBar}>
                  <div
                    style={styles.progressFill(
                      ((usageStats?.rateLimitRemaining || 0) / (usageStats?.rateLimitPerHour || 100)) * 100
                    )}
                  />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Top Endpoints */}
        <div style={{ marginBottom: '24px' }}>
          <Card>
            <div style={styles.cardTitle}>Top Endpoints (30 days)</div>
            {loadingUsage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton width="200px" height="16px" />
                    <Skeleton width="60px" height="16px" />
                  </div>
                ))}
              </div>
            ) : usageError ? (
              <div style={{ color: '#B56B6B', fontSize: '14px' }}>{usageError}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {usageStats?.topEndpoints.map((ep, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code style={{ fontSize: '14px', color: '#1F1D1A', fontFamily: 'monospace' }}>
                      {ep.endpoint}
                    </code>
                    <span style={{ fontSize: '14px', color: '#6B6560' }}>
                      {ep.calls.toLocaleString()} calls
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* SDK Quick Start */}
        <div style={styles.sectionTitle}>SDK Quick Start</div>
        <div style={{ marginBottom: '24px' }}>
          <Card>
            <div style={styles.cardTitle}>JavaScript / TypeScript</div>
            <div style={styles.codeBlock}>
              <button onClick={handleCopySnippet} style={styles.copyButton}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <pre style={{ margin: 0 }}>
{`import { PacefulClient } from '@paceful/sdk';

const paceful = new PacefulClient({
  apiKey: '${apiKey}'
});

const ers = await paceful.ers.get('user-123');`}
              </pre>
            </div>
            <p style={{ fontSize: '14px', color: '#6B6560', marginTop: '12px' }}>
              Install: <code style={{ backgroundColor: '#F9F6F2', padding: '2px 6px', borderRadius: '4px' }}>npm install @paceful/sdk</code>
            </p>
          </Card>
        </div>

        {/* Webhooks */}
        <div style={styles.sectionTitle}>Webhooks</div>
        <div style={{ marginBottom: '24px' }}>
          <Card>
            <div style={styles.cardTitle}>Registered Webhooks</div>
            {loadingWebhooks ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[...Array(2)].map((_, i) => (
                  <div key={i}>
                    <Skeleton width="300px" height="16px" />
                    <Skeleton width="200px" height="14px" className="mt-2" />
                  </div>
                ))}
              </div>
            ) : webhooksError ? (
              <div style={{ color: '#B56B6B', fontSize: '14px' }}>{webhooksError}</div>
            ) : webhooks.length === 0 ? (
              <p style={{ color: '#6B6560', fontSize: '14px' }}>
                No webhooks registered.{' '}
                <a href="/partners/docs#webhooks" style={styles.link}>
                  Learn how to set up webhooks →
                </a>
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#F9F6F2',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <code style={{ fontSize: '14px', color: '#1F1D1A', wordBreak: 'break-all' }}>
                        {webhook.url}
                      </code>
                      <span
                        style={{
                          ...styles.tag,
                          ...(webhook.isActive ? styles.tagActive : styles.tagInactive),
                        }}
                      >
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          style={{
                            ...styles.tag,
                            backgroundColor: '#E5E0D9',
                            color: '#6B6560',
                          }}
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#9A938A' }}>
                      {webhook.deliveries7d > 0 ? (
                        <>
                          {webhook.deliveries7d} deliveries (7d) · {webhook.successRate}% success
                          {webhook.lastTriggeredAt && (
                            <> · Last triggered {new Date(webhook.lastTriggeredAt).toLocaleDateString()}</>
                          )}
                        </>
                      ) : (
                        'No deliveries in the last 7 days'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Webhook Deliveries */}
        <div style={styles.sectionTitle}>Webhook Deliveries</div>
        <div style={{ marginBottom: '24px' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={styles.cardTitle}>Recent Deliveries</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['all', 'delivered', 'failed', 'retrying'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDeliveryFilter(filter)}
                    style={styles.filterButton(deliveryFilter === filter)}
                  >
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {loadingDeliveries ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width="150px" height="16px" />
                    <Skeleton width="80px" height="24px" />
                    <Skeleton width="100px" height="16px" />
                  </div>
                ))}
              </div>
            ) : deliveriesError ? (
              <div style={{ color: '#B56B6B', fontSize: '14px' }}>{deliveriesError}</div>
            ) : deliveries.length === 0 ? (
              <p style={{ color: '#6B6560', fontSize: '14px' }}>
                No webhook deliveries found{deliveryFilter !== 'all' ? ` with status "${deliveryFilter}"` : ''}.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6B6560', fontWeight: 500 }}>Event</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6B6560', fontWeight: 500 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6B6560', fontWeight: 500 }}>Response</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6B6560', fontWeight: 500 }}>Attempts</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6B6560', fontWeight: 500 }}>Time</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6B6560', fontWeight: 500 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} style={{ borderBottom: '1px solid #F4F1ED' }}>
                        <td style={{ padding: '12px', color: '#1F1D1A' }}>
                          <code style={{ fontSize: '13px' }}>{delivery.eventType}</code>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={styles.statusBadge(delivery.status)}>{delivery.status}</span>
                        </td>
                        <td style={{ padding: '12px', color: '#6B6560' }}>
                          {delivery.httpStatusCode ? (
                            <span style={{ fontFamily: 'monospace' }}>
                              HTTP {delivery.httpStatusCode}
                              {delivery.durationMs && ` (${delivery.durationMs}ms)`}
                            </span>
                          ) : (
                            <span style={{ color: '#9A938A' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', color: '#6B6560' }}>
                          {delivery.attemptCount}/{delivery.maxAttempts}
                          {delivery.status === 'retrying' && delivery.nextRetryAt && (
                            <span style={{ fontSize: '12px', color: '#9A938A', marginLeft: '4px' }}>
                              (next: {new Date(delivery.nextRetryAt).toLocaleTimeString()})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', color: '#6B6560', fontSize: '13px' }}>
                          {new Date(delivery.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {delivery.status === 'failed' && (
                            <button
                              onClick={() => retryDelivery(delivery.id)}
                              disabled={retryingDeliveryId === delivery.id}
                              style={{
                                ...styles.retryButton,
                                ...(retryingDeliveryId === delivery.id ? styles.retryButtonDisabled : {}),
                              }}
                            >
                              {retryingDeliveryId === delivery.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Resources */}
        <div style={styles.sectionTitle}>Resources</div>
        <div style={styles.grid}>
          <Card>
            <div style={styles.cardTitle}>Full API Documentation</div>
            <p style={{ fontSize: '14px', color: '#6B6560', marginBottom: '16px' }}>
              Complete reference for all API endpoints, request formats, and response schemas.
            </p>
            <a
              href="/partners/docs"
              style={{
                ...styles.link,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View Documentation
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.5 3.5L11 8L6.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </a>
          </Card>

          <Card>
            <div style={styles.cardTitle}>Contact Support</div>
            <p style={{ fontSize: '14px', color: '#6B6560', marginBottom: '16px' }}>
              Have questions or need help with your integration? Our team is here to help.
            </p>
            <a
              href="mailto:partners@paceful.com"
              style={{
                ...styles.link,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              partners@paceful.com
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.5 3.5L11 8L6.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </a>
          </Card>
        </div>

        {/* Account Info */}
        <div style={styles.sectionTitle}>Account</div>
        <Card>
          {loadingInfo ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Skeleton width="80px" height="12px" />
                  <Skeleton width="150px" height="18px" className="mt-2" />
                </div>
              ))}
            </div>
          ) : infoError ? (
            <div style={{ color: '#B56B6B', fontSize: '14px' }}>{infoError}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#9A938A', marginBottom: '4px' }}>Partner Name</div>
                <div style={{ fontSize: '15px', color: '#1F1D1A', fontWeight: 500 }}>{partnerInfo?.partnerName}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9A938A', marginBottom: '4px' }}>API Key</div>
                <code style={{ fontSize: '14px', color: '#1F1D1A', fontFamily: 'monospace' }}>{partnerInfo?.apiKey}</code>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9A938A', marginBottom: '4px' }}>Rate Limit</div>
                <div style={{ fontSize: '15px', color: '#1F1D1A' }}>{partnerInfo?.rateLimit} requests/hour</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9A938A', marginBottom: '4px' }}>Member Since</div>
                <div style={{ fontSize: '15px', color: '#1F1D1A' }}>
                  {partnerInfo?.createdAt ? new Date(partnerInfo.createdAt).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
