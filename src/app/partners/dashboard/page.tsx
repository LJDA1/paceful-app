'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from 'recharts';

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

interface DimensionBenchmark {
  dimension: string;
  displayName: string;
  verticalAvg: number;
  verticalMedian: number;
  verticalP25: number;
  verticalP75: number;
  partnerAvg: number | null;
  partnerSampleSize: number;
  percentileRank: number | null;
  percentileLabel: string | null;
  trend: 'improving' | 'declining' | 'stable' | null;
  previousAvg: number | null;
}

interface BenchmarkData {
  vertical: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  verticalSampleSize: number;
  summary: {
    overallErsVerticalAvg: number | null;
    overallErsPartnerAvg: number | null;
    overallPercentile: number | null;
    overallPercentileLabel: string | null;
    overallTrend: 'improving' | 'declining' | 'stable' | null;
    avgPercentileAcrossDimensions: number | null;
  };
  dimensions: DimensionBenchmark[];
  insights: string[];
}

type DashboardTab = 'overview' | 'webhooks' | 'benchmarks' | 'analytics' | 'keys';

type AuthMethod = 'none' | 'session' | 'api_key';

interface SessionData {
  partnerId: string;
  email: string;
  companyName: string;
  contactName: string;
}

interface KeysData {
  testApiKey: string;
  liveApiKey: string | null;
  testKeyActive: boolean;
  liveKeyActive: boolean;
  emailVerified: boolean;
  isPersonalEmail: boolean;
}

// Analytics data types
interface VolumeDataPoint {
  date: string;
  count: number;
}

interface ErsDistributionBucket {
  range: string;
  count: number;
  percentage: number;
}

interface DimensionHeatmapItem {
  dimension: string;
  average: number;
  median: number;
  sampleSize: number;
  distribution: {
    low: number;
    medium: number;
    high: number;
  };
}

interface StageFunnelItem {
  stage: string;
  count: number;
  percentage: number;
}

interface TopSignal {
  signal: string;
  frequency: number;
  dimension: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface AnalyticsBenchmarkDimension {
  dimension: string;
  verticalAvg: number | null;
  partnerAvg: number | null;
  percentile: number | null;
  trend: string | null;
}

interface AnalyticsData {
  period: string;
  granularity: string;
  summary: {
    totalAssessments: number;
    averageErs: number | null;
    periodStart: string;
    periodEnd: string;
  };
  assessmentVolume: VolumeDataPoint[];
  ersDistribution: ErsDistributionBucket[];
  dimensionHeatmap: DimensionHeatmapItem[];
  stageFunnel: {
    stages: StageFunnelItem[];
    conversionRates: {
      healingToRebuilding: number;
      rebuildingToReady: number;
    };
  };
  benchmarkComparison: {
    vertical: string;
    dimensions: AnalyticsBenchmarkDimension[];
    overall: {
      verticalAvg: number | null;
      partnerAvg: number | null;
      percentile: number | null;
    };
  } | null;
  topSignals: TopSignal[];
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
        backgroundColor: '#FAFAF9',
        border: '1px solid #E7E5E4',
        borderRadius: '4px',
        padding: '24px',
      }}
    >
      {children}
    </div>
  );
}

