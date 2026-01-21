import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/results/[id]/documents - Fetch all document links for a result
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
      .from('result_document_links')
      .select('*')
      .eq('result_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Result Documents API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error('[Result Documents API] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/results/[id]/documents - Create a new document link
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
    if (!body.url || !body.title) {
      return NextResponse.json({
        error: 'URL and title are required'
      }, { status: 400 });
    }

    // Ensure title is JSONB
    const title = typeof body.title === 'string'
      ? { en: body.title }
      : body.title;

    const description = body.description
      ? (typeof body.description === 'string' ? { en: body.description } : body.description)
      : null;

    const insertData = {
      result_id: id,
      url: body.url,
      title,
      description,
      format: body.format || null,
      category_code: body.category_code || null,
      language_code: body.language_code || null,
      document_date: body.document_date || null
    };

    const { data, error } = await supabase
      .from('result_document_links')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Result Documents API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (error) {
    console.error('[Result Documents API] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/results/[id]/documents - Update a document link
export async function PUT(
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
    const { documentId, ...updateData } = body;

    if (!documentId) {
      return NextResponse.json({
        error: 'Document ID is required'
      }, { status: 400 });
    }

    // Handle JSONB fields
    if (updateData.title && typeof updateData.title === 'string') {
      updateData.title = { en: updateData.title };
    }
    if (updateData.description && typeof updateData.description === 'string') {
      updateData.description = { en: updateData.description };
    }

    const { data, error } = await supabase
      .from('result_document_links')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('result_id', id)
      .select()
      .single();

    if (error) {
      console.error('[Result Documents API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (error) {
    console.error('[Result Documents API] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/results/[id]/documents - Delete a document link
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
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({
        error: 'Document ID is required'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('result_document_links')
      .delete()
      .eq('id', documentId)
      .eq('result_id', id);

    if (error) {
      console.error('[Result Documents API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Result Documents API] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
