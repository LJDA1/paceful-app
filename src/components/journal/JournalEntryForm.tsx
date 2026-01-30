'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  analyzeText,
  getSentimentLabel,
  getSentimentColors,
  getEmotionEmoji,
  type SentimentLevel,
  type FullAnalysisResult,
} from '@/lib/sentiment-analyzer';

// ============================================================================
// Types
// ============================================================================

interface JournalPrompt {
  id: string;
  prompt_text: string;
  prompt_category: string | null;
}

interface JournalEntryFormProps {
  userId: string;
  onSave?: (entry: SavedEntry) => void;
  onCancel?: () => void;
  initialDraft?: {
    title: string;
    content: string;
    promptId: string | null;
  };
}

export interface SavedEntry {
  id: string;
  entry_title: string | null;
  entry_content: string;
  prompt_id: string | null;
  sentiment_score: number | null;
  emotion_primary: string | null;
  word_count: number;
  created_at: string;
}

// ============================================================================
// Encouragement Messages
// ============================================================================

const encouragements = {
  starting: [
    "Take your time. This is your safe space.",
    "There's no wrong way to feel.",
    "Just start writing. The words will come.",
    "Be gentle with yourself.",
  ],
  writing: [
    "You're doing great. Keep going.",
    "Every word is a step forward.",
    "Your feelings are valid.",
    "This is brave work you're doing.",
    "Keep exploring these thoughts.",
  ],
  struggling: [
    "It's okay to feel this way.",
    "Hard feelings are part of healing.",
    "You're not alone in this.",
    "Acknowledging pain takes courage.",
    "Let it out. This is your space.",
  ],
  positive: [
    "Beautiful! You're making progress.",
    "Your growth is showing.",
    "Keep nurturing these feelings.",
    "This positivity will carry you forward.",
  ],
  insightful: [
    "Wonderful self-awareness.",
    "You're gaining clarity.",
    "These insights are powerful.",
    "Self-reflection builds strength.",
  ],
  finishing: [
    "Well done. You showed up for yourself today.",
    "This entry is a gift to your future self.",
    "Be proud of this moment of reflection.",
  ],
};

function getEncouragement(
  wordCount: number,
  analysis: FullAnalysisResult | null,
  isSaved: boolean
): string {
  if (isSaved) {
    return encouragements.finishing[Math.floor(Math.random() * encouragements.finishing.length)];
  }

  if (wordCount < 10) {
    return encouragements.starting[Math.floor(Math.random() * encouragements.starting.length)];
  }

  if (analysis) {
    // Check for insight
    if (analysis.insights.insightScore > 3) {
      return encouragements.insightful[Math.floor(Math.random() * encouragements.insightful.length)];
    }

    // Check sentiment
    if (analysis.sentiment.level === 'very_negative' || analysis.sentiment.level === 'negative') {
      return encouragements.struggling[Math.floor(Math.random() * encouragements.struggling.length)];
    }

    if (analysis.sentiment.level === 'positive' || analysis.sentiment.level === 'very_positive') {
      return encouragements.positive[Math.floor(Math.random() * encouragements.positive.length)];
    }
  }

  return encouragements.writing[Math.floor(Math.random() * encouragements.writing.length)];
}

// ============================================================================
// Sentiment Preview Component
// ============================================================================

function SentimentPreview({
  analysis,
  wordCount,
}: {
  analysis: FullAnalysisResult | null;
  wordCount: number;
}) {
  if (!analysis || wordCount < 20) return null;

  const colors = getSentimentColors(analysis.sentiment.level as SentimentLevel);
  const label = getSentimentLabel(analysis.sentiment.level as SentimentLevel);
  const primaryEmotion = analysis.emotions.primary;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Sentiment Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} ${colors.text} text-xs font-medium`}>
        <div className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
        {label}
      </div>

      {/* Primary Emotion */}
      {primaryEmotion && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">
          <span>{getEmotionEmoji(primaryEmotion)}</span>
          <span className="capitalize">{primaryEmotion}</span>
        </div>
      )}

      {/* Insight Indicators */}
      {analysis.insights.hasGratitude && (
        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
          Gratitude
        </span>
      )}
      {analysis.insights.hasSelfReflection && (
        <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
          Self-reflection
        </span>
      )}
      {analysis.insights.hasFutureThinking && (
        <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-medium">
          Forward-looking
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Word Count Component
// ============================================================================

function WordCountIndicator({ count }: { count: number }) {
  const getColor = () => {
    if (count < 50) return 'text-stone-400';
    if (count < 100) return 'text-amber-500';
    if (count < 200) return 'text-emerald-500';
    return 'text-teal-500';
  };

  const getMessage = () => {
    if (count < 20) return '';
    if (count < 50) return 'Keep writing...';
    if (count < 100) return 'Good start!';
    if (count < 200) return 'Great reflection!';
    if (count < 300) return 'Deep dive!';
    return 'Comprehensive entry!';
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium tabular-nums ${getColor()}`}>
        {count} words
      </span>
      {getMessage() && <span className="text-xs text-stone-400">{getMessage()}</span>}
    </div>
  );
}

