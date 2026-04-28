import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET - List government input documents for an activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('government_input_documents')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('[GovInputDocs] Error fetching:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Resolve uploader names in one batch so we can surface "by <Name>" in the UI
    const uploaderIds = Array.from(
      new Set(
        (documents || [])
          .map((d: any) => d.uploaded_by)
          .filter((id: string | null): id is string => !!id)
      )
    );

    const uploaderMap = new Map<string, string>();
    if (uploaderIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', uploaderIds);
      (users || []).forEach((u: any) => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
        if (name) uploaderMap.set(u.id, name);
      });
    }

    // Generate signed URLs
    const docsWithUrls = await Promise.all(
      (documents || []).map(async (doc: any) => {
        const { data: signedData } = await supabase.storage
          .from('government-input-documents')
          .createSignedUrl(doc.file_path, 3600);

        return {
          id: doc.id,
          fileName: doc.file_name,
          fileSize: doc.file_size,
          mimeType: doc.mime_type,
          category: doc.category,
          signedUrl: signedData?.signedUrl || null,
          uploadedAt: doc.created_at,
          uploadedBy: doc.uploaded_by ? uploaderMap.get(doc.uploaded_by) || null : null,
        };
      })
    );

    return NextResponse.json({ documents: docsWithUrls });
  } catch (error) {
    console.error('[GovInputDocs] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Upload a government input document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const filePath = `${activityId}/${category}/${Date.now()}_${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('government-input-documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[GovInputDocs] Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Insert metadata row
    const { data: doc, error: insertError } = await supabase
      .from('government_input_documents')
      .insert({
        activity_id: activityId,
        category,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup uploaded file on metadata failure
      await supabase.storage.from('government-input-documents').remove([filePath]);
      console.error('[GovInputDocs] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Generate signed URL for the response
    const { data: signedData } = await supabase.storage
      .from('government-input-documents')
      .createSignedUrl(filePath, 3600);

    // Resolve uploader name so the UI can show "by <Name>" without a refetch
    let uploadedByName: string | null = null;
    if (user?.id) {
      const { data: uploader } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      if (uploader) {
        uploadedByName = [uploader.first_name, uploader.last_name].filter(Boolean).join(' ').trim() || null;
      }
    }

    return NextResponse.json({
      document: {
        id: doc.id,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        category: doc.category,
        signedUrl: signedData?.signedUrl || null,
        uploadedAt: doc.created_at,
        uploadedBy: uploadedByName,
      },
    });
  } catch (error) {
    console.error('[GovInputDocs] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH - Rename a government input document (updates the `file_name` column;
 * the underlying Storage object path is unchanged).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : '';
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const { data: doc, error } = await supabase
      .from('government_input_documents')
      .update({ file_name: fileName })
      .eq('id', docId)
      .eq('activity_id', activityId)
      .select()
      .single();

    if (error || !doc) {
      console.error('[GovInputDocs] Rename error:', error);
      return NextResponse.json({ error: error?.message || 'Rename failed' }, { status: 500 });
    }

    const { data: signedData } = await supabase.storage
      .from('government-input-documents')
      .createSignedUrl(doc.file_path, 3600);

    return NextResponse.json({
      document: {
        id: doc.id,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        category: doc.category,
        signedUrl: signedData?.signedUrl || null,
        uploadedAt: doc.created_at,
      },
    });
  } catch (error) {
    console.error('[GovInputDocs] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Remove a government input document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Fetch the document to get file_path
    const { data: doc, error: fetchError } = await supabase
      .from('government_input_documents')
      .select('*')
      .eq('id', docId)
      .eq('activity_id', activityId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('government-input-documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.warn('[GovInputDocs] Storage delete warning:', storageError);
    }

    // Delete metadata row
    const { error: deleteError } = await supabase
      .from('government_input_documents')
      .delete()
      .eq('id', docId);

    if (deleteError) {
      console.error('[GovInputDocs] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[GovInputDocs] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
