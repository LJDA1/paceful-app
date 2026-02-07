'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client outside component
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

type TimePeriod = '24h' | '7d' | '30d' | 'custom';

interface ApiUsageLog {
  id: string;
  client_id: string;
  endpoint: string;
  request_method: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  requested_at: string | null;
}

interface ApiClient {
  id: string;
  client_name: string;
}

interface ApiUsageWithClient extends ApiUsageLog {
  client_name: string;
}

interface CallsByPeriod {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface EndpointStats {
  endpoint: string;
  count: number;
  percentage: number;
}

interface ClientStats {
  client_name: string;
  count: number;
  percentage: number;
  color: string;
}

interface ErrorStats {
  total4xx: number;
  total5xx: number;
  rate4xx: number;
  rate5xx: number;
  totalErrors: number;
  errorRate: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTimePeriodStart(period: TimePeriod, customStart?: Date): Date {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'custom':
      return customStart || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function formatTimestamp(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getStatusColor(status: number | null): string {
  if (!status) return 'bg-gray-100 text-gray-700';
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700';
  if (status >= 400 && status < 500) return 'bg-amber-100 text-amber-700';
  if (status >= 500) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

function getEndpointLabel(endpoint: string): string {
  if (endpoint.includes('aggregate')) return 'Aggregate';
  if (endpoint.includes('individual') || endpoint.includes('user')) return 'Individual';
  if (endpoint.includes('health')) return 'Health';
  if (endpoint.includes('predictions')) return 'Predictions';
  return endpoint.split('/').pop() || endpoint;
}

const CLIENT_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
];

// ============================================================================
// COMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'indigo',
  loading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'indigo' | 'green' | 'amber' | 'blue' | 'red';
  loading?: boolean;
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, title }: { data: EndpointStats[]; title: string }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.endpoint} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.endpoint}</span>
              <span className="text-gray-500">
                {item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChart({ data, title }: { data: ClientStats[]; title: string }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          No client data available
        </div>
      </div>
    );
  }

  // Calculate angles for conic gradient
  let gradientParts: string[] = [];
  let currentAngle = 0;

  data.forEach((item, index) => {
    const angle = (item.count / total) * 360;
    const endAngle = currentAngle + angle;
    gradientParts.push(`${item.color} ${currentAngle}deg ${endAngle}deg`);
    currentAngle = endAngle;
  });

  const gradient = `conic-gradient(${gradientParts.join(', ')})`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="flex items-center gap-8">
        {/* Pie Chart */}
        <div
          className="w-40 h-40 rounded-full shadow-inner flex-shrink-0"
          style={{ background: gradient }}
        />

