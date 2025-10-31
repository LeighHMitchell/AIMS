import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cleanFieldValue } from '@/lib/transaction-field-cleaner';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const { id } = params;
  const body = await request.json();
  const { field, value, userId } = body;

  try {
    // Validate inputs
    if (!field || value === undefined) {
      return NextResponse.json(
        { error: 'Field and value are required' },
        { status: 400 }
      );
    }

    // Map field names to database columns
    const fieldMap: Record<string, string> = {
      financeType: 'finance_type',
      aidType: 'aid_type',
      flowType: 'flow_type',
      transactionType: 'transaction_type',
      transactionDate: 'transaction_date',
      tiedStatus: 'tied_status',
      disbursementChannel: 'disbursement_channel',
      isHumanitarian: 'is_humanitarian',
    };

    const dbField = fieldMap[field] || field;

    // Get the old value for logging
    // For finance_type, also fetch finance_type_inherited to check if it should stay inherited
    const selectFields = dbField === 'finance_type' 
      ? 'finance_type, finance_type_inherited' 
      : dbField;
    
    const { data: oldData, error: fetchError } = await supabase
      .from('transactions')
      .select(selectFields)
      .eq('uuid', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Clean the value based on field type - CRITICAL: preserves false for boolean fields
    const cleanedValue = cleanFieldValue(dbField, value);
    
    // Update the field
    const updateData: any = { [dbField]: cleanedValue };
    
    // Smart logic for finance_type_inherited:
    // - If value unchanged and was inherited, keep as inherited
    // - If value changed, mark as explicit (user confirmed)
    if (dbField === 'finance_type') {
      if (oldData.finance_type === value && oldData.finance_type_inherited === true) {
        // User didn't change the value and it was inherited - keep as inherited (GRAY)
        updateData.finance_type_inherited = true;
      } else {
        // User changed it - mark as explicit (BLACK)
        updateData.finance_type_inherited = false;
      }
    }
    
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('uuid', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      );
    }

    // Log the change
    if (userId) {
      await supabase
        .from('change_log')
        .insert({
          entity_type: 'transaction',
          entity_id: id,
          field: dbField,
          old_value: oldData[dbField],
          new_value: value,
          user_id: userId
        });
    }

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('Error in PATCH /api/data-clinic/transactions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 