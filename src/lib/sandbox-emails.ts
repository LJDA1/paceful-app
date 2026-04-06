/**
 * Sandbox Lead Email Drip System
 *
 * Sends personalized emails to sandbox leads based on their assessment activity:
 * - Email 1: After 3+ assessments - Results summary + value prop
 * - Email 2: After 5 assessments - Limit reached + conversion CTA
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const FROM_EMAIL = 'Paceful <hello@paceful.com>';
const REPLY_TO = 'partners@paceful.com';

// Lazy initialization to avoid build errors when RESEND_API_KEY is not set
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Supabase admin client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface LeadData {
  id: string;
  email: string;
  company_name: string | null;
  assessments_run: number;
  avg_ers_score: number | null;
  email_1_sent_at: string | null;
  email_2_sent_at: string | null;
}

interface DimensionAverage {
  dimension: string;
  average: number;
}

/**
 * Get dimension breakdown for a lead's assessments
 */
async function getDimensionBreakdown(email: string): Promise<DimensionAverage[]> {
  const supabase = getSupabaseAdmin();

  // Get all sandbox_usage records for this email
  const { data: usageRecords } = await supabase
    .from('sandbox_usage')
    .select('id')
    .eq('email', email.toLowerCase());

  if (!usageRecords || usageRecords.length === 0) {
    return [];
  }

  const usageIds = usageRecords.map(u => u.id);

  // Get all assessments for these usage records
  const { data: assessments } = await supabase
    .from('sandbox_assessments')
    .select(`
      dim_emotional_stability,
      dim_self_reflection,
      dim_coping_capacity,
      dim_behavioral_engagement,
      dim_social_readiness
    `)
    .in('sandbox_usage_id', usageIds);

  if (!assessments || assessments.length === 0) {
    return [];
  }

  // Calculate averages
  const dimensions = [
    { key: 'dim_emotional_stability', name: 'Emotional Stability' },
    { key: 'dim_self_reflection', name: 'Self Reflection' },
    { key: 'dim_coping_capacity', name: 'Coping Capacity' },
    { key: 'dim_behavioral_engagement', name: 'Behavioral Engagement' },
    { key: 'dim_social_readiness', name: 'Social Readiness' },
  ];

  return dimensions.map(dim => {
    const values = assessments
      .map(a => a[dim.key as keyof typeof a] as number)
      .filter(v => v !== null && v !== undefined);

    const average = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;

    return { dimension: dim.name, average };
  });
}

/**
 * Get readiness label from score
 */
function getReadinessLabel(score: number): string {
  if (score >= 66) return 'Ready';
  if (score >= 36) return 'Rebuilding';
  return 'Healing';
}

/**
 * Get score color for HTML emails
 */
function getScoreColor(score: number): string {
  if (score >= 70) return '#5B8A72'; // Green
  if (score >= 40) return '#D4A645'; // Gold
  return '#B56B6B'; // Red
}

/**
 * Email 1: Results summary (sent after 3+ assessments)
 */
