/**
 * POST /api/v1/analyze/[vertical]
 *
 * Analyze text against a vertical's signal set.
 * Auth: X-API-Key header required.
 *
 * Body: { text, verbosity?, context?, ers_scores? }
 * Response: VerticalEngineResult
 */

import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { engine } = require('@/lib/engine-instance');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dispatchSignalEvents } = require('@/lib/webhook-dispatcher');

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vertical: string }> }
) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing X-API-Key header' }, { status: 401 });
  }

  const { vertical } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, verbosity, context, ers_scores } = body as {
    text?: string;
    verbosity?: string;
    context?: string;
    ers_scores?: unknown;
  };

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Missing or invalid "text" field' }, { status: 400 });
  }

  if (text.length > 50000) {
    return NextResponse.json(
      { error: 'Text exceeds maximum length of 50,000 characters' },
      { status: 400 }
    );
  }

  let result;
  try {
    result = engine.analyze(vertical, text, {
      verbosity: verbosity || 'standard',
      context,
      ers_scores,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Unknown vertical')) {
      return NextResponse.json(
        { error: msg, available_verticals: engine.listVerticals() },
        { status: 400 }
      );
    }
    console.error('[analyze] Error:', err);
    return NextResponse.json({ error: 'Internal analysis error' }, { status: 500 });
  }

  // Fire webhook events asynchronously — do not block the response
  dispatchSignalEvents(result, apiKey).catch((err: unknown) =>
    console.error('[analyze] Webhook dispatch error:', err)
  );

  return NextResponse.json(result);
}
