'use client';

import ErrorBoundary from './ErrorBoundary';
import OfflineBanner from './OfflineBanner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      {children}
    </ErrorBoundary>
  );
}
