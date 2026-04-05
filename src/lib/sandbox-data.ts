/**
 * Sandbox Data Generator
 *
 * Generates realistic mock data for partner API sandbox mode.
 * Data is deterministic (seeded random) so the same requests return consistent data.
 */

// Seeded random number generator for deterministic results
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Hash string to number for deterministic seeding
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============================================================================
// Types
// ============================================================================

type Dimension = 'emotional_stability' | 'self_reflection' | 'coping_capacity' | 'behavioral_engagement' | 'social_readiness';
type Stage = 'healing' | 'rebuilding' | 'ready';

const DIMENSIONS: Dimension[] = [
  'emotional_stability',
  'self_reflection',
  'coping_capacity',
  'behavioral_engagement',
  'social_readiness',
];
type Verbosity = 'minimal' | 'standard' | 'clinical';
type Tone = 'clinical' | 'casual' | 'motivational';

interface SandboxUser {
  externalId: string;
  pacefulUserId: string;
  stage: Stage;
  ersScore: number;
  dimensions: Record<Dimension, number>;
  createdAt: string;
  moodLogs: SandboxMoodLog[];
  journalEntries: SandboxJournalEntry[];
}

interface SandboxMoodLog {
  id: string;
  score: number;
  label: string;
  emotions: string[];
  timestamp: string;
}

interface SandboxJournalEntry {
  id: string;
  sentiment: string;
  sentimentScore: number;
  wordCount: number;
  timestamp: string;
}

// ============================================================================
// Mock Data Constants
// ============================================================================

const EMOTIONS = [
  'happy', 'calm', 'grateful', 'hopeful', 'confident',
  'anxious', 'sad', 'frustrated', 'overwhelmed', 'lonely',
  'neutral', 'tired', 'motivated', 'peaceful', 'reflective'
];

const MOOD_LABELS = ['Struggling', 'Difficult', 'Okay', 'Good', 'Great'];

const SENTIMENTS = ['Hopeful', 'Reflective', 'Processing', 'Anxious', 'Grateful', 'Neutral'];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Jamie', 'Sage', 'Drew', 'Blake', 'Cameron', 'Parker', 'Skyler', 'Reese',
  'Finley', 'Hayden', 'Peyton', 'Dakota', 'River', 'Phoenix', 'Rowan', 'Eden', 'Kai'
];

// ============================================================================
// Sandbox User Generation
// ============================================================================

function generateSandboxUsers(): SandboxUser[] {
  const rng = new SeededRandom(42); // Fixed seed for deterministic data
  const users: SandboxUser[] = [];

  // Distribution: 5 healing, 12 rebuilding, 8 ready
  const stageDistribution: Stage[] = [
    ...Array(5).fill('healing'),
    ...Array(12).fill('rebuilding'),
    ...Array(8).fill('ready'),
  ];

  for (let i = 0; i < 25; i++) {
    const stage = stageDistribution[i];
    const ersScore = generateErsForStage(stage, rng);
    const dimensions = generateDimensionsForScore(ersScore, rng);
    const createdDaysAgo = rng.nextInt(7, 90);
    const createdAt = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString();

    const user: SandboxUser = {
      externalId: `sandbox_user_${(i + 1).toString().padStart(3, '0')}`,
      pacefulUserId: `pf_sandbox_${rng.nextInt(100000, 999999)}`,
      stage,
      ersScore,
      dimensions,
      createdAt,
      moodLogs: generateMoodLogs(rng, createdDaysAgo),
      journalEntries: generateJournalEntries(rng, createdDaysAgo),
    };

    users.push(user);
  }

  return users;
}

function generateErsForStage(stage: Stage, rng: SeededRandom): number {
  switch (stage) {
    case 'healing':
      return rng.nextInt(25, 45);
    case 'rebuilding':
      return rng.nextInt(50, 70);
    case 'ready':
      return rng.nextInt(75, 92);
  }
}

function generateDimensionsForScore(ersScore: number, rng: SeededRandom): Record<Dimension, number> {
  const variance = 15;
  const clamp = (val: number) => Math.max(10, Math.min(90, val));

  return {
    emotional_stability: clamp(ersScore + rng.nextInt(-variance, variance)),
    self_reflection: clamp(ersScore + rng.nextInt(-variance, variance)),
    coping_capacity: clamp(ersScore + rng.nextInt(-variance, variance)),
    behavioral_engagement: clamp(ersScore + rng.nextInt(-variance, variance)),
    social_readiness: clamp(ersScore + rng.nextInt(-variance, variance)),
  };
}

