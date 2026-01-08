import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/indicators/[id]/documents - Fetch all document links for an indicator
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
    const { data, error } = await supabase
      .from('indicator_document_links')
      .select('*')
      .eq('indicator_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Indicator Documents API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error('[Indicator Documents API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/indicators/[id]/documents - Create a new document link
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

    if (!body.url || !body.title) {
      return NextResponse.json({ 
        error: 'URL and title are required' 
      }, { status: 400 });
    }

    const title = typeof body.title === 'string' ? { en: body.title } : body.title;
    const description = body.description 
      ? (typeof body.description === 'string' ? { en: body.description } : body.description)
      : null;

    const insertData = {
      indicator_id: id,
      url: body.url,
      title,
      description,
      format: body.format || null,
      category_code: body.category_code || null,
      language_code: body.language_code || null,
      document_date: body.document_date || null
    };

    const { data, error } = await supabase
      .from('indicator_document_links')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Indicator Documents API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (error) {
    console.error('[Indicator Documents API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE /api/indicators/[id]/documents - Delete a document link
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
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ 
        error: 'Document ID is required' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('indicator_document_links')
      .delete()
      .eq('id', documentId)
      .eq('indicator_id', id);

    if (error) {
      console.error('[Indicator Documents API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Indicator Documents API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

