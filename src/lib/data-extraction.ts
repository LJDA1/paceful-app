import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type SourceType =
  | 'journal_sentiment'
  | 'journal_reflection'
  | 'chat'
  | 'mood_insight'
  | 'exercise_outcome';

export type InsightType =
  | 'emotional_theme'
  | 'trigger_correlation'
  | 'coping_mechanism'
  | 'recovery_phase'
  | 'behavioral_pattern'
  | 'risk_indicator';

interface EmotionalThemeContent {
  theme: string;
  intensity: number;
  direction: 'increasing' | 'stable' | 'decreasing';
}

interface TriggerCorrelationContent {
  trigger: string;
  effect: 'positive' | 'negative' | 'neutral';
  mood_impact: number;
}

interface CopingMechanismContent {
  mechanism: string;
  effectiveness: 'high' | 'medium' | 'low';
  context: string;
}

interface RecoveryPhaseContent {
  phase: 'denial' | 'bargaining' | 'anger' | 'depression' | 'acceptance' | 'growth';
  confidence: number;
}

interface BehavioralPatternContent {
  pattern: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'sporadic';
  significance: number;
}

interface RiskIndicatorContent {
  indicator: string;
  severity: 'low' | 'moderate' | 'high';
  trend: 'worsening' | 'stable' | 'improving';
}

type InsightContent =
  | EmotionalThemeContent
  | TriggerCorrelationContent
  | CopingMechanismContent
  | RecoveryPhaseContent
  | BehavioralPatternContent
  | RiskIndicatorContent;

interface ExtractedInsight {
  insight_type: InsightType;
  content: InsightContent;
  confidence: number;
}

interface ExtractionContext {
  moodScore?: number;
  ersScore?: number;
  ersStage?: string;
  daysSinceBreakup?: number;
}

// ============================================================================
// Constants
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction engine for an emotional recovery platform. Given user-generated text and context, extract structured insights.

Respond with ONLY a JSON array. Each item:
{
  "insight_type": "emotional_theme|trigger_correlation|coping_mechanism|recovery_phase|behavioral_pattern|risk_indicator",
  "content": {
    // For emotional_theme: { "theme": "anger", "intensity": 0.7, "direction": "increasing|stable|decreasing" }
    // For trigger_correlation: { "trigger": "social media", "effect": "positive|negative|neutral", "mood_impact": -1.5 }
    // For coping_mechanism: { "mechanism": "journaling", "effectiveness": "high|medium|low", "context": "when anxious" }
    // For recovery_phase: { "phase": "denial|bargaining|anger|depression|acceptance|growth", "confidence": 0.8 }
    // For behavioral_pattern: { "pattern": "mood dips on weekends", "frequency": "daily|weekly|monthly|sporadic", "significance": 0.7 }
    // For risk_indicator: { "indicator": "isolation increasing", "severity": "low|moderate|high", "trend": "worsening|stable|improving" }
  },
  "confidence": 0.0-1.0
}

Rules:
- Only extract what's clearly supported by the text
- Set confidence based on how explicit the evidence is
- Return empty array [] if nothing meaningful to extract
- Never fabricate insights not supported by text
- Max 5 insights per extraction
- For risk_indicator, only flag genuine concerns (self-harm mentions, severe isolation, substance abuse mentions)`;

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract structured insights from user-generated text.
 * This is designed to be called fire-and-forget - it never blocks the user.
 */
export async function extractStructuredData(
  userId: string,
  sourceType: SourceType,
  rawText: string,
  context: ExtractionContext,
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Skip extraction for very short text
    if (!rawText || rawText.trim().length < 30) {
      return;
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build context string for the prompt
    const contextParts: string[] = [];
    if (context.moodScore !== undefined) {
      contextParts.push(`Current mood: ${context.moodScore}/10`);
    }
    if (context.ersScore !== undefined) {
      contextParts.push(`ERS score: ${context.ersScore}`);
    }
    if (context.ersStage) {
      contextParts.push(`Recovery stage: ${context.ersStage}`);
    }
    if (context.daysSinceBreakup !== undefined) {
      contextParts.push(`Days since breakup: ${context.daysSinceBreakup}`);
    }

    const contextString = contextParts.length > 0
      ? `\n\nUser context:\n${contextParts.join('\n')}`
      : '';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Text to analyze (source: ${sourceType}):\n"${rawText}"${contextString}\n\nExtract insights as JSON array:`,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return;
    }

    // Parse JSON response
    const jsonText = textContent.text.trim();

    // Handle empty array case
    if (jsonText === '[]') {
      return;
    }

    // Try to extract JSON from response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return;
    }

    // Validate and insert insights
    const validInsights: ExtractedInsight[] = [];
    const validTypes: InsightType[] = [
      'emotional_theme',
      'trigger_correlation',
      'coping_mechanism',
      'recovery_phase',
      'behavioral_pattern',
      'risk_indicator',
    ];

    for (const item of parsed) {
      // Validate structure
      if (
        typeof item !== 'object' ||
        !item.insight_type ||
        !item.content ||
        typeof item.confidence !== 'number'
      ) {
        continue;
      }

      // Validate insight type
      if (!validTypes.includes(item.insight_type as InsightType)) {
        continue;
      }

      // Validate confidence range
      const confidence = Math.max(0, Math.min(1, item.confidence));

      // Skip low confidence insights
      if (confidence < 0.3) {
        continue;
      }

      validInsights.push({
        insight_type: item.insight_type as InsightType,
        content: item.content,
        confidence,
      });
    }

    // Insert insights into database
    if (validInsights.length > 0) {
      const insightsToInsert = validInsights.map(insight => ({
        user_id: userId,
        source_type: sourceType,
        insight_type: insight.insight_type,
        content: insight.content,
        confidence: insight.confidence,
      }));

      const { error } = await supabase
        .from('extracted_insights')
        .insert(insightsToInsert);

      if (error) {
        console.error('Error inserting insights:', error);
      }
    }
  } catch (error) {
    // Silent failure - never block user experience
    console.error('Data extraction error:', error);
  }
}

/**
 * Fire-and-forget wrapper for extraction
 * Use this in API routes to ensure extraction never blocks
 */
export function extractStructuredDataAsync(
  userId: string,
  sourceType: SourceType,
  rawText: string,
  context: ExtractionContext,
  supabase: SupabaseClient
): void {
  // Fire and forget - don't await
  extractStructuredData(userId, sourceType, rawText, context, supabase).catch(() => {
    // Silently ignore errors
  });
}
