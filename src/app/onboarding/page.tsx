'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

// ============================================================================
// Types
// ============================================================================

interface OnboardingData {
  // Step 1: Basic Info
  firstName: string;
  dateOfBirth: string;
  gender: string;

  // Step 2: Breakup Context
  breakupDate: string;
  relationshipDuration: number;
  initiator: 'self' | 'partner' | 'mutual' | '';

  // Step 3: Current State
  livingSituation: 'alone' | 'roommates' | 'family' | 'with-ex' | '';
  therapyStatus: 'current' | 'past' | 'considering' | 'not-interested' | '';
  supportSystem: string[];

  // Step 4: Consent
  ersConsent: boolean;
  researchConsent: boolean;
  b2bConsent: boolean;
  termsAccepted: boolean;
}

const initialData: OnboardingData = {
  firstName: '',
  dateOfBirth: '',
  gender: '',
  breakupDate: '',
  relationshipDuration: 0,
  initiator: '',
  livingSituation: '',
  therapyStatus: '',
  supportSystem: [],
  ersConsent: false,
  researchConsent: false,
  b2bConsent: false,
  termsAccepted: false,
};

// ============================================================================
// Step Indicator
// ============================================================================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const stepLabels = ['Basic Info', 'Breakup', 'Current State', 'Consent'];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i + 1 === currentStep
                  ? 'bg-indigo-600 text-white'
                  : i + 1 < currentStep
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-200 text-stone-500'
              }`}
            >
              {i + 1 < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`w-8 sm:w-12 h-1 mx-1 rounded-full transition-colors ${
                  i + 1 < currentStep ? 'bg-emerald-500' : 'bg-stone-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-stone-500 mt-2">
        {stepLabels[currentStep - 1]}
      </p>
    </div>
  );
}

// ============================================================================
// Step 1: Basic Info
// ============================================================================

function Step1BasicInfo({
  data,
  onChange,
  onNext,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}) {
  const isValid = data.firstName.trim() && data.dateOfBirth && data.gender;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-stone-800">Let&apos;s get to know you</h2>
        <p className="text-stone-500 mt-1">This helps us personalize your healing experience</p>
      </div>

      {/* First Name */}
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 mb-1">
          What should we call you?
        </label>
        <input
          id="firstName"
          type="text"
          value={data.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          placeholder="Your first name"
        />
      </div>

      {/* Date of Birth */}
      <div>
        <label htmlFor="dob" className="block text-sm font-medium text-stone-700 mb-1">
          Date of birth
        </label>
        <input
          id="dob"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          How do you identify?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'non-binary', label: 'Non-binary' },
            { value: 'other', label: 'Other' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ gender: option.value })}
              className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                data.gender === option.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!isValid}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium mt-6"
      >
        Continue
      </button>
    </div>
  );
}

// ============================================================================
// Step 2: Breakup Context
// ============================================================================

