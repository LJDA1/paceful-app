import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/ai/chat-summary
 * Generate and store a summary for a chat session
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, messages } = body as {
      sessionId: string;
      messages: Message[];
    };

    if (!sessionId || !messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or messages' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session || session.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Format conversation for summarization
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Pace'}: ${m.content}`)
      .join('\n\n');

    // Generate summary using Claude Haiku
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 300,
      system: `You are summarizing a conversation between a user and Pace, an AI companion helping them through emotional recovery after a breakup.

Respond with a JSON object containing:
1. "summary": A 2-3 sentence summary focusing on what the user discussed, emotions expressed, and any insights or breakthroughs.
2. "key_topics": An array of 2-4 topic tags (lowercase, no spaces, use underscores).

Example response:
{
  "summary": "Sarah talked about feeling anxious about running into her ex at a party this weekend. She worked through some coping strategies including having an exit plan and bringing a supportive friend. By the end, she felt more confident about handling the situation.",
  "key_topics": ["social_anxiety", "ex_encounter", "coping_strategies"]
}

Only respond with valid JSON, no other text.`,
      messages: [
        {
          role: 'user',
          content: `Summarize this conversation:\n\n${conversationText}`,
        },
      ],
    });

    // Parse the response
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    let summary = '';
    let keyTopics: string[] = [];

    try {
      const parsed = JSON.parse(responseText);
      summary = parsed.summary || '';
      keyTopics = parsed.key_topics || [];
    } catch {
      // If JSON parsing fails, use the raw text as summary
      summary = responseText.slice(0, 500);
      keyTopics = [];
    }

    // Update the session with the summary
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({
        summary,
        key_topics: keyTopics,
        ended_at: new Date().toISOString(),
        message_count: messages.length,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session with summary:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary,
      key_topics: keyTopics,
    });
  } catch (error) {
    console.error('Chat summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
