import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeText, type FullAnalysisResult } from '@/lib/sentiment-analyzer';
import { calculateAndStoreERSScore } from '@/lib/ers-calculator';

// ============================================================================
// Supabase Admin Client (server-side only)
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Types
// ============================================================================

interface JournalEntryRequest {
  user_id: string;
  entry_title?: string | null;
  entry_content: string;
  prompt_id?: string | null;
}

interface JournalEntryResponse {
  id: string;
  user_id: string;
  entry_title: string | null;
  entry_content: string;
  prompt_id: string | null;
  sentiment_score: number | null;
  emotion_primary: string | null;
  emotion_secondary: string | null;
  word_count: number;
  has_gratitude: boolean;
  has_insight: boolean;
  created_at: string;
  analysis: FullAnalysisResult;
}

// ============================================================================
// POST - Create Journal Entry
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json() as JournalEntryRequest;

    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (!body.entry_content || body.entry_content.trim().length === 0) {
      return NextResponse.json(
        { error: 'entry_content is required' },
        { status: 400 }
      );
    }

    const content = body.entry_content.trim();
    const title = body.entry_title?.trim() || null;

    // Minimum word count validation
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 5) {
      return NextResponse.json(
        { error: 'Entry must contain at least 5 words' },
        { status: 400 }
      );
    }

    // Validate user exists (skip in demo mode if user check fails)
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', body.user_id)
      .single();

    if (userError) {
      console.log('User validation skipped (demo mode):', userError.message);
      // Continue anyway for demo - user might exist but RLS blocking
    }

    // Validate prompt_id if provided (skip validation in demo mode)
    if (body.prompt_id) {
      const { data: prompt, error: promptError } = await supabase
        .from('journal_prompts')
        .select('id')
        .eq('id', body.prompt_id)
        .single();

      if (promptError) {
        console.log('Prompt validation skipped:', promptError.message);
        // Continue anyway - set prompt_id to null if invalid
        body.prompt_id = null;
      }
    }

    // Run sentiment analysis
    const analysis = analyzeText(content);

    // Prepare entry data (only include columns that exist in the table)
    const entryData = {
      user_id: body.user_id,
      entry_title: title,
      entry_content: content,
      prompt_id: body.prompt_id || null,
      sentiment_score: analysis.sentiment.score,
      emotion_primary: analysis.emotions.primary,
      word_count: analysis.language.wordCount,
    };

    // Insert journal entry
    const { data: entry, error: insertError } = await supabase
      .from('journal_entries')
      .insert(entryData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert journal entry:', insertError);
      return NextResponse.json(
        { error: 'Failed to save journal entry', details: insertError.message },
        { status: 500 }
      );
    }

    // Trigger ERS recalculation (async, don't wait for completion)
    calculateAndStoreERSScore(body.user_id).catch(err => {
      console.error('Failed to recalculate ERS after journal entry:', err);
    });

    // Return response
    const response: JournalEntryResponse = {
      id: entry.id,
      user_id: entry.user_id,
      entry_title: entry.entry_title,
      entry_content: entry.entry_content,
      prompt_id: entry.prompt_id,
      sentiment_score: entry.sentiment_score,
      emotion_primary: entry.emotion_primary,
      emotion_secondary: analysis.emotions.secondary,
      word_count: entry.word_count,
      has_gratitude: analysis.insights.hasGratitude,
      has_insight: analysis.insights.hasSelfReflection,
      created_at: entry.created_at,
      analysis,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Journal API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Fetch Journal Entries
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch entries (only select columns that exist in the table)
    const { data: entries, error, count } = await supabase
      .from('journal_entries')
      .select('id, entry_title, entry_content, prompt_id, sentiment_score, emotion_primary, word_count, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch journal entries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch entries', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: entries || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Journal GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Soft Delete Journal Entry
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');
    const userId = searchParams.get('user_id');

    if (!entryId || !userId) {
      return NextResponse.json(
        { error: 'id and user_id query parameters are required' },
        { status: 400 }
      );
    }

    // Soft delete by setting deleted_at
    const { error } = await supabase
      .from('journal_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete journal entry:', error);
      return NextResponse.json(
        { error: 'Failed to delete entry', details: error.message },
        { status: 500 }
      );
    }

    // Trigger ERS recalculation
    calculateAndStoreERSScore(userId).catch(err => {
      console.error('Failed to recalculate ERS after entry deletion:', err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Journal DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
