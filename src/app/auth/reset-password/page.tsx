'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has a valid session from the reset link
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div
        className="rounded-3xl p-8"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <div className="flex items-center justify-center py-8">
          <svg className="h-8 w-8 animate-spin" style={{ color: '#5B8A72' }} viewBox="0 0 24 24" aria-hidden="true">
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
        </div>
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div
        className="rounded-3xl p-8"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(184,107,100,0.1)' }}
          >
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#B86B64"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1
            className="text-[24px] font-bold"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Invalid or expired link
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: '#5C574F' }}>
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-6 inline-block rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#5B8A72' }}
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  // Success state
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
            Password updated
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: '#5C574F' }}>
            Your password has been successfully reset. Redirecting you to log in...
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-[14px] font-medium"
            style={{ color: '#5B8A72' }}
          >
            Go to log in now
          </Link>
        </div>
      </div>
    );
  }

  // Main form
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
          Set new password
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: '#5C574F' }}>
          Enter your new password below
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
            htmlFor="password"
            className="block text-[14px] font-medium mb-1.5"
            style={{ color: '#5C574F' }}
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
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
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-[14px] font-medium mb-1.5"
            style={{ color: '#5C574F' }}
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
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
            placeholder="Confirm your new password"
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
              Updating password...
            </span>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </div>
  );
}
