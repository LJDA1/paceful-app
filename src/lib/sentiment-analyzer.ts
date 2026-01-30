/**
 * Sentiment Analyzer for Paceful Journal System
 *
 * Analyzes text for emotional content, insights, and healing indicators.
 * Uses a word-based algorithm with context awareness.
 * Designed to be replaced with AI-powered analysis later.
 */

// ============================================================================
// Types
// ============================================================================

export interface SentimentResult {
  /** Overall sentiment score from -1 (very negative) to +1 (very positive) */
  score: number;
  /** Human-readable sentiment level */
  level: SentimentLevel;
  /** Confidence in the analysis (0-1) */
  confidence: number;
}

export interface EmotionResult {
  /** Primary detected emotion */
  primary: EmotionType | null;
  /** Secondary detected emotion (if present) */
  secondary: EmotionType | null;
  /** All detected emotions with their intensities */
  detected: EmotionDetection[];
}

export interface InsightResult {
  /** Whether the text contains self-reflection */
  hasSelfReflection: boolean;
  /** Whether gratitude is expressed */
  hasGratitude: boolean;
  /** Whether future-thinking/planning is present */
  hasFutureThinking: boolean;
  /** Whether the text shows acceptance */
  hasAcceptance: boolean;
  /** Whether growth mindset language is present */
  hasGrowthMindset: boolean;
  /** Number of insight indicators found */
  insightScore: number;
}

export interface LanguageMetrics {
  /** Total word count */
  wordCount: number;
  /** Average sentence length */
  avgSentenceLength: number;
  /** Vocabulary diversity (unique words / total words) */
  vocabularyDiversity: number;
  /** Complexity score (0-1) */
  complexity: number;
  /** Whether first person pronouns are used */
  usesFirstPerson: boolean;
  /** Question count */
  questionCount: number;
}

export interface FullAnalysisResult {
  sentiment: SentimentResult;
  emotions: EmotionResult;
  insights: InsightResult;
  language: LanguageMetrics;
  /** Healing indicators summary */
  healingIndicators: HealingIndicators;
  /** Overall analysis timestamp */
  analyzedAt: string;
}

export interface HealingIndicators {
  /** Progress markers found (0-10) */
  progressScore: number;
  /** Processing difficult emotions healthily */
  healthyProcessing: boolean;
  /** Signs of emotional regulation */
  emotionalRegulation: boolean;
  /** Forward-looking mindset */
  forwardLooking: boolean;
}

export type SentimentLevel =
  | 'very_negative'
  | 'negative'
  | 'slightly_negative'
  | 'neutral'
  | 'slightly_positive'
  | 'positive'
  | 'very_positive';

export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'trust'
  | 'anticipation'
  | 'love'
  | 'gratitude'
  | 'hope'
  | 'anxiety'
  | 'loneliness'
  | 'acceptance'
  | 'confusion'
  | 'relief';

export interface EmotionDetection {
  emotion: EmotionType;
  intensity: number; // 0-1
  wordMatches: string[];
}

// ============================================================================
// Word Dictionaries
// ============================================================================

const POSITIVE_WORDS: Record<string, number> = {
  // High positive (0.8-1.0)
  'amazing': 0.9, 'wonderful': 0.9, 'fantastic': 0.9, 'excellent': 0.9,
  'thrilled': 0.9, 'ecstatic': 1.0, 'overjoyed': 1.0, 'blessed': 0.85,
  'incredible': 0.9, 'extraordinary': 0.9,

  // Medium-high positive (0.6-0.8)
  'happy': 0.7, 'joyful': 0.75, 'grateful': 0.8, 'thankful': 0.8,
  'peaceful': 0.7, 'calm': 0.65, 'hopeful': 0.75, 'optimistic': 0.75,
  'proud': 0.7, 'confident': 0.7, 'excited': 0.75, 'love': 0.8,
  'loving': 0.75, 'beautiful': 0.7, 'brilliant': 0.75, 'delighted': 0.8,

  // Medium positive (0.4-0.6)
  'good': 0.5, 'nice': 0.45, 'pleasant': 0.5, 'glad': 0.55, 'content': 0.5,
  'satisfied': 0.55, 'relieved': 0.6, 'comfortable': 0.5, 'fine': 0.4,
  'okay': 0.35, 'better': 0.55, 'improving': 0.6, 'progress': 0.6,

  // Healing-specific positive
  'healing': 0.7, 'growth': 0.7, 'stronger': 0.7, 'brave': 0.7,
  'resilient': 0.75, 'forward': 0.6, 'clarity': 0.7, 'insight': 0.65,
  'learned': 0.6, 'understand': 0.55, 'accept': 0.6, 'accepting': 0.65,
  'release': 0.6, 'letting': 0.5, 'free': 0.7, 'freedom': 0.75,
  'forgive': 0.7, 'forgiveness': 0.75, 'peace': 0.7, 'serene': 0.7,
};