        {/* Legend */}
        <div className="space-y-2 flex-1 min-w-0">
          {data.slice(0, 6).map((item) => (
            <div key={item.client_name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.client_name}</p>
                <p className="text-sm text-gray-500">
                  {item.percentage.toFixed(0)}% ({item.count.toLocaleString()})
                </p>
              </div>
            </div>
          ))}
          {data.length > 6 && (
            <p className="text-sm text-gray-400 pl-6">+{data.length - 6} more clients</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TimePeriodSelector({
  period,
  onChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: {
  period: TimePeriod;
  onChange: (period: TimePeriod) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminUsagePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Time period state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0]);

  // Data state
  const [usageLogs, setUsageLogs] = useState<ApiUsageWithClient[]>([]);
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [callsByPeriod, setCallsByPeriod] = useState<CallsByPeriod>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  // Computed stats
  const endpointStats = useMemo<EndpointStats[]>(() => {
    const counts = new Map<string, number>();
    usageLogs.forEach((log) => {
      const label = getEndpointLabel(log.endpoint);
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const total = usageLogs.length || 1;
    return Array.from(counts.entries())
      .map(([endpoint, count]) => ({
        endpoint,
        count,
        percentage: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [usageLogs]);

  const clientStats = useMemo<ClientStats[]>(() => {
    const counts = new Map<string, number>();
    usageLogs.forEach((log) => {
      const name = log.client_name || 'Unknown';
      counts.set(name, (counts.get(name) || 0) + 1);
    });

    const total = usageLogs.length || 1;
    return Array.from(counts.entries())
      .map(([client_name, count], index) => ({
        client_name,
        count,
        percentage: (count / total) * 100,
        color: CLIENT_COLORS[index % CLIENT_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [usageLogs]);

  const avgResponseTime = useMemo(() => {
    const times = usageLogs
      .map((log) => log.response_time_ms)
      .filter((t): t is number => t !== null && t !== undefined);
    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }, [usageLogs]);

  const errorStats = useMemo<ErrorStats>(() => {
    const total = usageLogs.length || 1;
    const errors4xx = usageLogs.filter(
      (log) => log.status_code && log.status_code >= 400 && log.status_code < 500
    ).length;
    const errors5xx = usageLogs.filter(
      (log) => log.status_code && log.status_code >= 500
    ).length;

    return {
      total4xx: errors4xx,
      total5xx: errors5xx,
      rate4xx: (errors4xx / total) * 100,
      rate5xx: (errors5xx / total) * 100,
      totalErrors: errors4xx + errors5xx,
      errorRate: ((errors4xx + errors5xx) / total) * 100,
    };
  }, [usageLogs]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchData = useCallback(async () => {
    try {
      // Fetch all API clients first
      const { data: clientsData } = await supabase
        .from('api_clients')
        .select('id, client_name');

      const clientMap = new Map<string, string>();
      (clientsData || []).forEach((c: ApiClient) => {
        clientMap.set(c.id, c.client_name);
      });
      setClients(clientMap);

      // Calculate date ranges
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch counts for periods
      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase
          .from('api_usage_log')
          .select('*', { count: 'exact', head: true })
          .gte('requested_at', todayStart),
        supabase
          .from('api_usage_log')
          .select('*', { count: 'exact', head: true })
          .gte('requested_at', weekStart),
        supabase
          .from('api_usage_log')
          .select('*', { count: 'exact', head: true })
          .gte('requested_at', monthStart),
      ]);

      setCallsByPeriod({
        today: todayRes.count || 0,
        thisWeek: weekRes.count || 0,
        thisMonth: monthRes.count || 0,
      });

      // Fetch usage logs for selected period
      let periodStart: Date;
      let periodEnd: Date = new Date();

      if (timePeriod === 'custom') {
        periodStart = new Date(customStart);
        periodEnd = new Date(customEnd);
        periodEnd.setHours(23, 59, 59, 999);
      } else {
        periodStart = getTimePeriodStart(timePeriod);
      }

      const { data: logs } = await supabase
        .from('api_usage_log')
        .select('*')
        .gte('requested_at', periodStart.toISOString())
        .lte('requested_at', periodEnd.toISOString())
        .order('requested_at', { ascending: false })
        .limit(1000);

      const logsWithClients: ApiUsageWithClient[] = (logs || []).map((log: ApiUsageLog) => ({
        ...log,
        client_name: clientMap.get(log.client_id) || 'Unknown Client',
      }));

      setUsageLogs(logsWithClients);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  }, [timePeriod, customStart, customEnd]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ============================================================================
  // EXPORT TO CSV
  // ============================================================================

  const exportToCSV = async () => {
    setExportStatus('Generating CSV...');
    try {
      if (usageLogs.length === 0) {
        setExportStatus('No data to export');
        setTimeout(() => setExportStatus(null), 2000);
        return;
      }

      // CSV headers
      const headers = [
        'Timestamp',
        'Client',
        'Endpoint',
        'Method',
        'Status Code',
        'Response Time (ms)',
        'IP Address',
        'User Agent',
      ].join(',');

      // CSV rows
      const rows = usageLogs.map((log) =>
        [
          log.requested_at || '',
          `"${log.client_name.replace(/"/g, '""')}"`,
          log.endpoint,
          log.request_method || '',
          log.status_code || '',
          log.response_time_ms || '',
          log.ip_address || '',
          `"${(log.user_agent || '').replace(/"/g, '""')}"`,
        ].join(',')
      );

      const csv = [headers, ...rows].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-usage-${timePeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setExportStatus('CSV downloaded!');
    } catch (error) {
      setExportStatus('Export failed');
      console.error(error);
    } finally {
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Usage Analytics</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Time Period Selector */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <TimePeriodSelector
            period={timePeriod}
            onChange={setTimePeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </section>

        {/* SECTION 1: Total API Calls Metrics */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Total API Calls</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Today"
              value={callsByPeriod.today.toLocaleString()}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
              color="indigo"
              loading={loading}
            />
            <MetricCard
              title="This Week"
              value={callsByPeriod.thisWeek.toLocaleString()}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              }
              color="blue"
              loading={loading}
            />
            <MetricCard
              title="This Month"
              value={callsByPeriod.thisMonth.toLocaleString()}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              }
              color="green"
              loading={loading}
            />
            <MetricCard
              title="Avg Response Time"
              value={formatDuration(avgResponseTime)}
              subtitle="for selected period"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              }
              color="amber"
              loading={loading}
            />
          </div>
        </section>

        {/* Error Rate Metrics */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Rates (Selected Period)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="4xx Errors"
              value={`${errorStats.rate4xx.toFixed(1)}%`}
              subtitle={`${errorStats.total4xx} total client errors`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              }
              color="amber"
              loading={loading}
            />
            <MetricCard
              title="5xx Errors"
              value={`${errorStats.rate5xx.toFixed(1)}%`}
              subtitle={`${errorStats.total5xx} total server errors`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              }
              color="red"
              loading={loading}
            />
            <MetricCard
              title="Success Rate"
              value={`${(100 - errorStats.errorRate).toFixed(1)}%`}
              subtitle={`${usageLogs.length - errorStats.totalErrors} successful calls`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
              color="green"
              loading={loading}
            />
          </div>
        </section>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* SECTION 2: Calls by Endpoint */}
          <BarChart data={endpointStats} title="Calls by Endpoint" />

          {/* SECTION 3: Calls by Client */}
          <PieChart data={clientStats} title="Calls by Client" />
        </div>

        {/* SECTION 4: Recent API Calls Table */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent API Calls</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                Showing {Math.min(usageLogs.length, 50)} of {usageLogs.length}
              </span>
              {/* SECTION 5: Export to CSV Button */}
              <button
                onClick={exportToCSV}
                disabled={!!exportStatus || usageLogs.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 font-medium rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                {exportStatus ? (
                  <LoadingSpinner />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                )}
                {exportStatus || 'Export CSV'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : usageLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Timestamp</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Client</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Endpoint</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Response Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usageLogs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                        {formatTimestamp(log.requested_at)}
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-900 max-w-[150px] truncate">
                        {log.client_name}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1">
                          {log.request_method && (
                            <span className="text-xs text-gray-400">{log.request_method}</span>
                          )}
                          <span className="text-gray-700">{log.endpoint}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                            log.status_code
                          )}`}
                        >
                          {log.status_code || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-600 whitespace-nowrap">
                        {formatDuration(log.response_time_ms)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                />
              </svg>
              <p className="font-medium text-gray-500">No API calls recorded</p>
              <p className="text-sm mt-1">API usage data will appear here as clients make requests</p>
            </div>
          )}
        </section>

        {/* Footer Info */}
        <footer className="text-center text-sm text-gray-400 py-4">
          <p>Monitor B2B API usage patterns, response times, and error rates.</p>
          <p className="mt-1">Data refreshes on page load. Click &quot;Refresh&quot; for latest data.</p>
        </footer>
      </main>
    </div>
  );
}
