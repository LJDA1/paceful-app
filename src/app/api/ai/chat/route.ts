import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { getMemories, addMemories, formatMemoriesForPrompt } from '@/lib/ai-memory';
import { extractMemories } from '@/lib/ai-memory-extract';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // Create authenticated Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch user context
    const [profileRes, ersRes, moodRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('ers_scores')
        .select('ers_score, ers_stage')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const firstName = profileRes.data?.first_name || 'there';
    const ersScore = ersRes.data?.ers_score ?? 'unknown';
    const ersStage = ersRes.data?.ers_stage ?? 'unknown';
    const moodScore = moodRes.data?.mood_value ?? 'unknown';

    // Fetch user memories
    const memories = await getMemories(user.id, supabase, 20);
    const memoriesContext = formatMemoriesForPrompt(memories);

    // Build system prompt
    const systemPrompt = `You are Pace, a compassionate companion in the Paceful app. You support people healing from breakups and emotional challenges. You are NOT a therapist and must never diagnose, prescribe, or claim to provide therapy.

Your personality:
- Warm, genuine, present
- You listen first, reflect back, then gently offer perspective
- You validate emotions without reinforcing spiraling
- You're honest but kind — you don't just agree with everything
- You keep responses concise (2-4 sentences usually, occasionally longer if the topic warrants it)
- You remember context from this conversation
- You occasionally reference the user's actual data to make responses feel personal

The user's name is ${firstName}. Their current ERS is ${ersScore} (${ersStage} stage). Their latest mood was ${moodScore}/10.

Important rules:
- If someone expresses suicidal thoughts or self-harm intent, respond with empathy and gently encourage them to reach out to a crisis helpline (988 Suicide & Crisis Lifeline in the US). Do not try to be their therapist.
- Never say "as an AI" or break character
- Never give medical or legal advice
- Don't be overly cheerful when someone is hurting
- Don't overuse their name
- Keep your responses natural and conversational

${memoriesContext}`;

    // Prepare messages for Claude (last 20 messages max)
    const recentHistory = conversationHistory.slice(-20);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...recentHistory,
      { role: 'user', content: message.trim() },
    ];

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages,
    });

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : "I'm here for you. How can I help?";

    // Fire-and-forget: Extract and save new memories from this exchange
    (async () => {
      try {
        const newMemories = await extractMemories(message, responseText, memories);
        if (newMemories.length > 0) {
          await addMemories(user.id, supabase, newMemories);
        }
      } catch (error) {
        console.error('Memory extraction error:', error);
      }
    })();

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
