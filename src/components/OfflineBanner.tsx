'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        maxHeight: isOnline ? 0 : 40,
        backgroundColor: 'rgba(212, 151, 59, 0.12)',
      }}
    >
      <div className="flex items-center justify-center gap-2 h-9 px-4">
        <svg
          className="w-4 h-4"
          style={{ color: '#D4973B' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-6.657L5.636 5.636m12.728 12.728L5.636 5.636M3 3l3.5 3.5"
          />
        </svg>
        <span
          className="font-sans text-[13px]"
          style={{ color: '#D4973B' }}
        >
          You&apos;re offline. Some features may be unavailable.
        </span>
      </div>
    </div>
  );
}
