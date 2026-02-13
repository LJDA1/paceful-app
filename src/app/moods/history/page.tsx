'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
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
// Types
// ============================================================================

interface DayOfWeekStats {
  day: string;
  dayIndex: number;
  avgMood: number;
  entryCount: number;
}

// ============================================================================
// Stats Overview Cards
// ============================================================================

function StatsOverview({ stats, isLoading }: { stats: MoodStats | null; isLoading: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-stone-200 animate-pulse">
            <div className="h-8 w-12 bg-stone-200 rounded mb-1" />
            <div className="h-4 w-20 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const avgColors = getMoodColor(stats.averageMood || 5);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className={`text-3xl font-bold ${avgColors.text}`}>
          {stats.averageMood?.toFixed(1) || '-'}
        </div>
        <p className="text-sm text-stone-500">Average Mood</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className="flex items-center gap-2">
          {stats.trend === 'improving' ? (
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          ) : stats.trend === 'declining' ? (
            <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          )}
          <span className={`text-xl font-bold ${
            stats.trend === 'improving' ? 'text-emerald-600' :
            stats.trend === 'declining' ? 'text-rose-600' : 'text-stone-600'
          }`}>
            {stats.trend === 'stable' ? 'Stable' : `${Math.abs(stats.trendPercentage)}%`}
          </span>
        </div>
        <p className="text-sm text-stone-500 capitalize">{stats.trend} Trend</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className="text-3xl font-bold text-stone-800">{stats.entryCount}</div>
        <p className="text-sm text-stone-500">Total Entries</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className="text-3xl font-bold text-amber-600">{stats.moodVariance?.toFixed(1) || '-'}</div>
        <p className="text-sm text-stone-500">Variance</p>
      </div>
    </div>
  );
}

// ============================================================================
// 30-Day Trend Chart
// ============================================================================

