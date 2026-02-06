'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DEMO_USER_ID } from '@/lib/constants';
import QuickMoodLog from '@/components/mood/QuickMoodLog';
import {
  fetchMoodEntries,
  calculateMoodStats,
  calculateDailySummaries,
  getEntriesForDate,
  getMoodColor,
  getMoodHexColor,
  getMoodLabel,
  type MoodEntry,
  type MoodStats,
  type DailyMoodSummary,
} from '@/lib/mood-calculator';

// ============================================================================
// Stats Cards
// ============================================================================

function StatsCards({ stats, isLoading }: { stats: MoodStats; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-stone-100 animate-pulse">
            <div className="h-8 w-12 bg-stone-200 rounded mb-1" />
            <div className="h-4 w-20 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const trendIcon =
    stats.trend === 'improving' ? (
      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ) : stats.trend === 'declining' ? (
      <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    );

  const avgColors = getMoodColor(stats.averageMood);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl p-4 border border-stone-100">
        <div className={`text-2xl font-bold ${avgColors.text}`}>{stats.averageMood || '-'}</div>
        <p className="text-sm text-stone-500">Average Mood</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-stone-100">
        <div className="flex items-center gap-2">
          {trendIcon}
          <span className={`text-lg font-bold ${
            stats.trend === 'improving' ? 'text-emerald-600' :
            stats.trend === 'declining' ? 'text-rose-600' : 'text-stone-600'
          }`}>
            {stats.trend === 'stable' ? 'Stable' : `${Math.abs(stats.trendPercentage)}%`}
          </span>
        </div>
        <p className="text-sm text-stone-500 capitalize">{stats.trend} Trend</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-stone-100">
        <div className="text-2xl font-bold text-stone-800">{stats.entryCount}</div>
        <p className="text-sm text-stone-500">Entries (30d)</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-stone-100">
        <div className="text-lg font-bold text-indigo-600 capitalize">{stats.mostCommonEmotion || '-'}</div>
        <p className="text-sm text-stone-500">Top Emotion</p>
      </div>
    </div>
  );
}

// ============================================================================
// Mini Line Chart (30-day trend)
// ============================================================================

