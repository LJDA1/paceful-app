/**
 * POST /api/v1/analyze/[vertical]/conversation
 *
 * Analyze a sequence of messages, compute trajectory, detect turning points,
 * calculate velocity, and identify the optimal intervention window.
 * Auth: X-API-Key header required.
 *
 * Body: { messages: [{ id, text, timestamp?, sender? }], verbosity? }
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { engine } = require('@/lib/engine-instance');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dispatchConversationEvents } = require('@/lib/webhook-dispatcher');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { calculateTrajectory } = require('@/lib/trajectory');

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

  const { messages, verbosity } = body as {
    messages?: Array<{ id?: string; text?: string; timestamp?: string; sender?: string }>;
    verbosity?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: '"messages" must be a non-empty array' }, { status: 400 });
  }

  if (!engine.configLoader.list().includes(vertical)) {
    return NextResponse.json(
      { error: `Unknown vertical: ${vertical}`, available_verticals: engine.listVerticals() },
      { status: 400 }
    );
  }

  const conversationId = `conv_${crypto.randomBytes(8).toString('hex')}`;
  const analyzedMessages = [];
  const overallRiskScores = [];
  const messageIds = [];

  for (const message of messages) {
    if (!message.text || typeof message.text !== 'string' || message.text.trim().length === 0) {
      continue;
    }

    const result = engine.analyze(vertical, message.text, {
      verbosity: verbosity || 'standard',
      context: message.sender ? `sender:${message.sender}` : undefined,
    });

    analyzedMessages.push({
      message_id: message.id,
      sender: message.sender || null,
      timestamp: message.timestamp || null,
      result,
    });

    const riskScore = result.composite_scores?.overall_risk?.score ?? 0;
    overallRiskScores.push(riskScore);
    messageIds.push(message.id);
  }

  if (analyzedMessages.length === 0) {
    return NextResponse.json({ error: 'No valid messages to analyze' }, { status: 400 });
  }

  const trajectory = calculateTrajectory(overallRiskScores, messageIds);
  const lastResult = analyzedMessages[analyzedMessages.length - 1].result;

  const conversationResult = {
    conversation_id: conversationId,
    vertical,
    message_count: analyzedMessages.length,
    messages: analyzedMessages,
    trajectory,
    summary_composite_scores: lastResult.composite_scores,
    timestamp: Date.now(),
  };

  dispatchConversationEvents(conversationResult, apiKey).catch((err: unknown) =>
    console.error('[conversation] Webhook dispatch error:', err)
  );

  return NextResponse.json(conversationResult);
}
