/**
 * POST /api/v1/partner/journal/entry
 *
 * Create a journal entry for a partner user.
 * Performs sentiment analysis and generates an AI reflection.
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkEndpointRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
  getSupabaseAdmin,
} from '@/lib/partner-auth';
import { sendUserWebhook } from '@/lib/webhook-sender';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';

// ============================================================================
// Sentiment Analysis
// ============================================================================

const POSITIVE_WORDS = new Set([
  'hopeful', 'grateful', 'happy', 'better', 'progress', 'growing',
  'joy', 'love', 'excited', 'peaceful', 'calm', 'content', 'proud',
  'confident', 'optimistic', 'blessed', 'thankful', 'wonderful',
  'amazing', 'great', 'good', 'positive', 'healing', 'strong',
  'motivated', 'inspired', 'accomplished', 'relieved', 'supported',
]);

const NEGATIVE_WORDS = new Set([
  'sad', 'angry', 'hurt', 'lonely', 'struggling', 'pain',
  'anxious', 'worried', 'scared', 'depressed', 'hopeless', 'lost',
  'frustrated', 'overwhelmed', 'stressed', 'exhausted', 'broken',
  'confused', 'guilty', 'ashamed', 'disappointed', 'regret',
  'fear', 'grief', 'empty', 'numb', 'isolated', 'rejected',
]);

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'reflective';
  sentimentScore: number;
}

function analyzeSentiment(content: string): SentimentResult {
  const words = content.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    // Remove punctuation for matching
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (POSITIVE_WORDS.has(cleanWord)) {
      positiveCount++;
    }
    if (NEGATIVE_WORDS.has(cleanWord)) {
      negativeCount++;
    }
  }

  const total = positiveCount + negativeCount;

  if (total === 0) {
    return { sentiment: 'reflective', sentimentScore: 0 };
  }

  // Calculate score from -1 to 1
  const sentimentScore = (positiveCount - negativeCount) / total;

  let sentiment: 'positive' | 'negative' | 'reflective';
  if (sentimentScore > 0.2) {
    sentiment = 'positive';
  } else if (sentimentScore < -0.2) {
    sentiment = 'negative';
  } else {
    sentiment = 'reflective';
  }

  return {
    sentiment,
    sentimentScore: Math.round(sentimentScore * 100) / 100,
  };
}

// ============================================================================
// AI Reflection Generation
// ============================================================================

async function generateAIReflection(
  content: string,
  sentiment: 'positive' | 'negative' | 'reflective'
): Promise<string> {
  // Try to use Anthropic API if available
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: `You are Pace, a supportive AI companion for emotional healing. Read this journal entry and provide a brief, warm, supportive reflection (2-3 sentences max). Be empathetic but not clinical. Don't repeat what they said back to them.

Journal entry:
${content.substring(0, 500)}

Respond with just the reflection, no preamble.`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.content?.[0]?.text;
        if (aiResponse) {
          return aiResponse.trim();
        }
      }
    } catch (error) {
      console.error('AI reflection generation failed:', error);
    }
  }

  // Fallback to template responses based on sentiment
  const templates = {
    positive: [
      "It's wonderful to see you recognizing the positive moments in your journey. These feelings are meaningful and worth celebrating.",
      "Your words reflect real growth. Keep holding onto these moments of light as you continue forward.",
      "There's genuine strength in your reflection. These positive feelings are signs of your healing progress.",
    ],
    negative: [
      "Thank you for sharing these difficult feelings. It takes courage to express what you're going through, and acknowledging pain is part of healing.",
      "I hear the weight in your words. Remember that difficult emotions are temporary, and reaching out like this shows real strength.",
      "These feelings are valid, and sharing them is an important step. Be gentle with yourself during this time.",
    ],
    reflective: [
      "Thank you for taking this time to reflect. The act of writing itself is a powerful tool for understanding and healing.",
      "Your willingness to explore your thoughts shows real self-awareness. Keep nurturing this practice of reflection.",
      "Processing experiences through writing creates space for clarity. You're doing meaningful work here.",
    ],
  };

  const options = templates[sentiment];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================================================
// Route Handler
// ============================================================================

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    const body = await request.clone().json().catch(() => ({}));
    return sandboxResponse('journal_entry', body);
  }

  // Validate API key
  const validation = await validatePartnerKey(request);
  if (!validation.valid) {
    return partnerApiError(
      validation.error || 'Invalid API key',
      'UNAUTHORIZED',
      401
    );
  }

  // Check rate limit
  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, request.url);
  if (!rateLimit.allowed) {
    return partnerApiError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      undefined,
      rateLimit
    );
  }

  try {
    const body = await request.json();
    const { externalId, content } = body;

    // Validate required fields
    if (!externalId || typeof externalId !== 'string') {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/journal/entry',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('externalId is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      await logPartnerApiUsage(
        validation.partnerId!,
        '/api/v1/partner/journal/entry',
        'POST',
        400,
        Date.now() - startTime
      );
      return partnerApiError('content is required and cannot be empty', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    const supabase = getSupabaseAdmin();
    const partnerId = validation.partnerId!;
    const trimmedContent = content.trim();

    // Look up partner user
    const { data: partnerUser, error: userError } = await supabase
      .from('partner_users')
      .select('id, external_id')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .single();

    if (userError || !partnerUser) {
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/journal/entry',
        'POST',
        404,
        Date.now() - startTime
      );
      return partnerApiError('User not found', 'NOT_FOUND', 404, undefined, rateLimit);
    }

    // Calculate word count
    const wordCount = trimmedContent.split(/\s+/).filter(w => w.length > 0).length;

    // Analyze sentiment
    const { sentiment, sentimentScore } = analyzeSentiment(trimmedContent);

    // Generate AI reflection
    const aiReflection = await generateAIReflection(trimmedContent, sentiment);

    // Insert journal entry
    const timestamp = new Date().toISOString();
    const { data: entry, error: insertError } = await supabase
      .from('partner_journal_entries')
      .insert({
        partner_user_id: partnerUser.id,
        content: trimmedContent,
        word_count: wordCount,
        sentiment,
        sentiment_score: sentimentScore,
        ai_reflection: aiReflection,
        created_at: timestamp,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting journal entry:', insertError);
      await logPartnerApiUsage(
        partnerId,
        '/api/v1/partner/journal/entry',
        'POST',
        500,
        Date.now() - startTime
      );
      return partnerApiError('Failed to create journal entry', 'INTERNAL_ERROR', 500, undefined, rateLimit);
    }

    // Fire journal.created webhook
    await sendUserWebhook(partnerId, externalId, 'journal.created', {
      entryId: entry.id,
      wordCount,
      sentiment,
      sentimentScore,
      timestamp,
    });

    await logPartnerApiUsage(
      partnerId,
      '/api/v1/partner/journal/entry',
      'POST',
      201,
      Date.now() - startTime
    );

    return partnerApiSuccess(
      {
        entryId: entry.id,
        sentiment,
        sentimentScore,
        aiReflection,
        wordCount,
      },
      201,
      undefined,
      rateLimit
    );
  } catch (error) {
    console.error('Journal entry error:', error);
    await logPartnerApiUsage(
      validation.partnerId!,
      '/api/v1/partner/journal/entry',
      'POST',
      500,
      Date.now() - startTime
    );
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