const NEGATIVE_WORDS: Record<string, number> = {
  // High negative (-0.8 to -1.0)
  'devastated': -0.95, 'hopeless': -0.9, 'despair': -0.95, 'anguish': -0.9,
  'miserable': -0.85, 'terrible': -0.8, 'awful': -0.8, 'horrible': -0.85,
  'destroyed': -0.9, 'shattered': -0.9, 'worthless': -0.95,

  // Medium-high negative (-0.6 to -0.8)
  'sad': -0.65, 'depressed': -0.8, 'angry': -0.7, 'furious': -0.8,
  'hurt': -0.7, 'pain': -0.7, 'painful': -0.7, 'lonely': -0.75,
  'alone': -0.6, 'scared': -0.7, 'terrified': -0.85, 'anxious': -0.65,
  'worried': -0.6, 'afraid': -0.7, 'fear': -0.7, 'heartbroken': -0.85,

  // Medium negative (-0.4 to -0.6)
  'upset': -0.55, 'frustrated': -0.55, 'annoyed': -0.45, 'disappointed': -0.55,
  'confused': -0.45, 'lost': -0.5, 'stuck': -0.5, 'overwhelmed': -0.6,
  'exhausted': -0.55, 'tired': -0.4, 'stressed': -0.55, 'struggling': -0.55,

  // Breakup-specific negative
  'betrayed': -0.85, 'rejected': -0.75, 'abandoned': -0.8, 'cheated': -0.85,
  'lied': -0.7, 'manipulated': -0.75, 'used': -0.65, 'broken': -0.7,
  'empty': -0.65, 'numb': -0.6, 'regret': -0.6, 'guilt': -0.6,
  'shame': -0.7, 'blame': -0.55, 'miss': -0.5, 'missing': -0.5,
};

const EMOTION_WORDS: Record<EmotionType, string[]> = {
  joy: ['happy', 'joyful', 'elated', 'cheerful', 'delighted', 'pleased', 'thrilled', 'ecstatic', 'blissful'],
  sadness: ['sad', 'unhappy', 'depressed', 'melancholy', 'sorrowful', 'grief', 'mourning', 'crying', 'tears', 'weeping'],
  anger: ['angry', 'furious', 'rage', 'irritated', 'annoyed', 'frustrated', 'mad', 'resentful', 'bitter', 'hostile'],
  fear: ['afraid', 'scared', 'terrified', 'frightened', 'nervous', 'panicked', 'dreading', 'worried'],
  surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned', 'unexpected'],
  disgust: ['disgusted', 'revolted', 'repulsed', 'sick', 'nauseated'],
  trust: ['trust', 'trusting', 'faith', 'believe', 'confident', 'secure', 'safe'],
  anticipation: ['excited', 'eager', 'looking forward', 'anticipating', 'expecting', 'hopeful'],
  love: ['love', 'loving', 'adore', 'cherish', 'affection', 'caring', 'devoted'],
  gratitude: ['grateful', 'thankful', 'appreciative', 'blessed', 'fortunate'],
  hope: ['hope', 'hopeful', 'optimistic', 'encouraged', 'promising'],
  anxiety: ['anxious', 'worried', 'nervous', 'uneasy', 'restless', 'tense', 'stressed'],
  loneliness: ['lonely', 'alone', 'isolated', 'solitary', 'disconnected', 'abandoned'],
  acceptance: ['accept', 'accepting', 'embracing', 'acknowledging', 'understanding', 'peace'],
  confusion: ['confused', 'uncertain', 'unsure', 'bewildered', 'lost', 'puzzled'],
  relief: ['relieved', 'relief', 'unburdened', 'free', 'liberated'],
};