// ============================================================================
// Auto-saving Indicator
// ============================================================================

function AutosaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;

  const config = {
    saving: { text: 'Saving...', color: 'text-stone-400' },
    saved: { text: 'Draft saved', color: 'text-emerald-500' },
    error: { text: 'Save failed', color: 'text-rose-500' },
  };

  const { text, color } = config[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${color}`}>
      {status === 'saving' && (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {status === 'saved' && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
      {text}
    </div>
  );
}

// ============================================================================
// Prompt Selector Component
// ============================================================================

function PromptSelector({
  prompts,
  selectedId,
  onSelect,
  isLoading,
}: {
  prompts: JournalPrompt[];
  selectedId: string | null;
  onSelect: (id: string | null, text: string | null) => void;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <div className="h-12 bg-stone-100 rounded-xl animate-pulse" />;
  }

  if (prompts.length === 0) return null;

  const selectedPrompt = prompts.find(p => p.id === selectedId);

  // Group prompts by category
  const groupedPrompts = prompts.reduce((acc, prompt) => {
    const category = prompt.prompt_category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(prompt);
    return acc;
  }, {} as Record<string, JournalPrompt[]>);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 text-left bg-gradient-to-r from-stone-50 to-amber-50/50 hover:from-stone-100 hover:to-amber-100/50 border border-stone-200 rounded-xl transition-all text-sm group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <span className={selectedPrompt ? 'text-stone-700' : 'text-stone-500'}>
              {selectedPrompt ? 'Writing with prompt' : 'Choose a writing prompt (optional)'}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        {selectedPrompt && (
          <p className="mt-2 text-xs text-stone-500 line-clamp-1 pl-11">
            "{selectedPrompt.prompt_text}"
          </p>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden z-20 max-h-80 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onSelect(null, null);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-stone-500 hover:bg-stone-50 border-b border-stone-100 flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded bg-stone-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                </svg>
              </div>
              Free write (no prompt)
            </button>

            {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-stone-50 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {category}
                </div>
                {categoryPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => {
                      onSelect(prompt.id, prompt.prompt_text);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-amber-50 transition-colors ${
                      selectedId === prompt.id ? 'bg-amber-50 text-amber-700' : 'text-stone-700'
                    }`}
                  >
                    <p className="line-clamp-2">{prompt.prompt_text}</p>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Analysis Panel (shown while writing)
// ============================================================================

