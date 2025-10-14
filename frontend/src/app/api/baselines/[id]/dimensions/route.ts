import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/baselines/[id]/dimensions - Fetch all dimensions for a baseline
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
      .from('baseline_dimensions')
      .select('*')
      .eq('baseline_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Baseline Dimensions API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dimensions: data || [] });
  } catch (error) {
    console.error('[Baseline Dimensions API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/baselines/[id]/dimensions - Create a new dimension
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

    if (!body.name || !body.value) {
      return NextResponse.json({ 
        error: 'Name and value are required' 
      }, { status: 400 });
    }

    const insertData = {
      baseline_id: params.id,
      name: body.name,
      value: body.value
    };

    const { data, error } = await supabase
      .from('baseline_dimensions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Baseline Dimensions API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dimension: data }, { status: 201 });
  } catch (error) {
    console.error('[Baseline Dimensions API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE /api/baselines/[id]/dimensions - Delete a dimension
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
    const dimensionId = searchParams.get('dimensionId');

    if (!dimensionId) {
      return NextResponse.json({ 
        error: 'Dimension ID is required' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('baseline_dimensions')
      .delete()
      .eq('id', dimensionId)
      .eq('baseline_id', params.id);

    if (error) {
      console.error('[Baseline Dimensions API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Baseline Dimensions API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

