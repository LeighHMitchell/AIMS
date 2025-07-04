import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await request.json();
  const { entity, field, value, ids, user_id } = body;

  try {
    // Validate inputs
    if (!entity || !field || value === undefined || !ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'Entity, field, value, and ids are required' },
        { status: 400 }
      );
    }

    // Map entity types to table names
    const entityMap: Record<string, string> = {
      activity: 'activities',
      transaction: 'transactions',
      organization: 'organizations'
    };

    const tableName = entityMap[entity];
    if (!tableName) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Map field names to database columns based on entity type
    let dbField = field;
    if (entity === 'activity') {
      const fieldMap: Record<string, string> = {
        default_aid_type: 'default_aid_type',
        default_finance_type: 'default_finance_type',
        default_flow_type: 'default_flow_type',
        activityStatus: 'activity_status',
        tied_status: 'tied_status'
      };
      dbField = fieldMap[field] || field;
    } else if (entity === 'transaction') {
      const fieldMap: Record<string, string> = {
        financeType: 'finance_type',
        aidType: 'aid_type',
        defaultFlowType: 'default_flow_type',
        transactionType: 'transaction_type'
      };
      dbField = fieldMap[field] || field;
    } else if (entity === 'organization') {
      const fieldMap: Record<string, string> = {
        type: 'type',
        default_currency: 'default_currency',
        identifier: 'identifier',
        acronym: 'acronym'
      };
      dbField = fieldMap[field] || field;
    }

    // Get old values for change logging
    const idColumn = entity === 'transaction' ? 'uuid' : 'id';
    const { data: oldData, error: fetchError } = await supabase
      .from(tableName)
      .select(`${idColumn}, ${dbField}`)
      .in(idColumn, ids);

    if (fetchError) {
      console.error('Error fetching old values:', fetchError);
    }

    // Perform bulk update
    const updateData = { [dbField]: value || null };
    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .in(idColumn, ids);

    if (updateError) {
      console.error('Error performing bulk update:', updateError);
      return NextResponse.json(
        { error: 'Failed to update records' },
        { status: 500 }
      );
    }

    // Log changes
    if (user_id && oldData) {
      const changeLogs = oldData.map((record: any) => ({
        entity_type: entity,
        entity_id: record[idColumn],
        field: dbField,
        old_value: record[dbField],
        new_value: value,
        user_id: user_id
      }));

      await supabase
        .from('change_log')
        .insert(changeLogs);
    }

    return NextResponse.json({
      success: true,
      updated: ids.length,
      message: `Successfully updated ${ids.length} ${entity} records`
    });

  } catch (error) {
    console.error('Error in PATCH /api/data-clinic/bulk-update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 