'use client';

import Link from 'next/link';

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/', label: 'How it works' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/api-docs', label: 'API Docs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/design-partners', label: 'Partners' },
      { href: '/investors', label: 'Investors' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ background: '#F3EFE9' }}>
      <div className="max-w-[1200px] mx-auto px-6 pt-[60px] pb-[30px]">
        {/* Top Row - Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4
                className="text-[13px] font-semibold uppercase mb-4"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#9A938A',
                  letterSpacing: '0.05em',
                }}
              >
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
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
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Row */}
        <div
          className="mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid #E8E2DA' }}
        >
          {/* Left - Logo and Tagline */}
          <div className="flex items-center gap-3">
            <span
              className="text-[18px] font-bold"
              style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
            >
              Paceful
            </span>
            <span className="text-[14px]" style={{ color: '#9A938A' }}>
              Heal at your pace.
            </span>
          </div>

          {/* Right - Copyright */}
          <p className="text-[12px]" style={{ color: '#9A938A' }}>
            {currentYear} Paceful. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
