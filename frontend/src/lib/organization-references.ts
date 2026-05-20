/**
 * Shared organization reference check.
 *
 * Single source of truth for "is this organization safe to delete" used by the
 * single delete, the bulk delete, and the read-only pre-flight check endpoint
 * so the pre-check can never disagree with what the delete actually does.
 *
 * Lives in lib/ (not in a route file) because Next.js only permits known
 * handler exports from `route.ts` modules.
 */
export async function getOrganizationReferences(
  supabase: any,
  id: string
): Promise<{ references: string[] } | { error: string }> {
  const references: string[] = [];

  // Users belonging to the organization
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email', { count: 'exact' })
    .eq('organization_id', id);

  if (usersError) {
    console.error('[AIMS] Error checking users:', usersError);
    return { error: 'Failed to check organization references' };
  }

  if (users && users.length > 0) {
    references.push(
      `${users.length} user${users.length > 1 ? 's' : ''} (${users
        .map((u: any) => u.email)
        .join(', ')})`
    );
  }

  // Activities where this org is the reporting organization
  const { count: reportingCount } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('reporting_org_id', id);

  if (reportingCount && reportingCount > 0) {
    references.push(`${reportingCount} activities as reporting organization`);
  }

  // Activity contributor entries
  const { count: contributorCount } = await supabase
    .from('activity_contributors')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', id);

  if (contributorCount && contributorCount > 0) {
    references.push(`${contributorCount} activity contributor entries`);
  }

  // Transactions where this org is provider or receiver
  const { count: transactionCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .or(`provider_org_id.eq.${id},receiver_org_id.eq.${id}`);

  if (transactionCount && transactionCount > 0) {
    references.push(`${transactionCount} transactions`);
  }

  return { references };
}
