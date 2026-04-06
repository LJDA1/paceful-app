/**
 * GET /api/v1/public/stats
 *
 * Public endpoint for trust signals displayed on marketing pages.
 * Returns aggregate counts - no authentication required.
 * Cached for 1 hour to reduce database load.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cache for 1 hour
let cachedStats: { assessmentCount: number; partnerCount: number } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  // Return cached stats if fresh
  if (cachedStats && Date.now() - cacheTime < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      data: cachedStats,
      cached: true,
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get total assessment count
    const { count: assessmentCount, error: assessmentError } = await supabase
      .from('text_assessments')
      .select('*', { count: 'exact', head: true });

    if (assessmentError) {
      console.error('[Public Stats] Error fetching assessment count:', assessmentError);
    }

    // Get active partner count
    const { count: partnerCount, error: partnerError } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (partnerError) {
      console.error('[Public Stats] Error fetching partner count:', partnerError);
    }

    const stats = {
      assessmentCount: assessmentCount || 0,
      partnerCount: partnerCount || 0,
    };

    // Update cache
    cachedStats = stats;
    cacheTime = Date.now();

    return NextResponse.json({
      success: true,
      data: stats,
      cached: false,
    });
  } catch (error) {
    console.error('[Public Stats] Error:', error);

    // Return cached stats if available, even if stale
    if (cachedStats) {
      return NextResponse.json({
        success: true,
        data: cachedStats,
        cached: true,
        stale: true,
      });
    }

    // Return zeros if no cached data
    return NextResponse.json({
      success: true,
      data: {
        assessmentCount: 0,
        partnerCount: 0,
      },
    });
  }
}
