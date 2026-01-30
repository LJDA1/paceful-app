import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // Try different possible table names
  const tableNames = ['mood_logs', 'mood_entries', 'moods', 'user_moods'];
  const results: Record<string, unknown> = {};

  for (const table of tableNames) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    results[table] = {
      exists: !error,
      error: error?.message,
      columns: data && data[0] ? Object.keys(data[0]) : [],
      sample: data?.[0],
    };
  }

  return NextResponse.json(results);
}
