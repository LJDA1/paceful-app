'use client';

import { useState, useCallback } from 'react';
import { getMoodColor, getMoodLabel, saveMoodEntry } from '@/lib/mood-calculator';

// ============================================================================
// Types
// ============================================================================

interface QuickMoodLogProps {
  userId: string;
  onSave?: () => void;
}

const EMOTION_OPTIONS = [
  'happy',
  'sad',
  'anxious',
  'angry',
  'hopeful',
  'grateful',
  'lonely',
  'peaceful',
  'frustrated',
  'calm',
] as const;

type Emotion = (typeof EMOTION_OPTIONS)[number];

// ============================================================================
// Mood Slider Component
// ============================================================================

function MoodSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const colors = getMoodColor(value);
  const label = getMoodLabel(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">How are you feeling?</span>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
          {value} - {label}
        </div>
      </div>

      {/* Slider */}
      <div className="relative pt-1">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-stone-400
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:scale-110"
          style={{
            background: `linear-gradient(to right,
              #f43f5e 0%, #f43f5e 20%,
              #f59e0b 20%, #f59e0b 55%,
              #10b981 55%, #10b981 100%)`,
          }}
        />

        {/* Scale markers */}
        <div className="flex justify-between mt-1 px-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`w-5 h-5 text-xs rounded transition-all ${
                n === value
                  ? 'font-bold text-stone-800'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-1 text-xs text-stone-400">
          <span className="text-rose-500">Low</span>
          <span className="text-amber-500">Moderate</span>
          <span className="text-emerald-500">High</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Emotion Tags Component
// ============================================================================

function EmotionTags({
  selected,
  onChange,
}: {
  selected: Emotion[];
  onChange: (emotions: Emotion[]) => void;
}) {
  const toggleEmotion = (emotion: Emotion) => {
    if (selected.includes(emotion)) {
      onChange(selected.filter((e) => e !== emotion));
    } else if (selected.length < 3) {
      onChange([...selected, emotion]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">Emotions</span>
        <span className="text-xs text-stone-400">{selected.length}/3 selected</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {EMOTION_OPTIONS.map((emotion) => {
          const isSelected = selected.includes(emotion);
          const isDisabled = !isSelected && selected.length >= 3;

          return (
            <button
              key={emotion}
              onClick={() => toggleEmotion(emotion)}
              disabled={isDisabled}
              className={`px-3 py-1.5 text-sm rounded-full capitalize transition-all ${
                isSelected
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                  : isDisabled
                  ? 'bg-stone-50 text-stone-300 cursor-not-allowed'
                  : 'bg-stone-100 text-stone-600 border-2 border-transparent hover:bg-stone-200'
              }`}
            >
              {emotion}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Success Animation
// ============================================================================

function SuccessAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3 animate-[scale_0.3s_ease-out]">
        <svg
          className="w-8 h-8 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
            className="animate-[draw_0.4s_ease-out_0.2s_forwards]"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
            }}
          />
        </svg>
      </div>
      <p className="text-stone-600 font-medium">Mood logged!</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function QuickMoodLog({ userId, onSave }: QuickMoodLogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [moodScore, setMoodScore] = useState(5);
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const result = await saveMoodEntry(userId, moodScore, emotions, note || undefined);

    if (result) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
        // Reset form
        setMoodScore(5);
        setEmotions([]);
        setNote('');
        onSave?.();
      }, 1500);
    }

    setIsSubmitting(false);
  }, [userId, moodScore, emotions, note, isSubmitting, onSave]);

  const colors = getMoodColor(moodScore);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all hover:shadow-md ${colors.bg} ${colors.border} ${colors.text}`}
      >
        <div className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-sm font-bold">
          {moodScore}
        </div>
        <span className="text-sm font-medium">Log Mood</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {showSuccess ? (
              <SuccessAnimation />
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                  <h3 className="text-lg font-semibold text-stone-800">Quick Mood Log</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-stone-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                  {/* Mood Slider */}
                  <MoodSlider value={moodScore} onChange={setMoodScore} />

                  {/* Emotion Tags */}
                  <EmotionTags selected={emotions} onChange={setEmotions} />

                  {/* Note */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">
                      Quick note <span className="text-stone-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 50))}
                      placeholder="What's on your mind?"
                      maxLength={50}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <div className="text-right text-xs text-stone-400">{note.length}/50</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 bg-stone-50 border-t border-stone-100">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Log Mood'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
