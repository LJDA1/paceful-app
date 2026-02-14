import { APP_URL } from './email';

// ============================================================================
// Base Email Wrapper
// ============================================================================

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paceful</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9F6F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom: 32px; text-align: center;">
              <span style="font-size: 24px; font-weight: 700; color: #5B8A72; letter-spacing: -0.5px;">Paceful</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 16px; padding: 32px; border: 1px solid #F0EBE4;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9A938A; line-height: 1.5;">
                You're receiving this because you signed up for Paceful.<br>
                <a href="${APP_URL}/settings" style="color: #9A938A; text-decoration: underline;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// Daily Reminder Email
// ============================================================================

export function getDailyReminderSubject(firstName: string, streakCount: number, missedYesterday: boolean): string {
  if (streakCount > 1) {
    return `Keep your ${streakCount} day streak going, ${firstName}`;
  }
  if (missedYesterday) {
    return `How are you feeling today, ${firstName}?`;
  }
  return `Your daily check-in, ${firstName}`;
}

export function dailyReminderEmail(
  firstName: string,
  streakCount: number,
  missedYesterday: boolean
): string {
  let bodyText = '';

  if (streakCount > 1) {
    bodyText = `You're on a <strong>${streakCount} day streak</strong>. Don't break it — log today's mood in under 10 seconds.`;
  } else if (missedYesterday) {
    bodyText = `We noticed you didn't log yesterday. That's okay — today is a fresh start.`;
  } else {
    bodyText = `Take a moment to check in with yourself today. It only takes a few seconds.`;
  }

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #1F1D1A; line-height: 1.5;">
      Hey ${firstName},
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; color: #5C574F; line-height: 1.5;">
      ${bodyText}
    </p>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center">
          <a href="${APP_URL}/mood" style="display: inline-block; padding: 14px 28px; background-color: #5B8A72; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 50px;">
            Log my mood
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailWrapper(content);
}

// ============================================================================
// Weekly Recap Email
// ============================================================================

export interface WeeklyRecapData {
  moodsLogged: number;
  journalEntries: number;
  ersScore: number | null;
  ersChange: number | null;
  streakDays: number;
  topInsight: string | null;
}

export function getWeeklyRecapSubject(firstName: string): string {
  return `Your week in review, ${firstName}`;
}

export function weeklyRecapEmail(firstName: string, data: WeeklyRecapData): string {
  const ersDisplay = data.ersScore !== null ? data.ersScore.toString() : '—';

  let ersChangeText = '';
  if (data.ersChange !== null) {
    if (data.ersChange > 0) {
      ersChangeText = `<span style="color: #5B8A72;">↑ ${data.ersChange} points</span>`;
    } else if (data.ersChange < 0) {
      ersChangeText = `<span style="color: #B86B64;">↓ ${Math.abs(data.ersChange)} points</span>`;
    } else {
      ersChangeText = `<span style="color: #9A938A;">Steady</span>`;
    }
  }

  const insightSection = data.topInsight
    ? `
      <tr>
        <td style="padding-top: 20px; border-top: 1px solid #F0EBE4;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #9A938A; text-transform: uppercase; letter-spacing: 0.5px;">
            Weekly insight
          </p>
          <p style="margin: 0; font-size: 14px; color: #5C574F; line-height: 1.5; font-style: italic;">
            "${data.topInsight}"
          </p>
        </td>
      </tr>
    `
    : '';

  const content = `
    <p style="margin: 0 0 8px; font-size: 16px; color: #1F1D1A; line-height: 1.5;">
      Hey ${firstName},
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; color: #5C574F; line-height: 1.5;">
      Here's how your week went:
    </p>

    <!-- Stats Grid -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="width: 33%; text-align: center; padding: 16px 8px; background-color: #F9F6F2; border-radius: 12px 0 0 12px;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1F1D1A;">${data.moodsLogged}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #9A938A;">Moods</p>
        </td>
        <td style="width: 33%; text-align: center; padding: 16px 8px; background-color: #F9F6F2;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1F1D1A;">${data.journalEntries}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #9A938A;">Journals</p>
        </td>
        <td style="width: 33%; text-align: center; padding: 16px 8px; background-color: #F9F6F2; border-radius: 0 12px 12px 0;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1F1D1A;">${data.streakDays}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #9A938A;">Day streak</p>
        </td>
      </tr>
    </table>

    <!-- ERS Score -->
    ${data.ersScore !== null ? `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px; background-color: rgba(91,138,114,0.08); border-radius: 12px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>
                  <p style="margin: 0; font-size: 12px; color: #5B8A72; text-transform: uppercase; letter-spacing: 0.5px;">
                    Your ERS
                  </p>
                  <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #5B8A72;">
                    ${ersDisplay}
                  </p>
                </td>
                <td style="text-align: right;">
                  <p style="margin: 0; font-size: 14px;">
                    ${ersChangeText}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    ` : ''}

    <!-- Insight -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      ${insightSection}
    </table>

    <!-- CTA -->
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center">
          <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 14px 28px; background-color: #5B8A72; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 50px;">
            See your dashboard
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 0; font-size: 14px; color: #9A938A; text-align: center;">
      Keep going — you're making progress.
    </p>
  `;

  return emailWrapper(content);
}

// ============================================================================
// Milestone Email
// ============================================================================

export function getMilestoneSubject(): string {
  return `You've earned a new milestone!`;
}

export function milestoneEmail(
  firstName: string,
  milestoneName: string,
  milestoneDescription: string
): string {
  const content = `
    <div style="text-align: center;">
      <p style="margin: 0 0 8px; font-size: 32px;">
        &#127942;
      </p>
      <p style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #1F1D1A;">
        ${milestoneName}
      </p>
      <p style="margin: 0 0 24px; font-size: 16px; color: #5C574F; line-height: 1.5;">
        Hey ${firstName}, you just hit a milestone:<br>
        <strong>${milestoneDescription}</strong>
      </p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #9A938A;">
        Every step forward matters. Keep it up.
      </p>
      <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 14px 28px; background-color: #5B8A72; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 50px;">
        View your progress
      </a>
    </div>
  `;

  return emailWrapper(content);
}

// ============================================================================
// Inactivity Re-engagement Email
// ============================================================================

export function getInactivitySubject(firstName: string): string {
  return `We miss you, ${firstName}`;
}

export function inactivityEmail(firstName: string, daysSinceActivity: number): string {
  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #1F1D1A; line-height: 1.5;">
      Hey ${firstName},
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; color: #5C574F; line-height: 1.5;">
      It's been ${daysSinceActivity} days since your last check-in. Life gets busy — we get it.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; color: #5C574F; line-height: 1.5;">
      Whenever you're ready, Pace is here to listen.
    </p>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center">
          <a href="${APP_URL}/chat" style="display: inline-block; padding: 14px 28px; background-color: #5B8A72; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 50px;">
            Talk to Pace
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailWrapper(content);
}
