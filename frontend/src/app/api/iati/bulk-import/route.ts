import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';
import { prefetchOrganizations, OrganizationParams } from '@/lib/organization-helpers';
import { prefetchContacts, contactDedupKey, ContactParams } from '@/lib/contact-helpers';
import { resolveUserOrgScope, resolveOrgScopeById, matchesOrgScope } from '@/lib/iati/org-scope';
import { USER_ROLES } from '@/types/user';
import { notifyImportComplete } from '@/lib/import-notifications';
import { fetchAndParseAllResults } from '@/lib/iati/parse-results-xml';
import type { ParsedIATIResult } from '@/lib/iati/parse-results-xml';
import { importResultsForActivity } from '@/lib/iati/results-importer';

export const maxDuration = 300;

/**
 * Map IATI organisation role code to database role_type.
 * IATI codes: 1=Funding, 2=Accountable, 3=Extending, 4=Implementing
 * Database allowed values: 'extending', 'implementing', 'government', 'funding'
 */
function mapIatiRoleToRoleType(iatiRoleCode: string | undefined): string {
  switch (iatiRoleCode) {
    case '1': return 'funding';
    case '2': return 'government'; // Accountable → government (closest match)
    case '3': return 'extending';
    case '4': return 'implementing';
    default: return 'implementing'; // Default to implementing for unknown roles
  }
}

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

/**
 * Cache for USD conversion rates within a single batch import.
 * Avoids redundant exchange rate lookups for transactions with the same currency+date.
 */
const rateCache = new Map<string, any>();
async function getCachedUSDConversion(value: number, currency: string, date: string) {
  const key = `${currency}_${date}`;
  if (!rateCache.has(key)) {
    rateCache.set(key, await convertTransactionToUSD(1, currency, date));
  }
  const unitRate = rateCache.get(key);
  if (!unitRate || unitRate.value_usd == null) {
    // Fallback to direct conversion
    return await convertTransactionToUSD(value, currency, date);
  }
  // Scale the unit rate by actual value
  return {
    ...unitRate,
    value_usd: unitRate.value_usd * value,
  };
}

/**
 * Batch insert with fallback: if batch fails, try individual inserts.
 * Returns number of successfully inserted records.
 */
