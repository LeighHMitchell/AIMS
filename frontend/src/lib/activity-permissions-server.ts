import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Server-side activity authorization (DB-backed).
 *
 * The app's intended permission model lived only in the client-side
 * `activity-permissions.ts`, which no API route ever called — so every write
 * was gated by login alone. These helpers enforce the approved rule:
 *
 *   EDIT an activity  → super_user, OR the owning org (activities.reporting_org_id
 *                       matches the user's organization_id), OR the creator
 *                       (activities.created_by), OR an accepted contributor org
 *                       (activity_contributors.status='accepted').
 *   DELETE an activity → super_user, OR the owning org, OR the creator.
 *
 * NOTE: the owning-org column is `reporting_org_id` (the activities table has NO
 * `created_by_org_id` — that exists only on the tasks tables).
 *
 * Security notes:
 *  - Always check against the SESSION user id (from requireAuth), never a
 *    client-supplied id.
 *  - Lookups use the ADMIN (service-role) client so the decision is the sole
 *    authority and is NOT affected by RLS row visibility. (If the permission
 *    check ran on the RLS client, an activity hidden from the user would simply
 *    not be returned and would fail OPEN — treated as allowed.)
 *  - FAIL CLOSED: a requested id that does not return a row (missing, or
 *    otherwise unresolved) is treated as blocked; if the admin client is
 *    unavailable, nothing is allowed.
 */

async function getUserRoleOrg(
  userId: string
): Promise<{ role: string | null; organizationId: string | null }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { role: null, organizationId: null };
  const { data } = await admin
    .from('users')
    .select('role, organization_id')
    .eq('id', userId)
    .single();
  return {
    role: (data?.role as string | null) ?? null,
    organizationId: (data?.organization_id as string | null) ?? null,
  };
}

const isSuper = (role: string | null) => role === 'super_user';

/**
 * Which of `activityIds` the user may DELETE. allowed=true only if none are blocked.
 * Missing/unresolved ids are blocked (fail closed).
 */
export async function canDeleteActivities(
  userId: string,
  activityIds: string[]
): Promise<{ allowed: boolean; blockedIds: string[] }> {
  if (activityIds.length === 0) return { allowed: true, blockedIds: [] };

  const admin = getSupabaseAdmin();
  if (!admin) return { allowed: false, blockedIds: activityIds };

  const { role, organizationId } = await getUserRoleOrg(userId);
  if (isSuper(role)) return { allowed: true, blockedIds: [] };

  const { data: acts } = await admin
    .from('activities')
    .select('id, created_by, reporting_org_id')
    .in('id', activityIds);

  const returnedIds = new Set((acts ?? []).map((a: any) => a.id as string));
  const missingIds = activityIds.filter((id) => !returnedIds.has(id));

  const blockedFromRows = (acts ?? [])
    .filter((a: any) => {
      const ownsByOrg = !!organizationId && a.reporting_org_id === organizationId;
      const isCreator = !!a.created_by && String(a.created_by) === String(userId);
      return !(ownsByOrg || isCreator);
    })
    .map((a: any) => a.id as string);

  const blockedIds = [...missingIds, ...blockedFromRows];
  return { allowed: blockedIds.length === 0, blockedIds };
}

/**
 * Which of `activityIds` the user may EDIT (includes accepted contributor orgs).
 * Missing/unresolved ids are blocked (fail closed).
 */
export async function canEditActivities(
  userId: string,
  activityIds: string[]
): Promise<{ allowed: boolean; blockedIds: string[] }> {
  if (activityIds.length === 0) return { allowed: true, blockedIds: [] };

  const admin = getSupabaseAdmin();
  if (!admin) return { allowed: false, blockedIds: activityIds };

  const { role, organizationId } = await getUserRoleOrg(userId);
  if (isSuper(role)) return { allowed: true, blockedIds: [] };

  const { data: acts } = await admin
    .from('activities')
    .select('id, created_by, reporting_org_id')
    .in('id', activityIds);

  // Activities this user's org is an accepted contributor on
  let contributorActivityIds = new Set<string>();
  if (organizationId) {
    const { data: contribs } = await admin
      .from('activity_contributors')
      .select('activity_id')
      .eq('organization_id', organizationId)
      .eq('status', 'accepted')
      .in('activity_id', activityIds);
    contributorActivityIds = new Set((contribs ?? []).map((c: any) => c.activity_id as string));
  }

  const returnedIds = new Set((acts ?? []).map((a: any) => a.id as string));
  const missingIds = activityIds.filter((id) => !returnedIds.has(id));

  const blockedFromRows = (acts ?? [])
    .filter((a: any) => {
      const ownsByOrg = !!organizationId && a.reporting_org_id === organizationId;
      const isCreator = !!a.created_by && String(a.created_by) === String(userId);
      const isContributor = contributorActivityIds.has(a.id);
      return !(ownsByOrg || isCreator || isContributor);
    })
    .map((a: any) => a.id as string);

  const blockedIds = [...missingIds, ...blockedFromRows];
  return { allowed: blockedIds.length === 0, blockedIds };
}

/** Convenience: may the user edit this single activity? */
export async function canEditActivity(
  userId: string,
  activityId: string
): Promise<boolean> {
  const { allowed } = await canEditActivities(userId, [activityId]);
  return allowed;
}
