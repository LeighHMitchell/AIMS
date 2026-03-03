import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id, docId } = await params;
  const body = await request.json();
  const updates: Record<string, string> = {};

  if (body.file_name && typeof body.file_name === 'string') {
    updates.file_name = body.file_name.trim();
  }
  if (body.document_type && typeof body.document_type === 'string') {
    updates.document_type = body.document_type;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabase!
    .from('project_documents')
    .update(updates)
    .eq('id', docId)
    .eq('project_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id, docId } = await params;

  // Get the document to find the file path
  const { data: doc, error: fetchError } = await supabase!
    .from('project_documents')
    .select('file_path')
    .eq('id', docId)
    .eq('project_id', id)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Delete from storage
  await supabase!.storage.from('project-documents').remove([doc.file_path]);

  // Delete metadata row
  const { error: deleteError } = await supabase!
    .from('project_documents')
    .delete()
    .eq('id', docId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
