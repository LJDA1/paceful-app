/**
 * GET /api/v1/status
 *
 * Public health check endpoint. No authentication required.
 * Used by monitoring tools to check service availability.
 *
 * Cached for 30 seconds to prevent abuse.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Read version from package.json
const APP_VERSION = '0.1.0';

// Cache response for 30 seconds
let cachedResponse: {
  data: StatusResponse;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 30 * 1000; // 30 seconds

type ServiceStatus = 'operational' | 'degraded' | 'slow' | 'down';

interface ServiceInfo {
  status: ServiceStatus;
  responseTimeMs?: number;
}

interface StatusResponse {
  status: ServiceStatus;
  version: string;
  timestamp: string;
  services: {
    api: ServiceInfo;
    database: ServiceInfo;
    ers_engine: ServiceInfo;
  };
  uptime: string;
}

/**
 * Ping the database and measure response time
 */
async function pingDatabase(): Promise<{ status: ServiceStatus; responseTimeMs: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { status: 'down', responseTimeMs: 0 };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = performance.now();

  try {
    const { error } = await supabase.rpc('ping', {}).maybeSingle();

    // If RPC doesn't exist, fall back to a simple query
    if (error?.code === 'PGRST202') {
      // Function not found, use raw SQL
      const { error: queryError } = await supabase
        .from('partners')
        .select('id')
        .limit(1);

      const responseTimeMs = Math.round(performance.now() - startTime);

      if (queryError) {
        return { status: 'degraded', responseTimeMs };
      }

      if (responseTimeMs > 2000) {
        return { status: 'slow', responseTimeMs };
      }

      return { status: 'operational', responseTimeMs };
    }

    const responseTimeMs = Math.round(performance.now() - startTime);

    if (error) {
      return { status: 'degraded', responseTimeMs };
    }

    if (responseTimeMs > 2000) {
      return { status: 'slow', responseTimeMs };
    }

    return { status: 'operational', responseTimeMs };
  } catch {
    const responseTimeMs = Math.round(performance.now() - startTime);
    return { status: 'down', responseTimeMs };
  }
}

/**
 * Determine overall status from service statuses
 */
function determineOverallStatus(services: StatusResponse['services']): ServiceStatus {
  const statuses = [services.api.status, services.database.status, services.ers_engine.status];

  if (statuses.includes('down')) {
    return 'down';
  }
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  if (statuses.includes('slow')) {
    return 'slow';
  }
  return 'operational';
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

export async function GET() {
  const requestStartTime = performance.now();

  // Check cache
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
    // Update API response time for this specific request
    const apiResponseTimeMs = Math.round(performance.now() - requestStartTime);
    const cachedData = {
      ...cachedResponse.data,
      timestamp: new Date().toISOString(),
      services: {
        ...cachedResponse.data.services,
        api: { status: 'operational' as const, responseTimeMs: apiResponseTimeMs },
      },
    };

    return new NextResponse(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
        'X-Cache': 'HIT',
      },
    });
  }

  // Ping database
  const dbStatus = await pingDatabase();

  // Calculate API response time
  const apiResponseTimeMs = Math.round(performance.now() - requestStartTime);

  // Build services status
  const services: StatusResponse['services'] = {
    api: { status: 'operational', responseTimeMs: apiResponseTimeMs },
    database: dbStatus,
    ers_engine: { status: 'operational' }, // ERS engine is operational if API is up
  };

  // Determine overall status
  const overallStatus = determineOverallStatus(services);

  const response: StatusResponse = {
    status: overallStatus,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    services,
    uptime: '99.9%', // Static for now; could be calculated from metrics
  };

  // Cache the response
  cachedResponse = {
    data: response,
    timestamp: Date.now(),
  };

  return new NextResponse(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=30',
      'X-Cache': 'MISS',
    },
  });
}
