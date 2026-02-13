'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

// ============================================================================
// Types
// ============================================================================

interface OnboardingData {
  firstName: string;
  dateOfBirth: string;
  gender: string;
  breakupDate: string;
  relationshipDuration: number;
  initiator: 'self' | 'partner' | 'mutual' | '';
  livingSituation: 'alone' | 'roommates' | 'family' | 'with-ex' | '';
  therapyStatus: 'current' | 'past' | 'considering' | 'not-interested' | '';
  supportSystem: string[];
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
// Styles
// ============================================================================

const inputStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E8E2DA',
  color: '#1F1D1A',
};

const inputFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#5B8A72';
  e.target.style.boxShadow = '0 0 0 3px rgba(91,138,114,0.1)';
};

const inputBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#E8E2DA';
  e.target.style.boxShadow = 'none';
};

// ============================================================================
// Step Indicator
// ============================================================================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style={{
              background:
                i + 1 === currentStep
                  ? '#5B8A72'
                  : i + 1 < currentStep
                  ? '#7BA896'
                  : '#E8E2DA',
              transform: i + 1 === currentStep ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>
      <p className="text-center text-[13px] mt-3" style={{ color: '#9A938A' }}>
        Step {currentStep} of {totalSteps}
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
    <div className="space-y-5" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
      <div className="text-center mb-6">
        <h2
          className="text-[22px] font-semibold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          Let&apos;s get to know you
        </h2>
        <p className="text-[14px] mt-1" style={{ color: '#9A938A' }}>
          This helps us personalize your healing experience
        </p>
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-1.5" style={{ color: '#5C574F' }}>
          What should we call you?
        </label>
        <input
          type="text"
          value={data.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          className="w-full px-[18px] py-[14px] rounded-2xl text-[15px] outline-none transition-all"
          style={inputStyle}
          onFocus={inputFocusStyle}
          onBlur={inputBlurStyle}
          placeholder="Your first name"
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-1.5" style={{ color: '#5C574F' }}>
          Date of birth
        </label>
        <input
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-[18px] py-[14px] rounded-2xl text-[15px] outline-none transition-all"
          style={inputStyle}
          onFocus={inputFocusStyle}
          onBlur={inputBlurStyle}
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-2" style={{ color: '#5C574F' }}>
          How do you identify?
        </label>
        <div className="flex flex-wrap gap-2">
          {['Male', 'Female', 'Non-binary', 'Other'].map((option) => {
            const value = option.toLowerCase();
            const isSelected = data.gender === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ gender: value })}
                className="px-5 py-2.5 rounded-full text-[14px] font-medium transition-all"
                style={{
                  background: isSelected ? '#5B8A72' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#5C574F',
                  border: isSelected ? '1px solid #5B8A72' : '1px solid #E8E2DA',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="w-full py-[14px] rounded-full text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        style={{ background: '#5B8A72' }}
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
    <div className="space-y-5" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
      <div className="text-center mb-6">
        <h2
          className="text-[22px] font-semibold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          About your relationship
        </h2>
        <p className="text-[14px] mt-1" style={{ color: '#9A938A' }}>
          This helps us understand where you are in your healing
        </p>
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-1.5" style={{ color: '#5C574F' }}>
          When did your relationship end?
        </label>
        <input
          type="date"
          value={data.breakupDate}
          onChange={(e) => onChange({ breakupDate: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-[18px] py-[14px] rounded-2xl text-[15px] outline-none transition-all"
          style={inputStyle}
          onFocus={inputFocusStyle}
          onBlur={inputBlurStyle}
        />
        {data.breakupDate && (
          <p className="mt-1.5 text-[13px]" style={{ color: '#9A938A' }}>
            {Math.floor((Date.now() - new Date(data.breakupDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
          </p>
        )}
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-1.5" style={{ color: '#5C574F' }}>
          How long was the relationship?
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="600"
            value={data.relationshipDuration || ''}
            onChange={(e) => onChange({ relationshipDuration: parseInt(e.target.value) || 0 })}
            className="flex-1 px-[18px] py-[14px] rounded-2xl text-[15px] outline-none transition-all"
            style={inputStyle}
            onFocus={inputFocusStyle}
            onBlur={inputBlurStyle}
            placeholder="0"
          />
          <span className="text-[14px]" style={{ color: '#5C574F' }}>months</span>
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-2" style={{ color: '#5C574F' }}>
          Who initiated the breakup?
        </label>
        <div className="space-y-2">
          {[
            { value: 'self', label: 'I did', desc: 'You made the decision to end it' },
            { value: 'partner', label: 'My partner', desc: 'They made the decision' },
            { value: 'mutual', label: 'Mutual', desc: 'We decided together' },
          ].map((option) => {
            const isSelected = data.initiator === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ initiator: option.value as 'self' | 'partner' | 'mutual' })}
                className="w-full px-4 py-3 rounded-2xl text-left transition-all"
                style={{
                  background: isSelected ? 'rgba(91,138,114,0.08)' : '#FFFFFF',
                  border: isSelected ? '2px solid #5B8A72' : '1px solid #E8E2DA',
                }}
              >
                <div className="font-medium text-[15px]" style={{ color: isSelected ? '#5B8A72' : '#1F1D1A' }}>
                  {option.label}
                </div>
                <div className="text-[13px]" style={{ color: '#9A938A' }}>{option.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onBack}
          className="flex-1 py-[14px] rounded-full text-[15px] font-medium transition-colors"
          style={{ color: '#9A938A' }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 py-[14px] rounded-full text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#5B8A72' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Current State
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
    <div className="space-y-5" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
      <div className="text-center mb-6">
        <h2
          className="text-[22px] font-semibold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          Your current situation
        </h2>
        <p className="text-[14px] mt-1" style={{ color: '#9A938A' }}>
          This helps us tailor recommendations to your life
        </p>
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-2" style={{ color: '#5C574F' }}>
          What&apos;s your current living situation?
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'alone', label: 'Living alone' },
            { value: 'roommates', label: 'Roommates' },
            { value: 'family', label: 'With family' },
            { value: 'with-ex', label: 'Still with ex' },
          ].map((option) => {
            const isSelected = data.livingSituation === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ livingSituation: option.value as OnboardingData['livingSituation'] })}
                className="px-4 py-2.5 rounded-full text-[14px] font-medium transition-all"
                style={{
                  background: isSelected ? '#5B8A72' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#5C574F',
                  border: isSelected ? '1px solid #5B8A72' : '1px solid #E8E2DA',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-2" style={{ color: '#5C574F' }}>
          Are you currently seeing a therapist?
        </label>
        <div className="space-y-2">
          {[
            { value: 'current', label: 'Yes, currently in therapy' },
            { value: 'past', label: 'I have in the past' },
            { value: 'considering', label: 'Considering it' },
            { value: 'not-interested', label: 'Not at this time' },
          ].map((option) => {
            const isSelected = data.therapyStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ therapyStatus: option.value as OnboardingData['therapyStatus'] })}
                className="w-full px-4 py-3 rounded-2xl text-left transition-all flex items-center gap-3"
                style={{
                  background: isSelected ? 'rgba(91,138,114,0.08)' : '#FFFFFF',
                  border: isSelected ? '2px solid #5B8A72' : '1px solid #E8E2DA',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: isSelected ? '#5B8A72' : '#E8E2DA' }}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-[15px]" style={{ color: isSelected ? '#5B8A72' : '#1F1D1A' }}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-2" style={{ color: '#5C574F' }}>
          Who do you have for support? <span style={{ color: '#9A938A' }}>(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {['Close friends', 'Family', 'Coworkers', 'Online community', 'Support group', 'Therapist'].map((item) => {
            const isSelected = data.supportSystem.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleSupport(item)}
                className="px-4 py-2 rounded-full text-[13px] font-medium transition-all"
                style={{
                  background: isSelected ? '#5B8A72' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#5C574F',
                  border: isSelected ? '1px solid #5B8A72' : '1px solid #E8E2DA',
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onBack}
          className="flex-1 py-[14px] rounded-full text-[15px] font-medium"
          style={{ color: '#9A938A' }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 py-[14px] rounded-full text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#5B8A72' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: ERS Explanation
// ============================================================================

function Step4ERSExplanation({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
      <div className="text-center mb-4">
        <h2
          className="text-[22px] font-semibold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          Your Emotional Readiness Score
        </h2>
        <p className="text-[14px] mt-1" style={{ color: '#9A938A' }}>
          Understanding how we measure your healing journey
        </p>
      </div>

      <div className="p-4 rounded-2xl" style={{ background: '#F3EFE9' }}>
        <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
          Paceful tracks your <strong style={{ color: '#1F1D1A' }}>Emotional Readiness Score</strong> — a number from 0 to 100
          that reflects where you are in your healing journey.
        </p>
      </div>

      {/* Stage cards */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(126,113,181,0.08)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(126,113,181,0.15)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#7E71B5' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[15px] font-semibold" style={{ color: '#7E71B5' }}>Healing</span>
              <span className="text-[12px]" style={{ color: '#9A938A' }}>0-35</span>
            </div>
            <p className="text-[13px]" style={{ color: '#5C574F' }}>Processing and adjusting. This is normal and important.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(91,138,114,0.08)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(91,138,114,0.15)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#5B8A72' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[15px] font-semibold" style={{ color: '#5B8A72' }}>Rebuilding</span>
              <span className="text-[12px]" style={{ color: '#9A938A' }}>35-65</span>
            </div>
            <p className="text-[13px]" style={{ color: '#5C574F' }}>Finding your footing. Patterns stabilizing.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(212,151,59,0.08)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,151,59,0.15)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#D4973B' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[15px] font-semibold" style={{ color: '#D4973B' }}>Ready</span>
              <span className="text-[12px]" style={{ color: '#9A938A' }}>65-100</span>
            </div>
            <p className="text-[13px]" style={{ color: '#5C574F' }}>Emotionally resilient. Ready for what&apos;s next.</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="py-2">
        <div className="h-2.5 rounded-full overflow-hidden flex">
          <div className="flex-1" style={{ background: '#7E71B5' }} />
          <div className="flex-1" style={{ background: '#5B8A72' }} />
          <div className="flex-1" style={{ background: '#D4973B' }} />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onBack}
          className="flex-1 py-[14px] rounded-full text-[15px] font-medium"
          style={{ color: '#9A938A' }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-[14px] rounded-full text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#5B8A72' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 5: Consent
// ============================================================================

function Step5Consent({
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

  const ConsentItem = ({
    checked,
    onToggle,
    title,
    description,
    required,
  }: {
    checked: boolean;
    onToggle: () => void;
    title: string;
    description: React.ReactNode;
    required?: boolean;
  }) => (
    <div
      className="p-4 rounded-2xl cursor-pointer transition-all"
      style={{
        background: checked ? 'rgba(91,138,114,0.08)' : '#FFFFFF',
        border: checked ? '2px solid #5B8A72' : '1px solid #E8E2DA',
      }}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors"
          style={{
            background: checked ? '#5B8A72' : '#FFFFFF',
            border: checked ? 'none' : '2px solid #E8E2DA',
          }}
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
        <div>
          <div className="font-medium text-[15px]" style={{ color: '#1F1D1A' }}>
            {title}
            {required && <span style={{ color: '#B86B64' }}> *</span>}
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: '#9A938A' }}>{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
      <div className="text-center mb-4">
        <h2
          className="text-[22px] font-semibold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          Your privacy matters
        </h2>
        <p className="text-[14px] mt-1" style={{ color: '#9A938A' }}>
          Review how we use your data to help you heal
        </p>
      </div>

      <ConsentItem
        checked={data.ersConsent}
        onToggle={() => onChange({ ersConsent: !data.ersConsent })}
        title="I consent to ERS tracking"
        description="Allow Paceful to track your Emotional Readiness Score based on your activity."
        required
      />

      <ConsentItem
        checked={data.b2bConsent}
        onToggle={() => onChange({ b2bConsent: !data.b2bConsent })}
        title="Allow B2B data sharing"
        description="Allow anonymized predictions to be shared with partner platforms. Your identity is never revealed."
      />

      <ConsentItem
        checked={data.researchConsent}
        onToggle={() => onChange({ researchConsent: !data.researchConsent })}
        title="Contribute to research"
        description="Help improve breakup recovery research by sharing anonymized, aggregated data."
      />

      <ConsentItem
        checked={data.termsAccepted}
        onToggle={() => onChange({ termsAccepted: !data.termsAccepted })}
        title="I accept the Terms of Service"
        description={
          <>
            I have read and agree to the{' '}
            <a href="/terms" style={{ color: '#5B8A72' }} onClick={(e) => e.stopPropagation()}>Terms</a> and{' '}
            <a href="/privacy" style={{ color: '#5B8A72' }} onClick={(e) => e.stopPropagation()}>Privacy Policy</a>.
          </>
        }
        required
      />

      <div className="p-4 rounded-2xl" style={{ background: '#F3EFE9' }}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#9A938A">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-[13px]" style={{ color: '#5C574F' }}>
            <strong>Your data is secure.</strong> We use encryption and never sell your personal information.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-[14px] rounded-full text-[15px] font-medium disabled:opacity-50"
          style={{ color: '#9A938A' }}
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 py-[14px] rounded-full text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: '#5B8A72' }}
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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

      if (!userId) {
        setError('Not logged in. Please sign in first.');
        setIsSubmitting(false);
        return;
      }

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
        }, { onConflict: 'user_id' });

      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Failed to save profile. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (userId) {
        const consents = [];
        if (data.ersConsent) consents.push({ user_id: userId, consent_type: 'ers_tracking', consent_given: true });
        if (data.b2bConsent) consents.push({ user_id: userId, consent_type: 'b2b_data_sharing', consent_given: true });
        if (data.researchConsent) consents.push({ user_id: userId, consent_type: 'research_data_sharing', consent_given: true });
        if (data.termsAccepted) consents.push({ user_id: userId, consent_type: 'terms_of_service', consent_given: true });

        if (consents.length > 0) {
          await supabase.from('consent_records').insert(consents);
        }
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9F6F2' }}>
        <svg className="w-8 h-8 animate-spin" style={{ color: '#5B8A72' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Not authenticated
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F9F6F2' }}>
        <div className="text-center p-8 rounded-3xl max-w-md w-full" style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}>
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(91,138,114,0.1)' }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#5B8A72">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold mb-2" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>
            Sign in required
          </h1>
          <p className="text-[14px] mb-6" style={{ color: '#9A938A' }}>
            Please sign in or create an account to continue.
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 rounded-full text-[15px] font-semibold text-white text-center"
              style={{ background: '#5B8A72' }}
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="block w-full py-3 rounded-full text-[15px] font-medium text-center"
              style={{ background: '#F3EFE9', color: '#5C574F' }}
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F9F6F2' }}>
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link
            href="/"
            className="text-[22px] font-semibold"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Paceful
          </Link>
          <p className="text-[13px] mt-1" style={{ color: '#9A938A' }}>Welcome! Let&apos;s set up your account.</p>
        </div>

        <StepIndicator currentStep={step} totalSteps={5} />

        {/* Form Card */}
        <div className="rounded-3xl p-8" style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}>
          {error && (
            <div className="mb-4 p-3 rounded-2xl text-[14px]" style={{ background: 'rgba(184,107,100,0.1)', color: '#B86B64' }}>
              {error}
            </div>
          )}

          {step === 1 && <Step1BasicInfo data={data} onChange={updateData} onNext={() => setStep(2)} />}
          {step === 2 && <Step2BreakupContext data={data} onChange={updateData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <Step3CurrentState data={data} onChange={updateData} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <Step4ERSExplanation onNext={() => setStep(5)} onBack={() => setStep(3)} />}
          {step === 5 && <Step5Consent data={data} onChange={updateData} onSubmit={handleSubmit} onBack={() => setStep(4)} isSubmitting={isSubmitting} />}
        </div>

        {/* Skip link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-4 py-2 text-[13px]"
          style={{ color: '#9A938A' }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
