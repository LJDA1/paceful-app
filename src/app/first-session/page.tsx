'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { trackEvent } from '@/lib/track';

// ============================================================================
// Types
// ============================================================================

type Step = 'welcome' | 'mood' | 'journal' | 'ers' | 'complete';

interface MoodData {
  value: number;
  tags: string[];
}

// ============================================================================
// Icons
// ============================================================================

function SparklesIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function PencilIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
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

function CheckCircleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ArrowRightIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

// ============================================================================
// Progress Bar
// ============================================================================

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const steps: Step[] = ['welcome', 'mood', 'journal', 'ers', 'complete'];
  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
      <div
        className="h-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%`, background: 'var(--primary)' }}
      />
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  onNext: () => void;
  firstName: string;
}

// Welcome Step
function WelcomeStep({ onNext, firstName }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 animate-fadeIn">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'var(--primary-light)' }}
      >
        <SparklesIcon className="w-10 h-10" style={{ color: 'var(--primary)' }} />
      </div>

      <h1
        className="text-[28px] font-semibold mb-4"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        Welcome, {firstName}
      </h1>

      <p className="text-[16px] leading-relaxed mb-8 max-w-sm" style={{ color: 'var(--text-sec)' }}>
        {"Let's take a few minutes to set up your healing journey. We'll check in on how you're feeling and create your starting point."}
      </p>

      <div className="space-y-3 w-full max-w-xs mb-10">
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-card)' }}>
            <HeartIcon className="w-4 h-4" style={{ color: 'var(--rose)' }} />
          </div>
          <span className="text-[14px]" style={{ color: 'var(--text-sec)' }}>Log your first mood</span>
        </div>
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-card)' }}>
            <PencilIcon className="w-4 h-4" style={{ color: 'var(--calm)' }} />
          </div>
          <span className="text-[14px]" style={{ color: 'var(--text-sec)' }}>Write a quick reflection</span>
        </div>
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-card)' }}>
            <ChartIcon className="w-4 h-4" style={{ color: 'var(--lavender)' }} />
          </div>
          <span className="text-[14px]" style={{ color: 'var(--text-sec)' }}>See your starting ERS</span>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-xs py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'var(--primary)' }}
      >
        {"Let's Begin"}
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// Mood Step
interface MoodStepProps extends StepProps {
  onMoodSubmit: (data: MoodData) => void;
}

const EMOTION_TAGS = [
  { label: 'Sad', color: 'var(--calm)' },
  { label: 'Anxious', color: 'var(--lavender)' },
  { label: 'Angry', color: 'var(--rose)' },
  { label: 'Hopeful', color: 'var(--primary)' },
  { label: 'Numb', color: 'var(--text-muted)' },
  { label: 'Lonely', color: 'var(--calm)' },
  { label: 'Relieved', color: 'var(--primary)' },
  { label: 'Confused', color: 'var(--lavender)' },
];

