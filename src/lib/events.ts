/**
 * Paceful Event Tracking
 *
 * Tracks key user milestones and actions for analytics and investor reporting.
 */

import { supabase as defaultSupabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Backwards compatibility - functions can be updated to accept supabaseClient parameter
const supabase = defaultSupabase;

// Event types
export type EventType =
  | 'user_signup'
  | 'onboarding_complete'
  | 'first_mood_logged'
  | 'mood_entry_created'
  | 'journal_entry_created'
  | 'ers_calculated'
  | 'streak_7_days'
  | 'streak_14_days'
  | 'streak_30_days'
  | 'stage_rebuilding'
  | 'stage_ready'
  | 'exercise_completed'
  | 'match_created'
  | 'message_sent';

interface EventData {
  event_type: EventType;
  user_id: string;
  properties?: Record<string, unknown>;
  created_at?: string;
}

/**
 * Log an event to the activity_log table
 */
export async function logEvent(
  eventType: EventType,
  userId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    // First, try to insert into activity_log table
    const { error } = await supabase.from('activity_log').insert({
      user_id: userId,
      event_type: eventType,
      properties: properties || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      // If table doesn't exist, log to console instead
      console.log(`[Event] ${eventType}`, { userId, properties });
    }
  } catch (err) {
    // Fallback to console logging
    console.log(`[Event] ${eventType}`, { userId, properties });
  }
}

/**
 * Event tracking functions
 */
export const PacefulEvents = {
  /**
   * User signs up - log after successful account creation
   */
  userSignup: async (userId: string, referrer?: string) => {
    await logEvent('user_signup', userId, { referrer });
  },

  /**
   * User completes onboarding questionnaire
   */
  onboardingComplete: async (userId: string) => {
    await logEvent('onboarding_complete', userId);
  },

  /**
   * User logs their first mood entry
   */
  firstMoodLogged: async (userId: string) => {
    await logEvent('first_mood_logged', userId);
  },

  /**
   * User logs a mood entry (any)
   */
  moodEntryCreated: async (userId: string, moodValue: number, emotions?: string[]) => {
    await logEvent('mood_entry_created', userId, { mood_value: moodValue, emotions });
  },

  /**
   * User creates a journal entry
   */
  journalEntryCreated: async (userId: string, wordCount?: number) => {
    await logEvent('journal_entry_created', userId, { word_count: wordCount });
  },

  /**
   * ERS score is calculated
   */
  ersCalculated: async (userId: string, score: number, stage: string) => {
    await logEvent('ers_calculated', userId, { score, stage });
  },

  /**
   * User achieves a streak milestone
   */
  streakAchieved: async (userId: string, days: number) => {
    if (days === 7) {
      await logEvent('streak_7_days', userId, { days });
    } else if (days === 14) {
      await logEvent('streak_14_days', userId, { days });
    } else if (days === 30) {
      await logEvent('streak_30_days', userId, { days });
    }
  },

  /**
   * User reaches Rebuilding stage (ERS 50+)
   */
  stageRebuilding: async (userId: string, score: number) => {
    await logEvent('stage_rebuilding', userId, { score });
  },

  /**
   * User reaches Ready stage (ERS 75+)
   */
  stageReady: async (userId: string, score: number) => {
    await logEvent('stage_ready', userId, { score });
  },

  /**
   * User completes an exercise
   */
  exerciseCompleted: async (userId: string, exerciseId: string, exerciseName: string) => {
    await logEvent('exercise_completed', userId, { exercise_id: exerciseId, exercise_name: exerciseName });
  },

  /**
   * Match is created between users
   */
  matchCreated: async (userId: string, matchedUserId: string) => {
    await logEvent('match_created', userId, { matched_user_id: matchedUserId });
  },

  /**
   * User sends a message
   */
  messageSent: async (userId: string, conversationId: string) => {
    await logEvent('message_sent', userId, { conversation_id: conversationId });
  },
};

/**
 * Check if user has achieved a milestone (to prevent duplicate events)
 */
export async function hasAchievedMilestone(
  userId: string,
  milestone: EventType
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', milestone)
      .limit(1);

    if (error) return false;
    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Check and log first mood if applicable
 */
export async function checkAndLogFirstMood(userId: string): Promise<void> {
  const hasFirst = await hasAchievedMilestone(userId, 'first_mood_logged');
  if (!hasFirst) {
    await PacefulEvents.firstMoodLogged(userId);
  }
}

/**
 * Check and log stage progression
 */
export async function checkAndLogStageProgression(
  userId: string,
  score: number,
  previousScore?: number
): Promise<void> {
  // Check for Rebuilding stage (50+)
  if (score >= 50 && (previousScore === undefined || previousScore < 50)) {
    const hasRebuilding = await hasAchievedMilestone(userId, 'stage_rebuilding');
    if (!hasRebuilding) {
      await PacefulEvents.stageRebuilding(userId, score);
    }
  }

  // Check for Ready stage (75+)
  if (score >= 75 && (previousScore === undefined || previousScore < 75)) {
    const hasReady = await hasAchievedMilestone(userId, 'stage_ready');
    if (!hasReady) {
      await PacefulEvents.stageReady(userId, score);
    }
  }
}

export default PacefulEvents;
