import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/periods/[id]/locations - Fetch all locations for a period
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const locationType = searchParams.get('type'); // 'target' or 'actual'

    let query = supabase
      .from('period_locations')
      .select('*')
      .eq('period_id', params.id);

    if (locationType && (locationType === 'target' || locationType === 'actual')) {
      query = query.eq('location_type', locationType);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('[Period Locations API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ locations: data || [] });
  } catch (error) {
    console.error('[Period Locations API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/periods/[id]/locations - Create a new location reference
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const body = await request.json();

    if (!body.location_ref || !body.location_type) {
      return NextResponse.json({ 
        error: 'Location reference and location_type are required' 
      }, { status: 400 });
    }

    if (body.location_type !== 'target' && body.location_type !== 'actual') {
      return NextResponse.json({ 
        error: 'Location type must be either "target" or "actual"' 
      }, { status: 400 });
    }

    const insertData = {
      period_id: params.id,
      location_type: body.location_type,
      location_ref: body.location_ref
    };

    const { data, error } = await supabase
      .from('period_locations')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Period Locations API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data }, { status: 201 });
  } catch (error) {
    console.error('[Period Locations API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE /api/periods/[id]/locations - Delete a location reference
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ 
        error: 'Location ID is required' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('period_locations')
      .delete()
      .eq('id', locationId)
      .eq('period_id', params.id);

    if (error) {
      console.error('[Period Locations API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Period Locations API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

