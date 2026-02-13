'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) {
      setError('No email address found');
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      setResendSuccess(true);
      // Reset success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="rounded-3xl p-8"
      style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
    >
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(91,138,114,0.1)' }}
        >
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#5B8A72"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
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
          We sent a verification link to
        </p>
        {email && (
          <p className="mt-1 font-medium text-[14px]" style={{ color: '#1F1D1A' }}>
            {email}
          </p>
        )}

        <div
          className="mt-6 rounded-2xl p-4"
          style={{ background: '#F3EFE9' }}
        >
          <p className="text-[14px]" style={{ color: '#5C574F' }}>
            Click the link in the email to activate your account and start your journey.
          </p>
        </div>

        {error && (
          <div
            className="mt-4 rounded-2xl p-3 text-[14px]"
            style={{ background: 'rgba(184,107,100,0.1)', color: '#B86B64' }}
          >
            {error}
          </div>
        )}

        {resendSuccess && (
          <div
            className="mt-4 rounded-2xl p-3 text-[14px]"
            style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
          >
            Verification email sent! Check your inbox.
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleResend}
            disabled={isResending || !email}
            className="w-full rounded-full py-[14px] text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'transparent',
              border: '2px solid #5B8A72',
              color: '#5B8A72',
            }}
          >
            {isResending ? (
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
                Resending...
              </span>
            ) : (
              'Resend email'
            )}
          </button>

          <Link
            href="/auth/login"
            className="block w-full rounded-full py-[14px] text-[15px] font-semibold text-white text-center transition-opacity hover:opacity-90"
            style={{ background: '#5B8A72' }}
          >
            Back to log in
          </Link>
        </div>

        <p className="mt-6 text-[12px]" style={{ color: '#9A938A' }}>
          Didn&apos;t receive the email? Check your spam folder or try signing up with a different email address.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
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
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
