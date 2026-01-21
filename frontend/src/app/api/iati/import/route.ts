import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { extractIatiMeta, IatiParseError } from '@/lib/iati/parseMeta';
import { iatiAnalytics } from '@/lib/analytics';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';
import { resolveCurrencySync, resolveValueDate } from '@/lib/currency-helpers';

export const dynamic = 'force-dynamic';

interface ImportRequest {
  activities: Array<{
    iatiIdentifier: string;
    title: string;
    description: string;
    status: string;
    startDate?: string;
    endDate?: string;
    recipientCountry?: string;
    sectors: string[];
    participatingOrgs: Array<{
      ref: string;
      name: string;
      role: string;
      type?: string;
    }>;
    matched?: boolean;
    existingId?: string;
  }>;
  organizations: Array<{
    ref: string;
    name: string;
    type: string;
    country?: string;
    matched?: boolean;
    existingId?: string;
    acronym?: string;
  }>;
  transactions: Array<{
    type: string;
    date: string;
    value: number;
    currency: string;
    description?: string;
    providerOrg?: string;
    receiverOrg?: string;
    activityRef: string;
    aidType?: string;
    tiedStatus?: string;
    flowType?: string;
    financeType?: string;
    disbursementChannel?: string;
    // Additional IATI fields
    transactionReference?: string;
    valueDate?: string;
    providerOrgRef?: string;
    providerOrgType?: string;
    providerOrgName?: string;
    receiverOrgRef?: string;
    receiverOrgType?: string;
    receiverOrgName?: string;
    sectorCode?: string;
    sectorVocabulary?: string;
    recipientCountryCode?: string;
    recipientRegionCode?: string;
    recipientRegionVocab?: string;
    isHumanitarian?: boolean;
  }>;
}

// Helper function to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    // Handle Supabase errors
    if ('message' in error) {
      return String(error.message);
    }
    if ('details' in error) {
      return String(error.details);
    }
  }
  return String(error);
}

