/**
 * B2B Prediction API Tests
 *
 * These tests verify the API contract and authentication logic.
 * For full integration tests, use a test database.
 */

import { NextRequest } from 'next/server';

// Create a fully chainable mock that supports all Supabase patterns
function createDeepChainableMock() {
  const createChain = (): Record<string, unknown> => {
    const handler: ProxyHandler<object> = {
      get: (_target, prop) => {
        // Terminal methods that return promises
        if (prop === 'single') {
          return jest.fn(() => Promise.resolve({ data: getMockData(), error: null }));
        }
        if (prop === 'then') {
          return undefined; // Makes the proxy non-thenable
        }
        // Return a new chainable proxy for any other method
        return jest.fn(() => new Proxy({}, handler));
      }
    };
    return new Proxy({}, handler);
  };

  return {
    from: jest.fn(() => createChain()),
    rpc: jest.fn(() => Promise.resolve({ error: null })),
  };
}

// Mock data state
let mockClientData: Record<string, unknown> | null = null;
let mockConsentData: Record<string, unknown> | null = null;
let mockUserData: Record<string, unknown> | null = null;
let callSequence = 0;

function getMockData() {
  callSequence++;
  // Return different data based on call sequence
  if (callSequence === 1) return mockClientData;
  if (callSequence === 2) return mockConsentData;
  if (callSequence === 3) return mockUserData;
  return null;
}

const mockSupabase = createDeepChainableMock();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Import handlers after mock setup
import { GET, POST } from '../route';

// Test fixtures
const validApiKey = 'test-api-key-123';

const activeClient = {
  id: 'client-uuid-123',
  client_name: 'Test Client',
  subscription_tier: 'professional',
  tier: 2,
  hourly_rate_limit: 500,
  hourly_calls_used: 10,
  hourly_reset_at: new Date(Date.now() + 3600000).toISOString(),
  monthly_api_calls_limit: 10000,
  monthly_api_calls_used: 100,
  can_access_aggregate_data: true,
  can_access_individual_predictions: true,
  can_access_individual_ers: true,
  can_access_trends: true,
  is_active: true,
};

const inactiveClient = { ...activeClient, is_active: false };
const tier1Client = { ...activeClient, tier: 1, can_access_individual_predictions: false };
const rateLimitedClient = { ...activeClient, hourly_calls_used: 500, hourly_rate_limit: 500 };

function createRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): NextRequest {
  const { method = 'GET', headers = {}, body } = options;
  return new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('B2B Prediction API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callSequence = 0;
    mockClientData = activeClient;
    mockConsentData = { consent_given: true };
    mockUserData = { id: 'user-123' };
  });

  describe('Authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Missing or invalid Authorization header');
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for non-Bearer auth', async () => {
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: 'Basic abc123' }
      });
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for invalid API key', async () => {
      mockClientData = null;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: 'Bearer invalid-key' }
      });
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe('Invalid API key');
    });

    it('returns 401 for inactive client', async () => {
      mockClientData = inactiveClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('API client inactive');
    });
  });

  describe('Rate Limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      mockClientData = rateLimitedClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.code).toBe('RATE_LIMITED');
    });

    it('includes X-RateLimit headers', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.headers.has('X-RateLimit-Limit')).toBe(true);
      expect(res.headers.has('X-RateLimit-Remaining')).toBe(true);
      expect(res.headers.has('X-RateLimit-Reset')).toBe(true);
    });
  });

  describe('GET ?endpoint=health', () => {
    it('returns 200 with health status', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.api_version).toBe('1.0');
    });

    it('includes client tier in rate_limit', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);
      const data = await res.json();

      expect(data.rate_limit).toBeDefined();
      expect(data.rate_limit.tier).toBe(2);
    });

    it('includes permissions based on client', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);
      const data = await res.json();

      expect(data.permissions.aggregate_data).toBe(true);
      expect(data.permissions.individual_predictions).toBe(true);
    });
  });

  describe('GET ?endpoint=aggregate', () => {
    it('returns 400 for invalid period format', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=aggregate&period=bad-format', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid period format');
    });

    it('returns 400 for missing period', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=aggregate', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.status).toBe(400);
    });

    it('returns 403 without aggregate permission', async () => {
      mockClientData = { ...activeClient, can_access_aggregate_data: false };
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=aggregate&period=2026-01-01 to 2026-01-31', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe('Insufficient permissions');
    });
  });

  describe('POST ?endpoint=individual', () => {
    it('returns 400 for invalid JSON', async () => {
      mockClientData = activeClient;
      const req = new NextRequest('http://localhost/api/b2b/predictions?endpoint=individual', {
        method: 'POST',
        headers: new Headers({
          Authorization: `Bearer ${validApiKey}`,
          'Content-Type': 'application/json'
        }),
        body: 'not-json'
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid JSON body');
    });

    it('returns 403 for Tier 1 clients', async () => {
      mockClientData = tier1Client;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=individual', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validApiKey}`, 'Content-Type': 'application/json' },
        body: { user_id: 'user-123', prediction_types: ['timeline'] }
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe('Insufficient tier');
    });

    it('returns 400 without user_id', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=individual', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validApiKey}`, 'Content-Type': 'application/json' },
        body: { prediction_types: ['timeline'] }
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Missing user_id');
    });

    it('returns 400 without prediction_types', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=individual', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validApiKey}`, 'Content-Type': 'application/json' },
        body: { user_id: 'user-123' }
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Missing prediction_types');
    });

    it('returns 403 without user consent', async () => {
      mockClientData = activeClient;
      mockConsentData = null;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=individual', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validApiKey}`, 'Content-Type': 'application/json' },
        body: { user_id: 'user-123', prediction_types: ['timeline'] }
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe('User consent not provided');
    });

    it('returns 404 when user not found', async () => {
      mockClientData = activeClient;
      mockConsentData = { consent_given: true };
      mockUserData = null;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=individual', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validApiKey}`, 'Content-Type': 'application/json' },
        body: { user_id: 'nonexistent', prediction_types: ['timeline'] }
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe('User not found');
    });
  });

  describe('Error Handling', () => {
    it('returns 400 for unknown endpoint', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=invalid', {
        headers: { Authorization: `Bearer ${validApiKey}` }
      });
      const res = await GET(req);

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Unknown endpoint');
    });

    it('returns 400 for POST to non-individual endpoint', async () => {
      mockClientData = activeClient;
      const req = createRequest('http://localhost/api/b2b/predictions?endpoint=health', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validApiKey}`, 'Content-Type': 'application/json' },
        body: {}
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid endpoint for POST');
    });
  });
});
