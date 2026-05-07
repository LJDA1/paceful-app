/**
 * GET /api/v1/signals/[vertical]
 *
 * Public endpoint — no auth required.
 * Returns the signal catalog for a vertical.
 * Use vertical = "list" to return all available verticals.
 */

import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { engine } = require('@/lib/engine-instance');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vertical: string }> }
) {
  const { vertical } = await params;

  if (vertical === 'list' || !vertical) {
    return NextResponse.json({ verticals: engine.listVerticals() });
  }

  const catalog = engine.getSignalCatalog(vertical);
  if (!catalog) {
    return NextResponse.json(
      { error: `Unknown vertical: ${vertical}`, available: engine.listVerticals() },
      { status: 404 }
    );
  }

  return NextResponse.json(catalog);
}
