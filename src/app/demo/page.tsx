'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enableDemoMode } from '@/lib/demo-mode';

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    enableDemoMode();
    // Redirect to dashboard after enabling demo mode
    const timer = setTimeout(() => {
      router.push('/');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="text-center text-white">
        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-4xl">💜</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Entering Demo Mode</h1>
        <p className="text-indigo-100">Loading sample data...</p>
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
