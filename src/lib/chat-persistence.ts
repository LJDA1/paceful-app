import { SupabaseClient } from '@supabase/supabase-js';

export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  summary: string | null;
  key_topics: string[] | null;
  mood_at_start: number | null;
  mood_at_end: number | null;
  created_at: string;
}

/**
 * Create a new chat session for the user
 */
export async function createChatSession(
  userId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    // Fetch latest mood to set mood_at_start
    const { data: latestMood } = await supabase
      .from('mood_entries')
      .select('mood_value')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        mood_at_start: latestMood?.mood_value || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create chat session:', error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('Error creating chat session:', err);
    return null;
  }
}

/**
 * Update session message count and timestamp
 */
export async function updateChatSession(
  sessionId: string,
  messageCount: number,
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase
      .from('chat_sessions')
      .update({
        message_count: messageCount,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  } catch (err) {
    console.error('Error updating chat session:', err);
  }
}

/**
 * Close session and update with final mood
 */
export async function closeSession(
  sessionId: string,
  userId: string,
  messageCount: number,
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Fetch latest mood to set mood_at_end
    const { data: latestMood } = await supabase
      .from('mood_entries')
      .select('mood_value')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single();

    await supabase
      .from('chat_sessions')
      .update({
        message_count: messageCount,
        ended_at: new Date().toISOString(),
        mood_at_end: latestMood?.mood_value || null,
      })
      .eq('id', sessionId);
  } catch (err) {
    console.error('Error closing chat session:', err);
  }
}

/**
 * Get recent chat sessions for a user
 */
export async function getRecentSessions(
  userId: string,
  supabase: SupabaseClient,
  limit = 5
): Promise<ChatSession[]> {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .not('summary', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent sessions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching recent sessions:', err);
    return [];
  }
}

/**
 * Format sessions as natural language for the system prompt
 */
export function formatSessionsForPrompt(sessions: ChatSession[]): string {
  if (!sessions || sessions.length === 0) {
    return '';
  }

  const lines = sessions.map((session) => {
    const daysAgo = getDaysAgo(session.started_at);
    const timeLabel = daysAgo === 0 ? 'Earlier today' :
                      daysAgo === 1 ? 'Yesterday' :
                      `${daysAgo} days ago`;

    return `- ${timeLabel}: ${session.summary}`;
  });

  return `Previous conversations with this person:\n${lines.join('\n')}`;
}

/**
 * Get the most recent session for greeting context
 */
export function getLastSessionContext(sessions: ChatSession[]): {
  summary: string;
  topics: string[];
  daysAgo: number;
} | null {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  const lastSession = sessions[0];
  if (!lastSession.summary) {
    return null;
  }

  return {
    summary: lastSession.summary,
    topics: lastSession.key_topics || [],
    daysAgo: getDaysAgo(lastSession.started_at),
  };
}

function getDaysAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
