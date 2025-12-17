/**
 * FAQ Notification Helpers
 *
 * This module provides functions to create notifications for FAQ-related events.
 * Notifications are stored in the user_notifications table.
 */

import { getSupabaseAdmin } from '@/lib/supabase';

export type FAQNotificationType =
  | 'faq_question_submitted'   // Sent to managers when a user submits a question
  | 'faq_question_answered'    // Sent to user when their question is answered
  | 'faq_new_question';        // Alias for faq_question_submitted

export interface NotificationPayload {
  userId: string;
  type: FAQNotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
async function createNotification(payload: NotificationPayload): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[FAQ Notifications] No database connection');
    return false;
  }

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      metadata: payload.metadata || {},
      is_read: false,
    });

  if (error) {
    console.error('[FAQ Notifications] Error creating notification:', error);
    return false;
  }

  return true;
}

/**
 * Notify managers when a new question is submitted
 */
export async function notifyManagersOfNewQuestion(
  questionId: string,
  question: string,
  userName: string
): Promise<void> {
  console.log('[FAQ Notifications] New question submitted:', {
    questionId,
    question: question.substring(0, 50) + '...',
    userName,
  });

  const managerIds = await getManagerUserIds();

  if (managerIds.length === 0) {
    console.log('[FAQ Notifications] No managers to notify');
    return;
  }

  const truncatedQuestion = question.length > 100
    ? question.substring(0, 100) + '...'
    : question;

  const results = await Promise.all(
    managerIds.map(managerId =>
      createNotification({
        userId: managerId,
        type: 'faq_new_question',
        title: 'New FAQ Question Submitted',
        message: `${userName} asked: "${truncatedQuestion}"`,
        link: '/admin?tab=faq',
        metadata: { questionId },
      })
    )
  );

  const successCount = results.filter(Boolean).length;
  console.log(`[FAQ Notifications] Notified ${successCount}/${managerIds.length} managers`);
}

/**
 * Notify the user when their question is answered
 */
export async function notifyUserOfAnswer(
  userId: string,
  questionId: string,
  faqId: string,
  question: string
): Promise<void> {
  console.log('[FAQ Notifications] Question answered:', {
    userId,
    questionId,
    faqId,
    question: question.substring(0, 50) + '...',
  });

  const truncatedQuestion = question.length > 100
    ? question.substring(0, 100) + '...'
    : question;

  const success = await createNotification({
    userId,
    type: 'faq_question_answered',
    title: 'Your Question Has Been Answered',
    message: `Your question has been answered and added to the FAQ: "${truncatedQuestion}"`,
    link: '/faq',
    metadata: { questionId, faqId },
  });

  if (success) {
    console.log('[FAQ Notifications] User notified successfully');
  }
}

/**
 * Get managers for notifications
 * Returns user IDs of all users with super_user, manager, or global_admin role
 */
export async function getManagerUserIds(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[FAQ Notifications] No database connection');
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .in('role', ['super_user', 'manager', 'global_admin']);

  if (error) {
    console.error('[FAQ Notifications] Error fetching managers:', error);
    return [];
  }

  return (data || []).map((u) => u.id);
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('[FAQ Notifications] Error counting notifications:', error);
    return 0;
  }

  return count || 0;
}
