const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Paceful <hello@paceful.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paceful.com';

export { APP_URL };

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using Resend API
 * Returns true if sent successfully, false otherwise
 * If RESEND_API_KEY is not set, logs to console instead
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('[Email] Not configured — would send to:', to);
    console.log('[Email] Subject:', subject);
    console.log('[Email] Body length:', html.length, 'chars');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Send failed:', response.status, error);
      return false;
    }

    console.log('[Email] Sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('[Email] Send error:', error);
    return false;
  }
}

/**
 * Send multiple emails with rate limiting
 */
export async function sendEmailBatch(
  emails: EmailOptions[],
  delayMs = 100
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const success = await sendEmail(email);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limits
    if (delayMs > 0 && emails.indexOf(email) < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed };
}
