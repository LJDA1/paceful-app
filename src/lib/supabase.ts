import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Using untyped client for flexibility - types are applied at query level
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to get current user's ID (for demo purposes)
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ERS Score queries
export async function getLatestERSScore(userId: string) {
  const { data, error } = await supabase
    .from('ers_scores')
    .select('*')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function getERSHistory(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('ers_scores')
    .select('ers_score, ers_stage, week_of, calculated_at')
    .eq('user_id', userId)
    .order('week_of', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Profile queries
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      users (
        email,
        is_active,
        account_type
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Journal queries
export async function getJournalEntries(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function createJournalEntry(
  userId: string,
  entry: {
    entry_title?: string;
    entry_content: string;
  }
) {
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      ...entry,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Mood queries
export async function getMoodEntries(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('mood_entries')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function createMoodEntry(
  userId: string,
  entry: {
    mood_value: number;
    mood_label?: string;
    emotions?: string[];
    time_of_day?: string;
  }
) {
  const { data, error } = await supabase
    .from('mood_entries')
    .insert({
      user_id: userId,
      ...entry,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Exercise queries
export async function getExercises(stage?: string) {
  let query = supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true);

  if (stage) {
    query = query.eq('recommended_stage', stage);
  }

  const { data, error } = await query.order('exercise_name');

  if (error) throw error;
  return data;
}

// Streak queries
export async function getUserStreak(userId: string) {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