export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    // Branch: JSON body import (used by URL import tool and stepwise imports)
    if (contentType.includes('application/json')) {
      try {
        const data: ImportRequest & { organizationId?: string } = await request.json();
        const { activities, organizations, transactions, organizationId } = data as any;

        console.log('[IATI Import] JSON import detected:', {
          activities: activities?.length || 0,
          organizations: organizations?.length || 0,
          transactions: transactions?.length || 0
        });

        const results = {
          organizationsCreated: 0,
          organizationsUpdated: 0,
          activitiesCreated: 0,
          activitiesUpdated: 0,
          transactionsCreated: 0,
          errors: [] as string[]
        };

        // Import organizations first (if provided)
        if (Array.isArray(organizations) && organizations.length > 0) {
          // Map IATI organization type codes to database type values
          const iatiToDbTypeMapping: Record<string, string> = {
            '10': 'government',
            '11': 'government',
            '15': 'government',
            '21': 'ngo',
            '22': 'ngo',
            '23': 'ngo',
            '24': 'ngo',
            '30': 'private',
            '40': 'multilateral',
            '60': 'foundation',
            '70': 'private',
            '71': 'private',
            '72': 'private',
            '73': 'private',
            '80': 'academic',
            '90': 'other'
          };

          for (const org of organizations) {
            try {
              const dbType = iatiToDbTypeMapping[(org as any).type];

              if ((org as any).matched && (org as any).existingId) {
                const updateData: any = {
                  name: (org as any).name,
                  country: (org as any).country,
                  iati_org_id: (org as any).ref,
                  acronym: (org as any).acronym,
                  updated_at: new Date().toISOString()
                };
                if (dbType) updateData.type = dbType;

                const { data: updateResult, error } = await supabase
                  .from('organizations')
                  .update(updateData)
                  .eq('id', (org as any).existingId)
                  .select();

                if (error) throw error;
                if (!updateResult || updateResult.length === 0) {
                  throw new Error(`No rows updated for organization ID ${(org as any).existingId}`);
                }
                results.organizationsUpdated++;
              } else {
                const insertData: any = {
                  name: (org as any).name,
                  type: dbType || null,
                  country: (org as any).country || 'MM',
                  iati_org_id: (org as any).ref,
                  acronym: (org as any).acronym
                };
                const { error } = await supabase
                  .from('organizations')
                  .insert(insertData)
                  .select()
                  .single();
                if (error) throw error;
                results.organizationsCreated++;
              }
            } catch (error) {
              const errorMsg = getErrorMessage(error);
              results.errors.push(`Failed to import organization ${(org as any).name}: ${errorMsg}`);
            }
          }
        }

        // Fetch orgs to map for activities and transactions
        const { data: allOrgs } = await supabase
          .from('organizations')
          .select('id, iati_org_id, name');
        const orgMap = new Map((allOrgs || []).map((o: any) => [o.iati_org_id || o.name, o.id]));

        // Load org import preferences (if provided) and build helpers
        let orgPrefs: any | null = null;
        if (organizationId) {
          const { data: org } = await supabase
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

        // Import activities (if provided)
        const activityIdMap = new Map<string, string>();
        if (Array.isArray(activities) && activities.length > 0) {
          for (const activity of activities) {
            try {
              const implementingOrg = (activity as any).participatingOrgs?.find((o: any) => o.role === '4');
              const fundingOrg = (activity as any).participatingOrgs?.find((o: any) => o.role === '1');
              const partnerId = implementingOrg ? (orgMap.get(implementingOrg.ref) || orgMap.get(implementingOrg.name)) : (fundingOrg ? (orgMap.get(fundingOrg.ref) || orgMap.get(fundingOrg.name)) : null);

              const activityData: any = {
                title: isAllowed('iati-activity/title') ? (activity as any).title : null,
                description: isAllowed('iati-activity/description') ? (activity as any).description : null,
                iati_id: (activity as any).iatiIdentifier,
                activity_status: (activity as any).status === 'Implementation' ? 'active' : (activity as any).status === 'Completion' ? 'completed' : (activity as any).status === 'Cancelled' ? 'cancelled' : 'planned',
                planned_start_date: isAllowed('iati-activity/activity-date[@type=start-planned]') ? (activity as any).startDate : null,
                planned_end_date: isAllowed('iati-activity/activity-date[@type=end-planned]') ? (activity as any).endDate : null,
                partner_id: partnerId,
                updated_at: new Date().toISOString()
              };

              let activityId: string;
              if ((activity as any).matched && (activity as any).existingId) {
                const { data: updateResult, error } = await supabase
                  .from('activities')
                  .update({
                    // Do not overwrite existing data on update per preference (2b)
                    // Only set fields that are allowed and non-null
                    ...(activityData.title !== null ? { title: activityData.title } : {}),
                    ...(activityData.description !== null ? { description: activityData.description } : {}),
                    activity_status: activityData.activity_status,
                    ...(activityData.planned_start_date !== null ? { planned_start_date: activityData.planned_start_date } : {}),
                    ...(activityData.planned_end_date !== null ? { planned_end_date: activityData.planned_end_date } : {}),
                    partner_id: activityData.partner_id,
                    updated_at: activityData.updated_at
                  })
                  .eq('id', (activity as any).existingId)
                  .select();
                if (error) throw error;
                if (!updateResult || updateResult.length === 0) {
                  throw new Error(`No rows updated for activity ID ${(activity as any).existingId}`);
                }
                activityId = (activity as any).existingId;
                results.activitiesUpdated++;
              } else {
                activityData.publication_status = 'draft';
                activityData.submission_status = 'not_submitted';
                const { data: newActivity, error } = await supabase
                  .from('activities')
                  .insert(activityData)
                  .select()
                  .single();
                if (error) throw error;
                activityId = newActivity.id;
                results.activitiesCreated++;
              }
              activityIdMap.set((activity as any).iatiIdentifier, activityId);

              // Link participating orgs
              for (const participatingOrg of (activity as any).participatingOrgs || []) {
                const orgId = orgMap.get(participatingOrg.ref) || orgMap.get(participatingOrg.name);
                if (orgId && orgId !== partnerId) {
                  await supabase
                    .from('activity_contributors')
                    .upsert({
                      activity_id: activityId,
                      organization_id: orgId,
                      contribution_type: participatingOrg.role === '1' ? 'funder' : 'partner'
                    }, { onConflict: 'activity_id,organization_id' });
                }
              }
            } catch (error) {
              const errorMsg = getErrorMessage(error);
              results.errors.push(`Failed to import activity ${(activity as any).title}: ${errorMsg}`);
            }
          }
        }

        // Import transactions (if provided)
        if (Array.isArray(transactions) && transactions.length > 0) {
          // Map IATI transaction type codes (IATI Standard v2.03)
          const iatiTypeToDbType: Record<string, string> = {
            'Incoming Funds': '1',
            'Outgoing Commitment': '2',
            'Disbursement': '3',
            'Expenditure': '4',
            'Interest Payment': '5',
            'Interest Repayment': '5', // Legacy alias
            'Loan Repayment': '6',
            'Reimbursement': '7',
            'Purchase of Equity': '8',
            'Sale of Equity': '9',
            'Credit Guarantee': '10',
            'Incoming Commitment': '11',
            'Outgoing Pledge': '12',
            'Incoming Pledge': '13',
            'Commitment Cancellation': '13', // Legacy alias
            '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10', '11': '11', '12': '12', '13': '13'
          };

          for (const transaction of transactions) {
            try {
              const dbTransactionType = iatiTypeToDbType[(transaction as any).type] || '4';

              // Resolve activity id
              let activityId = activityIdMap.get((transaction as any).activityRef);
              if (!activityId) {
                const { data: existingActivity } = await supabase
                  .from('activities')
                  .select('id')
                  .eq('iati_id', (transaction as any).activityRef)
                  .single();
                activityId = existingActivity?.id;
              }
              if (!activityId) {
                // Create minimal activity if truly missing
                const minimalActivity = {
                  title: `[Auto-created] ${(transaction as any).activityRef}`,
                  description: 'Auto-created for imported transaction',
                  iati_id: (transaction as any).activityRef,
                  activity_status: 'active',
                  publication_status: 'draft',
                  submission_status: 'not_submitted',
                  planned_start_date: (transaction as any).date || new Date().toISOString().split('T')[0],
                  planned_end_date: new Date().toISOString().split('T')[0]
                };
                const { data: newActivity, error } = await supabase
                  .from('activities')
                  .insert(minimalActivity)
                  .select()
                  .single();
                if (error) throw error;
                activityId = newActivity.id;
                results.activitiesCreated++;
              }

              // Resolve org ids by name or ref if available
              const providerOrgId = (transaction as any).providerOrg ? (orgMap.get((transaction as any).providerOrg) || null) : null;
              const receiverOrgId = (transaction as any).receiverOrg ? (orgMap.get((transaction as any).receiverOrg) || null) : null;

              // Fetch activity default_currency for proper currency resolution
              let activityDefaultCurrency: string | null = null;
              try {
                const { data: activityData } = await supabase
                  .from('activities')
                  .select('default_currency')
                  .eq('id', activityId)
                  .single();
                activityDefaultCurrency = activityData?.default_currency || null;
              } catch (err) {
                console.warn('[IATI Import] Could not fetch activity default_currency:', err);
              }

              // Resolve currency: transaction.currency → activity.default_currency → USD
              const resolvedCurrency = resolveCurrencySync(
                (transaction as any).currency,
                activityDefaultCurrency
              );

              // Resolve value_date: provided → transaction_date
              const transactionDate = (transaction as any).date || new Date().toISOString().split('T')[0];
              const resolvedValueDate = resolveValueDate(
                (transaction as any).valueDate,
                transactionDate
              );

              const transactionData: any = {
                activity_id: activityId,
                transaction_type: dbTransactionType,
                transaction_date: transactionDate,
                value: (transaction as any).value,
                currency: resolvedCurrency,
                status: 'actual',
                transaction_reference: isAllowed('iati-activity/transaction') ? ((transaction as any).transactionReference || null) : null,
                value_date: resolvedValueDate !== transactionDate ? resolvedValueDate : null,
                description: isAllowed('iati-activity/transaction') ? ((transaction as any).description || null) : null,
                provider_org_id: providerOrgId,
                provider_org_type: (transaction as any).providerOrgType || null,
                provider_org_ref: (transaction as any).providerOrgRef || (transaction as any).providerOrg || null,
                provider_org_name: (transaction as any).providerOrgName || (transaction as any).providerOrg || null,
                receiver_org_id: receiverOrgId,
                receiver_org_type: (transaction as any).receiverOrgType || null,
                receiver_org_ref: (transaction as any).receiverOrgRef || (transaction as any).receiverOrg || null,
                receiver_org_name: (transaction as any).receiverOrgName || (transaction as any).receiverOrg || null,
                disbursement_channel: isAllowed('iati-activity/transaction') ? ((transaction as any).disbursementChannel || null) : null,
                flow_type: isAllowed('iati-activity/transaction') ? ((transaction as any).flowType || null) : null,
                finance_type: isAllowed('iati-activity/transaction') ? ((transaction as any).financeType || null) : null,
                aid_type: isAllowed('iati-activity/transaction') ? ((transaction as any).aidType || null) : null,
                tied_status: isAllowed('iati-activity/transaction') ? ((transaction as any).tiedStatus || null) : null,
                sector_code: isAllowed('iati-activity/transaction') ? ((transaction as any).sectorCode || null) : null,
                sector_vocabulary: isAllowed('iati-activity/transaction') ? ((transaction as any).sectorVocabulary || null) : null,
                recipient_country_code: isAllowed('iati-activity/transaction') ? ((transaction as any).recipientCountryCode || null) : null,
                recipient_region_code: isAllowed('iati-activity/transaction') ? ((transaction as any).recipientRegionCode || null) : null,
                recipient_region_vocab: isAllowed('iati-activity/transaction') ? ((transaction as any).recipientRegionVocab || null) : null,
                is_humanitarian: (transaction as any).isHumanitarian || false
              };

              if (!transactionData.transaction_type || transactionData.value === undefined || transactionData.value === null) {
                throw new Error(`Missing required fields: type=${transactionData.transaction_type}, value=${transactionData.value}`);
              }

              // Convert to USD following the same pattern as budgets and planned disbursements
              console.log(`[IATI Import] Converting transaction to USD: ${transactionData.value} ${transactionData.currency} (resolved from ${(transaction as any).currency || 'missing'})`);
              const usdResult = await convertTransactionToUSD(
                transactionData.value,
                transactionData.currency,
                resolvedValueDate
              );

              if (usdResult.success) {
                console.log(`[IATI Import] USD conversion successful: ${transactionData.value} ${transactionData.currency} = $${usdResult.value_usd} USD`);
              } else {
                console.warn(`[IATI Import] USD conversion failed: ${usdResult.error}`);
              }

              // Add USD fields to transaction data and insert directly (replacing RPC call)
              const transactionDataWithUSD = addUSDFieldsToTransaction(transactionData, usdResult);
              
              const { error } = await supabase
                .from('transactions')
                .insert(transactionDataWithUSD);
              if (error) throw error;
              results.transactionsCreated++;
            } catch (error) {
              const errorMsg = getErrorMessage(error);
              results.errors.push(`Failed to import transaction: ${errorMsg}`);
            }
          }
        }

        return NextResponse.json({ success: results.errors.length === 0, results });
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        return NextResponse.json(
          { error: 'Failed to import IATI data', details: errorMsg },
          { status: 500 }
        );
      }
    }

    // Default branch: multipart upload (external publisher detection flow)
    console.log('[IATI Import] Starting external publisher detection import process');

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' }, 
        { status: 401 }
      );
    }

    console.log('[IATI Import] Processing file:', file.name, 'Size:', file.size);

    // Extract metadata from XML
    let meta;
    try {
      meta = await extractIatiMeta(file);
      iatiAnalytics.parsed(file.size, file.name);
      console.log('[IATI Import] Parsed meta:', meta);
    } catch (error) {
      console.error('[IATI Import] Parse error:', error);
      
      if (error instanceof IatiParseError) {
        iatiAnalytics.importFailed(error.message, 'parse');
        return NextResponse.json(
          { 
            error: 'Parse failed',
            message: error.message,
            code: error.code
          }, 
          { status: 400 }
        );
      }
      
      iatiAnalytics.importFailed('Unknown parse error', 'parse');
      return NextResponse.json(
        { error: 'Failed to parse XML file' }, 
        { status: 400 }
      );
    }

    // Get user's publisher references
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('publisher_refs, org_name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[IATI Import] User lookup error:', userError);
      return NextResponse.json(
        { error: 'Failed to lookup user profile' }, 
        { status: 500 }
      );
    }

    const userPublisherRefs: string[] = userData?.publisher_refs || [];
    const userOrgName = userData?.org_name || 'Your Organisation';

    console.log('[IATI Import] User refs:', userPublisherRefs, 'Activity ref:', meta.reportingOrgRef);

    // Check if reporting org matches user's publisher refs
    const isOwnedActivity = userPublisherRefs.includes(meta.reportingOrgRef);

    if (isOwnedActivity) {
      // Short-circuit: create as owned activity
      console.log('[IATI Import] Creating as owned activity');
      
      try {
        const { data: activity, error: createError } = await supabase
          .from('activities')
          .insert({
            iati_identifier: meta.iatiId,
            reporting_org_ref: meta.reportingOrgRef,
            reporting_org_name: meta.reportingOrgName,
            title_narrative: meta.reportingOrgName || meta.reportingOrgRef,
            source_origin: 'owned',
            include_in_totals: true,
            edit_lock: false,
            created_by: userId,
            updated_by: userId
          })
          .select('id')
          .single();

        if (createError) {
          console.error('[IATI Import] Create error:', createError);
          iatiAnalytics.importFailed(createError.message, 'create_owned');
          return NextResponse.json(
            { error: 'Failed to create activity' }, 
            { status: 500 }
          );
        }

        iatiAnalytics.importCompleted('reference', activity.id);
        
        return NextResponse.json({
          status: 'owned',
          createdId: activity.id,
          meta
        });

      } catch (error) {
        console.error('[IATI Import] Unexpected create error:', error);
        iatiAnalytics.importFailed('Unexpected error', 'create_owned');
        return NextResponse.json(
          { error: 'Failed to create activity' }, 
          { status: 500 }
        );
      }
    }

    // External publisher detected
    iatiAnalytics.externalDetected(meta.reportingOrgRef, userPublisherRefs);

    // Check for existing activity with same IATI ID
    const { data: existingActivity } = await supabase
      .from('activities')
      .select('id, iati_identifier, reporting_org_ref')
      .eq('iati_identifier', meta.iatiId)
      .eq('created_by', userId)
      .single();

    return NextResponse.json({
      status: 'external',
      meta,
      userOrgName,
      userPublisherRefs,
      existingActivity: existingActivity ? {
        id: existingActivity.id,
        iatiId: existingActivity.iati_identifier,
        reportingOrgRef: existingActivity.reporting_org_ref
      } : null
    });

  } catch (error) {
    console.error('[IATI Import] Unexpected error:', error);
    iatiAnalytics.importFailed('Unexpected server error', 'server');
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/*
// Legacy POST handler for bulk import (backward compatibility) - REMOVED FOR SECURITY
export async function POST_LEGACY(request: NextRequest) {
  try {
    const data: ImportRequest = await request.json();
    const { activities, organizations, transactions } = data;
    
    console.log('[IATI Import] Importing:', {
      activities: activities.length,
      organizations: organizations.length,
      transactions: transactions.length
    });
    
    // Debug transaction data
    if (transactions.length > 0) {
      console.log('[IATI Import] Transaction overview:');
      console.log('[IATI Import] - First transaction:', JSON.stringify(transactions[0], null, 2));
      console.log('[IATI Import] - Unique activityRefs:', Array.from(new Set(transactions.map(t => t.activityRef))));
      console.log('[IATI Import] - Activity identifiers:', activities.map(a => a.iatiIdentifier));
    }

    const results = {
      organizationsCreated: 0,
      organizationsUpdated: 0,
      activitiesCreated: 0,
      activitiesUpdated: 0,
      transactionsCreated: 0,
      errors: [] as string[]
    };

    // Map IATI organization type codes to database type values
    const iatiToDbTypeMapping: Record<string, string> = {
      '10': 'government',       // Government
      '11': 'government',       // Local Government
      '15': 'government',       // Other Public Sector
      '21': 'ngo',             // International NGO
      '22': 'ngo',             // National NGO
      '23': 'ngo',             // Regional NGO
      '24': 'ngo',             // Partner Country based NGO
      '30': 'private',         // Public Private Partnership
      '40': 'multilateral',    // Multilateral
      '60': 'foundation',      // Foundation
      '70': 'private',         // Private Sector (unspecified)
      '71': 'private',         // Private Sector in Provider Country
      '72': 'private',         // Private Sector in Aid Recipient Country
      '73': 'private',         // Private Sector in Third Country
      '80': 'academic',        // Academic, Training and Research
      '90': 'other'           // Other
    };

    console.log('[IATI Import] Using IATI to DB type mapping');

    // Import organizations first
    for (const org of organizations) {
      try {
        // Map IATI type code to database type value
        const dbType = iatiToDbTypeMapping[org.type];
        if (!dbType) {
          console.warn(`[IATI Import] Unknown organization type: ${org.type} for ${org.name}`);
        }

        if (org.matched && org.existingId) {
          // Update existing organization
          const updateData: any = {
            name: org.name,
            country: org.country,
            iati_org_id: org.ref,
            acronym: org.acronym,
            updated_at: new Date().toISOString()
          };
          
          // Only update type if we have a valid mapping
          if (dbType) {
            updateData.type = dbType;
          }

          const { data: updateResult, error } = await supabase
            .from('organizations')
            .update(updateData)
            .eq('id', org.existingId)
            .select();

          if (error) throw error;
          
          if (!updateResult || updateResult.length === 0) {
            throw new Error(`No rows updated for organization ID ${org.existingId}`);
          }
          
          console.log(`[IATI Import] Update result:`, updateResult);
          results.organizationsUpdated++;
          console.log(`[IATI Import] Updated organization: ${org.name}`);
        } else {
          // Create new organization
          const insertData: any = {
            name: org.name,
            type: dbType || null, // Use null if no valid type found
            country: org.country || 'MM', // Default to Myanmar
            iati_org_id: org.ref,
            acronym: org.acronym
          };

          const { data: newOrg, error } = await supabase
            .from('organizations')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;
          results.organizationsCreated++;
          console.log(`[IATI Import] Created organization: ${org.name} with ID: ${newOrg.id}`);
        }
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        console.error('[IATI Import] Error importing organization:', org.name, errorMsg);
        results.errors.push(`Failed to import organization ${org.name}: ${errorMsg}`);
      }
    }

    // Get organization mapping for activities
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, iati_org_id, name');
    
    const orgMap = new Map(
      (allOrgs || []).map((o: any) => [o.iati_org_id || o.name, o.id])
    );

    console.log('[IATI Import] Organization mapping for activities:', orgMap.size, 'organizations');

    // Import activities
    for (const activity of activities) {
      try {
        // Find implementing organization (role 4) or funding organization (role 1)
        const implementingOrg = activity.participatingOrgs.find(o => o.role === '4');
        const fundingOrg = activity.participatingOrgs.find(o => o.role === '1');
        
        // Use partner_id field (which seems to be the correct field name based on schema)
        const partnerId = implementingOrg ? 
          (orgMap.get(implementingOrg.ref) || orgMap.get(implementingOrg.name)) : 
          (fundingOrg ? (orgMap.get(fundingOrg.ref) || orgMap.get(fundingOrg.name)) : null);

        const activityData: any = {
          title: activity.title,
          description: activity.description,
          iati_id: activity.iatiIdentifier,
          // Map IATI status to database status
          activity_status: activity.status === 'Implementation' ? 'active' : 
                          activity.status === 'Completion' ? 'completed' : 
                          activity.status === 'Cancelled' ? 'cancelled' : 'planned',
          planned_start_date: activity.startDate,
          planned_end_date: activity.endDate,
          partner_id: partnerId, // Use partner_id instead of implementing_organization_id
          updated_at: new Date().toISOString()
        };

        let activityId: string;

        if (activity.matched && activity.existingId) {
          // Update existing activity
          console.log(`[IATI Import] Updating activity ${activity.existingId}: ${activity.title}`);
          
          const { data: updateResult, error } = await supabase
            .from('activities')
            .update(activityData)
            .eq('id', activity.existingId)
            .select();

          if (error) throw error;
          
          if (!updateResult || updateResult.length === 0) {
            throw new Error(`No rows updated for activity ID ${activity.existingId}`);
          }
          
          console.log(`[IATI Import] Activity update result:`, updateResult);
          activityId = activity.existingId;
          results.activitiesUpdated++;
          console.log(`[IATI Import] Updated activity: ${activity.title}`);
        } else {
          // Create new activity - add required fields for new activities
          activityData.publication_status = 'draft';
          activityData.submission_status = 'not_submitted';
          
          const { data: newActivity, error } = await supabase
            .from('activities')
            .insert(activityData)
            .select()
            .single();

          if (error) throw error;
          activityId = newActivity.id;
          results.activitiesCreated++;
          console.log(`[IATI Import] Created activity: ${activity.title} with ID: ${activityId}`);
        }

        // Link participating organizations
        for (const participatingOrg of activity.participatingOrgs) {
          const orgId = orgMap.get(participatingOrg.ref) || orgMap.get(participatingOrg.name);
          if (orgId && orgId !== partnerId) {
            const { error } = await supabase
              .from('activity_contributors')
              .upsert({
                activity_id: activityId,
                organization_id: orgId,
                contribution_type: participatingOrg.role === '1' ? 'funder' : 'partner'
              }, {
                onConflict: 'activity_id,organization_id'
              });
            
            if (error) {
              console.error('[IATI Import] Error linking organization:', getErrorMessage(error));
            }
          }
        }

        // Import transactions for this activity
        // Try both exact match and case-insensitive match
        let activityTransactions = transactions.filter(t => t.activityRef === activity.iatiIdentifier);
        
        // If no exact matches, try case-insensitive
        if (activityTransactions.length === 0) {
          const lowerIatiId = activity.iatiIdentifier.toLowerCase();
          activityTransactions = transactions.filter(t => 
            t.activityRef && t.activityRef.toLowerCase() === lowerIatiId
          );
          if (activityTransactions.length > 0) {
            console.log(`[IATI Import] Found transactions using case-insensitive match`);
          }
        }
        
        console.log(`[IATI Import] Activity ${activity.iatiIdentifier}:`);
        console.log(`[IATI Import] - Looking for transactions with activityRef = "${activity.iatiIdentifier}"`);
        console.log(`[IATI Import] - Found ${activityTransactions.length} matching transactions`);
        
        // Debug: Show all transaction activityRefs if no matches found
        if (activityTransactions.length === 0 && transactions.length > 0) {
          console.log(`[IATI Import] - No transactions found for this activity.`);
          console.log(`[IATI Import] - Available transaction activityRefs:`, 
            Array.from(new Set(transactions.map(t => t.activityRef))).slice(0, 5)
          );
        }
        
        for (const transaction of activityTransactions) {
          try {
            // Map IATI transaction type codes (IATI Standard v2.03)
            // IATI uses numeric codes: 1-13
            const iatiTypeToDbType: Record<string, string> = {
              // Text mappings from XML
              'Incoming Funds': '1',
              'Outgoing Commitment': '2',
              'Disbursement': '3',
              'Expenditure': '4',
              'Interest Payment': '5',
              'Interest Repayment': '5', // Legacy alias
              'Loan Repayment': '6',
              'Reimbursement': '7',
              'Purchase of Equity': '8',
              'Sale of Equity': '9',
              'Credit Guarantee': '10',
              'Incoming Commitment': '11',
              'Outgoing Pledge': '12',
              'Incoming Pledge': '13',
              'Commitment Cancellation': '13', // Legacy alias
              // Numeric mappings
              '1': '1',
              '2': '2',
              '3': '3',
              '4': '4',
              '5': '5',
              '6': '6',
              '7': '7',
              '8': '8',
              '9': '9',
              '10': '10',
              '11': '11',
              '12': '12',
              '13': '13'
            };

            const dbTransactionType = iatiTypeToDbType[transaction.type] || '4'; // Default to Expenditure

            // Find provider/receiver organization IDs if available
            const providerOrgId = transaction.providerOrg ? 
              (orgMap.get(transaction.providerOrg) || null) : null;
            const receiverOrgId = transaction.receiverOrg ? 
              (orgMap.get(transaction.receiverOrg) || null) : null;

            // The transactions table with IATI-compliant fields
            const transactionData: any = {
              // Core required fields
              activity_id: activityId,
              transaction_type: dbTransactionType,
              transaction_date: transaction.date || new Date().toISOString().split('T')[0],
              value: transaction.value,
              currency: transaction.currency || 'USD',
              status: 'actual', // IATI transactions are actual, not draft
              
              // Optional fields
              transaction_reference: transaction.transactionReference || null,
              value_date: transaction.valueDate || null,
              description: transaction.description || null,
              
              // Provider organization
              provider_org_id: providerOrgId,
              provider_org_type: transaction.providerOrgType || null,
              provider_org_ref: transaction.providerOrgRef || transaction.providerOrg || null,
              provider_org_name: transaction.providerOrgName || transaction.providerOrg || null,
              
              // Receiver organization  
              receiver_org_id: receiverOrgId,
              receiver_org_type: transaction.receiverOrgType || null,
              receiver_org_ref: transaction.receiverOrgRef || transaction.receiverOrg || null,
              receiver_org_name: transaction.receiverOrgName || transaction.receiverOrg || null,
              
              // IATI specific fields
              disbursement_channel: transaction.disbursementChannel || null,
              flow_type: transaction.flowType || null,
              finance_type: transaction.financeType || null,
              aid_type: transaction.aidType || null,
              tied_status: transaction.tiedStatus || null,
              
              // Sector & Geography
              sector_code: transaction.sectorCode || null,
              sector_vocabulary: transaction.sectorVocabulary || null,
              recipient_country_code: transaction.recipientCountryCode || null,
              recipient_region_code: transaction.recipientRegionCode || null,
              recipient_region_vocab: transaction.recipientRegionVocab || null,
              
              // Other
              is_humanitarian: transaction.isHumanitarian || false,
            };
            
            console.log(`[IATI Import] Inserting transaction:`, transactionData);
            
            // Before insert, verify we have required fields
            if (!transactionData.transaction_type || transactionData.value === undefined || transactionData.value === null) {
              throw new Error(`Missing required fields: type=${transactionData.transaction_type}, value=${transactionData.value}`);
            }
            
            // Use RPC function to bypass schema cache
            const { data: insertResult, error } = await supabase
              .rpc('insert_iati_transaction', {
                p_activity_id: transactionData.activity_id,
                p_transaction_type: transactionData.transaction_type,
                p_transaction_date: transactionData.transaction_date,
                p_value: transactionData.value,
                p_currency: transactionData.currency,
                p_description: transactionData.description,
                p_disbursement_channel: transactionData.disbursement_channel,
                p_flow_type: transactionData.flow_type,
                p_finance_type: transactionData.finance_type,
                p_aid_type: transactionData.aid_type,
                p_tied_status: transactionData.tied_status,
                p_provider_org_name: transactionData.provider_org_name,
                p_receiver_org_name: transactionData.receiver_org_name
              });

            if (error) {
              console.error(`[IATI Import] Transaction insert error:`, error);
              console.error(`[IATI Import] Failed transaction data:`, transactionData);
              throw error;
            }
            
            if (!insertResult) {
              console.error(`[IATI Import] Transaction insert returned no data for:`, transactionData);
              throw new Error('Transaction insert returned no data');
            }
            
            console.log(`[IATI Import] Transaction insert successful, UUID:`, insertResult);
            results.transactionsCreated++;
            console.log(`[IATI Import] Created transaction: ${transaction.type} - ${transaction.value} ${transaction.currency}`);
          } catch (error) {
            const errorMsg = getErrorMessage(error);
            console.error('[IATI Import] Error importing transaction:', errorMsg);
            results.errors.push(`Failed to import transaction: ${errorMsg}`);
          }
        }
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        console.error('[IATI Import] Error importing activity:', activity.title, errorMsg);
        results.errors.push(`Failed to import activity ${activity.title}: ${errorMsg}`);
      }
    }

    // Handle orphan transactions (transactions without matching activities)
    console.log('[IATI Import] Checking for orphan transactions...');
    
    // Get all activity identifiers we just processed
    const processedActivityIds = new Set(activities.map(a => a.iatiIdentifier));
    const processedActivityIdsLower = new Set(activities.map(a => a.iatiIdentifier.toLowerCase()));
    
    // Find orphan transactions
    const orphanTransactions = transactions.filter(t => {
      const refLower = t.activityRef?.toLowerCase();
      return t.activityRef && 
             !processedActivityIds.has(t.activityRef) && 
             !processedActivityIdsLower.has(refLower);
    });
    
    // Group orphan transactions by activity reference
    const orphansByActivity = orphanTransactions.reduce((acc, t) => {
      if (!acc[t.activityRef]) {
        acc[t.activityRef] = [];
      }
      acc[t.activityRef].push(t);
      return acc;
    }, {} as Record<string, typeof transactions>);
    
    console.log(`[IATI Import] Found ${Object.keys(orphansByActivity).length} activities with orphan transactions`);
    
    // Create minimal activities for orphan transactions
    for (const [activityRef, orphanTrans] of Object.entries(orphansByActivity)) {
      try {
        console.log(`[IATI Import] Creating minimal activity for ${activityRef} with ${orphanTrans.length} transactions`);
        
        // Check if activity already exists in database
        const { data: existingActivity } = await supabase
          .from('activities')
          .select('id')
          .eq('iati_id', activityRef)
          .single();
        
        let activityId: string;
        
        if (existingActivity) {
          console.log(`[IATI Import] Activity ${activityRef} already exists in database`);
          activityId = existingActivity.id;
        } else {
          // Create minimal activity
          const minimalActivity = {
            title: `[Auto-created] ${activityRef}`,
            description: `This activity was automatically created to accommodate imported transactions. Please update with complete activity details.`,
            iati_id: activityRef,
            activity_status: 'active',
            publication_status: 'draft',
            submission_status: 'not_submitted',
            // Try to infer dates from transactions
            planned_start_date: orphanTrans
              .map(t => t.date)
              .filter(d => d)
              .sort()[0] || new Date().toISOString().split('T')[0],
            planned_end_date: new Date().toISOString().split('T')[0]
          };
          
          const { data: newActivity, error } = await supabase
            .from('activities')
            .insert(minimalActivity)
            .select()
            .single();
          
          if (error) {
            console.error(`[IATI Import] Error creating minimal activity for ${activityRef}:`, error);
            results.errors.push(`Failed to create activity for ${activityRef}: ${getErrorMessage(error)}`);
            continue;
          }
          
          activityId = newActivity.id;
          results.activitiesCreated++;
          console.log(`[IATI Import] Created minimal activity: ${activityRef} with ID: ${activityId}`);
        }
        
        // Now import the orphan transactions
        for (const transaction of orphanTrans) {
          try {
            // Map IATI transaction type codes (IATI Standard v2.03)
            const iatiTypeToDbType: Record<string, string> = {
              // Text mappings from XML
              'Incoming Funds': '1',
              'Outgoing Commitment': '2',
              'Disbursement': '3',
              'Expenditure': '4',
              'Interest Payment': '5',
              'Interest Repayment': '5', // Legacy alias
              'Loan Repayment': '6',
              'Reimbursement': '7',
              'Purchase of Equity': '8',
              'Sale of Equity': '9',
              'Credit Guarantee': '10',
              'Incoming Commitment': '11',
              'Outgoing Pledge': '12',
              'Incoming Pledge': '13',
              'Commitment Cancellation': '13', // Legacy alias
              // Numeric mappings
              '1': '1',
              '2': '2',
              '3': '3',
              '4': '4',
              '5': '5',
              '6': '6',
              '7': '7',
              '8': '8',
              '9': '9',
              '10': '10',
              '11': '11',
              '12': '12',
              '13': '13'
            };

            const dbTransactionType = iatiTypeToDbType[transaction.type] || '4'; // Default to Expenditure

            // Find provider/receiver organization IDs if available
            const providerOrgId = transaction.providerOrg ? 
              (orgMap.get(transaction.providerOrg) || null) : null;
            const receiverOrgId = transaction.receiverOrg ? 
              (orgMap.get(transaction.receiverOrg) || null) : null;

            const transactionData: any = {
              // Core required fields
              activity_id: activityId,
              transaction_type: dbTransactionType,
              transaction_date: transaction.date || new Date().toISOString().split('T')[0],
              value: transaction.value,
              currency: transaction.currency || 'USD',
              status: 'actual',
              
              // Optional fields
              transaction_reference: transaction.transactionReference || null,
              value_date: transaction.valueDate || null,
              description: transaction.description || null,
              
              // Provider organization
              provider_org_id: providerOrgId,
              provider_org_type: transaction.providerOrgType || null,
              provider_org_ref: transaction.providerOrgRef || transaction.providerOrg || null,
              provider_org_name: transaction.providerOrgName || transaction.providerOrg || null,
              
              // Receiver organization  
              receiver_org_id: receiverOrgId,
              receiver_org_type: transaction.receiverOrgType || null,
              receiver_org_ref: transaction.receiverOrgRef || transaction.receiverOrg || null,
              receiver_org_name: transaction.receiverOrgName || transaction.receiverOrg || null,
              
              // IATI specific fields
              disbursement_channel: transaction.disbursementChannel || null,
              flow_type: transaction.flowType || null,
              finance_type: transaction.financeType || null,
              aid_type: transaction.aidType || null,
              tied_status: transaction.tiedStatus || null,
              
              // Sector & Geography
              sector_code: transaction.sectorCode || null,
              sector_vocabulary: transaction.sectorVocabulary || null,
              recipient_country_code: transaction.recipientCountryCode || null,
              recipient_region_code: transaction.recipientRegionCode || null,
              recipient_region_vocab: transaction.recipientRegionVocab || null,
              
              // Other
              is_humanitarian: transaction.isHumanitarian || false,
            };
            
            console.log(`[IATI Import] Inserting orphan transaction:`, transactionData);
            
            // Use RPC function to bypass schema cache
            const { data: insertResult, error } = await supabase
              .rpc('insert_iati_transaction', {
                p_activity_id: transactionData.activity_id,
                p_transaction_type: transactionData.transaction_type,
                p_transaction_date: transactionData.transaction_date,
                p_value: transactionData.value,
                p_currency: transactionData.currency,
                p_description: transactionData.description,
                p_disbursement_channel: transactionData.disbursement_channel,
                p_flow_type: transactionData.flow_type,
                p_finance_type: transactionData.finance_type,
                p_aid_type: transactionData.aid_type,
                p_tied_status: transactionData.tied_status,
                p_provider_org_name: transactionData.provider_org_name,
                p_receiver_org_name: transactionData.receiver_org_name
              });

            if (error) {
              console.error(`[IATI Import] Orphan transaction insert error:`, error);
              throw error;
            }
            
            results.transactionsCreated++;
            console.log(`[IATI Import] Created orphan transaction: ${transaction.type} - ${transaction.value} ${transaction.currency}`);
          } catch (error) {
            const errorMsg = getErrorMessage(error);
            console.error('[IATI Import] Error importing orphan transaction:', errorMsg);
            results.errors.push(`Failed to import orphan transaction: ${errorMsg}`);
          }
        }
        
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        console.error('[IATI Import] Error processing orphan transactions for activity:', activityRef, errorMsg);
        results.errors.push(`Failed to process orphan transactions for ${activityRef}: ${errorMsg}`);
      }
    }

    console.log('[IATI Import] Import completed:', results);

    // Verify what was actually saved
    const verificationResults: any = {};
    
    try {
      const { count: orgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      verificationResults.totalOrganizations = orgCount;
      
      const { count: actCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true });
      verificationResults.totalActivities = actCount;
      
      const { count: transCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      verificationResults.totalTransactions = transCount;
      
      // Get transaction counts by type
      const { data: transactionsByType } = await supabase
        .from('transactions')
        .select('id, activity_id, transaction_type, provider_org, receiver_org, value, currency, transaction_date, description, created_at, updated_at, status, aid_type, tied_status, flow_type')
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (transactionsByType) {
        verificationResults.transactionsByType = transactionsByType;
      }
      
      // Verify a sample of recently created transactions
      if (results.transactionsCreated > 0) {
        const { data: recentTransactions } = await supabase
          .from('transactions')
          .select('id, transaction_type, value, currency, activity_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        verificationResults.recentTransactions = recentTransactions;
        console.log('[IATI Import] Recent transactions sample:', recentTransactions);
      }
      
      console.log('[IATI Import] Verification results:', verificationResults);
    } catch (verifyError) {
      console.error('[IATI Import] Verification error:', verifyError);
    }

    return NextResponse.json({
      success: true,
      results,
      verification: verificationResults
    });
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    console.error('[IATI Import] Import error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to import IATI data', details: errorMsg },
      { status: 500 }
    );
  }
}
*/