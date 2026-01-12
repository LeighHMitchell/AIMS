/**
 * Email Template: Task Reminder
 *
 * Sent to users as a reminder before task deadline.
 */

import {
  escapeHtml,
  formatDate,
  getPriorityStyles,
  getTimeUntilDeadline,
  getBaseEmailTemplate,
} from './email-utils';

interface TaskReminderEmailProps {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string;
  daysUntilDeadline: number;
  taskUrl: string;
}

export function taskReminderEmailHtml({
  recipientName,
  taskTitle,
  taskDescription,
  priority,
  deadline,
  daysUntilDeadline,
  taskUrl,
}: TaskReminderEmailProps): string {
  const priorityStyles = getPriorityStyles(priority);
  const isUrgent = daysUntilDeadline <= 1;
  const urgencyColor = isUrgent ? '#dc2626' : '#d97706';
  const urgencyBg = isUrgent ? '#fef2f2' : '#fffbeb';

  const content = `
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      Hi ${escapeHtml(recipientName)},
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      This is a friendly reminder about a task that is ${isUrgent ? '<strong style="color: #dc2626;">due soon</strong>' : 'approaching its deadline'}.
    </p>

    <!-- Urgency Banner -->
    <div style="margin: 0 0 24px; padding: 16px; background-color: ${urgencyBg}; border-radius: 8px; border-left: 4px solid ${urgencyColor}; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${urgencyColor};">
        ${getTimeUntilDeadline(deadline)}
      </p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #71717a;">
        Deadline: ${formatDate(deadline)}
      </p>
    </div>

    <!-- Task Card -->
    <div style="margin: 0 0 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #18181b;">
        ${escapeHtml(taskTitle)}
      </h2>

      <span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 500; border-radius: 4px; ${priorityStyles}">
        ${escapeHtml(priority.charAt(0).toUpperCase() + priority.slice(1))} Priority
      </span>

      ${taskDescription ? `
        <p style="margin: 16px 0 0; font-size: 14px; line-height: 22px; color: #52525b;">
          ${escapeHtml(taskDescription.substring(0, 200))}${taskDescription.length > 200 ? '...' : ''}
        </p>
      ` : ''}
    </div>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="border-radius: 6px; background-color: ${isUrgent ? '#dc2626' : '#3b82f6'};">
          <a href="${escapeHtml(taskUrl)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            ${isUrgent ? 'Complete Task Now' : 'View Task'}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
      Complete this task before the deadline to stay on track.
    </p>
  `;

  return getBaseEmailTemplate('Task Reminder', content);
}

export function taskReminderEmailText({
  recipientName,
  taskTitle,
  taskDescription,
  priority,
  deadline,
  daysUntilDeadline,
  taskUrl,
}: TaskReminderEmailProps): string {
  const urgency = daysUntilDeadline <= 1 ? 'URGENT: ' : '';

  return `
Hi ${recipientName},

${urgency}This is a reminder about a task approaching its deadline.

TASK: ${taskTitle}
PRIORITY: ${priority.charAt(0).toUpperCase() + priority.slice(1)}
DEADLINE: ${formatDate(deadline)} (${getTimeUntilDeadline(deadline)})

${taskDescription ? `DESCRIPTION:\n${taskDescription.substring(0, 300)}\n` : ''}

Complete your task here: ${taskUrl}

---
This email was sent from the AIMS platform.
Aid Information Management System
  `.trim();
}
