import { getSupabaseAdmin } from '@/lib/supabase';
import { invalidateActivityCache } from '@/lib/activity-cache';

export interface GeneralTabPayload {
  activityId: string;
  title?: string;
  acronym?: string;
  userId?: string;
}

export async function saveGeneralTab(payload: GeneralTabPayload) {
  const { activityId, title, acronym } = payload;
  if (!activityId) throw new Error('Activity ID is required');

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database connection not available');

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof title !== 'undefined') updateData.title_narrative = title;
  if (typeof acronym !== 'undefined') updateData.acronym = acronym;

  const { data, error } = await supabase
    .from('activities')
    .update(updateData)
    .eq('id', activityId)
    .select('*')
    .single();

  if (error) throw error;

  invalidateActivityCache(activityId);
  return data;
}


