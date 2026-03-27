import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch transaction documents
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const activityId = searchParams.get('activityId');

    // TODO: Add authentication when auth pattern is established
    const user = { id: 'system' }; // Temporary user for development

    let query = supabase
      .from('transaction_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (transactionId) {
      query = query.eq('transaction_id', transactionId);
    }

    if (activityId) {
      query = query.eq('activity_id', activityId);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Error fetching transaction documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Map snake_case DB fields to camelCase for the frontend
    const mapped = (documents || []).map((doc: any) => ({
      id: doc.id,
      transactionId: doc.transaction_id,
      fileName: doc.file_name,
      fileSize: doc.file_size || 0,
      fileType: doc.file_type,
      fileUrl: doc.file_url,
      externalUrl: doc.external_url,
      description: doc.description,
      documentType: doc.document_type,
      uploadedAt: doc.created_at,
      uploadedBy: doc.uploaded_by,
    }));

    return NextResponse.json({ documents: mapped });

  } catch (error) {
    console.error('Transaction documents API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add external document link
export async function POST(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const {
      transactionId,
      activityId,
      externalUrl,
      fileName,
      description,
      documentType = 'evidence'
    } = await request.json();

    if (!transactionId || !externalUrl || !fileName) {
      return NextResponse.json({
        error: 'Transaction ID, external URL, and file name are required'
      }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(externalUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Save external document record to database
    const { data: document, error: dbError } = await supabase
      .from('transaction_documents')
      .insert({
        transaction_id: transactionId,
        activity_id: activityId || null,
        file_name: fileName,
        file_size: 0,
        file_type: 'external',
        external_url: externalUrl,
        description: description || null,
        document_type: documentType,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
    }

    return NextResponse.json({
      id: document.id,
      fileName: document.file_name,
      fileSize: 0,
      fileType: 'external',
      externalUrl: document.external_url,
      description: document.description,
      documentType: document.document_type,
      uploadedAt: document.created_at
    });

  } catch (error) {
    console.error('External document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove document
export async function DELETE(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Get document details first
    const { data: document, error: fetchError } = await supabase
      .from('transaction_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from storage if it's not an external URL
    if (document.file_url && !document.external_url) {
      const filePath = document.file_url.split('/').slice(-2).join('/'); // Get relative path
      await supabase.storage
        .from('transaction-documents')
        .remove([filePath]);
    }

    // Delete document record from database
    const { error: deleteError } = await supabase
      .from('transaction_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Rename document
export async function PATCH(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const { fileName } = await request.json();

    if (!documentId || !fileName) {
      return NextResponse.json({ error: 'Document ID and file name are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('transaction_documents')
      .update({ file_name: fileName })
      .eq('id', documentId);

    if (error) {
      console.error('Rename document error:', error);
      return NextResponse.json({ error: 'Failed to rename document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rename document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}