function buildEmail1Html(lead: LeadData, dimensions: DimensionAverage[]): string {
  const avgScore = lead.avg_ers_score ?? 0;
  const readinessLabel = getReadinessLabel(avgScore);
  const scoreColor = getScoreColor(avgScore);

  const dimensionRows = dimensions
    .map(d => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D9; font-size: 15px; color: #1F1D1A;">
          ${d.dimension}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E5E0D9; text-align: right;">
          <span style="font-weight: 600; color: ${getScoreColor(d.average)};">${d.average}</span>
          <span style="color: #9A938A; font-size: 13px;">/100</span>
        </td>
      </tr>
    `)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9F6F2;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-family: Georgia, serif; font-size: 24px; color: #1F1D1A; margin: 0;">Paceful</h1>
    </div>

    <!-- Main Card -->
    <div style="background-color: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="font-family: Georgia, serif; font-size: 28px; color: #1F1D1A; margin: 0 0 16px; line-height: 1.3;">
        Your ERS results are ready
      </h2>
      <p style="font-size: 16px; color: #6B6560; line-height: 1.6; margin: 0 0 32px;">
        You've run ${lead.assessments_run} assessments in the Paceful sandbox. Here's what we found:
      </p>

      <!-- Overall Score -->
      <div style="background-color: #F9F6F2; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 14px; color: #9A938A; margin-bottom: 8px;">Average Emotional Readiness Score</div>
        <div style="font-size: 56px; font-weight: 700; color: ${scoreColor}; line-height: 1;">${avgScore}</div>
        <div style="font-size: 16px; font-weight: 600; color: ${scoreColor}; margin-top: 8px;">${readinessLabel}</div>
      </div>

      <!-- Dimension Breakdown -->
      <h3 style="font-family: Georgia, serif; font-size: 18px; color: #1F1D1A; margin: 0 0 16px;">Dimension Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        ${dimensionRows}
      </table>

      <!-- What's Next -->
      <div style="border-left: 4px solid #5B8A72; padding-left: 20px; margin-bottom: 32px;">
        <h4 style="font-size: 16px; color: #1F1D1A; margin: 0 0 8px;">What a full integration unlocks:</h4>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #6B6560; line-height: 1.8;">
          <li><strong>Historical tracking</strong> — See how scores change over time</li>
          <li><strong>Industry benchmarks</strong> — Compare against others in your vertical</li>
          <li><strong>Webhooks</strong> — Get notified when users hit thresholds</li>
          <li><strong>Batch analysis</strong> — Process thousands of entries at once</li>
          <li><strong>Custom dimensions</strong> — Train models on your specific needs</li>
        </ul>
      </div>

      <!-- CTA -->
      <div style="text-align: center;">
        <a href="https://paceful.com/partners/signup" style="display: inline-block; background-color: #5B8A72; color: #FFFFFF; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Get Your API Key →
        </a>
        <p style="font-size: 13px; color: #9A938A; margin-top: 16px;">
          Free tier includes 100 assessments/month
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #9A938A; font-size: 13px;">
      <p style="margin: 0 0 8px;">Questions? Reply to this email or reach us at partners@paceful.com</p>
      <p style="margin: 0;">
        <a href="https://paceful.com" style="color: #5B8A72; text-decoration: none;">paceful.com</a> ·
        <a href="https://paceful.com/partners/docs" style="color: #5B8A72; text-decoration: none;">API Docs</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Email 2: Limit reached (sent after 5 assessments)
 */
function buildEmail2Html(lead: LeadData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9F6F2;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-family: Georgia, serif; font-size: 24px; color: #1F1D1A; margin: 0;">Paceful</h1>
    </div>

    <!-- Main Card -->
    <div style="background-color: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="font-family: Georgia, serif; font-size: 28px; color: #1F1D1A; margin: 0 0 16px; line-height: 1.3;">
        You've hit the sandbox limit
      </h2>
      <p style="font-size: 16px; color: #6B6560; line-height: 1.6; margin: 0 0 24px;">
        You've run ${lead.assessments_run} assessments — looks like you're getting serious about emotional intelligence.
      </p>

      <!-- Stats Recap -->
      <div style="background-color: #F9F6F2; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; color: #9A938A;">Assessments Run</div>
            <div style="font-size: 24px; font-weight: 700; color: #1F1D1A;">${lead.assessments_run}</div>
          </div>
          ${lead.avg_ers_score !== null ? `
          <div style="text-align: right;">
            <div style="font-size: 13px; color: #9A938A;">Average ERS</div>
            <div style="font-size: 24px; font-weight: 700; color: #5B8A72;">${lead.avg_ers_score}</div>
          </div>
          ` : ''}
        </div>
      </div>

      <h3 style="font-family: Georgia, serif; font-size: 18px; color: #1F1D1A; margin: 0 0 16px;">Let's get you set up</h3>
      <p style="font-size: 16px; color: #6B6560; line-height: 1.6; margin: 0 0 24px;">
        Two ways to continue:
      </p>

      <!-- Option 1 -->
      <div style="border: 1px solid #E5E0D9; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
        <h4 style="font-size: 16px; color: #1F1D1A; margin: 0 0 8px;">🚀 Self-serve (instant)</h4>
        <p style="font-size: 14px; color: #6B6560; margin: 0 0 16px; line-height: 1.5;">
          Get your production API key in 30 seconds. Free tier includes 100 assessments/month.
        </p>
        <a href="https://paceful.com/partners/signup" style="display: inline-block; background-color: #5B8A72; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Get API Key →
        </a>
      </div>

      <!-- Option 2 -->
      <div style="border: 1px solid #E5E0D9; border-radius: 12px; padding: 24px;">
        <h4 style="font-size: 16px; color: #1F1D1A; margin: 0 0 8px;">📞 Talk to us</h4>
        <p style="font-size: 14px; color: #6B6560; margin: 0 0 16px; line-height: 1.5;">
          Have questions? Want to discuss custom dimensions or enterprise pricing? Let's chat.
        </p>
        <a href="mailto:partners@paceful.com?subject=Paceful%20Integration%20Discussion&body=Hi%2C%0A%0AI've%20been%20testing%20the%20Paceful%20sandbox%20and%20would%20like%20to%20discuss%20integration%20options.%0A%0ACompany%3A%20${encodeURIComponent(lead.company_name || '')}%0AEmail%3A%20${encodeURIComponent(lead.email)}%0A%0A" style="display: inline-block; background-color: #1F1D1A; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Book a Call
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #9A938A; font-size: 13px;">
      <p style="margin: 0 0 8px;">Questions? Reply to this email anytime.</p>
      <p style="margin: 0;">
        <a href="https://paceful.com" style="color: #5B8A72; text-decoration: none;">paceful.com</a> ·
        <a href="https://paceful.com/partners/docs" style="color: #5B8A72; text-decoration: none;">API Docs</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Send Email 1: Results summary
 */
export async function sendEmail1(lead: LeadData): Promise<boolean> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.log('[Sandbox Emails] RESEND_API_KEY not configured, skipping email');
      return false;
    }

    const dimensions = await getDimensionBreakdown(lead.email);
    const html = buildEmail1Html(lead, dimensions);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: lead.email,
      replyTo: REPLY_TO,
      subject: "Your ERS results are ready — here's what they mean",
      html,
    });

    if (error) {
      console.error('[Sandbox Emails] Error sending email 1:', error);
      return false;
    }

    // Update lead record
    const supabase = getSupabaseAdmin();
    await supabase
      .from('sandbox_leads')
      .update({ email_1_sent_at: new Date().toISOString() })
      .eq('id', lead.id);

    console.log(`[Sandbox Emails] Email 1 sent to ${lead.email}`);
    return true;
  } catch (error) {
    console.error('[Sandbox Emails] Error sending email 1:', error);
    return false;
  }
}

/**
 * Send Email 2: Limit reached
 */
export async function sendEmail2(lead: LeadData): Promise<boolean> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.log('[Sandbox Emails] RESEND_API_KEY not configured, skipping email');
      return false;
    }

    const html = buildEmail2Html(lead);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: lead.email,
      replyTo: REPLY_TO,
      subject: "You've hit the sandbox limit — let's get you set up",
      html,
    });

    if (error) {
      console.error('[Sandbox Emails] Error sending email 2:', error);
      return false;
    }

    // Update lead record
    const supabase = getSupabaseAdmin();
    await supabase
      .from('sandbox_leads')
      .update({ email_2_sent_at: new Date().toISOString() })
      .eq('id', lead.id);

    console.log(`[Sandbox Emails] Email 2 sent to ${lead.email}`);
    return true;
  } catch (error) {
    console.error('[Sandbox Emails] Error sending email 2:', error);
    return false;
  }
}

/**
 * Check and send drip emails for a lead
 * Call this after updating assessments_run count
 */
export async function checkAndSendDripEmails(leadId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    // Get lead data
    const { data: lead, error } = await supabase
      .from('sandbox_leads')
      .select('id, email, company_name, assessments_run, avg_ers_score, email_1_sent_at, email_2_sent_at')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      console.error('[Sandbox Emails] Error fetching lead:', error);
      return;
    }

    // Check if email 1 should be sent (3+ assessments, not already sent)
    if (lead.assessments_run >= 3 && !lead.email_1_sent_at) {
      await sendEmail1(lead as LeadData);
    }

    // Check if email 2 should be sent (5+ assessments, not already sent)
    if (lead.assessments_run >= 5 && !lead.email_2_sent_at) {
      await sendEmail2(lead as LeadData);
    }
  } catch (error) {
    console.error('[Sandbox Emails] Error in checkAndSendDripEmails:', error);
  }
}
