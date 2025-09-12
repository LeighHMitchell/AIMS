import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: markers, error } = await getSupabaseAdmin()
      .from('policy_markers')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching policy markers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch policy markers' },
        { status: 500 }
      );
    }

    return NextResponse.json(markers || []);
  } catch (error) {
    console.error('Error in policy markers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.marker_type) {
      return NextResponse.json(
        { error: 'Name and marker_type are required' },
        { status: 400 }
      );
    }

    // Use the provided code or generate one if not provided
    // Ensure custom markers always have CUSTOM_ prefix
    const userCode = body.code?.trim();
    const customCode = userCode ? `CUSTOM_${userCode}` : `CUSTOM_${Date.now()}`;
    
    // Prepare marker data (only include fields that exist in the database)
    const markerData = {
      code: customCode,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      marker_type: body.marker_type,
      is_active: true,
      display_order: 999 // Place custom markers at the end
    };

    // Add optional fields if they exist in the database
    if (body.vocabulary_name) {
      markerData.vocabulary_name = body.vocabulary_name.trim();
    }

    const { data: newMarker, error } = await getSupabaseAdmin()
      .from('policy_markers')
      .insert(markerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating policy marker:', error);
      return NextResponse.json(
        { error: 'Failed to create policy marker' },
        { status: 500 }
      );
    }

    return NextResponse.json(newMarker);
  } catch (error) {
    console.error('Error in policy markers POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const markerId = body.id;
    
    if (!markerId) {
      return NextResponse.json(
        { error: 'Marker ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // First check if marker exists and get its code to determine if it's custom
    const { data: existingMarker, error: fetchError } = await getSupabaseAdmin()
      .from('policy_markers')
      .select('code')
      .eq('id', markerId)
      .single();

    if (fetchError) {
      console.error('Error fetching marker:', fetchError);
      return NextResponse.json(
        { error: 'Marker not found' },
        { status: 404 }
      );
    }

    // Only allow editing of custom markers (those with CUSTOM_ prefix)
    if (!existingMarker.code.startsWith('CUSTOM_')) {
      return NextResponse.json(
        { error: 'Cannot edit predefined policy markers' },
        { status: 403 }
      );
    }

    // Prepare updated marker data
    // Ensure custom markers always have CUSTOM_ prefix
    const userCode = body.code?.trim();
    const customCode = userCode ? `CUSTOM_${userCode}` : `CUSTOM_${Date.now()}`;
    
    const updatedData = {
      code: customCode,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      marker_type: body.marker_type || 'other',
      is_active: true
    };

    // Add optional fields if they exist in the database
    if (body.vocabulary_name) {
      updatedData.vocabulary_name = body.vocabulary_name.trim();
    }

    const { data: updatedMarker, error } = await getSupabaseAdmin()
      .from('policy_markers')
      .update(updatedData)
      .eq('id', markerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating policy marker:', error);
      return NextResponse.json(
        { error: 'Failed to update policy marker' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedMarker);
  } catch (error) {
    console.error('Error in policy markers PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const markerId = searchParams.get('id');
    
    if (!markerId) {
      return NextResponse.json(
        { error: 'Marker ID is required' },
        { status: 400 }
      );
    }

    // First check if marker exists and get its code to determine if it's custom
    const { data: marker, error: fetchError } = await getSupabaseAdmin()
      .from('policy_markers')
      .select('code')
      .eq('id', markerId)
      .single();

    if (fetchError) {
      console.error('Error fetching marker:', fetchError);
      return NextResponse.json(
        { error: 'Marker not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of custom markers (those with CUSTOM_ prefix)
    if (!marker.code.startsWith('CUSTOM_')) {
      console.log(`DELETE attempt on non-custom marker: code="${marker.code}"`);
      return NextResponse.json(
        { error: 'Cannot delete predefined policy markers' },
        { status: 403 }
      );
    }

    // Delete the marker
    const { error } = await getSupabaseAdmin()
      .from('policy_markers')
      .delete()
      .eq('id', markerId);

    if (error) {
      console.error('Error deleting policy marker:', error);
      return NextResponse.json(
        { error: 'Failed to delete policy marker' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in policy markers DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
