/**
 * Task Email Functions
 *
 * Sends emails related to the task workflow.
 */

import { sendEmail, isEmailConfigured } from './resend';
import { taskAssignedEmailHtml, taskAssignedEmailText } from './templates/task-assigned';
import { taskReminderEmailHtml, taskReminderEmailText } from './templates/task-reminder';
import { taskCompletedEmailHtml, taskCompletedEmailText } from './templates/task-completed';
import { taskOverdueEmailHtml, taskOverdueEmailText } from './templates/task-overdue';
import { getDaysUntilDeadline } from './templates/email-utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aidonbudget.org';

// =====================================================
// Task Assigned Email
// =====================================================

interface SendTaskAssignedEmailOptions {
  recipientEmail: string;
  recipientName: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  taskType: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  creatorName: string;
}

export async function sendTaskAssignedEmail({
  recipientEmail,
  recipientName,
  taskId,
  taskTitle,
  taskDescription,
  taskType,
  priority,
  deadline,
  creatorName,
}: SendTaskAssignedEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('[Task Emails] Email not configured, skipping task assigned notification');
    return false;
  }

  const taskUrl = `${BASE_URL}/tasks?assignment=${taskId}`;

  const html = taskAssignedEmailHtml({
    recipientName,
    taskTitle,
    taskDescription,
    taskType,
    priority,
    deadline,
    creatorName,
    taskUrl,
  });

  const text = taskAssignedEmailText({
    recipientName,
    taskTitle,
    taskDescription,
    taskType,
    priority,
    deadline,
    creatorName,
    taskUrl,
  });

  const success = await sendEmail({
    to: recipientEmail,
    subject: `New Task: ${taskTitle} - AIMS`,
    html,
    text,
  });

  if (success) {
    console.log(`[Task Emails] Task assigned email sent to ${recipientEmail}`);
  } else {
    console.error(`[Task Emails] Failed to send task assigned email to ${recipientEmail}`);
  }

  return success;
}

// =====================================================
// Task Reminder Email
// =====================================================

interface SendTaskReminderEmailOptions {
  recipientEmail: string;
  recipientName: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string;
}

export async function sendTaskReminderEmail({
  recipientEmail,
  recipientName,
  taskId,
  taskTitle,
  taskDescription,
  priority,
  deadline,
}: SendTaskReminderEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('[Task Emails] Email not configured, skipping reminder notification');
    return false;
  }

  const taskUrl = `${BASE_URL}/tasks?assignment=${taskId}`;
  const daysUntilDeadline = getDaysUntilDeadline(deadline);

  const html = taskReminderEmailHtml({
    recipientName,
    taskTitle,
    taskDescription,
    priority,
    deadline,
    daysUntilDeadline,
    taskUrl,
  });

  const text = taskReminderEmailText({
    recipientName,
    taskTitle,
    taskDescription,
    priority,
    deadline,
    daysUntilDeadline,
    taskUrl,
  });

  const isUrgent = daysUntilDeadline <= 1;
  const subject = isUrgent
    ? `⚠️ URGENT: "${taskTitle}" is due ${daysUntilDeadline === 0 ? 'today' : 'tomorrow'} - AIMS`
    : `Reminder: "${taskTitle}" is due in ${daysUntilDeadline} days - AIMS`;

  const success = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  if (success) {
    console.log(`[Task Emails] Reminder email sent to ${recipientEmail}`);
  } else {
    console.error(`[Task Emails] Failed to send reminder email to ${recipientEmail}`);
  }

  return success;
}

// =====================================================
// Task Completed Email
// =====================================================

interface SendTaskCompletedEmailOptions {
  creatorEmail: string;
  creatorName: string;
  assigneeName: string;
  taskId: string;
  taskTitle: string;
  completionNote?: string;
  completedAt: string;
  totalAssignees: number;
  completedCount: number;
}

