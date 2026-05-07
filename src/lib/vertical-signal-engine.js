/**
 * Paceful Vertical Signal Engine
 *
 * Config-driven architecture: add a new vertical by dropping a signals.config.json
 * into the vertical directory. No new routes needed.
 *
 * This engine works alongside the existing ERS scoring system.
 * ERS provides the five-dimension emotional readiness score.
 * The vertical engine layers domain-specific risk signals on top.
 */

// ============================================================
// TYPES
// ============================================================

/**
 * @typedef {Object} SignalResult
 * @property {string} id - Signal ID (e.g., "INS-001")
 * @property {string} name - Signal name
 * @property {string} display_name - Human-readable name
 * @property {number} score - 0-1 score
 * @property {string} severity - low | medium | high | critical
 * @property {string} severity_label - Human-readable severity label
 * @property {string} recommended_action - What the operator should do
 * @property {string[]} matched_indicators - Which specific indicators were detected
 * @property {number} confidence - 0-1 confidence in this signal score
 */

/**
 * @typedef {Object} VerticalAnalysisResult
 * @property {string} vertical - Vertical identifier
 * @property {string} version - Config version
 * @property {string} analysis_id - Unique analysis ID
 * @property {number} timestamp - Unix timestamp
 * @property {Object} input_metadata - Info about the analyzed text
 * @property {SignalResult[]} signals - Individual signal scores
 * @property {Object} composite_scores - Aggregated scores
 * @property {Object} ers_scores - Standard ERS dimension scores
 * @property {Object} recommended_actions - Priority-sorted action list
 */

// ============================================================
// CONFIG LOADER
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class VerticalConfigLoader {
  constructor(configDir) {
    this.configDir = configDir;
    this.configs = new Map();
    this.loadAll();
  }

  loadAll() {
    const verticals = fs.readdirSync(this.configDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const vertical of verticals) {
      const configPath = path.join(this.configDir, vertical, 'signals.config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          this.configs.set(config.vertical, config);
          console.log(`[VerticalEngine] Loaded config: ${config.vertical} v${config.version} (${config.signals.length} signals)`);
        } catch (err) {
          console.error(`[VerticalEngine] Failed to load config for ${vertical}:`, err.message);
        }
      }
    }
  }

  get(vertical) {
    return this.configs.get(vertical);
  }

  list() {
    return Array.from(this.configs.keys());
  }

  getSignalById(vertical, signalId) {
    const config = this.configs.get(vertical);
    if (!config) return null;
    return config.signals.find(s => s.id === signalId);
  }
}

// ============================================================
// TEXT ANALYZER
// ============================================================

class TextAnalyzer {
  /**
   * Analyze text for linguistic marker matches
   * Returns a map of signal IDs to matched indicators and raw scores
   */
  static analyzeMarkers(text, signals) {
    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);
    const wordCount = words.length;
    const results = {};

    for (const signal of signals) {
      const matched = [];
      let matchScore = 0;

      // Check all indicator categories (linguistic_markers, help_seeking_markers, threat_markers)
      const allMarkerSets = [];

      if (signal.indicators.linguistic_markers) {
        allMarkerSets.push({ type: 'linguistic', markers: signal.indicators.linguistic_markers });
      }
      if (signal.indicators.help_seeking_markers) {
        allMarkerSets.push({ type: 'help_seeking', markers: signal.indicators.help_seeking_markers, inverse: true });
      }
      if (signal.indicators.threat_markers) {
        allMarkerSets.push({ type: 'threat', markers: signal.indicators.threat_markers });
      }

      for (const markerSet of allMarkerSets) {
        for (const marker of markerSet.markers) {
          if (normalizedText.includes(marker.toLowerCase())) {
            matched.push(marker);
            // Multi-word markers are stronger signals
            const markerWords = marker.split(/\s+/).length;
            const weight = markerWords > 2 ? 0.35 : markerWords > 1 ? 0.25 : 0.15;

            if (markerSet.inverse) {
              matchScore -= weight; // Help-seeking reduces the score
            } else {
              matchScore += weight;
            }
          }
        }
      }

      // Behavioral pattern analysis
      const behavioralScore = TextAnalyzer.analyzeBehavioralPatterns(
        text,
        normalizedText,
        words,
        signal.indicators.behavioral_patterns || []
      );

      // Combine linguistic and behavioral scores
      // Use weighted combination: linguistic is primary, behavioral amplifies
      // If no behavioral patterns matched, linguistic score stands on its own
      const linguisticCapped = Math.min(1, matchScore);
      const rawScore = Math.min(1, Math.max(0,
        behavioralScore > 0
          ? (linguisticCapped * 0.6 + behavioralScore * 0.4) + (linguisticCapped * behavioralScore * 0.3)
          : linguisticCapped
      ));

      results[signal.id] = {
        matchedIndicators: matched,
        rawScore,
        linguisticScore: Math.min(1, Math.max(0, matchScore)),
        behavioralScore,
        confidence: TextAnalyzer.calculateConfidence(matched.length, wordCount, behavioralScore)
      };
    }

