/**
 * GET /api/v1/verticals
 *
 * Discovery endpoint - returns list of all registered verticals.
 * Public endpoint (no auth required) for discoverability.
 */

import { NextResponse } from 'next/server';
import { listVerticals } from '@/lib/verticals';

// CORS headers for public endpoint
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET() {
  const verticals = listVerticals();

  return NextResponse.json(
    {
      success: true,
      data: {
        verticals,
        count: verticals.length,
        endpoint_pattern: '/api/v1/assess/:vertical',
        documentation: 'https://paceful.com/partners/docs#text-analysis',
      },
    },
    { headers: corsHeaders() }
  );
}
