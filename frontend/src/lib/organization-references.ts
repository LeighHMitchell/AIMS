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

/** ": Name A, Name B, … and N more" — names the records that block a delete. */
function summariseNames(names: any[], max = 5): string {
  const clean = names.map((n) => (n == null ? '' : String(n))).filter(Boolean);
  if (clean.length === 0) return '';
  const shown = clean.slice(0, max);
  const more = clean.length - shown.length;
  return `: ${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}`;
}

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

  // Activities where this org is the reporting organization (named)
  const { data: reportingActs } = await supabase
    .from('activities')
    .select('title_narrative')
    .eq('reporting_org_id', id);

  if (reportingActs && reportingActs.length > 0) {
    const titles = reportingActs.map((a: any) => a.title_narrative).filter(Boolean);
    references.push(
      `Reporting organisation on ${reportingActs.length} ` +
        `activit${reportingActs.length > 1 ? 'ies' : 'y'}${summariseNames(titles)}`
    );
  }

  // Activity contributor entries (named by the activities they belong to)
  const { data: contributorRows } = await supabase
    .from('activity_contributors')
    .select('activity_id, activities:activity_id(title_narrative)')
    .eq('organization_id', id);

  if (contributorRows && contributorRows.length > 0) {
    const titles = Array.from(
      new Set(
        contributorRows
          .map((r: any) => r.activities?.title_narrative)
          .filter(Boolean)
      )
    );
    const activityCount = titles.length || contributorRows.length;
    references.push(
      `Contributor on ${activityCount} ` +
        `activit${activityCount > 1 ? 'ies' : 'y'}${summariseNames(titles)}`
    );
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
