/**
 * FAQ Email Functions
 *
 * Sends emails related to FAQ question/answer workflow.
 */

import { sendEmail, isEmailConfigured } from './resend';
import {
  questionAnsweredEmailHtml,
  questionAnsweredEmailText,
} from './templates/question-answered';

interface SendQuestionAnsweredEmailOptions {
  userEmail: string;
  userName: string;
  question: string;
  answer: string;
  baseUrl?: string;
}

/**
 * Send an email to a user when their question has been answered
 */
export async function sendQuestionAnsweredEmail({
  userEmail,
  userName,
  question,
  answer,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aidonbudget.org',
}: SendQuestionAnsweredEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('[FAQ Emails] Email not configured, skipping question answered notification');
    return false;
  }

  const faqUrl = `${baseUrl}/faq`;

  const html = questionAnsweredEmailHtml({
    userName,
    question,
    answer,
    faqUrl,
  });

  const text = questionAnsweredEmailText({
    userName,
    question,
    answer,
    faqUrl,
  });

  const success = await sendEmail({
    to: userEmail,
    subject: 'Your Question Has Been Answered - AIMS',
    html,
    text,
  });

  if (success) {
    console.log(`[FAQ Emails] Question answered email sent to ${userEmail}`);
  } else {
    console.error(`[FAQ Emails] Failed to send question answered email to ${userEmail}`);
  }

  return success;
}