export default function PartnerDashboard() {
  // Auth state
  const [authMethod, setAuthMethod] = useState<AuthMethod>('none');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Session auth state
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [keysData, setKeysData] = useState<KeysData | null>(null);
  const [copiedTestKey, setCopiedTestKey] = useState(false);
  const [copiedLiveKey, setCopiedLiveKey] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Data state
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'failed' | 'retrying' | 'delivered'>('all');
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [analyticsGranularity, setAnalyticsGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Loading states
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Error states
  const [infoError, setInfoError] = useState('');
  const [usageError, setUsageError] = useState('');
  const [webhooksError, setWebhooksError] = useState('');
  const [deliveriesError, setDeliveriesError] = useState('');
  const [benchmarksError, setBenchmarksError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');

  // Copy state
  const [copied, setCopied] = useState(false);

  // Check for session cookie on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/v1/partner/auth/session');
        const data = await response.json();

        if (data.authenticated && data.session) {
          setSessionData(data.session);
          setKeysData(data.keys);
          setAuthMethod('session');
          setIsAuthenticated(true);
          // Use the test key for API calls
          if (data.keys?.testApiKey) {
            setApiKey(data.keys.testApiKey);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const fetchWithAuth = useCallback(async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': 'Bearer ' + apiKey,
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

  const fetchBenchmarks = useCallback(async () => {
    setLoadingBenchmarks(true);
    setBenchmarksError('');
    try {
      const data = await fetchWithAuth('/benchmarks');
      setBenchmarkData(data);
    } catch (err) {
      setBenchmarksError(err instanceof Error ? err.message : 'Failed to fetch benchmarks');
    } finally {
      setLoadingBenchmarks(false);
    }
  }, [fetchWithAuth]);

  const fetchAnalytics = useCallback(async (period: string, granularity: string) => {
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const data = await fetchWithAuth(`/analytics/dashboard?period=${period}&granularity=${granularity}`);
      setAnalyticsData(data);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [fetchWithAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    try {
      // Validate API key by fetching partner info
      const response = await fetch(`${API_BASE}/info`, {
        headers: {
          'Authorization': 'Bearer ' + apiKeyInput,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Invalid API key');
      }

      setApiKey(apiKeyInput);
      setAuthMethod('api_key');
      setIsAuthenticated(true);
      setPartnerInfo(data.data);
      setLoadingInfo(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    // Clear session cookie if logged in via magic link
    if (authMethod === 'session') {
      try {
        await fetch('/api/v1/partner/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }

    setApiKey('');
    setApiKeyInput('');
    setAuthMethod('none');
    setIsAuthenticated(false);
    setPartnerInfo(null);
    setUsageStats(null);
    setWebhooks([]);
    setSessionData(null);
    setKeysData(null);
  };

  const copyTestKey = () => {
    if (keysData?.testApiKey) {
      navigator.clipboard.writeText(keysData.testApiKey);
      setCopiedTestKey(true);
      setTimeout(() => setCopiedTestKey(false), 2000);
    }
  };

  const copyLiveKey = () => {
    if (keysData?.liveApiKey) {
      navigator.clipboard.writeText(keysData.liveApiKey);
      setCopiedLiveKey(true);
      setTimeout(() => setCopiedLiveKey(false), 2000);
    }
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

  // Fetch benchmarks when tab is selected
  useEffect(() => {
    if (!isAuthenticated || !apiKey || activeTab !== 'benchmarks') return;
    if (!benchmarkData && !loadingBenchmarks) {
      fetchBenchmarks();
    }
  }, [isAuthenticated, apiKey, activeTab, benchmarkData, loadingBenchmarks, fetchBenchmarks]);

  // Fetch analytics when tab is selected or filters change
  useEffect(() => {
    if (!isAuthenticated || !apiKey || activeTab !== 'analytics') return;
    fetchAnalytics(analyticsPeriod, analyticsGranularity);
  }, [isAuthenticated, apiKey, activeTab, analyticsPeriod, analyticsGranularity, fetchAnalytics]);

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
      backgroundColor: 'var(--color-canvas, #FAF8F3)',
      fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)',
    } as React.CSSProperties,
    container: {
      maxWidth: '1100px',
      padding: '32px',
    } as React.CSSProperties,
    loginContainer: {
      maxWidth: '400px',
      margin: '80px auto',
      padding: '0 24px',
    } as React.CSSProperties,
    welcomeTitle: {
      fontSize: '28px',
      fontWeight: 500,
      color: '#1C1917',
      marginBottom: '8px',
      textAlign: 'center' as const,
      fontFamily: 'var(--font-fraunces, Fraunces, serif)',
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
      fontSize: '14px',
      border: '1px solid #E7E5E4',
      borderRadius: '4px',
      outline: 'none',
      boxSizing: 'border-box' as const,
      fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
      background: '#FFFFFF',
      color: '#1C1917',
    } as React.CSSProperties,
    button: {
      width: '100%',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 500,
      backgroundColor: '#1C1917',
      color: '#FAFAF9',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginTop: '16px',
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
      fontSize: '15px',
      fontWeight: 500,
      color: '#1C1917',
      marginBottom: '16px',
      fontFamily: 'var(--font-fraunces, Fraunces, serif)',
    } as React.CSSProperties,
    statNumber: {
      fontSize: '32px',
      fontWeight: 500,
      color: '#1C1917',
      lineHeight: 1,
      fontFamily: 'var(--font-fraunces, Fraunces, serif)',
    } as React.CSSProperties,
    statLabel: {
      fontSize: '14px',
      color: '#6B6560',
      marginTop: '4px',
    } as React.CSSProperties,
    codeBlock: {
      backgroundColor: '#1C1917',
      color: '#E7E5E4',
      borderRadius: '4px',
      padding: '16px',
      fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
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
      padding: '3px 8px',
      fontSize: '12px',
      borderRadius: '2px',
      marginRight: '4px',
      marginBottom: '4px',
    } as React.CSSProperties,
    tagActive: {
      backgroundColor: 'rgba(91,138,114,0.12)',
      color: '#3D6B54',
    } as React.CSSProperties,
    tagInactive: {
      backgroundColor: 'rgba(212,151,59,0.12)',
      color: '#92400E',
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
      color: '#1C1917',
      textDecoration: 'none',
      fontWeight: 500,
    } as React.CSSProperties,
    logoutButton: {
      padding: '8px 16px',
      fontSize: '13px',
      backgroundColor: 'transparent',
      color: '#78716C',
      border: '1px solid #E7E5E4',
      borderRadius: '4px',
      cursor: 'pointer',
    } as React.CSSProperties,
    statusBadge: (status: string) => {
      const colors: Record<string, { bg: string; text: string }> = {
        delivered: { bg: 'rgba(91,138,114,0.12)', text: '#3D6B54' },
        failed: { bg: 'rgba(184,107,100,0.12)', text: '#8B3D3D' },
        retrying: { bg: 'rgba(212,151,59,0.12)', text: '#92400E' },
        pending: { bg: '#F4F1ED', text: '#6B6560' },
      };
      const color = colors[status] || colors.pending;
      return {
        display: 'inline-block',
        padding: '3px 8px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '2px',
        backgroundColor: color.bg,
        color: color.text,
        textTransform: 'capitalize' as const,
      } as React.CSSProperties;
    },
    filterButton: (isActive: boolean) => ({
      padding: '6px 12px',
      fontSize: '13px',
      backgroundColor: isActive ? '#1C1917' : 'transparent',
      color: isActive ? '#FAFAF9' : '#78716C',
      border: isActive ? 'none' : '1px solid #E7E5E4',
      borderRadius: '4px',
      cursor: 'pointer',
    }) as React.CSSProperties,
    retryButton: {
      padding: '4px 10px',
      fontSize: '12px',
      backgroundColor: '#1C1917',
      color: '#FAFAF9',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    } as React.CSSProperties,
    retryButtonDisabled: {
      backgroundColor: '#9A938A',
      cursor: 'not-allowed',
    } as React.CSSProperties,
    benchmarkBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
    } as React.CSSProperties,
    benchmarkLabel: {
      width: '140px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#1F1D1A',
    } as React.CSSProperties,
    benchmarkBarContainer: {
      flex: 1,
      position: 'relative' as const,
      height: '32px',
      backgroundColor: '#F4F1ED',
      borderRadius: '4px',
      overflow: 'hidden',
    } as React.CSSProperties,
    benchmarkBarFill: (percentile: number) => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      height: '100%',
      width: `${percentile}%`,
      backgroundColor: percentile >= 75 ? '#5B8A72' : percentile >= 50 ? '#C4973B' : '#B56B6B',
      borderRadius: '4px',
      transition: 'width 0.5s ease',
    }) as React.CSSProperties,
    benchmarkVerticalLine: (position: number) => ({
      position: 'absolute' as const,
      top: 0,
      left: `${position}%`,
      height: '100%',
      width: '2px',
      backgroundColor: '#6B6560',
    }) as React.CSSProperties,
    benchmarkValue: {
      width: '80px',
      textAlign: 'right' as const,
      fontSize: '14px',
      fontWeight: 600,
      color: '#1F1D1A',
    } as React.CSSProperties,
    percentileBadge: (percentile: number) => ({
      display: 'inline-block',
      padding: '3px 10px',
      fontSize: '13px',
      fontWeight: 500,
      borderRadius: '2px',
      backgroundColor: percentile >= 75 ? 'rgba(91,138,114,0.12)' : percentile >= 50 ? 'rgba(212,151,59,0.12)' : 'rgba(184,107,100,0.12)',
      color: percentile >= 75 ? '#3D6B54' : percentile >= 50 ? '#92400E' : '#8B3D3D',
    }) as React.CSSProperties,
    trendBadge: (trend: string) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      fontSize: '12px',
      fontWeight: 500,
      borderRadius: '2px',
      backgroundColor: trend === 'improving' ? 'rgba(91,138,114,0.12)' : trend === 'declining' ? 'rgba(184,107,100,0.12)' : '#F4F1ED',
      color: trend === 'improving' ? '#3D6B54' : trend === 'declining' ? '#8B3D3D' : '#78716C',
    }) as React.CSSProperties,
    insightCard: {
      padding: '12px 16px',
      backgroundColor: '#F4F1ED',
      borderRadius: '0',
      borderLeft: '3px solid #FBBF24',
      marginBottom: '8px',
      fontSize: '14px',
      color: '#1C1917',
      lineHeight: 1.6,
    } as React.CSSProperties,
  };

  // Loading session check
  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-canvas, #FAF8F3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#78716C', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-canvas, #FAF8F3)', fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)' }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div style={{ borderBottom: '1px solid #E7E5E4', background: '#FAFAF9', padding: '16px 24px' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '18px', fontWeight: 500, color: '#1C1917' }}>
              Paceful
            </span>
            <span style={{ fontSize: '12px', color: '#78716C', marginLeft: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Partners
            </span>
          </a>
        </div>
        <div style={styles.loginContainer}>
          <Card>
            <h1 style={styles.welcomeTitle}>Partner Dashboard</h1>
            <p style={styles.welcomeSubtitle}>Enter your API key to access your dashboard</p>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="pk_test_... or pk_live_..."
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
            <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E7E5E4' }}>
              <p style={{ fontSize: '14px', color: '#78716C', marginBottom: '8px' }}>
                Or log in with email
              </p>
              <a
                href="/partners/login"
                style={{ color: '#1C1917', fontWeight: 500, textDecoration: 'underline', fontSize: '14px' }}
              >
                Use magic link instead
              </a>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const tabLabel: Record<DashboardTab, string> = {
    overview: 'Overview',
    webhooks: 'Webhooks',
    benchmarks: 'Benchmarks',
    analytics: 'Analytics',
    keys: 'API Keys',
  };

  // Dashboard
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Sidebar */}
      <nav style={{
        width: '200px',
        flexShrink: 0,
        background: 'var(--color-inverted, #1C1917)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(250,250,249,0.08)' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'block' }}>
            <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '18px', fontWeight: 500, color: '#FAFAF9' }}>
              Paceful
            </span>
          </a>
          <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(250,250,249,0.35)', marginTop: '3px' }}>
            Partners
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, paddingTop: '8px' }}>
          {(
            [
              { key: 'overview' as DashboardTab, label: 'Overview' },
              { key: 'webhooks' as DashboardTab, label: 'Webhooks' },
              { key: 'benchmarks' as DashboardTab, label: 'Benchmarks' },
              { key: 'analytics' as DashboardTab, label: 'Analytics' },
              ...(authMethod === 'session' && keysData ? [{ key: 'keys' as DashboardTab, label: 'API Keys' }] : []),
            ]
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: activeTab === item.key ? 500 : 400,
                background: activeTab === item.key ? 'rgba(250,250,249,0.07)' : 'transparent',
                color: activeTab === item.key ? '#FAFAF9' : 'rgba(250,250,249,0.5)',
                border: 'none',
                borderLeft: `3px solid ${activeTab === item.key ? '#FBBF24' : 'transparent'}`,
                cursor: 'pointer',
                textAlign: 'left' as const,
                fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(250,250,249,0.08)' }}>
          <a href="/partners/docs" style={{ display: 'block', fontSize: '13px', color: 'rgba(250,250,249,0.4)', textDecoration: 'none', marginBottom: '14px' }}>
            API Reference →
          </a>
          {authMethod === 'session' && sessionData && (
            <div style={{ fontSize: '12px', color: 'rgba(250,250,249,0.3)', marginBottom: '12px', wordBreak: 'break-all' as const }}>
              {sessionData.email}
            </div>
          )}
          <button onClick={handleLogout} style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(250,250,249,0.4)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)',
          }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, background: 'var(--color-canvas, #FAF8F3)', overflow: 'auto' }}>
        {/* Top bar */}
        <div style={{
          padding: '18px 32px',
          borderBottom: '1px solid #E7E5E4',
          background: '#FAFAF9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-fraunces, Fraunces, serif)',
              fontSize: '20px',
              fontWeight: 500,
              color: '#1C1917',
              margin: 0,
            }}>
              {tabLabel[activeTab]}
            </h1>
            {(partnerInfo || sessionData) && (
              <div style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>
                {partnerInfo?.partnerName || sessionData?.companyName}
              </div>
            )}
          </div>
        </div>

      <div style={styles.container}>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
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
                    <code style={{ fontSize: '14px', color: '#1F1D1A', fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)' }}>
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
                      borderRadius: '4px',
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
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Event</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Response</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Attempts</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Time</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} style={{ borderBottom: '1px solid #F4F1ED' }}>
                        <td style={{ padding: '16px', color: '#1C1917' }}>
                          <code style={{ fontSize: '13px' }}>{delivery.eventType}</code>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={styles.statusBadge(delivery.status)}>{delivery.status}</span>
                        </td>
                        <td style={{ padding: '12px', color: '#6B6560' }}>
                          {delivery.httpStatusCode ? (
                            <span style={{ fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)' }}>
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
                <code style={{ fontSize: '14px', color: '#1F1D1A', fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)' }}>{partnerInfo?.apiKey}</code>
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
          </>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <>
            <div style={styles.sectionTitle}>Registered Webhooks</div>
            <div style={{ marginBottom: '24px' }}>
              <Card>
                {loadingWebhooks ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[...Array(2)].map((_, i) => (
                      <div key={i}>
                        <Skeleton width="300px" height="16px" />
                        <Skeleton width="200px" height="14px" />
                      </div>
                    ))}
                  </div>
                ) : webhooksError ? (
                  <div style={{ color: '#B56B6B', fontSize: '14px' }}>{webhooksError}</div>
                ) : webhooks.length === 0 ? (
                  <p style={{ color: '#6B6560', fontSize: '14px' }}>
                    No webhooks registered.{' '}
                    <a href="/partners/docs#webhooks" style={styles.link}>
                      Learn how to set up webhooks
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
                          borderRadius: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <code style={{ fontSize: '14px', color: '#1F1D1A', wordBreak: 'break-all' }}>
                            {webhook.url}
                          </code>
                          <span style={styles.statusBadge(webhook.isActive ? 'delivered' : 'failed')}>
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {webhook.events.map((event) => (
                            <span
                              key={event}
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
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

            <div style={styles.sectionTitle}>Recent Deliveries</div>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6B6560' }}>Filter by status:</div>
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
                          <td style={{ padding: '16px', color: '#1C1917' }}>
                            <code style={{ fontSize: '13px' }}>{delivery.eventType}</code>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={styles.statusBadge(delivery.status)}>{delivery.status}</span>
                          </td>
                          <td style={{ padding: '12px', color: '#6B6560' }}>
                            {delivery.httpStatusCode ? (
                              <span style={{ fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)' }}>
                                HTTP {delivery.httpStatusCode}
                                {delivery.durationMs && ` (${delivery.durationMs}ms)`}
                              </span>
                            ) : (
                              <span style={{ color: '#9A938A' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#6B6560' }}>
                            {delivery.attemptCount}/{delivery.maxAttempts}
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
          </>
        )}

        {/* Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <>
            <div style={styles.sectionTitle}>Industry Benchmarks</div>
            {loadingBenchmarks ? (
              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Skeleton width="200px" height="32px" />
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Skeleton width="140px" height="20px" />
                      <Skeleton width="100%" height="32px" />
                      <Skeleton width="80px" height="20px" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : benchmarksError ? (
              <Card>
                <div style={{ color: '#B56B6B', fontSize: '14px' }}>{benchmarksError}</div>
                {benchmarksError.includes('No vertical') && (
                  <p style={{ fontSize: '14px', color: '#6B6560', marginTop: '12px' }}>
                    Contact <a href="mailto:partners@paceful.com" style={styles.link}>partners@paceful.com</a> to configure your industry vertical.
                  </p>
                )}
              </Card>
            ) : benchmarkData ? (
              <>
                {/* Summary Card */}
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#9A938A', marginBottom: '4px' }}>Your Vertical</div>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#1F1D1A', textTransform: 'capitalize' }}>
                        {benchmarkData.vertical?.replace(/_/g, ' ') || 'N/A'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B6560', marginTop: '4px' }}>
                        Based on {benchmarkData.verticalSampleSize?.toLocaleString() || 0} assessments ({benchmarkData.period})
                      </div>
                    </div>
                    {benchmarkData.summary.overallPercentile !== null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', color: '#9A938A', marginBottom: '4px' }}>Overall Ranking</div>
                        <div style={styles.percentileBadge(benchmarkData.summary.overallPercentile)}>
                          {benchmarkData.summary.overallPercentile}th percentile
                        </div>
                        {benchmarkData.summary.overallTrend && (
                          <div style={{ marginTop: '8px' }}>
                            <span style={styles.trendBadge(benchmarkData.summary.overallTrend)}>
                              {benchmarkData.summary.overallTrend === 'improving' && '↑ '}
                              {benchmarkData.summary.overallTrend === 'declining' && '↓ '}
                              {benchmarkData.summary.overallTrend === 'stable' && '→ '}
                              {benchmarkData.summary.overallTrend.charAt(0).toUpperCase() + benchmarkData.summary.overallTrend.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Overall ERS Comparison */}
                  {benchmarkData.summary.overallErsVerticalAvg !== null && (
                    <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9F6F2', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', color: '#6B6560', marginBottom: '4px' }}>Vertical Average Score</div>
                          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1F1D1A' }}>
                            {benchmarkData.summary.overallErsVerticalAvg}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', color: '#6B6560', marginBottom: '4px' }}>Your Users Average</div>
                          <div style={{ fontSize: '28px', fontWeight: 700, color: benchmarkData.summary.overallErsPartnerAvg !== null && benchmarkData.summary.overallErsPartnerAvg >= benchmarkData.summary.overallErsVerticalAvg ? '#5B8A72' : '#B56B6B' }}>
                            {benchmarkData.summary.overallErsPartnerAvg !== null ? benchmarkData.summary.overallErsPartnerAvg : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dimension Benchmarks */}
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F1D1A', marginBottom: '16px' }}>
                    Dimension Comparison
                  </div>
                  {benchmarkData.dimensions
                    .filter(d => d.dimension !== 'overall_ers')
                    .map((dim) => (
                      <div key={dim.dimension} style={styles.benchmarkBar}>
                        <div style={styles.benchmarkLabel}>{dim.displayName}</div>
                        <div style={styles.benchmarkBarContainer}>
                          {/* Partner's position */}
                          {dim.percentileRank !== null && (
                            <div style={styles.benchmarkBarFill(dim.percentileRank)} />
                          )}
                          {/* Vertical average marker */}
                          <div style={{
                            ...styles.benchmarkVerticalLine(50),
                            backgroundColor: '#9A938A',
                            width: '1px',
                          }} />
                        </div>
                        <div style={styles.benchmarkValue}>
                          {dim.percentileRank !== null ? (
                            <span style={{ color: dim.percentileRank >= 50 ? '#5B8A72' : '#B56B6B' }}>
                              {dim.percentileRank}%
                            </span>
                          ) : (
                            <span style={{ color: '#9A938A' }}>—</span>
                          )}
                        </div>
                        {dim.trend && (
                          <span style={styles.trendBadge(dim.trend)}>
                            {dim.trend === 'improving' && '↑'}
                            {dim.trend === 'declining' && '↓'}
                            {dim.trend === 'stable' && '→'}
                          </span>
                        )}
                      </div>
                    ))}
                  <div style={{ fontSize: '12px', color: '#9A938A', marginTop: '8px' }}>
                    Bar shows your percentile rank within the vertical. 50% line represents the median.
                  </div>
                </Card>

                {/* Insights */}
                {benchmarkData.insights && benchmarkData.insights.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <div style={styles.sectionTitle}>Insights</div>
                    <Card>
                      {benchmarkData.insights.map((insight, i) => (
                        <div key={i} style={styles.insightCard}>
                          {insight}
                        </div>
                      ))}
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <p style={{ color: '#6B6560', fontSize: '14px' }}>
                  No benchmark data available yet. Benchmarks are generated weekly when there are at least 50 assessments in your vertical.
                </p>
              </Card>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <>
            {/* Period and Granularity Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={styles.sectionTitle}>Analytics Dashboard</div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#6B6560' }}>Period:</span>
                  {(['7d', '30d', '90d'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setAnalyticsPeriod(p)}
                      style={styles.filterButton(analyticsPeriod === p)}
                    >
                      {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#6B6560' }}>View:</span>
                  {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setAnalyticsGranularity(g)}
                      style={styles.filterButton(analyticsGranularity === g)}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loadingAnalytics ? (
              <div style={styles.grid}>
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton width="150px" height="24px" />
                    <Skeleton width="100%" height="200px" className="mt-4" />
                  </Card>
                ))}
              </div>
            ) : analyticsError ? (
              <Card>
                <div style={{ color: '#B56B6B', fontSize: '14px' }}>{analyticsError}</div>
              </Card>
            ) : analyticsData ? (
              <>
                {/* Summary Stats */}
                <div style={styles.grid}>
                  <Card>
                    <div style={styles.statLabel}>Total Assessments</div>
                    <div style={styles.statNumber}>{analyticsData.summary.totalAssessments.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#9A938A', marginTop: '4px' }}>
                      {new Date(analyticsData.summary.periodStart).toLocaleDateString()} - {new Date(analyticsData.summary.periodEnd).toLocaleDateString()}
                    </div>
                  </Card>
                  <Card>
                    <div style={styles.statLabel}>Average Score</div>
                    <div style={styles.statNumber}>
                      {analyticsData.summary.averageErs !== null ? analyticsData.summary.averageErs : '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9A938A', marginTop: '4px' }}>
                      Emotional Readiness Score
                    </div>
                  </Card>
                </div>

                {/* Assessment Volume Chart */}
                <div style={{ marginBottom: '24px' }}>
                  <Card>
                    <div style={styles.cardTitle}>Assessment Volume</div>
                    {analyticsData.assessmentVolume.length > 0 ? (
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={analyticsData.assessmentVolume}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D9" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12, fill: '#6B6560' }}
                              tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 12, fill: '#6B6560' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E0D9',
                                borderRadius: '4px',
                                fontSize: '13px',
                              }}
                              labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#1C1917"
                              strokeWidth={2}
                              dot={{ fill: '#1C1917', strokeWidth: 0, r: 3 }}
                              activeDot={{ fill: '#1C1917', strokeWidth: 0, r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p style={{ color: '#6B6560', fontSize: '14px' }}>No assessment data available for this period.</p>
                    )}
                  </Card>
                </div>

                {/* ERS Distribution & Stage Funnel */}
                <div style={styles.grid}>
                  {/* ERS Distribution Histogram */}
                  <Card>
                    <div style={styles.cardTitle}>Score Distribution</div>
                    {analyticsData.ersDistribution.some(b => b.count > 0) ? (
                      <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                          <BarChart data={analyticsData.ersDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D9" />
                            <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#6B6560' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#6B6560' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E0D9',
                                borderRadius: '4px',
                                fontSize: '13px',
                              }}
                              formatter={(value, name) => [
                                name === 'count' ? `${value} assessments` : `${value}%`,
                                name === 'count' ? 'Count' : 'Percentage'
                              ]}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {analyticsData.ersDistribution.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    index <= 1 ? '#B56B6B' :
                                    index === 2 ? '#C4973B' :
                                    '#5B8A72'
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p style={{ color: '#6B6560', fontSize: '14px' }}>No distribution data available.</p>
                    )}
                  </Card>

                  {/* Stage Funnel */}
                  <Card>
                    <div style={styles.cardTitle}>Readiness Stage Distribution</div>
                    {analyticsData.stageFunnel.stages.some(s => s.count > 0) ? (
                      <>
                        <div style={{ width: '100%', height: 200 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={analyticsData.stageFunnel.stages}
                                dataKey="count"
                                nameKey="stage"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                              >
                                {analyticsData.stageFunnel.stages.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      entry.stage === 'Healing' ? '#B56B6B' :
                                      entry.stage === 'Rebuilding' ? '#C4973B' :
                                      '#5B8A72'
                                    }
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E5E0D9',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                }}
                                formatter={(value, name) => [`${value} (${analyticsData.stageFunnel.stages.find(s => s.stage === name)?.percentage || 0}%)`, name]}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', padding: '12px', backgroundColor: '#F9F6F2', borderRadius: '4px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6B6560' }}>Healing → Rebuilding</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1F1D1A' }}>
                              {analyticsData.stageFunnel.conversionRates.healingToRebuilding}%
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6B6560' }}>Rebuilding → Ready</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1F1D1A' }}>
                              {analyticsData.stageFunnel.conversionRates.rebuildingToReady}%
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p style={{ color: '#6B6560', fontSize: '14px' }}>No stage data available.</p>
                    )}
                  </Card>
                </div>

                {/* Dimension Heatmap */}
                <div style={{ marginBottom: '24px' }}>
                  <Card>
                    <div style={styles.cardTitle}>Dimension Analysis</div>
                    {analyticsData.dimensionHeatmap.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {analyticsData.dimensionHeatmap.map((dim) => (
                          <div key={dim.dimension} style={{
                            padding: '16px',
                            backgroundColor: '#F9F6F2',
                            borderRadius: '4px',
                            borderLeft: `4px solid ${dim.average >= 70 ? '#5B8A72' : dim.average >= 40 ? '#C4973B' : '#B56B6B'}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F1D1A' }}>{dim.dimension}</div>
                              <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '11px', color: '#9A938A' }}>Average</div>
                                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1F1D1A' }}>{dim.average}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '11px', color: '#9A938A' }}>Median</div>
                                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#6B6560' }}>{dim.median}</div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${dim.distribution.low}%`, backgroundColor: '#B56B6B', transition: 'width 0.3s' }} title={`Low: ${dim.distribution.low}%`} />
                              <div style={{ width: `${dim.distribution.medium}%`, backgroundColor: '#C4973B', transition: 'width 0.3s' }} title={`Medium: ${dim.distribution.medium}%`} />
                              <div style={{ width: `${dim.distribution.high}%`, backgroundColor: '#5B8A72', transition: 'width 0.3s' }} title={`High: ${dim.distribution.high}%`} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#9A938A' }}>
                              <span>Low ({dim.distribution.low}%)</span>
                              <span>Medium ({dim.distribution.medium}%)</span>
                              <span>High ({dim.distribution.high}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#6B6560', fontSize: '14px' }}>No dimension data available.</p>
                    )}
                  </Card>
                </div>

                {/* Benchmark Comparison */}
                {analyticsData.benchmarkComparison && (
                  <div style={{ marginBottom: '24px' }}>
                    <Card>
                      <div style={styles.cardTitle}>
                        Your Performance vs {analyticsData.benchmarkComparison.vertical?.replace(/_/g, ' ')} Vertical
                      </div>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart
                            data={analyticsData.benchmarkComparison.dimensions.filter(d => d.verticalAvg !== null)}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D9" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#6B6560' }} />
                            <YAxis
                              type="category"
                              dataKey="dimension"
                              width={150}
                              tick={{ fontSize: 12, fill: '#6B6560' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E0D9',
                                borderRadius: '4px',
                                fontSize: '13px',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="verticalAvg" name="Vertical Avg" fill="#E7E5E4" radius={[0, 2, 2, 0]} />
                            <Bar dataKey="partnerAvg" name="Your Avg" fill="#1C1917" radius={[0, 2, 2, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {analyticsData.benchmarkComparison.overall.percentile !== null && (
                        <div style={{
                          marginTop: '16px',
                          padding: '12px 16px',
                          backgroundColor: '#F9F6F2',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <span style={{ fontSize: '14px', color: '#6B6560' }}>Overall Score: </span>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#1F1D1A' }}>
                              {analyticsData.benchmarkComparison.overall.partnerAvg ?? '—'}
                            </span>
                            <span style={{ fontSize: '14px', color: '#6B6560' }}> vs vertical avg of </span>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#1F1D1A' }}>
                              {analyticsData.benchmarkComparison.overall.verticalAvg ?? '—'}
                            </span>
                          </div>
                          <span style={styles.percentileBadge(analyticsData.benchmarkComparison.overall.percentile)}>
                            {analyticsData.benchmarkComparison.overall.percentile}th percentile
                          </span>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* Top Signals */}
                <div style={{ marginBottom: '24px' }}>
                  <Card>
                    <div style={styles.cardTitle}>Top Signals</div>
                    {analyticsData.topSignals.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Signal</th>
                              <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Dimension</th>
                              <th style={{ textAlign: 'left', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Sentiment</th>
                              <th style={{ textAlign: 'right', padding: '10px 16px', color: '#78716C', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F4F1ED' }}>Frequency</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsData.topSignals.map((signal, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #F4F1ED' }}>
                                <td style={{ padding: '16px', color: '#1C1917', fontWeight: 500 }}>
                                  {signal.signal}
                                </td>
                                <td style={{ padding: '12px', color: '#6B6560' }}>
                                  {signal.dimension}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    borderRadius: '4px',
                                    backgroundColor: signal.sentiment === 'positive' ? 'rgba(91,138,114,0.12)' : signal.sentiment === 'negative' ? 'rgba(184,107,100,0.12)' : '#F4F1ED',
                                    color: signal.sentiment === 'positive' ? '#3D6B54' : signal.sentiment === 'negative' ? '#8B3D3D' : '#78716C',
                                    textTransform: 'capitalize',
                                  }}>
                                    {signal.sentiment}
                                  </span>
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#1F1D1A', fontWeight: 600 }}>
                                  {signal.frequency}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: '#6B6560', fontSize: '14px' }}>No signal data available.</p>
                    )}
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <p style={{ color: '#6B6560', fontSize: '14px' }}>
                  No analytics data available. Start collecting assessments to see your dashboard.
                </p>
              </Card>
            )}
          </>
        )}

        {/* Keys Tab */}
        {activeTab === 'keys' && keysData && (
          <>
            <div style={styles.sectionTitle}>Your API Keys</div>

            {/* Verification Status */}
            {!keysData.emailVerified && !keysData.isPersonalEmail && (
              <div style={{
                backgroundColor: 'rgba(251,191,36,0.08)',
                borderRadius: '4px',
                padding: '16px',
                marginBottom: '24px',
                borderLeft: '3px solid #D4973B',
              }}>
                <p style={{ margin: 0, color: '#92400E', fontWeight: 600 }}>
                  Verify your email to activate your live key
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92400E' }}>
                  Check your inbox for the verification email, or contact partners@paceful.com if you need help.
                </p>
              </div>
            )}

            {keysData.isPersonalEmail && (
              <div style={{
                backgroundColor: '#FEF9E7',
                borderRadius: '4px',
                padding: '16px',
                marginBottom: '24px',
                borderLeft: '3px solid #D4973B',
              }}>
                <p style={{ margin: 0, color: '#92400E', fontWeight: 600 }}>
                  Personal email detected
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92400E' }}>
                  To get production access, please sign up again with your company email address.
                </p>
              </div>
            )}

            <div style={styles.grid}>
              {/* Test Key Card */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={styles.cardTitle}>Test API Key</div>
                    <p style={{ fontSize: '14px', color: '#6B6560', margin: 0 }}>
                      Use for development and testing
                    </p>
                  </div>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '2px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: 'rgba(91,138,114,0.12)',
                    color: '#3D6B54',
                  }}>
                    Active
                  </span>
                </div>
                <div style={{
                  backgroundColor: '#F9F6F2',
                  borderRadius: '4px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <code style={{
                    fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
                    fontSize: '14px',
                    color: '#1F1D1A',
                    wordBreak: 'break-all',
                    flex: 1,
                  }}>
                    {keysData.testApiKey}
                  </code>
                  <button
                    onClick={copyTestKey}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 500,
                      backgroundColor: '#1C1917',
                      color: '#FAFAF9',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedTestKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </Card>

              {/* Live Key Card */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={styles.cardTitle}>Live API Key</div>
                    <p style={{ fontSize: '14px', color: '#6B6560', margin: 0 }}>
                      Use for production
                    </p>
                  </div>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '2px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: keysData.liveKeyActive ? 'rgba(91,138,114,0.12)' : 'rgba(212,151,59,0.12)',
                    color: keysData.liveKeyActive ? '#3D6B54' : '#92400E',
                  }}>
                    {keysData.liveKeyActive ? 'Active' : keysData.isPersonalEmail ? 'Requires Business Email' : 'Pending Verification'}
                  </span>
                </div>
                {keysData.liveApiKey ? (
                  <div style={{
                    backgroundColor: '#F9F6F2',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    opacity: keysData.liveKeyActive ? 1 : 0.6,
                  }}>
                    <code style={{
                      fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
                      fontSize: '14px',
                      color: '#1F1D1A',
                      wordBreak: 'break-all',
                      flex: 1,
                    }}>
                      {keysData.liveApiKey}
                    </code>
                    <button
                      onClick={copyLiveKey}
                      disabled={!keysData.liveKeyActive}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        backgroundColor: keysData.liveKeyActive ? '#1C1917' : '#9A938A',
                        color: '#FAFAF9',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: keysData.liveKeyActive ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedLiveKey ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#F9F6F2',
                    borderRadius: '4px',
                    padding: '16px',
                    textAlign: 'center',
                    color: '#6B6560',
                    fontSize: '14px',
                  }}>
                    No live key available
                  </div>
                )}
              </Card>
            </div>

            {/* Key Usage Info */}
            <div style={{ marginTop: '24px' }}>
              <Card>
                <div style={styles.cardTitle}>Using Your Keys</div>
                <div style={{
                  backgroundColor: '#1F1D1A',
                  borderRadius: '4px',
                  padding: '16px',
                  fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#E5E0D9',
                  overflow: 'auto',
                }}>
                  <pre style={{ margin: 0 }}>
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://paceful.com'}/api/v1/partner/ers/calculate \\
  -H "Authorization: Bearer ${keysData.testApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "user-123", "text": "Your text here"}'`}
                  </pre>
                </div>
                <p style={{ fontSize: '14px', color: '#6B6560', marginTop: '12px', marginBottom: 0 }}>
                  Test keys work with all API endpoints and return sandbox data.
                  {keysData.liveKeyActive && ' Live keys return production data and are rate-limited.'}
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
