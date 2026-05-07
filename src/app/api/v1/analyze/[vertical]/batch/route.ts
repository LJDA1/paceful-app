/**
 * POST /api/v1/analyze/[vertical]/batch
 *
 * Analyze up to 25 text items in a single request.
 * Auth: X-API-Key header required.
 *
 * Body: { items: [{ id, text, context? }], verbosity? }
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { engine } = require('@/lib/engine-instance');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dispatchSignalEvents } = require('@/lib/webhook-dispatcher');

const MAX_ITEMS = 25;

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

  const { items, verbosity } = body as {
    items?: Array<{ id?: string; text?: string; context?: string }>;
    verbosity?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: '"items" must be a non-empty array' }, { status: 400 });
  }

  if (items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `Batch size exceeds maximum of ${MAX_ITEMS} items` },
      { status: 400 }
    );
  }

  if (!engine.configLoader.list().includes(vertical)) {
    return NextResponse.json(
      { error: `Unknown vertical: ${vertical}`, available_verticals: engine.listVerticals() },
      { status: 400 }
    );
  }

  const batchId = `batch_${crypto.randomBytes(8).toString('hex')}`;
  const batchStart = Date.now();
  const results = [];
  let failed = 0;

  for (const item of items) {
    const itemStart = Date.now();

    if (!item.text || typeof item.text !== 'string' || item.text.trim().length === 0) {
      results.push({
        id: item.id || null,
        success: false,
        error: 'Missing or invalid "text" field',
        processing_time_ms: Date.now() - itemStart,
      });
      failed++;
      continue;
    }

    if (item.text.length > 50000) {
      results.push({
        id: item.id || null,
        success: false,
        error: 'Text exceeds maximum length of 50,000 characters',
        processing_time_ms: Date.now() - itemStart,
      });
      failed++;
      continue;
    }

    try {
      const result = engine.analyze(vertical, item.text, {
        verbosity: verbosity || 'standard',
        context: item.context,
      });

      dispatchSignalEvents(result, apiKey).catch((err: unknown) =>
        console.error('[batch] Webhook dispatch error:', err)
      );

      results.push({
        id: item.id || null,
        success: true,
        result,
        processing_time_ms: Date.now() - itemStart,
      });
    } catch (err: unknown) {
      results.push({
        id: item.id || null,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        processing_time_ms: Date.now() - itemStart,
      });
      failed++;
    }
  }

  return NextResponse.json({
    batch_id: batchId,
    vertical,
    total: items.length,
    processed: items.length - failed,
    failed,
    total_processing_time_ms: Date.now() - batchStart,
    results,
  });
}
