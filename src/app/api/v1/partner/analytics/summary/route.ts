/**
 * GET /api/v1/partner/analytics/summary
 *
 * Get aggregate analytics for a partner's users.
 * Supports period filtering: 7d, 30d, 90d, all
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkPartnerRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
  getSupabaseAdmin,
} from '@/lib/partner-auth';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const { searchParams } = new URL(request.url);
    return sandboxResponse('analytics_summary', { period: searchParams.get('period') });
  }

  // Validate API key
  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(
      validation.error || 'Invalid API key',
      'UNAUTHORIZED',
      401
    );
  }

  // Check rate limit
  const rateLimit = await checkPartnerRateLimit(validation.partnerId!, validation.rateLimit);
  if (!rateLimit.allowed) {
    return partnerApiError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      undefined,
      rateLimit
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;

    // Parse period parameter
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || '30d';
    const validPeriods = ['7d', '30d', '90d', 'all'];

    if (!validPeriods.includes(periodParam)) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/analytics/summary',
        'GET',
        400,
        Date.now() - startTime
      );
      return partnerApiError(
        'Invalid period. Use: 7d, 30d, 90d, or all',
        'BAD_REQUEST',
        400,
        undefined,
        rateLimit
      );
    }

    // Calculate date range
    let periodStartDate: string | null = null;
    if (periodParam !== 'all') {
      const days = parseInt(periodParam.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      periodStartDate = startDate.toISOString();
    }

    // Get total users for this partner
    const { count: totalUsers, error: usersError } = await supabase
      .from('partner_users')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId);

    if (usersError) {
      console.error('Error counting users:', usersError);
    }

    // Get partner user IDs for filtering
    const { data: partnerUsers, error: userIdsError } = await supabase
      .from('partner_users')
      .select('id')
      .eq('partner_id', partnerId);

    if (userIdsError || !partnerUsers || partnerUsers.length === 0) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/analytics/summary',
        'GET',
        200,
        Date.now() - startTime
      );

      return partnerApiSuccess({
        totalUsers: totalUsers || 0,
        averageErs: null,
        stageDistribution: {
          healing: 0,
          rebuilding: 0,
          ready: 0,
        },
        engagementMetrics: {
          avgMoodLogsPerWeek: 0,
          avgJournalEntriesPerWeek: 0,
        },
        period: periodParam,
      }, 200, undefined, rateLimit);
    }

    const partnerUserIds = partnerUsers.map(u => u.id);

    // Get latest ERS scores for each user in period
    let ersQuery = supabase
      .from('partner_ers_scores')
      .select('partner_user_id, ers_score, ers_stage, calculated_at')
      .in('partner_user_id', partnerUserIds)
      .order('calculated_at', { ascending: false });

    if (periodStartDate) {
      ersQuery = ersQuery.gte('calculated_at', periodStartDate);
    }

    const { data: ersScores, error: ersError } = await ersQuery;

    if (ersError) {
      console.error('Error fetching ERS scores:', ersError);
    }

    // Get latest score per user
    const latestScoresByUser = new Map<string, { score: number; stage: string }>();
    for (const score of ersScores || []) {
      if (!latestScoresByUser.has(score.partner_user_id)) {
        latestScoresByUser.set(score.partner_user_id, {
          score: score.ers_score,
          stage: score.ers_stage,
        });
      }
    }

    // Calculate average ERS and stage distribution
    let totalErs = 0;
    let ersCount = 0;
    const stageCounts = { healing: 0, rebuilding: 0, ready: 0 };

    for (const [, data] of latestScoresByUser) {
      totalErs += data.score;
      ersCount++;
      if (data.stage === 'healing') stageCounts.healing++;
      else if (data.stage === 'rebuilding') stageCounts.rebuilding++;
      else if (data.stage === 'ready') stageCounts.ready++;
    }

    const averageErs = ersCount > 0 ? Math.round((totalErs / ersCount) * 10) / 10 : null;

    // Calculate stage distribution as percentages
    const usersWithScores = latestScoresByUser.size;
    const stageDistribution = {
      healing: usersWithScores > 0 ? Math.round((stageCounts.healing / usersWithScores) * 100) / 100 : 0,
      rebuilding: usersWithScores > 0 ? Math.round((stageCounts.rebuilding / usersWithScores) * 100) / 100 : 0,
      ready: usersWithScores > 0 ? Math.round((stageCounts.ready / usersWithScores) * 100) / 100 : 0,
    };

    // Get mood logs count in period
    let moodQuery = supabase
      .from('partner_mood_logs')
      .select('*', { count: 'exact', head: true })
      .in('partner_user_id', partnerUserIds);

    if (periodStartDate) {
      moodQuery = moodQuery.gte('logged_at', periodStartDate);
    }

    const { count: moodCount, error: moodError } = await moodQuery;
    if (moodError) {
      console.error('Error counting mood logs:', moodError);
    }

    // Get journal entries count in period
    let journalQuery = supabase
      .from('partner_journal_entries')
      .select('*', { count: 'exact', head: true })
      .in('partner_user_id', partnerUserIds);

    if (periodStartDate) {
      journalQuery = journalQuery.gte('created_at', periodStartDate);
    }

    const { count: journalCount, error: journalError } = await journalQuery;
    if (journalError) {
      console.error('Error counting journal entries:', journalError);
    }

    // Calculate per-user per-week averages
    const periodDays = periodParam === 'all' ? 90 : parseInt(periodParam.replace('d', ''));
    const periodWeeks = periodDays / 7;
    const activeUsers = totalUsers || 1;

    const avgMoodLogsPerWeek = Math.round(((moodCount || 0) / activeUsers / periodWeeks) * 10) / 10;
    const avgJournalEntriesPerWeek = Math.round(((journalCount || 0) / activeUsers / periodWeeks) * 10) / 10;

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/analytics/summary',
      'GET',
      200,
      Date.now() - startTime
    );

    return partnerApiSuccess({
      totalUsers: totalUsers || 0,
      averageErs,
      stageDistribution,
      engagementMetrics: {
        avgMoodLogsPerWeek,
        avgJournalEntriesPerWeek,
      },
      period: periodParam,
    }, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Analytics summary error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/analytics/summary',
      'GET',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