async function batchInsertWithFallback(
  supabase: any,
  table: string,
  records: any[],
  iatiId: string,
  label: string
): Promise<number> {
  if (records.length === 0) return 0;

  const { error } = await supabase.from(table).insert(records);
  if (!error) return records.length;

  // Batch failed — fall back to individual inserts
  console.warn(`[Bulk Import] Batch ${label} insert failed for ${iatiId}, falling back to individual:`, error.message);
  let count = 0;
  for (const record of records) {
    const { error: singleError } = await supabase.from(table).insert(record);
    if (singleError) {
      console.error(`[Bulk Import] ${label} individual insert error for ${iatiId}:`, singleError.message);
    } else {
      count++;
    }
  }
  return count;
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
      status: 'importing',
      import_rules: importRules,
      source_mode: meta.sourceMode || 'xml_upload',
      started_at: new Date().toISOString(),
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

    // Return early with batchId so client can start polling immediately
    // Processing continues in background via after() or async IIFE
    const responsePromise = NextResponse.json({
      batchId,
      status: 'importing',
      message: 'Import started. Poll status endpoint for progress.',
    });

    // Process activities in background using Next.js after() for reliability
    // Falls back to async IIFE in environments where after() isn't available
    const processActivities = async () => {
      // Clear rate cache at start of batch
      rateCache.clear();

      // Pre-fetch results XML for all datastore-mode activities in parallel
      const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY;
      let prefetchedResults: Map<string, ParsedIATIResult[]> = new Map();
      if (meta.sourceMode === 'datastore' && IATI_API_KEY) {
        const iatiIds = selectedActivities.map((a: any) => a.iatiIdentifier || a.iati_id);
        prefetchedResults = await fetchAndParseAllResults(iatiIds, IATI_API_KEY, 5);
        console.log(`[Bulk Import] Pre-fetched results for ${prefetchedResults.size}/${iatiIds.length} activities`);
      }

      // Pre-fetch all organization references across all activities
      let orgCache = new Map<string, string>();
      if (importRules.autoMatchOrganizations) {
        const allOrgParams: OrganizationParams[] = [];

        for (const activity of selectedActivities) {
          // Collect from transactions
          if (activity.transactions?.length > 0) {
            for (const tx of activity.transactions) {
              const provRef = tx.providerOrgRef || tx.provider_org_ref;
              const provName = tx.providerOrg || tx.provider_org_name;
              if (provRef || provName) {
                allOrgParams.push({
                  ref: provRef,
                  name: provName,
                  type: tx.providerOrgType || tx.provider_org_type,
                });
              }
              const recRef = tx.receiverOrgRef || tx.receiver_org_ref;
              const recName = tx.receiverOrg || tx.receiver_org_name;
              if (recRef || recName) {
                allOrgParams.push({
                  ref: recRef,
                  name: recName,
                  type: tx.receiverOrgType || tx.receiver_org_type,
                });
              }
            }
          }
          // Collect from participating orgs
          if (activity.participatingOrgs?.length > 0) {
            for (const org of activity.participatingOrgs) {
              if (org.ref) {
                allOrgParams.push({
                  ref: org.ref,
                  name: org.name || 'Unknown',
                  type: org.type,
                });
              }
            }
          }
        }

        console.log(`[Bulk Import] Pre-fetching ${allOrgParams.length} org references...`);
        orgCache = await prefetchOrganizations(supabase, allOrgParams);
        console.log(`[Bulk Import] Org cache ready: ${orgCache.size} entries`);
      }

      // Pre-fetch all contact references across all activities
      let contactCache = new Map<string, string>();
      {
        const allContactParams: ContactParams[] = [];
        for (const activity of selectedActivities) {
          if (activity.contacts?.length > 0) {
            for (const contact of activity.contacts) {
              let firstName: string | undefined;
              let lastName: string | undefined;
              if (contact.personName) {
                const nameParts = contact.personName.trim().split(/\s+/);
                if (nameParts.length >= 2) {
                  firstName = nameParts[0];
                  lastName = nameParts.slice(1).join(' ');
                } else {
                  lastName = contact.personName;
                }
              }
              allContactParams.push({
                email: contact.email || undefined,
                firstName,
                lastName,
                jobTitle: contact.jobTitle || undefined,
                position: contact.jobTitle || undefined,
                organisation: contact.organisationName || undefined,
                department: contact.departmentName || undefined,
                phone: contact.telephone || undefined,
                website: contact.website || undefined,
                mailingAddress: contact.mailingAddress || undefined,
              });
            }
          }
        }

        if (allContactParams.length > 0) {
          console.log(`[Bulk Import] Pre-fetching ${allContactParams.length} contact references...`);
          contactCache = await prefetchContacts(supabase, allContactParams);
          console.log(`[Bulk Import] Contact cache ready: ${contactCache.size} entries`);
        }
      }

      // Process each activity atomically
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const activity of selectedActivities) {
      const iatiId = activity.iatiIdentifier || activity.iati_id;

      try {
        // Update batch item to processing
        await supabase
          .from('iati_import_batch_items')
          .update({ status: 'processing' })
          .eq('batch_id', batchId)
          .eq('iati_identifier', iatiId);

        // Check if activity exists in DB
        const { data: existingActivity } = await supabase
          .from('activities')
          .select('id')
          .eq('iati_identifier', iatiId)
          .single();

        let activityDbId: string | null = null;
        let action: 'create' | 'update' | 'skip' = 'create';

        if (existingActivity) {
          if (importRules.activityMatching === 'skip_existing') {
            // Skip existing
            action = 'skip';
            skippedCount++;
            await supabase
              .from('iati_import_batch_items')
              .update({ action: 'skip', status: 'skipped', activity_id: existingActivity.id })
              .eq('batch_id', batchId)
              .eq('iati_identifier', iatiId);
            // Update batch counts incrementally
            await supabase
              .from('iati_import_batches')
              .update({
                created_count: createdCount,
                updated_count: updatedCount,
                skipped_count: skippedCount,
                failed_count: failedCount,
              })
              .eq('id', batchId);
            continue;
          } else if (importRules.activityMatching === 'update_existing') {
            // Update existing
            action = 'update';
            activityDbId = existingActivity.id;

            const updateData: any = {
              updated_at: new Date().toISOString(),
            };
            if (activity.title) updateData.title_narrative = activity.title;
            if (activity.description) updateData.description_narrative = activity.description;
            if (activity.activity_status) updateData.activity_status = activity.activity_status;
            if (activity.planned_start_date) updateData.planned_start_date = activity.planned_start_date;
            if (activity.planned_end_date) updateData.planned_end_date = activity.planned_end_date;
            if (activity.actual_start_date) updateData.actual_start_date = activity.actual_start_date;
            if (activity.actual_end_date) updateData.actual_end_date = activity.actual_end_date;
            if (activity.hierarchy != null) updateData.hierarchy = activity.hierarchy;
            if (activity.recipientCountries) updateData.recipient_countries = activity.recipientCountries;
            // DAC/CRS classification fields
            if (activity.collaborationType) updateData.collaboration_type = activity.collaborationType;
            if (activity.defaultAidType) updateData.default_aid_type = activity.defaultAidType;
            if (activity.defaultFinanceType) updateData.default_finance_type = activity.defaultFinanceType;
            if (activity.defaultFlowType) updateData.default_flow_type = activity.defaultFlowType;
            if (activity.defaultTiedStatus) updateData.default_tied_status = activity.defaultTiedStatus;
            // Humanitarian, scope, language
            if (activity.humanitarian != null) updateData.humanitarian = activity.humanitarian;
            if (activity.activityScope) updateData.activity_scope = activity.activityScope;
            if (activity.language) updateData.language = activity.language;

            // Set auto-sync fields for Datastore imports when enabled
            if (meta.sourceMode === 'datastore' && importRules.enableAutoSync) {
              const syncFields: string[] = ['title', 'description', 'status', 'dates'];
              if (activity.sectors?.length) syncFields.push('sectors');
              if (activity.transactions?.length) syncFields.push('transactions');
              if (activity.budgets?.length) syncFields.push('budgets');
              if (activity.participatingOrgs?.length) syncFields.push('organizations');
              if (activity.locations?.length) syncFields.push('locations');
              if (activity.contacts?.length) syncFields.push('contacts');
              if (activity.documents?.length) syncFields.push('documents');
              if (activity.recipientCountries?.length) syncFields.push('countries');
              if (activity.plannedDisbursements?.length) syncFields.push('planned_disbursements');
              if (activity.policyMarkers?.length) syncFields.push('policy_markers');
              updateData.auto_sync = true;
              updateData.last_sync_time = new Date().toISOString();
              updateData.sync_status = 'live';
              updateData.auto_sync_fields = syncFields;
            }

            const { error: updateError } = await supabase
              .from('activities')
              .update(updateData)
              .eq('id', existingActivity.id);

            if (updateError) throw updateError;
            updatedCount++;
          } else {
            // create_new_version - create new activity even though one exists
            action = 'create';
          }
        }

        if (action === 'create') {
          // Create new activity with ownership fields
          const insertData: any = {
            iati_identifier: iatiId,
            title_narrative: activity.title || null,
            description_narrative: activity.description || null,
            activity_status: activity.activity_status || 'draft',
            planned_start_date: activity.planned_start_date || null,
            planned_end_date: activity.planned_end_date || null,
            actual_start_date: activity.actual_start_date || null,
            actual_end_date: activity.actual_end_date || null,
            hierarchy: activity.hierarchy != null ? activity.hierarchy : null,
            recipient_countries: activity.recipientCountries || [],
            // DAC/CRS classification fields
            collaboration_type: activity.collaborationType || null,
            default_aid_type: activity.defaultAidType || null,
            default_finance_type: activity.defaultFinanceType || null,
            default_flow_type: activity.defaultFlowType || null,
            default_tied_status: activity.defaultTiedStatus || null,
            // Humanitarian, scope, language
            humanitarian: activity.humanitarian ?? false,
            activity_scope: activity.activityScope || null,
            language: activity.language || 'en',
            created_via: 'import',
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Set auto-sync fields for Datastore imports when enabled
          if (meta.sourceMode === 'datastore' && importRules.enableAutoSync) {
            const syncFields: string[] = ['title', 'description', 'status', 'dates'];
            if (activity.sectors?.length) syncFields.push('sectors');
            if (activity.transactions?.length) syncFields.push('transactions');
            if (activity.budgets?.length) syncFields.push('budgets');
            if (activity.participatingOrgs?.length) syncFields.push('organizations');
            if (activity.locations?.length) syncFields.push('locations');
            if (activity.contacts?.length) syncFields.push('contacts');
            if (activity.documents?.length) syncFields.push('documents');
            if (activity.recipientCountries?.length) syncFields.push('countries');
            if (activity.plannedDisbursements?.length) syncFields.push('planned_disbursements');
            if (activity.policyMarkers?.length) syncFields.push('policy_markers');
            insertData.auto_sync = true;
            insertData.last_sync_time = new Date().toISOString();
            insertData.sync_status = 'live';
            insertData.auto_sync_fields = syncFields;
          }

          // Set organisation ownership from orgScope
          if (orgScope) {
            insertData.reporting_org_id = orgScope.organizationId;
            insertData.reporting_org_ref = activity._reportingOrgRef || orgScope.reportingOrgRef || orgScope.iatiOrgId;
          }
          const { data: newActivity, error: createError } = await supabase
            .from('activities')
            .insert(insertData)
            .select('id')
            .single();

          if (createError) throw createError;
          activityDbId = newActivity.id;
          createdCount++;
        }

        // If replacing all, delete existing child records first
        if (importRules.transactionHandling === 'replace_all' && action === 'update' && activityDbId) {
          await supabase.from('transactions').delete().eq('activity_id', activityDbId);
          await supabase.from('activity_budgets').delete().eq('activity_id', activityDbId);
          await supabase.from('activity_participating_organizations').delete().eq('activity_id', activityDbId);
          await supabase.from('activity_sectors').delete().eq('activity_id', activityDbId);
          await supabase.from('activity_locations').delete().eq('activity_id', activityDbId);
          await supabase.from('activity_contacts').delete().eq('activity_id', activityDbId).eq('imported_from_iati', true);
          await supabase.from('activity_documents').delete().eq('activity_id', activityDbId).eq('is_external', true);
          await supabase.from('activity_policy_markers').delete().eq('activity_id', activityDbId);
          await supabase.from('humanitarian_scope').delete().eq('activity_id', activityDbId);
          await supabase.from('activity_tags').delete().eq('activity_id', activityDbId);
          await supabase.from('activity_results').delete().eq('activity_id', activityDbId);
        }

        // ========================================================
        // Import transactions (batched with USD conversion caching)
        // ========================================================
        let transactionsImported = 0;
        if (activityDbId && importRules.transactionHandling !== 'skip' && activity.transactions?.length > 0) {
          const txRecords: any[] = [];

          for (const tx of activity.transactions) {
            try {
              const currency = tx.currency || 'USD';
              const txValue = parseFloat(tx.value);
              if (isNaN(txValue)) continue;
              const txDate = tx.transaction_date || tx.date;

              // Resolve organizations from pre-fetched cache
              let providerOrgId: string | null = null;
              let receiverOrgId: string | null = null;

              if (importRules.autoMatchOrganizations) {
                const provRef = tx.providerOrgRef || tx.provider_org_ref;
                const provName = tx.providerOrg || tx.provider_org_name;
                if (provRef || provName) {
                  providerOrgId = (provRef && orgCache.get(provRef)) || (provName && orgCache.get(provName.toLowerCase())) || null;
                }
                const recRef = tx.receiverOrgRef || tx.receiver_org_ref;
                const recName = tx.receiverOrg || tx.receiver_org_name;
                if (recRef || recName) {
                  receiverOrgId = (recRef && orgCache.get(recRef)) || (recName && orgCache.get(recName.toLowerCase())) || null;
                }
              }

              const transactionData: any = {
                activity_id: activityDbId,
                transaction_type: tx.transaction_type || tx.type,
                transaction_date: txDate,
                value: txValue,
                currency: currency,
                status: tx.status || 'actual',
                value_date: tx.value_date || txDate,
                description: tx.description || null,
                provider_org_id: providerOrgId,
                provider_org_ref: tx.providerOrgRef || tx.provider_org_ref || null,
                provider_org_name: tx.providerOrg || tx.provider_org_name || null,
                receiver_org_id: receiverOrgId,
                receiver_org_ref: tx.receiverOrgRef || tx.receiver_org_ref || null,
                receiver_org_name: tx.receiverOrg || tx.receiver_org_name || null,
                activity_iati_ref: iatiId,
                flow_type: tx.flow_type || tx.flowType || null,
                finance_type: tx.finance_type || tx.financeType || null,
                aid_type: tx.aid_type || tx.aidType || null,
                tied_status: tx.tied_status || tx.tiedStatus || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              // Convert to USD (with caching) — skip lookup for zero values or USD
              const usdResult = (txValue === 0 || currency === 'USD')
                ? { value_usd: txValue, exchange_rate_used: 1.0, usd_conversion_date: new Date().toISOString(), usd_convertible: true, success: true }
                : await getCachedUSDConversion(txValue, currency, tx.value_date || txDate);

              txRecords.push(addUSDFieldsToTransaction(transactionData, usdResult));
            } catch (txErr) {
              console.error(`[Bulk Import] Transaction prep error for ${iatiId}:`, txErr);
            }
          }

          transactionsImported = await batchInsertWithFallback(supabase, 'transactions', txRecords, iatiId, 'transaction');
        }

        // ========================================================
        // Import budgets (batched)
        // ========================================================
        let budgetsImported = 0;
        if (activityDbId && activity.budgets?.length > 0) {
          const budgetRecords: any[] = [];

          for (const budget of activity.budgets) {
            const periodStart = budget.periodStart?.includes('T') ? budget.periodStart.split('T')[0] : budget.periodStart || null;
            const periodEnd = budget.periodEnd?.includes('T') ? budget.periodEnd.split('T')[0] : budget.periodEnd || null;
            const budgetValue = parseFloat(budget.value);
            if (isNaN(budgetValue)) continue;
            const rawValueDate = budget.valueDate || budget.periodStart;
            const valueDate = rawValueDate?.includes('T') ? rawValueDate.split('T')[0] : rawValueDate || periodStart;

            budgetRecords.push({
              activity_id: activityDbId,
              type: Number(budget.type) || 1,
              status: Number(budget.status) || 1,
              period_start: periodStart,
              period_end: periodEnd,
              value: budgetValue,
              currency: budget.currency || 'USD',
              value_date: valueDate,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          budgetsImported = await batchInsertWithFallback(supabase, 'activity_budgets', budgetRecords, iatiId, 'budget');
        }

        // ========================================================
        // Import participating organisations (org lookups from cache, insert batched)
        // ========================================================
        let participatingOrgsImported = 0;
        if (activityDbId && activity.participatingOrgs?.length > 0) {
          const poRecords: any[] = [];

          for (const org of activity.participatingOrgs) {
            let matchedOrgId: string | null = null;
            if (importRules.autoMatchOrganizations && org.ref) {
              matchedOrgId = orgCache.get(org.ref) || (org.name && orgCache.get(org.name.toLowerCase())) || null;
            }

            poRecords.push({
              activity_id: activityDbId,
              organization_id: matchedOrgId,
              role_type: mapIatiRoleToRoleType(org.role),
              iati_role_code: org.role ? Number(org.role) : null,
              iati_org_ref: org.ref || null,
              org_type: org.type || null,
              narrative: org.name || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          participatingOrgsImported = await batchInsertWithFallback(supabase, 'activity_participating_organizations', poRecords, iatiId, 'participating org');
        }

        // ========================================================
        // Import sectors (batched, now includes non-DAC vocabularies)
        // ========================================================
        let sectorsImported = 0;
        if (activityDbId && activity.sectors?.length > 0) {
          // Import DAC sectors (vocab 1, 2, or unspecified) and reporting-org specific (vocab 99)
          const importableSectors = activity.sectors.filter((s: any) =>
            !s.vocabulary || s.vocabulary === '1' || s.vocabulary === '2' || s.vocabulary === '99'
          );

          const totalPct = importableSectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0);
          const needsDistribution = totalPct === 0 && importableSectors.length > 0;
          const equalPct = needsDistribution ? Math.round(100 / importableSectors.length * 100) / 100 : 0;

          const sectorRecords: any[] = [];
          for (const sector of importableSectors) {
            const sectorCode = String(sector.code);
            const categoryCode = sectorCode.substring(0, 3);
            const percentage = sector.percentage ?? equalPct;

            sectorRecords.push({
              activity_id: activityDbId,
              sector_code: sectorCode,
              sector_name: sector.name || `Sector ${sectorCode}`,
              percentage: percentage,
              level: sectorCode.length === 5 ? 'subsector' : 'category',
              category_code: categoryCode,
              category_name: sector.name ? sector.name.split(' - ')[0] : null,
              type: 'secondary',
              sector_vocabulary: sector.vocabulary || '1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          sectorsImported = await batchInsertWithFallback(supabase, 'activity_sectors', sectorRecords, iatiId, 'sector');
        }

        // ========================================================
        // Import locations (batched)
        // ========================================================
        let locationsImported = 0;
        if (activityDbId && activity.locations?.length > 0) {
          const locationRecords: any[] = [];

          for (const loc of activity.locations) {
            if (!loc.coordinates?.latitude || !loc.coordinates?.longitude) continue;

            locationRecords.push({
              activity_id: activityDbId,
              location_type: 'site',
              location_name: loc.name || 'Imported Location',
              description: loc.description || null,
              latitude: loc.coordinates.latitude,
              longitude: loc.coordinates.longitude,
              source: 'iati_import',
              location_reach: loc.reach || null,
              exactness: loc.exactness || null,
              location_class: loc.locationClass || null,
              feature_designation: loc.featureDesignation || null,
              srs_name: 'http://www.opengis.net/def/crs/EPSG/0/4326',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          locationsImported = await batchInsertWithFallback(supabase, 'activity_locations', locationRecords, iatiId, 'location');
        }

        // ========================================================
        // Import contacts (normalized via contacts table)
        // ========================================================
        let contactsImported = 0;
        if (activityDbId && activity.contacts?.length > 0) {
          const contactRecords: any[] = [];

          for (const contact of activity.contacts) {
            let firstName: string | null = null;
            let lastName: string | null = null;
            if (contact.personName) {
              const nameParts = contact.personName.trim().split(/\s+/);
              if (nameParts.length >= 2) {
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
              } else {
                lastName = contact.personName;
              }
            }

            // Resolve contact_id from prefetched cache
            const cpKey = contactDedupKey({
              email: contact.email || undefined,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
            });
            const resolvedContactId = cpKey ? contactCache.get(cpKey) || null : null;

            contactRecords.push({
              activity_id: activityDbId,
              contact_id: resolvedContactId,
              type: contact.type || '1',
              // Keep old columns during transition period
              organisation_name: contact.organisationName || null,
              department: contact.departmentName || null,
              first_name: firstName,
              last_name: lastName,
              job_title: contact.jobTitle || null,
              phone_number: contact.telephone || null,
              primary_email: contact.email || null,
              website: contact.website || null,
              mailing_address: contact.mailingAddress || null,
              imported_from_iati: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          contactsImported = await batchInsertWithFallback(supabase, 'activity_contacts', contactRecords, iatiId, 'contact');
        }

        // ========================================================
        // Import documents (batched)
        // ========================================================
        let documentsImported = 0;
        if (activityDbId && activity.documents?.length > 0) {
          const documentRecords: any[] = [];

          for (const doc of activity.documents) {
            if (!doc.url) continue;

            const titleNarrative = doc.title
              ? [{ text: doc.title, lang: doc.languageCode || 'en' }]
              : [{ text: 'Untitled Document', lang: 'en' }];

            const descriptionNarrative = doc.description
              ? [{ text: doc.description, lang: doc.languageCode || 'en' }]
              : [{ text: '', lang: 'en' }];

            documentRecords.push({
              activity_id: activityDbId,
              url: doc.url,
              format: doc.format || 'application/octet-stream',
              title: titleNarrative,
              description: descriptionNarrative,
              category_code: doc.categoryCode || 'A01',
              language_codes: doc.languageCode ? [doc.languageCode] : ['en'],
              document_date: doc.documentDate || null,
              is_external: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          documentsImported = await batchInsertWithFallback(supabase, 'activity_documents', documentRecords, iatiId, 'document');
        }

        // ========================================================
        // Import policy markers (Rec #5) — look up marker ID, batch insert
        // ========================================================
        let policyMarkersImported = 0;
        if (activityDbId && activity.policyMarkers?.length > 0) {
          const pmRecords: any[] = [];

          for (const pm of activity.policyMarkers) {
            try {
              // Look up the policy marker in our system by IATI code
              const { data: marker } = await supabase
                .from('policy_markers')
                .select('id')
                .eq('iati_code', pm.code)
                .limit(1)
                .single();

              if (marker) {
                pmRecords.push({
                  activity_id: activityDbId,
                  policy_marker_id: marker.id,
                  significance: pm.significance ?? 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              } else {
                console.warn(`[Bulk Import] Policy marker not found for code ${pm.code}, skipping`);
              }
            } catch (pmErr) {
              console.error(`[Bulk Import] Policy marker lookup error for ${iatiId}:`, pmErr);
            }
          }

          policyMarkersImported = await batchInsertWithFallback(supabase, 'activity_policy_markers', pmRecords, iatiId, 'policy marker');
        }

        // ========================================================
        // Import humanitarian scope (Rec #6) — batch insert
        // ========================================================
        let humanitarianScopesImported = 0;
        if (activityDbId && activity.humanitarianScopes?.length > 0) {
          const hsRecords: any[] = [];

          for (const hs of activity.humanitarianScopes) {
            hsRecords.push({
              activity_id: activityDbId,
              type: hs.type || '1',
              vocabulary: hs.vocabulary || '1-2',
              code: hs.code,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          humanitarianScopesImported = await batchInsertWithFallback(supabase, 'humanitarian_scope', hsRecords, iatiId, 'humanitarian scope');
        }

        // ========================================================
        // Import tags including SDGs (Rec #7) — upsert tags, batch insert activity_tags
        // ========================================================
        let tagsImported = 0;
        if (activityDbId && activity.tags?.length > 0) {
          const tagRecords: any[] = [];

          for (const tag of activity.tags) {
            try {
              // Try to find existing tag by code + vocabulary
              const tagName = tag.narrative || tag.code;
              const tagVocab = tag.vocabulary || '99';

              let tagId: string | null = null;
              const { data: existingTag } = await supabase
                .from('tags')
                .select('id')
                .eq('code', tag.code)
                .eq('vocabulary', tagVocab)
                .limit(1)
                .single();

              if (existingTag) {
                tagId = existingTag.id;
              } else {
                // Create the tag
                const { data: newTag } = await supabase
                  .from('tags')
                  .insert({
                    name: tagName,
                    code: tag.code,
                    vocabulary: tagVocab,
                    created_at: new Date().toISOString(),
                  })
                  .select('id')
                  .single();

                tagId = newTag?.id || null;
              }

              if (tagId) {
                tagRecords.push({
                  activity_id: activityDbId,
                  tag_id: tagId,
                  tagged_by: user.id,
                  created_at: new Date().toISOString(),
                });
              }
            } catch (tagErr) {
              console.error(`[Bulk Import] Tag error for ${iatiId}:`, tagErr);
            }
          }

          tagsImported = await batchInsertWithFallback(supabase, 'activity_tags', tagRecords, iatiId, 'tag');
        }

        // ========================================================
        // Import results (from pre-fetched map)
        // ========================================================
        let resultsImported = 0;
        let indicatorsImported = 0;
        let periodsImported = 0;
        if (activityDbId) {
          const parsedResults = prefetchedResults.get(iatiId);
          if (parsedResults && parsedResults.length > 0) {
            try {
              const resultsSummary = await importResultsForActivity(supabase, activityDbId, parsedResults);
              resultsImported = resultsSummary.results_created;
              indicatorsImported = resultsSummary.indicators_created;
              periodsImported = resultsSummary.periods_created;
              if (resultsSummary.errors.length > 0) {
                console.warn(`[Bulk Import] ${iatiId}: ${resultsSummary.errors.length} results import errors`);
              }
            } catch (resultsError) {
              console.error(`[Bulk Import] Results import error for ${iatiId}:`, resultsError);
            }
          }
        }

        console.log(`[Bulk Import] ${iatiId}: ${transactionsImported} txns, ${budgetsImported} budgets, ${participatingOrgsImported} orgs, ${sectorsImported} sectors, ${locationsImported} locations, ${contactsImported} contacts, ${documentsImported} documents, ${policyMarkersImported} policy markers, ${humanitarianScopesImported} humanitarian scopes, ${tagsImported} tags, ${resultsImported} results, ${indicatorsImported} indicators, ${periodsImported} periods`);

        // Update batch item to completed with detailed import counts
        await supabase
          .from('iati_import_batch_items')
          .update({
            action,
            status: 'completed',
            activity_id: activityDbId,
            transactions_imported: transactionsImported,
            import_details: {
              budgets: budgetsImported,
              organizations: participatingOrgsImported,
              sectors: sectorsImported,
              locations: locationsImported,
              contacts: contactsImported,
              documents: documentsImported,
              policyMarkers: policyMarkersImported,
              humanitarianScopes: humanitarianScopesImported,
              tags: tagsImported,
              results: resultsImported,
              indicators: indicatorsImported,
              periods: periodsImported,
            },
          })
          .eq('batch_id', batchId)
          .eq('iati_identifier', iatiId);

        // Update batch counts incrementally so polling shows progress
        await supabase
          .from('iati_import_batches')
          .update({
            created_count: createdCount,
            updated_count: updatedCount,
            skipped_count: skippedCount,
            failed_count: failedCount,
          })
          .eq('id', batchId);
      } catch (error) {
        console.error(`[Bulk Import] Failed to import activity ${iatiId}:`, error);
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('iati_import_batch_items')
          .update({
            action: 'fail',
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('batch_id', batchId)
          .eq('iati_identifier', iatiId);

        // Update batch counts incrementally on failure too
        await supabase
          .from('iati_import_batches')
          .update({
            created_count: createdCount,
            updated_count: updatedCount,
            skipped_count: skippedCount,
            failed_count: failedCount,
          })
          .eq('id', batchId);
      }
    }

      // Update batch with final counts
      await supabase
        .from('iati_import_batches')
        .update({
          status: failedCount === selectedActivities.length ? 'failed' : 'completed',
          created_count: createdCount,
          updated_count: updatedCount,
          skipped_count: skippedCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId);

      console.log(`[Bulk Import] Batch ${batchId} completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed`);

      // Send completion notification (Rec #10)
      await notifyImportComplete(user.id, batchId, meta.reportingOrgName, createdCount, updatedCount, failedCount);

      // Clear rate cache after batch completes
      rateCache.clear();
    };

    // Start background processing (fire and forget)
    // In serverless, this may be interrupted after response is sent,
    // but in dev mode and long-running servers it will complete
    processActivities().catch(async (error) => {
      console.error('[Bulk Import] Background processing error:', error);
      try {
        await supabase
          .from('iati_import_batches')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Background processing failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', batchId);
      } catch (updateError) {
        console.error('[Bulk Import] Failed to update batch status:', updateError);
      }
    });

    // Return immediately so client can start polling
    return responsePromise;
  } catch (error) {
    console.error('[Bulk Import] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk import failed' },
      { status: 500 }
    );
  }
}