    return results;
  }

  /**
   * Analyze behavioral patterns in text
   */
  static analyzeBehavioralPatterns(originalText, normalizedText, words, patterns) {
    let score = 0;

    for (const pattern of patterns) {
      switch (pattern) {
        // Formatting-based patterns
        case 'uppercase_usage_increase':
        case 'capitalization_patterns': {
          const upperWords = originalText.split(/\s+/).filter(w => w === w.toUpperCase() && w.length > 1);
          const upperRatio = upperWords.length / Math.max(words.length, 1);
          if (upperRatio > 0.3) score += 0.3;
          else if (upperRatio > 0.15) score += 0.15;
          break;
        }

        case 'exclamation_mark_density':
        case 'punctuation_intensity': {
          const exclamations = (originalText.match(/!/g) || []).length;
          const questionMarks = (originalText.match(/\?{2,}/g) || []).length;
          const density = (exclamations + questionMarks) / Math.max(words.length, 1);
          if (density > 0.15) score += 0.3;
          else if (density > 0.08) score += 0.15;
          break;
        }

        case 'sentence_shortening':
        case 'shortening_response_length': {
          const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const avgLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / Math.max(sentences.length, 1);
          if (avgLength < 5) score += 0.2;
          break;
        }

        case 'profanity_presence': {
          const profanityPatterns = /\b(damn|hell|shit|fuck|crap|ass|bastard|wtf|bs|bloody)\b/i;
          if (profanityPatterns.test(originalText)) score += 0.25;
          break;
        }

        // Content-based patterns
        case 'formal_language_shift': {
          const formalMarkers = ['hereby', 'pursuant', 'aforementioned', 'herein', 'therein', 'whereas', 'notwithstanding'];
          const formalCount = formalMarkers.filter(m => normalizedText.includes(m)).length;
          if (formalCount >= 2) score += 0.3;
          else if (formalCount >= 1) score += 0.15;
          break;
        }

        case 'citing_policy_numbers':
        case 'referencing_regulations': {
          const policyPattern = /\b(policy|claim|case|reference|ticket)\s*#?\s*\d+/i;
          const regPattern = /\b(section|article|regulation|statute|code)\s+\d+/i;
          if (policyPattern.test(originalText)) score += 0.15;
          if (regPattern.test(originalText)) score += 0.2;
          break;
        }

        case 'requesting_written_confirmation': {
          const writtenPatterns = ['in writing', 'written confirmation', 'put that in writing', 'email confirmation', 'written response'];
          if (writtenPatterns.some(p => normalizedText.includes(p))) score += 0.2;
          break;
        }

        case 'ultimatum_frequency': {
          const ultimatumPatterns = ['or else', 'or i will', 'unless you', 'if you don\'t', 'last chance', 'final opportunity'];
          const count = ultimatumPatterns.filter(p => normalizedText.includes(p)).length;
          if (count >= 2) score += 0.35;
          else if (count >= 1) score += 0.2;
          break;
        }

        case 'repeated_questions_on_same_topic':
        case 'repeated_distress_expressions': {
          // Detect repeated phrases (simple n-gram repetition check)
          const trigrams = [];
          for (let i = 0; i < words.length - 2; i++) {
            trigrams.push(words.slice(i, i + 3).join(' '));
          }
          const trigramSet = new Set(trigrams);
          const repetitionRatio = 1 - (trigramSet.size / Math.max(trigrams.length, 1));
          if (repetitionRatio > 0.3) score += 0.2;
          break;
        }

        case 'emotional_vocabulary_density': {
          const emotionWords = ['feel', 'feeling', 'felt', 'hurt', 'pain', 'suffer', 'scared', 'afraid', 'worried', 'anxious', 'stressed', 'upset', 'sad', 'angry', 'frustrated', 'overwhelmed', 'hopeless', 'helpless', 'desperate', 'terrified'];
          const emotionCount = words.filter(w => emotionWords.includes(w)).length;
          const density = emotionCount / Math.max(words.length, 1);
          if (density > 0.1) score += 0.3;
          else if (density > 0.05) score += 0.15;
          break;
        }

        case 'urgency_language_density': {
          const urgencyWords = ['now', 'immediately', 'urgent', 'asap', 'today', 'right away', 'quickly', 'hurry'];
          const urgencyCount = urgencyWords.filter(u => normalizedText.includes(u)).length;
          if (urgencyCount >= 3) score += 0.3;
          else if (urgencyCount >= 1) score += 0.1;
          break;
        }

        case 'cooperative_language_decline':
        case 'decreasing_cooperative_language': {
          const coopMarkers = ['please', 'thank', 'appreciate', 'understand', 'i see', 'makes sense'];
          const hasCoopLanguage = coopMarkers.some(m => normalizedText.includes(m));
          if (!hasCoopLanguage && words.length > 20) score += 0.15;
          break;
        }

        case 'specific_outcome_requests':
        case 'demanding_specific_outcomes': {
          const demandPatterns = ['i want', 'i need', 'i expect', 'i require', 'you must', 'you need to'];
          const count = demandPatterns.filter(p => normalizedText.includes(p)).length;
          if (count >= 2) score += 0.25;
          else if (count >= 1) score += 0.1;
          break;
        }

        // Default: skip unrecognized patterns (they may need multi-message analysis)
        default:
          break;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Calculate confidence based on evidence quantity and text length
   */
  static calculateConfidence(matchCount, wordCount, behavioralScore) {
    // More matches + more text = higher confidence
    const matchConfidence = Math.min(1, matchCount * 0.2);
    const textConfidence = Math.min(1, wordCount / 50); // Confident with 50+ words
    const behavioralConfidence = behavioralScore > 0 ? 0.3 : 0;

    return Math.min(1, (matchConfidence + textConfidence + behavioralConfidence) / 2);
  }
}

// ============================================================
// SIGNAL SCORER
// ============================================================

class SignalScorer {
  /**
   * Convert raw analysis results into scored signals with severity levels
   */
  static scoreSignals(analysisResults, signals) {
    const scoredSignals = [];

    for (const signal of signals) {
      const analysis = analysisResults[signal.id];
      if (!analysis) continue;

      const score = analysis.rawScore;
      const severity = SignalScorer.getSeverity(score, signal.severity_levels);

      scoredSignals.push({
        id: signal.id,
        name: signal.name,
        display_name: signal.display_name,
        category: signal.category,
        score: Math.round(score * 1000) / 1000,
        severity: severity.level,
        severity_label: severity.label,
        recommended_action: severity.action,
        matched_indicators: analysis.matchedIndicators,
        confidence: Math.round(analysis.confidence * 1000) / 1000,
        weight: signal.weight
      });
    }

    return scoredSignals;
  }

  /**
   * Determine severity level from score
   */
  static getSeverity(score, severityLevels) {
    for (const [level, config] of Object.entries(severityLevels)) {
      if (score >= config.range[0] && score < config.range[1]) {
        return { level, label: config.label, action: config.action };
      }
    }
    // If score is exactly 1.0, return the highest severity
    const levels = Object.entries(severityLevels);
    const highest = levels[levels.length - 1];
    return { level: highest[0], label: highest[1].label, action: highest[1].action };
  }

  /**
   * Calculate composite scores from individual signals
   */
  static calculateCompositeScores(scoredSignals, compositeConfig) {
    const composites = {};

    for (const [name, config] of Object.entries(compositeConfig)) {
      let relevantSignals;

      if (config.signals) {
        // Specific signal subset
        relevantSignals = scoredSignals.filter(s => config.signals.includes(s.id));
      } else {
        // All signals
        relevantSignals = scoredSignals;
      }

      if (relevantSignals.length === 0) {
        composites[name] = { score: 0, severity: 'low', description: config.description };
        continue;
      }

      let score;
      switch (config.calculation) {
        case 'weighted_average': {
          const totalWeight = relevantSignals.reduce((sum, s) => sum + s.weight, 0);
          score = relevantSignals.reduce((sum, s) => sum + (s.score * s.weight), 0) / Math.max(totalWeight, 0.01);
          break;
        }
        case 'max_weighted': {
          // Highest individual signal score, weighted by confidence
          score = Math.max(...relevantSignals.map(s => s.score * Math.max(s.confidence, 0.5)));
          break;
        }
        case 'average': {
          score = relevantSignals.reduce((sum, s) => sum + s.score, 0) / relevantSignals.length;
          break;
        }
        default:
          score = relevantSignals.reduce((sum, s) => sum + s.score, 0) / relevantSignals.length;
      }

      score = Math.round(Math.min(1, score) * 1000) / 1000;

      // Determine severity from thresholds
      let severity = 'low';
      if (config.thresholds) {
        for (const [level, range] of Object.entries(config.thresholds)) {
          if (score >= range[0] && score < range[1]) {
            severity = level;
            break;
          }
        }
        if (score >= 1.0) severity = Object.keys(config.thresholds).pop();
      }

      composites[name] = {
        score,
        severity,
        description: config.description,
        contributing_signals: relevantSignals.map(s => ({
          id: s.id,
          name: s.display_name,
          score: s.score,
          severity: s.severity
        }))
      };
    }

    return composites;
  }
}

// ============================================================
// MAIN ENGINE
// ============================================================

class VerticalSignalEngine {
  constructor(configDir) {
    this.configLoader = new VerticalConfigLoader(configDir);
  }

  /**
   * List available verticals
   */
  listVerticals() {
    return this.configLoader.list().map(v => {
      const config = this.configLoader.get(v);
      return {
        vertical: v,
        display_name: config.display_name,
        description: config.description,
        signal_count: config.signals.length,
        version: config.version
      };
    });
  }

  /**
   * Analyze text against a specific vertical's signals
   *
   * @param {string} vertical - Vertical identifier (e.g., "insurance", "cx")
   * @param {string} text - The unstructured text to analyze
   * @param {Object} options - Analysis options
   * @param {string} options.verbosity - "minimal" | "standard" | "detailed"
   * @param {Object} options.ers_scores - Pre-computed ERS dimension scores (from existing Paceful ERS engine)
   * @param {string} options.context - Additional context (e.g., "claims_call", "support_ticket")
   * @returns {VerticalAnalysisResult}
   */
  analyze(vertical, text, options = {}) {
    const config = this.configLoader.get(vertical);
    if (!config) {
      throw new Error(`Unknown vertical: ${vertical}. Available: ${this.configLoader.list().join(', ')}`);
    }

    const {
      verbosity = 'standard',
      ers_scores = null,
      context = null
    } = options;

    // Generate analysis ID
    const analysisId = `${vertical}_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = Date.now();

    // Hash the input text (never store raw text)
    const textHash = crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);

    // Run marker analysis
    const analysisResults = TextAnalyzer.analyzeMarkers(text, config.signals);

    // Score signals
    const scoredSignals = SignalScorer.scoreSignals(analysisResults, config.signals);

    // Calculate composite scores
    const compositeScores = SignalScorer.calculateCompositeScores(scoredSignals, config.composite_scores);

    // Build recommended actions (priority sorted)
    const recommendedActions = this.buildRecommendedActions(scoredSignals);

    // Build response based on verbosity
    const response = {
      analysis_id: analysisId,
      vertical: config.vertical,
      version: config.version,
      timestamp,
      input_metadata: {
        text_hash: textHash,
        word_count: text.split(/\s+/).length,
        character_count: text.length,
        context: context
      },
      composite_scores: compositeScores
    };

    if (verbosity === 'minimal') {
      // Only composite scores and top action
      response.top_action = recommendedActions[0] || null;
    } else if (verbosity === 'standard') {
      // Add signal summaries and all actions
      response.signals = scoredSignals.map(s => ({
        id: s.id,
        name: s.display_name,
        score: s.score,
        severity: s.severity,
        severity_label: s.severity_label,
        recommended_action: s.recommended_action
      }));
      response.recommended_actions = recommendedActions;
    } else if (verbosity === 'detailed') {
      // Full detail including matched indicators
      response.signals = scoredSignals;
      response.recommended_actions = recommendedActions;
    }

    // Include ERS scores if provided
    if (ers_scores) {
      response.ers_dimensions = ers_scores;
    }

    return response;
  }

  /**
   * Build priority-sorted action list from signal scores
   */
  buildRecommendedActions(scoredSignals) {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return scoredSignals
      .filter(s => s.severity !== 'low')
      .sort((a, b) => {
        const priorityDiff = priorityOrder[a.severity] - priorityOrder[b.severity];
        if (priorityDiff !== 0) return priorityDiff;
        return b.score - a.score;
      })
      .map(s => ({
        priority: s.severity,
        signal: s.display_name,
        signal_id: s.id,
        action: s.recommended_action,
        score: s.score,
        confidence: s.confidence
      }));
  }

  /**
   * Get signal catalog for a vertical (for partner documentation)
   */
  getSignalCatalog(vertical) {
    const config = this.configLoader.get(vertical);
    if (!config) return null;

    return {
      vertical: config.vertical,
      display_name: config.display_name,
      description: config.description,
      version: config.version,
      ers_dimensions: config.ers_dimensions,
      signals: config.signals.map(s => ({
        id: s.id,
        name: s.display_name,
        category: s.category,
        description: s.description,
        severity_levels: Object.entries(s.severity_levels).map(([level, cfg]) => ({
          level,
          label: cfg.label,
          action: cfg.action
        }))
      })),
      composite_scores: Object.entries(config.composite_scores).map(([name, cfg]) => ({
        name,
        description: cfg.description
      }))
    };
  }
}

// ============================================================
// API ROUTE HANDLER (Next.js compatible)
// ============================================================

/**
 * Next.js API route handler for vertical signal analysis
 * Mount at: /api/v1/analyze/[vertical]
 *
 * Usage in your Next.js app:
 *
 * // pages/api/v1/analyze/[vertical].js
 * import { createVerticalHandler } from '@/lib/vertical-signal-engine';
 * export default createVerticalHandler();
 */
function createVerticalHandler(configDir = './config/verticals') {
  const engine = new VerticalSignalEngine(configDir);

  return async function handler(req, res) {
    // Only POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth check (uses existing X-API-Key header pattern)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    // TODO: Validate API key against partner database
    // const partner = await validateApiKey(apiKey);
    // if (!partner) return res.status(401).json({ error: 'Invalid API key' });

    const { vertical } = req.query;
    const { text, verbosity, context, ers_scores } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field' });
    }

    if (text.length > 50000) {
      return res.status(400).json({ error: 'Text exceeds maximum length of 50,000 characters' });
    }

    try {
      const result = engine.analyze(vertical, text, {
        verbosity: verbosity || 'standard',
        context,
        ers_scores
      });

      return res.status(200).json(result);
    } catch (err) {
      if (err.message.includes('Unknown vertical')) {
        return res.status(400).json({
          error: err.message,
          available_verticals: engine.listVerticals()
        });
      }
      console.error('[VerticalEngine] Analysis error:', err);
      return res.status(500).json({ error: 'Internal analysis error' });
    }
  };
}

/**
 * Catalog endpoint handler
 * Mount at: /api/v1/signals/[vertical]
 */
function createCatalogHandler(configDir = './config/verticals') {
  const engine = new VerticalSignalEngine(configDir);

  return async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { vertical } = req.query;

    if (vertical === 'list' || !vertical) {
      return res.status(200).json({ verticals: engine.listVerticals() });
    }

    const catalog = engine.getSignalCatalog(vertical);
    if (!catalog) {
      return res.status(404).json({
        error: `Unknown vertical: ${vertical}`,
        available: engine.listVerticals()
      });
    }

    return res.status(200).json(catalog);
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  VerticalSignalEngine,
  VerticalConfigLoader,
  TextAnalyzer,
  SignalScorer,
  createVerticalHandler,
  createCatalogHandler
};
