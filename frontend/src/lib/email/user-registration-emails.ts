/**
 * User Registration Email Functions
 *
 * Sends emails related to new user registration notifications.
 */

import { sendEmail, isEmailConfigured } from './resend';
import { newUserRegisteredEmailHtml, newUserRegisteredEmailText } from './templates/new-user-registered';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aidonbudget.org';

interface SendNewUserRegistrationEmailOptions {
  recipientEmail: string;
  recipientName: string;
  newUserName: string;
  newUserEmail: string;
  newUserOrganization?: string;
  registrationMethod: 'email' | 'google' | 'apple';
  registeredAt: string;
}

export async function sendNewUserRegistrationEmail({
  recipientEmail,
  recipientName,
  newUserName,
  newUserEmail,
  newUserOrganization,
  registrationMethod,
  registeredAt,
}: SendNewUserRegistrationEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('[User Registration Email] Email not configured, skipping notification');
    return false;
  }

  const adminUrl = `${BASE_URL}/admin/users`;

  const html = newUserRegisteredEmailHtml({
    recipientName,
    newUserName,
    newUserEmail,
    newUserOrganization,
    registrationMethod,
    registeredAt,
    adminUrl,
  });

  const text = newUserRegisteredEmailText({
    recipientName,
    newUserName,
    newUserEmail,
    newUserOrganization,
    registrationMethod,
    registeredAt,
    adminUrl,
  });

  const success = await sendEmail({
    to: recipientEmail,
    subject: 'New user registration in AIMS',
    html,
    text,
  });

  if (success) {
    console.log(`[User Registration Email] Email sent to ${recipientEmail}`);
  } else {
    console.error(`[User Registration Email] Failed to send email to ${recipientEmail}`);
  }

  return success;
}