function AnalysisPanel({ analysis }: { analysis: FullAnalysisResult | null }) {
  if (!analysis || analysis.language.wordCount < 30) return null;

  const { healingIndicators, insights } = analysis;

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-indigo-700">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
        Writing Insights
      </div>

      <div className="grid grid-cols-2 gap-2">
        {healingIndicators.healthyProcessing && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
            <span>✓</span> Healthy processing
          </div>
        )}
        {healingIndicators.forwardLooking && (
          <div className="flex items-center gap-2 text-xs text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-lg">
            <span>→</span> Forward-looking
          </div>
        )}
        {insights.hasGrowthMindset && (
          <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-lg">
            <span>↑</span> Growth mindset
          </div>
        )}
        {insights.hasAcceptance && (
          <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg">
            <span>☮</span> Acceptance
          </div>
        )}
      </div>

      {healingIndicators.progressScore > 0 && (
        <div className="pt-2 border-t border-indigo-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-indigo-600">Healing Progress</span>
            <span className="font-medium text-indigo-700">{healingIndicators.progressScore}/10</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${healingIndicators.progressScore * 10}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function JournalEntryForm({
  userId,
  onSave,
  onCancel,
  initialDraft,
}: JournalEntryFormProps) {
  // Form state
  const [title, setTitle] = useState(initialDraft?.title || '');
  const [content, setContent] = useState(initialDraft?.content || '');
  const [promptId, setPromptId] = useState<string | null>(initialDraft?.promptId || null);
  const [selectedPromptText, setSelectedPromptText] = useState<string | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<FullAnalysisResult | null>(null);

  // UI state
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef({ title: '', content: '' });

  // Computed values
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!initialDraft) {
      const savedDraft = localStorage.getItem(`journal_draft_${userId}`);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.content) {
            setTitle(draft.title || '');
            setContent(draft.content);
            setPromptId(draft.promptId || null);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [userId, initialDraft]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(300, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  // Debounced sentiment analysis
  useEffect(() => {
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
    }

    if (content.trim().length > 20) {
      analysisTimerRef.current = setTimeout(() => {
        const result = analyzeText(content);
        setAnalysis(result);
      }, 500);
    } else {
      setAnalysis(null);
    }

    return () => {
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
      }
    };
  }, [content]);

  // Update encouragement periodically
  useEffect(() => {
    setEncouragement(getEncouragement(wordCount, analysis, isSaved));
    const interval = setInterval(() => {
      setEncouragement(getEncouragement(wordCount, analysis, isSaved));
    }, 15000);
    return () => clearInterval(interval);
  }, [wordCount, analysis, isSaved]);

  // Fetch prompts
  useEffect(() => {
    async function fetchPrompts() {
      const { data } = await supabase
        .from('journal_prompts')
        .select('id, prompt_text, prompt_category')
        .eq('is_active', true)
        .order('prompt_category');

      setPrompts(data || []);
      setPromptsLoading(false);
    }
    fetchPrompts();
  }, []);

  // Autosave logic
  const saveDraft = useCallback(async () => {
    if (!content.trim()) return;
    if (
      lastSavedContentRef.current.title === title &&
      lastSavedContentRef.current.content === content
    ) {
      return;
    }

    setAutosaveStatus('saving');
    try {
      localStorage.setItem(
        `journal_draft_${userId}`,
        JSON.stringify({ title, content, promptId, updatedAt: new Date().toISOString() })
      );
      lastSavedContentRef.current = { title, content };
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch {
      setAutosaveStatus('error');
    }
  }, [title, content, promptId, userId]);

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

  // Handle prompt selection
  const handlePromptSelect = (id: string | null, text: string | null) => {
    setPromptId(id);
    setSelectedPromptText(text);
  };

  // Handle submit via API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || wordCount < 10 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          entry_title: title.trim() || null,
          entry_content: content.trim(),
          prompt_id: promptId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || data.details || 'Failed to save entry');
      }

      const savedEntry = data;

      // Clear draft from localStorage
      localStorage.removeItem(`journal_draft_${userId}`);
      setIsSaved(true);

      if (onSave) {
        onSave({
          id: savedEntry.id,
          entry_title: savedEntry.entry_title,
          entry_content: savedEntry.entry_content,
          prompt_id: savedEntry.prompt_id,
          sentiment_score: savedEntry.sentiment_score,
          emotion_primary: savedEntry.emotion_primary,
          word_count: savedEntry.word_count,
          created_at: savedEntry.created_at,
        });
      }
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSaved) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-stone-800 mb-2">
            Entry Saved
          </h2>
          <p className="text-stone-600 mb-2">{encouragement}</p>
          {analysis && (
            <p className="text-sm text-emerald-600 mb-8">
              Your ERS score has been updated based on this entry.
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setTitle('');
                setContent('');
                setPromptId(null);
                setSelectedPromptText(null);
                setAnalysis(null);
                setIsSaved(false);
              }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
            >
              Write Another Entry
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-white text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-medium border border-stone-200"
              >
                Back to Journal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-800">New Journal Entry</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <AutosaveIndicator status={autosaveStatus} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Prompt Selector */}
        <PromptSelector
          prompts={prompts}
          selectedId={promptId}
          onSelect={handlePromptSelect}
          isLoading={promptsLoading}
        />

        {/* Selected Prompt Display */}
        {selectedPromptText && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800 italic leading-relaxed">"{selectedPromptText}"</p>
          </div>
        )}

        {/* Title Field */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your entry a title (optional)"
            className="w-full px-0 py-3 text-xl font-medium text-stone-800 placeholder-stone-300 bg-transparent border-0 border-b-2 border-stone-200 focus:border-amber-400 focus:ring-0 transition-colors"
          />
        </div>

        {/* Content Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing... Let your thoughts flow freely. This is your private space to reflect, process, and grow."
            className="w-full px-0 py-4 text-stone-700 placeholder-stone-300 bg-transparent border-0 focus:ring-0 resize-none leading-relaxed text-lg"
            style={{ minHeight: '300px' }}
          />

          {/* Decorative gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
        </div>

        {/* Stats & Analysis Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-t border-stone-100">
            <WordCountIndicator count={wordCount} />
            <SentimentPreview analysis={analysis} wordCount={wordCount} />
          </div>

          {/* Analysis Panel */}
          <AnalysisPanel analysis={analysis} />
        </div>

        {/* Encouragement */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-stone-50 via-amber-50/50 to-stone-50 rounded-xl border border-stone-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💛</span>
          </div>
          <p className="text-sm text-stone-600 italic">{encouragement}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-stone-600 hover:text-stone-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={!content.trim()}
              className="px-4 py-2.5 text-stone-600 hover:text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              Save Draft
            </button>
          </div>

          <button
            type="submit"
            disabled={!content.trim() || wordCount < 10 || isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Save Entry
              </>
            )}
          </button>
        </div>

        {/* Minimum word hint */}
        {content.trim() && wordCount < 10 && (
          <p className="text-xs text-stone-400 text-center">
            Write at least 10 words to save your entry
          </p>
        )}
      </form>

      {/* Privacy Notice */}
      <div className="mt-8 text-center">
        <p className="text-xs text-stone-400 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Your journal entries are private and secure
        </p>
      </div>
    </div>
  );
}
