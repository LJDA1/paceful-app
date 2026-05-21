/**
 * Tests for POST /api/v1/assess/analyze
 *
 * Tests text analysis endpoint with various scenarios including:
 * - Dimension-specific scoring based on text content
 * - Confidence levels based on text length
 * - Error handling for invalid inputs
 * - Authentication requirements
 */

import { NextRequest } from 'next/server';

// Mock Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));
});

// Mock partner-auth
const mockValidatePartnerKey = jest.fn();
const mockCheckEndpointRateLimit = jest.fn();
const mockLogPartnerApiUsage = jest.fn();
const mockGetSupabaseAdmin = jest.fn();

jest.mock('@/lib/partner-auth', () => ({
  validatePartnerKey: (...args: unknown[]) => mockValidatePartnerKey(...args),
  checkEndpointRateLimit: (...args: unknown[]) => mockCheckEndpointRateLimit(...args),
  logPartnerApiUsage: (...args: unknown[]) => mockLogPartnerApiUsage(...args),
  partnerApiError: jest.fn((message, code, status) => {
    return new Response(JSON.stringify({ success: false, error: { message, code } }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  partnerApiSuccess: jest.fn((data, status = 200) => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  handlePartnerCors: jest.fn(() => new Response(null, { status: 204 })),
  getSupabaseAdmin: () => mockGetSupabaseAdmin(),
}));

// Mock sandbox-middleware
jest.mock('@/lib/sandbox-middleware', () => ({
  extractApiKey: jest.fn((headers) => headers.get('X-API-Key') || headers.get('Authorization')?.replace('Bearer ', '')),
  isSandboxRequest: jest.fn((key) => key?.startsWith('pk_sandbox_')),
  sandboxResponse: jest.fn(() => new Response(JSON.stringify({ success: true, data: { sandbox: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })),
}));

// Import the route handler after mocks are set up
import { POST } from '@/app/api/v1/assess/analyze/route';

// Helper to create mock request
function createMockRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': 'pk_test_valid_key',
    ...headers,
  };

  return new NextRequest('http://localhost:3000/api/v1/assess/analyze', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });
}

// Helper to create Claude response
function createClaudeResponse(
  dimensions: Record<string, { score?: number; reasoning?: string; top_signals?: string[]; confidence?: string }>,
  overall_confidence: 'low' | 'medium' | 'high' = 'medium'
) {
  const fullDimensions = {
    emotional_stability: { score: 50, reasoning: '', top_signals: ['neutral'], confidence: 'medium', ...dimensions.emotional_stability },
    self_reflection: { score: 50, reasoning: '', top_signals: ['neutral'], confidence: 'medium', ...dimensions.self_reflection },
    coping_capacity: { score: 50, reasoning: '', top_signals: ['neutral'], confidence: 'medium', ...dimensions.coping_capacity },
    behavioral_engagement: { score: 50, reasoning: '', top_signals: ['neutral'], confidence: 'medium', ...dimensions.behavioral_engagement },
    social_readiness: { score: 50, reasoning: '', top_signals: ['neutral'], confidence: 'medium', ...dimensions.social_readiness },
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        dimensions: fullDimensions,
        overall_confidence,
        extraction_notes: 'Test analysis',
        welfare_flag: false,
        welfare_note: '',
      }),
    }],
  };
}

// Default mock setup
function setupDefaultMocks() {
  mockValidatePartnerKey.mockResolvedValue({
    valid: true,
    partnerId: 'test-partner-id',
    rateLimit: 1000,
  });

  mockCheckEndpointRateLimit.mockResolvedValue({
    allowed: true,
    limit: 100,
    remaining: 99,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });

  mockLogPartnerApiUsage.mockResolvedValue(undefined);

  mockGetSupabaseAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  });
}

