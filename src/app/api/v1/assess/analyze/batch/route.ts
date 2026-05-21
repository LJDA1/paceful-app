/**
 * POST /api/v1/assess/analyze/batch
 *
 * Batch analyze multiple text entries and compute:
 * - Per-entry ERS scores
 * - Composite weighted ERS (recent entries weighted higher)
 * - Trend direction and delta across the batch
 * - Dimension-level trends
 *
 * Max 20 entries per batch.
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
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';
import {
  Dimension,
  SourceType,
  Confidence,
  TrendDirection,
  PartnerConfig,
  DEFAULT_CONFIG,
  DIMENSION_WEIGHTS,
  VALID_DIMENSIONS,
  VALID_SOURCE_TYPES,
  ClaudeAnalysisResult,
  analyzeTextWithClaude,
  calculateErsScore,
  getScoreLabel,
  getReadinessLabel,
  formatScore,
  generateReasoning,
  generateRecommendedAction,
  hashText,
  mergeConfig,
} from '@/lib/text-analysis';

const MAX_BATCH_SIZE = 20;

interface BatchEntry {
  text: string;
  source_type: SourceType;
  timestamp: string;
}

interface EntryResult {
  index: number;
  timestamp: string;
  source_type: SourceType;
  text_length: number;
  ers_score: number;
  dimensions: Record<Dimension, { score: number; confidence: Confidence }>;
  confidence: Confidence;
}

interface DimensionTrend {
  start_score: number;
  end_score: number;
  delta: number;
  direction: TrendDirection;
}

// ============================================================================
// Partner Config Loading
// ============================================================================

async function loadPartnerConfig(partnerId: string): Promise<PartnerConfig> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('partner_configs')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    if (error || !data) {
      return DEFAULT_CONFIG;
    }

    return {
      verbosity: data.verbosity || DEFAULT_CONFIG.verbosity,
      tone: data.tone || DEFAULT_CONFIG.tone,
      score_format: data.score_format || DEFAULT_CONFIG.score_format,
      traffic_light_thresholds: data.traffic_light_thresholds || DEFAULT_CONFIG.traffic_light_thresholds,
      include_signals: data.include_signals ?? DEFAULT_CONFIG.include_signals,
      include_trend: data.include_trend ?? DEFAULT_CONFIG.include_trend,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ============================================================================
// Trend Calculation
// ============================================================================

function calculateTrendDirection(delta: number): TrendDirection {
  if (delta > 3) return 'improving';
  if (delta < -3) return 'declining';
  return 'stable';
}

function calculateTimeWeights(timestamps: Date[]): number[] {
  if (timestamps.length === 0) return [];
  if (timestamps.length === 1) return [1];

  // Sort by time (oldest first)
  const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
  const earliest = sorted[0].getTime();
  const latest = sorted[sorted.length - 1].getTime();
  const timeSpan = latest - earliest;

  if (timeSpan === 0) {
    // All same timestamp - equal weights
    return timestamps.map(() => 1 / timestamps.length);
  }

  // Calculate raw weights based on recency (0 to 1, recent = higher)
  const rawWeights = timestamps.map(t => {
    const position = (t.getTime() - earliest) / timeSpan;
    // Exponential weighting: recent entries count more
    return 0.5 + 0.5 * position; // Range: 0.5 (oldest) to 1.0 (newest)
  });

  // Normalize weights to sum to 1
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  return rawWeights.map(w => w / totalWeight);
}

function aggregateConfidence(confidences: Confidence[]): Confidence {
  const counts = { low: 0, medium: 0, high: 0 };
  confidences.forEach(c => counts[c]++);

  // If majority is high, return high
  if (counts.high > confidences.length / 2) return 'high';
  // If majority is low, return low
  if (counts.low > confidences.length / 2) return 'low';
  return 'medium';
}

// ============================================================================
// Main Handler
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
    return sandboxResponse('text_analyze_batch', body);
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

  // Check endpoint-specific rate limit (100/hour for analyze)
  const rateLimit = await checkEndpointRateLimit(validation.partnerId!, '/api/v1/assess/analyze');
  if (!rateLimit.allowed) {
    return partnerApiError(
      `Rate limit exceeded. Limit: ${rateLimit.limit}/hour. Retry after ${rateLimit.retryAfter} seconds.`,
      'RATE_LIMITED',
      429,
      undefined,
      rateLimit
    );
  }

  try {
    const body = await request.json();
    const { user_id, entries, config: requestConfig } = body;

    // Validate user_id
    if (!user_id || typeof user_id !== 'string') {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 400, Date.now() - startTime);
      return partnerApiError('user_id is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    // Validate entries array
    if (!entries || !Array.isArray(entries)) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 400, Date.now() - startTime);
      return partnerApiError('entries array is required', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (entries.length === 0) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 400, Date.now() - startTime);
      return partnerApiError('entries array cannot be empty', 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    if (entries.length > MAX_BATCH_SIZE) {
      await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 400, Date.now() - startTime);
      return partnerApiError(`Maximum ${MAX_BATCH_SIZE} entries per batch`, 'BAD_REQUEST', 400, undefined, rateLimit);
    }

    // Validate each entry
    const validatedEntries: BatchEntry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (!entry.text || typeof entry.text !== 'string') {
        await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 400, Date.now() - startTime);
        return partnerApiError(`Entry ${i}: text is required`, 'BAD_REQUEST', 400, undefined, rateLimit);
      }

      if (entry.text.length < 20) {
        await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 400, Date.now() - startTime);
        return partnerApiError(`Entry ${i}: text must be at least 20 characters`, 'BAD_REQUEST', 400, undefined, rateLimit);
      }

      const sourceType: SourceType = VALID_SOURCE_TYPES.includes(entry.source_type) ? entry.source_type : 'free_text';

      // Validate timestamp
      let timestamp: string;
      if (entry.timestamp) {
        const parsed = new Date(entry.timestamp);
        if (isNaN(parsed.getTime())) {
          await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 400, Date.now() - startTime);
          return partnerApiError(`Entry ${i}: invalid timestamp format`, 'BAD_REQUEST', 400, undefined, rateLimit);
        }
        timestamp = parsed.toISOString();
      } else {
        timestamp = new Date().toISOString();
      }

      validatedEntries.push({
        text: entry.text,
        source_type: sourceType,
        timestamp,
      });
    }

    // Load partner config
    const partnerConfig = await loadPartnerConfig(validation.partnerId!);
    const config = mergeConfig(partnerConfig, requestConfig);

    // Process each entry through Claude (in parallel with concurrency limit)
    const CONCURRENCY = 3;
    const entryResults: EntryResult[] = [];
    const analyses: ClaudeAnalysisResult[] = [];

    for (let i = 0; i < validatedEntries.length; i += CONCURRENCY) {
      const batch = validatedEntries.slice(i, i + CONCURRENCY);
      const batchPromises = batch.map(async (entry, batchIndex) => {
        const index = i + batchIndex;
        const analysis = await analyzeTextWithClaude(entry.text, entry.source_type);
        const ersScore = calculateErsScore(analysis.dimensions);

        return {
          index,
          analysis,
          result: {
            index,
            timestamp: entry.timestamp,
            source_type: entry.source_type,
            text_length: entry.text.length,
            ers_score: ersScore,
            dimensions: Object.fromEntries(
              VALID_DIMENSIONS.map(dim => [dim, {
                score: analysis.dimensions[dim].score,
                confidence: analysis.dimensions[dim].confidence,
              }])
            ) as Record<Dimension, { score: number; confidence: Confidence }>,
            confidence: analysis.overall_confidence,
          },
        };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(r => {
        entryResults.push(r.result);
        analyses.push(r.analysis);
      });
    }

    // Sort results by timestamp for trend calculation
    const sortedResults = [...entryResults].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate time weights
    const timestamps = sortedResults.map(r => new Date(r.timestamp));
    const weights = calculateTimeWeights(timestamps);

    // Calculate composite weighted ERS
    let compositeErs = 0;
    sortedResults.forEach((result, idx) => {
      compositeErs += result.ers_score * weights[idx];
    });
    compositeErs = Math.round(compositeErs);

    // Calculate overall trend
    const firstHalf = sortedResults.slice(0, Math.ceil(sortedResults.length / 2));
    const secondHalf = sortedResults.slice(Math.floor(sortedResults.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.ers_score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.ers_score, 0) / secondHalf.length;
    const overallDelta = Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10;
    const overallTrend = calculateTrendDirection(overallDelta);

    // Calculate dimension-level trends
    const dimensionTrends: Record<Dimension, DimensionTrend> = {} as Record<Dimension, DimensionTrend>;

    for (const dim of VALID_DIMENSIONS) {
      const firstHalfDimAvg = firstHalf.reduce((sum, r) => sum + r.dimensions[dim].score, 0) / firstHalf.length;
      const secondHalfDimAvg = secondHalf.reduce((sum, r) => sum + r.dimensions[dim].score, 0) / secondHalf.length;
      const dimDelta = Math.round((secondHalfDimAvg - firstHalfDimAvg) * 10) / 10;

      dimensionTrends[dim] = {
        start_score: Math.round(firstHalfDimAvg),
        end_score: Math.round(secondHalfDimAvg),
        delta: dimDelta,
        direction: calculateTrendDirection(dimDelta),
      };
    }

    // Calculate composite confidence
    const allConfidences = entryResults.map(r => r.confidence);
    const compositeConfidence = aggregateConfidence(allConfidences);

    // Generate assessment ID
    const assessmentId = `batch_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    // Store composite assessment in database
    const supabase = getSupabaseAdmin();
    const { error: insertError } = await supabase
      .from('batch_text_assessments')
      .insert({
        id: assessmentId.replace('batch_', '').padEnd(36, '0').substring(0, 36).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
        partner_id: validation.partnerId,
        external_user_id: user_id,
        entry_count: entries.length,
        composite_ers_score: compositeErs,
        readiness_label: getReadinessLabel(compositeErs),
        composite_confidence: compositeConfidence,
        trend_direction: overallTrend,
        trend_delta: overallDelta,
        dim_emotional_stability: dimensionTrends.emotional_stability.end_score,
        dim_self_reflection: dimensionTrends.self_reflection.end_score,
        dim_coping_capacity: dimensionTrends.coping_capacity.end_score,
        dim_behavioral_engagement: dimensionTrends.behavioral_engagement.end_score,
        dim_social_readiness: dimensionTrends.social_readiness.end_score,
        dim_es_trend: dimensionTrends.emotional_stability.direction,
        dim_sr_trend: dimensionTrends.self_reflection.direction,
        dim_cc_trend: dimensionTrends.coping_capacity.direction,
        dim_be_trend: dimensionTrends.behavioral_engagement.direction,
        dim_srd_trend: dimensionTrends.social_readiness.direction,
        earliest_entry: sortedResults[0].timestamp,
        latest_entry: sortedResults[sortedResults.length - 1].timestamp,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      });

    if (insertError) {
      console.error('Error storing batch assessment:', insertError);
      // Continue anyway - we still return the result
    }

    // Log API usage
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 200, Date.now() - startTime);

    // Build response
    const formattedCompositeErs = formatScore(compositeErs, config.score_format, config.traffic_light_thresholds);

    // Build dimension results for composite
    const compositeDimensions: Record<string, unknown> = {};
    for (const dim of VALID_DIMENSIONS) {
      const trend = dimensionTrends[dim];
      const dimConfidences = entryResults.map(r => r.dimensions[dim].confidence);
      const dimConfidence = aggregateConfidence(dimConfidences);

      const formattedScore = formatScore(trend.end_score, config.score_format, config.traffic_light_thresholds);
      const label = getScoreLabel(trend.end_score);

      if (config.verbosity === 'minimal') {
        compositeDimensions[dim] = {
          score: formattedScore,
          label,
          confidence: dimConfidence,
          trend: trend.direction,
          trend_delta: trend.delta,
        };
      } else {
        // Aggregate top signals from all entries for this dimension
        const allSignals = analyses.flatMap(a => a.dimensions[dim].top_signals);
        const uniqueSignals = [...new Set(allSignals)].slice(0, 3);

        const result: Record<string, unknown> = {
          score: formattedScore,
          label,
          confidence: dimConfidence,
          trend: trend.direction,
          trend_delta: trend.delta,
          reasoning: generateReasoning(`${dim.replace(/_/g, ' ')} is ${trend.direction} over this period.`),
          top_signals: config.include_signals ? uniqueSignals : undefined,
        };

        if (config.verbosity === 'clinical') {
          result.recommended_action = generateRecommendedAction(dim, trend.end_score);
        }

        compositeDimensions[dim] = result;
      }
    }

    // Build per-entry results (minimal format)
    const perEntryResults = entryResults.map(r => ({
      index: r.index,
      timestamp: r.timestamp,
      source_type: r.source_type,
      text_length: r.text_length,
      ers_score: formatScore(r.ers_score, config.score_format, config.traffic_light_thresholds),
      confidence: r.confidence,
    }));

    const response: Record<string, unknown> = {
      composite: {
        ers_score: formattedCompositeErs,
        readiness_label: getReadinessLabel(compositeErs),
        confidence: compositeConfidence,
        dimensions: compositeDimensions,
      },
      trend: {
        direction: overallTrend,
        delta: overallDelta,
        entries_analyzed: entries.length,
        time_span: {
          earliest: sortedResults[0].timestamp,
          latest: sortedResults[sortedResults.length - 1].timestamp,
        },
      },
      entries: perEntryResults,
      assessment_id: assessmentId,
      timestamp,
    };

    // Add meta block for non-minimal responses
    if (config.verbosity !== 'minimal') {
      response.meta = {
        verbosity: config.verbosity,
        tone: config.tone,
        score_format: config.score_format,
        api_version: '1.3.0',
        model_version: 'ers-text-batch-v1',
        weighting_method: 'time_exponential',
      };
    }

    return partnerApiSuccess(response, 200, undefined, rateLimit);
  } catch (error) {
    console.error('Batch text analysis error:', error);
    await logPartnerApiUsage(validation.partnerId!, '/api/v1/assess/analyze/batch', 'POST', 500, Date.now() - startTime);
    return partnerApiError('Internal server error', 'INTERNAL_ERROR', 500, undefined, rateLimit);
  }
}