const INSIGHT_PATTERNS = {
  selfReflection: [
    'i realize', 'i understand', 'i see now', 'i learned', 'i noticed',
    'looking back', 'thinking about', 'reflecting on', 'i recognize',
    'it occurred to me', 'i\'ve been thinking', 'i wonder',
  ],
  gratitude: [
    'grateful', 'thankful', 'appreciate', 'blessed', 'fortunate',
    'thank you', 'thanks to', 'lucky to have',
  ],
  futureThinking: [
    'will be', 'going to', 'planning to', 'looking forward', 'someday',
    'in the future', 'next time', 'tomorrow', 'next week', 'next month',
    'i want to', 'i hope to', 'i\'ll', 'i will',
  ],
  acceptance: [
    'accept', 'accepting', 'it is what it is', 'let go', 'letting go',
    'move on', 'moving on', 'peace with', 'okay with', 'come to terms',
  ],
  growthMindset: [
    'learn from', 'grow', 'growing', 'stronger', 'better version',
    'opportunity', 'challenge', 'progress', 'improve', 'developing',
    'becoming', 'evolving',
  ],
};

const NEGATION_WORDS = ['not', 'no', 'never', 'none', 'nothing', 'neither', 'nobody', 'nowhere', "don't", "doesn't", "didn't", "won't", "wouldn't", "couldn't", "shouldn't", "can't", "cannot", "isn't", "aren't", "wasn't", "weren't"];

const INTENSIFIERS: Record<string, number> = {
  'very': 1.3, 'really': 1.25, 'extremely': 1.5, 'incredibly': 1.4,
  'absolutely': 1.4, 'totally': 1.3, 'completely': 1.35, 'utterly': 1.4,
  'so': 1.2, 'quite': 1.1, 'pretty': 1.1, 'somewhat': 0.8, 'slightly': 0.7,
  'barely': 0.5, 'hardly': 0.5, 'a bit': 0.8, 'a little': 0.75,
};

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Tokenize text into words and sentences
 */
function tokenize(text: string): { words: string[]; sentences: string[] } {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  return { words, sentences };
}

/**
 * Check if a word is negated by looking at surrounding context
 */
