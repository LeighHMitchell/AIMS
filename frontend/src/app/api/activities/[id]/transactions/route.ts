import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

// Helper function to perform automatic currency conversion
async function performCurrencyConversion(transactionId: string, currency: string, value: number, valueDate: string) {
  try {
    console.log('[Activity Transactions API] Starting automatic currency conversion for transaction:', transactionId);
    
    // Use the fixed currency converter
    const result = await fixedCurrencyConverter.convertTransaction(transactionId);
    
    if (result.success) {
      console.log('[Activity Transactions API] Currency conversion completed successfully for transaction:', transactionId);
    } else {
      console.log('[Activity Transactions API] Currency conversion failed for transaction:', transactionId, 'Error:', result.error);
    }

  } catch (error) {
    console.error('[Activity Transactions API] Unexpected error during currency conversion:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const activityId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const includeSummary = searchParams.get('includeSummary') === 'true';
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Check if optimized endpoint is requested
    const enableOptimization = process.env.NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION !== 'false';
    
    if (enableOptimization && (page > 1 || limit < 100)) {
      // Use optimized pagination
      const offset = (page - 1) * limit;
      
      // Get total count
      const { count } = await supabase
        .from('transactions')
        .select('uuid', { count: 'exact', head: true })
        .eq('activity_id', activityId);
      
      // Fetch paginated transactions with optimized query
      const { data: transactions, error } = await supabase
        .from('transactions')
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
        .eq('activity_id', activityId)
        .order('transaction_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
          { error: 'Failed to fetch transactions' },
          { status: 500 }
        );
      }

      // Transform the data
      const transformedTransactions = transactions?.map((t: any) => ({
        ...t,
        provider_org_ref: t.provider_org?.iati_org_id || t.provider_org_ref,
        receiver_org_ref: t.receiver_org?.iati_org_id || t.receiver_org_ref,
        provider_org_name: t.provider_org?.acronym || t.provider_org?.name || t.provider_org_name,
        receiver_org_name: t.receiver_org?.acronym || t.receiver_org?.name || t.receiver_org_name,
      })) || [];
      
      // Calculate summary if requested
      let summary = undefined;
      if (includeSummary) {
        const actualTransactions = transformedTransactions.filter((t: any) => t.status === 'actual');
        summary = {
          commitments: actualTransactions.filter((t: any) => t.transaction_type === '2').reduce((sum: number, t: any) => sum + (t.value || 0), 0),
          disbursements: actualTransactions.filter((t: any) => t.transaction_type === '3').reduce((sum: number, t: any) => sum + (t.value || 0), 0),
          expenditures: actualTransactions.filter((t: any) => t.transaction_type === '4').reduce((sum: number, t: any) => sum + (t.value || 0), 0),
          inflows: actualTransactions.filter((t: any) => ['1', '11'].includes(t.transaction_type || '')).reduce((sum: number, t: any) => sum + (t.value || 0), 0)
        };
      }
      
      // Log performance
      const executionTime = Date.now() - startTime;
      console.log(`[Transactions Optimized] Fetched ${transformedTransactions.length} transactions in ${executionTime}ms`);
      
      return NextResponse.json({
        data: transformedTransactions,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        summary,
        performance: {
          executionTimeMs: executionTime
        }
      });
    }
    
    // Legacy implementation for backward compatibility
    const { data: transactions, error } = await supabase
      .from('transactions')
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
      .eq('activity_id', activityId)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Transform the data to include organization details - use acronyms when available
    const transformedTransactions = transactions?.map((t: any) => ({
      ...t,
      provider_org_ref: t.provider_org?.iati_org_id || t.provider_org_ref,
      receiver_org_ref: t.receiver_org?.iati_org_id || t.receiver_org_ref,
      provider_org_name: t.provider_org?.acronym || t.provider_org?.name || t.provider_org_name,
      receiver_org_name: t.receiver_org?.acronym || t.receiver_org?.name || t.receiver_org_name,
    })) || [];

    const executionTime = Date.now() - startTime;
    console.log(`[Transactions Legacy] Fetched ${transformedTransactions.length} transactions in ${executionTime}ms`);
    
    return NextResponse.json(transformedTransactions);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body = await request.json();

    // Validate activity exists and get its organization_id
    const { data: activity, error: activityError } = await getSupabaseAdmin()
      .from('activities')
      .select('id, reporting_org_id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      console.error('Activity not found:', activityError);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const validationErrors = [];
    if (!body.transaction_type) {
      validationErrors.push('Transaction type is required');
    }
    if (!body.value || body.value <= 0) {
      validationErrors.push('Transaction value must be greater than 0');
    }
    if (!body.transaction_date) {
      validationErrors.push('Transaction date is required');
    }
    if (!body.currency) {
      validationErrors.push('Currency is required');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationErrors.join(', '),
          validationErrors 
        },
        { status: 400 }
      );
    }

    // Handle value_date logic - only store if different from transaction_date
    const value_date = body.value_date && body.value_date !== body.transaction_date 
      ? body.value_date 
      : null;

    // Ensure activity_id is set and use activity's organization if not provided
    const transactionData = {
      ...body,
      activity_id: activityId,
      organization_id: activity.reporting_org_id, // Use activity's organization as fallback
      // Convert empty strings to null for optional fields
      value_date,
      transaction_reference: body.transaction_reference || null,
      description: body.description || null,
      provider_org_id: body.provider_org_id || null,
      provider_org_type: body.provider_org_type || null,
      provider_org_ref: body.provider_org_ref || null,
      provider_org_name: body.provider_org_name || null,
      receiver_org_id: body.receiver_org_id || null,
      receiver_org_type: body.receiver_org_type || null,
      receiver_org_ref: body.receiver_org_ref || null,
      receiver_org_name: body.receiver_org_name || null,
      disbursement_channel: body.disbursement_channel || null,
      sector_code: body.sector_code || null,
      sector_vocabulary: body.sector_vocabulary || null,
      recipient_country_code: body.recipient_country_code || null,
      recipient_region_code: body.recipient_region_code || null,
      recipient_region_vocab: body.recipient_region_vocab || null,
      flow_type: body.flow_type || null,
      finance_type: body.finance_type || null,
      aid_type: body.aid_type || null,
      aid_type_vocabulary: body.aid_type_vocabulary || null,
      tied_status: body.tied_status || null,
      is_humanitarian: body.is_humanitarian || false,
      // Add language fields with defaults
      description_language: body.description_language || 'en',
      provider_org_language: body.provider_org_language || 'en', 
      receiver_org_language: body.receiver_org_language || 'en',
      // Add financing classification if provided
      financing_classification: body.financing_classification || null,
      
      // NEW: IATI Compliance Fields - Activity ID links
      provider_org_activity_id: body.provider_org_activity_id || null,
      provider_activity_uuid: body.provider_activity_uuid || null,
      receiver_org_activity_id: body.receiver_org_activity_id || null,
      receiver_activity_uuid: body.receiver_activity_uuid || null,
      
      // NEW: Vocabulary fields with defaults
      flow_type_vocabulary: body.flow_type_vocabulary || '1',
      finance_type_vocabulary: body.finance_type_vocabulary || '1',
      tied_status_vocabulary: body.tied_status_vocabulary || '1',
      disbursement_channel_vocabulary: body.disbursement_channel_vocabulary || '1',
      
      // NEW: Multiple element support (JSONB arrays)
      // Supabase handles JSON serialization automatically
      sectors: body.sectors || null,
      aid_types: body.aid_types || null,
      recipient_countries: body.recipient_countries || null,
      recipient_regions: body.recipient_regions || null,
    };

    console.log('[TransactionAPI] Creating transaction with organization_id:', transactionData.organization_id);

    // Insert the transaction
    const { data: newTransaction, error } = await getSupabaseAdmin()
      .from('transactions')
      .insert(transactionData)
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
      console.error('Error creating transaction:', error);
      // Provide more specific error messages
      if (error.code === '23502' && error.message.includes('organization_id')) {
        return NextResponse.json(
          { 
            error: 'Organization ID is required', 
            details: 'The activity must have a valid organization associated with it',
            code: 'MISSING_ORG_ID'
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create transaction', details: error.message },
        { status: 400 }
      );
    }

    // Transform the response - use acronyms when available
    const transformedTransaction = {
      ...newTransaction,
      provider_org_ref: newTransaction.provider_org?.iati_org_id || newTransaction.provider_org_ref,
      receiver_org_ref: newTransaction.receiver_org?.iati_org_id || newTransaction.receiver_org_ref,
      provider_org_name: newTransaction.provider_org?.acronym || newTransaction.provider_org?.name || newTransaction.provider_org_name,
      receiver_org_name: newTransaction.receiver_org?.acronym || newTransaction.receiver_org?.name || newTransaction.receiver_org_name,
    };

    // Perform currency conversion for all transactions (including USD to populate USD Value field)
    if (newTransaction.currency && newTransaction.value) {
      const conversionDate = newTransaction.value_date || newTransaction.transaction_date;
      await performCurrencyConversion(newTransaction.uuid, newTransaction.currency, newTransaction.value, conversionDate);
    }

    return NextResponse.json(transformedTransaction, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 