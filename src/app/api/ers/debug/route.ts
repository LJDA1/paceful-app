import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 30);

  // Test journal query
  const { data: journals, error: journalError } = await supabase
    .from('journal_entries')
    .select('sentiment_score, contains_insight, contains_gratitude, contains_future_thinking, word_count, language_complexity_score')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', now.toISOString())
    .is('deleted_at', null);

  // Test mood query
  const { data: moods, error: moodError } = await supabase
    .from('mood_entries')
    .select('mood_value, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString())
    .lte('logged_at', now.toISOString())
    .order('logged_at', { ascending: true });

  // Test profile query
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('profile_visibility, bio, show_ers_score, profile_completion_percentage')
    .eq('user_id', userId)
    .single();

  // Test exercise query
  const { data: exercises, error: exerciseError } = await supabase
    .from('exercise_completions')
    .select('helpfulness_rating, mood_before, mood_after, duration_seconds')
    .eq('user_id', userId)
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', now.toISOString());

  // Test messages query
  const { data: messages, error: messageError } = await supabase
    .from('messages')
    .select('id, sent_at, content')
    .eq('sender_id', userId)
    .gte('sent_at', startDate.toISOString())
    .lte('sent_at', now.toISOString())
    .is('deleted_at', null);

  return NextResponse.json({
    dates: {
      now: now.toISOString(),
      startDate: startDate.toISOString(),
    },
    journals: { count: journals?.length, error: journalError?.message, data: journals },
    moods: { count: moods?.length, error: moodError?.message, data: moods },
    profile: { error: profileError?.message, data: profile },
    exercises: { count: exercises?.length, error: exerciseError?.message, data: exercises },
    messages: { count: messages?.length, error: messageError?.message, data: messages },
  });
}