function MoodStep({ onMoodSubmit }: MoodStepProps) {
  const [moodValue, setMoodValue] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 3)
    );
  };

  const handleSubmit = () => {
    onMoodSubmit({ value: moodValue, tags: selectedTags });
  };

  const getMoodLabel = (value: number) => {
    if (value <= 2) return 'Really struggling';
    if (value <= 4) return 'Having a hard time';
    if (value <= 6) return 'Getting by';
    if (value <= 8) return 'Doing okay';
    return 'Feeling good';
  };

  return (
    <div className="flex flex-col items-center px-6 animate-fadeIn">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'var(--rose-light, rgba(184,107,100,0.1))' }}
      >
        <HeartIcon className="w-8 h-8" style={{ color: 'var(--rose)' }} />
      </div>

      <h2
        className="text-[24px] font-semibold mb-2 text-center"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        How are you feeling right now?
      </h2>

      <p className="text-[14px] mb-8 text-center" style={{ color: 'var(--text-muted)' }}>
        Be honest — this is your private space
      </p>

      {/* Mood Slider */}
      <div className="w-full max-w-sm mb-8">
        <div className="text-center mb-4">
          <span className="text-[48px] font-semibold" style={{ color: 'var(--text)' }}>{moodValue}</span>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-sec)' }}>{getMoodLabel(moodValue)}</p>
        </div>

        <input
          type="range"
          min="1"
          max="10"
          value={moodValue}
          onChange={(e) => setMoodValue(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--rose) 0%, var(--primary) 100%)`,
          }}
        />

        <div className="flex justify-between mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <span>Struggling</span>
          <span>Thriving</span>
        </div>
      </div>

      {/* Emotion Tags */}
      <div className="w-full max-w-sm mb-8">
        <p className="text-[14px] mb-3 text-center" style={{ color: 'var(--text-sec)' }}>
          What emotions are present? (optional)
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EMOTION_TAGS.map(tag => (
            <button
              key={tag.label}
              onClick={() => toggleTag(tag.label)}
              className="px-4 py-2 rounded-full text-[13px] font-medium transition-all"
              style={{
                background: selectedTags.includes(tag.label) ? tag.color : 'var(--bg-card)',
                color: selectedTags.includes(tag.label) ? 'white' : 'var(--text-sec)',
                border: `1px solid ${selectedTags.includes(tag.label) ? tag.color : 'var(--border-light)'}`,
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full max-w-xs py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'var(--primary)' }}
      >
        Continue
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// Journal Step
interface JournalStepProps extends StepProps {
  onJournalSubmit: (entry: string) => void;
}

function JournalStep({ onJournalSubmit }: JournalStepProps) {
  const [entry, setEntry] = useState('');
  const minLength = 20;

  const handleSubmit = () => {
    if (entry.trim().length >= minLength) {
      onJournalSubmit(entry.trim());
    }
  };

  return (
    <div className="flex flex-col items-center px-6 animate-fadeIn">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'var(--calm-light, rgba(94,141,176,0.1))' }}
      >
        <PencilIcon className="w-8 h-8" style={{ color: 'var(--calm)' }} />
      </div>

      <h2
        className="text-[24px] font-semibold mb-2 text-center"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        {"What's on your mind?"}
      </h2>

      <p className="text-[14px] mb-6 text-center max-w-sm" style={{ color: 'var(--text-muted)' }}>
        Write a few sentences about how you{"'"}re feeling or what brought you here
      </p>

      <div className="w-full max-w-sm mb-6">
        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Today I'm feeling..."
          rows={6}
          className="w-full p-4 rounded-xl text-[15px] resize-none outline-none transition-all"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border-light)',
          }}
        />
        <div className="flex justify-between mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <span>{entry.length} characters</span>
          <span>{entry.length >= minLength ? 'Ready' : `${minLength - entry.length} more needed`}</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={entry.trim().length < minLength}
        className="w-full max-w-xs py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
        style={{
          background: entry.trim().length >= minLength ? 'var(--primary)' : 'var(--border)',
          cursor: entry.trim().length >= minLength ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// ERS Step
interface ERSStepProps extends StepProps {
  ersScore: number | null;
  ersStage: string | null;
  loading: boolean;
}

function ERSStep({ onNext, ersScore, ersStage, loading }: ERSStepProps) {
  const getStageDescription = (stage: string | null) => {
    switch (stage) {
      case 'crisis':
        return "You're in the early stages of healing. This is completely normal, and it's brave of you to start this journey.";
      case 'processing':
        return "You're actively working through your emotions. The hardest part is acknowledging the need for healing.";
      case 'rebuilding':
        return "You're making real progress. You've done important work to get here.";
      case 'thriving':
        return "You're in a strong place. Paceful will help you maintain and deepen your wellbeing.";
      default:
        return "Your healing journey is unique. We'll track your progress over time.";
    }
  };

  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case 'crisis': return 'var(--rose)';
      case 'processing': return 'var(--accent)';
      case 'rebuilding': return 'var(--calm)';
      case 'thriving': return 'var(--primary)';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center px-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 animate-pulse" style={{ background: 'var(--bg-card)' }}>
          <ChartIcon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
        </div>
        <h2 className="text-[24px] font-semibold mb-4" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}>
          Calculating your ERS...
        </h2>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--border-light)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 animate-fadeIn">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'var(--lavender-light, rgba(126,113,181,0.1))' }}
      >
        <ChartIcon className="w-8 h-8" style={{ color: 'var(--lavender)' }} />
      </div>

      <h2
        className="text-[24px] font-semibold mb-2 text-center"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        Your Emotional Recovery Score
      </h2>

      <p className="text-[14px] mb-8 text-center" style={{ color: 'var(--text-muted)' }}>
        This is your starting point — it will improve over time
      </p>

      {/* ERS Display */}
      <div className="relative w-40 h-40 mb-6">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="var(--border-light)"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={getStageColor(ersStage)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(ersScore || 0) * 4.4} 440`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[40px] font-bold" style={{ color: 'var(--text)' }}>{ersScore}</span>
          <span className="text-[12px] uppercase tracking-wider" style={{ color: getStageColor(ersStage) }}>
            {ersStage}
          </span>
        </div>
      </div>

      <p className="text-[14px] text-center max-w-sm mb-8" style={{ color: 'var(--text-sec)' }}>
        {getStageDescription(ersStage)}
      </p>

      <button
        onClick={onNext}
        className="w-full max-w-xs py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'var(--primary)' }}
      >
        Continue
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// Complete Step
function CompleteStep({ onNext, firstName }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 animate-fadeIn">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'var(--primary-light)' }}
      >
        <CheckCircleIcon className="w-10 h-10" style={{ color: 'var(--primary)' }} />
      </div>

      <h1
        className="text-[28px] font-semibold mb-4"
        style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
      >
        {"You're all set, "}{firstName}
      </h1>

      <p className="text-[16px] leading-relaxed mb-8 max-w-sm" style={{ color: 'var(--text-sec)' }}>
        {"Your healing journey has officially begun. Come back daily to track your progress and watch your ERS improve."}
      </p>

      <div
        className="w-full max-w-sm p-4 rounded-xl mb-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
      >
        <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text)' }}>
          What you can do in Paceful:
        </p>
        <ul className="space-y-2 text-[13px]" style={{ color: 'var(--text-sec)' }}>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
            Log your mood daily
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
            Journal your thoughts
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
            Try guided exercises
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
            Chat with Pace anytime
          </li>
        </ul>
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-xs py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'var(--primary)' }}
      >
        Go to Dashboard
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function FirstSessionPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [step, setStep] = useState<Step>('welcome');
  const [firstName, setFirstName] = useState('');
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [ersScore, setErsScore] = useState<number | null>(null);
  const [ersStage, setErsStage] = useState<string | null>(null);
  const [calculatingErs, setCalculatingErs] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const supabase = createClient();

  // Redirect if not authenticated or already completed
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Check if first session already completed
    const completed = localStorage.getItem('first_session_complete');
    if (completed === 'true') {
      router.push('/dashboard');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch user name
  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', userId)
        .single();

      setFirstName(data?.first_name || 'there');
    };

    fetchProfile();
  }, [userId, supabase]);

  // Track page view
  useEffect(() => {
    if (userId) {
      trackEvent('first_session_started');
    }
  }, [userId]);

  const transitionTo = (nextStep: Step) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 200);
  };

  const handleMoodSubmit = async (data: MoodData) => {
    setMoodData(data);
    trackEvent('first_session_mood_logged', { moodValue: data.value });

    // Save mood to database
    if (userId) {
      await supabase.from('mood_entries').insert({
        user_id: userId,
        mood_value: data.value,
        emotion_tags: data.tags,
        logged_at: new Date().toISOString(),
      });
    }

    transitionTo('journal');
  };

  const handleJournalSubmit = async (entry: string) => {
    trackEvent('first_session_journal_written', { wordCount: entry.split(/\s+/).length });

    // Save journal to database
    if (userId) {
      await supabase.from('journal_entries').insert({
        user_id: userId,
        content: entry,
        word_count: entry.split(/\s+/).length,
        logged_at: new Date().toISOString(),
      });
    }

    transitionTo('ers');

    // Calculate ERS
    setCalculatingErs(true);
    try {
      const response = await fetch('/api/ers/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setErsScore(data.ers_score);
        setErsStage(data.ers_stage);
        trackEvent('first_session_ers_calculated', { ersScore: data.ers_score, ersStage: data.ers_stage });
      }
    } catch (error) {
      console.error('Failed to calculate ERS:', error);
      // Set fallback values
      setErsScore(moodData ? moodData.value * 10 : 50);
      setErsStage('processing');
    } finally {
      setCalculatingErs(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('first_session_complete', 'true');
    trackEvent('first_session_completed');
    router.push('/dashboard');
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--border-light)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Progress Bar */}
      <div className="p-4">
        <ProgressBar currentStep={step} />
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex items-center justify-center py-8 transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {step === 'welcome' && (
          <WelcomeStep firstName={firstName} onNext={() => transitionTo('mood')} />
        )}
        {step === 'mood' && (
          <MoodStep firstName={firstName} onNext={() => {}} onMoodSubmit={handleMoodSubmit} />
        )}
        {step === 'journal' && (
          <JournalStep firstName={firstName} onNext={() => {}} onJournalSubmit={handleJournalSubmit} />
        )}
        {step === 'ers' && (
          <ERSStep
            firstName={firstName}
            onNext={() => transitionTo('complete')}
            ersScore={ersScore}
            ersStage={ersStage}
            loading={calculatingErs}
          />
        )}
        {step === 'complete' && (
          <CompleteStep firstName={firstName} onNext={handleComplete} />
        )}
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}
