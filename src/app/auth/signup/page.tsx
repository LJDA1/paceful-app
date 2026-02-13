'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { trackConversion, flushConversionEvents } from '@/lib/conversion-track';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track signup page view
  useEffect(() => {
    trackConversion('signup_page_view');
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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          user_id: signUpData.user.id,
          first_name: '',
          date_of_birth: '2000-01-01',
          onboarding_completed: false,
        }, { onConflict: 'user_id' });

        // Track signup completion and flush all conversion events
        trackConversion('signup_complete');
        await flushConversionEvents(signUpData.user.id, supabase);
      }

      router.push('/onboarding');
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
          Create your account
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: '#5C574F' }}>
          Start your healing journey
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
          <label
            htmlFor="password"
            className="block text-[14px] font-medium mb-1.5"
            style={{ color: '#5C574F' }}
          >
            Password
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
            Confirm Password
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
            placeholder="Confirm your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#5B8A72' }}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="mt-6 text-center text-[14px]">
        <span style={{ color: '#5C574F' }}>Already have an account?</span>{' '}
        <Link href="/auth/login" className="font-medium" style={{ color: '#5B8A72' }}>
          Log in
        </Link>
      </div>
    </div>
  );
}
