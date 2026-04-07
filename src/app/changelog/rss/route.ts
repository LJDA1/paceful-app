/**
 * GET /changelog/rss
 *
 * RSS feed for API changelog updates.
 * Partners can subscribe to stay informed of API changes.
 */

import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paceful.com';

// Changelog data - keep in sync with /changelog/page.tsx
const CHANGELOG_ENTRIES = [
  {
    version: '1.3.0',
    date: '2026-04-05',
    title: 'Unstructured Text Analysis',
    description: 'Analyze raw text content directly without requiring structured data. Perfect for journal entries, session notes, and free-form text.',
    changes: [
      'POST /api/v1/assess/analyze - Single text analysis endpoint',
      'POST /api/v1/assess/analyze/batch - Batch text analysis for up to 50 entries',
      'Automatic source type detection (journal, session_notes, chat, free_text)',
      'Confidence scoring based on text quality and length',
      'Top signal extraction from analyzed content',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-18',
    title: 'Explainability Layer',
    description: 'Customize how ERS results are presented to your users with configurable verbosity, tone, and score formats.',
    changes: [
      'Verbosity levels: minimal, standard, clinical',
      'Tone options: clinical, casual, motivational',
      'Score formats: numerical, percentage, tier_label, traffic_light',
      'Partner config API for setting defaults',
      'Per-request overrides via query parameters',
      'Traffic light thresholds customization',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-01',
    title: 'Multi-Vertical Support',
    description: 'Industry-specific benchmarking and calibration for different use cases.',
    changes: [
      'disruptionType parameter for vertical-specific scoring',
      'Supported verticals: dating, workplace, mental_health, insurance, gambling',
      'Vertical-specific benchmark comparisons',
      'Percentile rankings within your industry',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-15',
    title: 'Core ERS API',
    description: 'Initial release of the Emotional Readiness Score API with comprehensive assessment capabilities.',
    changes: [
      'GET /api/v1/partner/ers/get - Retrieve current ERS snapshot',
      'POST /api/v1/partner/ers/calculate - Calculate ERS from input data',
      'POST /api/v1/partner/ers/batch - Batch processing for multiple users',
      'GET /api/v1/partner/ers/history - Historical ERS data with trends',
      '5 clinical dimensions: Emotional Stability, Self Reflection, Coping Capacity, Behavioral Engagement, Social Readiness',
      'Readiness stages: Healing, Rebuilding, Ready',
      'Analytics dashboard endpoints',
      'Webhook support for score changes',
      'Rate limiting and usage tracking',
    ],
  },
];

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatRFC822Date(dateString: string): string {
  const date = new Date(dateString);
  return date.toUTCString();
}

function generateRSSFeed(): string {
  const lastBuildDate = formatRFC822Date(CHANGELOG_ENTRIES[0].date);

  const items = CHANGELOG_ENTRIES.map((entry) => {
    const changesHtml = entry.changes
      .map((change) => `<li>${escapeXml(change)}</li>`)
      .join('\n');

    const content = `
<p>${escapeXml(entry.description)}</p>
<h3>What's New</h3>
<ul>
${changesHtml}
</ul>
<p><a href="${APP_URL}/changelog#v${entry.version}">View full changelog</a></p>
    `.trim();

    return `
    <item>
      <title>v${entry.version}: ${escapeXml(entry.title)}</title>
      <link>${APP_URL}/changelog#v${entry.version}</link>
      <guid isPermaLink="true">${APP_URL}/changelog#v${entry.version}</guid>
      <pubDate>${formatRFC822Date(entry.date)}</pubDate>
      <description><![CDATA[${content}]]></description>
      <category>API Update</category>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Paceful API Changelog</title>
    <link>${APP_URL}/changelog</link>
    <description>Stay up to date with the latest changes to the Paceful ERS API.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${APP_URL}/changelog/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>${APP_URL}/favicon.ico</url>
      <title>Paceful API Changelog</title>
      <link>${APP_URL}/changelog</link>
    </image>
    <ttl>60</ttl>
${items}
  </channel>
</rss>`;
}

export async function GET() {
  const feed = generateRSSFeed();

  return new NextResponse(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
