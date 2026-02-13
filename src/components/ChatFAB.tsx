'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Chat bubble icon
function ChatBubbleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

// Pages where the FAB should be visible
const VISIBLE_PATHS = [
  '/dashboard',
  '/mood',
  '/journal',
  '/ers',
  '/predictions',
  '/exercises',
  '/settings',
];

export default function ChatFAB() {
  const pathname = usePathname();
  const [shouldPulse, setShouldPulse] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check if FAB should be visible on this page
  useEffect(() => {
    const shouldShow = VISIBLE_PATHS.some(path => pathname === path || pathname?.startsWith(path + '/'));
    setIsVisible(shouldShow && pathname !== '/chat');
  }, [pathname]);

  // Check if user has seen the chat before
  useEffect(() => {
    const hasSeenChat = localStorage.getItem('paceful_chat_seen');
    if (!hasSeenChat) {
      setShouldPulse(true);
      // Stop pulse after 3 cycles (about 6 seconds)
      const timer = setTimeout(() => {
        setShouldPulse(false);
        localStorage.setItem('paceful_chat_seen', 'true');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <Link
        href="/chat"
        className={`fixed z-40 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${shouldPulse ? 'animate-pulse-ring' : ''}`}
        style={{
          bottom: '90px',
          right: '20px',
          background: 'var(--primary)',
          boxShadow: '0 4px 20px rgba(91,138,114,0.35)',
        }}
        aria-label="Chat with Pace"
        onClick={() => {
          localStorage.setItem('paceful_chat_seen', 'true');
        }}
      >
        <ChatBubbleIcon className="w-6 h-6" style={{ color: 'white' }} />
      </Link>

      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 4px 20px rgba(91,138,114,0.35), 0 0 0 0 rgba(91,138,114,0.4);
          }
          70% {
            box-shadow: 0 4px 20px rgba(91,138,114,0.35), 0 0 0 12px rgba(91,138,114,0);
          }
          100% {
            box-shadow: 0 4px 20px rgba(91,138,114,0.35), 0 0 0 0 rgba(91,138,114,0);
          }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>
    </>
  );
}