function isNegated(words: string[], index: number): boolean {
  // Check previous 3 words for negation
  for (let i = Math.max(0, index - 3); i < index; i++) {
    if (NEGATION_WORDS.includes(words[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Get intensity modifier from surrounding words
 */
function getIntensityModifier(words: string[], index: number): number {
  let modifier = 1.0;

  // Check previous word for intensifier
  if (index > 0) {
    const prevWord = words[index - 1];
    if (INTENSIFIERS[prevWord]) {
      modifier = INTENSIFIERS[prevWord];
    }
  }

  // Check two words back for compound intensifiers
  if (index > 1) {
    const twoBack = words[index - 2] + ' ' + words[index - 1];
    if (INTENSIFIERS[twoBack]) {
      modifier = INTENSIFIERS[twoBack];
    }
  }

  return modifier;
}

/**
 * Analyze sentiment of text
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return { score: 0, level: 'neutral', confidence: 0 };
  }

  const { words } = tokenize(text);

  if (words.length === 0) {
    return { score: 0, level: 'neutral', confidence: 0 };
  }

  let totalScore = 0;
  let matchCount = 0;

  words.forEach((word, index) => {
    const cleanWord = word.replace(/[^a-z]/g, '');

    let wordScore = 0;
    if (POSITIVE_WORDS[cleanWord]) {
      wordScore = POSITIVE_WORDS[cleanWord];
    } else if (NEGATIVE_WORDS[cleanWord]) {
      wordScore = NEGATIVE_WORDS[cleanWord];
    }

    if (wordScore !== 0) {
      // Apply negation
      if (isNegated(words, index)) {
        wordScore = -wordScore * 0.5; // Negation doesn't fully reverse
      }

      // Apply intensity modifier
      const intensity = getIntensityModifier(words, index);
      wordScore *= intensity;

      totalScore += wordScore;
      matchCount++;
    }
  });

  // Calculate final score
  let score = matchCount > 0 ? totalScore / matchCount : 0;

  // Normalize to -1 to 1 range
  score = Math.max(-1, Math.min(1, score));

  // Calculate confidence based on match density
  const matchDensity = matchCount / words.length;
  const confidence = Math.min(1, matchDensity * 3 + (words.length > 50 ? 0.3 : 0));

  // Determine level
  let level: SentimentLevel;
  if (score <= -0.6) level = 'very_negative';
  else if (score <= -0.3) level = 'negative';
  else if (score <= -0.1) level = 'slightly_negative';
  else if (score < 0.1) level = 'neutral';
  else if (score < 0.3) level = 'slightly_positive';
  else if (score < 0.6) level = 'positive';
  else level = 'very_positive';

  return { score, level, confidence };
}

/**
 * Detect emotions in text
 */
export function analyzeEmotions(text: string): EmotionResult {
  const { words } = tokenize(text.toLowerCase());
  const detections: EmotionDetection[] = [];

  // Check each emotion type
  for (const [emotion, keywords] of Object.entries(EMOTION_WORDS)) {
    const matches: string[] = [];

    keywords.forEach(keyword => {
      // Handle multi-word keywords
      if (keyword.includes(' ')) {
        if (text.toLowerCase().includes(keyword)) {
          matches.push(keyword);
        }
      } else {
        words.forEach(word => {
          if (word === keyword || word.startsWith(keyword)) {
            matches.push(word);
          }
        });
      }
    });

    if (matches.length > 0) {
      const intensity = Math.min(1, matches.length / 3);
      detections.push({
        emotion: emotion as EmotionType,
        intensity,
        wordMatches: [...new Set(matches)],
      });
    }
  }

  // Sort by intensity
  detections.sort((a, b) => b.intensity - a.intensity);

  return {
    primary: detections[0]?.emotion || null,
    secondary: detections[1]?.emotion || null,
    detected: detections,
  };
}

/**
 * Analyze text for insights and self-reflection
 */
export function analyzeInsights(text: string): InsightResult {
  const lowerText = text.toLowerCase();

  const checkPatterns = (patterns: string[]): boolean => {
    return patterns.some(pattern => lowerText.includes(pattern));
  };

  const countPatterns = (patterns: string[]): number => {
    return patterns.filter(pattern => lowerText.includes(pattern)).length;
  };

  const hasSelfReflection = checkPatterns(INSIGHT_PATTERNS.selfReflection);
  const hasGratitude = checkPatterns(INSIGHT_PATTERNS.gratitude);
  const hasFutureThinking = checkPatterns(INSIGHT_PATTERNS.futureThinking);
  const hasAcceptance = checkPatterns(INSIGHT_PATTERNS.acceptance);
  const hasGrowthMindset = checkPatterns(INSIGHT_PATTERNS.growthMindset);

  // Calculate insight score (0-10)
  const insightScore = Math.min(10,
    countPatterns(INSIGHT_PATTERNS.selfReflection) * 2 +
    countPatterns(INSIGHT_PATTERNS.gratitude) * 2 +
    countPatterns(INSIGHT_PATTERNS.futureThinking) * 1.5 +
    countPatterns(INSIGHT_PATTERNS.acceptance) * 2 +
    countPatterns(INSIGHT_PATTERNS.growthMindset) * 1.5
  );

  return {
    hasSelfReflection,
    hasGratitude,
    hasFutureThinking,
    hasAcceptance,
    hasGrowthMindset,
    insightScore: Math.round(insightScore * 10) / 10,
  };
}

/**
 * Analyze language complexity and metrics
 */
export function analyzeLanguage(text: string): LanguageMetrics {
  const { words, sentences } = tokenize(text);

  if (words.length === 0) {
    return {
      wordCount: 0,
      avgSentenceLength: 0,
      vocabularyDiversity: 0,
      complexity: 0,
      usesFirstPerson: false,
      questionCount: 0,
    };
  }

  const wordCount = words.length;
  const avgSentenceLength = sentences.length > 0
    ? wordCount / sentences.length
    : wordCount;

  // Vocabulary diversity
  const uniqueWords = new Set(words);
  const vocabularyDiversity = uniqueWords.size / wordCount;

  // Complexity score based on:
  // - Sentence length variation
  // - Word length average
  // - Vocabulary diversity
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
  const complexity = Math.min(1,
    (vocabularyDiversity * 0.4) +
    (Math.min(avgWordLength / 8, 1) * 0.3) +
    (Math.min(avgSentenceLength / 20, 1) * 0.3)
  );

  // First person usage
  const firstPersonPronouns = ['i', 'me', 'my', 'mine', 'myself', "i'm", "i've", "i'll", "i'd"];
  const usesFirstPerson = words.some(w => firstPersonPronouns.includes(w));

  // Question count
  const questionCount = (text.match(/\?/g) || []).length;

  return {
    wordCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    vocabularyDiversity: Math.round(vocabularyDiversity * 100) / 100,
    complexity: Math.round(complexity * 100) / 100,
    usesFirstPerson,
    questionCount,
  };
}

/**
 * Analyze healing indicators
 */
export function analyzeHealingIndicators(
  sentiment: SentimentResult,
  emotions: EmotionResult,
  insights: InsightResult
): HealingIndicators {
  // Progress score based on multiple factors
  let progressScore = 0;

  // Positive or improving sentiment
  if (sentiment.score > 0.2) progressScore += 2;
  else if (sentiment.score > -0.1) progressScore += 1;

  // Insight indicators
  if (insights.hasSelfReflection) progressScore += 2;
  if (insights.hasGratitude) progressScore += 2;
  if (insights.hasAcceptance) progressScore += 2;
  if (insights.hasGrowthMindset) progressScore += 1;
  if (insights.hasFutureThinking) progressScore += 1;

  // Healthy processing: acknowledging difficult emotions while showing resilience
  const hasNegativeEmotions = emotions.detected.some(e =>
    ['sadness', 'anger', 'fear', 'anxiety', 'loneliness'].includes(e.emotion)
  );
  const hasPositiveIndicators =
    insights.hasAcceptance ||
    insights.hasGrowthMindset ||
    sentiment.score > 0;
  const healthyProcessing = hasNegativeEmotions && hasPositiveIndicators;

  // Emotional regulation: not at extremes
  const emotionalRegulation =
    sentiment.score > -0.7 &&
    sentiment.score < 0.8 &&
    !emotions.detected.some(e => e.intensity > 0.8);

  // Forward looking
  const forwardLooking = insights.hasFutureThinking || insights.hasGrowthMindset;

  return {
    progressScore: Math.min(10, progressScore),
    healthyProcessing,
    emotionalRegulation,
    forwardLooking,
  };
}

/**
 * Perform full analysis on text
 */
export function analyzeText(text: string): FullAnalysisResult {
  const sentiment = analyzeSentiment(text);
  const emotions = analyzeEmotions(text);
  const insights = analyzeInsights(text);
  const language = analyzeLanguage(text);
  const healingIndicators = analyzeHealingIndicators(sentiment, emotions, insights);

  return {
    sentiment,
    emotions,
    insights,
    language,
    healingIndicators,
    analyzedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a human-readable sentiment label
 */
export function getSentimentLabel(level: SentimentLevel): string {
  const labels: Record<SentimentLevel, string> = {
    very_negative: 'Processing difficult feelings',
    negative: 'Working through challenges',
    slightly_negative: 'Reflective',
    neutral: 'Balanced',
    slightly_positive: 'Finding clarity',
    positive: 'Hopeful',
    very_positive: 'Thriving',
  };
  return labels[level];
}

/**
 * Get color classes for sentiment level (Tailwind)
 */
export function getSentimentColors(level: SentimentLevel): { text: string; bg: string; border: string } {
  const colors: Record<SentimentLevel, { text: string; bg: string; border: string }> = {
    very_negative: { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    negative: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    slightly_negative: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    neutral: { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
    slightly_positive: { text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
    positive: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    very_positive: { text: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  };
  return colors[level];
}

/**
 * Get emoji for emotion type
 */
export function getEmotionEmoji(emotion: EmotionType): string {
  const emojis: Record<EmotionType, string> = {
    joy: '😊',
    sadness: '😢',
    anger: '😠',
    fear: '😨',
    surprise: '😲',
    disgust: '😒',
    trust: '🤝',
    anticipation: '🤩',
    love: '❤️',
    gratitude: '🙏',
    hope: '🌟',
    anxiety: '😰',
    loneliness: '💔',
    acceptance: '☮️',
    confusion: '😕',
    relief: '😮‍💨',
  };
  return emojis[emotion];
}

/**
 * Simple sentiment for quick display (returns basic level)
 */
export function getSimpleSentiment(text: string): 'struggling' | 'processing' | 'neutral' | 'hopeful' | 'positive' {
  const { level } = analyzeSentiment(text);

  if (level === 'very_negative' || level === 'negative') return 'struggling';
  if (level === 'slightly_negative') return 'processing';
  if (level === 'neutral') return 'neutral';
  if (level === 'slightly_positive') return 'hopeful';
  return 'positive';
}
