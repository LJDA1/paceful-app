'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

interface JournalEntry {
  id: string;
  entry_title: string | null;
  entry_content: string;
  sentiment_score: number | null;
  emotion_primary: string | null;
  emotion_secondary: string | null;
  word_count: number | null;
  status: string;
  tags: string[] | null;
  is_private: boolean;
  contains_insight: boolean;
  contains_gratitude: boolean;
  contains_future_thinking: boolean;
  created_at: string;
  updated_at: string;
}

// Sentiment helpers
function getSentimentColor(score: number | null): string {
  if (score === null) return 'bg-stone-100 text-stone-600';
  if (score >= 0.3) return 'bg-emerald-100 text-emerald-700';
  if (score >= -0.3) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function getSentimentLabel(score: number | null): string {
  if (score === null) return 'Not analyzed';
  if (score >= 0.3) return 'Positive';
  if (score >= -0.3) return 'Neutral';
  return 'Challenging';
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Word count helper
function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function JournalEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  const { userId, loading: userLoading, isAuthenticated } = useUser();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch entry
  useEffect(() => {
    if (!userId) return;

    async function fetchEntry() {
      setLoading(true);

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        console.error('Error fetching entry:', error);
        router.push('/journal');
        return;
      }

      setEntry(data);
      setEditTitle(data.entry_title || '');
      setEditContent(data.entry_content);
      setLoading(false);
    }

    fetchEntry();
  }, [entryId, userId, supabase, router]);

  // Auto-resize textarea in edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(300, textareaRef.current.scrollHeight)}px`;
    }
  }, [editContent, isEditing]);

  // Save edits
  const handleSave = async () => {
    if (!editContent.trim()) {
      setError('Entry content cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({
          entry_title: editTitle.trim() || null,
          entry_content: editContent.trim(),
          word_count: countWords(editContent),
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      // Update local state
      setEntry((prev) =>
        prev
          ? {
              ...prev,
              entry_title: editTitle.trim() || null,
              entry_content: editContent.trim(),
              word_count: countWords(editContent),
              updated_at: new Date().toISOString(),
            }
          : null
      );

      setIsEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete entry
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const { error: deleteError } = await supabase
        .from('journal_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', entryId);

      if (deleteError) throw deleteError;

      router.push('/journal');
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete entry. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditTitle(entry?.entry_title || '');
    setEditContent(entry?.entry_content || '');
    setIsEditing(false);
    setError(null);
  };

  // Export to text (simplified PDF alternative)
  const handleExport = () => {
    if (!entry) return;

    const text = `
${entry.entry_title || 'Untitled Entry'}
${'='.repeat(50)}
Date: ${formatDate(entry.created_at)}
${entry.word_count ? `Words: ${entry.word_count}` : ''}
${entry.emotion_primary ? `Mood: ${entry.emotion_primary}` : ''}
${'-'.repeat(50)}

${entry.entry_content}

${'='.repeat(50)}
Exported from Paceful Journal
    `.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-entry-${new Date(entry.created_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-stone-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <div className="h-6 w-20 bg-stone-200 rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl border border-stone-100 p-8 animate-pulse">
            <div className="h-8 w-1/2 bg-stone-200 rounded mb-4" />
            <div className="h-4 w-1/3 bg-stone-100 rounded mb-8" />
            <div className="space-y-3">
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-3/4" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

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
              Journal
            </Link>

            {!isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="p-2 text-stone-500 hover:text-stone-700 transition-colors"
                  title="Export"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-stone-500 hover:text-stone-700 transition-colors"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-stone-500 hover:text-rose-600 transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {isEditing ? (
            /* Edit Mode */
            <div className="p-6 sm:p-8">
              {/* Title Input */}
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Entry title (optional)"
                className="w-full px-0 py-3 text-2xl font-semibold text-stone-900 placeholder-stone-300 bg-transparent border-0 border-b-2 border-stone-200 focus:border-indigo-500 focus:ring-0"
              />

              {/* Content Textarea */}
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-0 py-6 text-stone-700 bg-transparent border-0 focus:ring-0 resize-none leading-relaxed"
                style={{ minHeight: '300px' }}
              />

              {/* Word count */}
              <div className="py-3 border-t border-stone-100">
                <span className="text-sm text-stone-500">
                  {countWords(editContent)} words
                </span>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              )}

              {/* Edit Actions */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !editContent.trim()}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-stone-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold text-stone-900 mb-2">
                      {entry.entry_title || 'Untitled Entry'}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-stone-500">
                      <span>{formatDate(entry.created_at)}</span>
                      {entry.is_private && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Private
                        </span>
                      )}
                      {entry.status === 'draft' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8">
                <div className="prose prose-stone max-w-none">
                  {entry.entry_content.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-4 text-stone-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Analysis Section */}
              <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                <div className="p-4 bg-stone-50 rounded-xl space-y-4">
                  <h3 className="text-sm font-medium text-stone-700">Entry Analysis</h3>

                  <div className="flex flex-wrap gap-2">
                    {/* Sentiment */}
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getSentimentColor(entry.sentiment_score)}`}>
                      {getSentimentLabel(entry.sentiment_score)}
                      {entry.sentiment_score !== null && (
                        <span className="ml-1 opacity-70">
                          ({entry.sentiment_score >= 0 ? '+' : ''}{entry.sentiment_score.toFixed(2)})
                        </span>
                      )}
                    </span>

                    {/* Primary emotion */}
                    {entry.emotion_primary && (
                      <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        {entry.emotion_primary}
                      </span>
                    )}

                    {/* Secondary emotion */}
                    {entry.emotion_secondary && (
                      <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {entry.emotion_secondary}
                      </span>
                    )}

                    {/* Insights */}
                    {entry.contains_gratitude && (
                      <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                        Gratitude
                      </span>
                    )}
                    {entry.contains_insight && (
                      <span className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">
                        Self-reflection
                      </span>
                    )}
                    {entry.contains_future_thinking && (
                      <span className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                        Forward-looking
                      </span>
                    )}
                  </div>

                  {/* Word count */}
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-sm text-stone-500">
                    <span>{entry.word_count || countWords(entry.entry_content)} words</span>
                    {entry.updated_at !== entry.created_at && (
                      <span>Last edited {new Date(entry.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Delete Entry?</h3>
            <p className="text-stone-600 mb-6">
              This action cannot be undone. Your journal entry will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
