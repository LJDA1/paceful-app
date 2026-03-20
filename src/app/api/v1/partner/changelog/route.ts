/**
 * GET /api/v1/partner/changelog
 *
 * Public endpoint returning the API changelog as structured data.
 * No authentication required.
 */

import { NextResponse } from 'next/server';
import { CURRENT_API_VERSION, MINIMUM_SUPPORTED_VERSION, addVersionHeaders } from '@/lib/api-version';

interface ChangelogEntry {
  type: 'added' | 'changed' | 'removed' | 'fixed' | 'deprecated' | 'security';
  description: string;
}

interface VersionEntry {
  version: string;
  date: string;
  changes: ChangelogEntry[];
}

const CHANGELOG: VersionEntry[] = [
  {
    version: '1.0.0',
    date: '2026-03-18',
    changes: [
      { type: 'added', description: 'Sandbox mode — test all endpoints with pk_sandbox_paceful_demo' },
      { type: 'added', description: 'ERS History API — time series scores with trend analysis' },
      { type: 'added', description: 'Aggregate trend endpoint for portfolio-level insights' },
      { type: 'added', description: 'Webhook delivery logs with retry support' },
      { type: 'added', description: 'Batch import endpoints for users and mood data' },
      { type: 'added', description: 'Interactive API playground on docs page' },
      { type: 'added', description: 'Rate limit headers on all responses' },
      { type: 'added', description: 'Health check and status endpoints' },
      { type: 'added', description: 'ERS Explainability Layer with configurable verbosity and tone' },
      { type: 'added', description: 'Partner configuration API for customizing ERS output' },
      { type: 'added', description: 'Batch ERS scoring for multiple users' },
      { type: 'added', description: 'Journal entry API with AI sentiment analysis' },
      { type: 'added', description: 'Mood logging with emotion tracking' },
      { type: 'added', description: 'User registration with context metadata' },
      { type: 'added', description: 'Analytics summary endpoint' },
      { type: 'added', description: 'API usage tracking and reporting' },
    ],
  },
];

const DEPRECATION_POLICY = `Endpoints are supported for minimum 12 months after deprecation notice. Deprecated endpoints return Sunset and Deprecation headers.`;

export async function GET() {
  const response = NextResponse.json({
    currentVersion: CURRENT_API_VERSION,
    minimumSupportedVersion: MINIMUM_SUPPORTED_VERSION,
    changelog: CHANGELOG,
    deprecationPolicy: DEPRECATION_POLICY,
  });

  // Add version headers
  addVersionHeaders(response);

  // Add CORS headers for public access
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  // Cache for 1 hour
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
