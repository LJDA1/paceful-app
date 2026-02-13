import { createClient } from '@/lib/supabase-browser';

/**
 * Track user activity events for analytics.
 * Fire-and-forget - never blocks UI or shows errors.
 */
export async function trackEvent(eventType: string, eventData?: Record<string, unknown>) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      event_type: eventType,
      event_data: eventData || {},
    });
  } catch {
    // Silent fail - tracking should never break the app
  }
}
