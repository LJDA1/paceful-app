'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { trackConversion } from '@/lib/conversion-track';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track login page view
  useEffect(() => {
    trackConversion('login_page_view');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email before signing in');
        } else {
          setError(signInError.message);
        }
        return;
      }

      // Redirect to dashboard or onboarding
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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
          Welcome back
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: '#5C574F' }}>
          Log in to continue your journey
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="text-[14px] font-medium"
              style={{ color: '#5C574F' }}
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[13px] font-medium"
              style={{ color: '#5B8A72' }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
            placeholder="Your password"
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
              Signing in...
            </span>
          ) : (
            'Log in'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-[14px]">
        <span style={{ color: '#5C574F' }}>Don&apos;t have an account?</span>{' '}
        <Link href="/auth/signup" className="font-medium" style={{ color: '#5B8A72' }}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
