/**
 * Focal Point Notifications
 * 
 * Handles notifications for focal point assignments and handoffs.
 * Notifications are stored in the user_notifications table.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { FocalPointType } from '@/types/focal-points';

export interface FocalPointNotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
async function createNotification(payload: FocalPointNotificationPayload): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[Focal Point Notifications] No database connection');
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
    console.error('[Focal Point Notifications] Error creating notification:', error);
    return false;
  }

  console.log('[Focal Point Notifications] Notification created:', data?.[0]?.id);
  return true;
}

/**
 * Get human-readable focal point type label
 */
function getFocalPointTypeLabel(type: FocalPointType): string {
  return type === 'government_focal_point' 
    ? 'Government Focal Point' 
    : 'Development Partner Focal Point';
}

/**
 * Notify a user when they are assigned as a focal point by a super user
 */
export async function notifyUserOfAssignment(
  userId: string,
  activityId: string,
  activityTitle: string,
  assignedByName: string,
  focalPointType: FocalPointType
): Promise<void> {
  console.log('[Focal Point Notifications] Sending assignment notification:', {
    userId,
    activityId,
    focalPointType,
  });

  const typeLabel = getFocalPointTypeLabel(focalPointType);

  await createNotification({
    userId,
    type: 'focal_point_assigned',
    title: `You have been assigned as ${typeLabel}`,
    message: `${assignedByName} has assigned you as the ${typeLabel} for "${activityTitle}"`,
    link: `/activities/${activityId}?tab=focal_points`,
    metadata: { 
      activityId, 
      activityTitle,
      focalPointType,
      assignedByName
    },
  });
}

/**
 * Notify a user when they receive a focal point handoff request
 */
export async function notifyUserOfHandoff(
  userId: string,
  activityId: string,
  activityTitle: string,
  handedOffByName: string,
  focalPointType: FocalPointType
): Promise<void> {
  console.log('[Focal Point Notifications] Sending handoff notification:', {
    userId,
    activityId,
    focalPointType,
  });

  const typeLabel = getFocalPointTypeLabel(focalPointType);

  await createNotification({
    userId,
    type: 'focal_point_handoff_request',
    title: `Focal Point Handoff Request`,
    message: `${handedOffByName} wants to hand off the ${typeLabel} role to you for "${activityTitle}". Please accept or decline.`,
    link: `/activities/${activityId}?tab=focal_points`,
    metadata: { 
      activityId, 
      activityTitle,
      focalPointType,
      handedOffByName
    },
  });
}

/**
 * Notify the original focal point when their handoff is accepted
 */
export async function notifyHandoffAccepted(
  userId: string,
  activityId: string,
  activityTitle: string,
  acceptedByName: string,
  focalPointType: FocalPointType
): Promise<void> {
  console.log('[Focal Point Notifications] Sending handoff accepted notification:', {
    userId,
    activityId,
    focalPointType,
  });

  const typeLabel = getFocalPointTypeLabel(focalPointType);

  await createNotification({
    userId,
    type: 'focal_point_handoff_accepted',
    title: `Focal Point Handoff Accepted`,
    message: `${acceptedByName} has accepted your handoff request and is now the ${typeLabel} for "${activityTitle}"`,
    link: `/activities/${activityId}?tab=focal_points`,
    metadata: { 
      activityId, 
      activityTitle,
      focalPointType,
      acceptedByName
    },
  });
}

/**
 * Notify the original focal point when their handoff is declined
 */
export async function notifyHandoffDeclined(
  userId: string,
  activityId: string,
  activityTitle: string,
  declinedByName: string,
  focalPointType: FocalPointType
): Promise<void> {
  console.log('[Focal Point Notifications] Sending handoff declined notification:', {
    userId,
    activityId,
    focalPointType,
  });

  const typeLabel = getFocalPointTypeLabel(focalPointType);

  await createNotification({
    userId,
    type: 'focal_point_handoff_declined',
    title: `Focal Point Handoff Declined`,
    message: `${declinedByName} has declined your handoff request for the ${typeLabel} role on "${activityTitle}". You remain the focal point.`,
    link: `/activities/${activityId}?tab=focal_points`,
    metadata: { 
      activityId, 
      activityTitle,
      focalPointType,
      declinedByName
    },
  });
}

/**
 * Notify a user when they are removed as a focal point
 */
export async function notifyFocalPointRemoved(
  userId: string,
  activityId: string,
  activityTitle: string,
  removedByName: string,
  focalPointType: FocalPointType
): Promise<void> {
  console.log('[Focal Point Notifications] Sending removal notification:', {
    userId,
    activityId,
    focalPointType,
  });

  const typeLabel = getFocalPointTypeLabel(focalPointType);

  await createNotification({
    userId,
    type: 'focal_point_removed',
    title: `Focal Point Role Removed`,
    message: `${removedByName} has removed you as the ${typeLabel} for "${activityTitle}"`,
    link: `/activities/${activityId}`,
    metadata: { 
      activityId, 
      activityTitle,
      focalPointType,
      removedByName
    },
  });
}


