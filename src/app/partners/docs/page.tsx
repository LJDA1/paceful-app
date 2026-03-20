'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ApiPlayground from '@/components/ApiPlayground';

type CodeLang = 'curl' | 'javascript' | 'python';

interface CodeBlockProps {
  code: string | Record<CodeLang, string>;
  language?: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<CodeLang>('curl');

  const isMultiLang = typeof code === 'object';
  const displayCode = isMultiLang ? code[lang] : code;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Basic syntax highlighting
  const highlightCode = (text: string) => {
    return text
      .replace(/(["'`])([^"'`]*)\1/g, '<span style="color: #CE9178">$&</span>')
      .replace(/\b(const|let|var|await|async|function|return|import|from|export)\b/g, '<span style="color: #569CD6">$1</span>')
      .replace(/\/\/.*/g, '<span style="color: #6A9955">$&</span>')
      .replace(/#.*/g, '<span style="color: #6A9955">$&</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span style="color: #569CD6">$1</span>');
  };

  return (
    <div style={{
      position: 'relative',
      backgroundColor: '#2D2D2D',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      {isMultiLang && (
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid #3D3D3A',
        }}>
          {(['curl', 'javascript', 'python'] as CodeLang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                backgroundColor: lang === l ? '#3D3D3A' : 'transparent',
                color: lang === l ? '#FFFFFF' : '#9A938A',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: isMultiLang ? '44px' : '8px',
          right: '8px',
          padding: '4px 8px',
          fontSize: '11px',
          backgroundColor: copied ? '#5B8A72' : '#3D3D3A',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre
        style={{
          padding: '16px',
          margin: 0,
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: 1.6,
          color: '#E5E0D9',
          overflowX: 'auto',
        }}
        dangerouslySetInnerHTML={{ __html: highlightCode(displayCode) }}
      />
    </div>
  );
}

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' }) {
  const colors = {
    GET: '#5B8A72',
    POST: '#5B7FB5',
    PUT: '#C4973B',
    DELETE: '#B56B6B',
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: colors[method],
      color: '#FFFFFF',
      fontSize: '12px',
      fontWeight: 600,
      borderRadius: '4px',
      marginRight: '8px',
    }}>
      {method}
    </span>
  );
}

function ParamsTable({ params }: { params: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
      marginBottom: '16px',
    }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
          <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Name</th>
          <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Type</th>
          <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Required</th>
          <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
        </tr>
      </thead>
      <tbody>
        {params.map((p) => (
          <tr key={p.name} style={{ borderBottom: '1px solid #E5E0D9' }}>
            <td style={{ padding: '8px 0' }}><code style={{ color: '#5B8A72' }}>{p.name}</code></td>
            <td style={{ padding: '8px 0', color: '#6B6560' }}>{p.type}</td>
            <td style={{ padding: '8px 0' }}>
              {p.required ? <span style={{ color: '#B56B6B' }}>Yes</span> : <span style={{ color: '#9A938A' }}>No</span>}
            </td>
            <td style={{ padding: '8px 0', color: '#6B6560' }}>{p.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const NAV_SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'sandbox', label: 'Sandbox Mode' },
  { id: 'playground', label: 'API Playground' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'users', label: 'Users', children: [
    { id: 'register-user', label: 'Register User' },
  ]},
  { id: 'bulk-import', label: 'Bulk Import', children: [
    { id: 'import-users', label: 'Import Users' },
    { id: 'import-mood', label: 'Import Mood' },
  ]},
  { id: 'mood', label: 'Mood', children: [
    { id: 'log-mood', label: 'Log Mood' },
  ]},
  { id: 'journal', label: 'Journal', children: [
    { id: 'create-entry', label: 'Create Entry' },
  ]},
  { id: 'ers', label: 'ERS Scores', children: [
    { id: 'get-score', label: 'Get Score' },
    { id: 'calculate-score', label: 'Calculate Score' },
    { id: 'batch-scores', label: 'Batch Scores' },
    { id: 'ers-history', label: 'User History' },
    { id: 'ers-trends', label: 'Aggregate Trends' },
  ]},
  { id: 'snapshot', label: 'Snapshot Assessment', children: [
    { id: 'snapshot-questions', label: 'Get Questions' },
    { id: 'snapshot-submit', label: 'Submit Assessment' },
  ]},
  { id: 'partner-config', label: 'Partner Config', children: [
    { id: 'get-config', label: 'Get Config' },
    { id: 'update-config', label: 'Update Config' },
  ]},
  { id: 'analytics', label: 'Analytics', children: [
    { id: 'summary', label: 'Summary' },
  ]},
  { id: 'health-status', label: 'Health & Status', children: [
    { id: 'public-status', label: 'Public Status' },
    { id: 'partner-health', label: 'Partner Health' },
  ]},
  { id: 'webhooks', label: 'Webhooks', children: [
    { id: 'register-webhook', label: 'Register Webhook' },
    { id: 'webhook-events', label: 'Events' },
  ]},
  { id: 'widgets', label: 'Widgets', children: [
    { id: 'mood-widget', label: 'MoodWidget' },
    { id: 'journal-widget', label: 'JournalWidget' },
    { id: 'ers-display', label: 'ERSDisplay' },
    { id: 'paceful-provider', label: 'PacefulProvider' },
  ]},
  { id: 'error-handling', label: 'Error Handling' },
  { id: 'rate-limits', label: 'Rate Limits' },
  { id: 'versioning', label: 'Versioning & Changelog' },
];

export default function PartnerDocs() {
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_SECTIONS.flatMap(s => s.children ? [s, ...s.children] : [s]);
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom > 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const styles = {
    page: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#F9F6F2',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    } as React.CSSProperties,
    sidebar: {
      width: '250px',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E5E0D9',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      bottom: 0,
      overflowY: 'auto' as const,
      padding: '24px',
    } as React.CSSProperties,
    sidebarHeader: {
      marginBottom: '24px',
    } as React.CSSProperties,
    sidebarTitle: {
      fontSize: '18px',
      fontWeight: 700,
      color: '#1F1D1A',
      marginBottom: '4px',
    } as React.CSSProperties,
    sidebarVersion: {
      fontSize: '12px',
      color: '#9A938A',
    } as React.CSSProperties,
    navItem: (active: boolean, isChild: boolean) => ({
      display: 'block',
      padding: isChild ? '6px 0 6px 16px' : '8px 0',
      fontSize: isChild ? '13px' : '14px',
      color: active ? '#5B8A72' : '#6B6560',
      fontWeight: active ? 600 : 400,
      textDecoration: 'none',
      cursor: 'pointer',
      borderLeft: active ? '2px solid #5B8A72' : '2px solid transparent',
      marginLeft: isChild ? '0' : '0',
    }) as React.CSSProperties,
    main: {
      flex: 1,
      marginLeft: '250px',
      padding: '32px 48px',
      maxWidth: '900px',
    } as React.CSSProperties,
    section: {
      marginBottom: '64px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#1F1D1A',
      marginBottom: '16px',
      paddingTop: '24px',
    } as React.CSSProperties,
    subsectionTitle: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#1F1D1A',
      marginBottom: '12px',
      paddingTop: '16px',
    } as React.CSSProperties,
    paragraph: {
      fontSize: '15px',
      color: '#6B6560',
      lineHeight: 1.7,
      marginBottom: '16px',
    } as React.CSSProperties,
    endpoint: {
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #E5E0D9',
    } as React.CSSProperties,
    endpointPath: {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#1F1D1A',
      marginBottom: '12px',
    } as React.CSSProperties,
    backLink: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      color: '#5B8A72',
      textDecoration: 'none',
      fontSize: '14px',
      marginBottom: '24px',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <nav style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>Paceful API Docs</div>
          <Link href="/partners/changelog" style={{ fontSize: '12px', color: '#5B8A72', textDecoration: 'none' }}>
            v1.0.0 changelog →
          </Link>
        </div>
        {NAV_SECTIONS.map((section) => (
          <div key={section.id}>
            <a
              onClick={() => scrollTo(section.id)}
              style={styles.navItem(activeSection === section.id, false)}
            >
              {section.label}
            </a>
            {section.children?.map((child) => (
              <a
                key={child.id}
                onClick={() => scrollTo(child.id)}
                style={styles.navItem(activeSection === child.id, true)}
              >
                {child.label}
              </a>
            ))}
          </div>
        ))}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E0D9' }}>
          <Link href="/partners" style={{ ...styles.navItem(false, false), color: '#5B8A72' }}>
            ← Back to Partners
          </Link>
          <Link href="/partners/dashboard" style={{ ...styles.navItem(false, false), color: '#5B8A72' }}>
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        <Link href="/partners" style={styles.backLink}>
          ← Back to Partners
        </Link>

        {/* Getting Started */}
        <section id="getting-started" style={styles.section}>
          <h1 style={styles.sectionTitle}>Getting Started</h1>
          <p style={styles.paragraph}>
            The Paceful API enables you to integrate emotional intelligence into your platform.
            Measure emotional readiness, track mood and journaling, and receive webhooks for key events.
          </p>
          <p style={styles.paragraph}>
            <strong>Base URL:</strong>{' '}
            <code style={{ backgroundColor: '#E5E0D9', padding: '2px 6px', borderRadius: '4px' }}>
              https://paceful-app.vercel.app/api/v1/partner
            </code>
          </p>

          <h3 style={styles.subsectionTitle}>Quick Start</h3>
          <CodeBlock code={`// 1. Install the SDK
npm install @paceful/sdk

// 2. Initialize the client
import { PacefulClient } from '@paceful/sdk';

const paceful = new PacefulClient({
  apiKey: 'pk_live_your_api_key'
});

// 3. Register a user
await paceful.users.register({
  externalId: 'user-123'
});

// 4. Log mood data
await paceful.mood.log({
  externalId: 'user-123',
  mood: 4,
  note: 'Feeling good today'
});

// 5. Get ERS score
const ers = await paceful.ers.get('user-123');
console.log(ers.ersScore, ers.stage);`} />

          <p style={styles.paragraph}>
            Need an API key?{' '}
            <a href="mailto:partners@paceful.com?subject=API Key Request" style={{ color: '#5B8A72' }}>
              Contact partners@paceful.com
            </a>
          </p>
        </section>

        {/* Sandbox Mode */}
        <section id="sandbox" style={styles.section}>
          <h2 style={styles.sectionTitle}>Sandbox Mode</h2>
          <p style={styles.paragraph}>
            Test the Paceful API without affecting production data. Use the sandbox API key to receive
            realistic mock responses from all endpoints.
          </p>

          <div style={{
            backgroundColor: '#E8F5E9',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
            borderLeft: '4px solid #5B8A72',
          }}>
            <p style={{ ...styles.paragraph, marginBottom: 0, color: '#2E7D32' }}>
              <strong>Sandbox API Key:</strong>{' '}
              <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                pk_sandbox_paceful_demo
              </code>
            </p>
          </div>

          <h3 style={styles.subsectionTitle}>How It Works</h3>
          <p style={styles.paragraph}>
            Simply use the sandbox API key in your <code>X-API-Key</code> header. The API will:
          </p>
          <ul style={{ ...styles.paragraph, paddingLeft: '24px' }}>
            <li>Return realistic mock data for all endpoints</li>
            <li>Generate deterministic responses based on user IDs (same ID = same data)</li>
            <li>Skip all database operations and rate limiting</li>
            <li>Work with any external ID you provide</li>
          </ul>

          <h3 style={styles.subsectionTitle}>Try It Out</h3>
          <CodeBlock code={{
            curl: `# Register a test user
curl -X POST "https://paceful-app.vercel.app/api/v1/partner/users/register" \\
  -H "X-API-Key: pk_sandbox_paceful_demo" \\
  -H "Content-Type: application/json" \\
  -d '{"externalId": "test-user-123"}'

# Get their ERS score
curl -X GET "https://paceful-app.vercel.app/api/v1/partner/ers/test-user-123" \\
  -H "X-API-Key: pk_sandbox_paceful_demo"

# Log a mood
curl -X POST "https://paceful-app.vercel.app/api/v1/partner/mood/log" \\
  -H "X-API-Key: pk_sandbox_paceful_demo" \\
  -H "Content-Type: application/json" \\
  -d '{"externalId": "test-user-123", "score": 4}'`,
            javascript: `// Use the sandbox key during development
const paceful = new PacefulClient({
  apiKey: 'pk_sandbox_paceful_demo'
});

// All endpoints return realistic mock data
const user = await paceful.users.register({ externalId: 'test-user-123' });
console.log(user.pacefulUserId); // "pf_sandbox_..."

const ers = await paceful.ers.get('test-user-123');
console.log(ers.ersScore); // e.g., 66
console.log(ers.stage); // e.g., "rebuilding"

// Same user ID always returns same data
const ers2 = await paceful.ers.get('test-user-123');
console.log(ers.ersScore === ers2.ersScore); // true`,
            python: `# Use the sandbox key during development
paceful = PacefulClient(api_key='pk_sandbox_paceful_demo')

# All endpoints return realistic mock data
user = paceful.users.register(external_id='test-user-123')
print(user.paceful_user_id)  # "pf_sandbox_..."

ers = paceful.ers.get('test-user-123')
print(ers.ers_score)  # e.g., 66
print(ers.stage)  # e.g., "rebuilding"`
          }} />

          <h3 style={styles.subsectionTitle}>Available Sandbox Endpoints</h3>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            marginBottom: '16px',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560', width: '80px' }}>Method</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {[
                { method: 'POST', path: '/partner/users/register' },
                { method: 'POST', path: '/partner/mood/log' },
                { method: 'POST', path: '/partner/journal/entry' },
                { method: 'GET', path: '/partner/ers/{externalId}' },
                { method: 'POST', path: '/partner/ers/calculate' },
                { method: 'POST', path: '/partner/ers/batch' },
                { method: 'GET', path: '/partner/analytics/summary' },
                { method: 'POST', path: '/partner/webhooks/register' },
                { method: 'GET', path: '/partner/webhooks/list' },
                { method: 'GET', path: '/partner/info' },
                { method: 'GET', path: '/partner/usage' },
                { method: 'GET', path: '/partner/config' },
                { method: 'PUT', path: '/partner/config' },
                { method: 'GET', path: '/assess/snapshot/questions' },
                { method: 'POST', path: '/assess/snapshot' },
              ].map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}><MethodBadge method={e.method as 'GET' | 'POST' | 'PUT' | 'DELETE'} /></td>
                  <td style={{ padding: '8px 0' }}><code>{e.path}</code></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={styles.subsectionTitle}>Sandbox User Data</h3>
          <p style={styles.paragraph}>
            The sandbox includes 25 pre-generated users with varying ERS stages and engagement history.
            You can also use any external ID you want — the sandbox will generate deterministic data
            based on the ID.
          </p>
          <CodeBlock code={`// Pre-defined sandbox users
"sandbox_user_001" through "sandbox_user_025"

// User distribution:
// - 5 users in "healing" stage (ERS 25-45)
// - 12 users in "rebuilding" stage (ERS 50-70)
// - 8 users in "ready" stage (ERS 75-92)

// Example: Get a healing-stage user
curl -X GET "https://paceful-app.vercel.app/api/v1/partner/ers/sandbox_user_001" \\
  -H "X-API-Key: pk_sandbox_paceful_demo"

// Example: Get a ready-stage user
curl -X GET "https://paceful-app.vercel.app/api/v1/partner/ers/sandbox_user_020" \\
  -H "X-API-Key: pk_sandbox_paceful_demo"`} />

          <h3 style={styles.subsectionTitle}>Testing ERS Explainability</h3>
          <p style={styles.paragraph}>
            Sandbox mode supports all ERS configuration options including verbosity, tone, and score format:
          </p>
          <CodeBlock code={{
            curl: `# Test clinical verbosity with motivational tone
curl -X POST "https://paceful-app.vercel.app/api/v1/assess/snapshot" \\
  -H "X-API-Key: pk_sandbox_paceful_demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "config": {
      "verbosity": "clinical",
      "tone": "motivational",
      "score_format": "traffic_light"
    },
    "responses": [
      {"dimension": "emotional_stability", "question_id": 1, "value": 4},
      {"dimension": "emotional_stability", "question_id": 2, "value": 3},
      {"dimension": "self_reflection", "question_id": 3, "value": 4},
      {"dimension": "self_reflection", "question_id": 4, "value": 4},
      {"dimension": "coping_capacity", "question_id": 5, "value": 3},
      {"dimension": "coping_capacity", "question_id": 6, "value": 4},
      {"dimension": "behavioral_engagement", "question_id": 7, "value": 4},
      {"dimension": "behavioral_engagement", "question_id": 8, "value": 3},
      {"dimension": "social_readiness", "question_id": 9, "value": 3},
      {"dimension": "social_readiness", "question_id": 10, "value": 4}
    ]
  }'`,
            javascript: `// Test with different configurations
const result = await fetch('https://paceful-app.vercel.app/api/v1/assess/snapshot', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_sandbox_paceful_demo',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    config: {
      verbosity: 'clinical',       // Get full details with recommended_action
      tone: 'motivational',         // Encouraging language
      score_format: 'traffic_light' // red/yellow/green output
    },
    responses: [
      { dimension: 'emotional_stability', question_id: 1, value: 4 },
      // ... all 10 responses
    ]
  })
});`,
            python: `# Test with different configurations
result = requests.post(
    'https://paceful-app.vercel.app/api/v1/assess/snapshot',
    headers={
        'X-API-Key': 'pk_sandbox_paceful_demo',
        'Content-Type': 'application/json'
    },
    json={
        'config': {
            'verbosity': 'clinical',        # Get full details
            'tone': 'motivational',          # Encouraging language
            'score_format': 'traffic_light'  # red/yellow/green
        },
        'responses': [
            {'dimension': 'emotional_stability', 'question_id': 1, 'value': 4},
            # ... all 10 responses
        ]
    }
)`
          }} />
        </section>

        {/* API Playground */}
        <section id="playground" style={styles.section}>
          <h2 style={styles.sectionTitle}>API Playground</h2>
          <p style={styles.paragraph}>
            Test API endpoints directly in your browser. The playground is pre-loaded with the sandbox API key
            for safe experimentation — no production data will be affected.
          </p>
          <ApiPlayground defaultApiKey="pk_sandbox_paceful_demo" />
        </section>

        {/* Authentication */}
        <section id="authentication" style={styles.section}>
          <h2 style={styles.sectionTitle}>Authentication</h2>
          <p style={styles.paragraph}>
            All API requests require authentication using your API key. Include it in the{' '}
            <code>X-API-Key</code> header with every request.
          </p>
          <p style={styles.paragraph}>
            <strong>Key formats:</strong><br />
            • <code>pk_test_*</code> — Sandbox environment (for development)<br />
            • <code>pk_live_*</code> — Production environment
          </p>
          <CodeBlock code={{
            curl: `curl -X GET "https://paceful-app.vercel.app/api/v1/partner/info" \\
  -H "X-API-Key: pk_live_your_api_key" \\
  -H "Content-Type: application/json"`,
            javascript: `const response = await fetch('https://paceful-app.vercel.app/api/v1/partner/info', {
  headers: {
    'X-API-Key': 'pk_live_your_api_key',
    'Content-Type': 'application/json'
  }
});`,
            python: `import requests

response = requests.get(
    'https://paceful-app.vercel.app/api/v1/partner/info',
    headers={
        'X-API-Key': 'pk_live_your_api_key',
        'Content-Type': 'application/json'
    }
)`
          }} />
        </section>

        {/* Users */}
        <section id="users" style={styles.section}>
          <h2 style={styles.sectionTitle}>Users</h2>
          <p style={styles.paragraph}>
            Register and manage users in your Paceful integration. Each user is identified by your
            system's external ID.
          </p>

          <div id="register-user" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /users/register
            </div>
            <p style={styles.paragraph}>
              Register a new user or update existing user context. Returns a Paceful user ID.
            </p>
            <ParamsTable params={[
              { name: 'externalId', type: 'string', required: true, description: 'Your unique identifier for this user' },
              { name: 'context', type: 'object', required: false, description: 'Optional user context (age range, preferences)' },
              { name: 'consentGiven', type: 'boolean', required: false, description: 'Whether user consented to data processing' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X POST "https://paceful-app.vercel.app/api/v1/partner/users/register" \\
  -H "X-API-Key: pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"externalId": "user-123", "consentGiven": true}'`,
              javascript: `const user = await paceful.users.register({
  externalId: 'user-123',
  consentGiven: true
});`,
              python: `user = paceful.users.register(
    external_id='user-123',
    consent_given=True
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "pacefulUserId": "pf_abc123def456",
    "externalId": "user-123",
    "status": "active"
  }
}`} />
          </div>
        </section>

        {/* Bulk Import */}
        <section id="bulk-import" style={styles.section}>
          <h2 style={styles.sectionTitle}>Bulk Import</h2>
          <p style={styles.paragraph}>
            For partners with existing user bases, bulk import endpoints allow you to onboard users and historical
            data efficiently — up to 500 users or 1000 mood entries per request.
          </p>

          <div style={{
            backgroundColor: '#FFF8E1',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
            borderLeft: '4px solid #C4973B',
          }}>
            <p style={{ ...styles.paragraph, marginBottom: 0, color: '#8D6E24' }}>
              <strong>Rate Limiting:</strong> Batch endpoints count as <strong>1 request</strong> against your rate limit,
              not N requests. Maximum payload size is 5MB.
            </p>
          </div>

          <div id="import-users" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /import/users
            </div>
            <p style={styles.paragraph}>
              Import up to 500 users in a single request. Users that already exist are skipped (not errored).
              Each user is processed independently — failures don't affect other users in the batch.
            </p>
            <ParamsTable params={[
              { name: 'users', type: 'array', required: true, description: 'Array of user objects (max 500)' },
              { name: 'users[].externalId', type: 'string', required: true, description: 'Your unique identifier for this user' },
              { name: 'users[].context', type: 'object', required: false, description: 'Optional user context (breakupDate, etc.)' },
              { name: 'users[].consentGiven', type: 'boolean', required: false, description: 'Whether user consented to data processing' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X POST "https://paceful-app.vercel.app/api/v1/partner/import/users" \\
  -H "X-API-Key: pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "users": [
      { "externalId": "user-001", "context": { "breakupDate": "2026-01-15", "relationshipDuration": "2y" }, "consentGiven": true },
      { "externalId": "user-002", "context": { "breakupDate": "2025-11-01" }, "consentGiven": true },
      { "externalId": "user-003", "consentGiven": true }
    ]
  }'`,
              javascript: `const response = await fetch('https://paceful-app.vercel.app/api/v1/partner/import/users', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_live_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    users: [
      { externalId: 'user-001', context: { breakupDate: '2026-01-15' }, consentGiven: true },
      { externalId: 'user-002', context: { breakupDate: '2025-11-01' }, consentGiven: true },
      // ... up to 500 users
    ]
  })
});

const { created, skipped, failed, results } = await response.json();`,
              python: `response = requests.post(
    'https://paceful-app.vercel.app/api/v1/partner/import/users',
    headers={
        'X-API-Key': 'pk_live_your_api_key',
        'Content-Type': 'application/json'
    },
    json={
        'users': [
            {'externalId': 'user-001', 'context': {'breakupDate': '2026-01-15'}, 'consentGiven': True},
            {'externalId': 'user-002', 'context': {'breakupDate': '2025-11-01'}, 'consentGiven': True},
            # ... up to 500 users
        ]
    }
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "total": 50,
    "created": 45,
    "skipped": 3,
    "failed": 2,
    "results": [
      { "externalId": "user-001", "status": "created", "pacefulUserId": "pf_abc123" },
      { "externalId": "user-002", "status": "skipped", "reason": "already_exists" },
      { "externalId": "user-003", "status": "failed", "reason": "invalid_external_id" }
    ]
  }
}`} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Status Values</h4>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { status: 'created', desc: 'User successfully created' },
                  { status: 'skipped', desc: 'User already exists (not an error)' },
                  { status: 'failed', desc: 'Could not create user — check reason field' },
                ].map((s) => (
                  <tr key={s.status} style={{ borderBottom: '1px solid #E5E0D9' }}>
                    <td style={{ padding: '8px 0' }}><code>{s.status}</code></td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div id="import-mood" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /import/mood
            </div>
            <p style={styles.paragraph}>
              Import up to 1000 historical mood entries in a single request. Users must be registered first.
              Each entry is processed independently.
            </p>
            <ParamsTable params={[
              { name: 'entries', type: 'array', required: true, description: 'Array of mood entries (max 1000)' },
              { name: 'entries[].externalId', type: 'string', required: true, description: 'Your user identifier' },
              { name: 'entries[].score', type: 'number', required: true, description: 'Mood score 1-5' },
              { name: 'entries[].label', type: 'string', required: false, description: 'Mood label (e.g., "good", "okay")' },
              { name: 'entries[].emotions', type: 'string[]', required: false, description: 'Associated emotions' },
              { name: 'entries[].timestamp', type: 'string', required: true, description: 'ISO 8601 timestamp of the mood log' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X POST "https://paceful-app.vercel.app/api/v1/partner/import/mood" \\
  -H "X-API-Key: pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entries": [
      { "externalId": "user-001", "score": 3, "label": "okay", "emotions": ["anxious"], "timestamp": "2026-03-01T10:00:00Z" },
      { "externalId": "user-001", "score": 4, "label": "good", "emotions": ["hopeful"], "timestamp": "2026-03-02T10:00:00Z" },
      { "externalId": "user-002", "score": 2, "label": "difficult", "emotions": ["sad", "lonely"], "timestamp": "2026-03-01T18:00:00Z" }
    ]
  }'`,
              javascript: `const response = await fetch('https://paceful-app.vercel.app/api/v1/partner/import/mood', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_live_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    entries: [
      { externalId: 'user-001', score: 3, label: 'okay', emotions: ['anxious'], timestamp: '2026-03-01T10:00:00Z' },
      { externalId: 'user-001', score: 4, label: 'good', emotions: ['hopeful'], timestamp: '2026-03-02T10:00:00Z' },
      // ... up to 1000 entries
    ]
  })
});

const { created, skipped, failed, results } = await response.json();`,
              python: `response = requests.post(
    'https://paceful-app.vercel.app/api/v1/partner/import/mood',
    headers={
        'X-API-Key': 'pk_live_your_api_key',
        'Content-Type': 'application/json'
    },
    json={
        'entries': [
            {'externalId': 'user-001', 'score': 3, 'label': 'okay', 'emotions': ['anxious'], 'timestamp': '2026-03-01T10:00:00Z'},
            {'externalId': 'user-001', 'score': 4, 'label': 'good', 'emotions': ['hopeful'], 'timestamp': '2026-03-02T10:00:00Z'},
            # ... up to 1000 entries
        ]
    }
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "total": 100,
    "created": 95,
    "skipped": 2,
    "failed": 3,
    "results": [
      { "externalId": "user-001", "timestamp": "2026-03-01T10:00:00Z", "status": "created", "moodId": "mood_xyz789" },
      { "externalId": "user-002", "timestamp": "2026-03-01T18:00:00Z", "status": "failed", "reason": "user_not_found" },
      { "externalId": "user-003", "timestamp": "2026-03-01T12:00:00Z", "status": "failed", "reason": "invalid_score" }
    ]
  }
}`} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Failure Reasons</h4>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Reason</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { reason: 'user_not_found', desc: 'No user registered with this externalId' },
                  { reason: 'invalid_score', desc: 'Score must be 1-5' },
                  { reason: 'invalid_timestamp', desc: 'Timestamp is not valid ISO 8601' },
                  { reason: 'missing_timestamp', desc: 'Timestamp is required' },
                ].map((r) => (
                  <tr key={r.reason} style={{ borderBottom: '1px solid #E5E0D9' }}>
                    <td style={{ padding: '8px 0' }}><code>{r.reason}</code></td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Mood */}
        <section id="mood" style={styles.section}>
          <h2 style={styles.sectionTitle}>Mood</h2>
          <p style={styles.paragraph}>
            Track mood data for your users. Mood logs contribute to ERS calculations.
          </p>

          <div id="log-mood" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /mood/log
            </div>
            <p style={styles.paragraph}>
              Log a mood entry for a user. Triggers <code>mood.logged</code> webhook.
            </p>
            <ParamsTable params={[
              { name: 'externalId', type: 'string', required: true, description: 'Your user identifier' },
              { name: 'score', type: 'number', required: true, description: 'Mood score 1-5 (1=struggling, 5=great)' },
              { name: 'label', type: 'string', required: false, description: 'Mood label (e.g., "Good", "Okay")' },
              { name: 'emotions', type: 'string[]', required: false, description: 'Associated emotions (e.g., ["anxious", "hopeful"])' },
              { name: 'note', type: 'string', required: false, description: 'Optional note from user' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X POST "https://paceful-app.vercel.app/api/v1/partner/mood/log" \\
  -H "X-API-Key: pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"externalId": "user-123", "score": 4, "emotions": ["hopeful", "calm"]}'`,
              javascript: `const mood = await paceful.mood.log({
  externalId: 'user-123',
  mood: 4,
  emotions: ['hopeful', 'calm']
});`,
              python: `mood = paceful.mood.log(
    external_id='user-123',
    score=4,
    emotions=['hopeful', 'calm']
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "logged": true,
    "moodId": "mood_xyz789",
    "timestamp": "2026-02-17T12:00:00Z"
  }
}`} />
          </div>
        </section>

        {/* Journal */}
        <section id="journal" style={styles.section}>
          <h2 style={styles.sectionTitle}>Journal</h2>
          <p style={styles.paragraph}>
            Create journal entries with AI-powered reflection and sentiment analysis.
          </p>

          <div id="create-entry" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /journal/entry
            </div>
            <p style={styles.paragraph}>
              Create a journal entry. Returns AI reflection and sentiment analysis.
            </p>
            <ParamsTable params={[
              { name: 'externalId', type: 'string', required: true, description: 'Your user identifier' },
              { name: 'content', type: 'string', required: true, description: 'Journal entry content' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X POST "https://paceful-app.vercel.app/api/v1/partner/journal/entry" \\
  -H "X-API-Key: pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"externalId": "user-123", "content": "Today I reflected on my progress..."}'`,
              javascript: `const entry = await paceful.journal.create({
  externalId: 'user-123',
  content: 'Today I reflected on my progress...'
});`,
              python: `entry = paceful.journal.create(
    external_id='user-123',
    content='Today I reflected on my progress...'
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "entryId": "journal_abc123",
    "sentiment": "Hopeful",
    "sentimentScore": 0.78,
    "aiReflection": "Your entry shows meaningful growth in self-awareness...",
    "wordCount": 156
  }
}`} />
          </div>
        </section>

        {/* ERS */}
        <section id="ers" style={styles.section}>
          <h2 style={styles.sectionTitle}>ERS Scores</h2>
          <p style={styles.paragraph}>
            The Emotional Readiness Score (ERS) is a 0-100 score measuring emotional recovery
            across 5 clinical dimensions.
          </p>

          <div id="get-score" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /ers/{'{externalId}'}
            </div>
            <p style={styles.paragraph}>
              Get the current ERS score for a user. Returns cached score if recent (&lt;24h).
            </p>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "userId": "user-123",
    "ersScore": 66,
    "stage": "ready",
    "dimensions": {
      "emotionalStability": 72,
      "selfAwareness": 68,
      "socialConnection": 65,
      "purposeClarity": 60,
      "resilienceGrowth": 70
    },
    "calculatedAt": "2026-02-17T12:00:00Z",
    "trend": {
      "direction": "up",
      "weeklyChange": 3.2,
      "daysTracked": 14
    }
  }
}`} />
          </div>

          <div id="calculate-score" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /ers/calculate
            </div>
            <p style={styles.paragraph}>
              Force a fresh ERS calculation. Triggers <code>ers.stage_changed</code> webhook if stage changes.
            </p>
            <ParamsTable params={[
              { name: 'externalId', type: 'string', required: true, description: 'Your user identifier' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "ersScore": 66,
    "stage": "ready",
    "dimensions": { ... },
    "previousScore": 63,
    "change": 3,
    "dataPointsUsed": 42
  }
}`} />
          </div>

          <div id="batch-scores" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /ers/batch
            </div>
            <p style={styles.paragraph}>
              Get ERS scores for multiple users in a single request. Maximum 50 users.
            </p>
            <ParamsTable params={[
              { name: 'externalIds', type: 'string[]', required: true, description: 'Array of user identifiers (max 50)' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "results": [
      { "externalId": "user-1", "ersScore": 66, "stage": "ready", "calculatedAt": "..." },
      { "externalId": "user-2", "ersScore": 45, "stage": "rebuilding", "calculatedAt": "..." }
    ],
    "totalRequested": 2,
    "totalReturned": 2
  }
}`} />
          </div>

          <div id="ers-history" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /ers/{'{externalId}'}/history
            </div>
            <p style={styles.paragraph}>
              Get historical ERS scores for a user over time. Powers dashboards, clinical progress reports,
              and outcome measurement with trend analysis and milestone detection.
            </p>
            <ParamsTable params={[
              { name: 'period', type: 'string', required: false, description: '"7d", "30d", "90d", or "all" (default: "30d")' },
              { name: 'granularity', type: 'string', required: false, description: '"daily", "weekly", or "monthly" (default: "daily")' },
              { name: 'include_dimensions', type: 'boolean', required: false, description: 'Include per-dimension breakdown (default: true)' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X GET "https://paceful-app.vercel.app/api/v1/partner/ers/user-123/history?period=30d&granularity=daily" \\
  -H "X-API-Key: pk_live_your_api_key"`,
              javascript: `const response = await fetch(
  'https://paceful-app.vercel.app/api/v1/partner/ers/user-123/history?period=30d',
  { headers: { 'X-API-Key': 'pk_live_your_api_key' } }
);
const { trend, milestones, history } = await response.json();`,
              python: `response = requests.get(
    'https://paceful-app.vercel.app/api/v1/partner/ers/user-123/history',
    params={'period': '30d', 'granularity': 'daily'},
    headers={'X-API-Key': 'pk_live_your_api_key'}
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "userId": "user-123",
    "period": "30d",
    "granularity": "daily",
    "currentScore": 62,
    "currentStage": "rebuilding",
    "trend": {
      "direction": "improving",
      "totalChange": 14,
      "weeklyRate": 3.5,
      "dataPointsUsed": 28
    },
    "milestones": [
      {
        "date": "2026-03-05T00:00:00Z",
        "type": "stage_transition",
        "from": "healing",
        "to": "rebuilding",
        "scoreAtTransition": 45
      }
    ],
    "history": [
      {
        "date": "2026-02-18T00:00:00Z",
        "score": 48,
        "stage": "healing",
        "dimensions": {
          "emotional_stability": 42,
          "self_reflection": 55,
          "coping_capacity": 50,
          "behavioral_engagement": 44,
          "social_readiness": 49
        }
      }
      // ... more data points
    ]
  }
}`} />
          </div>

          <div id="ers-trends" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /ers/trends/aggregate
            </div>
            <p style={styles.paragraph}>
              Get aggregate ERS trends across ALL of your users. Perfect for population-level analytics,
              outcome reporting, and tracking the effectiveness of your program over time.
            </p>
            <ParamsTable params={[
              { name: 'period', type: 'string', required: false, description: '"7d", "30d", or "90d" (default: "30d")' },
              { name: 'granularity', type: 'string', required: false, description: '"daily", "weekly", or "monthly" (default: "weekly")' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X GET "https://paceful-app.vercel.app/api/v1/partner/ers/trends/aggregate?period=30d&granularity=weekly" \\
  -H "X-API-Key: pk_live_your_api_key"`,
              javascript: `const response = await fetch(
  'https://paceful-app.vercel.app/api/v1/partner/ers/trends/aggregate?period=30d',
  { headers: { 'X-API-Key': 'pk_live_your_api_key' } }
);
const { overallTrend, stageDistributionEnd, transitionsInPeriod } = await response.json();`,
              python: `response = requests.get(
    'https://paceful-app.vercel.app/api/v1/partner/ers/trends/aggregate',
    params={'period': '30d', 'granularity': 'weekly'},
    headers={'X-API-Key': 'pk_live_your_api_key'}
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "period": "30d",
    "granularity": "weekly",
    "totalUsers": 487,
    "averageScoreStart": 41,
    "averageScoreEnd": 52,
    "overallTrend": "improving",
    "stageDistributionStart": {
      "healing": 0.45,
      "rebuilding": 0.35,
      "ready": 0.20
    },
    "stageDistributionEnd": {
      "healing": 0.30,
      "rebuilding": 0.40,
      "ready": 0.30
    },
    "transitionsInPeriod": {
      "healing_to_rebuilding": 73,
      "rebuilding_to_ready": 48,
      "ready_to_rebuilding": 12,
      "rebuilding_to_healing": 8
    },
    "timeline": [
      {
        "date": "2026-02-17",
        "averageScore": 43,
        "stageDistribution": {
          "healing": 0.42,
          "rebuilding": 0.36,
          "ready": 0.22
        },
        "userCount": 478
      }
      // ... more weeks
    ]
  }
}`} />
          </div>
        </section>

        {/* Snapshot Assessment */}
        <section id="snapshot" style={styles.section}>
          <h2 style={styles.sectionTitle}>Snapshot Assessment</h2>
          <p style={styles.paragraph}>
            A lightweight emotional readiness check — 10 clinically-informed questions that return an
            estimated ERS score without requiring historical data. Perfect for onboarding assessments
            or quick check-ins.
          </p>
          <p style={styles.paragraph}>
            The assessment measures 5 dimensions (2 questions each) on a 1-5 Likert scale:
          </p>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Dimension</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Weight</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { dim: 'emotional_stability', weight: '25%', desc: 'Mood consistency and emotional reactivity' },
                { dim: 'social_readiness', weight: '25%', desc: 'Openness to connections and social presence' },
                { dim: 'coping_capacity', weight: '20%', desc: 'Handling stress and bouncing back' },
                { dim: 'self_reflection', weight: '15%', desc: 'Processing experiences and understanding patterns' },
                { dim: 'behavioral_engagement', weight: '15%', desc: 'Maintaining routines and self-care' },
              ].map((d) => (
                <tr key={d.dim} style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}><code>{d.dim}</code></td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>{d.weight}</td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>{d.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div id="snapshot-questions" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /assess/snapshot/questions
            </div>
            <p style={styles.paragraph}>
              Returns the 10 assessment questions with dimension mapping and answer options.
            </p>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X GET "https://paceful-app.vercel.app/api/v1/assess/snapshot/questions" \\
  -H "X-API-Key: pk_live_your_api_key"`,
              javascript: `const response = await fetch('https://paceful-app.vercel.app/api/v1/assess/snapshot/questions', {
  headers: { 'X-API-Key': 'pk_live_your_api_key' }
});
const { questions, dimensions } = await response.json();`,
              python: `response = requests.get(
    'https://paceful-app.vercel.app/api/v1/assess/snapshot/questions',
    headers={'X-API-Key': 'pk_live_your_api_key'}
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 1,
        "dimension": "emotional_stability",
        "text": "Over the past week, how often have you experienced sudden mood swings?",
        "scale": {
          "1": "Very often (multiple times daily)",
          "2": "Often (daily)",
          "3": "Sometimes (a few times this week)",
          "4": "Rarely (once or twice)",
          "5": "Never or almost never"
        }
      },
      // ... 9 more questions
    ],
    "dimensions": [
      { "id": "emotional_stability", "name": "Emotional Stability", "weight": 0.25 },
      // ...
    ],
    "instructions": {
      "totalQuestions": 10,
      "questionsPerDimension": 2,
      "scaleType": "likert",
      "scaleRange": { "min": 1, "max": 5 }
    }
  }
}`} />
          </div>

          <div id="snapshot-submit" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /assess/snapshot
            </div>
            <p style={styles.paragraph}>
              Submit assessment responses to receive an estimated ERS score. All 10 questions must be answered.
            </p>
            <ParamsTable params={[
              { name: 'responses', type: 'array', required: true, description: 'Array of 10 response objects' },
              { name: 'responses[].dimension', type: 'string', required: true, description: 'Dimension ID (e.g., "emotional_stability")' },
              { name: 'responses[].question_id', type: 'number', required: true, description: 'Question ID (1-10)' },
              { name: 'responses[].value', type: 'number', required: true, description: 'Likert scale value (1-5)' },
              { name: 'externalId', type: 'string', required: false, description: 'Optional user identifier for tracking' },
              { name: 'config', type: 'object', required: false, description: 'Configuration options (overrides partner defaults)' },
              { name: 'config.verbosity', type: 'string', required: false, description: '"minimal" (default), "standard", or "clinical"' },
              { name: 'config.tone', type: 'string', required: false, description: '"clinical" (default), "casual", or "motivational"' },
              { name: 'config.score_format', type: 'string', required: false, description: '"numerical" (default), "percentage", "tier_label", or "traffic_light"' },
              { name: 'config.traffic_light_thresholds', type: 'object', required: false, description: 'Custom thresholds: {red_max: 33, yellow_max: 66}' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X POST "https://paceful-app.vercel.app/api/v1/assess/snapshot" \\
  -H "X-API-Key: pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalId": "user-123",
    "config": { "verbosity": "standard" },
    "responses": [
      { "dimension": "emotional_stability", "question_id": 1, "value": 4 },
      { "dimension": "emotional_stability", "question_id": 2, "value": 3 },
      { "dimension": "self_reflection", "question_id": 3, "value": 4 },
      { "dimension": "self_reflection", "question_id": 4, "value": 4 },
      { "dimension": "coping_capacity", "question_id": 5, "value": 3 },
      { "dimension": "coping_capacity", "question_id": 6, "value": 4 },
      { "dimension": "behavioral_engagement", "question_id": 7, "value": 4 },
      { "dimension": "behavioral_engagement", "question_id": 8, "value": 3 },
      { "dimension": "social_readiness", "question_id": 9, "value": 3 },
      { "dimension": "social_readiness", "question_id": 10, "value": 4 }
    ]
  }'`,
              javascript: `const result = await fetch('https://paceful-app.vercel.app/api/v1/assess/snapshot', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_live_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    externalId: 'user-123',
    config: { verbosity: 'standard' }, // or 'minimal' (default), 'clinical'
    responses: [
      { dimension: 'emotional_stability', question_id: 1, value: 4 },
      { dimension: 'emotional_stability', question_id: 2, value: 3 },
      // ... all 10 responses
    ]
  })
});`,
              python: `result = requests.post(
    'https://paceful-app.vercel.app/api/v1/assess/snapshot',
    headers={
        'X-API-Key': 'pk_live_your_api_key',
        'Content-Type': 'application/json'
    },
    json={
        'externalId': 'user-123',
        'config': {'verbosity': 'standard'},  # or 'minimal' (default), 'clinical'
        'responses': [
            {'dimension': 'emotional_stability', 'question_id': 1, 'value': 4},
            # ... all 10 responses
        ]
    }
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response (minimal verbosity - default)</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "ers_snapshot": 66,
    "dimensions": {
      "emotional_stability": { "score": 63, "label": "high" },
      "self_reflection": { "score": 75, "label": "high" },
      "coping_capacity": { "score": 63, "label": "high" },
      "behavioral_engagement": { "score": 63, "label": "high" },
      "social_readiness": { "score": 63, "label": "high" }
    },
    "readiness_label": "Rebuilding",
    "confidence": "estimated",
    "assessment_id": "snap_m3x7k_a1b2c3",
    "timestamp": "2026-02-26T12:00:00Z"
  }
}`} />

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Verbosity Levels</h4>
            <p style={styles.paragraph}>
              Control the level of detail returned using <code>config.verbosity</code>:
            </p>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Level</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Fields Returned</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Use Case</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { level: 'minimal', fields: 'score, label', use: 'Default, backward compatible. Quick checks.' },
                  { level: 'standard', fields: 'score, label, reasoning, trend, trend_delta, top_signals', use: 'User-facing insights, dashboards.' },
                  { level: 'clinical', fields: 'All standard fields + recommended_action', use: 'Clinical/coach interfaces, care planning.' },
                ].map((v) => (
                  <tr key={v.level} style={{ borderBottom: '1px solid #E5E0D9' }}>
                    <td style={{ padding: '8px 0' }}><code>{v.level}</code></td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{v.fields}</td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{v.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Tone Options</h4>
            <p style={styles.paragraph}>
              Control the language register using <code>config.tone</code>:
            </p>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Tone</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Style</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Use Case</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tone: 'clinical', style: 'Professional, objective', use: 'Healthcare providers, clinical settings (default)' },
                  { tone: 'casual', style: 'Friendly, approachable', use: 'Consumer apps, peer support platforms' },
                  { tone: 'motivational', style: 'Encouraging, growth-focused', use: 'Coaching apps, wellness programs' },
                ].map((t) => (
                  <tr key={t.tone} style={{ borderBottom: '1px solid #E5E0D9' }}>
                    <td style={{ padding: '8px 0' }}><code>{t.tone}</code></td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{t.style}</td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{t.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Score Format Options</h4>
            <p style={styles.paragraph}>
              Control how scores are displayed using <code>config.score_format</code>:
            </p>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Format</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Example</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { format: 'numerical', example: '66', desc: 'Raw 0-100 score (default)' },
                  { format: 'percentage', example: '"66%"', desc: 'Score with % suffix' },
                  { format: 'tier_label', example: '"high"', desc: 'Text label (very_low/low/moderate/high/very_high)' },
                  { format: 'traffic_light', example: '"green"', desc: 'red/yellow/green based on thresholds' },
                ].map((f) => (
                  <tr key={f.format} style={{ borderBottom: '1px solid #E5E0D9' }}>
                    <td style={{ padding: '8px 0' }}><code>{f.format}</code></td>
                    <td style={{ padding: '8px 0' }}><code>{f.example}</code></td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={styles.paragraph}>
              For <code>traffic_light</code>, default thresholds are: red (0-33), yellow (34-66), green (67-100).
              Override with <code>config.traffic_light_thresholds</code>: <code>{'{'}red_max: 40, yellow_max: 70{'}'}</code>
            </p>

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response (standard verbosity)</h4>
            <CodeBlock code={`// Request with config: { "verbosity": "standard", "tone": "casual" }
{
  "success": true,
  "data": {
    "ers_snapshot": 66,
    "dimensions": {
      "emotional_stability": {
        "score": 63,
        "label": "high",
        "reasoning": "Moderate emotional stability observed. Some mood fluctuation noted with variable recovery time. Key signals: mood_variance and time_of_day_consistency.",
        "trend": "stable",
        "trend_delta": null,
        "top_signals": ["mood_variance", "time_of_day_consistency"]
      }
      // ... other dimensions
    },
    "readiness_label": "Rebuilding",
    "confidence": "estimated",
    "assessment_id": "snap_m3x7k_a1b2c3",
    "timestamp": "2026-02-26T12:00:00Z",
    "meta": {
      "verbosity": "standard",
      "tone": "casual",
      "score_format": "numerical",
      "api_version": "1.3.0",
      "model_version": "ers-v1"
    }
  }
}`} />

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response (clinical verbosity)</h4>
            <CodeBlock code={`// Request with config: { "verbosity": "clinical" }
{
  "success": true,
  "data": {
    "ers_snapshot": 24,
    "dimensions": {
      "coping_capacity": {
        "score": 13,
        "label": "very_low",
        "reasoning": "Coping capacity needs development. Assessment indicates few reliable coping strategies and significant difficulty recovering from setbacks. Key signals: coping_tool_usage and goal_completion_rate.",
        "trend": "stable",
        "trend_delta": null,
        "top_signals": ["coping_tool_usage", "goal_completion_rate"],
        "recommended_action": "Priority should be placed on building a basic coping toolkit — current resources appear limited."
      }
      // ... other dimensions with recommended_action
    },
    "readiness_label": "Not Ready",
    "confidence": "estimated",
    "meta": {
      "verbosity": "clinical",
      "tone": "clinical",
      "score_format": "numerical",
      "api_version": "1.3.0",
      "model_version": "ers-v1"
    }
  }
}`} />

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Readiness Labels</h4>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Score Range</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Label</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { range: '0-39', label: 'Not Ready', interp: 'Significant support needed' },
                  { range: '40-59', label: 'Healing', interp: 'Active recovery in progress' },
                  { range: '60-74', label: 'Rebuilding', interp: 'Building resilience and stability' },
                  { range: '75-100', label: 'Ready', interp: 'Emotionally prepared for new challenges' },
                ].map((r) => (
                  <tr key={r.label} style={{ borderBottom: '1px solid #E5E0D9' }}>
                    <td style={{ padding: '8px 0' }}>{r.range}</td>
                    <td style={{ padding: '8px 0' }}><strong>{r.label}</strong></td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{r.interp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Partner Config */}
        <section id="partner-config" style={styles.section}>
          <h2 style={styles.sectionTitle}>Partner Config</h2>
          <p style={styles.paragraph}>
            Set default configuration for your API responses. These defaults apply to all requests
            unless overridden by per-request <code>config</code> parameters.
          </p>

          <div id="get-config" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /partner/config
            </div>
            <p style={styles.paragraph}>
              Retrieve your current default configuration settings.
            </p>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "config": {
    "verbosity": "minimal",
    "tone": "clinical",
    "score_format": "numerical",
    "traffic_light_thresholds": { "red_max": 33, "yellow_max": 66 },
    "include_signals": true,
    "include_trend": true
  },
  "is_default": true,
  "partner_id": "your_partner_id"
}`} />
          </div>

          <div id="update-config" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="PUT" />
              /partner/config
            </div>
            <p style={styles.paragraph}>
              Update your default configuration. Only include fields you want to change.
            </p>
            <ParamsTable params={[
              { name: 'config', type: 'object', required: true, description: 'Configuration object with fields to update' },
              { name: 'config.verbosity', type: 'string', required: false, description: '"minimal", "standard", or "clinical"' },
              { name: 'config.tone', type: 'string', required: false, description: '"clinical", "casual", or "motivational"' },
              { name: 'config.score_format', type: 'string', required: false, description: '"numerical", "percentage", "tier_label", or "traffic_light"' },
              { name: 'config.traffic_light_thresholds', type: 'object', required: false, description: '{red_max: number, yellow_max: number}' },
              { name: 'config.include_signals', type: 'boolean', required: false, description: 'Include top_signals in response' },
              { name: 'config.include_trend', type: 'boolean', required: false, description: 'Include trend data in response' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X PUT "https://paceful-app.vercel.app/api/v1/partner/config" \\
  -H "Authorization: Bearer pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "config": { "verbosity": "standard", "tone": "casual", "score_format": "percentage" } }'`,
              javascript: `await fetch('https://paceful-app.vercel.app/api/v1/partner/config', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer pk_live_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    config: { verbosity: 'standard', tone: 'casual', score_format: 'percentage' }
  })
});`,
              python: `requests.put(
    'https://paceful-app.vercel.app/api/v1/partner/config',
    headers={
        'Authorization': 'Bearer pk_live_your_api_key',
        'Content-Type': 'application/json'
    },
    json={'config': {'verbosity': 'standard', 'tone': 'casual', 'score_format': 'percentage'}}
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "config": {
    "verbosity": "standard",
    "tone": "casual",
    "score_format": "percentage",
    "traffic_light_thresholds": { "red_max": 33, "yellow_max": 66 },
    "include_signals": true,
    "include_trend": true
  },
  "partner_id": "your_partner_id",
  "updated_at": "2026-03-06T12:00:00Z"
}`} />
          </div>
        </section>

        {/* Analytics */}
        <section id="analytics" style={styles.section}>
          <h2 style={styles.sectionTitle}>Analytics</h2>
          <p style={styles.paragraph}>
            Get aggregate analytics across your user base.
          </p>

          <div id="summary" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /analytics/summary?period=30d
            </div>
            <p style={styles.paragraph}>
              Get aggregate analytics for your partner account. Supports period filtering.
            </p>
            <ParamsTable params={[
              { name: 'period', type: 'string', required: false, description: 'Time period: 7d, 30d, 90d, or all (default: 30d)' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "averageErs": 58.3,
    "stageDistribution": {
      "healing": 0.25,
      "rebuilding": 0.45,
      "ready": 0.30
    },
    "engagementMetrics": {
      "avgMoodLogsPerWeek": 4.2,
      "avgJournalEntriesPerWeek": 1.8
    },
    "period": "30d"
  }
}`} />
          </div>
        </section>

        {/* Health & Status */}
        <section id="health-status" style={styles.section}>
          <h2 style={styles.sectionTitle}>Health & Status</h2>
          <p style={styles.paragraph}>
            Monitor service health and availability. Use the public endpoint for monitoring tools
            and the authenticated endpoint for detailed partner-specific information.
          </p>

          <div id="public-status" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /status
            </div>
            <p style={styles.paragraph}>
              Public health check endpoint. <strong>No authentication required.</strong> Cached for 30 seconds.
              Use this for uptime monitoring tools like UptimeRobot, Pingdom, etc.
            </p>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X GET "https://paceful-app.vercel.app/api/v1/status"`,
              javascript: `const response = await fetch('https://paceful-app.vercel.app/api/v1/status');
const status = await response.json();
console.log(status.status); // "operational"`,
              python: `response = requests.get('https://paceful-app.vercel.app/api/v1/status')
status = response.json()
print(status['status'])  # "operational"`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "status": "operational",
  "version": "1.0.0",
  "timestamp": "2026-03-18T15:30:00Z",
  "services": {
    "api": { "status": "operational", "responseTimeMs": 12 },
    "database": { "status": "operational", "responseTimeMs": 45 },
    "ers_engine": { "status": "operational" }
  },
  "uptime": "99.9%"
}`} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Status Values</h4>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { status: 'operational', desc: 'All systems functioning normally' },
                  { status: 'slow', desc: 'Database response time > 2000ms' },
                  { status: 'degraded', desc: 'Some services experiencing issues' },
                  { status: 'down', desc: 'Critical services unavailable' },
                ].map((s) => (
                  <tr key={s.status} style={{ borderBottom: '1px solid #E5E0D9' }}>
                    <td style={{ padding: '8px 0' }}><code>{s.status}</code></td>
                    <td style={{ padding: '8px 0', color: '#6B6560' }}>{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div id="partner-health" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              /partner/health
            </div>
            <p style={styles.paragraph}>
              Authenticated health check with partner-specific details. Returns service status plus
              your rate limits, webhook counts, registered users, and SDK version information.
            </p>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Request</h4>
            <CodeBlock code={{
              curl: `curl -X GET "https://paceful-app.vercel.app/api/v1/partner/health" \\
  -H "X-API-Key: pk_live_your_api_key"`,
              javascript: `const response = await fetch('https://paceful-app.vercel.app/api/v1/partner/health', {
  headers: { 'X-API-Key': 'pk_live_your_api_key' }
});
const health = await response.json();`,
              python: `response = requests.get(
    'https://paceful-app.vercel.app/api/v1/partner/health',
    headers={'X-API-Key': 'pk_live_your_api_key'}
)`
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "status": "operational",
    "version": "1.0.0",
    "timestamp": "2026-03-18T15:30:00Z",
    "services": {
      "api": { "status": "operational", "responseTimeMs": 12 },
      "database": { "status": "operational", "responseTimeMs": 45 },
      "ers_engine": { "status": "operational" }
    },
    "partner": {
      "name": "Your Company",
      "rateLimitRemaining": 87,
      "rateLimitReset": 1710772800,
      "activeWebhooks": 2,
      "totalUsersRegistered": 156,
      "lastApiCall": "2026-03-18T15:28:00Z"
    },
    "sdk": {
      "latestVersion": "1.1.0",
      "minimumSupported": "1.0.0"
    }
  }
}`} />
          </div>
        </section>

        {/* Webhooks */}
        <section id="webhooks" style={styles.section}>
          <h2 style={styles.sectionTitle}>Webhooks</h2>
          <p style={styles.paragraph}>
            Receive real-time notifications when events occur. Webhooks are signed with
            HMAC-SHA256 for verification.
          </p>

          <div id="register-webhook" style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="POST" />
              /webhooks/register
            </div>
            <p style={styles.paragraph}>
              Register a webhook endpoint. Returns a secret for signature verification.
            </p>
            <ParamsTable params={[
              { name: 'url', type: 'string', required: true, description: 'HTTPS webhook URL' },
              { name: 'events', type: 'string[]', required: true, description: 'Events to subscribe to' },
            ]} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Response</h4>
            <CodeBlock code={`{
  "success": true,
  "data": {
    "webhookId": "wh_abc123",
    "secret": "whsec_abc123def456...",
    "events": ["ers.stage_changed", "mood.critical"]
  }
}`} />
          </div>

          <div id="webhook-events" style={styles.endpoint}>
            <h3 style={styles.subsectionTitle}>Webhook Events</h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Event</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}><code>ers.stage_changed</code></td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>User moves between stages (healing → rebuilding → ready)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}><code>ers.score_threshold</code></td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>Score crosses a custom threshold</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}><code>mood.critical</code></td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>3+ consecutive low mood entries (score 1-2)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}><code>mood.logged</code></td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>Every mood log</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}><code>journal.created</code></td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>Every journal entry</td>
                </tr>
              </tbody>
            </table>

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Example Payload</h4>
            <CodeBlock code={`{
  "event": "ers.stage_changed",
  "timestamp": "2026-02-17T12:00:00Z",
  "data": {
    "externalId": "user-123",
    "previousStage": "rebuilding",
    "newStage": "ready",
    "previousScore": 64,
    "newScore": 68
  }
}`} />

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '16px' }}>Verifying Signatures</h4>
            <CodeBlock code={`import { Webhooks } from '@paceful/sdk';

// In your webhook handler:
const isValid = Webhooks.verifySignature(
  rawBody,
  request.headers['x-paceful-signature'],
  process.env.PACEFUL_WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}`} />
          </div>
        </section>

        {/* Widgets */}
        <section id="widgets" style={styles.section}>
          <h2 style={styles.sectionTitle}>Widgets</h2>
          <p style={styles.paragraph}>
            Pre-built React components for common interactions. Install with{' '}
            <code>npm install @paceful/sdk</code>.
          </p>

          <div id="mood-widget" style={styles.endpoint}>
            <h3 style={styles.subsectionTitle}>MoodWidget</h3>
            <p style={styles.paragraph}>Self-contained mood check-in component.</p>
            <ParamsTable params={[
              { name: 'apiKey', type: 'string', required: false, description: 'API key (optional with PacefulProvider)' },
              { name: 'userId', type: 'string', required: false, description: 'User ID (optional with PacefulProvider)' },
              { name: 'theme', type: "'light' | 'dark'", required: false, description: 'Color theme (default: light)' },
              { name: 'brandColor', type: 'string', required: false, description: 'Primary color (default: #5B8A72)' },
              { name: 'compact', type: 'boolean', required: false, description: 'Skip emotion selection (default: false)' },
              { name: 'onComplete', type: 'function', required: false, description: 'Callback when mood is logged' },
            ]} />
            <CodeBlock code={`import { MoodWidget } from '@paceful/sdk';

<MoodWidget
  apiKey="pk_live_..."
  userId="user-123"
  theme="light"
  brandColor="#5B8A72"
  onComplete={(mood) => console.log('Logged:', mood)}
/>`} />
          </div>

          <div id="journal-widget" style={styles.endpoint}>
            <h3 style={styles.subsectionTitle}>JournalWidget</h3>
            <p style={styles.paragraph}>Journal entry component with AI reflection.</p>
            <ParamsTable params={[
              { name: 'apiKey', type: 'string', required: false, description: 'API key (optional with PacefulProvider)' },
              { name: 'userId', type: 'string', required: false, description: 'User ID (optional with PacefulProvider)' },
              { name: 'theme', type: "'light' | 'dark'", required: false, description: 'Color theme (default: light)' },
              { name: 'showPrompt', type: 'boolean', required: false, description: 'Show random prompt (default: true)' },
              { name: 'showAIReflection', type: 'boolean', required: false, description: 'Show AI reflection (default: true)' },
              { name: 'maxLength', type: 'number', required: false, description: 'Max characters (default: 2000)' },
            ]} />
            <CodeBlock code={`import { JournalWidget } from '@paceful/sdk';

<JournalWidget
  apiKey="pk_live_..."
  userId="user-123"
  showPrompt={true}
  showAIReflection={true}
  onComplete={(entry) => console.log('Saved:', entry)}
/>`} />
          </div>

          <div id="ers-display" style={styles.endpoint}>
            <h3 style={styles.subsectionTitle}>ERSDisplay</h3>
            <p style={styles.paragraph}>ERS score visualization with dimensions and trend.</p>
            <ParamsTable params={[
              { name: 'apiKey', type: 'string', required: false, description: 'API key (optional with PacefulProvider)' },
              { name: 'userId', type: 'string', required: false, description: 'User ID (optional with PacefulProvider)' },
              { name: 'theme', type: "'light' | 'dark'", required: false, description: 'Color theme (default: light)' },
              { name: 'showDimensions', type: 'boolean', required: false, description: 'Show dimension bars (default: true)' },
              { name: 'showTrend', type: 'boolean', required: false, description: 'Show trend badge (default: true)' },
              { name: 'compact', type: 'boolean', required: false, description: 'Smaller ring, hide dimensions (default: false)' },
            ]} />
            <CodeBlock code={`import { ERSDisplay } from '@paceful/sdk';

<ERSDisplay
  apiKey="pk_live_..."
  userId="user-123"
  showDimensions={true}
  showTrend={true}
  onLoad={(ers) => console.log('ERS:', ers)}
/>`} />
          </div>

          <div id="paceful-provider" style={styles.endpoint}>
            <h3 style={styles.subsectionTitle}>PacefulProvider</h3>
            <p style={styles.paragraph}>Context provider for credentials. Wrap your app to avoid passing apiKey/userId to every widget.</p>
            <CodeBlock code={`import { PacefulProvider, MoodWidget, ERSDisplay } from '@paceful/sdk';

function App() {
  return (
    <PacefulProvider
      apiKey={process.env.PACEFUL_API_KEY}
      userId={currentUser.id}
    >
      <MoodWidget />
      <ERSDisplay />
    </PacefulProvider>
  );
}`} />
          </div>
        </section>

        {/* Error Handling */}
        <section id="error-handling" style={styles.section}>
          <h2 style={styles.sectionTitle}>Error Handling</h2>
          <p style={styles.paragraph}>
            The API returns consistent error responses with a code and message.
          </p>
          <CodeBlock code={`{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}`} />

          <h3 style={styles.subsectionTitle}>Error Codes</h3>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { status: 400, code: 'BAD_REQUEST', desc: 'Invalid request parameters' },
                { status: 401, code: 'UNAUTHORIZED', desc: 'Invalid or missing API key' },
                { status: 403, code: 'FORBIDDEN', desc: 'Insufficient permissions' },
                { status: 404, code: 'NOT_FOUND', desc: 'Resource not found' },
                { status: 429, code: 'RATE_LIMITED', desc: 'Rate limit exceeded' },
                { status: 500, code: 'INTERNAL_ERROR', desc: 'Server error' },
              ].map((err) => (
                <tr key={err.code} style={{ borderBottom: '1px solid #E5E0D9' }}>
                  <td style={{ padding: '8px 0' }}>{err.status}</td>
                  <td style={{ padding: '8px 0' }}><code>{err.code}</code></td>
                  <td style={{ padding: '8px 0', color: '#6B6560' }}>{err.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={styles.subsectionTitle}>SDK Error Handling</h3>
          <CodeBlock code={`import {
  PacefulError,
  PacefulAuthError,
  PacefulRateLimitError,
  PacefulNotFoundError
} from '@paceful/sdk';

try {
  const ers = await paceful.ers.get('user-123');
} catch (error) {
  if (error instanceof PacefulRateLimitError) {
    // Retry after error.retryAfter seconds
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof PacefulNotFoundError) {
    console.log('User not found');
  } else if (error instanceof PacefulAuthError) {
    console.log('Invalid API key');
  }
}`} />
        </section>

        {/* Rate Limits */}
        <section id="rate-limits" style={styles.section}>
          <h2 style={styles.sectionTitle}>Rate Limits</h2>
          <p style={styles.paragraph}>
            Rate limits vary by plan tier. Check headers for current usage.
          </p>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E0D9' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Tier</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Requests/Hour</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B6560' }}>Requests/Day</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                <td style={{ padding: '8px 0' }}>Starter</td>
                <td style={{ padding: '8px 0', color: '#6B6560' }}>100</td>
                <td style={{ padding: '8px 0', color: '#6B6560' }}>2,000</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                <td style={{ padding: '8px 0' }}>Growth</td>
                <td style={{ padding: '8px 0', color: '#6B6560' }}>500</td>
                <td style={{ padding: '8px 0', color: '#6B6560' }}>10,000</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E0D9' }}>
                <td style={{ padding: '8px 0' }}>Enterprise</td>
                <td style={{ padding: '8px 0', color: '#6B6560' }}>Unlimited</td>
                <td style={{ padding: '8px 0', color: '#6B6560' }}>Unlimited</td>
              </tr>
            </tbody>
          </table>

          <h3 style={styles.subsectionTitle}>Rate Limit Headers</h3>
          <CodeBlock code={`X-RateLimit-Limit: 100        # Max requests per hour
X-RateLimit-Remaining: 87    # Requests remaining
X-RateLimit-Reset: 1708185600 # Unix timestamp when limit resets`} />
        </section>

        {/* Versioning & Changelog */}
        <section id="versioning" style={styles.section}>
          <h2 style={styles.sectionTitle}>Versioning & Changelog</h2>
          <p style={styles.paragraph}>
            All API responses include version headers to help you track compatibility and plan for updates.
          </p>

          <h3 style={styles.subsectionTitle}>Version Headers</h3>
          <p style={styles.paragraph}>
            Every response includes these headers:
          </p>
          <CodeBlock code={`X-API-Version: 1.0.0       # Current API version
X-API-Min-Version: 1.0.0  # Minimum supported version`} />

          <h3 style={styles.subsectionTitle}>Deprecation Policy</h3>
          <p style={styles.paragraph}>
            Endpoints are supported for a minimum of <strong>12 months</strong> after deprecation notice.
            Deprecated endpoints return additional headers:
          </p>
          <CodeBlock code={`Deprecation: true
Sunset: Sat, 01 Jan 2028 00:00:00 GMT
Link: </api/v2/partner/users>; rel="successor-version"`} />
          <p style={styles.paragraph}>
            Monitor these headers and subscribe to our changelog to stay informed about upcoming changes.
          </p>

          <h3 style={styles.subsectionTitle}>Changelog</h3>
          <p style={styles.paragraph}>
            View the full changelog at{' '}
            <Link href="/partners/changelog" style={{ color: '#5B8A72', textDecoration: 'none', fontWeight: 600 }}>
              /partners/changelog
            </Link>{' '}
            or fetch it programmatically:
          </p>
          <div style={styles.endpoint}>
            <div style={styles.endpointPath}>
              <MethodBadge method="GET" />
              <code>/api/v1/partner/changelog</code>
            </div>
            <p style={{ ...styles.paragraph, marginBottom: '12px' }}>
              Returns the API changelog as structured JSON. No authentication required.
            </p>
            <CodeBlock code={`{
  "currentVersion": "1.0.0",
  "minimumSupportedVersion": "1.0.0",
  "changelog": [
    {
      "version": "1.0.0",
      "date": "2026-03-18",
      "changes": [
        { "type": "added", "description": "Sandbox mode — test all endpoints" },
        { "type": "added", "description": "ERS History API — time series scores" },
        // ... more changes
      ]
    }
  ],
  "deprecationPolicy": "Endpoints are supported for minimum 12 months..."
}`} />
          </div>
        </section>

        {/* Footer */}
        <footer style={{ paddingTop: '48px', borderTop: '1px solid #E5E0D9', marginTop: '48px' }}>
          <p style={{ fontSize: '14px', color: '#9A938A' }}>
            Need help? Contact{' '}
            <a href="mailto:partners@paceful.com" style={{ color: '#5B8A72' }}>partners@paceful.com</a>
          </p>
          <p style={{ fontSize: '14px', color: '#9A938A' }}>
            © 2026 Paceful · Built by LJ
          </p>
        </footer>
      </main>
    </div>
  );
}
