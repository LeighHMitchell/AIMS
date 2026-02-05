import { SupabaseClient } from '@supabase/supabase-js';

export interface OrgScope {
  organizationId: string;
  organizationName: string;
  iatiOrgId: string | null;
  reportingOrgRef: string | null;
  aliasRefs: string[];
  /** All valid IATI identifiers for this org (deduplicated, lowercased for comparison) */
  allRefs: string[];
}

/**
 * Resolve the authenticated user's organisation and its IATI identifiers.
 *
 * Chain: auth user id → users.organization_id → organizations.iati_org_id / reporting_org_ref / alias_refs
 *
 * Returns null if the user has no organisation assigned.
 */
export async function resolveUserOrgScope(
  supabase: SupabaseClient,
  authUserId: string
): Promise<OrgScope | null> {
  // Step 1: Get user's organization_id from the users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authUserId)
    .single();

  if (userError || !userData?.organization_id) {
    return null;
  }

  // Step 2: Get the organisation's IATI identifiers
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, iati_org_id, reporting_org_ref, alias_refs')
    .eq('id', userData.organization_id)
    .single();

  if (orgError || !org) {
    return null;
  }

  // Build the set of all valid refs (deduplicated, non-empty)
  const allRefs: string[] = [];
  if (org.iati_org_id) allRefs.push(org.iati_org_id);
  if (org.reporting_org_ref) allRefs.push(org.reporting_org_ref);
  if (Array.isArray(org.alias_refs)) {
    for (const ref of org.alias_refs) {
      if (ref) allRefs.push(ref);
    }
  }

  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  const deduplicated: string[] = [];
  for (const ref of allRefs) {
    const lower = ref.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduplicated.push(ref);
    }
  }

  return {
    organizationId: org.id,
    organizationName: org.name || '',
    iatiOrgId: org.iati_org_id || null,
    reportingOrgRef: org.reporting_org_ref || null,
    aliasRefs: Array.isArray(org.alias_refs) ? org.alias_refs.filter(Boolean) : [],
    allRefs: deduplicated,
  };
}

/**
 * Check if a reporting-org ref matches the user's organisation.
 * Comparison is case-insensitive.
 */
export function matchesOrgScope(scope: OrgScope, reportingOrgRef: string): boolean {
  if (!reportingOrgRef) return false;
  const lower = reportingOrgRef.toLowerCase();
  return scope.allRefs.some(ref => ref.toLowerCase() === lower);
}
