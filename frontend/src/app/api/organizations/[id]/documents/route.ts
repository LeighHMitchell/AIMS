import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all documents for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const { data: documents, error } = await supabase
      .from('organization_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AIMS] Error fetching organization documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json(documents || []);
  } catch (error) {
    console.error('[AIMS] Unexpected error fetching organization documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json({ error: 'Document URL is required' }, { status: 400 });
    }

    if (!body.titles || body.titles.length === 0 || !body.titles[0]?.narrative) {
      return NextResponse.json({ error: 'Document title is required' }, { status: 400 });
    }

    const documentData = {
      organization_id: organizationId,
      url: body.url,
      format: body.format || null,
      document_date: body.documentDate || body.document_date || null,
      titles: body.titles || [],
      descriptions: body.descriptions || [],
      categories: body.categories || [],
      languages: body.languages || ['en'],
      recipient_countries: body.recipientCountries || body.recipient_countries || [],
      sort_order: body.sort_order ?? 0,
    };

    const { data: document, error } = await supabase
      .from('organization_documents')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error creating organization document:', error);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Unexpected error creating organization document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update documents (bulk update for reordering)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // If updating a single document
    if (body.id) {
      const documentData: Record<string, any> = {};

      if (body.url !== undefined) documentData.url = body.url;
      if (body.format !== undefined) documentData.format = body.format;
      if (body.documentDate !== undefined || body.document_date !== undefined) {
        documentData.document_date = body.documentDate || body.document_date;
      }
      if (body.titles !== undefined) documentData.titles = body.titles;
      if (body.descriptions !== undefined) documentData.descriptions = body.descriptions;
      if (body.categories !== undefined) documentData.categories = body.categories;
      if (body.languages !== undefined) documentData.languages = body.languages;
      if (body.recipientCountries !== undefined || body.recipient_countries !== undefined) {
        documentData.recipient_countries = body.recipientCountries || body.recipient_countries;
      }
      if (body.sort_order !== undefined) documentData.sort_order = body.sort_order;

      const { data: document, error } = await supabase
        .from('organization_documents')
        .update(documentData)
        .eq('id', body.id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[AIMS] Error updating organization document:', error);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
      }

      return NextResponse.json(document);
    }

    // If updating sort order for multiple documents
    if (body.documents && Array.isArray(body.documents)) {
      const updates = body.documents.map((doc: { id: string; sort_order: number }) =>
        supabase
          .from('organization_documents')
          .update({ sort_order: doc.sort_order })
          .eq('id', doc.id)
          .eq('organization_id', organizationId)
      );

      await Promise.all(updates);

      // Fetch updated documents
      const { data: documents, error } = await supabase
        .from('organization_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[AIMS] Error fetching updated documents:', error);
        return NextResponse.json({ error: 'Failed to fetch updated documents' }, { status: 500 });
      }

      return NextResponse.json(documents);
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    console.error('[AIMS] Unexpected error updating organization documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('organization_documents')
      .delete()
      .eq('id', documentId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[AIMS] Error deleting organization document:', error);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS] Unexpected error deleting organization document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
