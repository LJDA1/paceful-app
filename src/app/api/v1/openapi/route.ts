/**
 * GET /api/v1/openapi.json
 *
 * Serves the OpenAPI 3.0 specification as JSON.
 * The spec is loaded from /public/openapi.yaml and converted to JSON.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

// Cache the parsed spec
let cachedSpec: object | null = null;

function loadSpec(): object {
  if (cachedSpec && process.env.NODE_ENV === 'production') {
    return cachedSpec;
  }

  try {
    const specPath = join(process.cwd(), 'public', 'openapi.yaml');
    const specContent = readFileSync(specPath, 'utf8');
    cachedSpec = yaml.load(specContent) as object;
    return cachedSpec;
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const spec = loadSpec();

    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error serving OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to load OpenAPI specification' },
      { status: 500 }
    );
  }
}
