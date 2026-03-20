'use client';

import { useState, useCallback } from 'react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface Endpoint {
  method: HttpMethod;
  path: string;
  description: string;
  defaultBody?: string;
  defaultQueryParams?: string;
  defaultPathParams?: Record<string, string>;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/partner/users/register',
    description: 'Register a new user',
    defaultBody: JSON.stringify({ externalId: 'demo-user-001', context: { source: 'playground' } }, null, 2),
  },
  {
    method: 'POST',
    path: '/partner/mood/log',
    description: 'Log a mood entry',
    defaultBody: JSON.stringify({ externalId: 'sandbox_user_001', score: 4, label: 'good', emotions: ['hopeful', 'calm'] }, null, 2),
  },
  {
    method: 'POST',
    path: '/partner/journal/entry',
    description: 'Create journal entry',
    defaultBody: JSON.stringify({ externalId: 'sandbox_user_001', content: 'Today felt like a turning point. I noticed I was able to stay calm during a stressful meeting.' }, null, 2),
  },
  {
    method: 'GET',
    path: '/partner/ers/{externalId}',
    description: 'Get ERS score for a user',
    defaultPathParams: { externalId: 'sandbox_user_001' },
  },
  {
    method: 'POST',
    path: '/partner/ers/calculate',
    description: 'Force ERS calculation',
    defaultBody: JSON.stringify({ externalId: 'sandbox_user_001' }, null, 2),
  },
  {
    method: 'POST',
    path: '/partner/ers/batch',
    description: 'Batch get ERS scores',
    defaultBody: JSON.stringify({ externalIds: ['sandbox_user_001', 'sandbox_user_002', 'sandbox_user_003'] }, null, 2),
  },
  {
    method: 'GET',
    path: '/partner/ers/{externalId}/history',
    description: 'Get ERS history and trends',
    defaultPathParams: { externalId: 'sandbox_user_001' },
    defaultQueryParams: 'period=30d&granularity=daily',
  },
  {
    method: 'GET',
    path: '/partner/ers/trends/aggregate',
    description: 'Aggregate ERS trends across all users',
    defaultQueryParams: 'period=30d',
  },
  {
    method: 'GET',
    path: '/partner/analytics/summary',
    description: 'Get analytics summary',
    defaultQueryParams: 'period=30d',
  },
  {
    method: 'GET',
    path: '/partner/webhooks/deliveries',
    description: 'List webhook deliveries',
    defaultQueryParams: 'limit=10',
  },
  {
    method: 'POST',
    path: '/partner/import/users',
    description: 'Bulk import users',
    defaultBody: JSON.stringify({
      users: [
        { externalId: 'import_user_001', context: { plan: 'pro' }, consentGiven: true },
        { externalId: 'import_user_002', context: { plan: 'basic' }, consentGiven: true },
        { externalId: 'import_user_003', context: { plan: 'pro' }, consentGiven: false },
      ],
    }, null, 2),
  },
  {
    method: 'POST',
    path: '/partner/import/mood',
    description: 'Bulk import mood logs',
    defaultBody: JSON.stringify({
      entries: [
        { externalId: 'sandbox_user_001', score: 4, label: 'good', emotions: ['hopeful'], timestamp: new Date(Date.now() - 86400000).toISOString() },
        { externalId: 'sandbox_user_001', score: 3, label: 'okay', emotions: ['calm'], timestamp: new Date(Date.now() - 172800000).toISOString() },
        { externalId: 'sandbox_user_002', score: 5, label: 'great', emotions: ['joyful', 'energetic'], timestamp: new Date(Date.now() - 86400000).toISOString() },
      ],
    }, null, 2),
  },
  {
    method: 'GET',
    path: '/partner/health',
    description: 'Authenticated health check',
  },
  {
    method: 'GET',
    path: '/status',
    description: 'Public health check (no auth)',
  },
  {
    method: 'GET',
    path: '/partner/changelog',
    description: 'API changelog (no auth)',
  },
  {
    method: 'GET',
    path: '/partner/info',
    description: 'Get partner information',
  },
  {
    method: 'GET',
    path: '/assess/snapshot/questions',
    description: 'Get snapshot assessment questions',
  },
  {
    method: 'POST',
    path: '/assess/snapshot',
    description: 'Submit snapshot assessment',
    defaultBody: JSON.stringify({
      externalId: 'sandbox_user_001',
      config: { verbosity: 'standard' },
      responses: [
        { dimension: 'emotional_stability', question_id: 1, value: 4 },
        { dimension: 'emotional_stability', question_id: 2, value: 3 },
        { dimension: 'self_reflection', question_id: 3, value: 4 },
        { dimension: 'self_reflection', question_id: 4, value: 4 },
        { dimension: 'coping_capacity', question_id: 5, value: 3 },
        { dimension: 'coping_capacity', question_id: 6, value: 4 },
        { dimension: 'behavioral_engagement', question_id: 7, value: 4 },
        { dimension: 'behavioral_engagement', question_id: 8, value: 3 },
        { dimension: 'social_readiness', question_id: 9, value: 3 },
        { dimension: 'social_readiness', question_id: 10, value: 4 },
      ],
    }, null, 2),
  },
  {
    method: 'GET',
    path: '/partner/config',
    description: 'Get partner configuration',
  },
  {
    method: 'PUT',
    path: '/partner/config',
    description: 'Update partner configuration',
    defaultBody: JSON.stringify({
      config: { verbosity: 'standard', tone: 'casual', score_format: 'percentage' },
    }, null, 2),
  },
  {
    method: 'POST',
    path: '/partner/webhooks/register',
    description: 'Register a webhook',
    defaultBody: JSON.stringify({
      url: 'https://your-app.com/webhooks/paceful',
      events: ['ers.stage_changed', 'mood.critical'],
    }, null, 2),
  },
  {
    method: 'GET',
    path: '/partner/webhooks/list',
    description: 'List registered webhooks',
  },
  {
    method: 'GET',
    path: '/partner/usage',
    description: 'Get API usage stats',
  },
];

