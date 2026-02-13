import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Paceful - Authentication',
  description: 'Sign in or create an account to start your emotional recovery journey.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-[24px] font-semibold"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Paceful
          </Link>
        </div>
        <div className="w-full max-w-[420px]">
          {children}
        </div>
        <p className="mt-8 text-center text-[13px]" style={{ color: '#9A938A' }}>
          By continuing, you agree to our{' '}
          <Link href="/terms" style={{ color: '#5B8A72' }}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" style={{ color: '#5B8A72' }}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
