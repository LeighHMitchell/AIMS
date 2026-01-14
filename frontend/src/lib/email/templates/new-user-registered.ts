/**
 * Email Template: New User Registered
 *
 * Sent to super users when a new user registers.
 */

import { escapeHtml, formatDateTime, getBaseEmailTemplate } from './email-utils';

interface NewUserRegisteredEmailProps {
  recipientName: string;
  newUserName: string;
  newUserEmail: string;
  newUserOrganization?: string;
  registrationMethod: 'email' | 'google' | 'apple';
  registeredAt: string;
  adminUrl: string;
}

export function newUserRegisteredEmailHtml({
  recipientName,
  newUserName,
  newUserEmail,
  newUserOrganization,
  registrationMethod,
  registeredAt,
  adminUrl,
}: NewUserRegisteredEmailProps): string {
  const methodLabel = registrationMethod === 'email' ? 'Email/Password' : 'Google OAuth';

  const content = `
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      Hi ${escapeHtml(recipientName)},
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      A new user has registered on the AIMS platform.
    </p>

    <!-- User Details Card -->
    <div style="margin: 0 0 24px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #18181b;">
        New User Details
      </h2>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; width: 140px;">Name:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #18181b; font-weight: 500;">${escapeHtml(newUserName || 'Not provided')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Email:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #18181b; font-weight: 500;">${escapeHtml(newUserEmail)}</td>
        </tr>
        ${newUserOrganization ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Organisation:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #18181b; font-weight: 500;">${escapeHtml(newUserOrganization)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Registration Method:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #18181b; font-weight: 500;">${escapeHtml(methodLabel)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Registered:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #18181b; font-weight: 500;">${formatDateTime(registeredAt)}</td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="border-radius: 6px; background-color: #3b82f6;">
          <a href="${escapeHtml(adminUrl)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Review User in Admin
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
      You can review and update the user's role and permissions in the admin panel.
    </p>
  `;

  return getBaseEmailTemplate('New User Registration', content);
}

export function newUserRegisteredEmailText({
  recipientName,
  newUserName,
  newUserEmail,
  newUserOrganization,
  registrationMethod,
  registeredAt,
  adminUrl,
}: NewUserRegisteredEmailProps): string {
  const methodLabel = registrationMethod === 'email' ? 'Email/Password' : 'Google OAuth';

  return `
Hi ${recipientName},

A new user has registered on the AIMS platform.

NEW USER DETAILS
----------------
Name: ${newUserName || 'Not provided'}
Email: ${newUserEmail}
${newUserOrganization ? `Organisation: ${newUserOrganization}\n` : ''}Registration Method: ${methodLabel}
Registered: ${registeredAt}

Review and manage the user here: ${adminUrl}

---
This email was sent from the AIMS platform.
Aid Information Management System
  `.trim();
}
