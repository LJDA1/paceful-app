'use client';

import { useState, useMemo } from 'react';
import {
  getSentimentLabel,
  getSentimentColors,
  getEmotionEmoji,
  type SentimentLevel,
  type EmotionType,
} from '@/lib/sentiment-analyzer';

// ============================================================================
// Types
// ============================================================================

export interface JournalEntry {
  id: string;
  entry_title: string | null;
  entry_content: string;
  sentiment_score: number | null;
  emotion_primary: string | null;
  emotion_secondary?: string | null;
  word_count: number | null;
  has_gratitude?: boolean;
  has_insight?: boolean;
  created_at: string;
}

interface JournalEntriesListProps {
  entries: JournalEntry[];
  onEdit?: (entry: JournalEntry) => void;
  onDelete?: (entryId: string) => void;
  isLoading?: boolean;
}

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';
type DateFilter = 'all' | 'today' | 'week' | 'month';

// ============================================================================
// Utility Functions
// ============================================================================

function getSentimentLevelFromScore(score: number | null): SentimentLevel {
  if (score === null) return 'neutral';
  if (score <= -0.6) return 'very_negative';
  if (score <= -0.3) return 'negative';
  if (score <= -0.1) return 'slightly_negative';
  if (score < 0.1) return 'neutral';
  if (score < 0.3) return 'slightly_positive';
  if (score < 0.6) return 'positive';
  return 'very_positive';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================================
// Search Bar Component
// ============================================================================

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search entries..."
        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-200 rounded-full transition-colors"
        >
          <svg className="w-3 h-3 text-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Filter Pills Component
// ============================================================================

function FilterPills({
  sentimentFilter,
  dateFilter,
  onSentimentChange,
  onDateChange,
}: {
  sentimentFilter: SentimentFilter;
  dateFilter: DateFilter;
  onSentimentChange: (filter: SentimentFilter) => void;
  onDateChange: (filter: DateFilter) => void;
}) {
  const sentimentOptions: { value: SentimentFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Processing' },
  ];

  const dateOptions: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
        {sentimentOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSentimentChange(option.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              sentimentFilter === option.value
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
        {dateOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onDateChange(option.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              dateFilter === option.value
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Entry Card Component
// ============================================================================

function EntryCard({
  entry,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const sentimentLevel = getSentimentLevelFromScore(entry.sentiment_score);
  const colors = getSentimentColors(sentimentLevel);
  const label = getSentimentLabel(sentimentLevel);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${
        isExpanded
          ? 'border-amber-200 shadow-lg'
          : 'border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200'
      }`}
    >
      {/* Header - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Date & Time */}
            <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
              <span className="font-medium text-stone-500">{formatDate(entry.created_at)}</span>
              <span>•</span>
              <span>{formatTime(entry.created_at)}</span>
              {entry.word_count && (
                <>
                  <span>•</span>
                  <span>{entry.word_count} words</span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-stone-800 mb-2 truncate">
              {entry.entry_title || 'Untitled Entry'}
            </h3>

            {/* Preview (collapsed only) */}
            {!isExpanded && (
              <p className="text-stone-600 text-sm line-clamp-2 leading-relaxed">
                {entry.entry_content}
              </p>
            )}
          </div>

          {/* Sentiment Badge & Expand Icon */}
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
              {label}
            </span>
            <svg
              className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {entry.emotion_primary && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-100 text-stone-600 text-xs">
              <span>{getEmotionEmoji(entry.emotion_primary as EmotionType)}</span>
              <span className="capitalize">{entry.emotion_primary}</span>
            </span>
          )}
          {entry.has_gratitude && (
            <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs">
              Gratitude
            </span>
          )}
          {entry.has_insight && (
            <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs">
              Self-reflection
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-stone-100">
          {/* Full Entry Content */}
          <div className="p-5 pt-4">
            <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
              {entry.entry_content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-5 py-3 bg-stone-50 rounded-b-2xl">
            <div className="text-xs text-stone-400">
              {new Date(entry.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                  Edit
                </button>
              )}

              {onDelete && !showDeleteConfirm && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete
                </button>
              )}

              {showDeleteConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-600">Delete this entry?</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                      setShowDeleteConfirm(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse border border-stone-100">
          <div className="flex justify-between mb-3">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-stone-200 rounded" />
              <div className="h-5 w-48 bg-stone-200 rounded" />
            </div>
            <div className="h-6 w-20 bg-stone-100 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-stone-100 rounded" />
            <div className="h-4 w-3/4 bg-stone-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-stone-700 mb-2">No matching entries</h3>
        <p className="text-stone-500 text-sm mb-4">Try adjusting your filters or search terms.</p>
        <button
          onClick={onClearFilters}
          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
        >
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-stone-700 mb-2">Your Journal Awaits</h3>
      <p className="text-stone-500 text-sm">
        Start writing to capture your thoughts and track your healing journey.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function JournalEntriesList({
  entries,
  onEdit,
  onDelete,
  isLoading = false,
}: JournalEntriesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = entry.entry_title?.toLowerCase().includes(query);
        const matchesContent = entry.entry_content.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent) return false;
      }

      // Sentiment filter
      if (sentimentFilter !== 'all') {
        const score = entry.sentiment_score ?? 0;
        if (sentimentFilter === 'positive' && score < 0.1) return false;
        if (sentimentFilter === 'neutral' && (score < -0.1 || score >= 0.1)) return false;
        if (sentimentFilter === 'negative' && score >= -0.1) return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const entryDate = new Date(entry.created_at);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === 'today') {
          if (entryDate < startOfDay) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(startOfDay);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (entryDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(startOfDay);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (entryDate < monthAgo) return false;
        }
      }

      return true;
    });
  }, [entries, searchQuery, sentimentFilter, dateFilter]);

  const hasFilters = searchQuery !== '' || sentimentFilter !== 'all' || dateFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSentimentFilter('all');
    setDateFilter('all');
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <FilterPills
            sentimentFilter={sentimentFilter}
            dateFilter={dateFilter}
            onSentimentChange={setSentimentFilter}
            onDateChange={setDateFilter}
          />
        </div>
      )}

      {/* Results Count */}
      {hasFilters && filteredEntries.length > 0 && (
        <p className="text-sm text-stone-500">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
      )}

      {/* Entries List */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onEdit={onEdit ? () => onEdit(entry) : undefined}
              onDelete={onDelete ? () => onDelete(entry.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
      )}
    </div>
  );
}
