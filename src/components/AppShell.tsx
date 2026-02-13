'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import ErrorBoundary from './ErrorBoundary';
import OfflineBanner from './OfflineBanner';
import ChatFAB from './ChatFAB';

const noNavRoutes = ['/auth', '/onboarding', '/login', '/signup'];
const marketingRoutes = ['/design-partners', '/investors', '/api-docs', '/privacy', '/terms', '/demo', '/pricing'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isNoNav = noNavRoutes.some(route => pathname.startsWith(route));
  const isMarketing = marketingRoutes.some(route => pathname === route);

  // Show nav only for authenticated app pages (not landing, not auth, not marketing)
  const showNav = !isNoNav && !isMarketing && pathname !== '/';

  if (!showNav) {
    return (
      <ErrorBoundary>
        <OfflineBanner />
        {children}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <Navigation />
      <main
        className="pb-24 md:pb-0 md:ml-64"
        style={{ background: 'var(--bg)' }}
      >
        {children}
      </main>
      <ChatFAB />
    </ErrorBoundary>
  );
}
