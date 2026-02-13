'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enableDemoMode } from '@/lib/demo-mode';

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    enableDemoMode();
    const timer = setTimeout(() => {
      router.push('/');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#F9F6F2' }}
    >
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(91,138,114,0.1)' }}
        >
          <span
            className="text-[32px] font-bold"
            style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
          >
            P
          </span>
        </div>
        <h1
          className="text-[28px] font-bold mb-2"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          Entering Demo Mode
        </h1>
        <p className="text-[16px]" style={{ color: '#5C574F' }}>
          Loading sample data...
        </p>
        <div className="mt-8 flex justify-center">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{
              borderColor: 'rgba(91,138,114,0.2)',
              borderTopColor: '#5B8A72'
            }}
          />
        </div>
      </div>
    </div>
  );
}
