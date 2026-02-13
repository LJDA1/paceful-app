'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { trackEvent } from '@/lib/track';
import {
  Exercise,
  ExerciseType,
  exerciseColors,
  getAllExercises,
  getRecommendedExercise,
} from '@/lib/exercises';

// ============================================================================
// Icons
// ============================================================================

function BreathingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0 4.142-3.358 7.5-7.5 7.5S4.5 16.142 4.5 12 7.858 4.5 12 4.5s7.5 3.358 7.5 7.5z" />
    </svg>
  );
}

function ReframeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function GratitudeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function LettingGoIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
    </svg>
  );
}

function GroundingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function SelfCompassionIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 11.5h4.5m-2.25-2.25v4.5" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function ChevronLeftIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
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

// Icon renderer
function ExerciseIcon({ type, className, style }: { type: ExerciseType; className?: string; style?: React.CSSProperties }) {
  const icons: Record<ExerciseType, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
    'breathing': BreathingIcon,
    'reframe': ReframeIcon,
    'gratitude': GratitudeIcon,
    'letting-go': LettingGoIcon,
    'grounding': GroundingIcon,
    'self-compassion': SelfCompassionIcon,
  };
  const IconComponent = icons[type];
  return IconComponent ? <IconComponent className={className} style={style} /> : null;
}

// ============================================================================
// Timer Component
// ============================================================================

