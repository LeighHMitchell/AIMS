import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/indicators/[id]/references - Fetch all references for an indicator
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
      .from('indicator_references')
      .select('*')
      .eq('indicator_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Indicator References API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ references: data || [] });
  } catch (error) {
    console.error('[Indicator References API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/indicators/[id]/references - Create a new reference
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

    if (!body.vocabulary || !body.code) {
      return NextResponse.json({ 
        error: 'Vocabulary and code are required' 
      }, { status: 400 });
    }

    const insertData = {
      indicator_id: params.id,
      vocabulary: body.vocabulary,
      code: body.code,
      vocabulary_uri: body.vocabulary_uri || null,
      indicator_uri: body.indicator_uri || null  // Indicator references can have indicator_uri
    };

    const { data, error } = await supabase
      .from('indicator_references')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Indicator References API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reference: data }, { status: 201 });
  } catch (error) {
    console.error('[Indicator References API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE /api/indicators/[id]/references - Delete a reference
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
    const referenceId = searchParams.get('referenceId');

    if (!referenceId) {
      return NextResponse.json({ 
        error: 'Reference ID is required' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('indicator_references')
      .delete()
      .eq('id', referenceId)
      .eq('indicator_id', params.id);

    if (error) {
      console.error('[Indicator References API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Indicator References API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

