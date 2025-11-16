/**
 * Service for looking up existing activities in the database
 * Used for conflict detection during multi-activity imports
 */

import { supabase } from '@/lib/supabase';

export interface ExistingActivityInfo {
  id: string;
  title: string;
  lastUpdated: string;
  iati_id: string;
}

/**
 * Check which IATI IDs already exist in the database
 * Returns a map of iatiId -> activity details for efficient lookup
 */
export async function checkExistingActivities(
  iatiIds: string[]
): Promise<Map<string, ExistingActivityInfo>> {
  const resultMap = new Map<string, ExistingActivityInfo>();

  if (!iatiIds || iatiIds.length === 0) {
    return resultMap;
  }

  try {
    // Query database for activities with matching IATI IDs
    // Using 'in' filter to batch the lookup
    const { data: existingActivities, error } = await supabase
      .from('activities')
      .select('id, iati_id, title, updated_at')
      .in('iati_id', iatiIds)
      .not('iati_id', 'is', null);

    if (error) {
      console.error('[Activity Lookup] Database error:', error);
      throw new Error(`Failed to check existing activities: ${error.message}`);
    }

    if (existingActivities && existingActivities.length > 0) {
      existingActivities.forEach((activity) => {
        resultMap.set(activity.iati_id, {
          id: activity.id,
          title: activity.title || 'Untitled Activity',
          lastUpdated: activity.updated_at,
          iati_id: activity.iati_id,
        });
      });
    }

    console.log(
      `[Activity Lookup] Found ${resultMap.size} existing activities out of ${iatiIds.length} checked`
    );
  } catch (error) {
    console.error('[Activity Lookup] Error:', error);
    // Return empty map on error rather than failing the entire import
    // This allows the import to proceed, treating all as new activities
  }

  return resultMap;
}

/**
 * Check if a single IATI ID exists in the database
 * Convenience function for single activity checks
 */
export async function checkActivityExists(
  iatiId: string
): Promise<ExistingActivityInfo | null> {
  if (!iatiId) return null;

  const resultMap = await checkExistingActivities([iatiId]);
  return resultMap.get(iatiId) || null;
}

/**
 * Get activity statistics for preview
 */
export async function getActivityStats(
  iatiIds: string[]
): Promise<{
  existingCount: number;
  newCount: number;
  existingIds: string[];
  newIds: string[];
}> {
  const existingMap = await checkExistingActivities(iatiIds);
  const existingIds = Array.from(existingMap.keys());
  const newIds = iatiIds.filter((id) => !existingMap.has(id));

  return {
    existingCount: existingMap.size,
    newCount: newIds.length,
    existingIds,
    newIds,
  };
}














