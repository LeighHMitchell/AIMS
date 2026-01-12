/**
 * Email Template Utilities
 *
 * Shared helpers for email templates.
 */

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get inline styles for priority badge
 */
export function getPriorityStyles(priority: 'high' | 'medium' | 'low'): string {
  const styles: Record<string, string> = {
    high: 'background-color: #fef2f2; color: #dc2626;',
    medium: 'background-color: #fffbeb; color: #d97706;',
    low: 'background-color: #f8fafc; color: #64748b;',
  };
  return styles[priority] || styles.medium;
}

/**
 * Get inline styles for status badge
 */
export function getStatusStyles(status: string): string {
  const styles: Record<string, string> = {
    pending: 'background-color: #f8fafc; color: #64748b;',
    in_progress: 'background-color: #eff6ff; color: #2563eb;',
    completed: 'background-color: #f0fdf4; color: #16a34a;',
    declined: 'background-color: #fef2f2; color: #dc2626;',
    overdue: 'background-color: #fef2f2; color: #dc2626;',
  };
  return styles[status] || styles.pending;
}

/**
 * Calculate days until deadline
 */
export function getDaysUntilDeadline(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get human-readable time until deadline
 */
export function getTimeUntilDeadline(deadline: string): string {
  const days = getDaysUntilDeadline(deadline);
  if (days < 0) {
    return `${Math.abs(days)} day(s) overdue`;
  } else if (days === 0) {
    return 'Due today';
  } else if (days === 1) {
    return 'Due tomorrow';
  } else if (days <= 7) {
    return `Due in ${days} days`;
  } else {
    return `Due on ${formatDate(deadline)}`;
  }
}

/**
 * Base email template wrapper
 */
export function getBaseEmailTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">${escapeHtml(title)}</h1>
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
