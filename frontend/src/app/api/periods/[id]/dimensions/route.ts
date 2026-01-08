import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/periods/[id]/dimensions - Fetch all dimensions for a period
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dimensionType = searchParams.get('type'); // 'target' or 'actual'

    let query = supabase
      .from('period_dimensions')
      .select('*')
      .eq('period_id', id);

    if (dimensionType && (dimensionType === 'target' || dimensionType === 'actual')) {
      query = query.eq('dimension_type', dimensionType);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('[Period Dimensions API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dimensions: data || [] });
  } catch (error) {
    console.error('[Period Dimensions API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/periods/[id]/dimensions - Create a new dimension
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.name || !body.value || !body.dimension_type) {
      return NextResponse.json({ 
        error: 'Name, value, and dimension_type are required' 
      }, { status: 400 });
    }

    if (body.dimension_type !== 'target' && body.dimension_type !== 'actual') {
      return NextResponse.json({ 
        error: 'Dimension type must be either "target" or "actual"' 
      }, { status: 400 });
    }

    const insertData = {
      period_id: id,
      dimension_type: body.dimension_type,
      name: body.name,
      value: body.value
    };

    const { data, error } = await supabase
      .from('period_dimensions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Period Dimensions API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dimension: data }, { status: 201 });
  } catch (error) {
    console.error('[Period Dimensions API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE /api/periods/[id]/dimensions - Delete a dimension
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dimensionId = searchParams.get('dimensionId');

    if (!dimensionId) {
      return NextResponse.json({ 
        error: 'Dimension ID is required' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('period_dimensions')
      .delete()
      .eq('id', dimensionId)
      .eq('period_id', id);

    if (error) {
      console.error('[Period Dimensions API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Period Dimensions API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

