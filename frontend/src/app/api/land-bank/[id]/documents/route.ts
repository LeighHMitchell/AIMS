import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data: documents, error } = await supabase!
    .from('land_parcel_documents')
    .select('*')
    .eq('parcel_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate signed URLs for each document
  const docsWithUrls = await Promise.all(
    (documents || []).map(async (doc: any) => {
      const { data: signedData } = await supabase!.storage
        .from('land-parcel-documents')
        .createSignedUrl(doc.file_path, 3600); // 1 hour
      return { ...doc, signed_url: signedData?.signedUrl || null };
    })
  );

  return NextResponse.json(docsWithUrls);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const documentType = formData.get('document_type') as string;
  const description = formData.get('description') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!documentType) {
    return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const filePath = `${id}/${documentType}/${Date.now()}_${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase!.storage
    .from('land-parcel-documents')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Insert metadata row
  const { data: doc, error: insertError } = await supabase!
    .from('land_parcel_documents')
    .insert({
      parcel_id: id,
      document_type: documentType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      description: description || null,
      uploaded_by: user!.id,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up uploaded file
    await supabase!.storage.from('land-parcel-documents').remove([filePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log to history
  await supabase!.from('land_parcel_history').insert({
    parcel_id: id,
    action: 'document_uploaded',
    details: { document_type: documentType, file_name: file.name },
    performed_by: user!.id,
  });

  return NextResponse.json(doc);
}
