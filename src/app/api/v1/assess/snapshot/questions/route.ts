/**
 * GET /api/v1/assess/snapshot/questions
 *
 * Returns the 10 clinically-informed questions for the Snapshot Assessment.
 * Each question maps to one of 5 dimensions (2 questions per dimension).
 */

import { NextRequest } from 'next/server';
import {
  validatePartnerKey,
  checkEndpointRateLimit,
  logPartnerApiUsage,
  partnerApiError,
  partnerApiSuccess,
  handlePartnerCors,
} from '@/lib/partner-auth';
import { extractApiKey, isSandboxRequest, sandboxResponse } from '@/lib/sandbox-middleware';

// Clinically-informed questions for emotional readiness assessment
// Each dimension has 2 questions, scored on a 1-5 Likert scale
const SNAPSHOT_QUESTIONS = [
  // Emotional Stability (2 questions)
  {
    id: 1,
    dimension: 'emotional_stability',
    text: 'Over the past week, how often have you experienced sudden mood swings or emotional ups and downs?',
    scale: {
      1: 'Very often (multiple times daily)',
      2: 'Often (daily)',
      3: 'Sometimes (a few times this week)',
      4: 'Rarely (once or twice)',
      5: 'Never or almost never',
    },
  },
  {
    id: 2,
    dimension: 'emotional_stability',
    text: 'When something unexpected happens, how quickly are you typically able to regain your emotional balance?',
    scale: {
      1: 'Very slowly (hours to days)',
      2: 'Slowly (several hours)',
      3: 'Moderately (within an hour or two)',
      4: 'Quickly (within minutes)',
      5: 'Very quickly (almost immediately)',
    },
  },

  // Self-Reflection (2 questions)
  {
    id: 3,
    dimension: 'self_reflection',
    text: 'How well do you understand the patterns in your emotional responses to difficult situations?',
    scale: {
      1: 'Not at all — I feel confused by my reactions',
      2: 'Slightly — I notice some patterns occasionally',
      3: 'Moderately — I understand some of my patterns',
      4: 'Well — I have good insight into my patterns',
      5: 'Very well — I deeply understand my emotional patterns',
    },
  },
  {
    id: 4,
    dimension: 'self_reflection',
    text: 'When thinking about past difficult experiences, how able are you to reflect on them without becoming overwhelmed?',
    scale: {
      1: 'Unable — thinking about the past is too painful',
      2: 'Rarely able — I often feel overwhelmed',
      3: 'Sometimes able — it depends on the memory',
      4: 'Usually able — I can reflect with some discomfort',
      5: 'Fully able — I can reflect calmly and learn from the past',
    },
  },

  // Coping Capacity (2 questions)
  {
    id: 5,
    dimension: 'coping_capacity',
    text: 'After a particularly stressful day, how well are you able to use healthy coping strategies to decompress?',
    scale: {
      1: 'Not at all — I struggle to cope or use unhealthy habits',
      2: 'Poorly — I have few strategies that work',
      3: 'Moderately — some strategies help sometimes',
      4: 'Well — I have reliable strategies that help',
      5: 'Very well — I have multiple effective strategies',
    },
  },
  {
    id: 6,
    dimension: 'coping_capacity',
    text: 'When faced with a setback, how quickly do you typically bounce back and continue forward?',
    scale: {
      1: 'Very slowly — setbacks derail me for days or weeks',
      2: 'Slowly — I need a few days to recover',
      3: 'Moderately — I recover within a day or two',
      4: 'Quickly — I usually recover within hours',
      5: 'Very quickly — I adapt and move forward almost immediately',
    },
  },

  // Behavioral Engagement (2 questions)
  {
    id: 7,
    dimension: 'behavioral_engagement',
    text: 'How consistently have you been maintaining your daily routines and self-care practices?',
    scale: {
      1: 'Not at all — my routines have fallen apart',
      2: 'Poorly — I struggle to maintain any routine',
      3: 'Somewhat — I maintain some routines inconsistently',
      4: 'Mostly — I maintain most routines with occasional lapses',
      5: 'Very consistently — I have strong, regular routines',
    },
  },
  {
    id: 8,
    dimension: 'behavioral_engagement',
    text: 'How motivated do you feel to actively work on your personal growth and well-being?',
    scale: {
      1: 'Not motivated at all — I have no energy for growth',
      2: 'Slightly motivated — but rarely take action',
      3: 'Moderately motivated — I take action sometimes',
      4: 'Quite motivated — I regularly work on myself',
      5: 'Highly motivated — personal growth is a daily priority',
    },
  },

  // Social Readiness (2 questions)
  {
    id: 9,
    dimension: 'social_readiness',
    text: 'How comfortable do you feel about the prospect of forming new meaningful connections or relationships?',
    scale: {
      1: 'Very uncomfortable — the thought feels overwhelming',
      2: 'Uncomfortable — I have significant hesitation',
      3: 'Neutral — I have mixed feelings',
      4: 'Comfortable — I feel cautiously open',
      5: 'Very comfortable — I feel ready and open',
    },
  },
  {
    id: 10,
    dimension: 'social_readiness',
    text: 'In social situations, how present and engaged are you able to be?',
    scale: {
      1: 'Not at all — I feel disconnected or want to leave',
      2: 'Slightly — I go through the motions but feel distant',
      3: 'Moderately — I can engage but it takes effort',
      4: 'Mostly — I can be present with occasional distraction',
      5: 'Fully — I feel genuinely present and engaged',
    },
  },
];

const DIMENSIONS = [
  {
    id: 'emotional_stability',
    name: 'Emotional Stability',
    description: 'Ability to maintain emotional equilibrium and recover from emotional disruptions',
    weight: 0.25,
  },
  {
    id: 'self_reflection',
    name: 'Self-Reflection',
    description: 'Capacity to process past experiences and understand emotional patterns',
    weight: 0.15,
  },
  {
    id: 'coping_capacity',
    name: 'Coping Capacity',
    description: 'Ability to handle stress and bounce back from setbacks',
    weight: 0.20,
  },
  {
    id: 'behavioral_engagement',
    name: 'Behavioral Engagement',
    description: 'Consistency in maintaining routines and actively working on well-being',
    weight: 0.15,
  },
  {
    id: 'social_readiness',
    name: 'Social Readiness',
    description: 'Openness to new connections and ability to be present in social settings',
    weight: 0.25,
  },
];

export async function OPTIONS() {
  return handlePartnerCors();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check for sandbox mode first
  const apiKey = extractApiKey(request.headers);
  if (apiKey && isSandboxRequest(apiKey)) {
    return sandboxResponse('snapshot_questions', {});
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

  // Log API usage
  await logPartnerApiUsage(
    validation.partnerId!,
    '/api/v1/assess/snapshot/questions',
    'GET',
    200,
    Date.now() - startTime
  );

  return partnerApiSuccess({
    questions: SNAPSHOT_QUESTIONS,
    dimensions: DIMENSIONS,
    instructions: {
      totalQuestions: 10,
      questionsPerDimension: 2,
      scaleType: 'likert',
      scaleRange: { min: 1, max: 5 },
      scoringNote: 'Higher values indicate greater emotional readiness',
    },
  }, 200, undefined, rateLimit);
}
