/**
 * OpenAPI Documentation Endpoint
 *
 * Serves the OpenAPI/Swagger specification for the B2B Predictions API.
 * Access at: GET /api/b2b/predictions/docs
 */

import { NextResponse } from 'next/server';
import spec from '../openapi.json';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