export async function sendTaskCompletedEmail({
  creatorEmail,
  creatorName,
  assigneeName,
  taskId,
  taskTitle,
  completionNote,
  completedAt,
  totalAssignees,
  completedCount,
}: SendTaskCompletedEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('[Task Emails] Email not configured, skipping completion notification');
    return false;
  }

  const taskUrl = `${BASE_URL}/tasks/${taskId}`;
  const allComplete = completedCount >= totalAssignees;

  const html = taskCompletedEmailHtml({
    creatorName,
    assigneeName,
    taskTitle,
    completionNote,
    completedAt,
    taskUrl,
    totalAssignees,
    completedCount,
  });

  const text = taskCompletedEmailText({
    creatorName,
    assigneeName,
    taskTitle,
    completionNote,
    completedAt,
    taskUrl,
    totalAssignees,
    completedCount,
  });

  const subject = allComplete
    ? `✅ All Complete: "${taskTitle}" - AIMS`
    : `Task Update: ${assigneeName} completed "${taskTitle}" - AIMS`;

  const success = await sendEmail({
    to: creatorEmail,
    subject,
    html,
    text,
  });

  if (success) {
    console.log(`[Task Emails] Completion email sent to ${creatorEmail}`);
  } else {
    console.error(`[Task Emails] Failed to send completion email to ${creatorEmail}`);
  }

  return success;
}

// =====================================================
// Task Overdue Email
// =====================================================

interface SendTaskOverdueEmailOptions {
  recipientEmail: string;
  recipientName: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  deadline: string;
  creatorName: string;
}

export async function sendTaskOverdueEmail({
  recipientEmail,
  recipientName,
  taskId,
  taskTitle,
  taskDescription,
  deadline,
  creatorName,
}: SendTaskOverdueEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('[Task Emails] Email not configured, skipping overdue notification');
    return false;
  }

  const taskUrl = `${BASE_URL}/tasks?assignment=${taskId}`;

  const html = taskOverdueEmailHtml({
    recipientName,
    taskTitle,
    taskDescription,
    deadline,
    creatorName,
    taskUrl,
  });

  const text = taskOverdueEmailText({
    recipientName,
    taskTitle,
    taskDescription,
    deadline,
    creatorName,
    taskUrl,
  });

  const success = await sendEmail({
    to: recipientEmail,
    subject: `⚠️ OVERDUE: "${taskTitle}" - AIMS`,
    html,
    text,
  });

  if (success) {
    console.log(`[Task Emails] Overdue email sent to ${recipientEmail}`);
  } else {
    console.error(`[Task Emails] Failed to send overdue email to ${recipientEmail}`);
  }

  return success;
}

// =====================================================
// Batch Email Functions
// =====================================================

interface BatchEmailResult {
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send task assigned emails to multiple recipients
 */
export async function sendBatchTaskAssignedEmails(
  recipients: Array<{
    email: string;
    name: string;
  }>,
  taskDetails: {
    taskId: string;
    taskTitle: string;
    taskDescription?: string;
    taskType: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
    creatorName: string;
  }
): Promise<BatchEmailResult> {
  const result: BatchEmailResult = { sent: 0, failed: 0, errors: [] };

  for (const recipient of recipients) {
    try {
      const success = await sendTaskAssignedEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        ...taskDetails,
      });
      if (success) {
        result.sent++;
      } else {
        result.failed++;
        result.errors.push(`Failed to send to ${recipient.email}`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`Error for ${recipient.email}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  return result;
}

/**
 * Send reminder emails to multiple recipients
 */
export async function sendBatchReminderEmails(
  recipients: Array<{
    email: string;
    name: string;
    taskId: string;
  }>,
  taskDetails: {
    taskTitle: string;
    taskDescription?: string;
    priority: 'high' | 'medium' | 'low';
    deadline: string;
  }
): Promise<BatchEmailResult> {
  const result: BatchEmailResult = { sent: 0, failed: 0, errors: [] };

  for (const recipient of recipients) {
    try {
      const success = await sendTaskReminderEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        taskId: recipient.taskId,
        ...taskDetails,
      });
      if (success) {
        result.sent++;
      } else {
        result.failed++;
        result.errors.push(`Failed to send to ${recipient.email}`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`Error for ${recipient.email}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  return result;
}
