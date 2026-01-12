/**
 * Email Template: Task Completed
 *
 * Sent to task creator when an assignee completes the task.
 */

import {
  escapeHtml,
  formatDateTime,
  getBaseEmailTemplate,
} from './email-utils';

interface TaskCompletedEmailProps {
  creatorName: string;
  assigneeName: string;
  taskTitle: string;
  completionNote?: string;
  completedAt: string;
  taskUrl: string;
  totalAssignees: number;
  completedCount: number;
}

export function taskCompletedEmailHtml({
  creatorName,
  assigneeName,
  taskTitle,
  completionNote,
  completedAt,
  taskUrl,
  totalAssignees,
  completedCount,
}: TaskCompletedEmailProps): string {
  const allComplete = completedCount >= totalAssignees;
  const progressPercent = Math.round((completedCount / totalAssignees) * 100);

  const content = `
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      Hi ${escapeHtml(creatorName)},
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      <strong>${escapeHtml(assigneeName)}</strong> has completed your task.
    </p>

    <!-- Success Banner -->
    <div style="margin: 0 0 24px; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        ✓ Task completed on ${formatDateTime(completedAt)}
      </p>
    </div>

    <!-- Task Card -->
    <div style="margin: 0 0 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #18181b;">
        ${escapeHtml(taskTitle)}
      </h2>

      ${completionNote ? `
        <div style="margin: 0 0 16px; padding: 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase;">
            Completion Note
          </p>
          <p style="margin: 0; font-size: 14px; line-height: 20px; color: #3f3f46;">
            ${escapeHtml(completionNote)}
          </p>
        </div>
      ` : ''}

      <!-- Progress -->
      <div style="margin: 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; color: #52525b;">Overall Progress</span>
          <span style="font-size: 14px; font-weight: 600; color: ${allComplete ? '#16a34a' : '#3b82f6'};">
            ${completedCount} / ${totalAssignees} completed
          </span>
        </div>
        <div style="height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${progressPercent}%; background-color: ${allComplete ? '#22c55e' : '#3b82f6'}; border-radius: 4px;"></div>
        </div>
      </div>
    </div>

    ${allComplete ? `
      <div style="margin: 0 0 24px; padding: 16px; background-color: #f0fdf4; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534;">
          🎉 All assignees have completed this task!
        </p>
      </div>
    ` : ''}

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="border-radius: 6px; background-color: #3b82f6;">
          <a href="${escapeHtml(taskUrl)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View Task Details
          </a>
        </td>
      </tr>
    </table>
  `;

  return getBaseEmailTemplate('Task Completed', content);
}

export function taskCompletedEmailText({
  creatorName,
  assigneeName,
  taskTitle,
  completionNote,
  completedAt,
  taskUrl,
  totalAssignees,
  completedCount,
}: TaskCompletedEmailProps): string {
  const allComplete = completedCount >= totalAssignees;

  return `
Hi ${creatorName},

${assigneeName} has completed your task.

TASK: ${taskTitle}
COMPLETED: ${formatDateTime(completedAt)}

${completionNote ? `COMPLETION NOTE:\n${completionNote}\n` : ''}

PROGRESS: ${completedCount} / ${totalAssignees} assignees completed

${allComplete ? '🎉 All assignees have completed this task!\n' : ''}

View task details here: ${taskUrl}

---
This email was sent from the AIMS platform.
Aid Information Management System
  `.trim();
}
