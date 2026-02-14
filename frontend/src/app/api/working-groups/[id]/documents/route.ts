import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const meetingId = request.nextUrl.searchParams.get('meeting_id');

    let query = supabase
      .from('working_group_documents')
      .select('*')
      .eq('working_group_id', id)
      .order('uploaded_at', { ascending: false });

    if (meetingId) {
      query = query.eq('meeting_id', meetingId);
    } else {
      query = query.is('meeting_id', null);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const documentType = formData.get('document_type') as string || 'other';
    const meetingId = formData.get('meeting_id') as string | null;

    if (!file || !title) {
      return NextResponse.json({ error: 'file and title are required' }, { status: 400 });
    }

    // Upload file to Supabase storage
    const adminClient = getSupabaseAdmin();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name}`;
    const storagePath = `working-groups/${id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await adminClient.storage
      .from('uploads')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('uploads')
      .getPublicUrl(storagePath);

    // Save document metadata
    const { data, error } = await supabase
      .from('working_group_documents')
      .insert([{
        working_group_id: id,
        title,
        description: description || null,
        file_url: urlData.publicUrl,
        file_path: storagePath,
        document_type: documentType,
        meeting_id: meetingId || null,
        uploaded_by: user?.id || null,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const body = await request.json();
    const documentId = body.document_id;

    if (!documentId) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Get document to find storage path
    const { data: doc, error: fetchError } = await supabase
      .from('working_group_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('working_group_id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage if path exists
    if (doc?.file_path) {
      const adminClient = getSupabaseAdmin();
      await adminClient.storage.from('uploads').remove([doc.file_path]);
    }

    // Delete metadata
    const { error } = await supabase
      .from('working_group_documents')
      .delete()
      .eq('id', documentId)
      .eq('working_group_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
