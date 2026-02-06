import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';
import { getOrCreateOrganization } from '@/lib/organization-helpers';
import { resolveUserOrgScope, resolveOrgScopeById, matchesOrgScope } from '@/lib/iati/org-scope';
import { USER_ROLES } from '@/types/user';

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
    }));

    const { error: itemsError } = await supabase
      .from('iati_import_batch_items')
      .insert(batchItems);

    if (itemsError) {
      console.error('[Bulk Import] Failed to create batch items:', itemsError);
      await supabase.from('iati_import_batches').update({ status: 'failed', error_message: 'Failed to create batch items' }).eq('id', batchId);
      return NextResponse.json({ error: 'Failed to create batch items' }, { status: 500 });
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
            created_via: 'import',
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
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

        // Import transactions if not skipping
        let transactionsImported = 0;
        if (activityDbId && importRules.transactionHandling !== 'skip' && activity.transactions?.length > 0) {
          // If replacing all, delete existing transactions, budgets, participating orgs, sectors, and locations first
          if (importRules.transactionHandling === 'replace_all' && action === 'update') {
            await supabase
              .from('transactions')
              .delete()
              .eq('activity_id', activityDbId);
            await supabase
              .from('activity_budgets')
              .delete()
              .eq('activity_id', activityDbId);
            await supabase
              .from('activity_participating_organizations')
              .delete()
              .eq('activity_id', activityDbId);
            await supabase
              .from('activity_sectors')
              .delete()
              .eq('activity_id', activityDbId);
            await supabase
              .from('activity_locations')
              .delete()
              .eq('activity_id', activityDbId);
          }

          for (const tx of activity.transactions) {
            try {
              const currency = tx.currency || 'USD';
              const txValue = parseFloat(tx.value);
              const txDate = tx.transaction_date || tx.date;

              // Resolve organizations
              let providerOrgId: string | null = null;
              let receiverOrgId: string | null = null;

              if (importRules.autoMatchOrganizations) {
                if (tx.providerOrg || tx.provider_org_name || tx.providerOrgRef || tx.provider_org_ref) {
                  providerOrgId = await getOrCreateOrganization(supabase, {
                    ref: tx.providerOrgRef || tx.provider_org_ref,
                    name: tx.providerOrg || tx.provider_org_name,
                    type: tx.providerOrgType || tx.provider_org_type,
                  });
                }
                if (tx.receiverOrg || tx.receiver_org_name || tx.receiverOrgRef || tx.receiver_org_ref) {
                  receiverOrgId = await getOrCreateOrganization(supabase, {
                    ref: tx.receiverOrgRef || tx.receiver_org_ref,
                    name: tx.receiverOrg || tx.receiver_org_name,
                    type: tx.receiverOrgType || tx.receiver_org_type,
                  });
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

              // Convert to USD
              const usdResult = await convertTransactionToUSD(
                txValue,
                currency,
                tx.value_date || txDate
              );

              const transactionDataWithUSD = addUSDFieldsToTransaction(transactionData, usdResult);

              const { error: txError } = await supabase
                .from('transactions')
                .insert(transactionDataWithUSD);

              if (txError) {
                console.error(`[Bulk Import] Transaction insert error for ${iatiId}:`, txError.message, txError.details);
              } else {
                transactionsImported++;
              }
            } catch (txErr) {
              console.error(`[Bulk Import] Transaction error for ${iatiId}:`, txErr);
            }
          }
        }

        // Import budgets if available
        let budgetsImported = 0;
        if (activityDbId && activity.budgets?.length > 0) {
          for (const budget of activity.budgets) {
            try {
              // Parse period dates (may include time component)
              const periodStart = budget.periodStart?.includes('T')
                ? budget.periodStart.split('T')[0]
                : budget.periodStart || null;
              const periodEnd = budget.periodEnd?.includes('T')
                ? budget.periodEnd.split('T')[0]
                : budget.periodEnd || null;

              const budgetValue = parseFloat(budget.value);
              if (isNaN(budgetValue)) continue;

              // Parse value_date (may include time component)
              const rawValueDate = budget.valueDate || budget.periodStart;
              const valueDate = rawValueDate?.includes('T')
                ? rawValueDate.split('T')[0]
                : rawValueDate || periodStart;

              const budgetData = {
                activity_id: activityDbId,
                type: Number(budget.type) || 1, // Default to 1='original' budget type
                status: Number(budget.status) || 1, // Default to 1='indicative'
                period_start: periodStart,
                period_end: periodEnd,
                value: budgetValue,
                currency: budget.currency || 'USD',
                value_date: valueDate,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { error: budgetError } = await supabase
                .from('activity_budgets')
                .insert(budgetData);

              if (budgetError) {
                console.error(`[Bulk Import] Budget insert error for ${iatiId}:`, budgetError.message, budgetError.details);
              } else {
                budgetsImported++;
              }
            } catch (budgetErr) {
              console.error(`[Bulk Import] Budget error for ${iatiId}:`, budgetErr);
            }
          }
        }

        // Import participating organisations if available
        let participatingOrgsImported = 0;
        if (activityDbId && activity.participatingOrgs?.length > 0) {
          for (const org of activity.participatingOrgs) {
            try {
              // Try to match existing organization by ref
              let organizationId: string | null = null;
              if (importRules.autoMatchOrganizations && org.ref) {
                const matchedOrgId = await getOrCreateOrganization(supabase, {
                  ref: org.ref,
                  name: org.name || 'Unknown',
                  type: org.type,
                });
                organizationId = matchedOrgId;
              }

              const participatingOrgData = {
                activity_id: activityDbId,
                organization_id: organizationId,
                role_type: mapIatiRoleToRoleType(org.role), // Map IATI role code to role_type
                iati_role_code: org.role ? Number(org.role) : null,
                iati_org_ref: org.ref || null,
                org_type: org.type || null,
                narrative: org.name || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { error: poError } = await supabase
                .from('activity_participating_organizations')
                .insert(participatingOrgData);

              if (poError) {
                console.error(`[Bulk Import] Participating org insert error for ${iatiId}:`, poError.message, poError.details);
              } else {
                participatingOrgsImported++;
              }
            } catch (poErr) {
              console.error(`[Bulk Import] Participating org error for ${iatiId}:`, poErr);
            }
          }
        }

        // Import sectors if available
        let sectorsImported = 0;
        if (activityDbId && activity.sectors?.length > 0) {
          // Only import DAC sectors (vocabulary 1 or 2, or unspecified)
          const dacSectors = activity.sectors.filter((s: any) =>
            !s.vocabulary || s.vocabulary === '1' || s.vocabulary === '2'
          );

          // Calculate percentages if not provided (equal distribution)
          const totalPct = dacSectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0);
          const needsDistribution = totalPct === 0 && dacSectors.length > 0;
          const equalPct = needsDistribution ? Math.round(100 / dacSectors.length * 100) / 100 : 0;

          for (const sector of dacSectors) {
            try {
              const sectorCode = String(sector.code);
              const categoryCode = sectorCode.substring(0, 3);
              const percentage = sector.percentage ?? equalPct;

              const sectorData = {
                activity_id: activityDbId,
                sector_code: sectorCode,
                sector_name: sector.name || `Sector ${sectorCode}`,
                percentage: percentage,
                level: sectorCode.length === 5 ? 'subsector' : 'category',
                category_code: categoryCode,
                category_name: sector.name ? sector.name.split(' - ')[0] : null, // Extract category from "Category - Subsector" format
                type: 'secondary',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { error: sectorError } = await supabase
                .from('activity_sectors')
                .insert(sectorData);

              if (sectorError) {
                console.error(`[Bulk Import] Sector insert error for ${iatiId}:`, sectorError.message, sectorError.details);
              } else {
                sectorsImported++;
              }
            } catch (sectorErr) {
              console.error(`[Bulk Import] Sector error for ${iatiId}:`, sectorErr);
            }
          }
        }

        // Import locations if available
        let locationsImported = 0;
        if (activityDbId && activity.locations?.length > 0) {
          for (const loc of activity.locations) {
            try {
              if (!loc.coordinates?.latitude || !loc.coordinates?.longitude) continue;

              const locationData = {
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
              };

              const { error: locError } = await supabase
                .from('activity_locations')
                .insert(locationData);

              if (locError) {
                console.error(`[Bulk Import] Location insert error for ${iatiId}:`, locError.message, locError.details);
              } else {
                locationsImported++;
              }
            } catch (locErr) {
              console.error(`[Bulk Import] Location error for ${iatiId}:`, locErr);
            }
          }
        }

        console.log(`[Bulk Import] ${iatiId}: ${transactionsImported} txns, ${budgetsImported} budgets, ${participatingOrgsImported} orgs, ${sectorsImported} sectors, ${locationsImported} locations`);

        // Update batch item to completed
        await supabase
          .from('iati_import_batch_items')
          .update({
            action,
            status: 'completed',
            activity_id: activityDbId,
            transactions_imported: transactionsImported,
          })
          .eq('batch_id', batchId)
          .eq('iati_identifier', iatiId);
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

    return NextResponse.json({
      batchId,
      status: failedCount === selectedActivities.length ? 'failed' : 'completed',
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      totalActivities: selectedActivities.length,
    });
  } catch (error) {
    console.error('[Bulk Import] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk import failed' },
      { status: 500 }
    );
  }
}
