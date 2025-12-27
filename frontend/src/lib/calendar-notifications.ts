/**
 * Calendar Notification Helpers
 *
 * This module provides functions to create notifications for calendar-related events.
 * Notifications are stored in the user_notifications table.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { getManagerUserIds } from './faq-notifications';

export type CalendarNotificationType =
  | 'calendar_event_pending'    // Sent to admins when a new event needs approval
  | 'calendar_event_approved';   // Future: Sent to organizer when event is approved

export interface CalendarNotificationPayload {
  userId: string;
  type: CalendarNotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
async function createNotification(payload: CalendarNotificationPayload): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[Calendar Notifications] No database connection');
    return false;
  }

  const { error, data } = await supabase
    .from('user_notifications')
    .insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      metadata: payload.metadata || {},
      is_read: false,
    })
    .select();

  if (error) {
    console.error('[Calendar Notifications] Error creating notification:', error);
    console.error('[Calendar Notifications] Error details:', JSON.stringify(error, null, 2));
    return false;
  }

  console.log('[Calendar Notifications] Notification created successfully:', data?.[0]?.id);
  return true;
}

/**
 * Notify admins when a new calendar event is created and needs approval
 */
export async function notifyAdminsOfNewEvent(
  eventId: string,
  eventTitle: string,
  organizerName: string
): Promise<void> {
  console.log('[Calendar Notifications] New event created:', {
    eventId,
    eventTitle: eventTitle.substring(0, 50) + '...',
    organizerName,
  });

  const managerIds = await getManagerUserIds();

  if (managerIds.length === 0) {
    console.log('[Calendar Notifications] No admins to notify - check if any users have super_user, manager, global_admin, or admin role');
    return;
  }

  console.log(`[Calendar Notifications] Notifying ${managerIds.length} admin(s) about event ${eventId}`);

  const truncatedTitle = eventTitle.length > 100
    ? eventTitle.substring(0, 100) + '...'
    : eventTitle;

  const results = await Promise.all(
    managerIds.map(adminId =>
      createNotification({
        userId: adminId,
        type: 'calendar_event_pending',
        title: 'New Calendar Event Pending Approval',
        message: `${organizerName} created "${truncatedTitle}" - requires your approval`,
        link: '/admin?tab=calendar-events',
        metadata: { eventId },
      })
    )
  );

  const successCount = results.filter(Boolean).length;
  console.log(`[Calendar Notifications] Notified ${successCount}/${managerIds.length} admins`);
}


