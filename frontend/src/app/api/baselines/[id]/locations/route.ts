import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/baselines/[id]/locations - Fetch all locations for a baseline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('baseline_locations')
      .select('*')
      .eq('baseline_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Baseline Locations API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ locations: data || [] });
  } catch (error) {
    console.error('[Baseline Locations API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/baselines/[id]/locations - Create a new location reference
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

    if (!body.location_ref) {
      return NextResponse.json({ 
        error: 'Location reference is required' 
      }, { status: 400 });
    }

    const insertData = {
      baseline_id: params.id,
      location_ref: body.location_ref
    };

    const { data, error } = await supabase
      .from('baseline_locations')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Baseline Locations API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data }, { status: 201 });
  } catch (error) {
    console.error('[Baseline Locations API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE /api/baselines/[id]/locations - Delete a location reference
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
      .from('baseline_locations')
      .delete()
      .eq('id', locationId)
      .eq('baseline_id', params.id);

    if (error) {
      console.error('[Baseline Locations API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Baseline Locations API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

