import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { errors } from '@/lib/api-errors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'paceful_admin_2025';

export async function GET(request: NextRequest) {
  // Require admin key for test routes
  const url = new URL(request.url);
  const keyFromQuery = url.searchParams.get('key');
  const keyFromHeader = request.headers.get('X-Admin-Key');
  const providedKey = keyFromQuery || keyFromHeader;

  if (providedKey !== ADMIN_KEY) {
    return errors.unauthorized('Admin key required for test endpoints');
  }
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
