'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  JournalEntryForm,
  JournalEntriesList,
  JournalPrompts,
  type JournalEntry,
  type JournalPrompt,
  type SavedEntry,
} from '@/components/journal';

const DEMO_USER_ID = '5b362424-0963-4fe3-b4fc-84d85cf47044';

// ============================================================================
// Types
// ============================================================================

interface JournalStats {
  totalEntries: number;
  totalWords: number;
  currentStreak: number;
  longestStreak: number;
  avgWordsPerEntry: number;
  positiveEntries: number;
}

interface UserProfile {
  stage: 'healing' | 'rebuilding' | 'ready' | null;
}

// ============================================================================
// Quick Stats Component
// ============================================================================

function QuickStats({ stats, isLoading }: { stats: JournalStats; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-stone-100 animate-pulse">
            <div className="h-7 w-12 bg-stone-200 rounded mb-1" />
            <div className="h-4 w-20 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      value: stats.totalEntries,
      label: 'Total Entries',
      icon: '📝',
      color: 'text-stone-800',
    },
    {
      value: stats.currentStreak,
      label: 'Day Streak',
      icon: '🔥',
      color: stats.currentStreak > 0 ? 'text-amber-600' : 'text-stone-400',
      suffix: stats.currentStreak > 0 ? ' days' : '',
    },
    {
      value: stats.totalWords.toLocaleString(),
      label: 'Words Written',
      icon: '✍️',
      color: 'text-indigo-600',
    },
    {
      value: `${Math.round((stats.positiveEntries / Math.max(stats.totalEntries, 1)) * 100)}%`,
      label: 'Positive Entries',
      icon: '💚',
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statItems.map((item, i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-4 border border-stone-100 hover:border-stone-200 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{item.icon}</span>
            <span className={`text-2xl font-bold ${item.color}`}>
              {item.value}
              {item.suffix}
            </span>
          </div>
          <p className="text-sm text-stone-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Writing Mode Toggle
// ============================================================================

function WritingModeHeader({
  isWriting,
  onToggle,
  hasEntries,
}: {
  isWriting: boolean;
  onToggle: () => void;
  hasEntries: boolean;
}) {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Journal</h1>
            <p className="text-stone-500 mt-0.5 text-sm sm:text-base">
              {isWriting ? 'Express your thoughts freely' : 'Reflect on your healing journey'}
            </p>
          </div>

          <button
            onClick={onToggle}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm ${
              isWriting
                ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
            }`}
          >
            {isWriting ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Entry
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Empty State for New Users
// ============================================================================

function NewUserWelcome({ onStartWriting }: { onStartWriting: () => void }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl p-8 sm:p-12 text-center border border-amber-100">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>

        {/* Welcome Text */}
        <h2 className="text-2xl font-bold text-stone-800 mb-3">
          Welcome to Your Journal
        </h2>
        <p className="text-stone-600 max-w-md mx-auto mb-8 leading-relaxed">
          Journaling is one of the most powerful tools for healing. This is your private space
          to process emotions, track progress, and discover insights about yourself.
        </p>

        {/* Benefits */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 text-left">
          <div className="bg-white/60 rounded-xl p-4">
            <span className="text-2xl mb-2 block">🧠</span>
            <h3 className="font-medium text-stone-800 mb-1">Process Emotions</h3>
            <p className="text-sm text-stone-500">Writing helps you understand and release difficult feelings.</p>
          </div>
          <div className="bg-white/60 rounded-xl p-4">
            <span className="text-2xl mb-2 block">📈</span>
            <h3 className="font-medium text-stone-800 mb-1">Track Progress</h3>
            <p className="text-sm text-stone-500">See your healing journey unfold over time.</p>
          </div>
          <div className="bg-white/60 rounded-xl p-4">
            <span className="text-2xl mb-2 block">💡</span>
            <h3 className="font-medium text-stone-800 mb-1">Gain Insights</h3>
            <p className="text-sm text-stone-500">AI analysis reveals patterns in your emotional growth.</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onStartWriting}
          className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all font-medium shadow-lg shadow-amber-500/25 flex items-center gap-2 mx-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
          Write Your First Entry
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function JournalPage() {
  // Data state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats>({
    totalEntries: 0,
    totalWords: 0,
    currentStreak: 0,
    longestStreak: 0,
    avgWordsPerEntry: 0,
    positiveEntries: 0,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<JournalPrompt | null>(null);

  // Calculate streak from entries
  const calculateStreak = useCallback((entries: JournalEntry[]): number => {
    if (entries.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique dates with entries (sorted descending)
    const entryDates = [...new Set(
      entries.map((e) => {
        const d = new Date(e.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )].sort((a, b) => b - a);

    // Check if there's an entry today or yesterday
    const todayTime = today.getTime();
    const yesterdayTime = todayTime - 24 * 60 * 60 * 1000;

    if (entryDates[0] !== todayTime && entryDates[0] !== yesterdayTime) {
      return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 1;
    for (let i = 1; i < entryDates.length; i++) {
      const diff = entryDates[i - 1] - entryDates[i];
      if (diff === 24 * 60 * 60 * 1000) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      // Fetch entries
      const { data: entriesData } = await supabase
        .from('journal_entries')
        .select('id, entry_title, entry_content, sentiment_score, emotion_primary, word_count, created_at')
        .eq('user_id', DEMO_USER_ID)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      const entries = entriesData || [];
      setEntries(entries);

      // Calculate stats
      const totalWords = entries.reduce((sum, e) => sum + (e.word_count || 0), 0);
      const positiveEntries = entries.filter((e) => e.sentiment_score && e.sentiment_score > 0.1).length;

      setStats({
        totalEntries: entries.length,
        totalWords,
        currentStreak: calculateStreak(entries),
        longestStreak: 0, // Would need historical data
        avgWordsPerEntry: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
        positiveEntries,
      });

      // Fetch user profile for stage
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_stage')
        .eq('id', DEMO_USER_ID)
        .single();

      if (profileData) {
        setUserProfile({ stage: profileData.current_stage });
      }

      setIsLoading(false);
    }

    fetchData();
  }, [calculateStreak]);

  // Handle entry saved
  const handleEntrySaved = useCallback((savedEntry: SavedEntry) => {
    const newEntry: JournalEntry = {
      id: savedEntry.id,
      entry_title: savedEntry.entry_title,
      entry_content: savedEntry.entry_content,
      sentiment_score: savedEntry.sentiment_score,
      emotion_primary: savedEntry.emotion_primary,
      word_count: savedEntry.word_count,
      created_at: savedEntry.created_at,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalEntries: prev.totalEntries + 1,
      totalWords: prev.totalWords + (savedEntry.word_count || 0),
      avgWordsPerEntry: Math.round(
        (prev.totalWords + (savedEntry.word_count || 0)) / (prev.totalEntries + 1)
      ),
      positiveEntries:
        savedEntry.sentiment_score && savedEntry.sentiment_score > 0.1
          ? prev.positiveEntries + 1
          : prev.positiveEntries,
      currentStreak: calculateStreak([newEntry, ...entries]),
    }));

    setIsWriting(false);
    setSelectedPrompt(null);
  }, [entries, calculateStreak]);

  // Handle delete entry
  const handleDeleteEntry = useCallback(async (entryId: string) => {
    const { error } = await supabase
      .from('journal_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entryId);

    if (!error) {
      const deletedEntry = entries.find((e) => e.id === entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));

      if (deletedEntry) {
        setStats((prev) => ({
          ...prev,
          totalEntries: prev.totalEntries - 1,
          totalWords: prev.totalWords - (deletedEntry.word_count || 0),
          avgWordsPerEntry:
            prev.totalEntries > 1
              ? Math.round((prev.totalWords - (deletedEntry.word_count || 0)) / (prev.totalEntries - 1))
              : 0,
          positiveEntries:
            deletedEntry.sentiment_score && deletedEntry.sentiment_score > 0.1
              ? prev.positiveEntries - 1
              : prev.positiveEntries,
        }));
      }
    }
  }, [entries]);

  // Handle prompt selection
  const handlePromptSelect = useCallback((prompt: JournalPrompt) => {
    setSelectedPrompt(prompt);
    setIsWriting(true);
  }, []);

  // Handle edit (for now, just log - would need edit mode)
  const handleEditEntry = useCallback((entry: JournalEntry) => {
    console.log('Edit entry:', entry.id);
    // Future: implement edit mode
  }, []);

  // New user state
  const isNewUser = !isLoading && entries.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 pb-24 md:pb-8">
      {/* Header */}
      <WritingModeHeader
        isWriting={isWriting}
        onToggle={() => {
          setIsWriting(!isWriting);
          if (isWriting) setSelectedPrompt(null);
        }}
        hasEntries={entries.length > 0}
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* New User Welcome */}
        {isNewUser && !isWriting && (
          <NewUserWelcome onStartWriting={() => setIsWriting(true)} />
        )}

        {/* Writing Mode */}
        {isWriting && (
          <section className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 sm:p-6">
            <JournalEntryForm
              userId={DEMO_USER_ID}
              onSave={handleEntrySaved}
              onCancel={() => {
                setIsWriting(false);
                setSelectedPrompt(null);
              }}
              initialDraft={
                selectedPrompt
                  ? { title: '', content: '', promptId: selectedPrompt.id }
                  : undefined
              }
            />
          </section>
        )}

        {/* Regular View (not writing, has entries) */}
        {!isWriting && !isNewUser && (
          <>
            {/* Quick Stats */}
            <section>
              <QuickStats stats={stats} isLoading={isLoading} />
            </section>

            {/* Writing Prompts */}
            <section className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 sm:p-6">
              <JournalPrompts
                onSelectPrompt={handlePromptSelect}
                userStage={userProfile?.stage}
                selectedPromptId={selectedPrompt?.id}
              />
            </section>

            {/* Entries List */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-stone-800">Your Entries</h3>
              </div>
              <JournalEntriesList
                entries={entries}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
                isLoading={isLoading}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