// Use relative URL so it works in all environments
const BASE_URL = '/api/v1';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#5B8A72',
  POST: '#5B7FB5',
  PUT: '#C4973B',
  DELETE: '#B56B6B',
};

interface ApiPlaygroundProps {
  defaultApiKey?: string;
}

export default function ApiPlayground({ defaultApiKey = 'pk_sandbox_paceful_demo' }: ApiPlaygroundProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(ENDPOINTS[0]);
  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [pathParams, setPathParams] = useState<Record<string, string>>(ENDPOINTS[0].defaultPathParams || {});
  const [queryParams, setQueryParams] = useState(ENDPOINTS[0].defaultQueryParams || '');
  const [requestBody, setRequestBody] = useState(ENDPOINTS[0].defaultBody || '');
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleEndpointChange = useCallback((endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(endpoint.defaultBody || '');
    setQueryParams(endpoint.defaultQueryParams || '');
    setPathParams(endpoint.defaultPathParams || {});
    setResponse(null);
    setBodyError(null);
  }, []);

  const handleReset = useCallback(() => {
    setRequestBody(selectedEndpoint.defaultBody || '');
    setQueryParams(selectedEndpoint.defaultQueryParams || '');
    setPathParams(selectedEndpoint.defaultPathParams || {});
    setResponse(null);
    setBodyError(null);
    setApiKey(defaultApiKey);
  }, [selectedEndpoint, defaultApiKey]);

  const validateJson = useCallback((json: string): boolean => {
    if (!json.trim()) {
      setBodyError(null);
      return true;
    }
    try {
      JSON.parse(json);
      setBodyError(null);
      return true;
    } catch (e) {
      setBodyError((e as Error).message);
      return false;
    }
  }, []);

  const handleBodyChange = useCallback((value: string) => {
    setRequestBody(value);
    validateJson(value);
  }, [validateJson]);

  const buildUrl = useCallback((): string => {
    let path = selectedEndpoint.path;

    // Replace path parameters
    const pathParamMatches = path.match(/\{(\w+)\}/g);
    if (pathParamMatches) {
      pathParamMatches.forEach((match) => {
        const paramName = match.slice(1, -1);
        const value = pathParams[paramName] || '';
        path = path.replace(match, encodeURIComponent(value));
      });
    }

    let url = `${BASE_URL}${path}`;
    if (queryParams.trim()) {
      url += `?${queryParams}`;
    }
    return url;
  }, [selectedEndpoint, pathParams, queryParams]);

  const copyResponse = useCallback(() => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [response]);

  const sendRequest = useCallback(async () => {
    if (requestBody && !validateJson(requestBody)) {
      return;
    }

    setIsLoading(true);
    setResponse(null);

    const url = buildUrl();
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add API key for authenticated endpoints
      if (!selectedEndpoint.path.includes('/status') && !selectedEndpoint.path.includes('/changelog')) {
        headers['X-API-Key'] = apiKey;
      }

      const fetchOptions: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (requestBody && ['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
        fetchOptions.body = requestBody;
      }

      const res = await fetch(url, fetchOptions);
      const duration = Math.round(performance.now() - startTime);

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let body: string;
      try {
        const json = await res.json();
        body = JSON.stringify(json, null, 2);
      } catch {
        body = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body,
        duration,
      });
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: JSON.stringify({ error: (error as Error).message }, null, 2),
        duration: Math.round(performance.now() - startTime),
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, buildUrl, requestBody, selectedEndpoint, validateJson]);

  const highlightJson = (text: string): string => {
    return text
      .replace(/"([^"]+)":/g, '<span style="color: #5B8A72">"$1"</span>:')
      .replace(/: "([^"]*)"([,\n}])/g, ': <span style="color: #CE9178">"$1"</span>$2')
      .replace(/: (\d+\.?\d*)([,\n}])/g, ': <span style="color: #B5CEA8">$1</span>$2')
      .replace(/: (true|false|null)([,\n}])/g, ': <span style="color: #569CD6">$1</span>$2');
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return '#5B8A72';
    if (status >= 400 && status < 500) return '#C4973B';
    return '#B56B6B';
  };

  const pathHasParams = selectedEndpoint.path.includes('{');

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E5E0D9',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#F9F6F2',
        padding: '16px 20px',
        borderBottom: '1px solid #E5E0D9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#1F1D1A' }}>API Playground</span>
          {apiKey === 'pk_sandbox_paceful_demo' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#E8F5E9',
              color: '#2E7D32',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
            }}>
              <span style={{ fontSize: '14px' }}>🧪</span> Sandbox Mode
            </span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#9A938A', marginTop: '4px' }}>
          Test API endpoints in real-time — responses are sandbox data, no account needed
        </div>
      </div>

      {/* Body - responsive grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        minHeight: '500px',
      }}>
        {/* Request Pane */}
        <div style={{
          padding: '20px',
          borderRight: '1px solid #E5E0D9',
          borderBottom: '1px solid #E5E0D9',
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#6B6560',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>API Key</div>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pk_sandbox_paceful_demo"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #E5E0D9',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#1F1D1A',
              marginBottom: '16px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />

          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#6B6560',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>Endpoint</div>
          <select
            value={selectedEndpoint.path}
            onChange={(e) => {
              const endpoint = ENDPOINTS.find((ep) => ep.path === e.target.value);
              if (endpoint) handleEndpointChange(endpoint);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #E5E0D9',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#1F1D1A',
              marginBottom: '16px',
              cursor: 'pointer',
            }}
          >
            {ENDPOINTS.map((ep) => (
              <option key={ep.path} value={ep.path}>
                {ep.method} {ep.path} — {ep.description}
              </option>
            ))}
          </select>

          {/* URL Preview */}
          <div style={{
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#6B6560',
            backgroundColor: '#F5F5F5',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '16px',
            wordBreak: 'break-all',
          }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 6px',
              backgroundColor: METHOD_COLORS[selectedEndpoint.method],
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 600,
              borderRadius: '3px',
              marginRight: '8px',
            }}>
              {selectedEndpoint.method}
            </span>
            {buildUrl()}
          </div>

          {/* Path Parameters */}
          {pathHasParams && (
            <>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#6B6560',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>Path Parameters</div>
              {selectedEndpoint.path.match(/\{(\w+)\}/g)?.map((match) => {
                const paramName = match.slice(1, -1);
                return (
                  <div key={paramName} style={{ marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={pathParams[paramName] || ''}
                      onChange={(e) =>
                        setPathParams((prev) => ({ ...prev, [paramName]: e.target.value }))
                      }
                      placeholder={paramName}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #E5E0D9',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        color: '#1F1D1A',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#9A938A' }}>{paramName}</span>
                  </div>
                );
              })}
            </>
          )}

          {/* Query Parameters for GET */}
          {selectedEndpoint.method === 'GET' && (
            <>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#6B6560',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>Query Parameters</div>
              <input
                type="text"
                value={queryParams}
                onChange={(e) => setQueryParams(e.target.value)}
                placeholder="period=30d&granularity=daily"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #E5E0D9',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#1F1D1A',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </>
          )}

          {/* Request Body for POST/PUT */}
          {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
            <>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#6B6560',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>Request Body (JSON)</div>
              <textarea
                value={requestBody}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="{}"
                style={{
                  width: '100%',
                  minHeight: '180px',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  border: `1px solid ${bodyError ? '#B56B6B' : '#E5E0D9'}`,
                  borderRadius: '6px',
                  backgroundColor: '#2D2D2D',
                  color: '#E5E0D9',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              {bodyError && (
                <div style={{ fontSize: '12px', color: '#B56B6B', marginTop: '4px' }}>
                  Invalid JSON: {bodyError}
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={sendRequest}
              disabled={isLoading || !!bodyError}
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: isLoading || bodyError ? '#9A938A' : '#5B8A72',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading || bodyError ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {isLoading ? 'Sending...' : 'Send Request'}
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: '#FFFFFF',
                color: '#6B6560',
                border: '1px solid #E5E0D9',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Response Pane */}
        <div style={{
          padding: '20px',
          backgroundColor: '#FAFAFA',
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#6B6560',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>Response</div>

          {response ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: getStatusColor(response.status),
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '4px',
                }}>
                  {response.status} {response.statusText}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#9A938A' }}>{response.duration}ms</span>
                  <button
                    onClick={copyResponse}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      backgroundColor: copied ? '#5B8A72' : '#E5E0D9',
                      color: copied ? '#FFFFFF' : '#6B6560',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={{
                backgroundColor: '#2D2D2D',
                borderRadius: '6px',
                padding: '12px',
                minHeight: '200px',
                maxHeight: '400px',
                overflowY: 'auto',
              }}>
                <pre
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    color: '#E5E0D9',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightJson(response.body) }}
                />
              </div>

              {Object.keys(response.headers).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6B6560',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Response Headers</div>
                  {Object.entries(response.headers)
                    .filter(([key]) =>
                      ['content-type', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-sandbox', 'x-request-id'].includes(
                        key.toLowerCase()
                      )
                    )
                    .map(([key, value]) => (
                      <div key={key} style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#6B6560',
                        padding: '4px 0',
                        borderBottom: '1px solid #E5E0D9',
                      }}>
                        <strong>{key}:</strong> {value}
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#9A938A',
              fontSize: '14px',
              backgroundColor: '#2D2D2D',
              borderRadius: '6px',
            }}>
              {isLoading ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '8px' }}>⏳</div>
                  Sending request...
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '8px', fontSize: '24px' }}>📡</div>
                  Response will appear here
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
