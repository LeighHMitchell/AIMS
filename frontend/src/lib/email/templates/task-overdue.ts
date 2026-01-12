/**
 * Email Template: Task Overdue
 *
 * Sent to assignees when their task becomes overdue.
 */

import {
  escapeHtml,
  formatDate,
  getDaysUntilDeadline,
  getBaseEmailTemplate,
} from './email-utils';

interface TaskOverdueEmailProps {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  deadline: string;
  creatorName: string;
  taskUrl: string;
}

export function taskOverdueEmailHtml({
  recipientName,
  taskTitle,
  taskDescription,
  deadline,
  creatorName,
  taskUrl,
}: TaskOverdueEmailProps): string {
  const daysOverdue = Math.abs(getDaysUntilDeadline(deadline));

  const content = `
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      Hi ${escapeHtml(recipientName)},
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      A task assigned to you is now <strong style="color: #dc2626;">overdue</strong>. Please complete it as soon as possible.
    </p>

    <!-- Overdue Banner -->
    <div style="margin: 0 0 24px; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #dc2626;">
        ⚠️ ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue
      </p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #71717a;">
        Original deadline: ${formatDate(deadline)}
      </p>
    </div>

    <!-- Task Card -->
    <div style="margin: 0 0 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #18181b;">
        ${escapeHtml(taskTitle)}
      </h2>

      <p style="margin: 0 0 16px; font-size: 14px; color: #71717a;">
        Assigned by: ${escapeHtml(creatorName)}
      </p>

      ${taskDescription ? `
        <p style="margin: 0; font-size: 14px; line-height: 22px; color: #52525b;">
          ${escapeHtml(taskDescription.substring(0, 200))}${taskDescription.length > 200 ? '...' : ''}
        </p>
      ` : ''}
    </div>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="border-radius: 6px; background-color: #dc2626;">
          <a href="${escapeHtml(taskUrl)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Complete Task Now
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
      If you&apos;re unable to complete this task, please contact ${escapeHtml(creatorName)} or mark it as declined with a reason.
    </p>
  `;

  return getBaseEmailTemplate('Task Overdue', content);
}

export function taskOverdueEmailText({
  recipientName,
  taskTitle,
  taskDescription,
  deadline,
  creatorName,
  taskUrl,
}: TaskOverdueEmailProps): string {
  const daysOverdue = Math.abs(getDaysUntilDeadline(deadline));

  return `
Hi ${recipientName},

URGENT: A task assigned to you is now ${daysOverdue} day(s) overdue.

TASK: ${taskTitle}
ASSIGNED BY: ${creatorName}
ORIGINAL DEADLINE: ${formatDate(deadline)}

${taskDescription ? `DESCRIPTION:\n${taskDescription.substring(0, 300)}\n` : ''}

Please complete this task as soon as possible: ${taskUrl}

If you're unable to complete this task, please contact ${creatorName} or mark it as declined with a reason.

---
This email was sent from the AIMS platform.
Aid Information Management System
  `.trim();
}
