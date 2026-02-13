import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { getStaticExercise } from '@/lib/exercises';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ExerciseType = 'breathing' | 'reframe' | 'gratitude' | 'letting-go' | 'grounding' | 'self-compassion';

interface GeneratedExercise {
  title: string;
  duration: string;
  introduction: string;
  steps: Array<{
    instruction: string;
    duration_seconds: number | null;
  }>;
  closing: string;
}

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

    const { type } = await request.json() as { type: ExerciseType };

    if (!type || !['breathing', 'reframe', 'gratitude', 'letting-go', 'grounding', 'self-compassion'].includes(type)) {
      return NextResponse.json({ error: 'Invalid exercise type' }, { status: 400 });
    }

    // Fetch user's latest mood and ERS score
    const [moodRes, ersRes] = await Promise.all([
      supabase
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('ers_scores')
        .select('ers_score')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const moodScore = moodRes.data?.mood_value ?? 5;
    const ersScore = ersRes.data?.ers_score ?? 50;

    // Generate exercise with Claude
    const systemPrompt = `You are a compassionate emotional wellness guide for Paceful, a healing app for people recovering from breakups. Generate a short guided exercise of the requested type. The exercise should have 3-5 clear steps. Each step should be 1-2 sentences. Be warm, grounding, and specific — not generic. Tailor the exercise to someone with mood level ${moodScore}/10 and ERS score ${ersScore}/100. Respond with ONLY a JSON object: { "title": "exercise title", "duration": "estimated minutes", "introduction": "1-2 sentence intro", "steps": [{ "instruction": "what to do", "duration_seconds": number or null }], "closing": "1 sentence closing thought" }`;

    const typeDescriptions: Record<ExerciseType, string> = {
      'breathing': 'a calming breathing exercise with specific breath counts',
      'reframe': 'a cognitive reframing exercise to shift perspective on a difficult thought',
      'gratitude': 'a gratitude practice to notice positive moments',
      'letting-go': 'a letting go exercise to release what no longer serves them',
      'grounding': 'a grounding exercise using sensory awareness',
      'self-compassion': 'a self-compassion exercise to treat themselves with kindness',
    };

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate ${typeDescriptions[type]}. The user's current mood is ${moodScore}/10 and their emotional readiness score is ${ersScore}/100.`,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const exercise: GeneratedExercise = JSON.parse(jsonMatch[0]);

      return NextResponse.json({
        ...exercise,
        type,
        isAIGenerated: true,
      });
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);

      // Return static fallback exercise
      const fallback = getStaticExercise(type);
      return NextResponse.json({
        ...fallback,
        isAIGenerated: false,
      });
    }
  } catch (error) {
    console.error('Exercise generation error:', error);
    return NextResponse.json({ error: 'Failed to generate exercise' }, { status: 500 });
  }
}
