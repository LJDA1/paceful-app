import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { generateArchetypes, SyntheticUserProfile } from '@/lib/synthetic/user-archetypes';
import { generateMoodTimeline, SyntheticMoodEntry } from '@/lib/synthetic/mood-generator';
import { generateJournalEntries, generatePlaceholderJournalEntries } from '@/lib/synthetic/journal-generator';
import { calculateAndStoreERSScore } from '@/lib/ers-calculator';

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'paceful-admin-2024';

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('[Synthetic] Missing environment variables:', {
      hasUrl: !!url,
      hasServiceKey: !!key,
      urlPrefix: url?.substring(0, 20),
    });
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, key);
}

interface GenerationRequest {
  batchStart: number;
  batchEnd: number;
  useAI?: boolean; // Whether to use Claude for journals (default true)
  dryRun?: boolean; // Just preview, don't insert
}

interface GenerationResult {
  completed: number;
  total: number;
  users: {
    syntheticId: string;
    firstName: string;
    moodEntries: number;
    journalEntries: number;
    ersScore: number | null;
  }[];
  errors: string[];
}

/**
 * POST /api/admin/generate-synthetic
 * Generate synthetic users in batches
 */
export async function POST(request: NextRequest) {
  // Verify admin key
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Synthetic] POST request received');

    const body: GenerationRequest = await request.json();
    const { batchStart = 1, batchEnd = 25, useAI = true, dryRun = false } = body;

    console.log('[Synthetic] Request params:', { batchStart, batchEnd, useAI, dryRun });

    // Validate range
    if (batchStart < 1 || batchEnd > 250 || batchStart > batchEnd) {
      return NextResponse.json(
        { error: 'Invalid batch range. Must be 1-250.' },
        { status: 400 }
      );
    }

    console.log('[Synthetic] Creating Supabase client...');
    const supabase = getSupabaseAdmin();
    console.log('[Synthetic] Supabase client created');

    console.log('[Synthetic] Creating Anthropic client...');
    const anthropic = useAI ? new Anthropic() : null;
    console.log('[Synthetic] Anthropic client:', anthropic ? 'created' : 'skipped (useAI=false)');

    // Generate all archetypes (deterministic)
    const allArchetypes = generateArchetypes(42);
    const batchArchetypes = allArchetypes.slice(batchStart - 1, batchEnd);

    const result: GenerationResult = {
      completed: 0,
      total: batchArchetypes.length,
      users: [],
      errors: [],
    };

    for (const profile of batchArchetypes) {
      try {
        const userResult = await generateSingleUser(
          profile,
          supabase,
          anthropic,
          dryRun
        );
        result.users.push(userResult);
        result.completed++;
      } catch (error) {
        const errorMsg = `Failed to generate ${profile.syntheticId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[Synthetic] User generation failed:', {
          syntheticId: profile.syntheticId,
          error: error instanceof Error ? error.stack : error,
        });
        result.errors.push(errorMsg);
      }
    }

    console.log('[Synthetic] Generation complete:', {
      completed: result.completed,
      total: result.total,
      errors: result.errors.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Synthetic] FATAL ERROR:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return NextResponse.json(
      { error: 'Generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateSingleUser(
  profile: SyntheticUserProfile,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  anthropic: Anthropic | null,
  dryRun: boolean
): Promise<{
  syntheticId: string;
  firstName: string;
  moodEntries: number;
  journalEntries: number;
  ersScore: number | null;
}> {
  const email = `${profile.syntheticId}@paceful.synthetic`;
  console.log(`[Synthetic] Generating user: ${profile.syntheticId} (${profile.firstName})`);

  if (dryRun) {
    // Just generate data without inserting
    const moodTimeline = generateMoodTimeline(profile);
    const journals = generatePlaceholderJournalEntries(profile, moodTimeline);

    return {
      syntheticId: profile.syntheticId,
      firstName: profile.firstName,
      moodEntries: moodTimeline.length,
      journalEntries: journals.length,
      ersScore: null,
    };
  }

  // 1. Create auth user (trigger will auto-create profile row)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: `synthetic-${profile.syntheticId}-${Date.now()}`,
    email_confirm: true,
    user_metadata: {
      is_synthetic: true,
      synthetic_id: profile.syntheticId,
    },
  });

  // Handle "user already exists" as a skip, not an error
  if (authError) {
    if (authError.message?.includes('already') || authError.code === 'email_exists') {
      console.log(`[Synthetic] User ${profile.syntheticId} already exists, skipping`);
      return {
        syntheticId: profile.syntheticId,
        firstName: profile.firstName,
        moodEntries: 0,
        journalEntries: 0,
        ersScore: null,
      };
    }
    console.error('[Synthetic] Auth creation error:', authError.message);
    throw new Error(`Auth creation failed: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Auth creation failed: No user returned');
  }

  const userId = authData.user.id;
  console.log(`[Synthetic] Created auth user: ${userId}`);

  // 2. UPDATE the profile (trigger already created it, we just need to fill in the fields)
  const breakupDate = new Date();
  breakupDate.setDate(breakupDate.getDate() - profile.journeyLengthDays);

  // Small delay to ensure trigger has completed
  await new Promise(resolve => setTimeout(resolve, 100));

  const { error: profileError } = await supabase.from('profiles').update({
    first_name: profile.firstName,
    date_of_birth: generateBirthDate(profile.age),
    gender: profile.gender,
    breakup_date: profile.userType !== 'support_seeker' ? breakupDate.toISOString().split('T')[0] : null,
    relationship_duration: profile.relationshipLengthMonths,
    onboarding_completed: true,
    is_synthetic: true,
    seeking_match: profile.seekingMatch,
    match_preferences: profile.matchPreferences,
    recovery_context: profile.recoveryContext,
  }).eq('user_id', userId);

  if (profileError) {
    console.error('[Synthetic] Profile update error:', profileError);
    // Clean up auth user
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(`Profile update failed: ${profileError.message}`);
  }

  console.log(`[Synthetic] Updated profile for ${profile.syntheticId}`);

  // 4. Generate mood timeline
  const moodTimeline = generateMoodTimeline(profile, breakupDate);

  // 5. Insert mood entries
  const moodInserts = moodTimeline.map(entry => ({
    user_id: userId,
    mood_value: entry.moodScore,
    emotions: entry.emotions,
    notes: entry.notes,
    logged_at: entry.loggedAt.toISOString(),
    is_synthetic: true,
  }));

  if (moodInserts.length > 0) {
    const { error: moodError } = await supabase
      .from('mood_entries')
      .insert(moodInserts);

    if (moodError) {
      console.error(`Mood insert error for ${profile.syntheticId}:`, moodError);
    }
  }

  // 6. Generate journal entries
  let journalEntries;
  if (anthropic) {
    journalEntries = await generateJournalEntries(profile, moodTimeline, anthropic);
  } else {
    journalEntries = generatePlaceholderJournalEntries(profile, moodTimeline);
  }

  // 7. Insert journal entries
  const journalInserts = journalEntries.map(entry => ({
    user_id: userId,
    title: entry.title,
    content: entry.content,
    created_at: entry.createdAt.toISOString(),
    is_synthetic: true,
  }));

  if (journalInserts.length > 0) {
    const { error: journalError } = await supabase
      .from('journal_entries')
      .insert(journalInserts);

    if (journalError) {
      console.error(`Journal insert error for ${profile.syntheticId}:`, journalError);
    }
  }

  // 8. Calculate ERS score
  let ersScore: number | null = null;
  try {
    const ersResult = await calculateAndStoreERSScore(userId);
    ersScore = ersResult.ersScore ?? null;

    // Mark ERS as synthetic
    if (ersScore !== null) {
      await supabase
        .from('ers_scores')
        .update({ is_synthetic: true })
        .eq('user_id', userId);
    }
  } catch (error) {
    console.error(`ERS calculation error for ${profile.syntheticId}:`, error);
  }

  // 9. Log activity
  await supabase.from('activity_logs').insert({
    user_id: userId,
    event_type: 'synthetic_user_created',
    event_data: {
      archetype: {
        userType: profile.userType,
        recoverySpeed: profile.recoverySpeed,
        attachmentStyle: profile.attachmentStyle,
        outcome: profile.outcome,
      },
    },
    is_synthetic: true,
  });

  return {
    syntheticId: profile.syntheticId,
    firstName: profile.firstName,
    moodEntries: moodTimeline.length,
    journalEntries: journalEntries.length,
    ersScore,
  };
}

