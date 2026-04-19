import type { SupabaseClient } from '@supabase/supabase-js';
import { CustomYear, CustomYearRow, toCustomYear } from '@/types/custom-years';

/**
 * Fetch a single CustomYear by id for server-side use. Returns null when the id is
 * absent, unknown, or the lookup fails. API routes that bucket financial figures by
 * year can use this to respect a user-selected fiscal year without trusting the
 * client to send valid custom year configuration.
 */
export async function fetchCustomYearById(
  supabase: SupabaseClient,
  id: string | null | undefined
): Promise<CustomYear | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('custom_years')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return toCustomYear(data as CustomYearRow);
}
