import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { text, entryId } = body;

    if (!text || !entryId) {
      return NextResponse.json({ error: 'Missing text or entryId' }, { status: 400 });
    }

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

    // Verify the entry belongs to the user
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (entryError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Truncate text to save tokens (first 1000 chars should be enough for sentiment)
    const truncatedText = text.substring(0, 1000);

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: 'Analyze this journal entry and respond with ONLY a JSON object, no other text: { "sentiment": "one of: Hopeful, Reflective, Processing, Grateful, Struggling", "themes": ["up to 3 short theme keywords"], "summary": "one sentence emotional summary" }',
      messages: [
        { role: 'user', content: truncatedText }
      ],
    });

    // Extract text from response
    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON from response
    let analysis;
    try {
      // Clean the response in case there's any extra whitespace or markdown
      const cleanedText = textBlock.text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textBlock.text);
      // Fallback analysis
      analysis = {
        sentiment: 'Reflective',
        themes: ['self-reflection'],
        summary: 'A thoughtful journal entry.'
      };
    }

    // Validate the sentiment value
    const validSentiments = ['Hopeful', 'Reflective', 'Processing', 'Grateful', 'Struggling'];
    if (!validSentiments.includes(analysis.sentiment)) {
      analysis.sentiment = 'Reflective';
    }

    // Update the journal entry with sentiment data
    // Try to update emotion_primary and sentiment_score fields
    const sentimentScoreMap: Record<string, number> = {
      'Hopeful': 0.6,
      'Grateful': 0.8,
      'Reflective': 0.0,
      'Processing': -0.3,
      'Struggling': -0.6,
    };

    const { error: updateError } = await supabase
      .from('journal_entries')
      .update({
        emotion_primary: analysis.sentiment,
        sentiment_score: sentimentScoreMap[analysis.sentiment] || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update journal entry:', updateError);
    }

    return NextResponse.json({
      sentiment: analysis.sentiment,
      themes: analysis.themes || [],
      summary: analysis.summary || '',
    });

  } catch (error) {
    console.error('AI Sentiment Error:', error);

    // Return a fallback response on error
    return NextResponse.json({
      sentiment: 'Reflective',
      themes: ['self-reflection'],
      summary: 'A thoughtful journal entry.',
    });
  }
}
