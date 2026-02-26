import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id, docId } = await params;

  // Check permission
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  const role = profile?.role;
  const canDelete = role === 'super_user' || role === 'admin' ||
    role === 'gov_partner_tier_1' || role === 'gov_partner_tier_2';

  if (!canDelete) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Get document to find file_path
  const { data: doc, error: fetchError } = await supabase!
    .from('land_parcel_documents')
    .select('file_path, file_name')
    .eq('id', docId)
    .eq('parcel_id', id)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Delete from storage
  await supabase!.storage.from('land-parcel-documents').remove([doc.file_path]);

  // Delete metadata row
  const { error: deleteError } = await supabase!
    .from('land_parcel_documents')
    .delete()
    .eq('id', docId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
