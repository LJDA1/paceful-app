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
    <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-stone-100">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-stone-900">Create your account</h1>
        <p className="mt-2 text-sm text-stone-600">
          Start your emotional recovery journey today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
            className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="you@example.com" />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8}
            className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="At least 8 characters" />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700">Confirm Password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password"
            className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Confirm your password" />
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-stone-600">Already have an account?</span>{' '}
        <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">Sign in</Link>
      </div>
    </div>
  );
}
