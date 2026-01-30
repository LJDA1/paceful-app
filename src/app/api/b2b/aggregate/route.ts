import { NextRequest, NextResponse } from 'next/server';
import { authenticateB2BRequest, logAPIUsage } from '@/lib/api-auth';
import { generateAggregateStats } from '@/lib/data-anonymizer';

/**
 * GET /api/b2b/aggregate
 *
 * Returns anonymized aggregate statistics for B2B partners.
 * Requires API key authentication.
 *
 * Query params:
 * - start_date: YYYY-MM-DD (default: 30 days ago)
 * - end_date: YYYY-MM-DD (default: today)
 *
 * Headers:
 * - Authorization: Bearer <api_key>
 * - OR X-API-Key: <api_key>
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Authenticate request
  const auth = await authenticateB2BRequest(request.headers);

  if (!auth.authenticated || !auth.client) {
    // Log failed attempt
    await logAPIUsage({
      clientId: 'unknown',
      endpoint: '/api/b2b/aggregate',
      method: 'GET',
      statusCode: auth.statusCode || 401,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: { error: auth.error },
    });

    return NextResponse.json(
      {
        error: auth.error,
        code: auth.statusCode === 429 ? 'RATE_LIMITED' : 'UNAUTHORIZED',
      },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    // Parse date parameters
    const endDateParam = searchParams.get('end_date');
    const startDateParam = searchParams.get('start_date');

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Validate dates
    if (isNaN(endDate.getTime()) || isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD', code: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'start_date must be before end_date', code: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    // Generate aggregate statistics
    const stats = await generateAggregateStats(startDate, endDate);

    // Format response based on client tier
    const response = formatResponseForTier(stats, auth.client.tier);

    // Log successful request
    await logAPIUsage({
      clientId: auth.client.id,
      endpoint: '/api/b2b/aggregate',
      method: 'GET',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        tier: auth.client.tier,
      },
    });

    return NextResponse.json({
      success: true,
      data: response,
      meta: {
        client: auth.client.name,
        tier: auth.client.tier,
        generatedAt: stats.generatedAt,
      },
    });
  } catch (error) {
    console.error('B2B aggregate error:', error);

    // Log error
    await logAPIUsage({
      clientId: auth.client.id,
      endpoint: '/api/b2b/aggregate',
      method: 'GET',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Format response based on client tier
 * Basic tier gets summary, premium/enterprise get full data
 */
function formatResponseForTier(
  stats: Awaited<ReturnType<typeof generateAggregateStats>>,
  tier: 'basic' | 'premium' | 'enterprise'
) {
  // Basic tier: summary only
  if (tier === 'basic') {
    return {
      period: `${stats.period.start} to ${stats.period.end}`,
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      avgErsScore: stats.avgErsScore,
      stageDistribution: {
        healing: `${stats.stageDistribution.healing}%`,
        rebuilding: `${stats.stageDistribution.rebuilding}%`,
        ready: `${stats.stageDistribution.ready}%`,
      },
      sampleSize: stats.sampleSize,
    };
  }

  // Premium tier: includes demographics
  if (tier === 'premium') {
    return {
      period: `${stats.period.start} to ${stats.period.end}`,
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      avgErsScore: stats.avgErsScore,
      medianErsScore: stats.medianErsScore,
      stageDistribution: {
        healing: `${stats.stageDistribution.healing}%`,
        rebuilding: `${stats.stageDistribution.rebuilding}%`,
        ready: `${stats.stageDistribution.ready}%`,
      },
      demographics: {
        byAge: stats.demographics.byAge.reduce((acc, item) => {
          acc[`age_${item.ageRange.replace('-', '_')}`] = {
            count: item.count,
            avgErsScore: item.avgErsScore,
            stageDistribution: item.stageDistribution,
          };
          return acc;
        }, {} as Record<string, unknown>),
        byGender: stats.demographics.byGender.reduce((acc, item) => {
          acc[item.gender] = {
            count: item.count,
            avgErsScore: item.avgErsScore,
          };
          return acc;
        }, {} as Record<string, unknown>),
      },
      sampleSize: stats.sampleSize,
    };
  }

  // Enterprise tier: full data including trends and quality metrics
  return {
    period: `${stats.period.start} to ${stats.period.end}`,
    totalUsers: stats.totalUsers,
    activeUsers: stats.activeUsers,
    avgErsScore: stats.avgErsScore,
    medianErsScore: stats.medianErsScore,
    stageDistribution: {
      healing: `${stats.stageDistribution.healing}%`,
      rebuilding: `${stats.stageDistribution.rebuilding}%`,
      ready: `${stats.stageDistribution.ready}%`,
    },
    demographics: {
      byAge: stats.demographics.byAge.reduce((acc, item) => {
        acc[`age_${item.ageRange.replace('-', '_')}`] = {
          count: item.count,
          avgErsScore: item.avgErsScore,
          stageDistribution: item.stageDistribution,
        };
        return acc;
      }, {} as Record<string, unknown>),
      byGender: stats.demographics.byGender.reduce((acc, item) => {
        acc[item.gender] = {
          count: item.count,
          avgErsScore: item.avgErsScore,
        };
        return acc;
      }, {} as Record<string, unknown>),
    },
    moodTrends: stats.moodTrends,
    dataQuality: {
      usersWithMinMoodEntries: stats.dataQuality.usersWithMinMoodEntries,
      avgMoodEntriesPerUser: stats.dataQuality.avgMoodEntriesPerUser,
      usersWithErsScore: stats.dataQuality.usersWithErsScore,
      percentWithQualityData: stats.totalUsers > 0
        ? `${Math.round((stats.dataQuality.usersWithMinMoodEntries / stats.totalUsers) * 100)}%`
        : '0%',
    },
    sampleSize: stats.sampleSize,
  };
}
