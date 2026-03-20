/**
 * GET /api/v1/partner/sandbox/status
 *
 * Returns information about the sandbox mode.
 * No authentication required.
 */

import { NextResponse } from 'next/server';
import { getSandboxStatus, SANDBOX_API_KEY } from '@/lib/sandbox-middleware';

export async function GET() {
  return NextResponse.json(getSandboxStatus(), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
