'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface SyntheticStatus {
  syntheticUsers: number;
  moodEntries: number;
  journalEntries: number;
  ersScores: number;
  targetUsers: number;
  progress: number;
}

interface GeneratedUser {
  syntheticId: string;
  firstName: string;
  moodEntries: number;
  journalEntries: number;
  ersScore: number | null;
}

interface GenerationResult {
  completed: number;
  total: number;
  users: GeneratedUser[];
  errors: string[];
}

const ADMIN_KEY = 'paceful-admin-2024';

export default function SyntheticDataPage() {
  const [status, setStatus] = useState<SyntheticStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batchStart, setBatchStart] = useState(1);
  const [batchEnd, setBatchEnd] = useState(25);
  const [useAI, setUseAI] = useState(true);
  const [results, setResults] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedUsers, setGeneratedUsers] = useState<GeneratedUser[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/generate-synthetic', {
        headers: { Authorization: `Bearer ${ADMIN_KEY}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);

        // Calculate next batch
        const nextStart = (data.syntheticUsers || 0) + 1;
        setBatchStart(nextStart);
        setBatchEnd(Math.min(nextStart + 24, 250));
      }
    } catch (err) {
      console.error('Status fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/admin/generate-synthetic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_KEY}`,
        },
        body: JSON.stringify({ batchStart, batchEnd, useAI }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResults(data);
      setGeneratedUsers(prev => [...prev, ...data.users]);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL synthetic data? This cannot be undone.')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/generate-synthetic', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ADMIN_KEY}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Deletion failed');
      }

      setGeneratedUsers([]);
      setResults(null);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Synthetic Data Generator</h1>
        <p className="text-gray-600 mb-8">
          Generate 250 realistic recovery journeys for calibration and pattern discovery.
        </p>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{status?.syntheticUsers || 0} / {status?.targetUsers || 250} users</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${status?.progress || 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{status?.syntheticUsers || 0}</p>
              <p className="text-xs text-gray-500">Users</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{status?.moodEntries || 0}</p>
              <p className="text-xs text-gray-500">Mood Entries</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{status?.journalEntries || 0}</p>
              <p className="text-xs text-gray-500">Journal Entries</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{status?.ersScores || 0}</p>
              <p className="text-xs text-gray-500">ERS Scores</p>
            </div>
          </div>
        </div>

        {/* Generation Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Users</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Start
              </label>
              <input
                type="number"
                min={1}
                max={250}
                value={batchStart}
                onChange={(e) => setBatchStart(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch End
              </label>
              <input
                type="number"
                min={1}
                max={250}
                value={batchEnd}
                onChange={(e) => setBatchEnd(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-gray-700">
                  Use AI for journal entries (costs ~$0.01/user)
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || batchStart > batchEnd}
              className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                `Generate Users ${batchStart}-${batchEnd}`
              )}
            </button>

            <button
              onClick={handleClearAll}
              disabled={isDeleting || (status?.syntheticUsers || 0) === 0}
              className="px-6 py-2.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Clear All Synthetic Data'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {results && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Generated {results.completed}/{results.total} users successfully.
              {results.errors.length > 0 && (
                <span className="text-red-600"> ({results.errors.length} errors)</span>
              )}
            </div>
          )}
        </div>

        {/* User Type Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Type Distribution (250 total)</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Classic Recovery</span>
              <span className="font-medium">150 users (1-150)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ready to Match</span>
              <span className="font-medium">40 users (151-190)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Already Matched</span>
              <span className="font-medium">30 users (191-220)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Support Seekers</span>
              <span className="font-medium">20 users (221-240)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Curious Browsers</span>
              <span className="font-medium">10 users (241-250)</span>
            </div>
          </div>
        </div>

        {/* Generated Users Table */}
        {generatedUsers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recently Generated ({generatedUsers.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">ID</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Moods</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Journals</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">ERS</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedUsers.slice(-20).map((user) => (
                    <tr key={user.syntheticId} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono text-xs text-gray-500">
                        {user.syntheticId}
                      </td>
                      <td className="py-2 px-3">{user.firstName}</td>
                      <td className="py-2 px-3 text-right">{user.moodEntries}</td>
                      <td className="py-2 px-3 text-right">{user.journalEntries}</td>
                      <td className="py-2 px-3 text-right">
                        {user.ersScore !== null ? user.ersScore : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
