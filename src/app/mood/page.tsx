'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-browser';
import {
  fetchMoodEntries,
  getMoodLabel,
  type MoodEntry,
} from '@/lib/mood-calculator';
import { trackEvent } from '@/lib/track';
import { EmptyState, HeartIcon as EmptyHeartIcon } from '@/components/ui/EmptyState';
import {
  calculateStreak,
  getMilestones,
  getNewlyAchievedMilestones,
  type Milestone,
} from '@/lib/streaks';
import MilestoneToast from '@/components/MilestoneToast';

// ============================================================================
// Mood Configuration
// ============================================================================

const moodOptions = [
  { value: 2, label: 'Struggling', description: 'Having a hard time', color: '#7E71B5' },
  { value: 4, label: 'Low', description: 'Feeling down', color: '#5E8DB0' },
  { value: 6, label: 'Okay', description: 'Getting by', color: '#D4973B' },
  { value: 8, label: 'Good', description: 'Feeling positive', color: '#7BA896' },
  { value: 10, label: 'Great', description: 'Thriving today', color: '#5B8A72' },
];

const triggerOptions = [
  'Sleep quality', 'Social interaction', 'Exercise', 'Memories', 'Loneliness',
  'Work stress', 'Felt progress', 'Music/media', 'Time outdoors', 'Therapy/reflection',
];

function getMoodColor(score: number): string {
  if (score <= 2) return '#7E71B5';
  if (score <= 4) return '#5E8DB0';
  if (score <= 6) return '#D4973B';
  if (score <= 8) return '#7BA896';
  return '#5B8A72';
}

// ============================================================================
// Icons
// ============================================================================

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function FireIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  );
}

function ChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function MoodPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab state
  const [tab, setTab] = useState<'log' | 'history'>('log');

  // New mood state
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Milestone toast state
  const [showMilestoneToast, setShowMilestoneToast] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);

  const supabase = createClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch mood data
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const fetchedEntries = await fetchMoodEntries(userId, 30);
    setEntries(fetchedEntries);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  // Save mood
  const handleSaveMood = async () => {
    if (!userId || selectedMood === null) return;

    setIsSaving(true);
    try {
      // Get mood label based on score
      const moodLabel = selectedMood <= 3 ? 'low' : selectedMood <= 6 ? 'moderate' : 'high';

      // Get time of day
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

      // Combine note with triggers if note is provided
      let triggerDescription = note.trim() || null;
      if (triggers.length > 0 && triggerDescription) {
        triggerDescription = `${triggerDescription} [triggers: ${triggers.join(', ')}]`;
      } else if (triggers.length > 0) {
        triggerDescription = `[triggers: ${triggers.join(', ')}]`;
      }

      const { error } = await supabase.from('mood_entries').insert({
        user_id: userId,
        mood_value: selectedMood,
        mood_label: moodLabel,
        emotions: triggers.length > 0 ? triggers : null,
        trigger_description: triggerDescription,
        time_of_day: timeOfDay,
      });

      if (error) {
        console.error('Error saving mood:', error);
        alert('Failed to save mood. Please try again.');
        setIsSaving(false);
        return;
      }

      // Trigger ERS recalculation in background (fire-and-forget)
      fetch('/api/ers/calculate', {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {}); // Ignore errors

      // Track mood logged event
      trackEvent('mood_logged', {
        score: selectedMood,
        hasTriggers: triggers.length > 0,
        hasNote: note.trim().length > 0,
      });

      setSaved(true);

      // Check for new milestones after saving
      try {
        // Fetch all mood dates for streak calculation
        const { data: allMoods } = await supabase
          .from('mood_entries')
          .select('logged_at')
          .eq('user_id', userId)
          .gte('logged_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('logged_at', { ascending: false });

        const moodDates = allMoods?.map(m => m.logged_at) || [];
        const streak = calculateStreak(moodDates);
        const totalDays = new Set(moodDates.map(d => new Date(d).toISOString().split('T')[0])).size;

        // Get milestones (simplified - just streak milestones for mood page)
        const computedMilestones = getMilestones(totalDays, 0, 0, streak.current, 0);
        const streakMilestones = computedMilestones.filter(m => m.category === 'streak');

        // Check for newly achieved milestones
        const celebratedKey = 'paceful_celebrated_milestones';
        const celebrated = JSON.parse(localStorage.getItem(celebratedKey) || '[]');
        const newlyAchieved = getNewlyAchievedMilestones(streakMilestones, celebrated);

        if (newlyAchieved.length > 0) {
          // Show first new milestone after save animation
          setTimeout(() => {
            setCurrentMilestone(newlyAchieved[0]);
            setShowMilestoneToast(true);
            // Mark as celebrated
            localStorage.setItem(celebratedKey, JSON.stringify([...celebrated, newlyAchieved[0].id]));
          }, 2000);
        }
      } catch (err) {
        // Ignore milestone check errors
      }

      setTimeout(() => {
        setSelectedMood(null);
        setNote('');
        setTriggers([]);
        setSaved(false);
        fetchData();
      }, 2500);
    } catch (err) {
      console.error('Error saving mood:', err);
      alert('Failed to save mood. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle trigger
  const toggleTrigger = (trigger: string) => {
    setTriggers(prev =>
      prev.includes(trigger)
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  // Format date - client-side only to prevent hydration mismatch
  const [dateString, setDateString] = useState('');
  useEffect(() => {
    setDateString(new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }));
  }, []);

  // Format entry times - client-side only
  const [entryTimes, setEntryTimes] = useState<Record<string, string>>({});
  useEffect(() => {
    const times: Record<string, string> = {};
    entries.forEach((entry) => {
      times[entry.id] = new Date(entry.logged_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    });
    setEntryTimes(times);
  }, [entries]);

  // Week data for history chart - client-side only to prevent hydration mismatch
  const [weekData, setWeekData] = useState<{ day: string; score: number | null; date: string }[]>([]);
  useEffect(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekEntries: { day: string; score: number | null; date: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayEntries = entries.filter(e => e.logged_at.startsWith(dateStr));
      const avgScore = dayEntries.length > 0
        ? dayEntries.reduce((sum, e) => sum + e.mood_score, 0) / dayEntries.length
        : null;
      weekEntries.push({
        day: days[date.getDay()],
        score: avgScore,
        date: dateStr,
      });
    }
    setWeekData(weekEntries);
  }, [entries]);

  // Stats for history - client-side only to prevent hydration mismatch
  const [stats, setStats] = useState<{ avg: number; streak: number; common: string }>({ avg: 0, streak: 0, common: 'N/A' });
  useEffect(() => {
    if (entries.length === 0) {
      setStats({ avg: 0, streak: 0, common: 'N/A' });
      return;
    }

    const avg = entries.reduce((sum, e) => sum + e.mood_score, 0) / entries.length;

    // Calculate streak
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const dates = [...new Set(entries.map(e => e.logged_at.split('T')[0]))].sort().reverse();
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (dates[i] === expected.toISOString().split('T')[0]) {
        streak++;
      } else {
        break;
      }
    }

    // Most common mood
    const moodCounts: Record<string, number> = {};
    entries.forEach(e => {
      const label = getMoodLabel(e.mood_score);
      moodCounts[label] = (moodCounts[label] || 0) + 1;
    });
    const common = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    setStats({ avg, streak, common });
  }, [entries]);

  // Parse triggers from note or emotions array
  const parseTriggers = (entry: MoodEntry): string[] => {
    // First check the emotions array from the entry
    if (entry.emotions && entry.emotions.length > 0) {
      return entry.emotions;
    }
    // Fallback: parse from note string (legacy format)
    const noteStr = entry.note;
    if (!noteStr) return [];
    // Try JSON format first (old format)
    try {
      const parsed = JSON.parse(noteStr);
      return parsed.triggers || [];
    } catch {
      // Try [triggers: ...] format
      const match = noteStr.match(/\[triggers:\s*([^\]]+)\]/);
      if (match) {
        return match[1].split(',').map(t => t.trim());
      }
      return [];
    }
  };

  const parseNoteText = (noteStr: string | null): string => {
    if (!noteStr) return '';
    // Try JSON format first (old format)
    try {
      const parsed = JSON.parse(noteStr);
      return parsed.text || noteStr;
    } catch {
      // Remove [triggers: ...] suffix if present
      return noteStr.replace(/\s*\[triggers:[^\]]+\]$/, '').trim();
    }
  };

  return (
    <div className="min-h-screen pb-36 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-6">

        {/* Tab Switcher */}
        <div
          className="flex p-1 rounded-xl mb-6"
          style={{ background: 'var(--bg-warm)' }}
        >
          <button
            onClick={() => setTab('log')}
            className="flex-1 py-2.5 rounded-lg text-[14px] font-medium transition-all"
            style={{
              background: tab === 'log' ? 'white' : 'transparent',
              color: tab === 'log' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === 'log' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Check in
          </button>
          <button
            onClick={() => setTab('history')}
            className="flex-1 py-2.5 rounded-lg text-[14px] font-medium transition-all"
            style={{
              background: tab === 'history' ? 'white' : 'transparent',
              color: tab === 'history' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            History
          </button>
        </div>

        {tab === 'log' ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-[13px] mb-2" style={{ color: 'var(--text-muted)' }}>{dateString}</p>
              <h1
                className="text-[28px] font-bold mb-2"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
              >
                How are you feeling?
              </h1>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                No wrong answers. Just check in with yourself.
              </p>
            </div>

            {/* Mood Selection - Vertical Cards */}
            <div className="space-y-3 mb-6">
              {moodOptions.map((mood) => {
                const isSelected = selectedMood === mood.value;
                return (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200"
                    style={{
                      background: isSelected ? mood.color : 'var(--bg-card)',
                      border: isSelected ? 'none' : '1px solid var(--border-light)',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    {/* Color indicator */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : `${mood.color}15` }}
                    >
                      <div
                        className="w-[10px] h-[10px] rounded-full"
                        style={{ background: isSelected ? 'white' : mood.color }}
                      />
                    </div>

                    {/* Label and description */}
                    <div className="flex-1 text-left">
                      <p
                        className="text-[15px] font-semibold"
                        style={{ color: isSelected ? 'white' : 'var(--text)' }}
                      >
                        {mood.label}
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}
                      >
                        {mood.description}
                      </p>
                    </div>

                    {/* Checkmark */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isSelected ? 'white' : 'var(--border-light)',
                        border: isSelected ? 'none' : '1.5px solid var(--border)',
                      }}
                    >
                      {isSelected && (
                        <CheckIcon className="w-4 h-4" style={{ color: mood.color }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Triggers and Note (appears after mood selected) */}
            {selectedMood !== null && (
              <div className="space-y-6 animate-fadeUp">
                {/* Triggers Section */}
                <div>
                  <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    What&apos;s influencing your mood?
                  </p>
                  <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
                    Select all that apply (optional)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {triggerOptions.map((trigger) => {
                      const isActive = triggers.includes(trigger);
                      return (
                        <button
                          key={trigger}
                          onClick={() => toggleTrigger(trigger)}
                          className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all"
                          style={{
                            background: isActive ? 'rgba(91,138,114,0.12)' : 'var(--bg-card)',
                            color: isActive ? 'var(--primary)' : 'var(--text-sec)',
                            border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                          }}
                        >
                          {trigger}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Note Textarea */}
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                >
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Write a note... (optional)"
                    rows={3}
                    maxLength={500}
                    className="w-full p-3 rounded-xl text-[14px] resize-none outline-none transition-all"
                    style={{
                      background: 'var(--bg-warm)',
                      border: '1.5px solid var(--border-light)',
                      color: 'var(--text)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                  />
                  {note.length > 0 && (
                    <p className="text-right text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      {note.length}/500
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* History Tab */
          <>
            <h1
              className="text-[28px] font-bold mb-6"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Mood History
            </h1>

            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-40 rounded-2xl" style={{ background: 'var(--border)' }} />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--border)' }} />
                  ))}
                </div>
              </div>
            ) : entries.length === 0 ? (
              /* Empty State */
              <div
                className="rounded-3xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
              >
                <EmptyState
                  icon={<EmptyHeartIcon />}
                  title="Start tracking your mood"
                  description="Check in daily to see patterns and track your healing journey. It only takes a moment."
                  actionLabel="Log your first mood"
                  onAction={() => setTab('log')}
                />
              </div>
            ) : (
              <>
                {/* Week Chart */}
                <div
                  className="rounded-2xl p-5 mb-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                >
                  <p className="text-[13px] font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
                    This Week
                  </p>
                  <div className="flex items-end justify-between gap-2 h-24">
                    {weekData.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex-1 flex items-end">
                          {day.score !== null ? (
                            <div
                              className="w-full rounded-t-lg transition-all"
                              style={{
                                height: `${(day.score / 10) * 100}%`,
                                minHeight: '8px',
                                background: getMoodColor(day.score),
                              }}
                            />
                          ) : (
                            <div
                              className="w-full h-full rounded-lg border-2 border-dashed"
                              style={{ borderColor: 'var(--border)' }}
                            />
                          )}
                        </div>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {day.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                  >
                    <p
                      className="text-[24px] font-bold"
                      style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: getMoodColor(stats.avg) }}
                    >
                      {stats.avg.toFixed(1)}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Avg mood</p>
                  </div>
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <FireIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      <p
                        className="text-[24px] font-bold"
                        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
                      >
                        {stats.streak}
                      </p>
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Day streak</p>
                  </div>
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                  >
                    <p
                      className="text-[14px] font-semibold truncate"
                      style={{ color: 'var(--primary)' }}
                    >
                      {stats.common}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Most common</p>
                  </div>
                </div>

                {/* All Entries */}
                <div className="mb-4">
                  <h2
                    className="text-[18px] font-semibold mb-3"
                    style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
                  >
                    All entries
                  </h2>
                </div>

                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                >
                  {entries.slice(0, 10).map((entry, index) => {
                    const moodColor = getMoodColor(entry.mood_score);
                    const isLast = index === Math.min(entries.length, 10) - 1;
                    const entryTriggers = parseTriggers(entry);
                    const noteText = parseNoteText(entry.note);

                    return (
                      <div
                        key={entry.id}
                        className="px-5 py-4"
                        style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-light)' }}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${moodColor}15` }}
                          >
                            <div
                              className="w-[10px] h-[10px] rounded-full"
                              style={{ background: moodColor }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                                {getMoodLabel(entry.mood_score)}
                              </span>
                              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                {entryTimes[entry.id] || ''}
                              </span>
                            </div>
                            {noteText && (
                              <p className="text-[13px] mb-2" style={{ color: 'var(--text-sec)' }}>
                                {noteText}
                              </p>
                            )}
                            {entryTriggers.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {entryTriggers.map((trigger) => (
                                  <span
                                    key={trigger}
                                    className="px-2 py-0.5 rounded-full text-[10px]"
                                    style={{ background: 'var(--bg-warm)', color: 'var(--text-muted)' }}
                                  >
                                    {trigger}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* Fixed Save Button */}
      {tab === 'log' && selectedMood !== null && (
        <div
          className="fixed left-0 right-0 px-5 z-40"
          style={{ bottom: '78px' }}
        >
          <div className="max-w-[393px] mx-auto">
            <button
              onClick={handleSaveMood}
              disabled={isSaving || saved}
              className="w-full py-4 rounded-full font-semibold text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              style={{
                background: saved ? '#5B8A72' : 'var(--primary)',
                boxShadow: '0 4px 20px rgba(91,138,114,0.35)',
              }}
            >
              {saved ? (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Saved
                </>
              ) : isSaving ? (
                'Saving...'
              ) : (
                'Save Check-in'
              )}
            </button>
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

      {/* Milestone Toast */}
      {showMilestoneToast && currentMilestone && (
        <MilestoneToast
          milestone={currentMilestone}
          onDismiss={() => {
            setShowMilestoneToast(false);
            setCurrentMilestone(null);
          }}
        />
      )}
    </div>
  );
}
