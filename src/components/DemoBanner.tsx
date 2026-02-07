'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { isDemoMode, disableDemoMode } from '@/lib/demo-mode';

export default function DemoBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(isDemoMode());
  }, []);

  if (!showBanner) return null;

  const handleExit = () => {
    disableDemoMode();
    setShowBanner(false);
    window.location.href = '/';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-400 text-amber-900 py-2 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👀</span>
          <span className="font-medium">
            You&apos;re viewing demo data. Sign up to track your own journey.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="px-3 py-1 text-sm font-medium hover:underline"
          >
            Exit Demo
          </button>
          <Link
            href="/signup"
            className="px-4 py-1.5 bg-amber-900 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
