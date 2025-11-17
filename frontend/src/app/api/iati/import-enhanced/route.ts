import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';
import { getOrCreateOrganization } from '@/lib/organization-helpers';

interface ImportData {
  activities: any[];
  transactions: any[];
  fixes?: {
    currencyFixes: Record<number, string>;
    activityMappings: Record<string, string>;
    codeMappings: Record<string, Record<string, string>>;
    organizationFixes: Record<number, { provider?: string; receiver?: string }>;
    skipTransactions: number[];
  };
  orphanResolutions?: {
    resolved: Record<number, string>;
    skipped: number[];
  };
  codeMappings?: Record<string, Record<string, string>>;
  organizationAssignments?: Record<number, {
    provider_org_id?: string;
    receiver_org_id?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Get import data
    const data: ImportData & { organizationId?: string } = await request.json();
    const { activities, transactions, fixes, orphanResolutions, codeMappings, organizationAssignments, organizationId } = data as any;
    // Load org preferences if org is provided
    let orgPrefs: any | null = null;
    if (organizationId) {
      const { data: org } = await getSupabaseAdmin()
        .from('organizations')
        .select('iati_import_preferences')
        .eq('id', organizationId)
        .single();
      orgPrefs = org?.iati_import_preferences || null;
    }
    const isAllowed = (fieldId: string) => {
      if (!orgPrefs || !orgPrefs.fields) return true;
      const val = orgPrefs.fields[fieldId];
      return val !== false;
    };
    
    // Get code mappings from either location
    const effectiveCodeMappings = codeMappings || fixes?.codeMappings || {};

    console.log('[IATI Import Enhanced] Starting import:', {
      activities: activities.length,
      transactions: transactions.length,
      hasFixes: !!fixes,
      hasCodeMappings: !!effectiveCodeMappings && Object.keys(effectiveCodeMappings).length > 0,
      hasOrgAssignments: !!organizationAssignments && Object.keys(organizationAssignments).length > 0
    });

    const results = {
      activitiesCreated: 0,
      activitiesUpdated: 0,
      transactionsCreated: 0,
      transactionsUpdated: 0,
      transactionsSkipped: 0,
      errors: [] as string[],
      warnings: [] as string[],
      activityIdMap: {} as Record<string, string>,
      orphanTransactions: [] as { index: number; activityRef: string; transaction: any }[]
    };

    // Step 1: Import/Update Activities
    for (const activity of activities) {
      try {
        // Get the IATI ID from either field name
        const iatiId = activity.iati_id || activity.iatiIdentifier;
        
        if (!iatiId) {
          results.errors.push(`Activity missing IATI identifier: ${activity.title}`);
          continue;
        }
        
        // Log the activity being processed
        console.log('[IATI Import Enhanced] Processing activity:', {
          iati_id: iatiId,
          title: activity.title
        });

        // Check if activity exists
        const { data: existingActivity } = await getSupabaseAdmin()
          .from('activities')
          .select('id')
          .eq('iati_id', iatiId)
          .single();

        if (existingActivity) {
          // Update existing activity
          const { error } = await getSupabaseAdmin()
            .from('activities')
            .update({
              ...(isAllowed('iati-activity/title') && activity.title ? { title: activity.title } : {}),
              ...(isAllowed('iati-activity/description') && activity.description ? { description: activity.description } : {}),
              activity_status: activity.activity_status,
              ...(isAllowed('iati-activity/activity-date[@type=start-planned]') && activity.planned_start_date ? { planned_start_date: activity.planned_start_date } : {}),
              ...(isAllowed('iati-activity/activity-date[@type=end-planned]') && activity.planned_end_date ? { planned_end_date: activity.planned_end_date } : {}),
              actual_start_date: activity.actual_start_date,
              actual_end_date: activity.actual_end_date,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingActivity.id);

          if (error) throw error;
          results.activitiesUpdated++;
          results.activityIdMap[iatiId] = existingActivity.id;
        } else {
          // Create new activity
          const { data: newActivity, error } = await getSupabaseAdmin()
            .from('activities')
            .insert({
              iati_id: iatiId,
              title: isAllowed('iati-activity/title') ? activity.title : null,
              description: isAllowed('iati-activity/description') ? activity.description : null,
              activity_status: activity.activity_status || 'draft',
              planned_start_date: isAllowed('iati-activity/activity-date[@type=start-planned]') ? activity.planned_start_date : null,
              planned_end_date: isAllowed('iati-activity/activity-date[@type=end-planned]') ? activity.planned_end_date : null,
              actual_start_date: activity.actual_start_date,
              actual_end_date: activity.actual_end_date,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (error) throw error;
          results.activitiesCreated++;
          results.activityIdMap[iatiId] = newActivity.id;
        }
      } catch (error) {
        console.error('[IATI Import Enhanced] Activity error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const activityIdentifier = activity.iati_id || activity.iatiIdentifier || 'unknown';
        results.errors.push(`Failed to import activity ${activityIdentifier}: ${errorMessage}`);
      }
    }

    // Step 1b: Import financing terms (CRS-add data)
    for (const activity of activities) {
      try {
        const iatiId = activity.iati_id || activity.iatiIdentifier;
        const activityDbId = results.activityIdMap[iatiId];
        
        if (!activityDbId || !activity.financingTerms) {
          continue;
        }

        const financingTerms = activity.financingTerms;

        // Insert or update loan terms
        if (financingTerms.loanTerms) {
          const { error: loanTermsError } = await getSupabaseAdmin()
            .from('activity_financing_terms')
            .upsert({
              activity_id: activityDbId,
              rate_1: financingTerms.loanTerms.rate_1,
              rate_2: financingTerms.loanTerms.rate_2,
              repayment_type_code: financingTerms.loanTerms.repayment_type_code,
              repayment_plan_code: financingTerms.loanTerms.repayment_plan_code,
              commitment_date: financingTerms.loanTerms.commitment_date,
              repayment_first_date: financingTerms.loanTerms.repayment_first_date,
              repayment_final_date: financingTerms.loanTerms.repayment_final_date,
              other_flags: financingTerms.other_flags || [],
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'activity_id'
            });

          if (loanTermsError) {
            console.error('[IATI Import Enhanced] Loan terms error:', loanTermsError);
          }
        }

        // Insert loan status entries
        if (financingTerms.loanStatuses && financingTerms.loanStatuses.length > 0) {
          for (const loanStatus of financingTerms.loanStatuses) {
            const { error: loanStatusError } = await getSupabaseAdmin()
              .from('activity_loan_status')
              .upsert({
                activity_id: activityDbId,
                year: loanStatus.year,
                currency: loanStatus.currency,
                value_date: loanStatus.value_date,
                interest_received: loanStatus.interest_received,
                principal_outstanding: loanStatus.principal_outstanding,
                principal_arrears: loanStatus.principal_arrears,
                interest_arrears: loanStatus.interest_arrears,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'activity_id,year'
              });

            if (loanStatusError) {
              console.error('[IATI Import Enhanced] Loan status error:', loanStatusError);
            }
          }
        }
      } catch (error) {
        console.error('[IATI Import Enhanced] Financing terms error:', error);
      }
    }

    // Step 2: Handle activity mappings from fixes
    if (fixes?.activityMappings) {
      for (const [iatiId, action] of Object.entries(fixes.activityMappings)) {
        if (action === 'create_new') {
          // Create minimal activity
          try {
            const { data: newActivity, error } = await getSupabaseAdmin()
              .from('activities')
              .insert({
                iati_id: iatiId,
                title: `[Auto-created] ${iatiId}`,
                description: 'Activity created during IATI import',
                activity_status: 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select('id')
              .single();

            if (error) throw error;
            results.activitiesCreated++;
            results.activityIdMap[iatiId] = newActivity.id;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`Failed to create activity ${iatiId}: ${errorMessage}`);
          }
        } else {
          // Map to existing activity
          results.activityIdMap[iatiId] = action;
        }
      }
    }

    // Step 3: Import Transactions with fixes applied
    for (let i = 0; i < transactions.length; i++) {
      // Skip if marked for skipping
      if (fixes?.skipTransactions?.includes(i)) {
        results.warnings.push(`Skipped transaction #${i + 1} as requested`);
        continue;
      }

      const transaction = transactions[i];
      
      try {
        // Apply fixes
        const currency = fixes?.currencyFixes?.[i] || transaction.currency || 'USD';
        const providerOrgName = fixes?.organizationFixes?.[i]?.provider || transaction.provider_org_name || transaction.providerOrg;
        const receiverOrgName = fixes?.organizationFixes?.[i]?.receiver || transaction.receiver_org_name || transaction.receiverOrg;
        
        // Apply code mappings
        let transactionType = transaction.transaction_type || transaction.type;
        if (effectiveCodeMappings?.transaction_type?.[transactionType]) {
          transactionType = effectiveCodeMappings.transaction_type[transactionType];
        }
        
        let flowType = transaction.flow_type || transaction.flowType;
        if (effectiveCodeMappings?.flow_type?.[flowType]) {
          flowType = effectiveCodeMappings.flow_type[flowType];
        }
        
        let financeType = transaction.finance_type || transaction.financeType;
        if (effectiveCodeMappings?.finance_type?.[financeType]) {
          financeType = effectiveCodeMappings.finance_type[financeType];
        }
        
        let aidType = transaction.aid_type || transaction.aidType;
        if (effectiveCodeMappings?.aid_type?.[aidType]) {
          aidType = effectiveCodeMappings.aid_type[aidType];
        }
        
        let tiedStatus = transaction.tied_status || transaction.tiedStatus;
        if (effectiveCodeMappings?.tied_status?.[tiedStatus]) {
          tiedStatus = effectiveCodeMappings.tied_status[tiedStatus];
        }
        
        let disbursementChannel = transaction.disbursement_channel || transaction.disbursementChannel;
        if (effectiveCodeMappings?.disbursement_channel?.[disbursementChannel]) {
          disbursementChannel = effectiveCodeMappings.disbursement_channel[disbursementChannel];
        }
        
        let sectorCode = transaction.sector_code || transaction.sectorCode;
        if (effectiveCodeMappings?.sector_code?.[sectorCode]) {
          sectorCode = effectiveCodeMappings.sector_code[sectorCode];
        }
        
        // Get activity UUID - prioritize manual assignment, then check for new- prefix, then activityRef mapping
        let activityId = transaction.activity_id;
        
        // If activity_id starts with new-, resolve it from the created activities
        if (activityId && activityId.startsWith('new-')) {
          const iatiId = activityId.replace('new-', '');
          activityId = results.activityIdMap[iatiId];
          if (!activityId) {
            // This shouldn't happen if activities were created successfully
            results.errors.push(`Failed to resolve new activity reference: ${iatiId}`);
            continue;
          }
        }
        
        // If no activity_id yet, try to find it from activityRef
        if (!activityId && transaction.activityRef) {
          activityId = results.activityIdMap[transaction.activityRef];
        }
        
        // Check if this transaction was resolved through orphan resolutions
        if (!activityId && orphanResolutions?.resolved[i]) {
          activityId = orphanResolutions.resolved[i];
        }
        
        // Check if this transaction was marked to skip
        if (orphanResolutions?.skipped.includes(i)) {
          results.warnings.push(`Transaction #${i + 1} skipped by user`);
          results.transactionsSkipped++;
          continue;
        }
        
        if (!activityId) {
          // Check if this activity is supposed to be created in this batch
          const isInCurrentBatch = activities.some(a => a.iati_id === transaction.activityRef);
          
          if (isInCurrentBatch) {
            // Activity should have been created - this is an actual error
            results.errors.push(`Failed to create activity for transaction reference: ${transaction.activityRef}`);
          } else {
            // Activity is truly missing - track as orphan
            results.orphanTransactions.push({
              index: i,
              activityRef: transaction.activityRef,
              transaction: transaction
            });
            results.warnings.push(`Transaction #${i + 1} references missing activity: ${transaction.activityRef}`);
            results.transactionsSkipped++;
          }
          continue;
        }

        // Apply organization assignments from UI if provided, or create/find organizations
        let providerOrgId = null;
        let receiverOrgId = null;
        
        if (organizationAssignments && organizationAssignments[i]) {
          const orgAssignment = organizationAssignments[i];
          if (orgAssignment.provider_org_id) {
            providerOrgId = orgAssignment.provider_org_id;
          }
          if (orgAssignment.receiver_org_id) {
            receiverOrgId = orgAssignment.receiver_org_id;
          }
        }
        
        // If no assignment from UI, try to resolve/create provider organization
        if (!providerOrgId) {
          const providerOrgRef = transaction.provider_org_ref || transaction.providerOrgRef;
          const providerOrgType = transaction.provider_org_type || transaction.providerOrgType;
          
          if (providerOrgRef || providerOrgName) {
            providerOrgId = await getOrCreateOrganization(getSupabaseAdmin(), {
              ref: providerOrgRef,
              name: providerOrgName,
              type: providerOrgType
            });
          }
        }

        // If no assignment from UI, try to resolve/create receiver organization
        if (!receiverOrgId) {
          const receiverOrgRef = transaction.receiver_org_ref || transaction.receiverOrgRef;
          const receiverOrgType = transaction.receiver_org_type || transaction.receiverOrgType;
          
          if (receiverOrgRef || receiverOrgName) {
            receiverOrgId = await getOrCreateOrganization(getSupabaseAdmin(), {
              ref: receiverOrgRef,
              name: receiverOrgName,
              type: receiverOrgType
            });
          }
        }

        // Validate organization IDs
        const organizationId = providerOrgId || receiverOrgId;
        if (!organizationId) {
          console.warn('[IATI Import Enhanced] No organization ID found or created for transaction:', {
            providerOrgName,
            receiverOrgName,
            providerOrgRef: transaction.provider_org_ref,
            receiverOrgRef: transaction.receiver_org_ref
          });
          results.errors.push(`Transaction #${i + 1}: Missing organization. Provide either ref or name. Provider: ${providerOrgName || 'none'}, Receiver: ${receiverOrgName || 'none'}`);
          continue; // Skip this transaction
        }

        // Check if finance type, flow type, aid type, or tied status should be inherited from activity defaults
        let effectiveFinanceType = financeType;
        let financeTypeInherited = false;
        let effectiveFlowType = flowType;
        let flowTypeInherited = false;
        let effectiveAidType = aidType;
        let aidTypeInherited = false;
        let effectiveTiedStatus = tiedStatus;
        let tiedStatusInherited = false;

        // Only fetch activity defaults if any of the fields are missing
        if (!financeType || !flowType || !aidType || !tiedStatus) {
          // Fetch activity's default values
          const { data: activityData } = await getSupabaseAdmin()
            .from('activities')
            .select('default_finance_type, default_flow_type, default_aid_type, default_tied_status')
            .eq('id', activityId)
            .single();

          // Inherit finance type if missing
          if (!financeType && activityData?.default_finance_type) {
            effectiveFinanceType = activityData.default_finance_type;
            financeTypeInherited = true;
            console.log(`[IATI Import Enhanced] Finance type inherited from activity default: ${effectiveFinanceType}`);
          }

          // Inherit flow type if missing
          if (!flowType && activityData?.default_flow_type) {
            effectiveFlowType = activityData.default_flow_type;
            flowTypeInherited = true;
            console.log(`[IATI Import Enhanced] Flow type inherited from activity default: ${effectiveFlowType}`);
          }

          // Inherit aid type if missing
          if (!aidType && activityData?.default_aid_type) {
            effectiveAidType = activityData.default_aid_type;
            aidTypeInherited = true;
            console.log(`[IATI Import Enhanced] Aid type inherited from activity default: ${effectiveAidType}`);
          }

          // Inherit tied status if missing
          if (!tiedStatus && activityData?.default_tied_status) {
            effectiveTiedStatus = activityData.default_tied_status;
            tiedStatusInherited = true;
            console.log(`[IATI Import Enhanced] Tied status inherited from activity default: ${effectiveTiedStatus}`);
          }
        }

        // Prepare transaction data - only include fields that exist in the database
        const transactionData = {
          activity_id: activityId,
          organization_id: organizationId, // Use whichever organization ID we have
          transaction_type: transactionType,
          transaction_date: transaction.transaction_date || transaction.date,
          value: parseFloat(transaction.value),
          currency: currency,
          status: transaction.status || 'actual',
          value_date: transaction.value_date,
          description: isAllowed('iati-activity/transaction') ? transaction.description : null,
          // Provider organization fields
          provider_org_id: providerOrgId,
          provider_org_ref: transaction.provider_org_ref || transaction.providerOrgRef,
          provider_org_name: providerOrgName,
          // Receiver organization fields
          receiver_org_id: receiverOrgId,
          receiver_org_ref: transaction.receiver_org_ref || transaction.receiverOrgRef,
          receiver_org_name: receiverOrgName,
          // IATI reference fields
          activity_iati_ref: transaction.activityRef,
          // Classification fields - use effective values (inherited from activity defaults if transaction doesn't specify)
          flow_type: effectiveFlowType,
          finance_type: effectiveFinanceType,
          finance_type_inherited: financeTypeInherited,
          aid_type: effectiveAidType,
          tied_status: effectiveTiedStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
          // Note: Fields like disbursement_channel, sector_code, etc. 
          // are not included as they don't exist in the current database schema
        };

        // Convert to USD following the same pattern as budgets and planned disbursements
        console.log(`[IATI Import Enhanced] Converting transaction to USD: ${transactionData.value} ${transactionData.currency}`);
        const usdResult = await convertTransactionToUSD(
          transactionData.value,
          transactionData.currency,
          transactionData.value_date || transactionData.transaction_date
        );

        if (usdResult.success) {
          console.log(`[IATI Import Enhanced] USD conversion successful: ${transactionData.value} ${transactionData.currency} = $${usdResult.value_usd} USD`);
        } else {
          console.warn(`[IATI Import Enhanced] USD conversion failed: ${usdResult.error}`);
        }

        // Add USD fields to transaction data
        const transactionDataWithUSD = addUSDFieldsToTransaction(transactionData, usdResult);

        // Insert transaction directly into the table
        const { data: insertedTransaction, error } = await getSupabaseAdmin()
          .from('transactions')
          .insert(transactionDataWithUSD)
          .select()
          .single();

        if (error) {
          console.error('[IATI Import Enhanced] Transaction insert error:', error);
          results.errors.push(`Failed to import transaction: ${error.message}`);
        } else {
          results.transactionsCreated++;
        }
      } catch (error) {
        console.error('[IATI Import Enhanced] Transaction error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to import transaction #${i + 1}: ${errorMessage}`);
      }
    }

    const duration = Date.now() - startTime;

    // Add summary of orphan transactions if any
    if (results.orphanTransactions.length > 0) {
      const uniqueActivities = new Set(results.orphanTransactions.map(o => o.activityRef));
      results.warnings.push(
        `${results.orphanTransactions.length} transaction(s) reference ${uniqueActivities.size} missing activity(ies). ` +
        `These transactions were skipped but the rest of the import succeeded.`
      );
    }

    console.log('[IATI Import Enhanced] Import completed:', {
      ...results,
      duration
    });

    // Success if we imported something, even with warnings
    const hasImportedData = results.activitiesCreated > 0 || results.activitiesUpdated > 0 || 
                           results.transactionsCreated > 0 || results.transactionsUpdated > 0;
    const success = results.errors.length === 0 && hasImportedData;

    return NextResponse.json({
      success,
      ...results,
      duration
    });

  } catch (error) {
    console.error('[IATI Import Enhanced] Fatal error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
      activitiesCreated: 0,
      activitiesUpdated: 0,
      transactionsCreated: 0,
      transactionsUpdated: 0,
      errors: [error instanceof Error ? error.message : 'Import failed'],
      warnings: [],
      duration: 0
    }, { status: 500 });
  }
} 