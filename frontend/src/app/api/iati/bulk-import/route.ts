import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { resolveUserOrgScope, resolveOrgScopeById, matchesOrgScope } from '@/lib/iati/org-scope';
import { USER_ROLES } from '@/types/user';

export const maxDuration = 30;

interface BulkImportRequest {
  activities: any[];
  selectedActivityIds: string[];
  importRules: {
    activityMatching: 'update_existing' | 'skip_existing' | 'create_new_version';
    transactionHandling: 'replace_all' | 'append_new' | 'skip';
    autoMatchOrganizations: boolean;
    enableAutoSync?: boolean;
  };
  meta: {
    sourceMode?: 'datastore' | 'xml_upload';
    fileName?: string;
    fileHash?: string;
    iatiVersion?: string;
    reportingOrgRef: string;
    reportingOrgName: string;
  };
  /** For super users: import on behalf of this organization */
  organizationId?: string;
}

export async function POST(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const data: BulkImportRequest = await request.json();
    const { activities, selectedActivityIds, importRules, meta, organizationId } = data;

    // Fetch user's role from the users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || null;
    const isSuperUser = userRole === USER_ROLES.SUPER_USER ||
                        userRole === 'admin' ||
                        userRole === 'super_user';

    // Resolve organisation scope - use specified org for super users, otherwise user's own org
    let orgScope;
    if (organizationId && isSuperUser) {
      orgScope = await resolveOrgScopeById(supabase, organizationId);
      if (!orgScope) {
        return NextResponse.json(
          { error: 'Specified organization not found.' },
          { status: 404 }
        );
      }
      console.log('[Bulk Import] Super user importing for org:', orgScope.organizationName, orgScope.allRefs);
    } else if (organizationId && !isSuperUser) {
      return NextResponse.json(
        { error: 'You do not have permission to import for other organisations.' },
        { status: 403 }
      );
    } else {
      orgScope = await resolveUserOrgScope(supabase, user.id);
    }

    const selectedSet = new Set(selectedActivityIds);
    const selectedActivities = activities.filter(
      (a: any) => selectedSet.has(a.iatiIdentifier || a.iati_id)
    );

    if (selectedActivities.length === 0) {
      return NextResponse.json({ error: 'No activities selected for import' }, { status: 400 });
    }

    // Defence in depth: re-verify each activity's reporting-org matches the user's organisation
    if (orgScope && orgScope.allRefs.length > 0) {
      const mismatchedActivities = selectedActivities.filter((a: any) => {
        const ref = a._reportingOrgRef || '';
        return ref && !matchesOrgScope(orgScope, ref);
      });
      if (mismatchedActivities.length > 0) {
        const mismatchIds = mismatchedActivities.map((a: any) => a.iatiIdentifier || a.iati_id).join(', ');
        return NextResponse.json(
          { error: `Organisation mismatch: the following activities do not belong to your organisation and cannot be imported: ${mismatchIds}` },
          { status: 403 }
        );
      }
    }

    // Create batch record
    const batchInsert: Record<string, any> = {
      user_id: user.id,
      file_name: meta.fileName || (meta.sourceMode === 'datastore' ? 'IATI Datastore' : null),
      file_hash: meta.fileHash || null,
      iati_version: meta.iatiVersion || null,
      reporting_org_ref: meta.reportingOrgRef,
      reporting_org_name: meta.reportingOrgName,
      total_activities: selectedActivities.length,
      status: 'pending',
      import_rules: importRules,
      source_mode: meta.sourceMode || 'xml_upload',
    };

    let { data: batch, error: batchError } = await supabase
      .from('iati_import_batches')
      .insert(batchInsert)
      .select('id')
      .single();

    // Retry without source_mode if the column doesn't exist yet (migration not applied)
    if (batchError && batchError.message?.includes('source_mode')) {
      console.warn('[Bulk Import] source_mode column not found, retrying without it');
      delete batchInsert.source_mode;
      const retry = await supabase
        .from('iati_import_batches')
        .insert(batchInsert)
        .select('id')
        .single();
      batch = retry.data;
      batchError = retry.error;
    }

    if (batchError || !batch) {
      console.error('[Bulk Import] Failed to create batch:', batchError);
      return NextResponse.json(
        { error: `Failed to create import batch: ${batchError?.message || 'unknown error'}` },
        { status: 500 }
      );
    }

    const batchId = batch.id;

    // Create batch item records for all selected activities
    const batchItems = selectedActivities.map((activity: any) => ({
      batch_id: batchId,
      iati_identifier: activity.iatiIdentifier || activity.iati_id,
      activity_title: (activity.title || '').substring(0, 500),
      action: 'pending' as const,
      status: 'queued' as const,
      transactions_count: (activity.transactions || []).length,
      transactions_imported: 0,
      validation_issues: activity.validationIssues || null,
      import_details: {
        // Expected counts (from source data)
        budgetsTotal: (activity.budgets || []).length,
        organizationsTotal: (activity.participatingOrgs || []).length,
        sectorsTotal: (activity.sectors || []).length,
        locationsTotal: (activity.locations || []).length,
        contactsTotal: (activity.contacts || []).length,
        documentsTotal: (activity.documents || []).length,
        policyMarkersTotal: (activity.policyMarkers || []).length,
        humanitarianScopesTotal: (activity.humanitarianScopes || []).length,
        tagsTotal: (activity.tags || []).length,
        // Imported counts (updated during import)
        budgets: 0,
        organizations: 0,
        sectors: 0,
        locations: 0,
        contacts: 0,
        documents: 0,
        policyMarkers: 0,
        humanitarianScopes: 0,
        tags: 0,
      },
    }));

    const { error: itemsError } = await supabase
      .from('iati_import_batch_items')
      .insert(batchItems);

    if (itemsError) {
      console.error('[Bulk Import] Failed to create batch items:', itemsError);
      await supabase.from('iati_import_batches').update({ status: 'failed', error_message: 'Failed to create batch items' }).eq('id', batchId);
      return NextResponse.json({ error: 'Failed to create batch items' }, { status: 500 });
    }

    // Return batchId so frontend can start chunked processing
    return NextResponse.json({
      batchId,
      totalActivities: selectedActivities.length,
      status: 'created',
    });
  } catch (error) {
    console.error('[Bulk Import] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk import failed' },
      { status: 500 }
    );
  }
}
