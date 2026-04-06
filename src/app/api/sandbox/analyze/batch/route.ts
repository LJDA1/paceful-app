/**
 * POST /api/sandbox/analyze/batch
 *
 * Internal sandbox API for batch analysis on the public demo page.
 * Analyzes multiple text entries and returns composite scores with trends.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeTextWithClaude,
  calculateErsScore,
  getReadinessLabel,
  formatScore,
  generateReasoning,
  VALID_DIMENSIONS,
  DEFAULT_CONFIG,
  type Dimension,
  type SourceType,
  type Confidence,
  type TrendDirection,
} from '@/lib/text-analysis';

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting constants
const MAX_ASSESSMENTS_PER_SESSION = 5;
const MAX_ENTRIES_PER_BATCH = 20;

interface BatchEntry {
  user_id: string;
  text: string;
  source_type?: string;
  timestamp?: string;
}

interface SandboxBatchRequestBody {
  entries: BatchEntry[];
  session_id: string;
  email?: string;
  company?: string;
}

interface EntryResult {
  user_id: string;
  ers_score: number;
  readiness_label: string;
  confidence: Confidence;
  dimensions: Record<Dimension, { score: number; confidence: Confidence }>;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SandboxBatchRequestBody = await request.json();
    const { entries, session_id, email, company } = body;

    // Validate entries
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'entries array is required', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    if (entries.length > MAX_ENTRIES_PER_BATCH) {
      return NextResponse.json(
        { success: false, error: { message: `Maximum ${MAX_ENTRIES_PER_BATCH} entries allowed`, code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    // Validate each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.user_id || !entry.text) {
        return NextResponse.json(
          { success: false, error: { message: `Entry ${i + 1} missing user_id or text`, code: 'BAD_REQUEST' } },
          { status: 400 }
        );
      }
      if (entry.text.length < 20) {
        return NextResponse.json(
          { success: false, error: { message: `Entry ${i + 1} text must be at least 20 characters`, code: 'BAD_REQUEST' } },
          { status: 400 }
        );
      }
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
      await supabaseAdmin
        .from('sandbox_usage')
        .update({
          email: email || usageRecord.email,
          company: company || usageRecord.company,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usageRecord.id);
    }

    // Analyze each entry
    const entryResults: EntryResult[] = [];
    const validSourceTypes: SourceType[] = ['journal', 'session_notes', 'chat_transcript', 'free_text'];

    for (const entry of entries) {
      const sourceType: SourceType = validSourceTypes.includes(entry.source_type as SourceType)
        ? (entry.source_type as SourceType)
        : 'free_text';

      try {
        const analysis = await analyzeTextWithClaude(entry.text, sourceType);
        const ersScore = calculateErsScore(analysis.dimensions);
        const readinessLabel = getReadinessLabel(ersScore);

        entryResults.push({
          user_id: entry.user_id,
          ers_score: ersScore,
          readiness_label: readinessLabel,
          confidence: analysis.overall_confidence,
          dimensions: {
            emotional_stability: {
              score: analysis.dimensions.emotional_stability.score,
              confidence: analysis.dimensions.emotional_stability.confidence,
            },
            self_reflection: {
              score: analysis.dimensions.self_reflection.score,
              confidence: analysis.dimensions.self_reflection.confidence,
            },
            coping_capacity: {
              score: analysis.dimensions.coping_capacity.score,
              confidence: analysis.dimensions.coping_capacity.confidence,
            },
            behavioral_engagement: {
              score: analysis.dimensions.behavioral_engagement.score,
              confidence: analysis.dimensions.behavioral_engagement.confidence,
            },
            social_readiness: {
              score: analysis.dimensions.social_readiness.score,
              confidence: analysis.dimensions.social_readiness.confidence,
            },
          },
          timestamp: entry.timestamp,
        });
      } catch (error) {
        console.error(`Error analyzing entry for user ${entry.user_id}:`, error);
        // Use fallback scores for failed entries
        entryResults.push({
          user_id: entry.user_id,
          ers_score: 50,
          readiness_label: 'Healing',
          confidence: 'low',
          dimensions: {
            emotional_stability: { score: 50, confidence: 'low' },
            self_reflection: { score: 50, confidence: 'low' },
            coping_capacity: { score: 50, confidence: 'low' },
            behavioral_engagement: { score: 50, confidence: 'low' },
            social_readiness: { score: 50, confidence: 'low' },
          },
          timestamp: entry.timestamp,
        });
      }
    }

    // Calculate composite scores with time weighting
    const sortedResults = [...entryResults].sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Time-weighted composite calculation
    const totalEntries = sortedResults.length;
    let weightedSum = 0;
    let totalWeight = 0;
    const dimensionWeightedSums: Record<Dimension, number> = {
      emotional_stability: 0,
      self_reflection: 0,
      coping_capacity: 0,
      behavioral_engagement: 0,
      social_readiness: 0,
    };

    sortedResults.forEach((result, index) => {
      // More recent entries get higher weight (1.0 to 2.0)
      const recencyWeight = 1 + (index / (totalEntries - 1 || 1));
      weightedSum += result.ers_score * recencyWeight;
      totalWeight += recencyWeight;

      for (const dim of VALID_DIMENSIONS) {
        dimensionWeightedSums[dim] += result.dimensions[dim].score * recencyWeight;
      }
    });

    const compositeScore = Math.round(weightedSum / totalWeight);
    const compositeReadinessLabel = getReadinessLabel(compositeScore);

    // Calculate dimension composites
    const compositeDimensions: Record<Dimension, {
      score: number;
      label: string;
      confidence: Confidence;
      reasoning: string;
      trend?: TrendDirection;
    }> = {} as Record<Dimension, {
      score: number;
      label: string;
      confidence: Confidence;
      reasoning: string;
      trend?: TrendDirection;
    }>;

    for (const dim of VALID_DIMENSIONS) {
      const dimScore = Math.round(dimensionWeightedSums[dim] / totalWeight);
      const confidences = entryResults.map(r => r.dimensions[dim].confidence);
      const avgConfidence = calculateAverageConfidence(confidences);

      // Calculate trend for dimension
      let trend: TrendDirection = 'stable';
      if (sortedResults.length >= 2) {
        const firstHalf = sortedResults.slice(0, Math.floor(sortedResults.length / 2));
        const secondHalf = sortedResults.slice(Math.floor(sortedResults.length / 2));
        const firstAvg = firstHalf.reduce((sum, r) => sum + r.dimensions[dim].score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, r) => sum + r.dimensions[dim].score, 0) / secondHalf.length;
        const delta = secondAvg - firstAvg;
        if (delta > 5) trend = 'improving';
        else if (delta < -5) trend = 'declining';
      }

      compositeDimensions[dim] = {
        score: dimScore,
        label: getScoreLabel(dimScore),
        confidence: avgConfidence,
        reasoning: generateReasoning(dim, dimScore, ['batch analysis'], avgConfidence, 'clinical'),
        trend,
      };
    }

    // Calculate overall trend
    let overallTrend: TrendDirection = 'stable';
    let trendDelta = 0;
    if (sortedResults.length >= 2) {
      const firstHalf = sortedResults.slice(0, Math.floor(sortedResults.length / 2));
      const secondHalf = sortedResults.slice(Math.floor(sortedResults.length / 2));
      const firstAvg = firstHalf.reduce((sum, r) => sum + r.ers_score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + r.ers_score, 0) / secondHalf.length;
      trendDelta = secondAvg - firstAvg;
      if (trendDelta > 5) overallTrend = 'improving';
      else if (trendDelta < -5) overallTrend = 'declining';
    }

    // Calculate composite confidence
    const allConfidences = entryResults.map(r => r.confidence);
    const compositeConfidence = calculateAverageConfidence(allConfidences);

    // Generate assessment ID
    const assessmentId = `sandbox_batch_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    // Update usage count
    if (usageRecord) {
      await supabaseAdmin
        .from('sandbox_usage')
        .update({
          assessment_count: assessmentCount + 1,
          last_assessment_at: timestamp,
          used_batch_analysis: true,
          updated_at: timestamp,
        })
        .eq('id', usageRecord.id);

      // Store assessment record
      await supabaseAdmin.from('sandbox_assessments').insert({
        sandbox_usage_id: usageRecord.id,
        assessment_type: 'batch',
        ers_score: compositeScore,
        readiness_label: compositeReadinessLabel,
        confidence: compositeConfidence,
        dim_emotional_stability: compositeDimensions.emotional_stability.score,
        dim_self_reflection: compositeDimensions.self_reflection.score,
        dim_coping_capacity: compositeDimensions.coping_capacity.score,
        dim_behavioral_engagement: compositeDimensions.behavioral_engagement.score,
        dim_social_readiness: compositeDimensions.social_readiness.score,
        entry_count: entryResults.length,
        trend_direction: overallTrend,
      });
    }

    // Build response
    const response = {
      composite_ers_score: compositeScore,
      readiness_label: compositeReadinessLabel,
      composite_confidence: compositeConfidence,
      trend: {
        direction: overallTrend,
        delta: Math.round(trendDelta * 100) / 100,
      },
      dimensions: compositeDimensions,
      entries: entryResults.map(r => ({
        user_id: r.user_id,
        ers_score: r.ers_score,
        readiness_label: r.readiness_label,
        confidence: r.confidence,
      })),
      entry_count: entryResults.length,
      assessment_id: assessmentId,
      timestamp,
      meta: {
        verbosity: 'standard',
        tone: 'clinical',
        model_version: 'ers-text-v1',
        remaining_assessments: MAX_ASSESSMENTS_PER_SESSION - assessmentCount - 1,
      },
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Sandbox batch analysis error:', error);
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

function calculateAverageConfidence(confidences: Confidence[]): Confidence {
  const values = { low: 1, medium: 2, high: 3 };
  const avg = confidences.reduce((sum, c) => sum + values[c], 0) / confidences.length;
  if (avg < 1.5) return 'low';
  if (avg < 2.5) return 'medium';
  return 'high';
}
