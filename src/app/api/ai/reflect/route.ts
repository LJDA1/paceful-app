import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

interface ReflectRequest {
  entryText: string;
  sentiment: string;
  entryId?: string;
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
    const body: ReflectRequest = await request.json();
    const { entryText, sentiment, entryId } = body;

    if (!entryText || typeof entryText !== 'string') {
      return NextResponse.json({ error: 'Entry text is required' }, { status: 400 });
    }

    // Don't reflect on very short entries
    const wordCount = entryText.trim().split(/\s+/).length;
    if (wordCount < 20) {
      return NextResponse.json({
        reflection: 'Thank you for taking time to write today.',
        isGeneric: true,
      });
    }

    // Fetch user context
    const [profileRes, ersRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('ers_scores')
        .select('ers_stage')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const firstName = profileRes.data?.first_name || '';
    const ersStage = ersRes.data?.ers_stage ?? 'processing';

    // Build system prompt
    const systemPrompt = `You are a thoughtful companion in the Paceful app reading someone's journal entry. Respond with a brief, warm reflection — 2-3 sentences max. You are NOT a therapist.

Guidelines:
- Acknowledge what they wrote without parroting it back
- Offer one gentle perspective shift or validation
- If they're hurting, be present with it — don't rush to fix
- If they're growing, name the growth you see
- Don't start with "It sounds like" or "I hear you" — be more natural
- Don't use the word "journey"
- Be specific to what they wrote, not generic
- Never give advice unless they explicitly asked for it
- Keep it warm but not saccharine

Context: ${firstName ? `The writer's name is ${firstName}.` : ''} Their current emotional stage is "${ersStage}". The overall sentiment of the entry was "${sentiment}".`;

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please write a brief reflection on this journal entry:\n\n"${entryText}"`,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text');
    const reflection = textContent?.type === 'text' ? textContent.text : 'Thank you for taking time to write today.';

    // Store reflection with the entry if entryId provided
    if (entryId) {
      await supabase
        .from('journal_entries')
        .update({ ai_reflection: reflection })
        .eq('id', entryId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ reflection, isGeneric: false });
  } catch (error) {
    console.error('Reflect API error:', error);
    // Return graceful fallback
    return NextResponse.json({
      reflection: 'Thank you for taking time to write today.',
      isGeneric: true,
    });
  }
}
