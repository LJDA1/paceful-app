import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  // Include vertical config files in serverless function bundles.
  // The vertical signal engine reads these via fs.readdirSync at runtime,
  // so Vercel's output file tracing can't detect them automatically.
  outputFileTracingIncludes: {
    '/api/v1/analyze/[vertical]': ['./config/verticals/**/*'],
    '/api/v1/analyze/[vertical]/batch': ['./config/verticals/**/*'],
    '/api/v1/analyze/[vertical]/conversation': ['./config/verticals/**/*'],
    '/api/v1/signals/[vertical]': ['./config/verticals/**/*'],
    '/api/v1/signals/list': ['./config/verticals/**/*'],
  },

  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
