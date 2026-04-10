import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate the next reference number for a budget or planned disbursement within an activity.
 * Format: BUD-001, BUD-002, ... or PD-001, PD-002, ...
 */
export async function generateNextReference(
  supabase: SupabaseClient,
  table: 'activity_budgets' | 'planned_disbursements',
  activityId: string,
  prefix: 'BUD' | 'PD'
): Promise<string> {
  // Get the highest existing reference number for this activity
  const { data, error } = await supabase
    .from(table)
    .select('reference')
    .eq('activity_id', activityId)
    .not('reference', 'is', null)
    .order('reference', { ascending: false })
    .limit(1);

  if (error) {
    console.warn(`[generateNextReference] Error fetching existing references:`, error);
  }

  let nextNum = 1;

  if (data && data.length > 0 && data[0].reference) {
    // Extract the number from the reference (e.g. "BUD-003" -> 3)
    const match = data[0].reference.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  // Pad to 3 digits
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Backfill references for all records in a table that don't have one yet.
 * Assigns references in order of period_start date.
 */
export async function backfillReferences(
  supabase: SupabaseClient,
  table: 'activity_budgets' | 'planned_disbursements',
  prefix: 'BUD' | 'PD'
): Promise<{ updated: number; errors: number }> {
  // Get all records without references, grouped by activity
  const { data: records, error } = await supabase
    .from(table)
    .select('id, activity_id, period_start')
    .is('reference', null)
    .order('activity_id')
    .order('period_start', { ascending: true });

  if (error || !records) {
    console.error(`[backfillReferences] Error fetching ${table}:`, error);
    return { updated: 0, errors: 1 };
  }

  let updated = 0;
  let errors = 0;

  // Group by activity_id
  const byActivity = new Map<string, typeof records>();
  for (const record of records) {
    if (!record.activity_id) continue;
    const list = byActivity.get(record.activity_id) || [];
    list.push(record);
    byActivity.set(record.activity_id, list);
  }

  // For each activity, get the current max reference and assign new ones
  for (const [activityId, activityRecords] of Array.from(byActivity.entries())) {
    // Get current max reference for this activity
    const { data: existing } = await supabase
      .from(table)
      .select('reference')
      .eq('activity_id', activityId)
      .not('reference', 'is', null)
      .order('reference', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (existing && existing.length > 0 && existing[0].reference) {
      const match = existing[0].reference.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    // Assign references in chronological order
    for (const record of activityRecords) {
      const reference = `${prefix}-${String(nextNum).padStart(3, '0')}`;
      const { error: updateError } = await supabase
        .from(table)
        .update({ reference })
        .eq('id', record.id);

      if (updateError) {
        console.error(`[backfillReferences] Error updating ${record.id}:`, updateError);
        errors++;
      } else {
        updated++;
        nextNum++;
      }
    }
  }

  return { updated, errors };
}