function TrendChart({ summaries, isLoading }: { summaries: DailyMoodSummary[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 border border-stone-200">
        <div className="h-5 w-40 bg-stone-200 rounded mb-4" />
        <div className="h-48 bg-stone-100 rounded animate-pulse" />
      </div>
    );
  }

  if (summaries.length < 2) {
    return (
      <div className="bg-white rounded-xl p-5 border border-stone-200">
        <h3 className="font-semibold text-stone-800 mb-4">30-Day Mood Trend</h3>
        <div className="h-48 flex items-center justify-center text-stone-500">
          Log more moods to see your trend chart
        </div>
      </div>
    );
  }

  const chartHeight = 160;
  const chartWidth = 100;
  const padding = { top: 10, bottom: 20, left: 8, right: 8 };

  const points = summaries.map((s, i) => ({
    x: padding.left + (i / (summaries.length - 1)) * (chartWidth - padding.left - padding.right),
    y: padding.top + ((10 - s.averageMood) / 10) * (chartHeight - padding.top - padding.bottom),
    mood: s.averageMood,
    date: s.date,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`;

  return (
    <div className="bg-white rounded-xl p-5 border border-stone-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-800">30-Day Mood Trend</h3>
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span>High: <span className="font-semibold text-emerald-600">{Math.max(...summaries.map(s => s.averageMood)).toFixed(1)}</span></span>
          <span>Low: <span className="font-semibold text-rose-600">{Math.min(...summaries.map(s => s.averageMood)).toFixed(1)}</span></span>
        </div>
      </div>

      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-5 w-6 flex flex-col justify-between text-xs text-stone-400">
          <span>10</span>
          <span>5</span>
          <span>1</span>
        </div>

        {/* Chart */}
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full ml-6"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[2, 4, 6, 8].map((v) => (
            <line
              key={v}
              x1={padding.left}
              y1={padding.top + ((10 - v) / 10) * (chartHeight - padding.top - padding.bottom)}
              x2={chartWidth - padding.right}
              y2={padding.top + ((10 - v) / 10) * (chartHeight - padding.top - padding.bottom)}
              stroke="#e7e5e4"
              strokeWidth="0.3"
              strokeDasharray="2"
            />
          ))}

          {/* Gradient area */}
          <defs>
            <linearGradient id="moodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#moodGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill={getMoodHexColor(p.mood)}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between ml-6 mt-1 text-xs text-stone-400">
        <span>{summaries[0]?.date.slice(5)}</span>
        <span>{summaries[Math.floor(summaries.length / 2)]?.date.slice(5)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ============================================================================
// Variance Analysis
// ============================================================================

function VarianceAnalysis({ stats, summaries }: { stats: MoodStats | null; summaries: DailyMoodSummary[] }) {
  if (!stats || summaries.length < 7) {
    return null;
  }

  const variance = stats.moodVariance;
  const stabilityLevel = variance < 1 ? 'Very Stable' : variance < 2 ? 'Stable' : variance < 3 ? 'Moderate' : 'Variable';
  const stabilityColor = variance < 1 ? 'text-emerald-600' : variance < 2 ? 'text-emerald-500' : variance < 3 ? 'text-amber-500' : 'text-rose-500';
  const stabilityBg = variance < 1 ? 'bg-emerald-100' : variance < 2 ? 'bg-emerald-50' : variance < 3 ? 'bg-amber-50' : 'bg-rose-50';

  // Calculate mood range
  const moodRange = stats.highestMood - stats.lowestMood;

  return (
    <div className="bg-white rounded-xl p-5 border border-stone-200">
      <h3 className="font-semibold text-stone-800 mb-4">Mood Stability Analysis</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`p-4 rounded-xl ${stabilityBg}`}>
          <div className={`text-2xl font-bold ${stabilityColor}`}>{stabilityLevel}</div>
          <p className="text-sm text-stone-600">Stability Level</p>
        </div>
        <div className="p-4 rounded-xl bg-stone-50">
          <div className="text-2xl font-bold text-stone-800">{moodRange}</div>
          <p className="text-sm text-stone-600">Mood Range (High-Low)</p>
        </div>
      </div>

      {/* Variance meter */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Variance Score</span>
          <span className="font-medium text-stone-800">{variance.toFixed(2)}</span>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              variance < 1 ? 'bg-emerald-500' : variance < 2 ? 'bg-emerald-400' : variance < 3 ? 'bg-amber-400' : 'bg-rose-400'
            }`}
            style={{ width: `${Math.min(variance * 20, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-400">
          <span>Very Stable</span>
          <span>Variable</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-stone-600">
        {variance < 2
          ? 'Your mood has been relatively consistent. This stability is a positive sign for emotional regulation.'
          : 'Your mood shows some variability. This is normal during recovery. Continue tracking to identify patterns.'}
      </p>
    </div>
  );
}

// ============================================================================
// Best/Worst Days Analysis
// ============================================================================

function DayOfWeekAnalysis({ entries }: { entries: MoodEntry[] }) {
  const dayStats = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayData: DayOfWeekStats[] = days.map((day, i) => ({
      day,
      dayIndex: i,
      avgMood: 0,
      entryCount: 0,
    }));

    // Group entries by day of week
    const dayMoods: number[][] = [[], [], [], [], [], [], []];
    entries.forEach((entry) => {
      const dayIndex = new Date(entry.logged_at).getDay();
      dayMoods[dayIndex].push(entry.mood_score);
    });

    // Calculate averages
    dayData.forEach((d, i) => {
      const moods = dayMoods[i];
      d.entryCount = moods.length;
      d.avgMood = moods.length > 0
        ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10
        : 0;
    });

    return dayData;
  }, [entries]);

  const sortedByMood = [...dayStats].filter(d => d.entryCount > 0).sort((a, b) => b.avgMood - a.avgMood);
  const bestDay = sortedByMood[0];
  const worstDay = sortedByMood[sortedByMood.length - 1];

  if (entries.length < 7) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-stone-200">
      <h3 className="font-semibold text-stone-800 mb-4">Day of Week Patterns</h3>

      {/* Best/Worst summary */}
      {bestDay && worstDay && bestDay.day !== worstDay.day && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
              <span className="font-semibold text-emerald-700">Best Day</span>
            </div>
            <div className="text-lg font-bold text-emerald-800">{bestDay.day}</div>
            <div className="text-sm text-emerald-600">Avg: {bestDay.avgMood}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
              </svg>
              <span className="font-semibold text-rose-700">Challenging Day</span>
            </div>
            <div className="text-lg font-bold text-rose-800">{worstDay.day}</div>
            <div className="text-sm text-rose-600">Avg: {worstDay.avgMood}</div>
          </div>
        </div>
      )}

      {/* Day chart */}
      <div className="space-y-2">
        {dayStats.map((d) => {
          const colors = d.avgMood > 0 ? getMoodColor(d.avgMood) : { bg: 'bg-stone-100', text: 'text-stone-400' };
          const widthPercent = d.avgMood > 0 ? (d.avgMood / 10) * 100 : 0;

          return (
            <div key={d.day} className="flex items-center gap-3">
              <div className="w-12 text-sm text-stone-600">{d.day.slice(0, 3)}</div>
              <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                {d.avgMood > 0 && (
                  <div
                    className={`h-full rounded-full ${colors.bg} flex items-center justify-end pr-2`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className={`text-xs font-medium ${colors.text}`}>{d.avgMood}</span>
                  </div>
                )}
              </div>
              <div className="w-8 text-xs text-stone-400 text-right">{d.entryCount}</div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-400 mt-2 text-right">entries per day</p>
    </div>
  );
}

// ============================================================================
// Calendar View
// ============================================================================

function CalendarView({
  summaries,
  selectedDate,
  onSelectDate,
}: {
  summaries: DailyMoodSummary[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  // Initialize to 0 to prevent hydration mismatch, then set client-side
  const [viewMonth, setViewMonth] = useState(0);
  const [viewYear, setViewYear] = useState(2024);
  const [isInitialized, setIsInitialized] = useState(false);
  const [monthName, setMonthName] = useState('');
  const [todayStr, setTodayStr] = useState('');
  const [todayDate, setTodayDate] = useState<Date | null>(null);

  // Set initial values client-side to prevent hydration mismatch
  useEffect(() => {
    const today = new Date();
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setTodayStr(today.toISOString().split('T')[0]);
    setTodayDate(today);
    setIsInitialized(true);
  }, []);

  // Update month name client-side
  useEffect(() => {
    if (isInitialized) {
      setMonthName(new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
  }, [viewMonth, viewYear, isInitialized]);

  const summaryMap = useMemo(() => {
    const map = new Map<string, DailyMoodSummary>();
    summaries.forEach((s) => map.set(s.date, s));
    return map;
  }, [summaries]);

  const calendarDays = useMemo(() => {
    if (!isInitialized) return [];
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(viewYear, viewMonth, d));
    }

    return days;
  }, [viewMonth, viewYear, isInitialized]);

  return (
    <div className="bg-white rounded-xl p-5 border border-stone-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (viewMonth === 0) {
              setViewMonth(11);
              setViewYear(viewYear - 1);
            } else {
              setViewMonth(viewMonth - 1);
            }
          }}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="font-semibold text-stone-800">{monthName}</h3>
        <button
          onClick={() => {
            if (viewMonth === 11) {
              setViewMonth(0);
              setViewYear(viewYear + 1);
            } else {
              setViewMonth(viewMonth + 1);
            }
          }}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-stone-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

          const dateStr = date.toISOString().split('T')[0];
          const summary = summaryMap.get(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isFuture = todayDate ? date > todayDate : false;
          const colors = summary ? getMoodColor(summary.averageMood) : null;

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && summary && onSelectDate(dateStr)}
              disabled={isFuture || !summary}
              className={`aspect-square rounded-lg text-sm font-medium flex items-center justify-center transition-all ${
                isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
              } ${
                isFuture
                  ? 'text-stone-300 cursor-not-allowed'
                  : summary
                  ? `${colors?.bg} ${colors?.text} hover:opacity-80 cursor-pointer`
                  : isToday
                  ? 'bg-stone-100 text-stone-800'
                  : 'text-stone-400'
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
  const [formattedDate, setFormattedDate] = useState('');
  const [entryTimes, setEntryTimes] = useState<Record<string, string>>({});

  // Format date client-side to prevent hydration mismatch
  useEffect(() => {
    setFormattedDate(new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }));
  }, [date]);

  // Format entry times client-side
  useEffect(() => {
    const times: Record<string, string> = {};
    entries.forEach((entry) => {
      times[entry.id] = new Date(entry.logged_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    });
    setEntryTimes(times);
  }, [entries]);

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-800">{formattedDate}</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-stone-500 text-sm text-center py-8">No entries for this day</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const colors = getMoodColor(entry.mood_score);

              return (
                <div key={entry.id} className={`p-4 rounded-xl ${colors.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-xl font-bold ${colors.text}`}>
                      {entry.mood_score} - {getMoodLabel(entry.mood_score)}
                    </div>
                    <span className="text-sm text-stone-500">{entryTimes[entry.id] || ''}</span>
                  </div>
                  {entry.emotions && entry.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {entry.emotions.map((emotion) => (
                        <span
                          key={emotion}
                          className="px-2 py-0.5 text-xs rounded-full bg-white/60 text-stone-700 capitalize"
                        >
                          {emotion}
                        </span>
                      ))}
                    </div>
                  )}
                  {entry.note && <p className="text-sm text-stone-600 mt-2">{entry.note}</p>}
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
// Main Page
// ============================================================================

export default function MoodHistoryPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [summaries, setSummaries] = useState<DailyMoodSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateEntries, setDateEntries] = useState<MoodEntry[]>([]);
  const [isLoadingDate, setIsLoadingDate] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const fetchedEntries = await fetchMoodEntries(userId, 60);
    setEntries(fetchedEntries);

    const calculatedStats = calculateMoodStats(fetchedEntries);
    setStats(calculatedStats);

    const dailySummaries = calculateDailySummaries(fetchedEntries, 60);
    setSummaries(dailySummaries);

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  useEffect(() => {
    if (selectedDate && userId) {
      setIsLoadingDate(true);
      getEntriesForDate(userId, selectedDate).then((entries) => {
        setDateEntries(entries);
        setIsLoadingDate(false);
      });
    }
  }, [selectedDate, userId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">Mood History</h1>
              <p className="text-stone-500 text-sm">Track your patterns over time</p>
            </div>
            <Link
              href="/moods"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Log Mood
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <StatsOverview stats={stats} isLoading={isLoading} />

        {/* Trend Chart */}
        <TrendChart summaries={summaries} isLoading={isLoading} />

        {/* Two column layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Variance Analysis */}
          <VarianceAnalysis stats={stats} summaries={summaries} />

          {/* Day of Week Analysis */}
          <DayOfWeekAnalysis entries={entries} />
        </div>

        {/* Calendar and Detail */}
        <div className="grid md:grid-cols-2 gap-6">
          <CalendarView
            summaries={summaries}
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
            <div className="bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center p-8">
              <p className="text-stone-500 text-center">
                Select a colored date on the calendar to view entries
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
