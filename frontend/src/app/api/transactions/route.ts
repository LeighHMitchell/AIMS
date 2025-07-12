import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { TransactionType } from '@/types/transaction';
import { createClient } from '@/lib/supabase-simple';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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
    
    // Filters
    const transactionType = searchParams.get('transactionType');
    const flowType = searchParams.get('flowType');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // Build the query
    let query = getSupabaseAdmin()
      .from('transactions')
      .select(`
        *,
        activity:activities!activity_id (
          id,
          title_narrative,
          iati_identifier
        ),
        provider_org:organizations!provider_org_id (
          id,
          name,
          acronym
        ),
        receiver_org:organizations!receiver_org_id (
          id,
          name,
          acronym
        )
      `, { count: 'exact' });
    
    // Apply filters
    if (transactionType && transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }
    
    if (flowType && flowType !== 'all') {
      query = query.eq('flow_type', flowType);
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }
    
    // Apply search
    if (search) {
      query = query.or(`
        id.ilike.%${search}%,
        provider_org_name.ilike.%${search}%,
        receiver_org_name.ilike.%${search}%,
        description.ilike.%${search}%
      `);
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
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: transactions, error, count } = await query;
    
    if (error) {
      console.error('[AIMS] Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }
    
    // Transform the data for frontend compatibility
    const transformedTransactions = (transactions || []).map((t: any) => ({
      ...t,
      id: t.uuid || t.id,
      // Flatten organization names for easier access - use acronyms when available
      from_org: t.provider_org?.acronym || t.provider_org?.name || t.provider_org_name,
      to_org: t.receiver_org?.acronym || t.receiver_org?.name || t.receiver_org_name,
      // Keep the original fields as well - use acronyms when available
      provider_org_name: t.provider_org?.acronym || t.provider_org?.name || t.provider_org_name,
      receiver_org_name: t.receiver_org?.acronym || t.receiver_org?.name || t.receiver_org_name,
      // Keep full names for display if needed
      provider_org_full_name: t.provider_org?.name || t.provider_org_name,
      receiver_org_full_name: t.receiver_org?.name || t.receiver_org_name,
    }));
    
    // Return paginated response
    return NextResponse.json({
      data: transformedTransactions,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
    
  } catch (error) {
    console.error('[AIMS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to clean date values
function cleanDateValue(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

// Helper to clean UUID values
function cleanUUIDValue(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed) ? trimmed : null;
  }
  return null;
}

// Helper function to clean enum values
function cleanEnumValue(value: any): string | null {
  if (!value || value === 'none' || value === 'undefined' || value === 'null' || value === '') {
    return null;
  }
  return String(value).trim();
}

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
async function performCurrencyConversion(transactionId: string, currency: string, value: number, valueDate: string) {
  try {
    console.log('[Transactions API] Starting automatic currency conversion for transaction:', transactionId);
    
    // Skip conversion if already USD
    if (currency === 'USD') {
      console.log('[Transactions API] Transaction is already in USD, updating fields...');
      
      // Update USD fields for USD transactions
      const { error: updateError } = await getSupabaseAdmin()
        .from('transactions')
        .update({
          value_usd: value,
          exchange_rate_used: 1.0,
          usd_conversion_date: new Date().toISOString(),
          usd_convertible: true
        })
        .eq('uuid', transactionId);

      if (updateError) {
        console.error('[Transactions API] Error updating USD transaction fields:', updateError);
      } else {
        console.log('[Transactions API] Successfully updated USD transaction fields');
      }
      return;
    }

    // Convert to USD using the currency converter
    const conversionDate = new Date(valueDate);
    const result = await fixedCurrencyConverter.convertToUSD(value, currency, conversionDate);

    if (!result.success) {
      console.log('[Transactions API] Currency conversion failed, marking as unconvertible:', result.error);
      
      // Mark as unconvertible
      const { error: updateError } = await getSupabaseAdmin()
        .from('transactions')
        .update({
          usd_convertible: false,
          usd_conversion_date: new Date().toISOString()
        })
        .eq('uuid', transactionId);

      if (updateError) {
        console.error('[Transactions API] Error marking transaction as unconvertible:', updateError);
      }
      return;
    }

    // Update transaction with USD values
    console.log('[Transactions API] Currency conversion successful, updating transaction with USD values...');
    const { error: updateError } = await getSupabaseAdmin()
      .from('transactions')
      .update({
        value_usd: result.usd_amount,
        exchange_rate_used: result.exchange_rate,
        usd_conversion_date: new Date().toISOString(),
        usd_convertible: true
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

export async function POST(request: NextRequest) {
  try {
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

    // Auto-generate transaction reference if not provided or empty
    let transactionReference = body.transaction_reference?.trim() || '';
    
    if (!transactionReference) {
      try {
        console.log('[Transactions API] Auto-generating transaction reference for activity:', body.activity_id);
        
        const { data: refData, error: refError } = await getSupabaseAdmin()
          .rpc('generate_unique_transaction_reference', {
            p_activity_id: body.activity_id,
            p_base_reference: null
          });
        
        if (refError) {
          console.error('[Transactions API] Error generating transaction reference:', refError);
          return NextResponse.json(
            { error: 'Failed to generate transaction reference' },
            { status: 500 }
          );
        }
        
        transactionReference = refData;
        console.log('[Transactions API] Generated transaction reference:', transactionReference);
      } catch (refGenError) {
        console.error('[Transactions API] Exception generating transaction reference:', refGenError);
        return NextResponse.json(
          { error: 'Failed to generate transaction reference' },
          { status: 500 }
        );
      }
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
      status: body.status || 'actual',
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
      activity_iati_ref: body.activity_iati_ref ?? ''
    };

    console.log('[Transactions API] Inserting transaction:', transactionData);

    const { data, error } = await getSupabaseAdmin()
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      console.error('[Transactions API] Error inserting transaction:', error);
      
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
    
    // Perform currency conversion if the transaction is not in USD
    if (responseData.currency !== 'USD') {
      await performCurrencyConversion(responseData.uuid, responseData.currency, responseData.value, responseData.value_date || responseData.transaction_date);
    }

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
    
    // Get the current transaction to check for reference changes
    const { data: currentTransaction, error: fetchError } = await getSupabaseAdmin()
      .from('transactions')
      .select('transaction_reference, activity_id')
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
        const { data: conflictingTransaction, error: conflictError } = await getSupabaseAdmin()
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

    // Clean up the data
    const cleanedData: any = {
      ...updateData,
      transaction_type: cleanEnumValue(updateData.transaction_type),
      transaction_reference: transactionReference,
      provider_org_id: cleanUUIDValue(updateData.provider_org_id),
      receiver_org_id: cleanUUIDValue(updateData.receiver_org_id),
      provider_org_type: cleanEnumValue(updateData.provider_org_type),
      receiver_org_type: cleanEnumValue(updateData.receiver_org_type),
      transaction_date: cleanDateValue(updateData.transaction_date),
      value_date: (() => {
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
        return result; // Use value_date if provided, otherwise use transaction_date
      })(),
      aid_type: cleanEnumValue(updateData.aid_type),
      tied_status: cleanEnumValue(updateData.tied_status),
      flow_type: cleanEnumValue(updateData.flow_type),
      finance_type: cleanEnumValue(updateData.finance_type),
      disbursement_channel: cleanEnumValue(updateData.disbursement_channel),
      created_by: cleanUUIDValue(updateData.created_by)
    };

    // Only add organization_id if provided and valid
    const orgId = cleanUUIDValue(updateData.organization_id);
    if (orgId) {
      cleanedData.organization_id = orgId;
    } else {
      // Remove organization_id if it's invalid
      delete cleanedData.organization_id;
    }

    console.log('[Transactions API] Updating transaction:', transactionId, cleanedData);

    const { data, error } = await getSupabaseAdmin()
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
    
    // Perform currency conversion if the transaction is not in USD
    if (responseData.currency !== 'USD') {
      await performCurrencyConversion(responseData.uuid, responseData.currency, responseData.value, responseData.value_date || responseData.transaction_date);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Transactions API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('uuid'); // Support both for compatibility

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

    const { error } = await getSupabaseAdmin()
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