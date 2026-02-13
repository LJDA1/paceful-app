import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const fallbackPrompts = [
  "What's one thing you handled better this week than you would have a month ago?",
  "Describe a moment today where you felt at peace, even briefly.",
  "What would you say to yourself one year from now?",
  "Write about something you're learning about yourself through this experience.",
  "What does healing look like for you today?",
];

function getRandomFallback(): string {
  return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
}

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
      return NextResponse.json({ prompt: getRandomFallback() });
    }

    // Fetch last 3 mood entries
    const { data: moodEntries } = await supabase
      .from('mood_entries')
      .select('mood_score, note, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(3);

    // Fetch last 2 journal entries
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('entry_content, emotion_primary, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(2);

    // If no data, return fallback
    if ((!moodEntries || moodEntries.length === 0) && (!journalEntries || journalEntries.length === 0)) {
      return NextResponse.json({ prompt: getRandomFallback() });
    }

    // Format data for Claude
    const moodData = (moodEntries || []).map(m => ({
      score: m.mood_score,
      note: m.note ? m.note.substring(0, 100) : null,
    }));

    const journalData = (journalEntries || []).map(j => ({
      preview: j.entry_content.substring(0, 150),
      emotion: j.emotion_primary,
    }));

    const userMessage = `Recent mood entries (score 1-10, higher is better):
${moodData.length > 0 ? moodData.map(m => `- Score ${m.score}${m.note ? `: "${m.note}"` : ''}`).join('\n') : 'No recent moods'}

Recent journal themes:
${journalData.length > 0 ? journalData.map(j => `- ${j.emotion ? `[${j.emotion}] ` : ''}"${j.preview}..."`).join('\n') : 'No recent entries'}

Generate ONE personalized journal prompt for this user.`;

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: "You are a thoughtful journal prompt creator for Paceful, a healing app for people recovering from breakups. Based on the user's recent moods and journal themes, generate ONE journal prompt that meets them where they are emotionally. If they're struggling, be gentle and grounding. If they're improving, encourage reflection on growth. Keep the prompt to one sentence, phrased as a question or gentle invitation. Never be patronizing or clinical. Respond with ONLY the prompt, no quotes or extra text.",
      messages: [
        { role: 'user', content: userMessage }
      ],
    });

    // Extract text from response
    const textBlock = message.content.find(block => block.type === 'text');
    const prompt = textBlock?.type === 'text' ? textBlock.text.trim() : getRandomFallback();

    return NextResponse.json({ prompt });

  } catch (error) {
    console.error('AI Prompt Error:', error);
    return NextResponse.json({ prompt: getRandomFallback() });
  }
}
