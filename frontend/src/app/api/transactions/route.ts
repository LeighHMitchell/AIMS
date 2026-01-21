import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { TransactionType } from '@/types/transaction';
import { createClient } from '@/lib/supabase-simple';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import {
  cleanTransactionFields,
  cleanEnumValue,
  cleanUUIDValue,
  cleanDateValue
} from '@/lib/transaction-field-cleaner';
import { inferAndApplyBudgetLines } from '@/lib/transaction-budget-inference';

export const dynamic = 'force-dynamic';

// Helper function to fetch linked transactions for all activities
async function fetchAllLinkedTransactions(activityIds: string[]) {
  if (activityIds.length === 0) return [];
  
  try {
    // Get all linked activities (both directions)
    const { data: relatedActivities, error: relatedError } = await supabase
      .from('related_activities')
      .select('linked_activity_id, source_activity_id')
      .or(activityIds.map(id => `source_activity_id.eq.${id},linked_activity_id.eq.${id}`).join(','));
    
    if (relatedError) {
      console.error('[AIMS] Error fetching related activities:', relatedError);
      return [];
    }

    // Extract all linked activity IDs for each activity
    const linkedActivityMap = new Map<string, Set<string>>();
    
    relatedActivities?.forEach((ra: any) => {
      activityIds.forEach(activityId => {
        if (!linkedActivityMap.has(activityId)) {
          linkedActivityMap.set(activityId, new Set());
        }
        
        if (ra.source_activity_id === activityId && ra.linked_activity_id) {
          linkedActivityMap.get(activityId)!.add(ra.linked_activity_id);
        } else if (ra.linked_activity_id === activityId && ra.source_activity_id) {
          linkedActivityMap.get(activityId)!.add(ra.source_activity_id);
        }
      });
    });

    // Get all unique linked activity IDs
    const allLinkedActivityIds = new Set<string>();
    linkedActivityMap.forEach(linkedIds => {
      linkedIds.forEach(id => allLinkedActivityIds.add(id));
    });

    if (allLinkedActivityIds.size === 0) return [];

    // Fetch transactions from all linked activities
    const { data: linkedTransactions, error: transError } = await supabase
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
          default_tied_status,
          created_by_org_name,
          created_by_org_acronym
        ),
        provider_organization:organizations!provider_org_id (
          id,
          name,
          acronym,
          logo
        ),
        receiver_organization:organizations!receiver_org_id (
          id,
          name,
          acronym,
          logo
        )
      `)
      .in('activity_id', Array.from(allLinkedActivityIds))
      .not('activity_id', 'in', `(${activityIds.join(',')})`); // Exclude user's own activities

    if (transError) {
      console.error('[AIMS] Error fetching linked transactions:', transError);
      return [];
    }

    // Add transaction source, linked activity info, and computed inherited fields
    return linkedTransactions?.map((t: any) => ({
      ...t,
      transaction_source: 'linked' as const,
      linked_from_activity_id: t.activity_id,
      linked_from_activity_title: t.activity?.title_narrative,
      linked_from_activity_iati_id: t.activity?.iati_identifier,
      acceptance_status: 'pending' as const,
      // Add effective values (transaction value or inherited from activity default)
      effective_finance_type: t.finance_type || t.activity?.default_finance_type || null,
      effective_aid_type: t.aid_type || t.activity?.default_aid_type || null,
      effective_flow_type: t.flow_type || t.activity?.default_flow_type || null,
      effective_tied_status: t.tied_status || t.activity?.default_tied_status || null,
      // Add inherited flags (true if value comes from activity default, not transaction)
      finance_type_inherited: !t.finance_type && !!t.activity?.default_finance_type,
      aid_type_inherited: !t.aid_type && !!t.activity?.default_aid_type,
      flow_type_inherited: !t.flow_type && !!t.activity?.default_flow_type,
      tied_status_inherited: !t.tied_status && !!t.activity?.default_tied_status,
    })) || [];

  } catch (error) {
    console.error('[AIMS] Error in fetchAllLinkedTransactions:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Sorting params
    const sortField = searchParams.get('sortField') || 'transaction_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Search query
    const search = searchParams.get('search') || '';
    
    // Filters - support both array (comma-separated) and single values for backwards compatibility
    const transactionTypes = searchParams.get('transactionTypes')?.split(',').filter(Boolean) || [];
    const transactionType = searchParams.get('transactionType'); // Legacy single value
    const flowType = searchParams.get('flowType');
    const financeTypes = searchParams.get('financeTypes')?.split(',').filter(Boolean) || [];
    const financeType = searchParams.get('financeType'); // Legacy single value
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
    const status = searchParams.get('status'); // Legacy single value
    const organizations = searchParams.get('organizations')?.split(',').filter(Boolean) || [];
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeLinked = searchParams.get('includeLinked') !== 'false'; // Default to true
    const transactionSource = searchParams.get('transactionSource') || 'all';
    
    // Find activity IDs matching the search term (for activity title search)
    let matchingActivityIds: string[] = [];
    if (search) {
      const { data: matchingActivities, error: activitySearchError } = await supabase
        .from('activities')
        .select('id')
        .ilike('title_narrative', `%${search}%`);
      
      if (activitySearchError) {
        console.error('[AIMS] Error searching activities:', activitySearchError);
      }
      
      matchingActivityIds = matchingActivities?.map(a => a.id) || [];
      console.log(`[AIMS] Search term: "${search}", found ${matchingActivityIds.length} matching activities:`, matchingActivityIds);
    }
    
    // Build the query
    let query = supabase
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
          default_tied_status,
          created_by_org_name,
          created_by_org_acronym
        ),
        provider_organization:organizations!provider_org_id (
          id,
          name,
          acronym,
          logo
        ),
        receiver_organization:organizations!receiver_org_id (
          id,
          name,
          acronym,
          logo
        )
      `, { count: 'exact' });
    
    // Apply filters - support both array and single value for backwards compatibility
    if (transactionTypes.length > 0) {
      query = query.in('transaction_type', transactionTypes);
    } else if (transactionType && transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }

    if (flowType && flowType !== 'all') {
      query = query.eq('flow_type', flowType);
    }

    if (financeTypes.length > 0) {
      query = query.in('finance_type', financeTypes);
    } else if (financeType && financeType !== 'all') {
      query = query.eq('finance_type', financeType);
    }

    if (statuses.length > 0) {
      query = query.in('status', statuses);
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Organization filter - filter by provider or receiver org
    if (organizations.length > 0) {
      query = query.or(`provider_org_id.in.(${organizations.join(',')}),receiver_org_id.in.(${organizations.join(',')})`);
    }
    
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }
    
    // Apply search - search org names, description, and activity title (via matching activity IDs)
    if (search) {
      if (matchingActivityIds.length > 0) {
        query = query.or(`provider_org_name.ilike.%${search}%,receiver_org_name.ilike.%${search}%,description.ilike.%${search}%,activity_id.in.(${matchingActivityIds.join(',')})`);
      } else {
        query = query.or(`provider_org_name.ilike.%${search}%,receiver_org_name.ilike.%${search}%,description.ilike.%${search}%`);
      }
    }
    
    // Apply sorting
    const orderOptions: any = { ascending: sortOrder === 'asc' };
    
    // Handle special sort fields
    if (sortField === 'activity_title') {
      // Sort by activity title through relation
      query = query.order('activity(title_narrative)', orderOptions);
    } else if (sortField === 'provider_org_name') {
      query = query.order('provider_org_name', orderOptions);
    } else if (sortField === 'receiver_org_name') {
      query = query.order('receiver_org_name', orderOptions);
    } else {
      query = query.order(sortField, orderOptions);
    }
    
    // Apply pagination at database level for own transactions
    // Only apply range if limit is not 9999 (show all)
    if (limit !== 9999) {
      query = query.range(offset, offset + limit - 1);
    }
    
    // Execute the main query to get own transactions
    const { data: ownTransactions, error, count: totalOwnCount } = await query;
    
    if (error) {
      console.error('[AIMS] Error fetching own transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`[AIMS] Query returned ${ownTransactions?.length || 0} own transactions (total count: ${totalOwnCount})`);
    if (search && ownTransactions?.length === 0) {
      console.log(`[AIMS] No results found for search: "${search}". Activity IDs searched: ${matchingActivityIds.length > 0 ? matchingActivityIds.join(', ') : 'none'}`);
    }

    // Transform own transactions with source classification and computed inherited fields
    let allTransactions = (ownTransactions || []).map((t: any) => ({
      ...t,
      transaction_source: 'own' as const,
      // Add effective values (transaction value or inherited from activity default)
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

    // Fetch linked transactions if requested
    // NOTE: For proper pagination, we should fetch linked transactions separately
    // For now, we only fetch linked transactions for activities in the current page to avoid pagination issues
    if (includeLinked) {
      // Get activity IDs from the current page's transactions only
      const userActivityIds = Array.from(new Set(
        (ownTransactions || []).map((t: any) => t.activity_id).filter(Boolean)
      ));
      
      if (userActivityIds.length > 0) {
        const linkedTransactions = await fetchAllLinkedTransactions(userActivityIds);
        // Apply transaction source filter to linked transactions if needed
        let filteredLinked = linkedTransactions;
        if (transactionSource !== 'all') {
          filteredLinked = linkedTransactions.filter(t => t.transaction_source === transactionSource);
        }
        // Add linked transactions after own transactions
        allTransactions = [...allTransactions, ...filteredLinked];
      }
    }

    // Apply transaction source filtering to own transactions
    if (transactionSource !== 'all') {
      allTransactions = allTransactions.filter(t => t.transaction_source === transactionSource);
    }

    // Calculate total count properly
    // Own transactions count is from the database query
    // For linked transactions, we need to count them separately for accurate pagination
    let linkedTransactionsCount = 0;
    if (includeLinked) {
      // Count linked transactions separately - this is an approximation
      // Ideally we'd query this from the database, but for now we count what we fetched
      linkedTransactionsCount = allTransactions.length - (ownTransactions?.length || 0);
    }
    
    const totalCombined = (totalOwnCount || 0) + linkedTransactionsCount;
    
    // IMPORTANT: Apply pagination to the combined results
    // Since own transactions are already paginated at DB level, and linked transactions are added,
    // we just need to ensure we don't exceed the limit per page
    let paginatedTransactions;
    if (limit === 9999) {
      // Show all - no pagination
      paginatedTransactions = allTransactions;
    } else {
      // Limit to the requested page size (own transactions are already limited by range,
      // but linked transactions might push us over, so we trim to exact limit)
      paginatedTransactions = allTransactions.slice(0, limit);
    }
    
    // Fetch sector lines and aid type lines for all transactions
    const transactionIds = paginatedTransactions.map((t: any) => t.uuid).filter(Boolean);

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

    // Transform the data for frontend compatibility
    const transformedTransactions = paginatedTransactions.map((t: any) => ({
      ...t,
      id: t.uuid || t.id,
      // Flatten organization names for easier access - use acronyms when available
      from_org: t.provider_organization?.acronym || t.provider_organization?.name || t.provider_org_name,
      to_org: t.receiver_organization?.acronym || t.receiver_organization?.name || t.receiver_org_name,
      // Keep the original fields as well - use acronyms when available
      provider_org_name: t.provider_organization?.acronym || t.provider_organization?.name || t.provider_org_name,
      receiver_org_name: t.receiver_organization?.acronym || t.receiver_organization?.name || t.receiver_org_name,
      // Keep full names for display if needed
      provider_org_full_name: t.provider_organization?.name || t.provider_org_name,
      receiver_org_full_name: t.receiver_organization?.name || t.receiver_org_name,
      // Include organization logos
      provider_org_logo: t.provider_organization?.logo,
      receiver_org_logo: t.receiver_organization?.logo,
      // Include sector lines and aid type lines
      sectors: sectorLinesMap[t.uuid] || [],
      aid_types: aidTypeLinesMap[t.uuid] || [],
    }));
    
    // Return paginated response
    const response = NextResponse.json({
      data: transformedTransactions,
      total: totalCombined,
      page,
      limit,
      totalPages: Math.ceil(totalCombined / limit),
      includeLinked,
      transactionSource
    });
    
    // Add no-cache headers to prevent Vercel CDN caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    
    return response;
    
  } catch (error) {
    console.error('[AIMS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions moved to @/lib/transaction-field-cleaner for consistency across all endpoints

// Helper function to validate IATI field values
async function validateIATIFields(body: any) {
  const supabase = createClient();
  const errors: string[] = [];
  
  if (!supabase) {
    return { isValid: false, errors: ['Failed to connect to database for validation'] };
  }

  // Get all reference values for validation
  const { data: referenceValues, error } = await supabase
    .rpc('get_iati_reference_values');

  if (error) {
    console.error('Error fetching IATI reference values for validation:', error);
    return { isValid: false, errors: ['Unable to validate IATI field values'] };
  }

  // Group reference values by field
  const validValues: { [key: string]: string[] } = {};
  referenceValues?.forEach((item: any) => {
    if (!validValues[item.field_name]) {
      validValues[item.field_name] = [];
    }
    validValues[item.field_name].push(item.code);
  });

  // Validate each IATI field
  const fieldsToValidate = [
    { field: 'transaction_type', value: body.transaction_type, required: true },
    { field: 'aid_type', value: body.aid_type, required: false },
    { field: 'flow_type', value: body.flow_type, required: false },
    { field: 'finance_type', value: body.finance_type, required: false },
    { field: 'disbursement_channel', value: body.disbursement_channel, required: false },
    { field: 'tied_status', value: body.tied_status, required: false },
    { field: 'organization_type', value: body.provider_org_type, required: false, fieldName: 'provider_org_type' },
    { field: 'organization_type', value: body.receiver_org_type, required: false, fieldName: 'receiver_org_type' }
  ];

  for (const { field, value, required, fieldName } of fieldsToValidate) {
    if (value) {
      const validCodes = validValues[field] || [];
      if (!validCodes.includes(value)) {
        const displayName = fieldName || field;
        errors.push(`Invalid ${displayName}: '${value}'. Valid values are: ${validCodes.slice(0, 10).join(', ')}${validCodes.length > 10 ? '...' : ''}`);
      }
    } else if (required) {
      const displayName = fieldName || field;
      errors.push(`${displayName} is required`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Helper function to perform automatic currency conversion
// Supports manual exchange rate override - if manualRate is provided, skip API call
interface CurrencyConversionOptions {
  transactionId: string;
  currency: string;
  value: number;
  valueDate: string;
  manualRate?: number | null;
  manualValueUsd?: number | null;
  isManual?: boolean;
}

async function performCurrencyConversion(
  transactionId: string, 
  currency: string, 
  value: number, 
  valueDate: string,
  manualRate?: number | null,
  manualValueUsd?: number | null,
  isManual?: boolean
) {
  try {
    console.log('[Transactions API] Starting currency conversion for transaction:', transactionId);
    
    // For USD transactions, still populate USD Value field
    if (currency === 'USD') {
      console.log('[Transactions API] Transaction is already in USD, updating USD fields...');
      
      // Update USD fields for USD transactions to ensure USD Value field is populated
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          value_usd: value,
          exchange_rate_used: 1.0,
          usd_conversion_date: new Date().toISOString(),
          usd_convertible: true,
          exchange_rate_manual: false
        })
        .eq('uuid', transactionId);

      if (updateError) {
        console.error('[Transactions API] Error updating USD transaction fields:', updateError);
      } else {
        console.log('[Transactions API] Successfully updated USD transaction fields');
      }
      return;
    }

    // If manual rate is provided, use it directly
    if (isManual && manualRate && manualValueUsd != null) {
      console.log('[Transactions API] Using manual exchange rate:', manualRate);
      
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          value_usd: manualValueUsd,
          exchange_rate_used: manualRate,
          usd_conversion_date: new Date().toISOString(),
          usd_convertible: true,
          exchange_rate_manual: true
        })
        .eq('uuid', transactionId);

      if (updateError) {
        console.error('[Transactions API] Error updating transaction with manual rate:', updateError);
      } else {
        console.log('[Transactions API] Successfully updated transaction with manual rate:', {
          transactionId,
          originalAmount: `${value} ${currency}`,
          usdAmount: `$${manualValueUsd}`,
          exchangeRate: manualRate,
          manual: true
        });
      }
      return;
    }

    // Convert to USD using the currency converter
    const conversionDate = new Date(valueDate);
    const result = await fixedCurrencyConverter.convertToUSD(value, currency, conversionDate);

    if (!result.success) {
      console.log('[Transactions API] Currency conversion failed, marking as unconvertible:', result.error);
      
      // Mark as unconvertible
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          usd_convertible: false,
          usd_conversion_date: new Date().toISOString(),
          exchange_rate_manual: false
        })
        .eq('uuid', transactionId);

      if (updateError) {
        console.error('[Transactions API] Error marking transaction as unconvertible:', updateError);
      }
      return;
    }

    // Update transaction with USD values
    console.log('[Transactions API] Currency conversion successful, updating transaction with USD values...');
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        value_usd: result.usd_amount,
        exchange_rate_used: result.exchange_rate,
        usd_conversion_date: new Date().toISOString(),
        usd_convertible: true,
        exchange_rate_manual: false
      })
      .eq('uuid', transactionId);

    if (updateError) {
      console.error('[Transactions API] Error updating transaction with USD values:', updateError);
    } else {
      console.log('[Transactions API] Successfully converted and updated transaction:', {
        transactionId,
        originalAmount: `${value} ${currency}`,
        usdAmount: `$${result.usd_amount}`,
        exchangeRate: result.exchange_rate
      });
    }

  } catch (error) {
    console.error('[Transactions API] Unexpected error during currency conversion:', error);
  }
}

// Helper function to infer and apply budget lines for a transaction
async function performBudgetLineInference(transactionId: string) {
  try {
    console.log('[Transactions API] Starting budget line inference for transaction:', transactionId);
    // Fetch transaction with its data
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        value,
        currency,
        provider_org_id,
        receiver_org_id,
        finance_type,
        effective_finance_type
      `)
      .eq('uuid', transactionId)
      .single();

    if (txnError || !transaction) {
      console.error('[Transactions API] Error fetching transaction for inference:', txnError);
      return;
    }

    // Get transaction sectors (from transaction_sector_lines)
    const { data: sectorLines } = await supabase
      .from('transaction_sector_lines')
      .select('sector_code, sector_name, percentage')
      .eq('transaction_id', transactionId)
      .is('deleted_at', null);

    // Build inference input
    const input = {
      providerOrgId: transaction.provider_org_id,
      receiverOrgId: transaction.receiver_org_id,
      financeType: transaction.effective_finance_type || transaction.finance_type,
      sectors: (sectorLines || []).map((s: any) => ({
        code: s.sector_code,
        name: s.sector_name,
        percentage: s.percentage,
      })),
      value: transaction.value || 0,
      currency: transaction.currency || 'USD',
    };

    // Infer and apply budget lines
    const result = await inferAndApplyBudgetLines(supabase, transactionId, input);

    if (result.success) {
      console.log('[Transactions API] Budget line inference completed:', {
        transactionId,
        linesCreated: result.linesCreated,
        linesPreserved: result.linesPreserved,
      });
    } else {
      console.error('[Transactions API] Budget line inference failed');
    }
  } catch (error) {
    console.error('[Transactions API] Unexpected error during budget line inference:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const body = await request.json();
    console.log('[Transactions API] POST request received:', body);

    // Validate required fields
    if (!body.activity_id) {
      return NextResponse.json(
        { error: 'activity_id is required' },
        { status: 400 }
      );
    }

    if (!body.transaction_type) {
      return NextResponse.json(
        { error: 'transaction_type is required' },
        { status: 400 }
      );
    }

    if (!body.value || body.value <= 0) {
      return NextResponse.json(
        { error: 'value must be greater than 0' },
        { status: 400 }
      );
    }

    // Temporarily skip IATI validation to test basic functionality
    // TODO: Re-enable after ensuring database functions are set up
    /*
    // Validate IATI field values
    const validation = await validateIATIFields(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid IATI field values', 
          details: validation.errors 
        },
        { status: 400 }
      );
    }
    */

    // Use provided transaction reference or generate one if empty
    let transactionReference = body.transaction_reference?.trim() || '';
    
    // Only auto-generate if no reference is provided
    if (!transactionReference) {
      // Generate a unique reference using timestamp + random + activity info
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 100000);
      const activitySuffix = body.activity_id ? body.activity_id.slice(-8) : 'unknown';
      
      transactionReference = `TXN-${timestamp}-${random}-${activitySuffix}`;
      console.log('[Transactions API] Generated transaction reference:', transactionReference);
    } else {
      console.log('[Transactions API] Using provided transaction reference:', transactionReference);
    }

    // tied_status mapping - database hasn't been migrated yet, so map to current enum values
    // Frontend sends IATI standard: '1'=Tied, '2'=Partially tied, '3'=Untied, '4'=Not reported
    // Database currently expects: '3'=Untied, '4'=Tied, '5'=Partially tied
    console.log('[Transactions API] tied_status value:', body.tied_status);
    
    let mappedTiedStatus = null;
    if (body.tied_status) {
      const tiedStatusMapping: Record<string, string> = {
        '1': '4',  // Frontend Tied (1) -> Database Tied (4)
        '2': '5',  // Frontend Partially tied (2) -> Database Partially tied (5)
        '3': '3',  // Frontend Untied (3) -> Database Untied (3)
        '4': '3'   // Frontend Not reported (4) -> Database Untied (3) as fallback
      };
      
      mappedTiedStatus = tiedStatusMapping[body.tied_status] || '3'; // Default to Untied
      console.log('[Transactions API] Mapped tied_status from', body.tied_status, 'to', mappedTiedStatus);
    }
    
    const transactionData: any = {
      activity_id: body.activity_id,
      transaction_type: cleanEnumValue(body.transaction_type),
      provider_org_name: body.provider_org_name ?? '',
      receiver_org_name: body.receiver_org_name ?? '',
      provider_org_id: cleanUUIDValue(body.provider_org_id),
      receiver_org_id: cleanUUIDValue(body.receiver_org_id),
      provider_org_type: cleanEnumValue(body.provider_org_type),
      receiver_org_type: cleanEnumValue(body.receiver_org_type),
      provider_org_ref: body.provider_org_ref ?? '',
      receiver_org_ref: body.receiver_org_ref ?? '',
      value: parseFloat(body.value?.toString() || '0') || 0,
      currency: body.currency || 'USD',
      status: (() => {
        // If status is explicitly provided, use it
        if (body.status) return body.status;
        
        // Auto-submit transactions from government and development partners
        // These should be ready for validation by default
        const userRole = body.userRole || body.user_role;
        if (userRole && ['dev_partner_tier_1', 'dev_partner_tier_2', 'gov_partner_tier_1', 'gov_partner_tier_2'].includes(userRole)) {
          return 'submitted';
        }
        
        // Default to draft for other users
        return 'draft';
      })(),
      transaction_date: cleanDateValue(body.transaction_date) || new Date().toISOString().split('T')[0],
      value_date: (() => {
        const valueDate = cleanDateValue(body.value_date);
        const transactionDate = cleanDateValue(body.transaction_date) || new Date().toISOString().split('T')[0];
        return valueDate || transactionDate; // Use value_date if provided, otherwise use transaction_date
      })(),
      transaction_reference: transactionReference,
      description: body.description ?? '',
      aid_type: cleanEnumValue(body.aid_type),
      tied_status: mappedTiedStatus, // Use mapped value for current database
      flow_type: cleanEnumValue(body.flow_type),
      finance_type: cleanEnumValue(body.finance_type),
      disbursement_channel: cleanEnumValue(body.disbursement_channel),
      is_humanitarian: body.is_humanitarian || false,
      financing_classification: body.financing_classification || null,
      created_by: cleanUUIDValue(body.created_by),
      sector_code: body.sector_code ?? '',
      sector_vocabulary: body.sector_vocabulary ?? '',
      recipient_country_code: body.recipient_country_code ?? '',
      recipient_region_code: body.recipient_region_code ?? '',
      recipient_region_vocab: body.recipient_region_vocab ?? '',
      aid_type_vocabulary: body.aid_type_vocabulary ?? '',
      activity_iati_ref: body.activity_iati_ref ?? '',
      // Sector inheritance flag - default to true (inherit from activity)
      use_activity_sectors: body.use_activity_sectors ?? true
    };

    console.log('[Transactions API] Inserting transaction:', transactionData);

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      console.error('[Transactions API] Error inserting transaction:', error);
      
      // TEMPORARILY DISABLE unique constraint error to debug
      // TODO: Re-enable after identifying the root cause
      /*
      // Enhanced error handling for unique constraint violations
      if (error.message && error.message.includes('unique_transaction_ref')) {
        return NextResponse.json(
          { 
            error: 'Transaction reference already exists. Please provide a unique reference or leave blank for auto-generation.',
            details: 'The transaction reference must be unique within this activity.'
          },
          { status: 409 }
        );
      }
      */
      
      return NextResponse.json(
        { error: error.message || 'Failed to save transaction' },
        { status: 500 }
      );
    }

    console.log('[Transactions API] Successfully saved transaction:', data.uuid);

    // Ensure we return the transaction with both uuid and id (for compatibility)
    const responseData = {
      ...data,
      id: data.uuid // Add id field for backward compatibility
    };

    // Save sectors if provided and not using activity sectors
    console.log('[Transactions API] Sectors debug:', {
      hasSectors: !!body.sectors,
      isArray: Array.isArray(body.sectors),
      length: body.sectors?.length || 0,
      use_activity_sectors: body.use_activity_sectors,
      sectors: body.sectors
    });
    if (body.sectors && Array.isArray(body.sectors) && body.sectors.length > 0 && body.use_activity_sectors === false) {
      try {
        const transactionValue = parseFloat(body.value?.toString() || '0') || 0;
        const sectorLinesToInsert = body.sectors.map((s: any, idx: number) => {
          const percentage = s.percentage || 0;
          // Calculate amount_minor: value * percentage / 100, converted to minor units (cents)
          const amountMinor = Math.round(transactionValue * percentage / 100 * 100);
          return {
            transaction_id: data.uuid,
            sector_vocabulary: s.vocabulary || '1',
            sector_code: s.code,
            sector_name: s.narrative || null,
            percentage: percentage || null,
            amount_minor: amountMinor,
            sort_order: idx
          };
        });

        const { error: sectorError } = await supabase
          .from('transaction_sector_lines')
          .insert(sectorLinesToInsert);

        if (sectorError) {
          console.error('[Transactions API] Error inserting sector lines:', sectorError);
        } else {
          console.log('[Transactions API] Successfully inserted sector lines:', sectorLinesToInsert.length);
        }
      } catch (sectorErr) {
        console.error('[Transactions API] Error saving sectors:', sectorErr);
      }
    }

    // Save aid_types if provided
    console.log('[Transactions API] Aid Types debug:', {
      hasAidTypes: !!body.aid_types,
      isArray: Array.isArray(body.aid_types),
      length: body.aid_types?.length || 0,
      aid_types: body.aid_types
    });
    if (body.aid_types && Array.isArray(body.aid_types) && body.aid_types.length > 0) {
      try {
        const aidTypeLinesToInsert = body.aid_types.map((a: any, idx: number) => ({
          transaction_id: data.uuid,
          aid_type_vocabulary: a.vocabulary || '1',
          aid_type_code: a.code,
          sort_order: idx
        }));

        const { error: aidTypeError } = await supabase
          .from('transaction_aid_type_lines')
          .insert(aidTypeLinesToInsert);

        if (aidTypeError) {
          console.error('[Transactions API] Error inserting aid_type lines:', aidTypeError);
          // Don't fail the request - aid_types table might not exist yet
        } else {
          console.log('[Transactions API] Successfully inserted aid_type lines:', aidTypeLinesToInsert.length);
        }
      } catch (aidTypeErr) {
        console.error('[Transactions API] Error saving aid_types:', aidTypeErr);
      }
    }

    // Perform currency conversion for all transactions (including USD to populate USD Value field)
    // Support manual exchange rate override from the request body
    await performCurrencyConversion(
      responseData.uuid,
      responseData.currency,
      responseData.value,
      responseData.value_date || responseData.transaction_date,
      body.exchange_rate_used,
      body.value_usd,
      body.exchange_rate_manual
    );

    // Infer and apply budget lines (runs in background, doesn't block response)
    performBudgetLineInference(responseData.uuid).catch(err =>
      console.error('[Transactions API] Background budget inference failed:', err)
    );

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('[Transactions API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const body = await request.json();
    console.log('[Transactions API] PUT request received:', body);

    // Check for either id or uuid (for compatibility)
    const transactionId = body.id || body.uuid;
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Temporarily skip IATI validation to test basic functionality
    // TODO: Re-enable after ensuring database functions are set up
    /*
    // Validate IATI field values for updates
    const validation = await validateIATIFields(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid IATI field values', 
          details: validation.errors 
        },
        { status: 400 }
      );
    }
    */

    // Handle transaction reference - if empty, keep the existing reference to avoid unique constraint issues
    let transactionReference = body.transaction_reference?.trim() || '';
    
    // Get the current transaction to check for reference changes and inherited flags
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('transaction_reference, activity_id, finance_type, finance_type_inherited, flow_type, aid_type, tied_status')
      .eq('uuid', transactionId)
      .single();
    
    if (fetchError) {
      console.error('[Transactions API] Error fetching current transaction:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current transaction' },
        { status: 500 }
      );
    }
    
    if (!transactionReference) {
      // For updates, we need to keep the existing reference if it's empty
      transactionReference = currentTransaction?.transaction_reference || null;
    } else {
      // Check if the new reference is different from the current one
      // If it's the same, we don't need to validate uniqueness
      if (transactionReference !== currentTransaction?.transaction_reference) {
        // Check if the new reference conflicts with another transaction in the same activity
        const { data: conflictingTransaction, error: conflictError } = await supabase
          .from('transactions')
          .select('uuid')
          .eq('transaction_reference', transactionReference)
          .eq('activity_id', currentTransaction.activity_id)
          .neq('uuid', transactionId) // Exclude the current transaction
          .single();
        
        if (conflictError && conflictError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('[Transactions API] Error checking for reference conflicts:', conflictError);
          return NextResponse.json(
            { error: 'Failed to validate transaction reference' },
            { status: 500 }
          );
        }
        
        if (conflictingTransaction) {
          return NextResponse.json(
            { 
              error: 'Transaction reference already exists. Please provide a unique reference or leave blank for auto-generation.',
              details: 'The transaction reference must be unique within this activity.'
            },
            { status: 409 }
          );
        }
      }
    }

    // Prepare update data (exclude id, uuid and timestamps)
    const { id, uuid, created_at, updated_at, ...updateData } = body;

    // Clean up the data using centralized field cleaner
    const cleanedData: any = cleanTransactionFields(updateData);
    
    // Override transaction_reference with the validated value from above
    cleanedData.transaction_reference = transactionReference;
    
    // Handle value_date logic - use value_date if provided, otherwise use transaction_date
    if (updateData.value_date !== undefined || updateData.transaction_date !== undefined) {
      const valueDate = cleanDateValue(updateData.value_date);
      const transactionDate = cleanDateValue(updateData.transaction_date);
      const result = valueDate || transactionDate;
      console.log('[DEBUG] value_date logic:', { 
        input_value_date: updateData.value_date, 
        input_transaction_date: updateData.transaction_date,
        cleaned_value_date: valueDate, 
        cleaned_transaction_date: transactionDate, 
        final_result: result 
      });
      cleanedData.value_date = result;
    }

    // Smart logic for inherited flags (finance_type, flow_type, aid_type, tied_status):
    // - If value unchanged and was inherited, keep as inherited
    // - If value changed or new transaction, mark as explicit (user confirmed)

    // Finance Type
    if ('finance_type' in updateData) {
      if (currentTransaction?.finance_type === updateData.finance_type &&
          currentTransaction?.finance_type_inherited === true) {
        // User didn't change the value and it was inherited - keep as inherited (GRAY)
        cleanedData.finance_type_inherited = true;
      } else {
        // User changed it or it's a new transaction - mark as explicit (BLACK)
        cleanedData.finance_type_inherited = false;
      }
    }

    // Flow Type (if column exists - gracefully handle if not)
    if ('flow_type' in updateData) {
      if (currentTransaction?.flow_type === updateData.flow_type &&
          (currentTransaction as any)?.flow_type_inherited === true) {
        cleanedData.flow_type_inherited = true;
      } else {
        cleanedData.flow_type_inherited = false;
      }
    }

    // Aid Type (if column exists - gracefully handle if not)
    if ('aid_type' in updateData) {
      if (currentTransaction?.aid_type === updateData.aid_type &&
          (currentTransaction as any)?.aid_type_inherited === true) {
        cleanedData.aid_type_inherited = true;
      } else {
        cleanedData.aid_type_inherited = false;
      }
    }

    // Tied Status (if column exists - gracefully handle if not)
    if ('tied_status' in updateData) {
      if (currentTransaction?.tied_status === updateData.tied_status &&
          (currentTransaction as any)?.tied_status_inherited === true) {
        cleanedData.tied_status_inherited = true;
      } else {
        cleanedData.tied_status_inherited = false;
      }
    }

    // Only add organization_id if provided and valid
    const orgId = cleanUUIDValue(updateData.organization_id);
    if (orgId) {
      cleanedData.organization_id = orgId;
    } else {
      // Remove organization_id if it's invalid
      delete cleanedData.organization_id;
    }

    console.log('[Transactions API] Updating transaction:', transactionId, cleanedData);

    const { data, error } = await supabase
      .from('transactions')
      .update(cleanedData)
      .eq('uuid', transactionId)
      .select()
      .single();

    if (error) {
      console.error('[Transactions API] Error updating transaction:', error);
      
      // Enhanced error handling for unique constraint violations
      if (error.message && error.message.includes('unique_transaction_ref')) {
        return NextResponse.json(
          { 
            error: 'Transaction reference already exists. Please provide a unique reference or leave blank for auto-generation.',
            details: 'The transaction reference must be unique within this activity.'
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to update transaction' },
        { status: 500 }
      );
    }

    console.log('[Transactions API] Successfully updated transaction:', data.uuid);

    // Ensure we return the transaction with both uuid and id (for compatibility)
    const responseData = {
      ...data,
      id: data.uuid // Add id field for backward compatibility
    };

    // Update sectors if provided
    console.log('[Transactions API] PUT Sectors debug:', {
      hasSectors: body.sectors !== undefined,
      isArray: Array.isArray(body.sectors),
      length: body.sectors?.length || 0,
      use_activity_sectors: body.use_activity_sectors,
      sectors: body.sectors
    });
    if (body.sectors !== undefined) {
      try {
        // First, delete existing sector lines
        await supabase
          .from('transaction_sector_lines')
          .delete()
          .eq('transaction_id', transactionId);

        // Then insert new ones if not using activity sectors
        if (body.sectors && Array.isArray(body.sectors) && body.sectors.length > 0 && body.use_activity_sectors === false) {
          const transactionValue = parseFloat(data.value?.toString() || body.value?.toString() || '0') || 0;
          const sectorLinesToInsert = body.sectors.map((s: any, idx: number) => {
            const percentage = s.percentage || 0;
            // Calculate amount_minor: value * percentage / 100, converted to minor units (cents)
            const amountMinor = Math.round(transactionValue * percentage / 100 * 100);
            return {
              transaction_id: transactionId,
              sector_vocabulary: s.vocabulary || '1',
              sector_code: s.code,
              sector_name: s.narrative || null,
              percentage: percentage || null,
              amount_minor: amountMinor,
              sort_order: idx
            };
          });

          const { error: sectorError } = await supabase
            .from('transaction_sector_lines')
            .insert(sectorLinesToInsert);

          if (sectorError) {
            console.error('[Transactions API] Error updating sector lines:', sectorError);
          } else {
            console.log('[Transactions API] Successfully updated sector lines:', sectorLinesToInsert.length);
          }
        }
      } catch (sectorErr) {
        console.error('[Transactions API] Error updating sectors:', sectorErr);
      }
    }

    // Update aid_types if provided
    console.log('[Transactions API] PUT Aid Types debug:', {
      hasAidTypes: body.aid_types !== undefined,
      isArray: Array.isArray(body.aid_types),
      length: body.aid_types?.length || 0,
      aid_types: body.aid_types
    });
    if (body.aid_types !== undefined) {
      try {
        // First, delete existing aid_type lines
        await supabase
          .from('transaction_aid_type_lines')
          .delete()
          .eq('transaction_id', transactionId);

        // Then insert new ones
        if (body.aid_types && Array.isArray(body.aid_types) && body.aid_types.length > 0) {
          const aidTypeLinesToInsert = body.aid_types.map((a: any, idx: number) => ({
            transaction_id: transactionId,
            aid_type_vocabulary: a.vocabulary || '1',
            aid_type_code: a.code,
            sort_order: idx
          }));

          const { error: aidTypeError } = await supabase
            .from('transaction_aid_type_lines')
            .insert(aidTypeLinesToInsert);

          if (aidTypeError) {
            console.error('[Transactions API] Error updating aid_type lines:', aidTypeError);
            // Don't fail the request - aid_types table might not exist yet
          } else {
            console.log('[Transactions API] Successfully updated aid_type lines:', aidTypeLinesToInsert.length);
          }
        }
      } catch (aidTypeErr) {
        console.error('[Transactions API] Error updating aid_types:', aidTypeErr);
      }
    }

    // Perform currency conversion for all transactions (including USD to populate USD Value field)
    // Support manual exchange rate override from the request body
    await performCurrencyConversion(
      responseData.uuid,
      responseData.currency,
      responseData.value,
      responseData.value_date || responseData.transaction_date,
      body.exchange_rate_used,
      body.value_usd,
      body.exchange_rate_manual
    );

    // Infer and apply budget lines (runs in background, doesn't block response)
    performBudgetLineInference(responseData.uuid).catch(err =>
      console.error('[Transactions API] Background budget inference failed:', err)
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Transactions API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Transactions API] Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('uuid'); // Support both for compatibility
    
    // Check if this is a bulk delete request (body contains uuids array)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      // No body, continue with single delete from query params
      body = {};
    }
    
    const { uuids } = body;
    
    // Handle bulk deletion
    if (uuids && Array.isArray(uuids)) {
      if (uuids.length === 0) {
        return NextResponse.json(
          { error: 'At least one transaction UUID required' },
          { status: 400 }
        );
      }
      
      console.log(`[Transactions API] Bulk deleting ${uuids.length} transactions:`, uuids);
      
      // Validate all UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidUuids = uuids.filter(uuid => !uuidRegex.test(uuid));
      
      if (invalidUuids.length > 0) {
        console.error('[Transactions API] Invalid UUIDs in bulk delete:', invalidUuids);
        return NextResponse.json(
          { error: 'One or more invalid transaction UUIDs', invalidUuids },
          { status: 400 }
        );
      }
      
      // Perform bulk deletion
      const { error, count } = await supabase
        .from('transactions')
        .delete()
        .in('uuid', uuids);
      
      if (error) {
        console.error('[Transactions API] Error bulk deleting transactions:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to delete transactions' },
          { status: 500 }
        );
      }
      
      console.log(`[Transactions API] Successfully bulk deleted ${count || uuids.length} transactions`);
      return NextResponse.json({ 
        success: true, 
        deletedCount: count || uuids.length,
        message: `${count || uuids.length} transactions deleted successfully`
      });
    }

    // Handle single deletion (existing logic)
    if (!id || id === 'undefined') {
      console.error('[Transactions API] DELETE request with invalid ID:', id);
      return NextResponse.json(
        { error: 'Valid transaction ID is required' },
        { status: 400 }
      );
    }

    console.log('[Transactions API] DELETE request for transaction:', id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('[Transactions API] Invalid UUID format:', id);
      return NextResponse.json(
        { error: 'Invalid transaction ID format' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('uuid', id);

    if (error) {
      console.error('[Transactions API] Error deleting transaction:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete transaction' },
        { status: 500 }
      );
    }

    console.log('[Transactions API] Successfully deleted transaction:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Transactions API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 