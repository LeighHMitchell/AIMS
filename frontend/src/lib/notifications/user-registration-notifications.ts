/**
 * User Registration Notification Helpers
 *
 * This module provides functions to notify super users when new users register.
 * Notifications are stored in the user_notifications table.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { sendNewUserRegistrationEmail } from '@/lib/email/user-registration-emails';

export type RegistrationMethod = 'email' | 'google' | 'apple';

export interface NewUserNotificationData {
  userId: string;
  email: string;
  name: string;
  organizationName?: string;
  registrationMethod: RegistrationMethod;
  registeredAt: string;
}

interface SuperUserDetails {
  id: string;
  email: string;
  firstName: string;
}

/**
 * Build notification message from user data
 */
function buildNotificationMessage(data: NewUserNotificationData): string {
  const methodLabel = data.registrationMethod === 'email' ? 'Email/Password' : 'Google OAuth';
  const parts = [
    `Name: ${data.name || 'Not provided'}`,
    `Email: ${data.email}`,
  ];
  if (data.organizationName) {
    parts.push(`Organisation: ${data.organizationName}`);
  }
  parts.push(`Registration method: ${methodLabel}`);
  return parts.join(' | ');
}

/**
 * Create a notification for a super user
 */
async function createNotification(
  superUserId: string,
  userData: NewUserNotificationData
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[User Registration Notifications] No database connection');
    return false;
  }

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: superUserId,
      type: 'new_user_registered',
      title: 'New user registered',
      message: buildNotificationMessage(userData),
      link: '/admin/users',
      metadata: {
        newUserId: userData.userId,
        newUserEmail: userData.email,
        registrationMethod: userData.registrationMethod,
      },
      is_read: false,
    });

  if (error) {
    console.error('[User Registration Notifications] Error creating notification:', error);
    return false;
  }

  return true;
}

/**
 * Get admin user details for notifications
 * Returns user IDs, emails, and names of all users with admin roles
 * (super_user, global_admin, admin, manager)
 */
async function getSuperUserDetails(): Promise<SuperUserDetails[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[User Registration Notifications] No database connection');
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name')
    .in('role', ['super_user', 'global_admin', 'admin', 'manager']);

  if (error) {
    console.error('[User Registration Notifications] Error fetching super users:', error);
    return [];
  }

  return (data || []).map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.first_name || 'Admin',
  }));
}

/**
 * Main entry point: Notify all super users of a new registration
 *
 * @param userData - New user details
 * @param skipNotification - Set to true for bulk imports to skip notifications
 */
export async function notifySuperUsersOfNewRegistration(
  userData: NewUserNotificationData,
  skipNotification: boolean = false
): Promise<void> {
  if (skipNotification) {
    console.log('[User Registration Notifications] Skipping notification (bulk import mode)');
    return;
  }

  console.log('[User Registration Notifications] Notifying super users of new registration:', {
    email: userData.email,
    method: userData.registrationMethod,
  });

  const superUsers = await getSuperUserDetails();

  if (superUsers.length === 0) {
    console.log('[User Registration Notifications] No super users to notify');
    return;
  }

  console.log(`[User Registration Notifications] Found ${superUsers.length} super users to notify`);

  // Send in-app notifications and emails in parallel for each super user
  const results = await Promise.all(
    superUsers.map(async (superUser) => {
      const [notificationResult, emailResult] = await Promise.all([
        createNotification(superUser.id, userData),
        sendNewUserRegistrationEmail({
          recipientEmail: superUser.email,
          recipientName: superUser.firstName,
          newUserName: userData.name,
          newUserEmail: userData.email,
          newUserOrganization: userData.organizationName,
          registrationMethod: userData.registrationMethod,
          registeredAt: userData.registeredAt,
        }),
      ]);
      return { superUserId: superUser.id, notificationResult, emailResult };
    })
  );

  const notificationSuccessCount = results.filter((r) => r.notificationResult).length;
  const emailSuccessCount = results.filter((r) => r.emailResult).length;

  console.log(
    `[User Registration Notifications] Notified ${notificationSuccessCount}/${superUsers.length} super users ` +
    `(${emailSuccessCount} emails sent)`
  );
}
