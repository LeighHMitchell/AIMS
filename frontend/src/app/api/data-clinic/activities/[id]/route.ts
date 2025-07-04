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
      default_aid_type: 'default_aid_type',
      default_finance_type: 'default_finance_type',
      default_flow_type: 'default_flow_type',
      activityStatus: 'activity_status',
      tied_status: 'tied_status'
    };

    const dbField = fieldMap[field] || field;

    // Get the old value for logging
    const { data: oldData, error: fetchError } = await supabase
      .from('activities')
      .select(dbField)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Update the field
    const updateData = { [dbField]: value || null };
    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating activity:', updateError);
      return NextResponse.json(
        { error: 'Failed to update activity' },
        { status: 500 }
      );
    }

    // Log the change
    if (userId) {
      await supabase
        .from('change_log')
        .insert({
          entity_type: 'activity',
          entity_id: id,
          field: dbField,
          old_value: oldData[dbField],
          new_value: value,
          user_id: userId
        });
    }

    return NextResponse.json(updatedActivity);
  } catch (error) {
    console.error('Error in PATCH /api/data-clinic/activities/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 