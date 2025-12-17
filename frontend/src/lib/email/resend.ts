/**
 * Resend Email Client
 *
 * This module provides email functionality using Resend.
 * Make sure to set the RESEND_API_KEY environment variable.
 */

import { Resend } from 'resend';

// Initialize Resend client
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured');
    return null;
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  return resend;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.log('[Email] Skipping email - Resend not configured');
    return false;
  }

  const fromAddress = options.from || process.env.EMAIL_FROM || 'AIMS <noreply@aidonbudget.org>';

  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Email] Error sending email:', error);
      return false;
    }

    console.log('[Email] Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('[Email] Unexpected error:', error);
    return false;
  }
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