describe('POST /api/v1/assess/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  describe('Dimension-specific scoring', () => {
    test('1. Journal entry with clear emotional instability → low emotional_stability score', async () => {
      const unstableText = `
        I can't control my emotions anymore. One moment I'm fine, the next I'm crying uncontrollably.
        My mood swings are getting worse every day. I feel like I'm on an emotional roller coaster
        that never stops. I snap at people for no reason and then feel terrible about it. My feelings
        are completely unpredictable and overwhelming. I go from happy to devastated in minutes.
      `;

      mockCreate.mockResolvedValueOnce(createClaudeResponse({
        emotional_stability: { score: 25, top_signals: ['mood swings', 'uncontrollable emotions', 'unpredictable feelings'], confidence: 'high' },
      }));

      const request = createMockRequest({
        user_id: 'test-user-1',
        text: unstableText,
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dimensions.emotional_stability.score).toBeLessThanOrEqual(40);
      expect(data.data.dimensions.emotional_stability.confidence).toBe('high');
    });

    test('2. Therapy session notes showing high self-awareness → high self_reflection score', async () => {
      const selfAwareText = `
        Patient demonstrates exceptional self-awareness and insight. They clearly articulate their
        emotional patterns and recognize triggers from childhood. They've identified that their
        anxiety often stems from fear of abandonment and have connected this to early experiences.
        They show remarkable ability to observe their own thought processes without judgment.
        Their journaling reveals deep introspection and pattern recognition across situations.
      `;

      mockCreate.mockResolvedValueOnce(createClaudeResponse({
        self_reflection: { score: 85, top_signals: ['exceptional self-awareness', 'pattern recognition', 'deep introspection'], confidence: 'high' },
      }));

      const request = createMockRequest({
        user_id: 'test-user-2',
        text: selfAwareText,
        source_type: 'session_notes',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dimensions.self_reflection.score).toBeGreaterThanOrEqual(70);
    });

    test('3. Chat transcript with social withdrawal language → low social_readiness', async () => {
      const withdrawnText = `
        User: I don't want to see anyone anymore
        Bot: What's making you feel that way?
        User: People are exhausting. I can't trust anyone. Every time I open up I get hurt.
        I've cancelled plans with friends three times this week. I'd rather be alone.
        I don't think I'll ever be ready for a relationship again. Social situations
        make me anxious and I just want to hide from everyone.
      `;

      mockCreate.mockResolvedValueOnce(createClaudeResponse({
        social_readiness: { score: 20, top_signals: ['don\'t want to see anyone', 'can\'t trust anyone', 'rather be alone'], confidence: 'high' },
      }));

      const request = createMockRequest({
        user_id: 'test-user-3',
        text: withdrawnText,
        source_type: 'chat_transcript',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dimensions.social_readiness.score).toBeLessThanOrEqual(35);
    });

    test('4. Recovery journal with strong coping strategies → high coping_capacity', async () => {
      const copingText = `
        When I felt the anxiety coming on today, I used the breathing technique my therapist
        taught me - 4-7-8 breathing for five minutes. It really helped ground me. I also went
        for a 30-minute walk in nature which always calms me down. I've been keeping a list
        of healthy coping strategies and I'm getting better at reaching for them instead of
        unhealthy patterns. I called a supportive friend and talked through my feelings.
        I'm building a solid toolkit for managing difficult emotions.
      `;

      mockCreate.mockResolvedValueOnce(createClaudeResponse({
        coping_capacity: { score: 82, top_signals: ['breathing technique', 'healthy coping strategies', 'solid toolkit'], confidence: 'high' },
      }));

      const request = createMockRequest({
        user_id: 'test-user-4',
        text: copingText,
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dimensions.coping_capacity.score).toBeGreaterThanOrEqual(70);
    });

    test('5. Text with high engagement signals → high behavioral_engagement', async () => {
      const engagedText = `
        I've been sticking to my morning routine for three weeks straight now. Wake up at 6am,
        meditate for 20 minutes, exercise for 45 minutes, then healthy breakfast. I completed
        all my therapy homework assignments and even did extra journaling. I've been tracking
        my habits daily and can see real progress. Set three goals this week and achieved all
        of them. I'm motivated to keep growing and improving every day. My streak of self-care
        activities is the longest it's ever been.
      `;

      mockCreate.mockResolvedValueOnce(createClaudeResponse({
        behavioral_engagement: { score: 88, top_signals: ['consistent routine', 'completed assignments', 'daily tracking'], confidence: 'high' },
      }));

      const request = createMockRequest({
        user_id: 'test-user-5',
        text: engagedText,
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dimensions.behavioral_engagement.score).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Confidence scoring', () => {
    test('6. Very short text (< 50 chars) → low confidence scores', async () => {
      const shortText = 'I feel okay today. Nothing special.';

      mockCreate.mockResolvedValueOnce(createClaudeResponse({
        emotional_stability: { score: 50, confidence: 'low' },
        self_reflection: { score: 50, confidence: 'low' },
        coping_capacity: { score: 50, confidence: 'low' },
        behavioral_engagement: { score: 50, confidence: 'low' },
        social_readiness: { score: 50, confidence: 'low' },
      }, 'low'));

      const request = createMockRequest({
        user_id: 'test-user-6',
        text: shortText,
        source_type: 'free_text',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.confidence).toBe('low');
      // Check each dimension has low confidence
      for (const dim of ['emotional_stability', 'self_reflection', 'coping_capacity', 'behavioral_engagement', 'social_readiness']) {
        expect(data.data.dimensions[dim].confidence).toBe('low');
      }
    });

    test('7. Mixed signals text → moderate scores with appropriate confidence', async () => {
      const mixedText = `
        Some days I feel really stable and in control, other days not so much. I've been trying
        to journal but it's inconsistent. I have a few coping strategies that work sometimes.
        I'm not sure if I'm ready for dating again but I don't completely avoid social situations.
        I exercise when I feel like it, maybe twice a week. My self-awareness is growing but
        I still get surprised by my reactions sometimes. It's a mixed bag overall.
      `;

      mockCreate.mockResolvedValueOnce(createClaudeResponse({
        emotional_stability: { score: 52, confidence: 'medium' },
        self_reflection: { score: 48, confidence: 'medium' },
        coping_capacity: { score: 55, confidence: 'medium' },
        behavioral_engagement: { score: 45, confidence: 'medium' },
        social_readiness: { score: 50, confidence: 'medium' },
      }));

      const request = createMockRequest({
        user_id: 'test-user-7',
        text: mixedText,
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // All scores should be in moderate range (40-60)
      for (const dim of ['emotional_stability', 'self_reflection', 'coping_capacity', 'behavioral_engagement', 'social_readiness']) {
        expect(data.data.dimensions[dim].score).toBeGreaterThanOrEqual(40);
        expect(data.data.dimensions[dim].score).toBeLessThanOrEqual(60);
        expect(data.data.dimensions[dim].confidence).toBe('medium');
      }
    });
  });

  describe('Error handling', () => {
    test('8. Empty text → 400 error', async () => {
      const request = createMockRequest({
        user_id: 'test-user-8',
        text: '',
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    });

    test('9. Missing auth → 401', async () => {
      mockValidatePartnerKey.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid API key',
      });

      const request = createMockRequest({
        user_id: 'test-user-9',
        text: 'This is a valid text entry with enough characters to process.',
        source_type: 'journal',
      }, { 'X-API-Key': 'invalid_key' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    test('10. Text too short (< 20 chars) → 400 error', async () => {
      const request = createMockRequest({
        user_id: 'test-user-10',
        text: 'Too short',
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('at least 20 characters');
    });
  });

  describe('Input validation', () => {
    test('Missing user_id → 400 error', async () => {
      const request = createMockRequest({
        text: 'This is a valid text entry with enough characters to process.',
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('user_id');
    });

    test('Invalid source_type defaults to free_text (not an error)', async () => {
      mockCreate.mockResolvedValueOnce(createClaudeResponse({}));

      const request = createMockRequest({
        user_id: 'test-user',
        text: 'This is a valid text entry with enough characters to process.',
        source_type: 'invalid_type',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed and default to free_text
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.source_type).toBe('free_text');
    });
  });

  describe('Response shape', () => {
    test('Response includes required fields', async () => {
      mockCreate.mockResolvedValueOnce(createClaudeResponse({}));

      const request = createMockRequest({
        user_id: 'test-user',
        text: 'This is a valid text entry with enough characters to process for analysis.',
        source_type: 'journal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Check required fields
      expect(data.data).toHaveProperty('ers_snapshot');
      expect(data.data).toHaveProperty('dimensions');
      expect(data.data).toHaveProperty('readiness_label');
      expect(data.data).toHaveProperty('confidence');
      expect(data.data).toHaveProperty('assessment_id');
      expect(data.data).toHaveProperty('timestamp');
      expect(data.data).toHaveProperty('source_type');
      expect(data.data).toHaveProperty('text_length');
      expect(data.data).toHaveProperty('extraction_confidence');

      // Check all dimensions present
      for (const dim of ['emotional_stability', 'self_reflection', 'coping_capacity', 'behavioral_engagement', 'social_readiness']) {
        expect(data.data.dimensions).toHaveProperty(dim);
        expect(data.data.dimensions[dim]).toHaveProperty('score');
        expect(data.data.dimensions[dim]).toHaveProperty('label');
      }
    });
  });
});