function generateBirthDate(age: number): string {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1;
  return `${birthYear}-${String(birthMonth + 1).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
}

/**
 * DELETE /api/admin/generate-synthetic
 * Clear all synthetic data
 */
export async function DELETE(request: NextRequest) {
  // Verify admin key
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Delete in order (respecting foreign keys)
    const tables = [
      'activity_logs',
      'discovered_patterns',
      'extracted_insights',
      'recovery_trajectories',
      'ers_scores',
      'journal_entries',
      'mood_entries',
      'chat_sessions',
      'consent_records',
      'ai_memory',
    ];

    const results: Record<string, number> = {};

    for (const table of tables) {
      // Count first
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('is_synthetic', true);

      // Then delete
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('is_synthetic', true);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
      }
      results[table] = count || 0;
    }

    // Get synthetic user IDs
    const { data: syntheticProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('is_synthetic', true);

    // Count profiles
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_synthetic', true);

    // Delete profiles
    await supabase
      .from('profiles')
      .delete()
      .eq('is_synthetic', true);

    results['profiles'] = profileCount || 0;

    // Delete auth users
    let authDeleted = 0;
    if (syntheticProfiles) {
      for (const profile of syntheticProfiles) {
        try {
          await supabase.auth.admin.deleteUser(profile.user_id);
          authDeleted++;
        } catch (error) {
          console.error(`Error deleting auth user ${profile.user_id}:`, error);
        }
      }
    }
    results['auth_users'] = authDeleted;

    return NextResponse.json({
      success: true,
      deleted: results,
    });
  } catch (error) {
    console.error('Synthetic deletion error:', error);
    return NextResponse.json(
      { error: 'Deletion failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/generate-synthetic
 * Get status of synthetic data
 */
export async function GET(request: NextRequest) {
  // Verify admin key
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const [profiles, moods, journals, ers] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_synthetic', true),
      supabase.from('mood_entries').select('*', { count: 'exact', head: true }).eq('is_synthetic', true),
      supabase.from('journal_entries').select('*', { count: 'exact', head: true }).eq('is_synthetic', true),
      supabase.from('ers_scores').select('*', { count: 'exact', head: true }).eq('is_synthetic', true),
    ]);

    return NextResponse.json({
      syntheticUsers: profiles.count || 0,
      moodEntries: moods.count || 0,
      journalEntries: journals.count || 0,
      ersScores: ers.count || 0,
      targetUsers: 250,
      progress: Math.round(((profiles.count || 0) / 250) * 100),
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    );
  }
}
