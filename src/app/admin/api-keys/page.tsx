'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// ============================================================================
// TYPES
// ============================================================================

interface ApiClient {
  id: string;
  client_name: string;
  tier: number;
  monthly_api_calls_used: number;
  monthly_api_calls_limit: number | null;
  hourly_rate_limit: number;
  hourly_calls_used: number;
  is_active: boolean;
  created_at: string;
  can_access_aggregate_data: boolean;
  can_access_individual_ers: boolean;
  can_access_trends: boolean;
  can_access_individual_predictions: boolean;
  contact_email: string | null;
}

interface UsageStats {
  client_id: string;
  last_used: string | null;
  calls_this_month: number;
}

interface CreateClientForm {
  client_name: string;
  tier: number;
  permissions: {
    aggregate_data: boolean;
    individual_ers: boolean;
    trends: boolean;
    individual_predictions: boolean;
  };
  contact_email: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'Basic';
    case 2: return 'Professional';
    case 3: return 'Enterprise';
    default: return 'Unknown';
  }
}

function getTierRateLimit(tier: number): number {
  switch (tier) {
    case 1: return 100;
    case 2: return 500;
    case 3: return -1; // Unlimited
    default: return 100;
  }
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'pk_live_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// COMPONENTS
// ============================================================================

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${sizeClasses} text-paceful-primary`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isActive
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Revoked'}
    </span>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const colors = {
    1: 'bg-gray-100 text-gray-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-stone-200 text-stone-700',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${colors[tier as keyof typeof colors] || colors[1]}`}>
      {getTierName(tier)}
    </span>
  );
}

