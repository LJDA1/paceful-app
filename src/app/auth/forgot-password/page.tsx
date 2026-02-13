'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className="rounded-3xl p-8"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(91,138,114,0.1)' }}
          >
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#5B8A72"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1
            className="text-[24px] font-bold"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Check your email
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: '#5C574F' }}>
            We&apos;ve sent a password reset link to
          </p>
          <p className="mt-1 font-medium text-[14px]" style={{ color: '#1F1D1A' }}>
            {email}
          </p>
          <p className="mt-4 text-[13px]" style={{ color: '#9A938A' }}>
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setIsSuccess(false)}
              className="font-medium"
              style={{ color: '#5B8A72' }}
            >
              try again
            </button>
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-[14px] font-medium"
            style={{ color: '#5B8A72' }}
          >
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl p-8"
      style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
    >
      <div className="mb-6 text-center">
        <h1
          className="text-[24px] font-bold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          Reset password
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: '#5C574F' }}>
          We&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="rounded-2xl p-3 text-[14px]"
            style={{ background: 'rgba(184,107,100,0.1)', color: '#B86B64' }}
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-[14px] font-medium mb-1.5"
            style={{ color: '#5C574F' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="block w-full rounded-2xl px-[18px] py-[14px] text-[15px] outline-none transition-colors"
            style={{
              background: '#F9F6F2',
              border: '1px solid #E8E2DA',
              color: '#1F1D1A',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#5B8A72';
              e.target.style.background = '#F3EFE9';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E8E2DA';
              e.target.style.background = '#F9F6F2';
            }}
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#5B8A72' }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending...
            </span>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="text-[14px] font-medium"
          style={{ color: '#5B8A72' }}
        >
          Back to log in
        </Link>
      </div>
    </div>
  );
}