function CircularTimer({
  duration,
  onComplete,
  isPaused = false,
}: {
  duration: number;
  onComplete: () => void;
  isPaused?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Defer onComplete to next tick to avoid updating parent state during render
          setTimeout(() => onComplete(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, onComplete]);

  const circumference = 2 * Math.PI * 45;
  const progress = ((duration - timeLeft) / duration) * circumference;

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg width="112" height="112" className="transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r="45"
          fill="none"
          stroke="var(--bg-warm)"
          strokeWidth="8"
        />
        <circle
          cx="56"
          cy="56"
          r="45"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          {timeLeft}s
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Exercise View Component
// ============================================================================

interface ExerciseViewProps {
  exercise: Exercise | GeneratedExercise;
  onClose: () => void;
  onComplete: () => void;
}

interface GeneratedExercise {
  title: string;
  type?: ExerciseType;
  duration: string;
  introduction: string;
  steps: Array<{ instruction: string; duration_seconds: number | null }>;
  closing: string;
  isAIGenerated?: boolean;
}

function ExerciseView({ exercise, onClose, onComplete }: ExerciseViewProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = intro
  const [timerKey, setTimerKey] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const totalSteps = exercise.steps.length;

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      setTimerKey((prev) => prev + 1);
      setIsTimerRunning(true);
    } else {
      // Move to closing
      setCurrentStep(totalSteps);
      setIsTimerRunning(false);
    }
  }, [currentStep, totalSteps]);

  const handleTimerComplete = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const currentStepData = currentStep >= 0 && currentStep < totalSteps ? exercise.steps[currentStep] : null;
  const exerciseType = (exercise as Exercise).type || 'breathing';
  const colors = exerciseColors[exerciseType];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-warm)' }}
          aria-label="Close exercise"
        >
          <ChevronLeftIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <h1
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
        >
          {exercise.title}
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 py-4">
        {exercise.steps.map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: index <= currentStep ? colors.accent : 'var(--border)',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Introduction */}
        {currentStep === -1 && (
          <div className="text-center animate-fadeIn max-w-sm">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: colors.bg }}
            >
              <ExerciseIcon type={exerciseType} className="w-10 h-10" style={{ color: colors.accent }} />
            </div>
            <p
              className="text-lg leading-relaxed mb-8"
              style={{ color: 'var(--text-sec)' }}
            >
              {exercise.introduction}
            </p>
          </div>
        )}

        {/* Steps */}
        {currentStepData && (
          <div className="text-center animate-fadeIn max-w-sm">
            <p
              className="text-[13px] font-medium uppercase tracking-wider mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              Step {currentStep + 1} of {totalSteps}
            </p>
            <p
              className="text-xl leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {currentStepData.instruction}
            </p>
            {currentStepData.duration_seconds && currentStepData.duration_seconds > 0 && (
              <div className="mb-6">
                <CircularTimer
                  key={timerKey}
                  duration={currentStepData.duration_seconds}
                  onComplete={handleTimerComplete}
                  isPaused={!isTimerRunning}
                />
              </div>
            )}
          </div>
        )}

        {/* Closing */}
        {currentStep === totalSteps && (
          <div className="text-center animate-fadeIn max-w-sm">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(91,138,114,0.1)' }}
            >
              <CheckIcon className="w-10 h-10" style={{ color: 'var(--primary)' }} />
            </div>
            <p
              className="text-xl leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              {exercise.closing}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Exercise complete
            </p>
          </div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-8" style={{ background: 'var(--bg)' }}>
        {currentStep === totalSteps ? (
          <button
            onClick={onComplete}
            className="w-full py-4 rounded-full font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            Complete
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isTimerRunning && currentStepData?.duration_seconds !== null}
            className="w-full py-4 rounded-full font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--primary)' }}
          >
            {currentStep === -1 ? 'Begin' : 'Next'}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

function ExercisesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [exercises] = useState<Exercise[]>(getAllExercises());
  const [recommendedExercise, setRecommendedExercise] = useState<Exercise | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [completionCount, setCompletionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedStartParam, setHasCheckedStartParam] = useState(false);

  // Exercise view state
  const [activeExercise, setActiveExercise] = useState<Exercise | GeneratedExercise | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const supabase = createClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Check for ?start= query parameter to auto-open exercise
  useEffect(() => {
    if (hasCheckedStartParam || isLoading) return;

    const startExerciseId = searchParams.get('start');
    if (startExerciseId) {
      // Find the exercise by type/id
      const exerciseToStart = exercises.find(
        (e) => e.type === startExerciseId || e.id === startExerciseId
      );
      if (exerciseToStart) {
        setActiveExercise(exerciseToStart);
        trackEvent('exercise_started_from_nudge', { exerciseType: startExerciseId });
        // Clear the URL parameter
        router.replace('/exercises', { scroll: false });
      }
      setHasCheckedStartParam(true);
    } else {
      setHasCheckedStartParam(true);
    }
  }, [searchParams, exercises, isLoading, hasCheckedStartParam, router]);

  // Fetch user data
  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      // Get latest mood to determine recommendation
      const { data: moodData } = await supabase
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single();

      const moodScore = moodData?.mood_value ?? 5;
      setRecommendedExercise(getRecommendedExercise(moodScore));

      // Get completion history
      const { data: completions, count } = await supabase
        .from('activity_logs')
        .select('event_data', { count: 'exact' })
        .eq('user_id', userId)
        .eq('event_type', 'exercise_completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (completions) {
        const completedTypes = completions
          .map((c) => (c.event_data as { type?: string })?.type)
          .filter(Boolean) as string[];
        setCompletedExercises(completedTypes);
      }
      setCompletionCount(count || 0);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
      trackEvent('page_view', { page: 'exercises' });
    }
  }, [userId, fetchData]);

  // Handle exercise completion
  const handleExerciseComplete = useCallback(async () => {
    if (!activeExercise) return;

    const exerciseType = (activeExercise as Exercise).type || 'breathing';
    const exerciseTitle = activeExercise.title;

    // Track completion
    trackEvent('exercise_completed', {
      type: exerciseType,
      title: exerciseTitle,
      duration: activeExercise.duration,
      isAIGenerated: (activeExercise as GeneratedExercise).isAIGenerated || false,
    });

    setActiveExercise(null);
    setCompletedExercises((prev) => [exerciseType, ...prev]);
    setCompletionCount((prev) => prev + 1);
  }, [activeExercise]);

  // Generate AI exercise
  const handleGenerateAIExercise = async () => {
    setIsGeneratingAI(true);

    try {
      // Determine type based on user's lowest ERS dimension (simplified: use random for now)
      const types: ExerciseType[] = ['breathing', 'reframe', 'gratitude', 'letting-go', 'grounding', 'self-compassion'];
      const randomType = types[Math.floor(Math.random() * types.length)];

      const response = await fetch('/api/ai/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: randomType }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate exercise');
      }

      const exercise = await response.json();
      setActiveExercise(exercise);
    } catch (error) {
      console.error('Failed to generate AI exercise:', error);
      // Fallback to static exercise
      setActiveExercise(exercises[0]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Loading state
  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-5 py-6 animate-pulse">
          <div className="h-8 w-32 rounded mb-2" style={{ background: 'var(--border)' }} />
          <div className="h-4 w-48 rounded mb-8" style={{ background: 'var(--border)' }} />
          <div className="h-40 rounded-3xl mb-6" style={{ background: 'var(--border)' }} />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-[22px]" style={{ background: 'var(--border)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Exercise view overlay
  if (activeExercise) {
    return (
      <ExerciseView
        exercise={activeExercise}
        onClose={() => setActiveExercise(null)}
        onComplete={handleExerciseComplete}
      />
    );
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-[28px] font-bold mb-1"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Exercises
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            Guided practices for healing
          </p>
        </div>

        {/* First time explanation */}
        {completionCount === 0 && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            <p className="text-[14px]" style={{ color: 'var(--text-sec)' }}>
              These exercises are designed to support emotional recovery. Each takes just a few minutes.
            </p>
          </div>
        )}

        {/* Recommended Exercise */}
        {recommendedExercise && (
          <div className="mb-8">
            <p
              className="text-[13px] font-medium uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}
            >
              Recommended for you
            </p>
            <button
              onClick={() => setActiveExercise(recommendedExercise)}
              className="w-full text-left rounded-[28px] p-6 transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(155deg, #5B8A72 0%, #7BA896 100%)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <ExerciseIcon
                      type={recommendedExercise.type}
                      className="w-6 h-6"
                      style={{ color: 'white' }}
                    />
                  </div>
                  <h2
                    className="text-xl font-semibold text-white mb-1"
                    style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
                  >
                    {recommendedExercise.title}
                  </h2>
                  <p className="text-sm text-white/80 mb-4">{recommendedExercise.description}</p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                    {recommendedExercise.duration}
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* All Exercises */}
        <div className="mb-8">
          <h2
            className="text-[18px] font-semibold mb-4"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            All exercises
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {exercises.map((exercise) => {
              const colors = exerciseColors[exercise.type];
              const isCompleted = completedExercises.includes(exercise.type);

              return (
                <button
                  key={exercise.id}
                  onClick={() => setActiveExercise(exercise)}
                  className="text-left p-4 rounded-[22px] transition-transform active:scale-[0.98]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: colors.bg }}
                  >
                    <ExerciseIcon type={exercise.type} className="w-5 h-5" style={{ color: colors.accent }} />
                  </div>
                  <h3
                    className="text-[15px] font-semibold mb-1"
                    style={{ color: 'var(--text)' }}
                  >
                    {exercise.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full capitalize"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {exercise.type.replace('-', ' ')}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {exercise.duration}
                    </span>
                  </div>
                  {isCompleted && (
                    <div className="flex items-center gap-1 mt-2">
                      <CheckIcon className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--primary)' }}>
                        Completed
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Personalized Exercise */}
        <button
          onClick={handleGenerateAIExercise}
          disabled={isGeneratingAI}
          className="w-full text-left rounded-[22px] p-5 transition-transform active:scale-[0.98] disabled:opacity-70"
          style={{ background: 'rgba(212,151,59,0.08)', border: '1px solid rgba(212,151,59,0.15)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(212,151,59,0.15)' }}
            >
              {isGeneratingAI ? (
                <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <SparkleIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              )}
            </div>
            <div>
              <h3
                className="text-[15px] font-semibold mb-0.5"
                style={{ color: 'var(--text)' }}
              >
                {isGeneratingAI ? 'Creating your exercise...' : 'Generate a personalized exercise'}
              </h3>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                AI-crafted based on your current state
              </p>
            </div>
          </div>
        </button>

        {/* Completion History */}
        {completionCount > 0 && (
          <div className="mt-8">
            <h2
              className="text-[18px] font-semibold mb-3"
              style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
            >
              Completed
            </h2>
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(91,138,114,0.1)' }}
                >
                  <CheckIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p
                    className="text-[20px] font-bold"
                    style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
                  >
                    {completionCount}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    exercises completed
                  </p>
                </div>
              </div>
              {completedExercises.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {completedExercises.slice(0, 6).map((type, index) => {
                    const colors = exerciseColors[type as ExerciseType] || exerciseColors.breathing;
                    return (
                      <span
                        key={index}
                        className="px-2 py-1 rounded-full text-[10px] capitalize"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {type.replace('-', ' ')}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ExercisesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-5 py-6 animate-pulse">
          <div className="h-8 w-32 rounded mb-2" style={{ background: 'var(--border)' }} />
          <div className="h-4 w-48 rounded mb-8" style={{ background: 'var(--border)' }} />
          <div className="h-40 rounded-3xl mb-6" style={{ background: 'var(--border)' }} />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-[22px]" style={{ background: 'var(--border)' }} />
            ))}
          </div>
        </div>
      </div>
    }>
      <ExercisesPageContent />
    </Suspense>
  );
}
