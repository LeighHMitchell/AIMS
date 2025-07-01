import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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
      transactionDate: 'transaction_date'
    };

    const dbField = fieldMap[field] || field;

    // Get the old value for logging
    const { data: oldData, error: fetchError } = await supabase
      .from('transactions')
      .select(dbField)
      .eq('uuid', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update the field
    const updateData = { [dbField]: value || null };
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