function Modal({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function CreateApiKeyModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (client: ApiClient, apiKey: string) => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<CreateClientForm>({
    client_name: '',
    tier: 1,
    permissions: {
      aggregate_data: true,
      individual_ers: false,
      trends: true,
      individual_predictions: false,
    },
    contact_email: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const apiKey = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);
      const rateLimit = getTierRateLimit(form.tier);

      const newClient = {
        client_name: form.client_name,
        client_type: form.tier === 3 ? 'enterprise' : form.tier === 2 ? 'commercial' : 'research',
        api_key_hash: apiKeyHash,
        tier: form.tier,
        hourly_rate_limit: rateLimit,
        monthly_api_calls_limit: form.tier === 3 ? 100000 : form.tier === 2 ? 10000 : 1000,
        can_access_aggregate_data: form.permissions.aggregate_data,
        can_access_individual_ers: form.permissions.individual_ers,
        can_access_trends: form.permissions.trends,
        can_access_individual_predictions: form.permissions.individual_predictions,
        contact_email: form.contact_email || null,
        is_active: true,
        monthly_api_calls_used: 0,
        hourly_calls_used: 0,
      };

      const { data, error: insertError } = await supabase
        .from('api_clients')
        .insert(newClient)
        .select()
        .single();

      if (insertError) throw insertError;

      onCreated(data, apiKey);
      setForm({
        client_name: '',
        tier: 1,
        permissions: {
          aggregate_data: true,
          individual_ers: false,
          trends: true,
          individual_predictions: false,
        },
        contact_email: '',
      });
    } catch (err) {
      console.error('Error creating API client:', err);
      setError('Failed to create API client. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New API Key">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Client Name
          </label>
          <input
            type="text"
            required
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="e.g., Research Partner Inc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-paceful-primary focus:border-paceful-primary text-gray-900 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contact Email
          </label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            placeholder="contact@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-paceful-primary focus:border-paceful-primary text-gray-900 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tier
          </label>
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-paceful-primary focus:border-paceful-primary text-gray-900"
          >
            <option value={1}>Tier 1 - Basic (100 req/hr)</option>
            <option value={2}>Tier 2 - Professional (500 req/hr)</option>
            <option value={3}>Tier 3 - Enterprise (Unlimited)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Permissions
          </label>
          <div className="space-y-2.5 bg-gray-50 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.permissions.aggregate_data}
                onChange={(e) => setForm({
                  ...form,
                  permissions: { ...form.permissions, aggregate_data: e.target.checked }
                })}
                className="w-4 h-4 text-paceful-primary border-gray-300 rounded focus:ring-paceful-primary"
              />
              <span className="text-sm text-gray-700">Access Aggregate Data</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.permissions.trends}
                onChange={(e) => setForm({
                  ...form,
                  permissions: { ...form.permissions, trends: e.target.checked }
                })}
                className="w-4 h-4 text-paceful-primary border-gray-300 rounded focus:ring-paceful-primary"
              />
              <span className="text-sm text-gray-700">Access Trends</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.permissions.individual_ers}
                onChange={(e) => setForm({
                  ...form,
                  permissions: { ...form.permissions, individual_ers: e.target.checked }
                })}
                className="w-4 h-4 text-paceful-primary border-gray-300 rounded focus:ring-paceful-primary"
              />
              <span className="text-sm text-gray-700">Access Individual ERS Scores</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.permissions.individual_predictions}
                onChange={(e) => setForm({
                  ...form,
                  permissions: { ...form.permissions, individual_predictions: e.target.checked }
                })}
                className="w-4 h-4 text-paceful-primary border-gray-300 rounded focus:ring-paceful-primary"
              />
              <span className="text-sm text-gray-700">Access Individual Predictions</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || !form.client_name}
            className="flex-1 px-4 py-2.5 bg-paceful-primary text-white rounded-lg hover:bg-paceful-primary-dark font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <LoadingSpinner size="sm" />
                Creating...
              </>
            ) : (
              'Create API Key'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ApiKeyRevealModal({
  isOpen,
  onClose,
  apiKey,
  clientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  clientName: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Key Created">
      <div className="space-y-5">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Save this API key now</p>
              <p className="text-sm text-amber-700 mt-1">
                This key will only be shown once. Store it securely - you won&apos;t be able to see it again.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Client: {clientName}
          </label>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2.5 bg-gray-900 text-green-400 rounded-lg font-mono text-sm break-all">
              {apiKey}
            </code>
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-paceful-primary text-white rounded-lg hover:bg-paceful-primary-dark font-medium transition-colors"
        >
          I&apos;ve Saved the Key
        </button>
      </div>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ApiKeysDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [usageStats, setUsageStats] = useState<Map<string, UsageStats>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyRevealModal, setShowKeyRevealModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [newClientName, setNewClientName] = useState('');

  const [revokingId, setRevokingId] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchData = useCallback(async () => {
    try {
      // Fetch API clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('api_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch usage stats from api_usage_log
      const { data: usageData, error: usageError } = await supabase
        .from('api_usage_log')
        .select('client_id, requested_at');

      if (usageError) throw usageError;

      // Process usage data
      const statsMap = new Map<string, UsageStats>();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (usageData) {
        const grouped: Record<string, { last_used: string | null; calls_this_month: number }> = {};

        for (const log of usageData) {
          if (!grouped[log.client_id]) {
            grouped[log.client_id] = { last_used: null, calls_this_month: 0 };
          }

          const requestedAt = new Date(log.requested_at);

          // Update last_used if this is more recent
          if (!grouped[log.client_id].last_used || requestedAt > new Date(grouped[log.client_id].last_used!)) {
            grouped[log.client_id].last_used = log.requested_at;
          }

          // Count calls this month
          if (requestedAt >= startOfMonth) {
            grouped[log.client_id].calls_this_month++;
          }
        }

        for (const [clientId, stats] of Object.entries(grouped)) {
          statsMap.set(clientId, {
            client_id: clientId,
            last_used: stats.last_used,
            calls_this_month: stats.calls_this_month,
          });
        }
      }

      setUsageStats(statsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    load();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleCreateClient = (client: ApiClient, apiKey: string) => {
    setClients(prev => [client, ...prev]);
    setNewApiKey(apiKey);
    setNewClientName(client.client_name);
    setShowCreateModal(false);
    setShowKeyRevealModal(true);
  };

  const handleRevoke = async (clientId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    setRevokingId(clientId);
    try {
      const { error } = await supabase
        .from('api_clients')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, is_active: false } : c
      ));
    } catch (error) {
      console.error('Error revoking client:', error);
      alert('Failed to revoke API key. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && client.is_active) ||
      (statusFilter === 'revoked' && !client.is_active);
    return matchesSearch && matchesStatus;
  });

  // ============================================================================
  // STATS
  // ============================================================================

  const activeClients = clients.filter(c => c.is_active).length;
  const totalCallsThisMonth = Array.from(usageStats.values()).reduce((sum, s) => sum + s.calls_this_month, 0);

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
              <h1 className="text-2xl font-bold text-gray-900">API Key Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage API clients and access permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <svg
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-paceful-primary text-white rounded-lg hover:bg-paceful-primary-dark transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create API Key
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-paceful-primary-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-paceful-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total API Clients</p>
                {loading ? (
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Active Clients</p>
                {loading ? (
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Calls This Month</p>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{totalCallsThisMonth.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by client name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-paceful-primary focus:border-paceful-primary text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-paceful-primary-muted text-paceful-primary'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('revoked')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'revoked'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Revoked
              </button>
            </div>
          </div>
        </div>

        {/* API Clients Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8">
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <p className="text-gray-500 font-medium">No API clients found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Create your first API key to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Calls/Month
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rate Limit
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClients.map(client => {
                    const stats = usageStats.get(client.id);
                    const rateLimitUsed = client.hourly_rate_limit > 0
                      ? Math.round((client.hourly_calls_used / client.hourly_rate_limit) * 100)
                      : 0;

                    return (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{client.client_name}</p>
                            {client.contact_email && (
                              <p className="text-sm text-gray-500">{client.contact_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <TierBadge tier={client.tier} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge isActive={client.is_active} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(client.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatTimeAgo(stats?.last_used || null)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {client.monthly_api_calls_used.toLocaleString()}
                          </span>
                          {client.monthly_api_calls_limit && (
                            <span className="text-sm text-gray-400">
                              /{client.monthly_api_calls_limit.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {client.hourly_rate_limit === -1 ? (
                            <span className="text-sm text-gray-600">Unlimited</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-sm text-gray-600">
                                {client.hourly_calls_used}/{client.hourly_rate_limit}/hr
                              </span>
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    rateLimitUsed > 80 ? 'bg-red-500' : rateLimitUsed > 50 ? 'bg-amber-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(rateLimitUsed, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {client.is_active && (
                            <button
                              onClick={() => handleRevoke(client.id)}
                              disabled={revokingId === client.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {revokingId === client.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              )}
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 py-4">
          <p>API keys are hashed before storage. Original keys cannot be recovered.</p>
        </footer>
      </main>

      {/* Modals */}
      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreateClient}
      />

      <ApiKeyRevealModal
        isOpen={showKeyRevealModal}
        onClose={() => setShowKeyRevealModal(false)}
        apiKey={newApiKey}
        clientName={newClientName}
      />
    </div>
  );
}

// ============================================================================
// Page Export with Admin Auth
// ============================================================================

export default function ApiKeysPage() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      </div>
    );
  }

  return <ApiKeysDashboard />;
}