function generateMoodLogs(rng: SeededRandom, daysSinceCreation: number): SandboxMoodLog[] {
  const numLogs = rng.nextInt(7, Math.min(30, daysSinceCreation));
  const logs: SandboxMoodLog[] = [];

  for (let i = 0; i < numLogs; i++) {
    const daysAgo = rng.nextInt(0, Math.min(daysSinceCreation, 30));
    const score = rng.nextInt(1, 5);
    const numEmotions = rng.nextInt(1, 3);
    const emotions = rng.shuffle(EMOTIONS).slice(0, numEmotions);

    logs.push({
      id: `mood_sandbox_${rng.nextInt(100000, 999999)}`,
      score,
      label: MOOD_LABELS[score - 1],
      emotions,
      timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateJournalEntries(rng: SeededRandom, daysSinceCreation: number): SandboxJournalEntry[] {
  const numEntries = rng.nextInt(3, Math.min(15, Math.floor(daysSinceCreation / 3)));
  const entries: SandboxJournalEntry[] = [];

  for (let i = 0; i < numEntries; i++) {
    const daysAgo = rng.nextInt(0, Math.min(daysSinceCreation, 30));

    entries.push({
      id: `journal_sandbox_${rng.nextInt(100000, 999999)}`,
      sentiment: rng.pick(SENTIMENTS),
      sentimentScore: Math.round((rng.next() * 0.6 + 0.2) * 100) / 100, // 0.2-0.8 range
      wordCount: rng.nextInt(50, 400),
      timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Generate users once (cached)
const SANDBOX_USERS = generateSandboxUsers();

// ============================================================================
// Sandbox Response Generators
// ============================================================================

export function getSandboxUser(externalId: string): SandboxUser | undefined {
  // First check if it matches a predefined user
  const predefined = SANDBOX_USERS.find(u => u.externalId === externalId);
  if (predefined) return predefined;

  // Generate a deterministic user for any externalId
  const rng = new SeededRandom(hashString(externalId));
  const stageRoll = rng.next();
  const stage: Stage = stageRoll < 0.2 ? 'healing' : stageRoll < 0.7 ? 'rebuilding' : 'ready';
  const ersScore = generateErsForStage(stage, rng);
  const dimensions = generateDimensionsForScore(ersScore, rng);
  const createdDaysAgo = rng.nextInt(7, 60);

  return {
    externalId,
    pacefulUserId: `pf_sandbox_${rng.nextInt(100000, 999999)}`,
    stage,
    ersScore,
    dimensions,
    createdAt: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
    moodLogs: generateMoodLogs(rng, createdDaysAgo),
    journalEntries: generateJournalEntries(rng, createdDaysAgo),
  };
}

function getScoreLabel(score: number): string {
  if (score < 25) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}

function getReadinessLabel(score: number): string {
  if (score < 40) return 'Not Ready';
  if (score < 60) return 'Healing';
  if (score < 75) return 'Rebuilding';
  return 'Ready';
}

// ============================================================================
// Reasoning Templates by Tone
// ============================================================================

const REASONING_TEMPLATES: Record<Tone, Record<Dimension, Record<'high' | 'mid' | 'low', string>>> = {
  clinical: {
    emotional_stability: {
      high: 'Strong emotional regulation indicated. Assessment suggests stable mood patterns and quick recovery capacity.',
      mid: 'Moderate emotional stability observed. Some mood variance noted with variable recovery time.',
      low: 'Emotional stability requires support. Assessment indicates mood fluctuations and difficulty regaining balance.',
    },
    self_reflection: {
      high: 'High self-awareness demonstrated. Strong pattern recognition and healthy processing of experiences.',
      mid: 'Moderate reflective capacity. Some pattern recognition present with variable reflection ability.',
      low: 'Self-reflection capacity is developing. Limited insight into emotional patterns noted.',
    },
    coping_capacity: {
      high: 'Strong coping toolkit evident. Effective stress management and resilient recovery from setbacks.',
      mid: 'Moderate coping resources available. Some coping tools in use with variable recovery.',
      low: 'Coping capacity needs development. Limited reliable strategies and difficulty with setbacks.',
    },
    behavioral_engagement: {
      high: 'High behavioral engagement shown. Consistent routines and strong motivation for growth.',
      mid: 'Moderate engagement observed. Some routine maintenance with variable engagement levels.',
      low: 'Behavioral engagement is low. Disrupted routines and limited growth motivation noted.',
    },
    social_readiness: {
      high: 'High social readiness indicated. Openness to connections and genuine social presence.',
      mid: 'Moderate social readiness. Mixed feelings about engagement with variable social presence.',
      low: 'Social readiness is developing. Hesitation toward connections and limited social engagement.',
    },
  },
  casual: {
    emotional_stability: {
      high: "Looking good here! Your mood's been pretty steady and you bounce back quickly.",
      mid: "There's some room to grow. You've had some emotional waves lately.",
      low: "This is an area where you could use some support. Things have been up and down.",
    },
    self_reflection: {
      high: "You've got great self-awareness! You really understand your patterns.",
      mid: "You're building self-awareness. Still figuring out some patterns.",
      low: "Self-reflection is something you're just starting to develop.",
    },
    coping_capacity: {
      high: "You've got a solid toolkit for handling stress! Your strategies really work.",
      mid: "Your coping skills are developing. Some things help, some don't.",
      low: "Building coping skills is a priority right now. Finding healthy strategies has been tough.",
    },
    behavioral_engagement: {
      high: "You're really showing up for yourself! Your routines are solid.",
      mid: "You're making some effort, which is great. Some days are better than others.",
      low: "Engagement has been challenging lately. Routines have kind of fallen apart.",
    },
    social_readiness: {
      high: "Socially, you're in a good place! You're open to meeting new people.",
      mid: "Social stuff is a mixed bag right now. Mixed feelings about putting yourself out there.",
      low: "Social connection is something you're working up to. It feels overwhelming right now.",
    },
  },
  motivational: {
    emotional_stability: {
      high: "You're doing amazing work with your emotions! Your steady mood shows real progress!",
      mid: "You're on the path to emotional balance! Every wave is a learning opportunity.",
      low: "This is your starting point, not your ending point. You've got this!",
    },
    self_reflection: {
      high: "Your self-awareness is a superpower! Understanding your patterns gives you real control.",
      mid: "You're building something valuable here! Each pattern you notice is a breakthrough.",
      low: "Self-discovery is a journey, and you've begun! One insight at a time!",
    },
    coping_capacity: {
      high: "Your coping toolkit is impressive! Those strategies are really working!",
      mid: "You're building your resilience muscles! Keep adding tools to your toolkit!",
      low: "Building coping skills is the most valuable investment! You will get stronger!",
    },
    behavioral_engagement: {
      high: "Your commitment to yourself is inspiring! Keep showing up!",
      mid: "Every effort counts, and you're making them! Small steps, big changes!",
      low: "Today is a new opportunity to engage! Start small, dream big!",
    },
    social_readiness: {
      high: "Your openness to connection is wonderful! Connection awaits!",
      mid: "Social readiness is building at your pace! One connection at a time!",
      low: "Social connection will come when you're ready! Focus on you first!",
    },
  },
};

const RECOMMENDED_ACTIONS: Record<Dimension, Record<'high' | 'mid' | 'low', string>> = {
  emotional_stability: {
    high: 'Emotional stability is strong. Consider maintenance strategies to sustain current patterns.',
    mid: 'Emotional baseline is moderate. May benefit from mindfulness or grounding exercises.',
    low: 'Consider exploring recent stressors — mood variance suggests regulation challenges.',
  },
  self_reflection: {
    high: 'Self-reflection capacity is strong. Consider exploring more complex emotional patterns.',
    mid: 'Reflection engagement is developing. Good time to introduce deeper journaling prompts.',
    low: 'Consider introducing structured reflection prompts — self-awareness indicators are limited.',
  },
  coping_capacity: {
    high: 'Coping capacity is well-developed. Consider stress-testing with more challenging scenarios.',
    mid: 'Coping tool usage is developing. Consider introducing a new technique to build range.',
    low: 'Priority should be placed on building a basic coping toolkit — current resources appear limited.',
  },
  behavioral_engagement: {
    high: 'Behavioral engagement is strong. Consider expanding to new growth areas.',
    mid: 'Engagement is moderate. May benefit from habit stacking or accountability structures.',
    low: 'Consider a re-engagement check-in or goal reset — routine indicators suggest disconnection.',
  },
  social_readiness: {
    high: 'User may be ready for group or peer-based activities — social indicators are strong.',
    mid: 'Social readiness is developing. Consider low-pressure social activities or peer support.',
    low: 'Individual healing may need to progress before social re-engagement — readiness indicators are low.',
  },
};

function getTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

function generateDimensionResult(
  dimension: Dimension,
  score: number,
  verbosity: Verbosity,
  tone: Tone,
  scoreFormat: 'numerical' | 'percentage' | 'tier_label' | 'traffic_light',
  thresholds: { red_max: number; yellow_max: number }
) {
  const label = getScoreLabel(score);
  const tier = getTier(score);

  // Format score
  let formattedScore: number | string = score;
  if (scoreFormat === 'percentage') formattedScore = `${score}%`;
  else if (scoreFormat === 'tier_label') formattedScore = label;
  else if (scoreFormat === 'traffic_light') {
    formattedScore = score <= thresholds.red_max ? 'red' : score <= thresholds.yellow_max ? 'yellow' : 'green';
  }

  if (verbosity === 'minimal') {
    return { score: formattedScore, label };
  }

  const reasoning = REASONING_TEMPLATES[tone][dimension][tier];
  const signals = {
    emotional_stability: ['mood_variance', 'time_of_day_consistency'],
    self_reflection: ['reflection_completions', 'session_duration'],
    coping_capacity: ['coping_tool_usage', 'goal_completion_rate'],
    behavioral_engagement: ['session_frequency', 'streak_length'],
    social_readiness: ['social_feature_usage', 'session_frequency'],
  };

  const result: Record<string, unknown> = {
    score: formattedScore,
    label,
    reasoning: `${reasoning} Key signals: ${signals[dimension].join(' and ')}.`,
    trend: 'stable',
    trend_delta: null,
    top_signals: signals[dimension],
  };

  if (verbosity === 'clinical') {
    result.recommended_action = RECOMMENDED_ACTIONS[dimension][tier];
  }

  return result;
}

// ============================================================================
// Public Sandbox Response Functions
// ============================================================================

export function getSandboxResponse(
  endpoint: string,
  params: Record<string, unknown> = {}
): Record<string, unknown> {
  switch (endpoint) {
    case 'users_register':
      return getSandboxUserRegisterResponse(params);
    case 'mood_log':
      return getSandboxMoodLogResponse(params);
    case 'journal_entry':
      return getSandboxJournalEntryResponse(params);
    case 'ers_get':
      return getSandboxErsGetResponse(params);
    case 'ers_history':
      return getSandboxErsHistoryResponse(params);
    case 'ers_trends_aggregate':
      return getSandboxErsTrendsAggregateResponse(params);
    case 'ers_calculate':
      return getSandboxErsCalculateResponse(params);
    case 'ers_batch':
      return getSandboxErsBatchResponse(params);
    case 'analytics_summary':
      return getSandboxAnalyticsSummaryResponse(params);
    case 'webhooks_register':
      return getSandboxWebhookRegisterResponse(params);
    case 'webhooks_list':
      return getSandboxWebhookListResponse();
    case 'webhook_deliveries_list':
      return getSandboxWebhookDeliveriesListResponse();
    case 'webhook_delivery_detail':
      return getSandboxWebhookDeliveryDetailResponse(params);
    case 'webhook_delivery_retry':
      return getSandboxWebhookDeliveryRetryResponse(params);
    case 'partner_health':
      return getSandboxPartnerHealthResponse();
    case 'partner_info':
      return getSandboxPartnerInfoResponse();
    case 'partner_usage':
      return getSandboxPartnerUsageResponse();
    case 'partner_config_get':
      return getSandboxPartnerConfigGetResponse();
    case 'partner_config_put':
      return getSandboxPartnerConfigPutResponse(params);
    case 'snapshot_questions':
      return getSandboxSnapshotQuestionsResponse();
    case 'snapshot_submit':
      return getSandboxSnapshotSubmitResponse(params);
    case 'import_users':
      return getSandboxImportUsersResponse(params);
    case 'import_mood':
      return getSandboxImportMoodResponse(params);
    case 'ers_compare':
      return getSandboxErsCompareResponse(params);
    case 'ers_benchmarks':
      return getSandboxErsBenchmarksResponse(params);
    case 'ers_recommendations':
      return getSandboxErsRecommendationsResponse(params);
    case 'text_analyze':
      return getSandboxTextAnalyzeResponse(params);
    default:
      return { error: 'Unknown sandbox endpoint' };
  }
}

function getSandboxUserRegisterResponse(params: Record<string, unknown>) {
  const externalId = params.externalId as string || 'sandbox_user_new';
  const user = getSandboxUser(externalId);

  return {
    pacefulUserId: user?.pacefulUserId || `pf_sandbox_${Date.now()}`,
    externalId,
    status: 'active',
    created: true,
  };
}

function getSandboxMoodLogResponse(params: Record<string, unknown>) {
  const rng = new SeededRandom(Date.now());

  return {
    logged: true,
    moodId: `mood_sandbox_${rng.nextInt(100000, 999999)}`,
    timestamp: new Date().toISOString(),
  };
}

function getSandboxJournalEntryResponse(params: Record<string, unknown>) {
  const rng = new SeededRandom(Date.now());

  return {
    entryId: `journal_sandbox_${rng.nextInt(100000, 999999)}`,
    sentiment: rng.pick(SENTIMENTS),
    sentimentScore: Math.round((rng.next() * 0.6 + 0.2) * 100) / 100,
    aiReflection: 'Your entry shows meaningful self-awareness and willingness to explore your emotions. This kind of reflection is an important part of the healing journey.',
    wordCount: params.content ? (params.content as string).split(/\s+/).length : rng.nextInt(50, 200),
  };
}

function getSandboxErsGetResponse(params: Record<string, unknown>) {
  const externalId = params.externalId as string || 'sandbox_user_001';
  const user = getSandboxUser(externalId);

  if (!user) {
    return { error: 'User not found', code: 'NOT_FOUND' };
  }

  const verbosity = (params.verbosity as Verbosity) || 'minimal';
  const tone = (params.tone as Tone) || 'clinical';
  const scoreFormat = (params.score_format as 'numerical' | 'percentage' | 'tier_label' | 'traffic_light') || 'numerical';
  const thresholds = (params.traffic_light_thresholds as { red_max: number; yellow_max: number }) || { red_max: 33, yellow_max: 66 };

  const dimensions: Record<string, unknown> = {};
  for (const [dim, score] of Object.entries(user.dimensions)) {
    dimensions[dim] = generateDimensionResult(
      dim as Dimension,
      score,
      verbosity,
      tone,
      scoreFormat,
      thresholds
    );
  }

  // Format overall score
  let formattedErs: number | string = user.ersScore;
  if (scoreFormat === 'percentage') formattedErs = `${user.ersScore}%`;
  else if (scoreFormat === 'tier_label') formattedErs = getScoreLabel(user.ersScore);
  else if (scoreFormat === 'traffic_light') {
    formattedErs = user.ersScore <= thresholds.red_max ? 'red' : user.ersScore <= thresholds.yellow_max ? 'yellow' : 'green';
  }

  const response: Record<string, unknown> = {
    userId: externalId,
    ersScore: formattedErs,
    stage: user.stage,
    dimensions,
    calculatedAt: new Date().toISOString(),
    trend: {
      direction: 'up',
      weeklyChange: Math.round((Math.random() * 5 - 1) * 10) / 10,
      daysTracked: user.moodLogs.length,
    },
  };

  if (verbosity !== 'minimal') {
    response.meta = {
      verbosity,
      tone,
      score_format: scoreFormat,
      api_version: '1.3.0',
      model_version: 'ers-v1',
    };
  }

  return response;
}

function getSandboxErsCalculateResponse(params: Record<string, unknown>) {
  const ersResponse = getSandboxErsGetResponse(params);
  const user = getSandboxUser(params.externalId as string || 'sandbox_user_001');

  return {
    ...ersResponse,
    previousScore: user ? user.ersScore - 3 : 60,
    change: 3,
    dataPointsUsed: user ? user.moodLogs.length + user.journalEntries.length : 25,
  };
}

function getSandboxErsHistoryResponse(params: Record<string, unknown>) {
  const externalId = params.externalId as string || 'sandbox_user_001';
  const period = params.period as string || '30d';
  const granularity = params.granularity as string || 'daily';
  const includeDimensions = params.include_dimensions !== false;

  const user = getSandboxUser(externalId);
  const currentScore = user?.ersScore || 62;
  const currentStage = user?.stage || 'rebuilding';

  // Generate realistic historical data based on period
  const daysInPeriod = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 60;
  const rng = new SeededRandom(hashString(externalId + period));

  // Generate data points based on granularity
  let numPoints: number;
  switch (granularity) {
    case 'weekly':
      numPoints = Math.ceil(daysInPeriod / 7);
      break;
    case 'monthly':
      numPoints = Math.ceil(daysInPeriod / 30);
      break;
    default:
      numPoints = Math.min(daysInPeriod, 30); // Cap daily at 30 points for sandbox
  }

  // Start score and trending upward
  const startScore = Math.max(25, currentScore - rng.nextInt(5, 15));
  const history: Array<{
    date: string;
    score: number;
    stage: Stage;
    dimensions?: {
      emotional_stability: number;
      self_reflection: number;
      coping_capacity: number;
      behavioral_engagement: number;
      social_readiness: number;
    };
  }> = [];

  let lastStage: Stage = startScore <= 35 ? 'healing' : startScore <= 65 ? 'rebuilding' : 'ready';
  const milestones: Array<{
    date: string;
    type: 'stage_transition';
    from: Stage;
    to: Stage;
    scoreAtTransition: number;
  }> = [];

  for (let i = 0; i < numPoints; i++) {
    const daysAgo = Math.floor((daysInPeriod / numPoints) * (numPoints - 1 - i));
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Score progresses from startScore to currentScore with some noise
    const progress = i / Math.max(1, numPoints - 1);
    const baseScore = startScore + (currentScore - startScore) * progress;
    const noise = rng.nextInt(-3, 3);
    const score = Math.max(10, Math.min(95, Math.round(baseScore + noise)));

    const stage: Stage = score <= 35 ? 'healing' : score <= 65 ? 'rebuilding' : 'ready';

    // Track stage transitions
    if (stage !== lastStage) {
      milestones.push({
        date: date.toISOString(),
        type: 'stage_transition',
        from: lastStage,
        to: stage,
        scoreAtTransition: score,
      });
      lastStage = stage;
    }

    const dataPoint: {
      date: string;
      score: number;
      stage: Stage;
      dimensions?: {
        emotional_stability: number;
        self_reflection: number;
        coping_capacity: number;
        behavioral_engagement: number;
        social_readiness: number;
      };
    } = {
      date: date.toISOString(),
      score,
      stage,
    };

    if (includeDimensions) {
      dataPoint.dimensions = {
        emotional_stability: Math.max(10, Math.min(95, score + rng.nextInt(-10, 10))),
        self_reflection: Math.max(10, Math.min(95, score + rng.nextInt(-10, 10))),
        coping_capacity: Math.max(10, Math.min(95, score + rng.nextInt(-10, 10))),
        behavioral_engagement: Math.max(10, Math.min(95, score + rng.nextInt(-10, 10))),
        social_readiness: Math.max(10, Math.min(95, score + rng.nextInt(-10, 10))),
      };
    }

    history.push(dataPoint);
  }

  const totalChange = history.length >= 2
    ? Math.round((history[history.length - 1].score - history[0].score) * 10) / 10
    : 0;

  const weeksSpan = daysInPeriod / 7;
  const weeklyRate = weeksSpan > 0 ? Math.round((totalChange / weeksSpan) * 10) / 10 : 0;

  return {
    userId: externalId,
    period,
    granularity,
    currentScore,
    currentStage,
    trend: {
      direction: totalChange > 3 ? 'improving' : totalChange < -3 ? 'declining' : 'stable',
      totalChange,
      weeklyRate,
      dataPointsUsed: history.length,
    },
    milestones,
    history,
  };
}

function getSandboxErsTrendsAggregateResponse(params: Record<string, unknown>) {
  const period = params.period as string || '30d';
  const granularity = params.granularity as string || 'weekly';

  const daysInPeriod = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const rng = new SeededRandom(hashString(period + granularity));

  // Generate timeline based on granularity
  let numPoints: number;
  switch (granularity) {
    case 'daily':
      numPoints = daysInPeriod;
      break;
    case 'monthly':
      numPoints = Math.ceil(daysInPeriod / 30);
      break;
    default: // weekly
      numPoints = Math.ceil(daysInPeriod / 7);
  }

  const timeline: Array<{
    date: string;
    averageScore: number;
    stageDistribution: { healing: number; rebuilding: number; ready: number };
    userCount: number;
  }> = [];

  // Start with more users in healing, trend toward more in ready
  let healingPct = 0.45;
  let rebuildingPct = 0.35;
  let readyPct = 0.20;
  let avgScore = 41;

  for (let i = 0; i < numPoints; i++) {
    let daysAgo: number;
    let dateKey: string;

    if (granularity === 'daily') {
      daysAgo = daysInPeriod - 1 - i;
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      dateKey = date.toISOString().split('T')[0];
    } else if (granularity === 'weekly') {
      daysAgo = (numPoints - 1 - i) * 7;
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      // Get Monday
      const dayOfWeek = date.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(date.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
      dateKey = monday.toISOString().split('T')[0];
    } else {
      daysAgo = (numPoints - 1 - i) * 30;
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
    }

    // Gradually improve scores and shift distribution
    const progress = i / Math.max(1, numPoints - 1);
    avgScore = Math.round((41 + progress * 11 + rng.nextInt(-2, 2)) * 10) / 10;

    // Shift distribution toward ready over time
    healingPct = Math.max(0.15, 0.45 - progress * 0.15 + rng.next() * 0.05);
    readyPct = Math.min(0.35, 0.20 + progress * 0.10 + rng.next() * 0.05);
    rebuildingPct = 1 - healingPct - readyPct;

    timeline.push({
      date: dateKey,
      averageScore: avgScore,
      stageDistribution: {
        healing: Math.round(healingPct * 100) / 100,
        rebuilding: Math.round(rebuildingPct * 100) / 100,
        ready: Math.round(readyPct * 100) / 100,
      },
      userCount: 450 + rng.nextInt(-30, 50),
    });
  }

  const startEntry = timeline[0];
  const endEntry = timeline[timeline.length - 1];

  return {
    period,
    granularity,
    totalUsers: 487,
    averageScoreStart: startEntry.averageScore,
    averageScoreEnd: endEntry.averageScore,
    overallTrend: 'improving',
    stageDistributionStart: startEntry.stageDistribution,
    stageDistributionEnd: endEntry.stageDistribution,
    transitionsInPeriod: {
      healing_to_rebuilding: 73,
      rebuilding_to_ready: 48,
      ready_to_rebuilding: 12,
      rebuilding_to_healing: 8,
    },
    timeline,
  };
}

function getSandboxErsBatchResponse(params: Record<string, unknown>) {
  const externalIds = (params.externalIds as string[]) || ['sandbox_user_001', 'sandbox_user_002'];

  const results = externalIds.map(externalId => {
    const user = getSandboxUser(externalId);
    return {
      externalId,
      ersScore: user?.ersScore || 55,
      stage: user?.stage || 'rebuilding',
      calculatedAt: new Date().toISOString(),
    };
  });

  return {
    results,
    totalRequested: externalIds.length,
    totalReturned: results.length,
  };
}

function getSandboxAnalyticsSummaryResponse(params: Record<string, unknown>) {
  return {
    totalUsers: 487,
    activeUsers: 312,
    averageErs: 58.3,
    stageDistribution: {
      healing: 0.18,
      rebuilding: 0.52,
      ready: 0.30,
    },
    engagementMetrics: {
      avgMoodLogsPerWeek: 4.2,
      avgJournalEntriesPerWeek: 1.8,
      avgSessionsPerWeek: 3.5,
    },
    ersMovement: {
      improved: 0.42,
      stable: 0.38,
      declined: 0.20,
    },
    period: (params.period as string) || '30d',
    generatedAt: new Date().toISOString(),
  };
}

function getSandboxWebhookRegisterResponse(params: Record<string, unknown>) {
  const rng = new SeededRandom(Date.now());

  return {
    webhookId: `wh_sandbox_${rng.nextInt(100000, 999999)}`,
    secret: `whsec_sandbox_${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`,
    url: params.url || 'https://example.com/webhook',
    events: params.events || ['ers.stage_changed', 'mood.critical'],
    createdAt: new Date().toISOString(),
  };
}

function getSandboxWebhookListResponse() {
  return {
    webhooks: [
      {
        id: 'wh_sandbox_demo_001',
        url: 'https://example.com/webhooks/paceful',
        events: ['ers.stage_changed', 'mood.critical'],
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastDelivery: {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'success',
          responseTime: 234,
        },
      },
    ],
    total: 1,
  };
}

function getSandboxWebhookDeliveriesListResponse() {
  const deliveries = [
    {
      id: 'del_sandbox_001',
      webhookId: 'wh_sandbox_demo_001',
      eventType: 'ers.stage_changed',
      status: 'delivered',
      httpStatusCode: 200,
      attemptCount: 1,
      maxAttempts: 3,
      nextRetryAt: null,
      deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      failedAt: null,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      durationMs: 234,
    },
    {
      id: 'del_sandbox_002',
      webhookId: 'wh_sandbox_demo_001',
      eventType: 'mood.critical',
      status: 'delivered',
      httpStatusCode: 200,
      attemptCount: 1,
      maxAttempts: 3,
      nextRetryAt: null,
      deliveredAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      failedAt: null,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      durationMs: 187,
    },
    {
      id: 'del_sandbox_003',
      webhookId: 'wh_sandbox_demo_001',
      eventType: 'mood.logged',
      status: 'failed',
      httpStatusCode: 500,
      attemptCount: 3,
      maxAttempts: 3,
      nextRetryAt: null,
      deliveredAt: null,
      failedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      durationMs: 5023,
    },
    {
      id: 'del_sandbox_004',
      webhookId: 'wh_sandbox_demo_001',
      eventType: 'ers.stage_changed',
      status: 'retrying',
      httpStatusCode: 503,
      attemptCount: 1,
      maxAttempts: 3,
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      deliveredAt: null,
      failedAt: null,
      createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      durationMs: 30012,
    },
  ];

  return {
    deliveries,
    pagination: {
      total: deliveries.length,
      limit: 50,
      offset: 0,
      hasMore: false,
    },
  };
}

function getSandboxWebhookDeliveryDetailResponse(params: Record<string, unknown>) {
  const deliveryId = params.deliveryId as string || 'del_sandbox_001';

  return {
    id: deliveryId,
    webhookId: 'wh_sandbox_demo_001',
    eventType: 'ers.stage_changed',
    payload: {
      event: 'ers.stage_changed',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      data: {
        externalId: 'sandbox_user_001',
        previousStage: 'healing',
        newStage: 'rebuilding',
        ersScore: 62,
        previousScore: 45,
      },
    },
    status: 'delivered',
    httpStatusCode: 200,
    responseBody: '{"received":true,"processed":true}',
    attemptCount: 1,
    maxAttempts: 3,
    nextRetryAt: null,
    deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    failedAt: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    durationMs: 234,
  };
}

function getSandboxWebhookDeliveryRetryResponse(params: Record<string, unknown>) {
  const deliveryId = params.deliveryId as string || 'del_sandbox_003';

  return {
    retried: true,
    deliveryId,
    newStatus: 'delivered',
    success: true,
    httpStatusCode: 200,
  };
}

function getSandboxPartnerHealthResponse() {
  return {
    status: 'operational',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    services: {
      api: { status: 'operational', responseTimeMs: 12 },
      database: { status: 'operational', responseTimeMs: 45 },
      ers_engine: { status: 'operational' },
    },
    partner: {
      name: 'Sandbox Demo Partner',
      rateLimitRemaining: 9987,
      rateLimitReset: Math.floor(Date.now() / 1000) + 3600,
      activeWebhooks: 2,
      totalUsersRegistered: 156,
      lastApiCall: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    sdk: {
      latestVersion: '1.1.0',
      minimumSupported: '1.0.0',
    },
  };
}

function getSandboxPartnerInfoResponse() {
  return {
    partnerId: 'sandbox_partner_demo',
    partnerName: 'Sandbox Demo Partner',
    tier: 'enterprise',
    permissions: ['users:write', 'mood:write', 'journal:write', 'ers:read', 'ers:write', 'analytics:read', 'webhooks:write'],
    rateLimit: 10000,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function getSandboxPartnerUsageResponse() {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    const rng = new SeededRandom(date.getTime());
    return {
      date: date.toISOString().split('T')[0],
      requests: rng.nextInt(50, 200),
      uniqueUsers: rng.nextInt(20, 80),
    };
  });

  return {
    currentPeriod: {
      requests: 3847,
      uniqueUsers: 487,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
    byEndpoint: {
      '/partner/mood/log': 1523,
      '/partner/ers/*': 1102,
      '/partner/journal/entry': 687,
      '/partner/users/register': 312,
      '/partner/analytics/summary': 223,
    },
    daily: last30Days,
  };
}

function getSandboxPartnerConfigGetResponse() {
  return {
    config: {
      verbosity: 'minimal',
      tone: 'clinical',
      score_format: 'numerical',
      traffic_light_thresholds: { red_max: 33, yellow_max: 66 },
      include_signals: true,
      include_trend: true,
    },
    is_default: true,
    partner_id: 'sandbox_partner_demo',
  };
}

function getSandboxPartnerConfigPutResponse(params: Record<string, unknown>) {
  const config = params.config as Record<string, unknown> || {};

  return {
    config: {
      verbosity: config.verbosity || 'minimal',
      tone: config.tone || 'clinical',
      score_format: config.score_format || 'numerical',
      traffic_light_thresholds: config.traffic_light_thresholds || { red_max: 33, yellow_max: 66 },
      include_signals: config.include_signals ?? true,
      include_trend: config.include_trend ?? true,
    },
    partner_id: 'sandbox_partner_demo',
    updated_at: new Date().toISOString(),
  };
}

function getSandboxSnapshotQuestionsResponse() {
  return {
    questions: [
      { id: 1, dimension: 'emotional_stability', text: 'Over the past week, how often have you experienced sudden mood swings?', scale: { 1: 'Very often', 2: 'Often', 3: 'Sometimes', 4: 'Rarely', 5: 'Never' } },
      { id: 2, dimension: 'emotional_stability', text: 'When something unexpected happens, how quickly can you regain your emotional balance?', scale: { 1: 'Very slowly', 2: 'Slowly', 3: 'Moderately', 4: 'Quickly', 5: 'Very quickly' } },
      { id: 3, dimension: 'self_reflection', text: 'How well do you understand the patterns in your emotional responses?', scale: { 1: 'Not at all', 2: 'Slightly', 3: 'Moderately', 4: 'Well', 5: 'Very well' } },
      { id: 4, dimension: 'self_reflection', text: 'When thinking about past difficult experiences, how able are you to reflect without becoming overwhelmed?', scale: { 1: 'Unable', 2: 'Rarely able', 3: 'Sometimes able', 4: 'Usually able', 5: 'Fully able' } },
      { id: 5, dimension: 'coping_capacity', text: 'After a stressful day, how well can you use healthy coping strategies?', scale: { 1: 'Not at all', 2: 'Poorly', 3: 'Moderately', 4: 'Well', 5: 'Very well' } },
      { id: 6, dimension: 'coping_capacity', text: 'When faced with a setback, how quickly do you bounce back?', scale: { 1: 'Very slowly', 2: 'Slowly', 3: 'Moderately', 4: 'Quickly', 5: 'Very quickly' } },
      { id: 7, dimension: 'behavioral_engagement', text: 'How consistently have you been maintaining your daily routines?', scale: { 1: 'Not at all', 2: 'Poorly', 3: 'Somewhat', 4: 'Mostly', 5: 'Very consistently' } },
      { id: 8, dimension: 'behavioral_engagement', text: 'How motivated do you feel to work on your personal growth?', scale: { 1: 'Not motivated', 2: 'Slightly motivated', 3: 'Moderately motivated', 4: 'Quite motivated', 5: 'Highly motivated' } },
      { id: 9, dimension: 'social_readiness', text: 'How comfortable do you feel about forming new connections?', scale: { 1: 'Very uncomfortable', 2: 'Uncomfortable', 3: 'Neutral', 4: 'Comfortable', 5: 'Very comfortable' } },
      { id: 10, dimension: 'social_readiness', text: 'In social situations, how present and engaged are you able to be?', scale: { 1: 'Not at all', 2: 'Slightly', 3: 'Moderately', 4: 'Mostly', 5: 'Fully' } },
    ],
    dimensions: [
      { id: 'emotional_stability', name: 'Emotional Stability', weight: 0.25 },
      { id: 'self_reflection', name: 'Self-Reflection', weight: 0.15 },
      { id: 'coping_capacity', name: 'Coping Capacity', weight: 0.20 },
      { id: 'behavioral_engagement', name: 'Behavioral Engagement', weight: 0.15 },
      { id: 'social_readiness', name: 'Social Readiness', weight: 0.25 },
    ],
    instructions: {
      totalQuestions: 10,
      questionsPerDimension: 2,
      scaleType: 'likert',
      scaleRange: { min: 1, max: 5 },
    },
  };
}

function getSandboxSnapshotSubmitResponse(params: Record<string, unknown>) {
  const responses = params.responses as Array<{ value: number }> || [];
  const config = params.config as Record<string, unknown> || {};

  // Calculate a realistic score based on responses
  const totalValue = responses.reduce((sum, r) => sum + (r.value || 3), 0);
  const avgValue = totalValue / Math.max(responses.length, 1);
  const ersSnapshot = Math.round(((avgValue - 1) / 4) * 100);

  const verbosity = (config.verbosity as Verbosity) || 'minimal';
  const tone = (config.tone as Tone) || 'clinical';
  const scoreFormat = (config.score_format as 'numerical' | 'percentage' | 'tier_label' | 'traffic_light') || 'numerical';
  const thresholds = (config.traffic_light_thresholds as { red_max: number; yellow_max: number }) || { red_max: 33, yellow_max: 66 };

  const rng = new SeededRandom(ersSnapshot);
  const dimensionScores = {
    emotional_stability: Math.max(10, Math.min(90, ersSnapshot + rng.nextInt(-15, 15))),
    self_reflection: Math.max(10, Math.min(90, ersSnapshot + rng.nextInt(-15, 15))),
    coping_capacity: Math.max(10, Math.min(90, ersSnapshot + rng.nextInt(-15, 15))),
    behavioral_engagement: Math.max(10, Math.min(90, ersSnapshot + rng.nextInt(-15, 15))),
    social_readiness: Math.max(10, Math.min(90, ersSnapshot + rng.nextInt(-15, 15))),
  };

  const dimensions: Record<string, unknown> = {};
  for (const [dim, score] of Object.entries(dimensionScores)) {
    dimensions[dim] = generateDimensionResult(
      dim as Dimension,
      score,
      verbosity,
      tone,
      scoreFormat,
      thresholds
    );
  }

  // Format overall score
  let formattedErs: number | string = ersSnapshot;
  if (scoreFormat === 'percentage') formattedErs = `${ersSnapshot}%`;
  else if (scoreFormat === 'tier_label') formattedErs = getScoreLabel(ersSnapshot);
  else if (scoreFormat === 'traffic_light') {
    formattedErs = ersSnapshot <= thresholds.red_max ? 'red' : ersSnapshot <= thresholds.yellow_max ? 'yellow' : 'green';
  }

  const response: Record<string, unknown> = {
    ers_snapshot: formattedErs,
    dimensions,
    readiness_label: getReadinessLabel(ersSnapshot),
    confidence: 'estimated',
    assessment_id: `snap_sandbox_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
  };

  if (verbosity !== 'minimal') {
    response.meta = {
      verbosity,
      tone,
      score_format: scoreFormat,
      api_version: '1.3.0',
      model_version: 'ers-v1',
    };
  }

  return response;
}

function getSandboxImportUsersResponse(params: Record<string, unknown>) {
  const users = (params.users as Array<{ externalId: string }>) || [];
  const rng = new SeededRandom(Date.now());

  const results: Array<{
    externalId: string;
    status: 'created' | 'skipped' | 'failed';
    pacefulUserId?: string;
    reason?: string;
  }> = [];

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const externalId = user.externalId || `user_${i}`;

    // Simulate realistic distribution: 90% created, 6% skipped, 4% failed
    const roll = rng.next();
    if (roll < 0.90) {
      results.push({
        externalId,
        status: 'created',
        pacefulUserId: `pf_sandbox_${rng.nextInt(100000, 999999)}`,
      });
      created++;
    } else if (roll < 0.96) {
      results.push({
        externalId,
        status: 'skipped',
        reason: 'already_exists',
      });
      skipped++;
    } else {
      results.push({
        externalId,
        status: 'failed',
        reason: rng.pick(['invalid_external_id', 'database_error']),
      });
      failed++;
    }
  }

  return {
    total: users.length,
    created,
    skipped,
    failed,
    results,
  };
}

function getSandboxImportMoodResponse(params: Record<string, unknown>) {
  const entries = (params.entries as Array<{ externalId: string; timestamp: string }>) || [];
  const rng = new SeededRandom(Date.now());

  const results: Array<{
    externalId: string;
    timestamp: string;
    status: 'created' | 'skipped' | 'failed';
    moodId?: string;
    reason?: string;
  }> = [];

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const externalId = entry.externalId || `user_${i}`;
    const timestamp = entry.timestamp || new Date().toISOString();

    // Simulate realistic distribution: 92% created, 3% skipped (duplicate), 5% failed
    const roll = rng.next();
    if (roll < 0.92) {
      results.push({
        externalId,
        timestamp,
        status: 'created',
        moodId: `mood_sandbox_${rng.nextInt(100000, 999999)}`,
      });
      created++;
    } else if (roll < 0.95) {
      results.push({
        externalId,
        timestamp,
        status: 'skipped',
        reason: 'duplicate_entry',
      });
      skipped++;
    } else {
      results.push({
        externalId,
        timestamp,
        status: 'failed',
        reason: rng.pick(['user_not_found', 'invalid_score', 'invalid_timestamp']),
      });
      failed++;
    }
  }

  return {
    total: entries.length,
    created,
    skipped,
    failed,
    results,
  };
}

// ============================================================================
// ERS Comparison and Benchmarking Sandbox Responses
// ============================================================================

type RelativePosition = 'well_below_average' | 'below_average' | 'average' | 'above_average' | 'well_above_average';

function getRelativePosition(percentile: number): RelativePosition {
  if (percentile < 25) return 'well_below_average';
  if (percentile < 40) return 'below_average';
  if (percentile < 60) return 'average';
  if (percentile < 75) return 'above_average';
  return 'well_above_average';
}

// User profiles with different strengths/weaknesses for realistic sandbox data
const USER_PROFILES: Record<string, {
  strong: Dimension[];
  weak: Dimension[];
  percentileBase: number;
}> = {
  'sandbox_user_001': { strong: ['self_reflection', 'coping_capacity'], weak: ['social_readiness'], percentileBase: 72 },
  'sandbox_user_002': { strong: ['emotional_stability'], weak: ['behavioral_engagement', 'self_reflection'], percentileBase: 45 },
  'sandbox_user_003': { strong: ['behavioral_engagement', 'social_readiness'], weak: ['emotional_stability'], percentileBase: 58 },
  'sandbox_user_004': { strong: ['coping_capacity', 'social_readiness'], weak: ['self_reflection'], percentileBase: 81 },
  'sandbox_user_005': { strong: [], weak: ['emotional_stability', 'coping_capacity', 'social_readiness'], percentileBase: 22 },
  'sandbox_user_006': { strong: ['emotional_stability', 'self_reflection', 'behavioral_engagement'], weak: [], percentileBase: 88 },
};

function getSandboxErsCompareResponse(params: Record<string, unknown>) {
  const externalId = params.externalId as string || 'sandbox_user_001';
  const cohort = (params.cohort as string) || 'same_stage';
  const period = (params.period as string) || '30d';

  const user = getSandboxUser(externalId);
  if (!user) {
    return { error: 'User not found', code: 'NOT_FOUND' };
  }

  const profile = USER_PROFILES[externalId] || {
    strong: ['self_reflection'],
    weak: ['social_readiness'],
    percentileBase: 55,
  };

  const rng = new SeededRandom(hashString(externalId + cohort + period));

  // Calculate cohort stats (simulated)
  const cohortSize = cohort === 'same_partner' ? 487 : cohort === 'same_stage' ? 1523 : 8934;
  const cohortMean = user.stage === 'healing' ? 38 : user.stage === 'rebuilding' ? 58 : 78;
  const cohortMedian = cohortMean + rng.nextInt(-3, 3);
  const cohortStdDev = rng.nextInt(10, 15);

  // Calculate user percentile
  const userPercentile = Math.min(99, Math.max(1, profile.percentileBase + rng.nextInt(-5, 5)));

  // Build dimension comparisons with realistic profiles
  const dimensionComparisons: Record<string, {
    userScore: number;
    cohortMean: number;
    percentileRank: number;
    gap: number;
    relativePosition: RelativePosition;
  }> = {};

  let strongestDim = { dimension: '', gap: -Infinity, percentileRank: 0 };
  let weakestDim = { dimension: '', gap: Infinity, percentileRank: 100 };

  for (const dim of DIMENSIONS) {
    const dimCohortMean = cohortMean + rng.nextInt(-8, 8);
    const userDimScore = user.dimensions[dim];

    // Adjust percentile based on user profile
    let dimPercentile: number;
    if (profile.strong.includes(dim)) {
      dimPercentile = Math.min(99, profile.percentileBase + rng.nextInt(10, 25));
    } else if (profile.weak.includes(dim)) {
      dimPercentile = Math.max(1, profile.percentileBase - rng.nextInt(15, 35));
    } else {
      dimPercentile = Math.min(99, Math.max(1, profile.percentileBase + rng.nextInt(-10, 10)));
    }

    const gap = userDimScore - dimCohortMean;

    dimensionComparisons[dim] = {
      userScore: userDimScore,
      cohortMean: dimCohortMean,
      percentileRank: dimPercentile,
      gap,
      relativePosition: getRelativePosition(dimPercentile),
    };

    if (gap > strongestDim.gap) {
      strongestDim = { dimension: dim, gap, percentileRank: dimPercentile };
    }
    if (gap < weakestDim.gap) {
      weakestDim = { dimension: dim, gap, percentileRank: dimPercentile };
    }
  }

  const cohortLabel = cohort === 'same_stage' ? 'users at the same stage' :
    cohort === 'same_partner' ? 'users in your platform' : 'all users globally';

  const dimLabel = strongestDim.dimension.replace(/_/g, ' ');
  let progress = '';
  if (userPercentile >= 75) {
    progress = `progressing faster than ${userPercentile}% of ${cohortLabel}`;
  } else if (userPercentile >= 50) {
    progress = `performing better than ${userPercentile}% of ${cohortLabel}`;
  } else if (userPercentile >= 25) {
    progress = `on par with most ${cohortLabel}, with room for growth`;
  } else {
    progress = `in the early stages compared to ${cohortLabel}, with significant growth potential`;
  }

  const summary = `This user's ${dimLabel} is significantly above the cohort average, ranking in the ${strongestDim.percentileRank}th percentile. Overall, they are ${progress}.`;

  const response: Record<string, unknown> = {
    userId: externalId,
    currentScore: user.ersScore,
    currentStage: user.stage,
    cohort,
    cohortSize,
    comparison: {
      overall: {
        userScore: user.ersScore,
        cohortMean,
        cohortMedian,
        cohortStdDev,
        percentileRank: userPercentile,
        percentiles: {
          p25: cohortMean - cohortStdDev,
          p50: cohortMedian,
          p75: cohortMean + Math.round(cohortStdDev * 0.7),
          p90: cohortMean + Math.round(cohortStdDev * 1.3),
        },
        relativePosition: getRelativePosition(userPercentile),
      },
      dimensions: dimensionComparisons,
      insights: {
        strongestDimension: strongestDim,
        weakestDimension: weakestDim,
        summary,
      },
    },
  };

  if (cohortSize < 10) {
    response.warning = 'Cohort size is less than 10. Benchmarks may not be statistically significant.';
  }

  return response;
}

function getSandboxErsBenchmarksResponse(params: Record<string, unknown>) {
  const cohort = (params.cohort as string) || 'same_partner';
  const period = (params.period as string) || '30d';
  const stage = (params.stage as string) || 'all';

  const rng = new SeededRandom(hashString(cohort + period + stage));

  const cohortSize = cohort === 'same_partner' ? 487 : 8934;

  // Adjust stats based on stage filter
  let mean: number, median: number, stdDev: number;
  if (stage === 'healing') {
    mean = 35 + rng.nextInt(-3, 3);
    median = mean + rng.nextInt(-2, 2);
    stdDev = 8 + rng.next() * 3;
  } else if (stage === 'rebuilding') {
    mean = 58 + rng.nextInt(-3, 3);
    median = mean + rng.nextInt(-2, 2);
    stdDev = 10 + rng.next() * 3;
  } else if (stage === 'ready') {
    mean = 82 + rng.nextInt(-3, 3);
    median = mean + rng.nextInt(-2, 2);
    stdDev = 7 + rng.next() * 2;
  } else {
    mean = 56 + rng.nextInt(-3, 3);
    median = mean + rng.nextInt(-2, 2);
    stdDev = 15 + rng.next() * 3;
  }

  const percentiles = {
    p25: Math.round(mean - stdDev * 0.67),
    p50: Math.round(median),
    p75: Math.round(mean + stdDev * 0.67),
    p90: Math.round(mean + stdDev * 1.28),
  };

  // Distribution across score ranges
  const distribution = {
    '0-20': stage === 'healing' ? 0.12 : 0.03,
    '21-40': stage === 'healing' ? 0.48 : stage === 'rebuilding' ? 0.08 : 0.02,
    '41-60': stage === 'rebuilding' ? 0.52 : stage === 'healing' ? 0.32 : 0.05,
    '61-80': stage === 'rebuilding' ? 0.28 : stage === 'ready' ? 0.45 : 0.25,
    '81-100': stage === 'ready' ? 0.48 : 0.12,
  };

  // Dimension stats
  const dimensionStats: Record<string, { mean: number; median: number; stdDev: number }> = {};
  for (const dim of DIMENSIONS) {
    const dimMean = mean + rng.nextInt(-8, 8);
    dimensionStats[dim] = {
      mean: dimMean,
      median: dimMean + rng.nextInt(-3, 3),
      stdDev: Math.round((stdDev + rng.nextInt(-2, 2)) * 10) / 10,
    };
  }

  // By-stage stats (only if stage filter is 'all')
  let byStage: Record<string, { count: number; meanScore: number; avgDaysInStage: number }> | null = null;
  if (stage === 'all') {
    const totalCount = cohortSize;
    byStage = {
      healing: {
        count: Math.round(totalCount * 0.18),
        meanScore: 35 + rng.nextInt(-3, 3),
        avgDaysInStage: 21 + rng.nextInt(-5, 10),
      },
      rebuilding: {
        count: Math.round(totalCount * 0.52),
        meanScore: 58 + rng.nextInt(-3, 3),
        avgDaysInStage: 34 + rng.nextInt(-8, 15),
      },
      ready: {
        count: Math.round(totalCount * 0.30),
        meanScore: 82 + rng.nextInt(-3, 3),
        avgDaysInStage: 18 + rng.nextInt(-5, 12),
      },
    };
  }

  const response: Record<string, unknown> = {
    cohort,
    cohortSize,
    period,
    stage,
    benchmarks: {
      overall: {
        mean: Math.round(mean),
        median: Math.round(median),
        stdDev: Math.round(stdDev * 10) / 10,
        percentiles,
        distribution,
      },
      dimensions: dimensionStats,
      ...(byStage && { byStage }),
    },
  };

  if (cohortSize < 10) {
    response.warning = 'Cohort size is less than 10. Benchmarks may not be statistically significant.';
  }

  return response;
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  emotional_stability: 'Emotional Stability',
  self_reflection: 'Self-Reflection',
  coping_capacity: 'Coping Capacity',
  behavioral_engagement: 'Behavioral Engagement',
  social_readiness: 'Social Readiness',
};

const DIMENSION_ACTIONS: Record<Dimension, string[]> = {
  emotional_stability: [
    'Encourage daily mood logging at consistent times',
    'Identify and flag emotional triggers through pattern analysis',
    'Suggest grounding exercises during high-variance periods',
    'Implement gentle check-ins after mood dips',
  ],
  self_reflection: [
    'Introduce guided journaling prompts focused on self-awareness',
    'Encourage reflection on recent positive experiences',
    'Suggest weekly review sessions to identify patterns',
    'Provide feedback on journal depth and consistency',
  ],
  coping_capacity: [
    'Introduce structured coping exercises (breathing, mindfulness)',
    'Increase check-in frequency to build consistency',
    'Track specific coping triggers and responses',
    'Suggest progressive skill-building exercises',
  ],
  behavioral_engagement: [
    'Set achievable daily micro-goals for engagement',
    'Celebrate small wins and consistent behaviors',
    'Create accountability through gentle reminders',
    'Track and visualize engagement streaks',
  ],
  social_readiness: [
    'Gradually introduce low-pressure social activities',
    'Encourage reflection on positive social experiences',
    'Suggest starting with familiar, supportive connections',
    'Build confidence through small social wins',
  ],
};

function getSandboxErsRecommendationsResponse(params: Record<string, unknown>) {
  const externalId = params.externalId as string || 'sandbox_user_001';

  const user = getSandboxUser(externalId);
  if (!user) {
    return { error: 'User not found', code: 'NOT_FOUND' };
  }

  const profile = USER_PROFILES[externalId] || {
    strong: ['self_reflection'],
    weak: ['social_readiness'],
    percentileBase: 55,
  };

  const rng = new SeededRandom(hashString(externalId + 'recommendations'));

  // Calculate cohort mean based on stage
  const cohortMean = user.stage === 'healing' ? 38 : user.stage === 'rebuilding' ? 58 : 78;

  // Analyze each dimension
  interface DimAnalysis {
    dimension: Dimension;
    userScore: number;
    cohortMean: number;
    percentileRank: number;
    gap: number;
  }

  const dimensionAnalyses: DimAnalysis[] = [];

  for (const dim of DIMENSIONS) {
    const dimCohortMean = cohortMean + rng.nextInt(-8, 8);
    const userDimScore = user.dimensions[dim];

    let dimPercentile: number;
    if (profile.strong.includes(dim)) {
      dimPercentile = Math.min(99, profile.percentileBase + rng.nextInt(10, 25));
    } else if (profile.weak.includes(dim)) {
      dimPercentile = Math.max(1, profile.percentileBase - rng.nextInt(15, 35));
    } else {
      dimPercentile = Math.min(99, Math.max(1, profile.percentileBase + rng.nextInt(-10, 10)));
    }

    const gap = userDimScore - dimCohortMean;

    dimensionAnalyses.push({
      dimension: dim,
      userScore: userDimScore,
      cohortMean: dimCohortMean,
      percentileRank: dimPercentile,
      gap,
    });
  }

  // Sort by gap (ascending) to find weakest dimensions
  const sortedByGap = [...dimensionAnalyses].sort((a, b) => a.gap - b.gap);

  // Get 2 weakest dimensions for recommendations
  const weakestTwo = sortedByGap.slice(0, 2);

  // Get strongest dimensions (top 2 by gap)
  const strongestTwo = sortedByGap.slice(-2).reverse();

  // Helper function to generate insight
  function generateInsight(
    dimension: Dimension,
    analysis: DimAnalysis,
    priority: 'primary' | 'secondary',
    isStrength: boolean = false
  ): string {
    const label = DIMENSION_LABELS[dimension];

    if (isStrength) {
      if (analysis.percentileRank >= 90) {
        return `${label} is exceptional, placing in the top 10% of users. This is a significant strength to leverage.`;
      }
      return `${label} shows strong development, ranking in the ${analysis.percentileRank}th percentile. This strength can support growth in other areas.`;
    }

    if (analysis.percentileRank < 25) {
      return `${label} is significantly below the cohort average, ranking in the ${analysis.percentileRank}th percentile. This represents a key opportunity for targeted intervention.`;
    }

    if (analysis.percentileRank < 50) {
      return `${label} is below average compared to peers. Focused attention here could yield meaningful improvements.`;
    }

    if (priority === 'primary') {
      return `${label} is this user's least developed dimension relative to peers. While not below average, it represents the biggest opportunity for growth.`;
    }

    return `${label} shows room for improvement. Moderate attention here could help accelerate overall recovery.`;
  }

  // Build recommendations
  const recommendations = weakestTwo.map((analysis, index) => {
    const priority = index === 0 ? 'primary' : 'secondary';
    const actions = DIMENSION_ACTIONS[analysis.dimension];
    const selectedActions = actions.slice(0, 3);

    return {
      dimension: analysis.dimension,
      currentScore: analysis.userScore,
      cohortAverage: analysis.cohortMean,
      percentileRank: analysis.percentileRank,
      priority,
      insight: generateInsight(analysis.dimension, analysis, priority as 'primary' | 'secondary'),
      suggestedActions: selectedActions,
    };
  });

  // Build strengths
  const strengths = strongestTwo
    .filter(a => a.percentileRank >= 60)
    .map(analysis => ({
      dimension: analysis.dimension,
      percentileRank: analysis.percentileRank,
      note: generateInsight(analysis.dimension, analysis, 'primary', true),
    }));

  return {
    userId: externalId,
    currentScore: user.ersScore,
    currentStage: user.stage,
    recommendations,
    strengths,
  };
}

// ============================================================================
// Text Analysis Sandbox Response
// ============================================================================

function getSandboxTextAnalyzeResponse(params: Record<string, unknown>) {
  const userId = params.user_id as string || 'sandbox_user_001';
  const sourceType = params.source_type as string || 'free_text';
  const text = params.text as string || '';
  const textLength = text.length || 250;
  const config = params.config as Record<string, unknown> || {};

  const rng = new SeededRandom(hashString(userId + sourceType + textLength.toString()));

  // Generate realistic scores based on text length (more text = higher confidence)
  const confidence = textLength > 500 ? 'high' : textLength > 200 ? 'medium' : 'low';

  // Generate dimension scores with some variance
  const baseScore = 55 + rng.nextInt(-15, 20);
  const dimensionData: Record<string, { score: number; top_signals: string[]; confidence: string }> = {
    emotional_stability: {
      score: Math.max(20, Math.min(90, baseScore + rng.nextInt(-12, 12))),
      top_signals: ['mood consistency', 'emotional regulation language'],
      confidence: confidence,
    },
    self_reflection: {
      score: Math.max(20, Math.min(90, baseScore + rng.nextInt(-12, 12))),
      top_signals: ['self-awareness statements', 'pattern recognition'],
      confidence: confidence,
    },
    coping_capacity: {
      score: Math.max(20, Math.min(90, baseScore + rng.nextInt(-12, 12))),
      top_signals: ['coping strategy mentions', 'problem-solving approach'],
      confidence: confidence,
    },
    behavioral_engagement: {
      score: Math.max(20, Math.min(90, baseScore + rng.nextInt(-12, 12))),
      top_signals: ['activity descriptions', 'routine consistency'],
      confidence: confidence,
    },
    social_readiness: {
      score: Math.max(20, Math.min(90, baseScore + rng.nextInt(-12, 12))),
      top_signals: ['social interaction mentions', 'connection quality'],
      confidence: confidence,
    },
  };

  // Calculate weighted ERS score
  const weights: Record<string, number> = {
    emotional_stability: 0.25,
    self_reflection: 0.15,
    coping_capacity: 0.20,
    behavioral_engagement: 0.15,
    social_readiness: 0.25,
  };

  let ersScore = 0;
  for (const [dim, weight] of Object.entries(weights)) {
    ersScore += dimensionData[dim].score * weight;
  }
  ersScore = Math.round(ersScore);

  const readinessLabel = ersScore < 40 ? 'Not Ready' : ersScore < 60 ? 'Healing' : ersScore < 75 ? 'Rebuilding' : 'Ready';

  const verbosity = (config.verbosity as string) || 'minimal';

  // Build dimensions response based on verbosity
  const dimensions: Record<string, unknown> = {};
  for (const [dim, data] of Object.entries(dimensionData)) {
    const label = data.score < 25 ? 'very_low' : data.score < 40 ? 'low' : data.score < 60 ? 'moderate' : data.score < 80 ? 'high' : 'very_high';

    if (verbosity === 'minimal') {
      dimensions[dim] = {
        score: data.score,
        label,
        confidence: data.confidence,
      };
    } else {
      const dimLabel = dim.replace(/_/g, ' ');
      const reasoning = data.score >= 70
        ? `${dimLabel} indicators are strong. Key signals: ${data.top_signals.join(' and ')}.`
        : data.score >= 40
        ? `${dimLabel} indicators are moderate. Key signals: ${data.top_signals.join(' and ')}.`
        : `${dimLabel} indicators suggest need for support. Key signals: ${data.top_signals.join(' and ')}.`;

      const result: Record<string, unknown> = {
        score: data.score,
        label,
        confidence: data.confidence,
        reasoning,
        top_signals: data.top_signals,
      };

      if (verbosity === 'clinical') {
        result.recommended_action = data.score < 40
          ? `Consider targeted intervention for ${dimLabel.toLowerCase()}.`
          : data.score < 70
          ? `Continue building ${dimLabel.toLowerCase()} with structured exercises.`
          : `${dimLabel} is strong. Maintain current practices.`;
      }

      dimensions[dim] = result;
    }
  }

  const response: Record<string, unknown> = {
    ers_snapshot: ersScore,
    dimensions,
    readiness_label: readinessLabel,
    confidence,
    assessment_id: `anlz_sandbox_${rng.nextInt(100000, 999999)}`,
    timestamp: new Date().toISOString(),
    source_type: sourceType,
    text_length: textLength,
    extraction_confidence: confidence,
  };

  if (verbosity !== 'minimal') {
    response.meta = {
      verbosity,
      tone: (config.tone as string) || 'clinical',
      score_format: (config.score_format as string) || 'numerical',
      api_version: '1.3.0',
      model_version: 'ers-text-v1',
      extraction_notes: 'Sandbox mode - generated realistic scores based on text characteristics.',
    };
  }

  return response;
}

// ============================================================================
// List of available sandbox endpoints
// ============================================================================

export const SANDBOX_ENDPOINTS = [
  { method: 'POST', path: '/api/v1/partner/users/register', description: 'Register a user' },
  { method: 'POST', path: '/api/v1/partner/mood/log', description: 'Log mood entry' },
  { method: 'POST', path: '/api/v1/partner/journal/entry', description: 'Create journal entry' },
  { method: 'GET', path: '/api/v1/partner/ers/{externalId}', description: 'Get ERS score' },
  { method: 'GET', path: '/api/v1/partner/ers/{externalId}/history', description: 'Get ERS history and trends' },
  { method: 'GET', path: '/api/v1/partner/ers/trends/aggregate', description: 'Aggregate ERS trends across all users' },
  { method: 'POST', path: '/api/v1/partner/ers/calculate', description: 'Calculate ERS score' },
  { method: 'POST', path: '/api/v1/partner/ers/batch', description: 'Batch get ERS scores' },
  { method: 'GET', path: '/api/v1/partner/analytics/summary', description: 'Get analytics summary' },
  { method: 'POST', path: '/api/v1/partner/webhooks/register', description: 'Register webhook' },
  { method: 'GET', path: '/api/v1/partner/webhooks/list', description: 'List webhooks' },
  { method: 'GET', path: '/api/v1/partner/webhooks/deliveries', description: 'List webhook deliveries' },
  { method: 'GET', path: '/api/v1/partner/webhooks/deliveries/{deliveryId}', description: 'Get delivery details' },
  { method: 'POST', path: '/api/v1/partner/webhooks/deliveries/{deliveryId}/retry', description: 'Retry failed delivery' },
  { method: 'GET', path: '/api/v1/partner/health', description: 'Partner health check with details' },
  { method: 'GET', path: '/api/v1/partner/info', description: 'Get partner info' },
  { method: 'GET', path: '/api/v1/partner/usage', description: 'Get usage statistics' },
  { method: 'GET', path: '/api/v1/partner/config', description: 'Get partner config' },
  { method: 'PUT', path: '/api/v1/partner/config', description: 'Update partner config' },
  { method: 'GET', path: '/api/v1/assess/snapshot/questions', description: 'Get snapshot questions' },
  { method: 'POST', path: '/api/v1/assess/snapshot', description: 'Submit snapshot assessment' },
  { method: 'POST', path: '/api/v1/partner/import/users', description: 'Bulk import users' },
  { method: 'POST', path: '/api/v1/partner/import/mood', description: 'Bulk import mood entries' },
  { method: 'GET', path: '/api/v1/partner/ers/{externalId}/compare', description: 'Compare user ERS against cohort' },
  { method: 'GET', path: '/api/v1/partner/ers/benchmarks', description: 'Get cohort benchmarks' },
  { method: 'GET', path: '/api/v1/partner/ers/{externalId}/recommendations', description: 'Get improvement recommendations' },
  { method: 'POST', path: '/api/v1/assess/analyze', description: 'Analyze text for ERS signals' },
];
