/**
 * Email Template: Task Assigned
 *
 * Sent to users when they are assigned a new task.
 */

import { escapeHtml, formatDate, getPriorityStyles, getBaseEmailTemplate } from './email-utils';

interface TaskAssignedEmailProps {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  taskType: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  creatorName: string;
  taskUrl: string;
}

export function taskAssignedEmailHtml({
  recipientName,
  taskTitle,
  taskDescription,
  taskType,
  priority,
  deadline,
  creatorName,
  taskUrl,
}: TaskAssignedEmailProps): string {
  const priorityStyles = getPriorityStyles(priority);
  const truncatedDescription = taskDescription && taskDescription.length > 300
    ? taskDescription.substring(0, 300) + '...'
    : taskDescription;

  const content = `
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      Hi ${escapeHtml(recipientName)},
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      You have been assigned a new task by <strong>${escapeHtml(creatorName)}</strong>.
    </p>

    <!-- Task Card -->
    <div style="margin: 0 0 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #18181b;">
        ${escapeHtml(taskTitle)}
      </h2>

      <div style="margin: 0 0 16px; display: flex; gap: 12px;">
        <span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 500; border-radius: 4px; background-color: #f1f5f9; color: #475569;">
          ${escapeHtml(taskType)}
        </span>
        <span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 500; border-radius: 4px; ${priorityStyles}">
          ${escapeHtml(priority.charAt(0).toUpperCase() + priority.slice(1))} Priority
        </span>
      </div>

      ${truncatedDescription ? `
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #52525b;">
          ${escapeHtml(truncatedDescription)}
        </p>
      ` : ''}

      ${deadline ? `
        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background-color: #fef3c7; border-radius: 6px;">
          <span style="font-size: 14px; color: #92400e;">
            <strong>Deadline:</strong> ${formatDate(deadline)}
          </span>
        </div>
      ` : ''}
    </div>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="border-radius: 6px; background-color: #3b82f6;">
          <a href="${escapeHtml(taskUrl)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View Task
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
      You can mark this task as complete or add notes in the AIMS platform.
    </p>
  `;

  return getBaseEmailTemplate('New Task Assigned', content);
}

export function taskAssignedEmailText({
  recipientName,
  taskTitle,
  taskDescription,
  taskType,
  priority,
  deadline,
  creatorName,
  taskUrl,
}: TaskAssignedEmailProps): string {
  return `
Hi ${recipientName},

You have been assigned a new task by ${creatorName}.

TASK: ${taskTitle}
TYPE: ${taskType}
PRIORITY: ${priority.charAt(0).toUpperCase() + priority.slice(1)}
${deadline ? `DEADLINE: ${formatDate(deadline)}` : ''}

${taskDescription ? `DESCRIPTION:\n${taskDescription}\n` : ''}

View and manage your task here: ${taskUrl}

---
This email was sent from the AIMS platform.
Aid Information Management System
  `.trim();
}
