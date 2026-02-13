'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

interface JournalPrompt {
  id: string;
  prompt_text: string;
  prompt_category: string;
}

// Word count helper
function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// Sentiment analysis (simplified client-side)
function analyzeSentiment(text: string): { score: number; label: string } {
  const positiveWords = ['happy', 'grateful', 'love', 'hope', 'better', 'good', 'great', 'amazing', 'wonderful', 'thankful', 'blessed', 'joy', 'peace', 'calm', 'strong', 'proud', 'excited', 'healing', 'growth', 'progress'];
  const negativeWords = ['sad', 'angry', 'hurt', 'pain', 'miss', 'lonely', 'anxious', 'worried', 'scared', 'frustrated', 'terrible', 'awful', 'hate', 'regret', 'guilty', 'shame', 'lost', 'confused', 'overwhelmed'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) score += 0.1;
    if (negativeWords.some(nw => word.includes(nw))) score -= 0.1;
  });

  score = Math.max(-1, Math.min(1, score));

  let label = 'Neutral';
  if (score >= 0.3) label = 'Positive';
  else if (score <= -0.3) label = 'Challenging';

  return { score, label };
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [analyzeSentimentEnabled, setAnalyzeSentimentEnabled] = useState(true);
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draftId, setDraftId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: '', content: '' });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const wordCount = countWords(content);
  const sentiment = analyzeSentiment(content);

  // Fetch prompts
  useEffect(() => {
    async function fetchPrompts() {
      const { data } = await supabase
        .from('journal_prompts')
        .select('id, prompt_text, prompt_category')
        .eq('is_active', true);

      if (data && data.length > 0) {
        // Shuffle prompts
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setPrompts(shuffled);
      }
    }
    fetchPrompts();
  }, [supabase]);

  // Load draft from localStorage
  useEffect(() => {
    const savedDraft = localStorage.getItem(`journal_draft_${userId}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.content) {
          setTitle(draft.title || '');
          setContent(draft.content);
          setDraftId(draft.id || null);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(250, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  // Autosave every 30 seconds
  const saveDraft = useCallback(async () => {
    if (!content.trim()) return;
    if (lastSavedRef.current.title === title && lastSavedRef.current.content === content) return;

    setAutosaveStatus('saving');

    try {
      // Save to localStorage
      localStorage.setItem(
        `journal_draft_${userId}`,
        JSON.stringify({
          title,
          content,
          id: draftId,
          updatedAt: new Date().toISOString()
        })
      );

      // Also save to database as draft if we have content
      if (wordCount >= 5) {
        if (draftId) {
          // Update existing draft
          await supabase
            .from('journal_entries')
            .update({
              entry_title: title.trim() || null,
              entry_content: content.trim(),
              word_count: wordCount,
              is_private: isPrivate,
              updated_at: new Date().toISOString(),
            })
            .eq('id', draftId);
        } else {
          // Create new draft
          const { data } = await supabase
            .from('journal_entries')
            .insert({
              user_id: userId,
              entry_title: title.trim() || null,
              entry_content: content.trim(),
              word_count: wordCount,
              is_private: isPrivate,
              status: 'draft',
            })
            .select('id')
            .single();

          if (data) {
            setDraftId(data.id);
            localStorage.setItem(
              `journal_draft_${userId}`,
              JSON.stringify({ title, content, id: data.id, updatedAt: new Date().toISOString() })
            );
          }
        }
      }

      lastSavedRef.current = { title, content };
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Autosave failed:', err);
      setAutosaveStatus('idle');
    }
  }, [title, content, wordCount, isPrivate, draftId, supabase]);

  // Autosave timer
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    if (content.trim()) {
      autosaveTimerRef.current = setTimeout(saveDraft, 30000);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [content, saveDraft]);

  // Show different prompt
  const showNextPrompt = () => {
    setCurrentPromptIndex((prev) => (prev + 1) % prompts.length);
  };

  // Publish entry
  const handlePublish = async () => {
    if (wordCount < 5) {
      setError('Please write at least 5 words before publishing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const entryData = {
        user_id: userId,
        entry_title: title.trim() || null,
        entry_content: content.trim(),
        word_count: wordCount,
        is_private: isPrivate,
        status: 'published',
        sentiment_score: analyzeSentimentEnabled ? sentiment.score : null,
      };

      if (draftId) {
        // Update existing draft to published
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update({
            ...entryData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draftId);

        if (updateError) throw updateError;
      } else {
        // Create new published entry
        const response = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            entry_title: title.trim() || null,
            entry_content: content.trim(),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save entry');
        }
      }

      // Clear draft from localStorage
      localStorage.removeItem(`journal_draft_${userId}`);

      // Redirect to journal list
      router.push('/journal');
    } catch (err) {
      console.error('Publish failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    await saveDraft();
    router.push('/journal');
  };

  const currentPrompt = prompts[currentPromptIndex];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/journal"
              className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>

            {autosaveStatus !== 'idle' && (
              <span className={`text-sm ${autosaveStatus === 'saved' ? 'text-paceful-primary' : 'text-stone-400'}`}>
                {autosaveStatus === 'saving' ? 'Saving...' : 'Draft saved'}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {/* Title Section */}
          <div className="p-6 border-b border-stone-100">
            <h1 className="text-xl font-semibold text-stone-900 mb-4">New Journal Entry</h1>

            {/* Title Input */}
            <div className="mb-4">
              <label className="block text-sm text-stone-500 mb-2">Title (optional):</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your entry a title..."
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-paceful-primary focus:border-transparent text-stone-900 placeholder-stone-400"
              />
            </div>
          </div>

          {/* Writing Area */}
          <div className="p-6">
            <label className="block text-sm text-stone-500 mb-2">How are you feeling today?</label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing..."
                className="w-full px-4 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-paceful-primary focus:border-transparent text-stone-900 placeholder-stone-400 resize-none leading-relaxed"
                style={{ minHeight: '250px' }}
              />
            </div>

            {/* Writing Prompt */}
            {currentPrompt && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Prompt: {currentPrompt.prompt_text}</p>
                  </div>
                </div>
                <button
                  onClick={showNextPrompt}
                  className="mt-3 text-sm text-amber-700 hover:text-amber-800 font-medium"
                >
                  Show different prompt
                </button>
              </div>
            )}

            {/* Word Count */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-stone-500">Word count: <span className="font-medium text-stone-700">{wordCount}</span></span>

              {wordCount >= 20 && analyzeSentimentEnabled && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  sentiment.label === 'Positive' ? 'bg-paceful-primary-muted text-paceful-primary' :
                  sentiment.label === 'Challenging' ? 'bg-rose-100 text-rose-700' :
                  'bg-stone-100 text-stone-600'
                }`}>
                  {sentiment.label}
                </span>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analyzeSentimentEnabled}
                onChange={(e) => setAnalyzeSentimentEnabled(e.target.checked)}
                className="w-5 h-5 text-paceful-primary border-stone-300 rounded focus:ring-paceful-primary"
              />
              <span className="text-sm text-stone-700">Analyze sentiment with AI</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-5 h-5 text-paceful-primary border-stone-300 rounded focus:ring-paceful-primary"
              />
              <span className="text-sm text-stone-700">Keep this entry private</span>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-3 bg-rose-50 border-t border-rose-100">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
            <Link
              href="/journal"
              className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={!content.trim() || isSubmitting}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>

              <button
                onClick={handlePublish}
                disabled={wordCount < 5 || isSubmitting}
                className="px-6 py-2.5 bg-paceful-primary text-white rounded-lg hover:bg-paceful-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Publishing...
                  </>
                ) : (
                  'Publish'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
