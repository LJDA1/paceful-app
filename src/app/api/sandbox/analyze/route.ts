/**
 * POST /api/sandbox/analyze
 *
 * Internal sandbox API for the public demo page.
 * Uses the real Claude analysis but with rate limiting and usage tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeTextWithClaude,
  calculateErsScore,
  getReadinessLabel,
  formatScore,
  generateReasoning,
  generateRecommendedAction,
  VALID_DIMENSIONS,
  DEFAULT_CONFIG,
  type Dimension,
  type SourceType,
  type Confidence,
} from '@/lib/text-analysis';

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting constants
const MAX_ASSESSMENTS_PER_SESSION = 5;
const MAX_ASSESSMENTS_PER_IP_PER_DAY = 20;

interface SandboxRequestBody {
  text: string;
  source_type?: string;
  session_id: string;
  email?: string;
  company?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SandboxRequestBody = await request.json();
    const { text, source_type, session_id, email, company } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'text is required', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    if (text.length < 20) {
      return NextResponse.json(
        { success: false, error: { message: 'text must be at least 20 characters', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'session_id is required', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check/create sandbox usage record
    const { data: existingUsage, error: usageError } = await supabaseAdmin
      .from('sandbox_usage')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error checking sandbox usage:', usageError);
    }

    let usageRecord = existingUsage;
    let assessmentCount = existingUsage?.assessment_count || 0;

    // Check session rate limit
    if (assessmentCount >= MAX_ASSESSMENTS_PER_SESSION) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Free assessment limit reached (${MAX_ASSESSMENTS_PER_SESSION} per session)`,
            code: 'RATE_LIMITED',
          },
        },
        { status: 429 }
      );
    }

    // Check IP rate limit (daily)
    const today = new Date().toISOString().split('T')[0];
    const { count: ipCount } = await supabaseAdmin
      .from('sandbox_usage')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', `${today}T00:00:00Z`);

    if (ipCount && ipCount >= MAX_ASSESSMENTS_PER_IP_PER_DAY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Daily limit reached for this IP address',
            code: 'RATE_LIMITED',
          },
        },
        { status: 429 }
      );
    }

    // Create or update usage record
    if (!usageRecord) {
      const { data: newUsage, error: insertError } = await supabaseAdmin
        .from('sandbox_usage')
        .insert({
          session_id,
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || null,
          email: email || null,
          company: company || null,
          assessment_count: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating sandbox usage:', insertError);
      } else {
        usageRecord = newUsage;
      }
    } else if (email || company) {
      // Update email/company if provided
      await supabaseAdmin
        .from('sandbox_usage')
        .update({
          email: email || usageRecord.email,
          company: company || usageRecord.company,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usageRecord.id);
    }

    // Analyze text with Claude
    const validSourceTypes: SourceType[] = ['journal', 'session_notes', 'chat_transcript', 'free_text'];
    const sourceType: SourceType = validSourceTypes.includes(source_type as SourceType)
      ? (source_type as SourceType)
      : 'free_text';

    const analysis = await analyzeTextWithClaude(text, sourceType);

    // Calculate ERS score
    const ersScore = calculateErsScore(analysis.dimensions);
    const readinessLabel = getReadinessLabel(ersScore);

    // Generate assessment ID
    const assessmentId = `sandbox_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    // Build dimension results with standard verbosity
    const config = { ...DEFAULT_CONFIG, verbosity: 'standard' as const };
    const dimensionResults: Record<Dimension, Record<string, unknown>> = {} as Record<Dimension, Record<string, unknown>>;

    for (const dim of VALID_DIMENSIONS) {
      const dimData = analysis.dimensions[dim];
      const formattedScore = formatScore(dimData.score, config.score_format, config.traffic_light_thresholds);

      dimensionResults[dim] = {
        score: formattedScore,
        label: getScoreLabel(dimData.score),
        confidence: dimData.confidence,
        reasoning: generateReasoning(dim, dimData.score, dimData.top_signals, dimData.confidence, config.tone),
        top_signals: dimData.top_signals,
        recommended_action: generateRecommendedAction(dim, dimData.score),
      };
    }

    // Update usage count
    if (usageRecord) {
      await supabaseAdmin
        .from('sandbox_usage')
        .update({
          assessment_count: assessmentCount + 1,
          last_assessment_at: timestamp,
          used_text_analysis: true,
          updated_at: timestamp,
        })
        .eq('id', usageRecord.id);

      // Store assessment record
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

    // Build response
    const response = {
      ers_snapshot: ersScore,
      dimensions: dimensionResults,
      readiness_label: readinessLabel,
      confidence: analysis.overall_confidence,
      assessment_id: assessmentId,
      timestamp,
      source_type: sourceType,
      text_length: text.length,
      meta: {
        verbosity: 'standard',
        tone: 'clinical',
        model_version: 'ers-text-v1',
        remaining_assessments: MAX_ASSESSMENTS_PER_SESSION - assessmentCount - 1,
      },
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Sandbox analysis error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

function getScoreLabel(score: number): string {
  if (score < 25) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}
