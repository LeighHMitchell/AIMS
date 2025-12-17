/**
 * Email Template: Question Answered
 *
 * Sent to users when their FAQ question has been answered.
 */

interface QuestionAnsweredEmailProps {
  userName: string;
  question: string;
  answer: string;
  faqUrl: string;
}

export function questionAnsweredEmailHtml({
  userName,
  question,
  answer,
  faqUrl,
}: QuestionAnsweredEmailProps): string {
  // Truncate answer for email preview
  const truncatedAnswer = answer.length > 500 ? answer.substring(0, 500) + '...' : answer;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Question Has Been Answered</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">Your Question Has Been Answered</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
                Hi ${escapeHtml(userName)},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
                Great news! Your question has been answered and published to our FAQ.
              </p>

              <!-- Question Box -->
              <div style="margin: 0 0 24px; padding: 16px; background-color: #f4f4f5; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                  Your Question
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 22px; color: #18181b;">
                  ${escapeHtml(question)}
                </p>
              </div>

              <!-- Answer Box -->
              <div style="margin: 0 0 32px; padding: 16px; background-color: #f0fdf4; border-radius: 6px; border-left: 4px solid #22c55e;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                  Answer
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 22px; color: #18181b;">
                  ${escapeHtml(truncatedAnswer)}
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #3b82f6;">
                    <a href="${escapeHtml(faqUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Full Answer
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #71717a;">
                This email was sent from the AIMS platform.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #a1a1aa;">
                Aid Information Management System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function questionAnsweredEmailText({
  userName,
  question,
  answer,
  faqUrl,
}: QuestionAnsweredEmailProps): string {
  const truncatedAnswer = answer.length > 500 ? answer.substring(0, 500) + '...' : answer;

  return `
Hi ${userName},

Great news! Your question has been answered and published to our FAQ.

YOUR QUESTION:
${question}

ANSWER:
${truncatedAnswer}

View the full answer here: ${faqUrl}

---
This email was sent from the AIMS platform.
Aid Information Management System
  `.trim();
}

// Helper to escape HTML entities
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
