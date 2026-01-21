import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/results/[id]/references - Fetch all references for a result
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('result_references')
      .select('*')
      .eq('result_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Result References API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ references: data || [] });
  } catch (error) {
    console.error('[Result References API] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/results/[id]/references - Create a new reference
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.vocabulary || !body.code) {
      return NextResponse.json({
        error: 'Vocabulary and code are required'
      }, { status: 400 });
    }

    const insertData = {
      result_id: id,
      vocabulary: body.vocabulary,
      code: body.code,
      vocabulary_uri: body.vocabulary_uri || null
    };

    const { data, error } = await supabase
      .from('result_references')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Result References API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reference: data }, { status: 201 });
  } catch (error) {
    console.error('[Result References API] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/results/[id]/references - Delete a reference
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get('referenceId');

    if (!referenceId) {
      return NextResponse.json({
        error: 'Reference ID is required'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('result_references')
      .delete()
      .eq('id', referenceId)
      .eq('result_id', id);

    if (error) {
      console.error('[Result References API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Result References API] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
