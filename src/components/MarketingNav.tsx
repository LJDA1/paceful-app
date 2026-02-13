'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HamburgerIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/design-partners', label: 'Partners' },
  { href: '/api-docs', label: 'API' },
];

export default function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => {
    if (href.includes('#')) {
      return pathname === '/';
    }
    return pathname === href;
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(249,246,242,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #F0EBE4',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-[20px] font-bold"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Paceful
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] transition-colors"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  color: isActive(link.href) ? '#5B8A72' : '#5C574F',
                  fontWeight: isActive(link.href) ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive(link.href)) {
                    e.currentTarget.style.color = '#1F1D1A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(link.href)) {
                    e.currentTarget.style.color = '#5C574F';
                  }
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-[14px] transition-colors"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: '#5C574F',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1F1D1A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#5C574F';
              }}
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="text-[14px] font-medium text-white rounded-full px-5 py-2 transition-opacity hover:opacity-90"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: '#5B8A72',
              }}
            >
              Get started
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <HamburgerIcon className="w-6 h-6" style={{ color: '#1F1D1A' }} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[280px] z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: '#FFFFFF' }}
      >
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2"
            aria-label="Close menu"
          >
            <CloseIcon className="w-6 h-6" style={{ color: '#1F1D1A' }} />
          </button>
        </div>

        {/* Mobile Nav Links */}
        <div className="flex flex-col px-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-4 text-[16px] transition-colors"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: isActive(link.href) ? '#5B8A72' : '#5C574F',
                fontWeight: isActive(link.href) ? 600 : 400,
                borderBottom: '1px solid #F0EBE4',
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth/login"
            className="py-4 text-[16px] transition-colors"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: '#5C574F',
              borderBottom: '1px solid #F0EBE4',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Log in
          </Link>
        </div>

        {/* Mobile CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ borderTop: '1px solid #F0EBE4' }}>
          <Link
            href="/auth/signup"
            className="block w-full text-center text-[16px] font-medium text-white rounded-full py-3 transition-opacity hover:opacity-90"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: '#5B8A72',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Get started
          </Link>
        </div>
      </div>
    </>
  );
}
