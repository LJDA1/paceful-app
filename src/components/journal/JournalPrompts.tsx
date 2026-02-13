'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';

// ============================================================================
// Types
// ============================================================================

export interface JournalPrompt {
  id: string;
  prompt_text: string;
  prompt_category: string | null;
  target_stage: string | null;
  is_active: boolean;
}

interface JournalPromptsProps {
  onSelectPrompt: (prompt: JournalPrompt) => void;
  userStage?: 'healing' | 'rebuilding' | 'ready' | null;
  selectedPromptId?: string | null;
  compact?: boolean;
}

type CategoryFilter = 'all' | string;

// ============================================================================
// Category Icons & Colors
// ============================================================================

const categoryConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  'Self-Reflection': { icon: '🪞', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'Gratitude': { icon: '🙏', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  'Growth': { icon: '🌱', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  'Processing': { icon: '💭', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'Future': { icon: '✨', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  'Healing': { icon: '💜', color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-50' },
  'Relationships': { icon: '🤝', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  'General': { icon: '📝', color: 'text-stone-600', bgColor: 'bg-stone-100' },
};

function getCategoryConfig(category: string | null) {
  if (!category) return categoryConfig['General'];
  return categoryConfig[category] || categoryConfig['General'];
}

// ============================================================================
// Prompt of the Day
// ============================================================================

function getPromptOfTheDay(prompts: JournalPrompt[], userStage?: string | null): JournalPrompt | null {
  if (prompts.length === 0) return null;

  // Use the current date to deterministically select a prompt
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Filter prompts by user stage if provided
  let eligiblePrompts = prompts;
  if (userStage) {
    const stagePrompts = prompts.filter(
      (p) => p.target_stage === userStage || p.target_stage === null
    );
    if (stagePrompts.length > 0) {
      eligiblePrompts = stagePrompts;
    }
  }

  // Select based on day of year
  const index = dayOfYear % eligiblePrompts.length;
  return eligiblePrompts[index];
}

// ============================================================================
// Prompt Card Component
// ============================================================================

function PromptCard({
  prompt,
  isSelected,
  isPromptOfDay,
  onSelect,
  compact = false,
}: {
  prompt: JournalPrompt;
  isSelected: boolean;
  isPromptOfDay: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const config = getCategoryConfig(prompt.prompt_category);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl transition-all ${
        compact ? 'p-3' : 'p-4'
      } ${
        isSelected
          ? 'bg-amber-50 border-2 border-amber-400 shadow-md'
          : 'bg-white border border-stone-200 hover:border-amber-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          <span className="text-sm">{config.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {isPromptOfDay && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-medium">
                Today&apos;s Prompt
              </span>
            )}
            {prompt.prompt_category && (
              <span className={`px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} text-xs font-medium`}>
                {prompt.prompt_category}
              </span>
            )}
            {prompt.target_stage && (
              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs">
                {prompt.target_stage}
              </span>
            )}
          </div>

          {/* Prompt Text */}
          <p className={`text-stone-700 leading-relaxed ${compact ? 'text-sm line-clamp-2' : 'text-sm'}`}>
            {prompt.prompt_text}
          </p>
        </div>

        {/* Selected Check */}
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Category Filter Pills
// ============================================================================

function CategoryFilters({
  categories,
  selectedCategory,
  onChange,
}: {
  categories: string[];
  selectedCategory: CategoryFilter;
  onChange: (category: CategoryFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          selectedCategory === 'all'
            ? 'bg-stone-800 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        All Prompts
      </button>
      {categories.map((category) => {
        const config = getCategoryConfig(category);
        const isSelected = selectedCategory === category;
        return (
          <button
            key={category}
            onClick={() => onChange(category)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              isSelected
                ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>{config.icon}</span>
            {category}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`bg-white rounded-xl border border-stone-100 animate-pulse ${compact ? 'p-3' : 'p-4'}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-stone-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-stone-200 rounded-full" />
                <div className="h-5 w-16 bg-stone-100 rounded-full" />
              </div>
              <div className="h-4 w-full bg-stone-100 rounded" />
              <div className="h-4 w-2/3 bg-stone-100 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function JournalPrompts({
  onSelectPrompt,
  userStage,
  selectedPromptId,
  compact = false,
}: JournalPromptsProps) {
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showAll, setShowAll] = useState(false);

  const supabase = createClient();

  // Fetch prompts
  useEffect(() => {
    async function fetchPrompts() {
      const { data, error } = await supabase
        .from('journal_prompts')
        .select('id, prompt_text, prompt_category, target_stage, is_active')
        .eq('is_active', true)
        .order('prompt_category');

      if (!error && data) {
        setPrompts(data);
      }
      setIsLoading(false);
    }
    fetchPrompts();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    prompts.forEach((p) => {
      if (p.prompt_category) cats.add(p.prompt_category);
    });
    return Array.from(cats).sort();
  }, [prompts]);

  // Prompt of the day
  const promptOfDay = useMemo(() => getPromptOfTheDay(prompts, userStage), [prompts, userStage]);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    let filtered = prompts;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.prompt_category === categoryFilter);
    }

    // Stage filter - prioritize user's stage prompts
    if (userStage) {
      filtered = filtered.sort((a, b) => {
        const aMatch = a.target_stage === userStage || a.target_stage === null ? 0 : 1;
        const bMatch = b.target_stage === userStage || b.target_stage === null ? 0 : 1;
        return aMatch - bMatch;
      });
    }

    return filtered;
  }, [prompts, categoryFilter, userStage]);

  // Limit display unless showing all
  const displayedPrompts = showAll ? filteredPrompts : filteredPrompts.slice(0, compact ? 3 : 6);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-stone-800">Writing Prompts</h3>
        <LoadingSkeleton compact={compact} />
      </div>
    );
  }

  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-800">Writing Prompts</h3>
        {prompts.length > 6 && (
          <span className="text-sm text-stone-500">{prompts.length} prompts available</span>
        )}
      </div>

      {/* Prompt of the Day - Featured */}
      {promptOfDay && categoryFilter === 'all' && !compact && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-amber-200 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-transparent rounded-bl-full" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✨</span>
              <h4 className="font-semibold text-amber-800">Prompt of the Day</h4>
            </div>

            <p className="text-stone-700 leading-relaxed mb-4">
              &quot;{promptOfDay.prompt_text}&quot;
            </p>

            <button
              onClick={() => onSelectPrompt(promptOfDay)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                selectedPromptId === promptOfDay.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              {selectedPromptId === promptOfDay.id ? 'Selected!' : 'Write with this prompt'}
            </button>
          </div>
        </div>
      )}

      {/* Category Filters */}
      {categories.length > 1 && !compact && (
        <CategoryFilters
          categories={categories}
          selectedCategory={categoryFilter}
          onChange={setCategoryFilter}
        />
      )}

      {/* Prompts Grid/List */}
      <div className={compact ? 'space-y-2' : 'grid gap-3 sm:grid-cols-2'}>
        {displayedPrompts.map((prompt) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            isSelected={selectedPromptId === prompt.id}
            isPromptOfDay={promptOfDay?.id === prompt.id}
            onSelect={() => onSelectPrompt(prompt)}
            compact={compact}
          />
        ))}
      </div>

      {/* Show More/Less */}
      {filteredPrompts.length > (compact ? 3 : 6) && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-50 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {showAll ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
              </svg>
              Show Less
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
              Show {filteredPrompts.length - (compact ? 3 : 6)} More Prompts
            </>
          )}
        </button>
      )}
    </div>
  );
}
