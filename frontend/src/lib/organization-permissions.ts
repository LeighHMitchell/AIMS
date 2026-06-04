import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Whether `userId` may edit organisation `organizationId`.
 *
 * Mirrors the SQL `user_can_edit_organization()` used by RLS so route-level
 * checks and the database agree:
 *   - super_user, OR
 *   - linked via users.organization_id (legacy model), OR
 *   - a member via the user_organizations junction.
 *
 * Used to return a clean 403 (instead of relying on RLS to surface as a 500 or,
 * for soft-deletes, a misleading success).
 */
export async function canEditOrganization(
  supabase: SupabaseClient<any>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', userId)
    .single();

  if (profile?.role === 'super_user') return true;
  if (profile?.organization_id && profile.organization_id === organizationId) return true;

  const { data: membership } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  return !!membership;
}
