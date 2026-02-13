import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // Fetch mood entries from last 7 days
    const { data: moodEntries } = await supabase
      .from('mood_entries')
      .select('mood_score, note, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', sevenDaysAgoStr)
      .order('logged_at', { ascending: false })
      .limit(20);

    // Fetch journal entries from last 7 days
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('entry_content, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgoStr)
      .order('created_at', { ascending: false })
      .limit(10);

    // Check if we have any data
    if ((!moodEntries || moodEntries.length === 0) && (!journalEntries || journalEntries.length === 0)) {
      return NextResponse.json({
        insight: "Keep logging your moods and journaling to help me understand your patterns better. Even a few entries can reveal meaningful insights about your emotional journey."
      });
    }

    // Format data for Claude
    const moodData = (moodEntries || []).map(m => ({
      date: new Date(m.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      score: m.mood_score,
      note: m.note ? m.note.substring(0, 100) : null
    }));

    const journalData = (journalEntries || []).map(j => ({
      date: new Date(j.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      preview: j.entry_content.substring(0, 200)
    }));

    const userMessage = `Here is the user's data from the last 7 days:

MOOD ENTRIES (score 1-10, higher is better):
${moodData.length > 0 ? moodData.map(m => `- ${m.date}: Score ${m.score}${m.note ? ` - "${m.note}"` : ''}`).join('\n') : 'No mood entries'}

JOURNAL ENTRIES:
${journalData.length > 0 ? journalData.map(j => `- ${j.date}: "${j.preview}..."`).join('\n') : 'No journal entries'}

Provide ONE specific, actionable insight about their emotional patterns.`;

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: "You are a compassionate emotional wellness analyst for Paceful, a healing app. Based on the user's recent mood and journal data, provide ONE specific, actionable insight about their emotional patterns. Be warm but not patronizing. Keep it to 2-3 sentences. Focus on patterns, progress, or gentle suggestions. Never diagnose or provide medical advice.",
      messages: [
        { role: 'user', content: userMessage }
      ],
    });

    // Extract text from response
    const textBlock = message.content.find(block => block.type === 'text');
    const insight = textBlock ? textBlock.text : "Continue your healing journey one day at a time. Your consistency in tracking shows real commitment to growth.";

    return NextResponse.json({ insight });

  } catch (error) {
    console.error('AI Insights Error:', error);

    // Return a fallback insight on error
    return NextResponse.json({
      insight: "Focus on small, consistent steps in your healing journey. Each day of reflection brings you closer to understanding yourself better."
    });
  }
}
