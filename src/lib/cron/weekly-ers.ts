/**
 * Weekly ERS Calculation Job
 *
 * Calculates ERS scores for all active users.
 * Designed to run every Sunday at midnight.
 *
 * For now, triggered manually via API. Can later be added to:
 * - Supabase cron (pg_cron)
 * - Vercel cron
 * - External scheduler
 */

import { supabase } from '../supabase';
import { calculateAndStoreERSScore } from '../ers-calculator';
import { logger } from '../api-errors';

export interface WeeklyERSJobResult {
  jobId: string;
  startedAt: string;
  completedAt: string;
  totalUsers: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
  duration: number;
}

/**
 * Get all users eligible for ERS calculation
 * - Users with ERS tracking consent
 * - Users with at least 1 mood entry in last 30 days (active)
 */
async function getEligibleUsers(): Promise<string[]> {
  // First try to get users with explicit consent
  const { data: consentedUsers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('ers_tracking_consent', true);

  if (consentedUsers && consentedUsers.length > 0) {
    return consentedUsers.map(u => u.user_id);
  }

  // Fallback: get users with recent mood entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: activeUsers, error } = await supabase
    .from('mood_entries')
    .select('user_id')
    .gte('logged_at', thirtyDaysAgo.toISOString());

  if (error || !activeUsers) {
    return [];
  }

  // Get unique user IDs
  const uniqueUserIds = [...new Set(activeUsers.map(u => u.user_id))];
  return uniqueUserIds;
}

/**
 * Check if user has enough data for ERS calculation
 * Requires at least 3 mood entries in last 7 days
 */
async function hasEnoughData(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count, error } = await supabase
    .from('mood_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('logged_at', sevenDaysAgo.toISOString());

  if (error) return false;
  return (count || 0) >= 3;
}

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  const now = new Date();
  const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `ers_weekly_${datePart}_${randomPart}`;
}

/**
 * Run weekly ERS calculation for all eligible users
 */
export async function runWeeklyERSCalculation(): Promise<WeeklyERSJobResult> {
  const jobId = generateJobId();
  const startedAt = new Date();

  logger.info(`[${jobId}] Starting weekly ERS calculation job`);

  const result: WeeklyERSJobResult = {
    jobId,
    startedAt: startedAt.toISOString(),
    completedAt: '',
    totalUsers: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Get eligible users
    const userIds = await getEligibleUsers();
    result.totalUsers = userIds.length;

    logger.info(`[${jobId}] Found ${userIds.length} eligible users`);

    // Process each user
    for (const userId of userIds) {
      try {
        // Check if user has enough data
        const hasData = await hasEnoughData(userId);
        if (!hasData) {
          result.skippedCount++;
          logger.info(`[${jobId}] Skipped user ${userId}: insufficient data`);
          continue;
        }

        // Calculate and store ERS
        await calculateAndStoreERSScore(userId);
        result.successCount++;
        logger.info(`[${jobId}] Calculated ERS for user ${userId}`);
      } catch (err) {
        result.failedCount++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push({
          userId,
          error: errorMsg,
        });
        logger.error(`[${jobId}] Failed for user ${userId}: ${errorMsg}`);
      }
    }
  } catch (err) {
    logger.error(`[${jobId}] Job failed:`, err);
    result.errors.push({
      userId: 'SYSTEM',
      error: err instanceof Error ? err.message : 'Job failed to start',
    });
  }

  // Finalize
  const completedAt = new Date();
  result.completedAt = completedAt.toISOString();
  result.duration = completedAt.getTime() - startedAt.getTime();

  logger.info(`[${jobId}] Job completed in ${result.duration}ms`);
  logger.info(`[${jobId}] Results: ${result.successCount} success, ${result.failedCount} failed, ${result.skippedCount} skipped`);

  return result;
}

/**
 * Calculate ERS for a single user (for manual trigger)
 */
export async function calculateERSForUser(userId: string): Promise<{
  success: boolean;
  error?: string;
  ersScore?: number;
  ersStage?: string;
}> {
  try {
    const hasData = await hasEnoughData(userId);
    if (!hasData) {
      return {
        success: false,
        error: 'Not enough mood data. Log at least 3 moods in the last 7 days.',
      };
    }

    const result = await calculateAndStoreERSScore(userId);
    return {
      success: true,
      ersScore: result.ersScore,
      ersStage: result.ersStage,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Calculation failed',
    };
  }
}
