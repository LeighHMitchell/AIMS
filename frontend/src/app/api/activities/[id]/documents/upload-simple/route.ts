import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Ultra-simple upload that just saves to Supabase Storage and activities.documents JSON
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Simple Upload API] Starting upload for activity:', params.id);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Simple Upload API] Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const activityId = params.id;
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Simple Upload API] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Generate unique filename and storage path
    const uniqueId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const storagePath = `${activityId}/${uniqueId}.${fileExtension}`;

    console.log('[Simple Upload API] Uploading to storage path:', storagePath);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('activity-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Simple Upload API] Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage', 
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('[Simple Upload API] File uploaded successfully');

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('activity-documents')
      .getPublicUrl(storagePath);

    // Create IATI document object (no thumbnail for now)
    const newDocument = {
      url: urlData.publicUrl,
      format: file.type,
      title: [{ text: file.name.replace(/\.[^/.]+$/, ''), lang: 'en' }],
      description: [{ text: '', lang: 'en' }],
      categoryCode: 'A01',
      languageCodes: ['en'],
      documentDate: new Date().toISOString().split('T')[0],
      recipientCountries: [],
      isImage: file.type.startsWith('image/'),
      // Metadata
      _fileName: file.name,
      _fileSize: file.size,
      _isExternal: false,
      _createdAt: new Date().toISOString(),
    };

    console.log('[Simple Upload API] Created document object:', newDocument);

    // Get existing activity documents
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('documents')
      .eq('id', activityId)
      .single();

    if (activityError) {
      console.error('[Simple Upload API] Activity not found:', activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    console.log('[Simple Upload API] Activity found, existing documents:', activity.documents);

    // Add new document to existing documents array
    let existingDocuments = [];
    try {
      existingDocuments = activity.documents ? JSON.parse(activity.documents) : [];
    } catch (e) {
      console.log('[Simple Upload API] No existing documents or parse error, starting fresh');
      existingDocuments = [];
    }
    
    const updatedDocuments = [...existingDocuments, newDocument];

    console.log('[Simple Upload API] Updating activity with documents count:', updatedDocuments.length);

    // Update activity with new documents array
    const { error: updateError } = await supabase
      .from('activities')
      .update({ documents: JSON.stringify(updatedDocuments) })
      .eq('id', activityId);

    if (updateError) {
      console.error('[Simple Upload API] Failed to update activity documents:', updateError);
      
      // Clean up uploaded file
      await supabase.storage
        .from('activity-documents')
        .remove([storagePath]);

      return NextResponse.json({ 
        error: 'Failed to save document',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('[Simple Upload API] Document saved successfully');

    // Return the created document
    return NextResponse.json({
      id: uniqueId,
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      document: newDocument
    });

  } catch (error) {
    console.error('[Simple Upload API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
