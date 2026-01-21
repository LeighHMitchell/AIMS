import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateThumbnail, supportsThumbnail } from '@/lib/thumbnail-generator';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// Fallback upload that saves to activities.documents JSON field
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    console.log('[Upload Fallback API] Starting upload for activity:', id);
    if (!supabase) {
      console.error('[Upload Fallback API] Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { id: activityId } = await params;
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Upload Fallback API] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Generate unique filename and storage path
    const uniqueId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const storagePath = `${activityId}/${uniqueId}.${fileExtension}`;

    console.log('[Upload Fallback API] Uploading to storage path:', storagePath);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('activity-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload Fallback API] Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage', 
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('[Upload Fallback API] File uploaded successfully');

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('activity-documents')
      .getPublicUrl(storagePath);

    let thumbnailUrl: string | null = null;

    // Generate thumbnail if supported
    if (supportsThumbnail(file.type)) {
      try {
        // Create temporary file for thumbnail generation
        const tempDir = join(process.cwd(), 'temp', 'thumbnails');
        await mkdir(tempDir, { recursive: true });
        
        const tempFilePath = join(tempDir, `${uniqueId}.${fileExtension}`);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(tempFilePath, buffer);

        // Generate thumbnail
        const thumbnailResult = await generateThumbnail(tempFilePath, file.type, tempDir);
        
        if (thumbnailResult) {
          // Upload thumbnail to Supabase Storage
          const thumbnailBuffer = await require('fs').promises.readFile(thumbnailResult.thumbnailPath);
          const thumbnailStoragePath = `${activityId}/thumbnails/${uniqueId}_thumb.jpg`;
          
          const { data: thumbUploadData, error: thumbUploadError } = await supabase.storage
            .from('activity-documents')
            .upload(thumbnailStoragePath, thumbnailBuffer, {
              cacheControl: '3600',
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabase.storage
              .from('activity-documents')
              .getPublicUrl(thumbnailStoragePath);
            thumbnailUrl = thumbUrlData.publicUrl;
          }

          // Clean up temporary files
          await unlink(thumbnailResult.thumbnailPath);
        }

        // Clean up temporary original file
        await unlink(tempFilePath);

      } catch (error) {
        console.error('Thumbnail generation failed:', error);
        // Continue without thumbnail - not a critical error
      }
    }

    // Create IATI document object
    const newDocument = {
      url: urlData.publicUrl,
      format: file.type,
      title: [{ text: file.name.replace(/\.[^/.]+$/, ''), lang: 'en' }],
      description: [{ text: '', lang: 'en' }],
      categoryCode: 'A01',
      languageCodes: ['en'],
      documentDate: new Date().toISOString().split('T')[0],
      recipientCountries: [],
      thumbnailUrl: thumbnailUrl,
      isImage: file.type.startsWith('image/'),
      // Metadata
      _fileName: file.name,
      _fileSize: file.size,
      _isExternal: false,
      _createdAt: new Date().toISOString(),
    };

    // Get existing activity documents
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('documents')
      .eq('id', activityId)
      .single();

    if (activityError) {
      console.error('[Upload Fallback API] Activity not found:', activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Add new document to existing documents array
    const existingDocuments = activity.documents ? JSON.parse(activity.documents) : [];
    const updatedDocuments = [...existingDocuments, newDocument];

    // Update activity with new documents array
    const { error: updateError } = await supabase
      .from('activities')
      .update({ documents: JSON.stringify(updatedDocuments) })
      .eq('id', activityId);

    if (updateError) {
      console.error('[Upload Fallback API] Failed to update activity documents:', updateError);
      
      // Clean up uploaded file
      await supabase.storage
        .from('activity-documents')
        .remove([storagePath]);

      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    console.log('[Upload Fallback API] Document saved successfully');

    // Return the created document
    return NextResponse.json({
      id: uniqueId,
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      thumbnailUrl: thumbnailUrl,
      uploadedAt: new Date().toISOString(),
      document: newDocument
    });

  } catch (error) {
    console.error('[Upload Fallback API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
