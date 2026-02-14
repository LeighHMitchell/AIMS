import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';
import { resolveCurrency, resolveValueDate } from '@/lib/currency-helpers';
import { getOrCreateOrganization } from '@/lib/organization-helpers';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    
    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] GET /api/activities/[id]/transactions - Fetching for activity:', activityId);
    
    // Get query parameters for linked transactions
    const { searchParams } = new URL(request.url);
    const includeLinked = searchParams.get('includeLinked') !== 'false'; // Default to true
    
    // Fetch activity defaults for inherited field calculations
    const { data: activityData, error: activityError } = await supabase
      .from('activities')
      .select('default_finance_type, default_aid_type, default_flow_type, default_tied_status')
      .eq('id', activityId)
      .single();
    
    if (activityError) {
      console.error('[AIMS] Error fetching activity defaults:', activityError);
      // Continue without defaults - will just show empty for inherited fields
    }
    
    const activityDefaults = activityData || {};
    
    // Fetch own transactions
    const { data: ownTransactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        provider_organization:organizations!provider_org_id (
          id,
          name,
          acronym,
          logo,
          type
        ),
        receiver_organization:organizations!receiver_org_id (
          id,
          name,
          acronym,
          logo,
          type
        ),
        provider_activity:activities!provider_activity_uuid (
          id,
          title_narrative,
          acronym,
          iati_identifier
        ),
        receiver_activity:activities!receiver_activity_uuid (
          id,
          title_narrative,
          acronym,
          iati_identifier
        )
      `)
      .eq('activity_id', activityId)
      .order('transaction_date', { ascending: false });
      
    if (error) {
      console.error('[AIMS] Error fetching own transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }

    // Transform own transactions with source classification and computed inherited fields
    let allTransactions = (ownTransactions || []).map((t: any) => ({
      ...t,
      transaction_source: 'own' as const,
      // Map organization type from joined data if not already present
      provider_org_type: t.provider_org_type || t.provider_organization?.type,
      receiver_org_type: t.receiver_org_type || t.receiver_organization?.type,
      // Add effective values (transaction value or inherited from activity default)
      effective_finance_type: t.finance_type || activityDefaults.default_finance_type || null,
      effective_aid_type: t.aid_type || activityDefaults.default_aid_type || null,
      effective_flow_type: t.flow_type || activityDefaults.default_flow_type || null,
      effective_tied_status: t.tied_status || activityDefaults.default_tied_status || null,
      // Add inherited flags (true if value comes from activity default, not transaction)
      finance_type_inherited: !t.finance_type && !!activityDefaults.default_finance_type,
      aid_type_inherited: !t.aid_type && !!activityDefaults.default_aid_type,
      flow_type_inherited: !t.flow_type && !!activityDefaults.default_flow_type,
      tied_status_inherited: !t.tied_status && !!activityDefaults.default_tied_status,
    }));

    // Fetch linked transactions if requested
    if (includeLinked) {
      try {
        // Get linked activities (both directions)
        const { data: relatedActivities, error: relatedError } = await supabase
          .from('related_activities')
          .select('linked_activity_id, source_activity_id')
          .or(`source_activity_id.eq.${activityId},linked_activity_id.eq.${activityId}`);
        
        if (relatedError) {
          console.error('[AIMS] Error fetching related activities:', relatedError);
        } else if (relatedActivities && relatedActivities.length > 0) {
          // Extract linked activity IDs
          const linkedActivityIds = new Set<string>();
          relatedActivities.forEach((ra: any) => {
            if (ra.source_activity_id === activityId && ra.linked_activity_id) {
              linkedActivityIds.add(ra.linked_activity_id);
            } else if (ra.linked_activity_id === activityId && ra.source_activity_id) {
              linkedActivityIds.add(ra.source_activity_id);
            }
          });

          if (linkedActivityIds.size > 0) {
            // Fetch transactions from linked activities (including activity defaults for inheritance)
            const { data: linkedTransactions, error: linkedError } = await supabase
              .from('transactions')
              .select(`
                *,
                activity:activities!activity_id (
                  id,
                  title_narrative,
                  iati_identifier,
                  default_finance_type,
                  default_aid_type,
                  default_flow_type,
                  default_tied_status
                ),
                provider_organization:organizations!provider_org_id (
                  id,
                  name,
                  acronym,
                  logo,
                  type
                ),
                receiver_organization:organizations!receiver_org_id (
                  id,
                  name,
                  acronym,
                  logo,
                  type
                ),
                provider_activity:activities!provider_activity_uuid (
                  id,
                  title_narrative,
                  acronym,
                  iati_identifier
                ),
                receiver_activity:activities!receiver_activity_uuid (
                  id,
                  title_narrative,
                  acronym,
                  iati_identifier
                )
              `)
              .in('activity_id', Array.from(linkedActivityIds))
              .neq('activity_id', activityId) // Exclude current activity
              .order('transaction_date', { ascending: false });

            if (linkedError) {
              console.error('[AIMS] Error fetching linked transactions:', linkedError);
            } else if (linkedTransactions) {
              // Add linked transactions with proper classification and inherited fields
              const formattedLinkedTransactions = linkedTransactions.map((t: any) => ({
                ...t,
                transaction_source: 'linked' as const,
                linked_from_activity_id: t.activity_id,
                linked_from_activity_title: t.activity?.title_narrative,
                linked_from_activity_iati_id: t.activity?.iati_identifier,
                acceptance_status: t.acceptance_status || 'pending' as const,
                // Map organization type from joined data if not already present
                provider_org_type: t.provider_org_type || t.provider_organization?.type,
                receiver_org_type: t.receiver_org_type || t.receiver_organization?.type,
                // Add effective values (transaction value or inherited from linked activity's defaults)
                effective_finance_type: t.finance_type || t.activity?.default_finance_type || null,
                effective_aid_type: t.aid_type || t.activity?.default_aid_type || null,
                effective_flow_type: t.flow_type || t.activity?.default_flow_type || null,
                effective_tied_status: t.tied_status || t.activity?.default_tied_status || null,
                // Add inherited flags (true if value comes from activity default, not transaction)
                finance_type_inherited: !t.finance_type && !!t.activity?.default_finance_type,
                aid_type_inherited: !t.aid_type && !!t.activity?.default_aid_type,
                flow_type_inherited: !t.flow_type && !!t.activity?.default_flow_type,
                tied_status_inherited: !t.tied_status && !!t.activity?.default_tied_status,
              }));
              
              allTransactions = [...allTransactions, ...formattedLinkedTransactions];
            }
          }
        }
      } catch (linkedError) {
        console.error('[AIMS] Error processing linked transactions:', linkedError);
        // Continue with just own transactions
      }
    }

    const transactions = allTransactions;

    // Fetch sector lines and aid type lines for all transactions
    const transactionIds = transactions.map((t: any) => t.uuid).filter(Boolean);

    let sectorLinesMap: Record<string, any[]> = {};
    let aidTypeLinesMap: Record<string, any[]> = {};

    if (transactionIds.length > 0) {
      // Fetch sector lines
      const { data: sectorLines } = await supabase
        .from('transaction_sector_lines')
        .select('transaction_id, sector_code, sector_vocabulary, sector_name, percentage')
        .in('transaction_id', transactionIds)
        .is('deleted_at', null);

      if (sectorLines) {
        sectorLines.forEach((sl: any) => {
          if (!sectorLinesMap[sl.transaction_id]) {
            sectorLinesMap[sl.transaction_id] = [];
          }
          sectorLinesMap[sl.transaction_id].push({
            code: sl.sector_code,
            vocabulary: sl.sector_vocabulary,
            narrative: sl.sector_name,
            percentage: sl.percentage
          });
        });
      }

      // Fetch aid type lines
      const { data: aidTypeLines } = await supabase
        .from('transaction_aid_type_lines')
        .select('transaction_id, aid_type_code, aid_type_vocabulary')
        .in('transaction_id', transactionIds)
        .is('deleted_at', null);

      if (aidTypeLines) {
        aidTypeLines.forEach((atl: any) => {
          if (!aidTypeLinesMap[atl.transaction_id]) {
            aidTypeLinesMap[atl.transaction_id] = [];
          }
          aidTypeLinesMap[atl.transaction_id].push({
            code: atl.aid_type_code,
            vocabulary: atl.aid_type_vocabulary
          });
        });
      }
    }

    // Map uuid to id for frontend compatibility and ensure all required fields
    const transformedTransactions = (transactions || []).map((t: any) => ({
      ...t,
      id: t.uuid || t.id, // UI components expect 'id' field
      uuid: t.uuid || t.id, // But also provide 'uuid' for filtering
      organization_id: t.provider_org_id || t.receiver_org_id,
      // Include organization logos
      provider_org_logo: t.provider_organization?.logo,
      receiver_org_logo: t.receiver_organization?.logo,
      // Update org names to use joined data if available
      provider_org_name: t.provider_organization?.acronym || t.provider_organization?.name || t.provider_org_name,
      receiver_org_name: t.receiver_organization?.acronym || t.receiver_organization?.name || t.receiver_org_name,
      // Include sector lines and aid type lines
      sectors: sectorLinesMap[t.uuid] || [],
      aid_types: aidTypeLinesMap[t.uuid] || [],
    }));
    
    console.log(`[AIMS] Successfully fetched ${transformedTransactions.length} transactions for activity ${activityId}`);

    return NextResponse.json(transformedTransactions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    const body = await request.json();
    
    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] POST /api/activities/[id]/transactions - Creating transaction for activity:', activityId);

    // Check/create provider organization if name is provided (ref is optional)
    let providerOrgId = body.provider_org_id || null;
    if (!providerOrgId && body.provider_org_name) {
      providerOrgId = await getOrCreateOrganization(supabase, {
        ref: body.provider_org_ref,
        name: body.provider_org_name,
        type: body.provider_org_type
      });
    }

    // Check/create receiver organization if name is provided (ref is optional)
    let receiverOrgId = body.receiver_org_id || null;
    if (!receiverOrgId && body.receiver_org_name) {
      receiverOrgId = await getOrCreateOrganization(supabase, {
        ref: body.receiver_org_ref,
        name: body.receiver_org_name,
        type: body.receiver_org_type
      });
    }

    // Resolve currency using helper (checks activity → org → USD)
    const resolvedCurrency = await resolveCurrency(
      body.currency,
      activityId,
      providerOrgId || body.provider_org_id
    );
    
    // Normalize empty string dates to null (PostgreSQL DATE columns don't accept empty strings)
    const normalizedTransactionDate = body.transaction_date && body.transaction_date.trim() !== '' 
      ? body.transaction_date 
      : null;
    const normalizedValueDate = body.value_date && body.value_date.trim() !== '' 
      ? body.value_date 
      : null;
    
    // Resolve value_date (use provided or fallback to transaction_date)
    const resolvedValueDate = resolveValueDate(
      normalizedValueDate,
      normalizedTransactionDate || ''
    );
    
    // Prepare transaction data
    const transactionData = {
      activity_id: activityId,
      transaction_type: body.transaction_type,
      transaction_date: normalizedTransactionDate,
      value: parseFloat(body.value) || 0,
      currency: resolvedCurrency,
      status: body.status || 'draft',
      description: body.description || null,
      
      // Value date handling - only store if different from transaction_date
      // Also handle case where both are null/empty
      value_date: resolvedValueDate && resolvedValueDate !== normalizedTransactionDate 
        ? resolvedValueDate
        : null,
      
      // Transaction reference
      transaction_reference: body.transaction_reference?.trim() || null,
      
      // Provider organization fields
      provider_org_id: providerOrgId,
      provider_org_ref: body.provider_org_ref || null,
      provider_org_name: body.provider_org_name || null,
      provider_org_type: body.provider_org_type || null,
      provider_org_activity_id: body.provider_org_activity_id || null,
      provider_activity_uuid: body.provider_activity_uuid || null,

      // Receiver organization fields
      receiver_org_id: receiverOrgId,
      receiver_org_ref: body.receiver_org_ref || null,
      receiver_org_name: body.receiver_org_name || null,
      receiver_org_type: body.receiver_org_type || null,
      receiver_org_activity_id: body.receiver_org_activity_id || null,
      receiver_activity_uuid: body.receiver_activity_uuid || null,
      
      // Inferred flags - false if user explicitly provided org, true otherwise (system inferred)
      // When inferred=true, UI displays org name in gray; when false (explicit), displays in black
      provider_org_inferred: !providerOrgId && !body.provider_org_name,
      receiver_org_inferred: !receiverOrgId && !body.receiver_org_name,
      
      // IATI classification fields
      aid_type: body.aid_type || null,
      aid_type_vocabulary: body.aid_type_vocabulary || null,
      finance_type: body.finance_type || null,
      finance_type_vocabulary: body.finance_type_vocabulary || null,
      flow_type: body.flow_type || null,
      flow_type_vocabulary: body.flow_type_vocabulary || null,
      tied_status: body.tied_status || null,
      disbursement_channel: body.disbursement_channel || null,
      disbursement_channel_vocabulary: body.disbursement_channel_vocabulary || null,
      
      // IATI humanitarian flag
      humanitarian: body.humanitarian || false,
      
      // Additional IATI fields
      sector_code: body.sector_code || null,
      sector_vocabulary: body.sector_vocabulary || null,
      recipient_country_code: body.recipient_country_code || null,
      recipient_region_code: body.recipient_region_code || null,
      recipient_region_vocab: body.recipient_region_vocab || body.recipient_region_vocabulary || null,
      
      // Metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Convert to USD following the same pattern as budgets and planned disbursements
    console.log(`[AIMS] Converting transaction to USD: ${transactionData.value} ${transactionData.currency} (resolved from ${body.currency || 'missing'})`);
    const usdResult = await convertTransactionToUSD(
      transactionData.value,
      transactionData.currency,
      resolvedValueDate
    );

    if (usdResult.success) {
      console.log(`[AIMS] USD conversion successful: ${transactionData.value} ${transactionData.currency} = $${usdResult.value_usd} USD`);
    } else {
      console.warn(`[AIMS] USD conversion failed: ${usdResult.error}`);
    }

    // Add USD fields to transaction data
    const transactionDataWithUSD = addUSDFieldsToTransaction(transactionData, usdResult);
    
    // Insert the transaction
    const { data: insertedTransaction, error } = await supabase
      .from('transactions')
      .insert(transactionDataWithUSD)
      .select(`
        *,
        provider_org:provider_org_id(
          id,
          name,
          type,
          iati_org_id,
          acronym
        ),
        receiver_org:receiver_org_id(
          id,
          name,
          type,  
          iati_org_id,
          acronym
        )
      `)
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating transaction:', error);
      return NextResponse.json(
        { error: 'Failed to create transaction', details: error.message },
        { status: 400 }
      );
    }
    
    // Transform the response - use acronyms when available
    const transformedTransaction = {
      ...insertedTransaction,
      id: insertedTransaction.uuid || insertedTransaction.id,
      uuid: insertedTransaction.uuid || insertedTransaction.id,
      provider_org_ref: insertedTransaction.provider_org?.iati_org_id || insertedTransaction.provider_org_ref,
      receiver_org_ref: insertedTransaction.receiver_org?.iati_org_id || insertedTransaction.receiver_org_ref,
      provider_org_name: insertedTransaction.provider_org?.acronym || insertedTransaction.provider_org?.name || insertedTransaction.provider_org_name,
      receiver_org_name: insertedTransaction.receiver_org?.acronym || insertedTransaction.receiver_org?.name || insertedTransaction.receiver_org_name,
    };
    
    console.log('[AIMS] Successfully created transaction with ID:', transformedTransaction.uuid);

    return NextResponse.json(transformedTransaction);
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
