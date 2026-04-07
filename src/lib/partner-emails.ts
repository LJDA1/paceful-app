/**
 * Partner Email Templates
 *
 * Email templates for partner self-serve signup flow:
 * - Welcome email with API keys
 * - Email verification
 * - Magic link login
 */

import { sendEmail, APP_URL } from './email';

const BRAND_COLOR = '#5B8A72';
const TEXT_COLOR = '#1F1D1A';
const MUTED_COLOR = '#6B6560';

/**
 * Base email template wrapper
 */
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F7; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E0D9;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #E5E0D9;">
              <a href="${APP_URL}" style="color: ${TEXT_COLOR}; text-decoration: none; font-size: 20px; font-weight: 700;">
                Paceful
              </a>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F9F6F2; border-top: 1px solid #E5E0D9; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: ${MUTED_COLOR}; line-height: 1.5;">
                Questions? Reply to this email or reach us at
                <a href="mailto:partners@paceful.com" style="color: ${BRAND_COLOR};">partners@paceful.com</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0 0; font-size: 12px; color: ${MUTED_COLOR};">
          Paceful Inc. · Emotional Readiness API
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Send welcome email with API keys
 */
export async function sendWelcomeEmail(partner: {
  email: string;
  name: string;
  companyName: string;
  testKey: string;
  liveKey: string;
  verificationToken?: string;
  isPersonalEmail: boolean;
}): Promise<boolean> {
  const verificationUrl = partner.verificationToken
    ? `${APP_URL}/api/v1/partner/verify?token=${partner.verificationToken}`
    : null;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: ${TEXT_COLOR};">
      Welcome to Paceful, ${partner.name}!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${MUTED_COLOR}; line-height: 1.6;">
      Your API keys for ${partner.companyName} are ready. Let's get you integrated.
    </p>

    <!-- Test Key -->
    <div style="background-color: #F9F6F2; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: ${MUTED_COLOR}; text-transform: uppercase; letter-spacing: 0.5px;">
        Test API Key
      </p>
      <code style="display: block; font-family: monospace; font-size: 14px; color: ${TEXT_COLOR}; word-break: break-all; background-color: #FFFFFF; padding: 12px; border-radius: 6px; border: 1px solid #E5E0D9;">
        ${partner.testKey}
      </code>
      <p style="margin: 12px 0 0 0; font-size: 13px; color: ${BRAND_COLOR}; font-weight: 500;">
        Active now - use for development and testing
      </p>
    </div>

    <!-- Live Key -->
    <div style="background-color: #F9F6F2; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: ${MUTED_COLOR}; text-transform: uppercase; letter-spacing: 0.5px;">
        Live API Key
      </p>
      <code style="display: block; font-family: monospace; font-size: 14px; color: ${TEXT_COLOR}; word-break: break-all; background-color: #FFFFFF; padding: 12px; border-radius: 6px; border: 1px solid #E5E0D9;">
        ${partner.liveKey}
      </code>
      ${partner.isPersonalEmail ? `
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #D4973B; font-weight: 500;">
          Requires business email for activation
        </p>
      ` : verificationUrl ? `
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #D4973B; font-weight: 500;">
          Verify your email to activate
        </p>
      ` : `
        <p style="margin: 12px 0 0 0; font-size: 13px; color: ${BRAND_COLOR}; font-weight: 500;">
          Active - use for production
        </p>
      `}
    </div>

    ${verificationUrl && !partner.isPersonalEmail ? `
      <!-- Verification CTA -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
          Verify Email & Activate Live Key
        </a>
      </div>
    ` : ''}

    ${partner.isPersonalEmail ? `
      <!-- Personal Email Notice -->
      <div style="background-color: #FEF9E7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 3px solid #D4973B;">
        <p style="margin: 0; font-size: 14px; color: #92400E; line-height: 1.5;">
          <strong>Want production access?</strong> Sign up again with your company email to get full access to the live API.
        </p>
      </div>
    ` : ''}

    <!-- Quick Start -->
    <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: ${TEXT_COLOR};">
      Quick Start
    </h2>
    <div style="background-color: ${TEXT_COLOR}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <pre style="margin: 0; font-family: monospace; font-size: 13px; color: #E5E0D9; white-space: pre-wrap; word-break: break-all;">curl -X POST ${APP_URL}/api/v1/partner/ers/calculate \\
  -H "Authorization: Bearer ${partner.testKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "test-user", "text": "Your sample text here"}'</pre>
    </div>

    <!-- Links -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right: 8px;">
          <a href="${APP_URL}/partners/docs" style="display: block; padding: 12px 16px; background-color: #FFFFFF; border: 1px solid #E5E0D9; border-radius: 8px; text-decoration: none; text-align: center; font-size: 14px; font-weight: 600; color: ${BRAND_COLOR};">
            Read the Docs
          </a>
        </td>
        <td style="padding-left: 8px;">
          <a href="${APP_URL}/partners/dashboard" style="display: block; padding: 12px 16px; background-color: #FFFFFF; border: 1px solid #E5E0D9; border-radius: 8px; text-decoration: none; text-align: center; font-size: 14px; font-weight: 600; color: ${BRAND_COLOR};">
            View Dashboard
          </a>
        </td>
      </tr>
    </table>
  `;

  return sendEmail({
    to: partner.email,
    subject: `Your Paceful API Keys for ${partner.companyName}`,
    html: emailWrapper(content),
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(partner: {
  email: string;
  name: string;
  verificationToken: string;
}): Promise<boolean> {
  const verificationUrl = `${APP_URL}/api/v1/partner/verify?token=${partner.verificationToken}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: ${TEXT_COLOR};">
      Verify your email
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${MUTED_COLOR}; line-height: 1.6;">
      Hi ${partner.name}, click the button below to verify your email and activate your live API key.
    </p>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
        Verify Email
      </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: ${MUTED_COLOR}; line-height: 1.6;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 0; font-size: 13px; color: ${BRAND_COLOR}; word-break: break-all;">
      ${verificationUrl}
    </p>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${MUTED_COLOR};">
      This link expires in 24 hours. If you didn't request this email, you can safely ignore it.
    </p>
  `;

  return sendEmail({
    to: partner.email,
    subject: 'Verify your Paceful partner email',
    html: emailWrapper(content),
  });
}

/**
 * Send magic link login email
 */
export async function sendMagicLinkEmail(partner: {
  email: string;
  name: string;
  magicLinkToken: string;
}): Promise<boolean> {
  const loginUrl = `${APP_URL}/api/v1/partner/auth/verify?token=${partner.magicLinkToken}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: ${TEXT_COLOR};">
      Log in to Paceful
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${MUTED_COLOR}; line-height: 1.6;">
      Hi ${partner.name}, click the button below to log in to your partner dashboard.
    </p>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
        Log In to Dashboard
      </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: ${MUTED_COLOR}; line-height: 1.6;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 0; font-size: 13px; color: ${BRAND_COLOR}; word-break: break-all;">
      ${loginUrl}
    </p>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${MUTED_COLOR};">
      This link expires in 15 minutes. If you didn't request this email, you can safely ignore it.
    </p>
  `;

  return sendEmail({
    to: partner.email,
    subject: 'Log in to Paceful Partner Dashboard',
    html: emailWrapper(content),
  });
}

/**
 * Send live key activated email
 */
export async function sendLiveKeyActivatedEmail(partner: {
  email: string;
  name: string;
  companyName: string;
  liveKey: string;
}): Promise<boolean> {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: ${TEXT_COLOR};">
      Your live API key is now active!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${MUTED_COLOR}; line-height: 1.6;">
      Great news, ${partner.name}! Your email has been verified and your live API key for ${partner.companyName} is now ready to use in production.
    </p>

    <!-- Live Key -->
    <div style="background-color: #E8F5E9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #2E7D32; text-transform: uppercase; letter-spacing: 0.5px;">
        Live API Key - Active
      </p>
      <code style="display: block; font-family: monospace; font-size: 14px; color: ${TEXT_COLOR}; word-break: break-all; background-color: #FFFFFF; padding: 12px; border-radius: 6px; border: 1px solid #C8E6C9;">
        ${partner.liveKey}
      </code>
    </div>

    <div style="text-align: center;">
      <a href="${APP_URL}/partners/dashboard" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
        Go to Dashboard
      </a>
    </div>
  `;

  return sendEmail({
    to: partner.email,
    subject: `Your Paceful live API key is now active`,
    html: emailWrapper(content),
  });
}
