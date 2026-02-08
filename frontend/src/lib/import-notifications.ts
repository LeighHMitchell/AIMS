/**
 * Import Notification Helpers
 *
 * Creates notifications when IATI bulk imports complete.
 * Follows the same pattern as faq-notifications.ts.
 */

import { getSupabaseAdmin } from '@/lib/supabase';

export async function notifyImportComplete(
  userId: string,
  batchId: string,
  reportingOrgName: string,
  created: number,
  updated: number,
  failed: number,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[Import Notifications] No database connection');
    return false;
  }

  const total = created + updated + failed;
  const status = failed > 0 ? 'completed with errors' : 'completed successfully';

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      type: 'import_completed',
      title: 'IATI Import Complete',
      message: `Import of ${total} activities from ${reportingOrgName} ${status}. ${created} created, ${updated} updated${failed > 0 ? `, ${failed} failed` : ''}.`,
      link: '/iati-import?tab=history',
      metadata: { batchId, reportingOrgName, created, updated, failed },
      is_read: false,
    });

  if (error) {
    console.error('[Import Notifications] Error creating notification:', error);
    return false;
  }

  console.log(`[Import Notifications] Notified user ${userId} of import completion`);
  return true;
}
