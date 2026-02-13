'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// COMPONENTS
// ============================================================================

function CodeBlock({
  code,
  language: _language = 'bash',
  title
}: {
  code: string;
  language?: string;
  title?: string;
}) {
  void _language; // Reserved for syntax highlighting
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-slate-700">
      {title && (
        <div className="bg-slate-800 px-4 py-2 text-xs font-medium text-slate-400 border-b border-slate-700">
          {title}
        </div>
      )}
      <pre className="bg-slate-900 text-slate-100 p-4 overflow-x-auto text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
        )}
      </button>
    </div>
  );
}

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${
      method === 'GET'
        ? 'bg-green-100 text-green-700'
        : 'bg-blue-100 text-blue-700'
    }`}>
      {method}
    </span>
  );
}

function StatusCode({ code }: { code: number }) {
  const colors = {
    200: 'bg-green-100 text-green-700',
    400: 'bg-yellow-100 text-yellow-700',
    401: 'bg-red-100 text-red-700',
    403: 'bg-red-100 text-red-700',
    404: 'bg-yellow-100 text-yellow-700',
    429: 'bg-orange-100 text-orange-700',
    500: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-mono font-bold rounded ${colors[code as keyof typeof colors] || 'bg-gray-100 text-gray-700'}`}>
      {code}
    </span>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-slate-600">Parameter</th>
            <th className="text-left px-4 py-2 font-medium text-slate-600">Type</th>
            <th className="text-left px-4 py-2 font-medium text-slate-600">Required</th>
            <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {params.map((param, i) => (
            <tr key={i}>
              <td className="px-4 py-2 font-mono text-indigo-600">{param.name}</td>
              <td className="px-4 py-2 text-slate-600">{param.type}</td>
              <td className="px-4 py-2">
                {param.required ? (
                  <span className="text-red-600 font-medium">Required</span>
                ) : (
                  <span className="text-slate-400">Optional</span>
                )}
              </td>
              <td className="px-4 py-2 text-slate-600">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// SIDEBAR
// ============================================================================

function Sidebar({ activeSection }: { activeSection: string }) {
  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'authentication', label: 'Authentication', icon: '🔐' },
    {
      id: 'endpoints',
      label: 'Endpoints',
      icon: '📡',
      children: [
        { id: 'endpoint-aggregate', label: 'GET /aggregate', method: 'GET' as const },
        { id: 'endpoint-individual', label: 'POST /individual', method: 'POST' as const },
        { id: 'endpoint-health', label: 'GET /health', method: 'GET' as const },
      ]
    },
    { id: 'code-examples', label: 'Code Examples', icon: '💻' },
    { id: 'error-handling', label: 'Error Handling', icon: '⚠️' },
    { id: 'rate-limits', label: 'Rate Limits', icon: '⏱️' },
    { id: 'support', label: 'Support', icon: '💬' },
  ];

  return (
    <nav className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-1">
        {sections.map((section) => (
          <div key={section.id}>
            <a
              href={`#${section.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </a>
            {section.children && (
              <div className="ml-6 mt-1 space-y-1">
                {section.children.map((child) => (
                  <a
                    key={child.id}
                    href={`#${child.id}`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      activeSection === child.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <MethodBadge method={child.method} />
                    <span className="font-mono text-xs">{child.label.replace('GET ', '').replace('POST ', '')}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'getting-started', 'authentication', 'endpoint-aggregate',
        'endpoint-individual', 'endpoint-health', 'code-examples',
        'error-handling', 'rate-limits', 'support'
      ];

      for (const id of sections) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">💜</span>
                </div>
                <span className="font-bold">Paceful</span>
              </Link>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">API Documentation</span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded">v1.0</span>
            </div>
            <a
              href="/design-partners"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get API Key
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-12">
          <Sidebar activeSection={activeSection} />

          {/* Main Content */}
          <main className="flex-1 max-w-3xl space-y-16">

            {/* ============================================================ */}
            {/* GETTING STARTED */}
            {/* ============================================================ */}
            <section id="getting-started" className="scroll-mt-24">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Paceful Prediction API</h1>
              <p className="text-lg text-slate-600 mb-8">
                Welcome to the Paceful Emotional Readiness Prediction API. Build powerful emotional
                wellness features using our cohort-based prediction engine.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Base URL</h2>
                <CodeBlock code="https://api.paceful.app/api/b2b/predictions" language="text" />

                <h2 className="text-lg font-semibold text-slate-900 pt-4">Quick Start</h2>
                <p className="text-slate-600">Make your first API call in seconds:</p>
                <CodeBlock
                  code={`curl -X GET "https://api.paceful.app/api/b2b/predictions/health" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                  language="bash"
                />
              </div>
            </section>

            {/* ============================================================ */}
            {/* AUTHENTICATION */}
            {/* ============================================================ */}
            <section id="authentication" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Authentication</h2>
              <p className="text-slate-600 mb-6">
                All requests require an API key in the Authorization header:
              </p>

              <CodeBlock
                code="Authorization: Bearer pk_live_abc123xyz789..."
                language="http"
                title="Header Format"
              />

              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">API Key Types</h3>
                <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-xl">🔑</div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Test Keys</h4>
                      <p className="text-sm text-slate-600">Prefix: <code className="bg-slate-200 px-1 rounded">pk_test_</code></p>
                      <p className="text-sm text-slate-500 mt-1">Use for development. Returns mock data, doesn&apos;t count against quota.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">🔐</div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Live Keys</h4>
                      <p className="text-sm text-slate-600">Prefix: <code className="bg-slate-200 px-1 rounded">pk_live_</code></p>
                      <p className="text-sm text-slate-500 mt-1">Use in production. Returns real data, subject to rate limits.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-amber-900">Security Notice</h4>
                    <p className="text-sm text-amber-800 mt-1">
                      Never expose API keys in client-side code. Always make API calls from your server.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* ENDPOINT: AGGREGATE */}
            {/* ============================================================ */}
            <section id="endpoint-aggregate" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-lg font-mono text-slate-700">/aggregate</code>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Get Aggregate Predictions</h2>
              <p className="text-slate-600 mb-6">
                Retrieve aggregated prediction statistics across your user cohort. Returns
                statistical summaries without exposing individual user data.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3">Query Parameters</h3>
              <ParamTable params={[
                { name: 'timeframe', type: 'string', required: false, description: 'Time period filter: "7d", "30d", "90d", "1y"' },
                { name: 'prediction_type', type: 'string', required: false, description: 'Filter by type: "timeline", "outcome", "risk"' },
                { name: 'include_trends', type: 'boolean', required: false, description: 'Include trend analysis in response' },
              ]} />

              <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-3">Example Request</h3>
              <CodeBlock
                code={`curl -X GET "https://api.paceful.app/api/b2b/predictions/aggregate?timeframe=30d" \\
  -H "Authorization: Bearer pk_live_abc123"`}
                language="bash"
              />

              <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-3">Response</h3>
              <div className="flex items-center gap-2 mb-2">
                <StatusCode code={200} />
                <span className="text-sm text-slate-600">Success</span>
              </div>
              <CodeBlock
                code={`{
  "success": true,
  "data": {
    "total_users": 1247,
    "total_predictions": 8934,
    "prediction_distribution": {
      "timeline": 3245,
      "outcome": 2891,
      "risk": 2798
    },
    "average_confidence": 0.847,
    "accuracy_metrics": {
      "overall": 0.823,
      "by_type": {
        "timeline": 0.87,
        "outcome": 0.84,
        "risk": 0.79
      }
    },
    "stage_distribution": {
      "healing": { "count": 412, "percentage": 33.0 },
      "rebuilding": { "count": 498, "percentage": 39.9 },
      "ready": { "count": 337, "percentage": 27.0 }
    }
  },
  "metadata": {
    "generated_at": "2024-02-06T10:30:00Z",
    "cache_ttl": 300
  }
}`}
                language="json"
                title="Response Body"
              />
            </section>

            {/* ============================================================ */}
            {/* ENDPOINT: INDIVIDUAL */}
            {/* ============================================================ */}
            <section id="endpoint-individual" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-lg font-mono text-slate-700">/individual</code>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Get Individual Prediction</h2>
              <p className="text-slate-600 mb-6">
                Retrieve prediction data for a specific user. Returns personalized healing
                timeline, outcome probabilities, and risk assessments.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3">Request Body</h3>
              <ParamTable params={[
                { name: 'user_id', type: 'string (UUID)', required: true, description: 'Unique identifier for the user' },
                { name: 'prediction_types', type: 'string[]', required: false, description: 'Types to retrieve: ["timeline", "outcome", "risk"]' },
                { name: 'include_confidence', type: 'boolean', required: false, description: 'Include confidence intervals' },
                { name: 'include_factors', type: 'boolean', required: false, description: 'Include contributing factors' },
              ]} />

              <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-3">Example Request</h3>
              <CodeBlock
                code={`curl -X POST "https://api.paceful.app/api/b2b/predictions/individual" \\
  -H "Authorization: Bearer pk_live_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "prediction_types": ["timeline", "outcome", "risk"],
    "include_confidence": true,
    "include_factors": true
  }'`}
                language="bash"
              />

              <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-3">Response</h3>
              <div className="flex items-center gap-2 mb-2">
                <StatusCode code={200} />
                <span className="text-sm text-slate-600">Success</span>
              </div>
              <CodeBlock
                code={`{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "predictions": {
      "timeline": {
        "current_phase": "rebuilding",
        "current_ers": 62,
        "predicted_ready_date": "2024-04-15",
        "weeks_to_ready": 8.3,
        "confidence": 0.87,
        "confidence_interval": {
          "lower": "2024-03-28",
          "upper": "2024-05-02"
        }
      },
      "outcome": {
        "healthy_recovery": 0.847,
        "prolonged_grief": 0.098,
        "rebound_risk": 0.055,
        "confidence": 0.84
      },
      "risk": {
        "current_level": "low",
        "score": 0.23,
        "upcoming_triggers": [
          {
            "date": "2024-02-14",
            "type": "holiday",
            "name": "Valentine's Day",
            "risk_increase": 0.15
          }
        ],
        "factors": [
          { "factor": "strong_support_network", "impact": "protective", "weight": 0.35 },
          { "factor": "consistent_engagement", "impact": "protective", "weight": 0.28 }
        ]
      }
    },
    "cohort": {
      "size": 142,
      "similarity_score": 0.81
    },
    "last_updated": "2024-02-06T10:30:00Z"
  }
}`}
                language="json"
                title="Response Body"
              />
            </section>

            {/* ============================================================ */}
            {/* ENDPOINT: HEALTH */}
            {/* ============================================================ */}
            <section id="endpoint-health" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-lg font-mono text-slate-700">/health</code>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Health Check</h2>
              <p className="text-slate-600 mb-6">
                Check API status and health. Use this for monitoring and alerting.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3">Example Request</h3>
              <CodeBlock
                code={`curl -X GET "https://api.paceful.app/api/b2b/predictions/health" \\
  -H "Authorization: Bearer pk_live_abc123"`}
                language="bash"
              />

              <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-3">Response</h3>
              <div className="flex items-center gap-2 mb-2">
                <StatusCode code={200} />
                <span className="text-sm text-slate-600">Healthy</span>
              </div>
              <CodeBlock
                code={`{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-02-06T10:30:00Z",
  "services": {
    "database": "operational",
    "prediction_engine": "operational",
    "cache": "operational"
  },
  "metrics": {
    "uptime_percent": 99.98,
    "avg_response_time_ms": 145,
    "requests_last_hour": 12847
  }
}`}
                language="json"
                title="Response Body"
              />
            </section>

            {/* ============================================================ */}
            {/* CODE EXAMPLES */}
            {/* ============================================================ */}
            <section id="code-examples" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Code Examples</h2>
              <p className="text-slate-600 mb-6">
                Copy-paste examples for popular languages and frameworks.
              </p>

              <div className="space-y-8">
                {/* Python */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🐍</span> Python
                  </h3>
                  <CodeBlock
                    code={`import requests

API_KEY = "pk_live_abc123"
BASE_URL = "https://api.paceful.app/api/b2b/predictions"

# Get aggregate predictions
response = requests.get(
    f"{BASE_URL}/aggregate",
    params={"timeframe": "30d"},
    headers={"Authorization": f"Bearer {API_KEY}"}
)
data = response.json()
print(f"Total predictions: {data['data']['total_predictions']}")

# Get individual prediction
response = requests.post(
    f"{BASE_URL}/individual",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "prediction_types": ["timeline", "outcome"],
        "include_confidence": True
    }
)
prediction = response.json()
print(f"Weeks to ready: {prediction['data']['predictions']['timeline']['weeks_to_ready']}")`}
                    language="python"
                    title="python"
                  />
                </div>

                {/* JavaScript/Node.js */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🟨</span> JavaScript / Node.js
                  </h3>
                  <CodeBlock
                    code={`const API_KEY = 'pk_live_abc123';
const BASE_URL = 'https://api.paceful.app/api/b2b/predictions';

// Get aggregate predictions
const aggregateResponse = await fetch(\`\${BASE_URL}/aggregate?timeframe=30d\`, {
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`
  }
});
const aggregate = await aggregateResponse.json();
console.log(\`Total predictions: \${aggregate.data.total_predictions}\`);

// Get individual prediction
const individualResponse = await fetch(\`\${BASE_URL}/individual\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    prediction_types: ['timeline', 'outcome'],
    include_confidence: true
  })
});
const prediction = await individualResponse.json();
console.log(\`Weeks to ready: \${prediction.data.predictions.timeline.weeks_to_ready}\`);`}
                    language="javascript"
                    title="javascript"
                  />
                </div>

                {/* cURL */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">💻</span> cURL
                  </h3>
                  <CodeBlock
                    code={`# Get aggregate predictions
curl -X GET "https://api.paceful.app/api/b2b/predictions/aggregate?timeframe=30d" \\
  -H "Authorization: Bearer pk_live_abc123"

# Get individual prediction
curl -X POST "https://api.paceful.app/api/b2b/predictions/individual" \\
  -H "Authorization: Bearer pk_live_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "550e8400-e29b-41d4-a716-446655440000", "prediction_types": ["timeline"]}'

# Health check
curl -X GET "https://api.paceful.app/api/b2b/predictions/health" \\
  -H "Authorization: Bearer pk_live_abc123"`}
                    language="bash"
                    title="bash"
                  />
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* ERROR HANDLING */}
            {/* ============================================================ */}
            <section id="error-handling" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Error Handling</h2>
              <p className="text-slate-600 mb-6">
                The API uses conventional HTTP response codes. Errors include a message and code for debugging.
              </p>

              <div className="space-y-6">
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Meaning</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-4 py-3"><StatusCode code={200} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">OK</td>
                        <td className="px-4 py-3 text-slate-600">Request succeeded</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><StatusCode code={400} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">Bad Request</td>
                        <td className="px-4 py-3 text-slate-600">Invalid parameters or malformed request</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><StatusCode code={401} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">Unauthorized</td>
                        <td className="px-4 py-3 text-slate-600">Missing or invalid API key</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><StatusCode code={403} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">Forbidden</td>
                        <td className="px-4 py-3 text-slate-600">API key doesn&apos;t have access to this resource</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><StatusCode code={404} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">Not Found</td>
                        <td className="px-4 py-3 text-slate-600">User or resource not found</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><StatusCode code={429} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">Rate Limited</td>
                        <td className="px-4 py-3 text-slate-600">Too many requests, slow down</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><StatusCode code={500} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900">Server Error</td>
                        <td className="px-4 py-3 text-slate-600">Something went wrong on our end</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-lg font-semibold text-slate-900">Error Response Format</h3>
                <CodeBlock
                  code={`{
  "error": "Unauthorized",
  "message": "Invalid or missing API key",
  "code": "AUTH_INVALID_KEY",
  "status": 401
}`}
                  language="json"
                  title="401 Unauthorized"
                />

                <CodeBlock
                  code={`{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit of 100 requests/hour",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429,
  "retry_after": 3600
}`}
                  language="json"
                  title="429 Rate Limited"
                />
              </div>
            </section>

            {/* ============================================================ */}
            {/* RATE LIMITS */}
            {/* ============================================================ */}
            <section id="rate-limits" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Rate Limits</h2>
              <p className="text-slate-600 mb-6">
                Rate limits are applied per API key. Limits vary by plan tier.
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-lg mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Aggregate</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Individual</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">Basic</td>
                      <td className="px-4 py-3 text-slate-600">100/hour</td>
                      <td className="px-4 py-3 text-slate-600">500/hour</td>
                      <td className="px-4 py-3 text-slate-600">1000/hour</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">Professional</td>
                      <td className="px-4 py-3 text-slate-600">500/hour</td>
                      <td className="px-4 py-3 text-slate-600">2000/hour</td>
                      <td className="px-4 py-3 text-slate-600">1000/hour</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">Enterprise</td>
                      <td className="px-4 py-3 text-slate-600">2000/hour</td>
                      <td className="px-4 py-3 text-slate-600">10000/hour</td>
                      <td className="px-4 py-3 text-slate-600">Unlimited</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-3">Rate Limit Headers</h3>
              <p className="text-slate-600 mb-4">
                Every response includes headers to help you track your usage:
              </p>
              <CodeBlock
                code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1707220800`}
                language="http"
                title="Response Headers"
              />

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <h4 className="font-semibold text-blue-900">Best Practice</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Cache aggregate responses for 5-15 minutes. Individual predictions
                      can be cached for 1 hour. Use exponential backoff when rate limited.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* SUPPORT */}
            {/* ============================================================ */}
            <section id="support" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Support</h2>
              <p className="text-slate-600 mb-6">
                We&apos;re here to help you build with the Paceful API.
              </p>

              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-xl">📧</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Email Support</h4>
                    <p className="text-sm text-slate-600">api-support@paceful.app</p>
                    <p className="text-sm text-slate-500 mt-1">Response within 24 hours for all plans</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">💼</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Partnership Inquiries</h4>
                    <p className="text-sm text-slate-600">partners@paceful.app</p>
                    <p className="text-sm text-slate-500 mt-1">For enterprise deals and custom integrations</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">🚦</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Status Page</h4>
                    <p className="text-sm text-slate-600">status.paceful.app</p>
                    <p className="text-sm text-slate-500 mt-1">Real-time API status and incident history</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-center text-white">
                <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
                <p className="text-indigo-100 mb-6">
                  Join our design partner program for early access and dedicated support.
                </p>
                <a
                  href="/design-partners"
                  className="inline-flex px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Apply for API Access
                </a>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
              <p>Paceful API v1.0 &bull; Last updated February 2026</p>
              <p className="mt-2">
                <a href="/terms" className="hover:text-slate-700">Terms</a>
                {' '}&bull;{' '}
                <a href="/privacy" className="hover:text-slate-700">Privacy</a>
                {' '}&bull;{' '}
                <a href="mailto:api-support@paceful.app" className="hover:text-slate-700">Contact</a>
              </p>
            </footer>

          </main>
        </div>
      </div>
    </div>
  );
}
