import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[AIMS Users Update] Updating user:', { id, updateData });

    // Prepare the update data, removing any undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    // Add updated timestamp
    cleanUpdateData.updated_at = new Date().toISOString();

    console.log('[AIMS Users Update] Clean update data:', cleanUpdateData);

    // Update the user in the users table
    const { data, error } = await supabase
      .from('users')
      .update(cleanUpdateData)
      .eq('id', id)
      .select(`
        *,
        organizations:organization_id (
          id,
          name,
          type,
          country
        )
      `)
      .single();

    if (error) {
      console.error('[AIMS Users Update] Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[AIMS Users Update] User updated successfully:', data);
    
    // Transform data to match frontend User type expectations
    const transformedData = {
      ...data,
      name: data.name || `${data.first_name || ''} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name || ''}`.trim() || data.email,
      firstName: data.first_name,
      middleName: data.middle_name,
      lastName: data.last_name,
      suffix: data.suffix,
      gender: data.gender,
      profilePicture: data.avatar_url, // Map avatar_url to profilePicture
      organisation: data.organisation || data.organizations?.name,
      organization: data.organizations,
      contactType: data.contact_type,
      faxNumber: data.fax_number,
      notes: data.notes
    };
    
    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[AIMS Users Update] Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