function Step2BreakupContext({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const isValid = data.breakupDate && data.relationshipDuration > 0 && data.initiator;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-stone-800">About your relationship</h2>
        <p className="text-stone-500 mt-1">This helps us understand where you are in your healing</p>
      </div>

      {/* Breakup Date */}
      <div>
        <label htmlFor="breakupDate" className="block text-sm font-medium text-stone-700 mb-1">
          When did your relationship end?
        </label>
        <input
          id="breakupDate"
          type="date"
          value={data.breakupDate}
          onChange={(e) => onChange({ breakupDate: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
        {data.breakupDate && (
          <p className="mt-1 text-sm text-stone-500">
            {Math.floor((Date.now() - new Date(data.breakupDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
          </p>
        )}
      </div>

      {/* Relationship Duration */}
      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-stone-700 mb-1">
          How long was the relationship?
        </label>
        <div className="flex items-center gap-3">
          <input
            id="duration"
            type="number"
            min="1"
            max="600"
            value={data.relationshipDuration || ''}
            onChange={(e) => onChange({ relationshipDuration: parseInt(e.target.value) || 0 })}
            className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            placeholder="0"
          />
          <span className="text-stone-600">months</span>
        </div>
        {data.relationshipDuration > 0 && (
          <p className="mt-1 text-sm text-stone-500">
            {data.relationshipDuration >= 12
              ? `${Math.floor(data.relationshipDuration / 12)} year${Math.floor(data.relationshipDuration / 12) > 1 ? 's' : ''} ${data.relationshipDuration % 12 > 0 ? `${data.relationshipDuration % 12} months` : ''}`
              : `${data.relationshipDuration} months`}
          </p>
        )}
      </div>

      {/* Initiator */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Who initiated the breakup?
        </label>
        <div className="space-y-2">
          {[
            { value: 'self', label: 'I did', description: 'You made the decision to end it' },
            { value: 'partner', label: 'My partner', description: 'They made the decision' },
            { value: 'mutual', label: 'Mutual', description: 'We decided together' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ initiator: option.value as 'self' | 'partner' | 'mutual' })}
              className={`w-full px-4 py-3 rounded-xl border text-left transition-all ${
                data.initiator === option.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-stone-300 hover:border-stone-400'
              }`}
            >
              <div className={`font-medium ${data.initiator === option.value ? 'text-indigo-700' : 'text-stone-700'}`}>
                {option.label}
              </div>
              <div className="text-sm text-stone-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-stone-300 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Current State (NEW)
// ============================================================================

function Step3CurrentState({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const isValid = data.livingSituation && data.therapyStatus;

  const toggleSupport = (item: string) => {
    const current = data.supportSystem || [];
    if (current.includes(item)) {
      onChange({ supportSystem: current.filter(s => s !== item) });
    } else {
      onChange({ supportSystem: [...current, item] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-stone-800">Your current situation</h2>
        <p className="text-stone-500 mt-1">This helps us tailor recommendations to your life</p>
      </div>

      {/* Living Situation */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          What&apos;s your current living situation?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'alone', label: 'Living alone' },
            { value: 'roommates', label: 'With roommates' },
            { value: 'family', label: 'With family' },
            { value: 'with-ex', label: 'Still with ex' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ livingSituation: option.value as OnboardingData['livingSituation'] })}
              className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                data.livingSituation === option.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Therapy Status */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Are you currently seeing a therapist?
        </label>
        <div className="space-y-2">
          {[
            { value: 'current', label: 'Yes, currently in therapy', icon: '✓' },
            { value: 'past', label: 'I have in the past', icon: '↩' },
            { value: 'considering', label: 'Considering it', icon: '?' },
            { value: 'not-interested', label: 'Not at this time', icon: '–' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ therapyStatus: option.value as OnboardingData['therapyStatus'] })}
              className={`w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                data.therapyStatus === option.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-stone-300 hover:border-stone-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                data.therapyStatus === option.value ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                {option.icon}
              </span>
              <span className={`font-medium ${data.therapyStatus === option.value ? 'text-indigo-700' : 'text-stone-700'}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Support System */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Who do you have for support? <span className="text-stone-400">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            'Close friends',
            'Family',
            'Coworkers',
            'Online community',
            'Support group',
            'Therapist',
          ].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleSupport(item)}
              className={`px-3 py-2 rounded-full border text-sm transition-all ${
                data.supportSystem.includes(item)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-stone-300 text-stone-600 hover:border-stone-400'
              }`}
            >
              {data.supportSystem.includes(item) && '✓ '}{item}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-stone-300 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: Consent (updated from Step 3)
// ============================================================================

function Step4Consent({
  data,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const isValid = data.ersConsent && data.termsAccepted;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-stone-800">Your privacy matters</h2>
        <p className="text-stone-500 mt-1">Review how we use your data to help you heal</p>
      </div>

      {/* ERS Consent */}
      <div
        className={`p-4 rounded-xl border-2 transition-colors cursor-pointer ${
          data.ersConsent ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'
        }`}
        onClick={() => onChange({ ersConsent: !data.ersConsent })}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
              data.ersConsent ? 'border-indigo-600 bg-indigo-600' : 'border-stone-300'
            }`}
          >
            {data.ersConsent && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
          <div>
            <div className="font-medium text-stone-800">
              I consent to ERS tracking
              <span className="text-rose-500 ml-1">*</span>
            </div>
            <p className="text-sm text-stone-500 mt-1">
              Allow Paceful to track your Emotional Readiness Score based on your journal entries,
              mood logs, and app engagement.
            </p>
          </div>
        </div>
      </div>

      {/* B2B Data Sharing Consent */}
      <div
        className={`p-4 rounded-xl border-2 transition-colors cursor-pointer ${
          data.b2bConsent ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'
        }`}
        onClick={() => onChange({ b2bConsent: !data.b2bConsent })}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
              data.b2bConsent ? 'border-indigo-600 bg-indigo-600' : 'border-stone-300'
            }`}
          >
            {data.b2bConsent && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
          <div>
            <div className="font-medium text-stone-800">
              Allow B2B data sharing
              <span className="text-stone-400 ml-1">(optional)</span>
            </div>
            <p className="text-sm text-stone-500 mt-1">
              Allow anonymized predictions to be shared with partner platforms (dating apps, wellness tools)
              to help improve their services. Your identity is never revealed.
            </p>
          </div>
        </div>
      </div>

      {/* Research Consent */}
      <div
        className={`p-4 rounded-xl border-2 transition-colors cursor-pointer ${
          data.researchConsent ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'
        }`}
        onClick={() => onChange({ researchConsent: !data.researchConsent })}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
              data.researchConsent ? 'border-indigo-600 bg-indigo-600' : 'border-stone-300'
            }`}
          >
            {data.researchConsent && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
          <div>
            <div className="font-medium text-stone-800">
              Contribute to research
              <span className="text-stone-400 ml-1">(optional)</span>
            </div>
            <p className="text-sm text-stone-500 mt-1">
              Help improve breakup recovery research by sharing anonymized, aggregated data.
            </p>
          </div>
        </div>
      </div>

      {/* Terms Acceptance */}
      <div
        className={`p-4 rounded-xl border-2 transition-colors cursor-pointer ${
          data.termsAccepted ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'
        }`}
        onClick={() => onChange({ termsAccepted: !data.termsAccepted })}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
              data.termsAccepted ? 'border-indigo-600 bg-indigo-600' : 'border-stone-300'
            }`}
          >
            {data.termsAccepted && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
          <div>
            <div className="font-medium text-stone-800">
              I accept the Terms of Service
              <span className="text-rose-500 ml-1">*</span>
            </div>
            <p className="text-sm text-stone-500 mt-1">
              I have read and agree to the{' '}
              <a href="/terms" className="text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="p-4 bg-stone-50 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-stone-400 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <div className="text-sm text-stone-600">
            <strong>Your data is secure.</strong> We use encryption and never sell your personal information.
            You can delete your account and all data at any time.
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 border border-stone-300 text-stone-600 rounded-xl hover:bg-stone-50 disabled:opacity-50 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Setting up...
            </>
          ) : (
            'Get Started'
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Onboarding Page
// ============================================================================

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Get current user
  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      setAuthChecked(true);
    }
    getUser();
  }, []);


  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Must have a user ID
      if (!userId) {
        setError('Not logged in. Please sign in first.');
        setIsSubmitting(false);
        return;
      }

      // Upsert profile (creates if doesn't exist, updates if it does)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          first_name: data.firstName,
          date_of_birth: data.dateOfBirth,
          gender: data.gender,
          relationship_ended_at: data.breakupDate,
          relationship_duration_months: data.relationshipDuration,
          breakup_initiated_by: data.initiator,
          living_situation: data.livingSituation,
          therapy_status: data.therapyStatus,
          support_system: data.supportSystem,
          onboarding_completed: true,
        }, {
          onConflict: 'user_id',
        });

      if (profileError) {
        console.error('Profile error:', JSON.stringify(profileError, null, 2));
        console.error('Profile error code:', profileError.code);
        console.error('Profile error message:', profileError.message);
        console.error('Profile error details:', profileError.details);
        setError('Failed to save profile. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Record consents (need auth user_id, not profile id)
      // For demo mode, we skip consent records since we don't have a real auth user
      if (userId) {
        const consents = [];

        if (data.ersConsent) {
          consents.push({
            user_id: userId,
            consent_type: 'ers_tracking',
            consent_given: true,
          });
        }

        if (data.b2bConsent) {
          consents.push({
            user_id: userId,
            consent_type: 'b2b_data_sharing',
            consent_given: true,
          });
        }

        if (data.researchConsent) {
          consents.push({
            user_id: userId,
            consent_type: 'research_data_sharing',
            consent_given: true,
          });
        }

        if (data.termsAccepted) {
          consents.push({
            user_id: userId,
            consent_type: 'terms_of_service',
            consent_given: true,
          });
        }

        if (consents.length > 0) {
          const { error: consentError } = await supabase
            .from('consent_records')
            .insert(consents);

          if (consentError) {
            console.error('Consent error:', consentError);
            // Continue anyway - consent records may fail in demo mode
          }
        }
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 flex items-center justify-center px-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-3xl">💜</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Sign in required</h1>
          <p className="text-stone-600 mb-6">Please sign in or create an account to continue.</p>
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-center"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="block w-full py-3 px-4 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-2xl" role="img" aria-label="Purple heart">💜</span>
          </div>
          <p className="text-sm text-stone-500">Welcome to Paceful</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={4} />

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              {error}
            </div>
          )}

          {/* Steps */}
          {step === 1 && (
            <Step1BasicInfo
              data={data}
              onChange={updateData}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <Step2BreakupContext
              data={data}
              onChange={updateData}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3CurrentState
              data={data}
              onChange={updateData}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <Step4Consent
              data={data}
              onChange={updateData}
              onSubmit={handleSubmit}
              onBack={() => setStep(3)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Skip for Demo */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-4 py-2 text-stone-400 hover:text-stone-600 text-sm"
        >
          Skip for now (Demo mode)
        </button>
      </div>
    </div>
  );
}
