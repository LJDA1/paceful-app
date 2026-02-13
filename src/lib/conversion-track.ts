/**
 * Conversion Tracking Utility
 *
 * Tracks pre-auth conversion events using localStorage.
 * Events are flushed to the database after user authenticates.
 */

export function trackConversion(event: string, data?: Record<string, unknown>) {
  try {
    const events = JSON.parse(localStorage.getItem('paceful_conversions') || '[]');
    events.push({
      event,
      data: data || {},
      timestamp: new Date().toISOString(),
      referrer: document.referrer || null,
      url: window.location.pathname,
    });
    localStorage.setItem('paceful_conversions', JSON.stringify(events));
  } catch {
    // Silent failure - never break user experience
  }
}

/**
 * Call this after signup to flush conversion events to the database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function flushConversionEvents(userId: string, supabase: any) {
  try {
    const events = JSON.parse(localStorage.getItem('paceful_conversions') || '[]');
    if (events.length === 0) return;

    const rows = events.map((e: { event: string; data: Record<string, unknown>; referrer: string | null; url: string; timestamp: string }) => ({
      user_id: userId,
      event_type: 'conversion_' + e.event,
      event_data: {
        ...e.data,
        referrer: e.referrer,
        url: e.url,
        original_timestamp: e.timestamp
      },
    }));

    await supabase.from('activity_logs').insert(rows);
    localStorage.removeItem('paceful_conversions');
  } catch {
    // Silent failure - never break user experience
  }
}
