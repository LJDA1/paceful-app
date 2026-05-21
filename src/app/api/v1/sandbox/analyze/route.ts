/**
 * POST /api/v1/sandbox/analyze
 *
 * Public sandbox endpoint for testing the ERS API without authentication.
 * Same response shape as /api/v1/assess/analyze but:
 * - No X-API-Key required
 * - Rate limited: 5 requests per IP per 24 hours
 * - Stores usage in sandbox_usage table (ip_hash, email, timestamp)
 * - Adds sandbox: true flag to response
 * - Never stores raw text (only hashed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import {
  analyzeTextWithClaude,
  calculateErsScore,
  getReadinessLabel,
  formatScore,
  getScoreLabel,
  generateReasoning,
  generateRecommendedAction,
  hashText,
  VALID_DIMENSIONS,
  DEFAULT_CONFIG,
  type Dimension,
  type SourceType,
} from '@/lib/text-analysis';

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting: 5 requests per IP per 24 hours
const MAX_REQUESTS_PER_IP_PER_DAY = 5;

interface SandboxRequestBody {
  user_id: string;
  text: string;
  source_type?: string;
  email?: string;
  config?: {
    verbosity?: 'minimal' | 'standard' | 'clinical';
    tone?: 'clinical' | 'casual' | 'motivational';
    score_format?: 'numerical' | 'percentage' | 'tier_label' | 'traffic_light';
    include_signals?: boolean;
  };
}

// Hash IP address for privacy (never store raw IPs)
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + process.env.SUPABASE_SERVICE_ROLE_KEY).digest('hex').substring(0, 32);
}

// CORS headers for public API
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const ipHash = hashIp(ip);

    // Check rate limit (5 requests per IP per 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: requestCount, error: countError } = await supabaseAdmin
      .from('sandbox_usage')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipHash)
      .gte('created_at', twentyFourHoursAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    }

    if (requestCount && requestCount >= MAX_REQUESTS_PER_IP_PER_DAY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_IP_PER_DAY} requests per 24 hours. Get an API key at /partners/signup for unlimited access.`,
            code: 'RATE_LIMITED',
          },
          sandbox: true,
        },
        { status: 429, headers: corsHeaders() }
      );
    }

    // Parse request body
    const body: SandboxRequestBody = await request.json();
    const { user_id, text, source_type, email, config: requestConfig } = body;

    // Validate required fields
    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'user_id is required', code: 'BAD_REQUEST' }, sandbox: true },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'text is required', code: 'BAD_REQUEST' }, sandbox: true },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (text.length < 20) {
      return NextResponse.json(
        { success: false, error: { message: 'text must be at least 20 characters', code: 'BAD_REQUEST' }, sandbox: true },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { success: false, error: { message: 'text must be at most 10,000 characters', code: 'BAD_REQUEST' }, sandbox: true },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate source type
    const validSourceTypes: SourceType[] = ['journal', 'session_notes', 'chat_transcript', 'free_text'];
    const sourceType: SourceType = validSourceTypes.includes(source_type as SourceType)
      ? (source_type as SourceType)
      : 'free_text';

    // Build config (merge defaults with request overrides)
    const config = {
      verbosity: (['minimal', 'standard', 'clinical'].includes(requestConfig?.verbosity || '')
        ? requestConfig!.verbosity!
        : DEFAULT_CONFIG.verbosity) as 'minimal' | 'standard' | 'clinical',
      tone: (['clinical', 'casual', 'motivational'].includes(requestConfig?.tone || '')
        ? requestConfig!.tone!
        : DEFAULT_CONFIG.tone) as 'clinical' | 'casual' | 'motivational',
      score_format: (['numerical', 'percentage', 'tier_label', 'traffic_light'].includes(requestConfig?.score_format || '')
        ? requestConfig!.score_format!
        : DEFAULT_CONFIG.score_format) as 'numerical' | 'percentage' | 'tier_label' | 'traffic_light',
      traffic_light_thresholds: DEFAULT_CONFIG.traffic_light_thresholds,
      include_signals: requestConfig?.include_signals ?? DEFAULT_CONFIG.include_signals,
    };

    // Analyze text with Claude (real analysis, not mock)
    const analysis = await analyzeTextWithClaude(text, sourceType, config.tone);

    // Calculate weighted ERS score
    const ersScore = calculateErsScore(analysis.dimensions);
    const readinessLabel = getReadinessLabel(ersScore);

    // Generate assessment ID
    const assessmentId = `sandbox_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();
    const textHash = hashText(text);

    // Store usage in sandbox_usage table (never store raw text, only hash)
    const { data: usageRecord, error: insertError } = await supabaseAdmin
      .from('sandbox_usage')
      .insert({
        session_id: `api_${ipHash}_${Date.now()}`,
        ip_address: ipHash, // Store hashed IP, not raw
        email: email || null,
        user_agent: request.headers.get('user-agent') || null,
        assessment_count: 1,
        used_text_analysis: true,
        last_assessment_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing sandbox usage:', insertError);
    }

    // Store assessment record (with hashed text, not raw)
    if (usageRecord) {
      await supabaseAdmin.from('sandbox_assessments').insert({
        sandbox_usage_id: usageRecord.id,
        assessment_type: 'single',
        ers_score: ersScore,
        readiness_label: readinessLabel,
        confidence: analysis.overall_confidence,
        dim_emotional_stability: analysis.dimensions.emotional_stability.score,
        dim_self_reflection: analysis.dimensions.self_reflection.score,
        dim_coping_capacity: analysis.dimensions.coping_capacity.score,
        dim_behavioral_engagement: analysis.dimensions.behavioral_engagement.score,
        dim_social_readiness: analysis.dimensions.social_readiness.score,
      });
    }

    // Build dimension results based on config (same shape as /assess/analyze)
    const dimensionResults: Record<Dimension, Record<string, unknown>> = {} as Record<Dimension, Record<string, unknown>>;

    for (const dim of VALID_DIMENSIONS) {
      const dimData = analysis.dimensions[dim];
      const formattedScore = formatScore(dimData.score, config.score_format, config.traffic_light_thresholds);
      const label = getScoreLabel(dimData.score);

      if (config.verbosity === 'minimal') {
        dimensionResults[dim] = {
          score: formattedScore,
          label,
          confidence: dimData.confidence,
        };
      } else {
        const result: Record<string, unknown> = {
          score: formattedScore,
          label,
          confidence: dimData.confidence,
          reasoning: generateReasoning(dimData.reasoning),
          top_signals: config.include_signals ? dimData.top_signals : undefined,
        };

        if (config.verbosity === 'clinical') {
          result.recommended_action = generateRecommendedAction(dim, dimData.score);
        }

        dimensionResults[dim] = result;
      }
    }

    // Format overall score
    const formattedErsScore = formatScore(ersScore, config.score_format, config.traffic_light_thresholds);

    // Calculate remaining requests
    const remainingRequests = MAX_REQUESTS_PER_IP_PER_DAY - (requestCount || 0) - 1;

    // Build response (same shape as /assess/analyze + sandbox flag)
    const response: Record<string, unknown> = {
      ers_snapshot: formattedErsScore,
      dimensions: dimensionResults,
      readiness_label: readinessLabel,
      confidence: analysis.overall_confidence,
      assessment_id: assessmentId,
      timestamp,
      source_type: sourceType,
      text_length: text.length,
      text_hash: textHash,
      extraction_confidence: analysis.overall_confidence,
      sandbox: true, // Flag indicating this is sandbox data
    };

    // Add meta block for non-minimal responses
    if (config.verbosity !== 'minimal') {
      response.meta = {
        verbosity: config.verbosity,
        tone: config.tone,
        score_format: config.score_format,
        api_version: '1.3.0',
        model_version: 'ers-text-v1',
        extraction_notes: analysis.extraction_notes,
        sandbox: true,
      };
    }

    // Add rate limit info to response
    response.rate_limit = {
      remaining: Math.max(0, remainingRequests),
      limit: MAX_REQUESTS_PER_IP_PER_DAY,
      reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json(
      { success: true, data: response },
      {
        status: 200,
        headers: {
          ...corsHeaders(),
          'X-RateLimit-Limit': MAX_REQUESTS_PER_IP_PER_DAY.toString(),
          'X-RateLimit-Remaining': Math.max(0, remainingRequests).toString(),
        },
      }
    );
  } catch (error) {
    console.error('Sandbox API error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' }, sandbox: true },
      { status: 500, headers: corsHeaders() }
    );
  }
}
