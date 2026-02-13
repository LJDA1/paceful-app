'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';

// ============================================================================
// Types
// ============================================================================

interface JournalEntry {
  id: string;
  entry_title: string | null;
  entry_content: string;
  sentiment_score: number | null;
  emotion_primary: string | null;
  word_count: number | null;
  created_at: string;
}

// ============================================================================
// Sentiment Tag Configuration
// ============================================================================

function getSentimentStyle(emotion: string | null, score: number | null): { label: string; color: string; bg: string; filter: string } {
  if (emotion) {
    const e = emotion.toLowerCase();
    if (['hopeful', 'grateful', 'happy', 'positive', 'optimistic'].includes(e)) {
      return { label: 'Hopeful', color: '#5B8A72', bg: 'rgba(91,138,114,0.1)', filter: 'hopeful' };
    }
    if (['sad', 'difficult', 'heavy', 'anxious', 'angry'].includes(e)) {
      return { label: 'Processing', color: '#7E71B5', bg: 'rgba(126,113,181,0.1)', filter: 'processing' };
    }
  }
  if (score !== null) {
    if (score > 0.2) return { label: 'Hopeful', color: '#5B8A72', bg: 'rgba(91,138,114,0.1)', filter: 'hopeful' };
    if (score < -0.2) return { label: 'Processing', color: '#7E71B5', bg: 'rgba(126,113,181,0.1)', filter: 'processing' };
  }
  return { label: 'Reflective', color: '#5E8DB0', bg: 'rgba(94,141,176,0.1)', filter: 'reflective' };
}

// ============================================================================
// Daily Prompts
// ============================================================================

const dailyPrompts = [
  "What's one thing you're grateful for today, even if it feels small?",
  "Describe a moment from today when you felt at peace.",
  "What emotion has been most present for you this week?",
  "Write about something you're learning about yourself.",
  "What would you tell your past self about where you are now?",
  "What small victory can you celebrate today?",
  "Describe how your body feels right now. Where do you hold tension?",
  "What boundary did you honor today, or wish you had?",
  "Write about a memory that brought you comfort recently.",
  "What does healing look like for you right now?",
];

function getTodaysPrompt(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return dailyPrompts[dayOfYear % dailyPrompts.length];
}

// ============================================================================
// Icons
// ============================================================================

function PenIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function XIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronRightIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function RefreshIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function JournalPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysPrompt, setTodaysPrompt] = useState('');
  const [entryDates, setEntryDates] = useState<Record<string, string>>({});

  // Search and filter state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // New entry overlay state
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [analyzingEntryId, setAnalyzingEntryId] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(true);
  const [initialPromptFetched, setInitialPromptFetched] = useState(false);

  const supabase = createClient();

  // Fetch AI-generated prompt on page load
  useEffect(() => {
    if (!isAuthenticated || initialPromptFetched) return;

    const fetchAIPrompt = async () => {
      setPromptLoading(true);
      try {
        const response = await fetch('/api/ai/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.prompt) {
            setTodaysPrompt(data.prompt);
            setInitialPromptFetched(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI prompt:', err);
        // Fallback to daily prompt
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        setTodaysPrompt(dailyPrompts[dayOfYear % dailyPrompts.length]);
      } finally {
        setPromptLoading(false);
      }
    };

    fetchAIPrompt();
  }, [isAuthenticated, initialPromptFetched]);

  // Set fallback prompt immediately to prevent empty state
  useEffect(() => {
    if (!todaysPrompt) {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      setCurrentPromptIndex(dayOfYear % dailyPrompts.length);
      setTodaysPrompt(dailyPrompts[dayOfYear % dailyPrompts.length]);
    }
  }, [todaysPrompt]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    const { data: entriesData } = await supabase
      .from('journal_entries')
      .select('id, entry_title, entry_content, sentiment_score, emotion_primary, word_count, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    setEntries(entriesData || []);
    setIsLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  // Format entry dates - client-side only
  useEffect(() => {
    const dates: Record<string, string> = {};
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();

    entries.forEach((entry) => {
      const entryDate = new Date(entry.created_at);
      const dateStr = entryDate.toDateString();
      const timeStr = entryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      if (dateStr === today) {
        dates[entry.id] = `Today · ${timeStr}`;
      } else if (dateStr === yesterday) {
        dates[entry.id] = `Yesterday · ${timeStr}`;
      } else {
        dates[entry.id] = entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${timeStr}`;
      }
    });
    setEntryDates(dates);
  }, [entries]);

  // Fetch new AI prompt
  const cyclePrompt = async () => {
    setPromptLoading(true);
    try {
      const response = await fetch('/api/ai/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.prompt) {
          setTodaysPrompt(data.prompt);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch new prompt:', err);
    } finally {
      setPromptLoading(false);
    }
    // Fallback: cycle through local prompts
    const nextIndex = (currentPromptIndex + 1) % dailyPrompts.length;
    setCurrentPromptIndex(nextIndex);
    setTodaysPrompt(dailyPrompts[nextIndex]);
  };

  // Save new entry
  const handleSaveEntry = async () => {
    if (!userId || !entryText.trim()) return;

    setIsSavingEntry(true);
    try {
      const wordCount = entryText.trim().split(/\s+/).length;
      const content = entryText.trim();

      const { data: newEntry, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          entry_title: entryTitle.trim() || null,
          entry_content: content,
          word_count: wordCount,
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (!error && newEntry) {
        setShowNewEntry(false);
        setEntryText('');
        setEntryTitle('');
        fetchData();

        // Trigger AI sentiment analysis in background
        setAnalyzingEntryId(newEntry.id);
        try {
          const response = await fetch('/api/ai/sentiment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: content,
              entryId: newEntry.id,
            }),
          });
          if (response.ok) {
            // Refresh to show updated sentiment
            fetchData();
          }
        } catch (sentimentErr) {
          console.error('Sentiment analysis failed:', sentimentErr);
        } finally {
          setAnalyzingEntryId(null);
        }
      }
    } catch (err) {
      console.error('Error saving entry:', err);
    } finally {
      setIsSavingEntry(false);
    }
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.entry_title?.toLowerCase().includes(query)) ||
        e.entry_content.toLowerCase().includes(query)
      );
    }

    // Apply sentiment filter
    if (activeFilter !== 'all') {
      result = result.filter(e => {
        const sentiment = getSentimentStyle(e.emotion_primary, e.sentiment_score);
        return sentiment.filter === activeFilter;
      });
    }

    return result;
  }, [entries, searchQuery, activeFilter]);

  // Stats - client-side only to prevent hydration mismatch
  const [stats, setStats] = useState<{ totalWords: number; streak: number }>({ totalWords: 0, streak: 0 });
  useEffect(() => {
    const totalWords = entries.reduce((sum, e) => sum + (e.word_count || 0), 0);

    // Calculate streak
    let streak = 0;
    const dates = [...new Set(entries.map(e => new Date(e.created_at).toDateString()))];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 86400000).toDateString();
      if (dates.includes(checkDate)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    setStats({ totalWords, streak });
  }, [entries]);

  const wordCount = entryText.trim() ? entryText.trim().split(/\s+/).length : 0;

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'hopeful', label: 'Hopeful' },
    { key: 'reflective', label: 'Reflective' },
    { key: 'processing', label: 'Processing' },
  ];

  return (
    <>
      <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-5 py-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1
              className="text-[28px] font-bold"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Journal
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ background: searchOpen ? 'var(--bg-warm)' : 'transparent' }}
              >
                {searchOpen ? (
                  <XIcon className="w-5 h-5" style={{ color: 'var(--text)' }} />
                ) : (
                  <SearchIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
              <button
                onClick={() => setShowNewEntry(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-white transition-transform active:scale-95"
                style={{ background: 'var(--primary)' }}
              >
                <PenIcon className="w-4 h-4" />
                Write
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {searchOpen && (
            <div className="mb-4 animate-fadeUp">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          )}

          {/* Daily Prompt Card - Clickable */}
          <button
            onClick={() => setShowNewEntry(true)}
            className="w-full text-left relative rounded-3xl p-6 mb-6 overflow-hidden transition-transform active:scale-[0.98]"
            style={{ background: 'var(--bg-warm)' }}
          >
            {/* Decorative circles */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.08]"
              style={{ background: 'var(--primary)', transform: 'translate(30%, -30%)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-16 h-16 rounded-full opacity-[0.05]"
              style={{ background: 'var(--accent)', transform: 'translate(-30%, 30%)' }}
            />

            <div className="flex items-center gap-2 mb-3 relative">
              <p
                className="text-[10px] font-medium uppercase tracking-[0.1em]"
                style={{ color: 'var(--text-muted)' }}
              >
                {initialPromptFetched ? 'Your Prompt' : "Today's Prompt"}
              </p>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--primary)' }}>
                <PenIcon className="w-3 h-3" />
                <span>Tap to write</span>
              </div>
            </div>
            {promptLoading && !todaysPrompt ? (
              <div className="space-y-2">
                <div className="h-5 w-full rounded animate-pulse" style={{ background: 'var(--border)' }} />
                <div className="h-5 w-3/4 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ) : (
              <p
                className="text-[18px] font-medium leading-[1.5] relative"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                {todaysPrompt}
              </p>
            )}
          </button>

          {/* Writing Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(212,151,59,0.1)' }}
              >
                <SparkleIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p
                  className="text-[20px] font-bold leading-none"
                  style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
                >
                  {stats.streak} days
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Writing streak</p>
              </div>
            </div>
            <div
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(94,141,176,0.1)' }}
              >
                <PenIcon className="w-5 h-5" style={{ color: 'var(--calm)' }} />
              </div>
              <div>
                <p
                  className="text-[20px] font-bold leading-none"
                  style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
                >
                  {stats.totalWords.toLocaleString()}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total words</p>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-5 px-5">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className="px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all"
                style={{
                  background: activeFilter === filter.key ? '#1F1D1A' : 'var(--bg-card)',
                  color: activeFilter === filter.key ? 'white' : 'var(--text-sec)',
                  border: activeFilter === filter.key ? 'none' : '1px solid var(--border-light)',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Entries List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[22px] p-5 animate-pulse"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                >
                  <div className="flex justify-between mb-3">
                    <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
                    <div className="h-5 w-16 rounded-full" style={{ background: 'var(--border)' }} />
                  </div>
                  <div className="h-5 w-3/4 rounded mb-2" style={{ background: 'var(--border)' }} />
                  <div className="h-4 w-full rounded mb-1" style={{ background: 'var(--border-light)' }} />
                  <div className="h-4 w-2/3 rounded" style={{ background: 'var(--border-light)' }} />
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div
              className="rounded-3xl p-12 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--bg-warm)' }}
              >
                <PenIcon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-[17px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
                {searchQuery || activeFilter !== 'all' ? 'No entries found' : 'Your journal awaits'}
              </h3>
              <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your search or filter.'
                  : 'Writing helps process emotions and track your healing. Start with today\'s prompt above.'}
              </p>
              {!searchQuery && activeFilter === 'all' && (
                <button
                  onClick={() => setShowNewEntry(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  <PenIcon className="w-4 h-4" />
                  Write your first entry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => {
                const sentiment = getSentimentStyle(entry.emotion_primary, entry.sentiment_score);
                const preview = entry.entry_content.slice(0, 120) + (entry.entry_content.length > 120 ? '...' : '');
                const title = entry.entry_title || 'Untitled entry';

                return (
                  <Link
                    key={entry.id}
                    href={`/journal/${entry.id}`}
                    className="block rounded-[22px] p-5 transition-all hover:shadow-md"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {entryDates[entry.id] || ''}
                      </span>
                      {analyzingEntryId === entry.id ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5"
                          style={{ color: 'var(--accent)', background: 'rgba(212,151,59,0.1)' }}
                        >
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Analyzing...
                        </span>
                      ) : (
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                          style={{ color: sentiment.color, background: sentiment.bg }}
                        >
                          {sentiment.label}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-[17px] font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
                      {title}
                    </h3>

                    {/* Preview */}
                    <p
                      className="text-[14px] leading-relaxed mb-3 line-clamp-2"
                      style={{ color: 'var(--text-sec)' }}
                    >
                      {preview}
                    </p>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {entry.word_count || 0} words
                      </span>
                      <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Full-Screen Writing Overlay */}
      {showNewEntry && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: 'var(--bg)' }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <button
              onClick={() => {
                setShowNewEntry(false);
                setEntryText('');
                setEntryTitle('');
              }}
              className="text-[15px] font-medium"
              style={{ color: 'var(--text-sec)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEntry}
              disabled={!entryText.trim() || isSavingEntry}
              className="px-5 py-2 rounded-full text-[14px] font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: entryText.trim() ? 'var(--primary)' : 'var(--text-muted)' }}
            >
              {isSavingEntry ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-5 py-6">
            <div className="max-w-lg mx-auto">
              {/* Prompt Card */}
              <div
                className="rounded-2xl p-5 mb-6"
                style={{ background: 'var(--bg-warm)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
                    Writing Prompt
                  </p>
                  <button
                    onClick={cyclePrompt}
                    disabled={promptLoading}
                    className="flex items-center gap-1 text-[11px] font-medium disabled:opacity-50"
                    style={{ color: 'var(--primary)' }}
                  >
                    <RefreshIcon className={`w-3.5 h-3.5 ${promptLoading ? 'animate-spin' : ''}`} />
                    {promptLoading ? 'Loading...' : 'New prompt'}
                  </button>
                </div>
                {promptLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded animate-pulse" style={{ background: 'var(--border)' }} />
                    <div className="h-4 w-2/3 rounded animate-pulse" style={{ background: 'var(--border)' }} />
                  </div>
                ) : (
                  <p
                    className="text-[16px] font-medium leading-[1.5]"
                    style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
                  >
                    {todaysPrompt}
                  </p>
                )}
              </div>

              {/* Title Input */}
              <input
                type="text"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full text-[20px] font-semibold mb-4 bg-transparent outline-none"
                style={{ color: 'var(--text)' }}
              />

              {/* Textarea */}
              <textarea
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="Start writing..."
                autoFocus
                className="w-full min-h-[300px] text-[16px] leading-[1.75] bg-transparent outline-none resize-none"
                style={{ color: 'var(--text)' }}
              />
            </div>
          </div>

          {/* Bottom Bar */}
          <div
            className="flex items-center justify-between px-5 py-4 border-t"
            style={{ borderColor: 'var(--border-light)', background: 'var(--bg)' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {entryText.length > 0 ? 'Auto-saved' : ''}
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeUp {
          animation: fadeUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
