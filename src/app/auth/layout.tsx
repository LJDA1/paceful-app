import { Metadata } from 'next';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-stone-50">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <a href="/" className="text-2xl font-bold text-indigo-600">
            paceful
          </a>
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
        <p className="mt-8 text-center text-sm text-stone-500">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-indigo-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-indigo-600 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
