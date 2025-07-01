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

    // Get the old value for logging
    const { data: oldData, error: fetchError } = await supabase
      .from('organizations')
      .select(field)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update the field
    const updateData = { [field]: value || null };
    const { data: updatedOrganization, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    // Log the change
    if (userId) {
      await supabase
        .from('change_log')
        .insert({
          entity_type: 'organization',
          entity_id: id,
          field: field,
          old_value: oldData[field],
          new_value: value,
          user_id: userId
        });
    }

    return NextResponse.json(updatedOrganization);
  } catch (error) {
    console.error('Error in PATCH /api/data-clinic/organizations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 