function TrendChart({ dailySummaries }: { dailySummaries: DailyMoodSummary[] }) {
  if (dailySummaries.length < 2) {
    return (
      <div className="bg-white rounded-xl p-4 border border-stone-100">
        <h3 className="text-sm font-medium text-stone-700 mb-3">30-Day Mood Trend</h3>
        <div className="h-32 flex items-center justify-center text-stone-400 text-sm">
          Log more moods to see your trend
        </div>
      </div>
    );
  }

  const maxMood = 10;
  const chartHeight = 100;
  const chartWidth = 100;

  // Create points for the line
  const points = dailySummaries.map((summary, index) => {
    const x = (index / (dailySummaries.length - 1)) * chartWidth;
    const y = chartHeight - (summary.averageMood / maxMood) * chartHeight;
    return { x, y, mood: summary.averageMood, date: summary.date };
  });

  // Create SVG path
  const pathD = points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(' ');

  // Create area path (for fill)
  const areaD = `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <div className="bg-white rounded-xl p-4 border border-stone-100">
      <h3 className="text-sm font-medium text-stone-700 mb-3">30-Day Mood Trend</h3>
      <div className="relative h-32">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1={chartHeight * 0.3} x2={chartWidth} y2={chartHeight * 0.3} stroke="#e7e5e4" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1={chartHeight * 0.6} x2={chartWidth} y2={chartHeight * 0.6} stroke="#e7e5e4" strokeWidth="0.5" strokeDasharray="2" />

          {/* Area fill */}
          <path d={areaD} fill="url(#gradient)" opacity="0.3" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={getMoodHexColor(point.mood)}
              stroke="white"
              strokeWidth="1.5"
            />
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-stone-400 -ml-6">
          <span>10</span>
          <span>5</span>
          <span>1</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-stone-400">
        <span>{dailySummaries[0]?.date.slice(5) || ''}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ============================================================================
// Calendar View
// ============================================================================

function CalendarView({
  dailySummaries,
  selectedDate,
  onSelectDate,
}: {
  dailySummaries: DailyMoodSummary[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Create lookup map for daily summaries
  const summaryMap = useMemo(() => {
    const map = new Map<string, DailyMoodSummary>();
    dailySummaries.forEach((s) => map.set(s.date, s));
    return map;
  }, [dailySummaries]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    // Add padding for days before first of month
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(viewYear, viewMonth, d));
    }

    return days;
  }, [viewMonth, viewYear]);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-stone-800">{monthName}</h3>
        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-stone-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = date.toISOString().split('T')[0];
          const summary = summaryMap.get(dateStr);
          const isToday = dateStr === today.toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          const isFuture = date > today;
          const colors = summary ? getMoodColor(summary.averageMood) : null;

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && onSelectDate(dateStr)}
              disabled={isFuture}
              className={`aspect-square rounded-lg text-sm font-medium flex items-center justify-center transition-all ${
                isSelected
                  ? 'ring-2 ring-indigo-500 ring-offset-1'
                  : ''
              } ${
                isFuture
                  ? 'text-stone-300 cursor-not-allowed'
                  : summary
                  ? `${colors?.bg} ${colors?.text} hover:opacity-80`
                  : isToday
                  ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-200" />
          <span className="text-xs text-stone-500">1-3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-200" />
          <span className="text-xs text-stone-500">4-6</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-200" />
          <span className="text-xs text-stone-500">7-10</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Day Detail Panel
// ============================================================================

function DayDetailPanel({
  date,
  entries,
  isLoading,
  onClose,
}: {
  date: string;
  entries: MoodEntry[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <h3 className="font-medium text-stone-800">{formattedDate}</h3>
        <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg transition-colors">
          <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-stone-500 text-sm text-center py-4">No mood entries for this day</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const colors = getMoodColor(entry.mood_score);
              const time = new Date(entry.logged_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              return (
                <div key={entry.id} className={`p-3 rounded-lg ${colors.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-lg font-bold ${colors.text}`}>
                      {entry.mood_score} - {getMoodLabel(entry.mood_score)}
                    </div>
                    <span className="text-xs text-stone-500">{time}</span>
                  </div>
                  {entry.emotions && entry.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {entry.emotions.map((emotion) => (
                        <span
                          key={emotion}
                          className="px-2 py-0.5 text-xs rounded-full bg-white/50 text-stone-600 capitalize"
                        >
                          {emotion}
                        </span>
                      ))}
                    </div>
                  )}
                  {entry.note && <p className="text-sm text-stone-600">{entry.note}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Emotion Filter
// ============================================================================

function EmotionFilter({
  emotions,
  selectedEmotion,
  onChange,
}: {
  emotions: string[];
  selectedEmotion: string | null;
  onChange: (emotion: string | null) => void;
}) {
  if (emotions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-4 border border-stone-100">
      <h3 className="text-sm font-medium text-stone-700 mb-3">Filter by Emotion</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            selectedEmotion === null
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          All
        </button>
        {emotions.map((emotion) => (
          <button
            key={emotion}
            onClick={() => onChange(emotion)}
            className={`px-3 py-1.5 text-sm rounded-full capitalize transition-colors ${
              selectedEmotion === emotion
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {emotion}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailyMoodSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateEntries, setDateEntries] = useState<MoodEntry[]>([]);
  const [isLoadingDate, setIsLoadingDate] = useState(false);
  const [emotionFilter, setEmotionFilter] = useState<string | null>(null);

  // Fetch mood data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const fetchedEntries = await fetchMoodEntries(DEMO_USER_ID, 60);
    setEntries(fetchedEntries);

    const calculatedStats = calculateMoodStats(fetchedEntries);
    setStats(calculatedStats);

    const summaries = calculateDailySummaries(fetchedEntries, 60);
    setDailySummaries(summaries);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch entries for selected date
  useEffect(() => {
    if (selectedDate) {
      setIsLoadingDate(true);
      getEntriesForDate(DEMO_USER_ID, selectedDate).then((entries) => {
        setDateEntries(entries);
        setIsLoadingDate(false);
      });
    }
  }, [selectedDate]);

  // Get unique emotions for filter
  const uniqueEmotions = useMemo(() => {
    const emotionSet = new Set<string>();
    entries.forEach((e) => e.emotions?.forEach((em) => emotionSet.add(em)));
    return Array.from(emotionSet).sort();
  }, [entries]);

  // Filter summaries by emotion
  const filteredSummaries = useMemo(() => {
    if (!emotionFilter) return dailySummaries;
    return dailySummaries.filter((s) => s.emotions.includes(emotionFilter));
  }, [dailySummaries, emotionFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">Mood Tracker</h1>
              <p className="text-stone-500 mt-0.5 text-sm sm:text-base">Track your emotional patterns</p>
            </div>
            <QuickMoodLog userId={DEMO_USER_ID} onSave={fetchData} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <StatsCards stats={stats || { averageMood: 0, moodVariance: 0, entryCount: 0, trend: 'stable', trendPercentage: 0, highestMood: 0, lowestMood: 0, mostCommonEmotion: null }} isLoading={isLoading} />

        {/* Trend Chart */}
        <TrendChart dailySummaries={filteredSummaries} />

        {/* Emotion Filter */}
        <EmotionFilter
          emotions={uniqueEmotions}
          selectedEmotion={emotionFilter}
          onChange={setEmotionFilter}
        />

        {/* Calendar & Day Detail */}
        <div className="grid md:grid-cols-2 gap-6">
          <CalendarView
            dailySummaries={filteredSummaries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {selectedDate ? (
            <DayDetailPanel
              date={selectedDate}
              entries={dateEntries}
              isLoading={isLoadingDate}
              onClose={() => setSelectedDate(null)}
            />
          ) : (
            <div className="bg-stone-50 rounded-xl border border-stone-200 border-dashed flex items-center justify-center p-8">
              <p className="text-stone-400 text-sm text-center">
                Select a date on the calendar to view entries
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
