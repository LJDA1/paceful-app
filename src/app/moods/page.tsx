'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { getMoodColor, getMoodLabel } from '@/lib/mood-calculator';

// ============================================================================
// Constants
// ============================================================================

const EMOTIONS = [
  'sad', 'anxious', 'hopeful', 'angry', 'lonely', 'grateful',
  'confused', 'peaceful', 'frustrated', 'calm', 'happy', 'numb',
] as const;

const TRIGGERS = [
  { id: 'thought_ex', label: 'Thought about ex' },
  { id: 'saw_reminder', label: 'Saw a reminder' },
  { id: 'social_media', label: 'Social media' },
  { id: 'special_date', label: 'Special date/anniversary' },
  { id: 'mutual_friend', label: 'Mutual friend contact' },
  { id: 'song_movie', label: 'Song or movie' },
  { id: 'location', label: 'Visited shared location' },
  { id: 'dream', label: 'Had a dream' },
] as const;

type Emotion = (typeof EMOTIONS)[number];
type TriggerId = (typeof TRIGGERS)[number]['id'];

// ============================================================================
// Mood Slider Component
// ============================================================================

function MoodSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = getMoodColor(value);
  const label = getMoodLabel(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-stone-800">How are you feeling right now?</span>
        <div className={`px-4 py-2 rounded-full font-bold ${colors.bg} ${colors.text}`}>
          {value} - {label}
        </div>
      </div>

      {/* Visual mood scale */}
      <div className="flex justify-between items-end px-2 mb-2">
        <div className="text-center">
          <div className="text-2xl mb-1">
            <svg className="w-8 h-8 text-rose-400 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
          </div>
          <span className="text-xs text-stone-500">Struggling</span>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">
            <svg className="w-8 h-8 text-amber-400 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <span className="text-xs text-stone-500">Neutral</span>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">
            <svg className="w-8 h-8 text-emerald-400 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
          </div>
          <span className="text-xs text-stone-500">Great</span>
        </div>
      </div>

      {/* Slider */}
      <div className="px-2">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-indigo-500
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:scale-110"
          style={{
            background: `linear-gradient(to right,
              #f43f5e 0%, #f43f5e 20%,
              #fb923c 20%, #fb923c 40%,
              #fbbf24 40%, #fbbf24 60%,
              #a3e635 60%, #a3e635 80%,
              #10b981 80%, #10b981 100%)`,
          }}
        />
      </div>

      {/* Number buttons */}
      <div className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              n === value
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Emotions Selector
// ============================================================================

function EmotionsSelector({
  selected,
  onChange,
}: {
  selected: Emotion[];
  onChange: (emotions: Emotion[]) => void;
}) {
  const toggleEmotion = (emotion: Emotion) => {
    if (selected.includes(emotion)) {
      onChange(selected.filter((e) => e !== emotion));
    } else {
      onChange([...selected, emotion]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-stone-800">What emotions are present?</span>
        <span className="text-sm text-stone-500">{selected.length} selected</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {EMOTIONS.map((emotion) => {
          const isSelected = selected.includes(emotion);
          return (
            <button
              key={emotion}
              onClick={() => toggleEmotion(emotion)}
              className={`px-3 py-2.5 text-sm font-medium rounded-xl capitalize transition-all ${
                isSelected
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                  : 'bg-stone-100 text-stone-600 border-2 border-transparent hover:bg-stone-200'
              }`}
            >
              {isSelected && (
                <svg className="w-4 h-4 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
              {emotion}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Triggers Selector
// ============================================================================

function TriggersSelector({
  selected,
  onChange,
  customTrigger,
  onCustomChange,
}: {
  selected: TriggerId[];
  onChange: (triggers: TriggerId[]) => void;
  customTrigger: string;
  onCustomChange: (value: string) => void;
}) {
  const toggleTrigger = (triggerId: TriggerId) => {
    if (selected.includes(triggerId)) {
      onChange(selected.filter((t) => t !== triggerId));
    } else {
      onChange([...selected, triggerId]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <span className="text-lg font-semibold text-stone-800">What triggered this mood?</span>
        <span className="text-sm text-stone-500 ml-2">(optional)</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TRIGGERS.map((trigger) => {
          const isSelected = selected.includes(trigger.id);
          return (
            <button
              key={trigger.id}
              onClick={() => toggleTrigger(trigger.id)}
              className={`px-3 py-2.5 text-sm text-left font-medium rounded-xl transition-all ${
                isSelected
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                  : 'bg-stone-100 text-stone-600 border-2 border-transparent hover:bg-stone-200'
              }`}
            >
              {isSelected && (
                <svg className="w-4 h-4 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
              {trigger.label}
            </button>
          );
        })}
      </div>
      {/* Custom trigger */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-600">Other:</span>
        <input
          type="text"
          value={customTrigger}
          onChange={(e) => onCustomChange(e.target.value.slice(0, 50))}
          placeholder="Describe trigger..."
          maxLength={50}
          className="flex-1 px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Success Message
// ============================================================================

function SuccessMessage({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center animate-[scale_0.3s_ease-out]">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2">Mood Logged!</h3>
        <p className="text-stone-600 mb-6">Your entry has been saved. Keep tracking to see your patterns.</p>
        <div className="flex gap-3">
          <Link
            href="/moods/history"
            className="flex-1 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors"
          >
            View History
          </Link>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Log Another
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function MoodsPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [moodScore, setMoodScore] = useState(5);
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [triggers, setTriggers] = useState<TriggerId[]>([]);
  const [customTrigger, setCustomTrigger] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build trigger description
      const triggerLabels: string[] = triggers.flatMap((id) => {
        const label = TRIGGERS.find((t) => t.id === id)?.label;
        return label ? [label] : [];
      });
      if (customTrigger.trim()) {
        triggerLabels.push(customTrigger.trim());
      }
      const triggerDescription = triggerLabels.join(', ') || null;

      // Save mood entry
      const { error: insertError } = await supabase
        .from('mood_entries')
        .insert({
          user_id: userId!,
          mood_value: moodScore,
          mood_label: getMoodLabel(moodScore).toLowerCase(),
          emotions: emotions,
          trigger_type: triggers[0] || null,
          trigger_description: triggerDescription || note || null,
          time_of_day: getTimeOfDay(),
          logged_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update streak
      await updateStreak();

      setShowSuccess(true);
    } catch (err) {
      console.error('Error saving mood:', err);
      setError('Failed to save mood entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [moodScore, emotions, triggers, customTrigger, note]);

  const updateStreak = async () => {
    try {
      // Get current streak
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId!)
        .single();

      const today = new Date().toISOString().split('T')[0];

      if (streak) {
        const lastActivity = streak.last_activity_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = streak.current_streak_days;
        if (lastActivity === yesterdayStr) {
          newStreak = streak.current_streak_days + 1;
        } else if (lastActivity !== today) {
          newStreak = 1;
        }

        await supabase
          .from('user_streaks')
          .update({
            current_streak_days: newStreak,
            longest_streak_days: Math.max(newStreak, streak.longest_streak_days),
            total_active_days: streak.total_active_days + (lastActivity !== today ? 1 : 0),
            last_activity_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId!);
      }
    } catch (err) {
      console.error('Error updating streak:', err);
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const resetForm = () => {
    setMoodScore(5);
    setEmotions([]);
    setTriggers([]);
    setCustomTrigger('');
    setNote('');
    setShowSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">Log Your Mood</h1>
              <p className="text-stone-500 text-sm">Track how you&apos;re feeling right now</p>
            </div>
            <Link
              href="/moods/history"
              className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span className="hidden sm:inline">History</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="p-6 space-y-8">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                {error}
              </div>
            )}

            {/* Mood Slider */}
            <MoodSlider value={moodScore} onChange={setMoodScore} />

            <div className="border-t border-stone-100" />

            {/* Emotions */}
            <EmotionsSelector selected={emotions} onChange={setEmotions} />

            <div className="border-t border-stone-100" />

            {/* Triggers */}
            <TriggersSelector
              selected={triggers}
              onChange={setTriggers}
              customTrigger={customTrigger}
              onCustomChange={setCustomTrigger}
            />

            <div className="border-t border-stone-100" />

            {/* Quick Note */}
            <div className="space-y-3">
              <div>
                <span className="text-lg font-semibold text-stone-800">Quick note</span>
                <span className="text-sm text-stone-500 ml-2">(50 chars max, optional)</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 50))}
                  placeholder="Any thoughts you want to capture..."
                  maxLength={50}
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                  {note.length}/50
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Mood Entry'
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccess && <SuccessMessage onClose={resetForm} />}
    </div>
  );
}
