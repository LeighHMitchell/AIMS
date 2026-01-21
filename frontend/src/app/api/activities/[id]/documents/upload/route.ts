import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateThumbnail, supportsThumbnail } from '@/lib/thumbnail-generator';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    console.log('[Upload API] Starting upload for activity:', id);
    if (!supabase) {
      console.error('[Upload API] Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { id: activityId } = await params;
    console.log('[Upload API] Activity ID:', activityId);

    // TODO: Add authentication when auth pattern is established
    const user = { id: 'system' }; // Temporary user for development

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[Upload API] No file provided in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Upload API] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json',
      'application/xml',
      'text/xml'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF, images, Office documents, or text files.' 
      }, { status: 400 });
    }

    // Check if activity exists (simplified permission check for now)
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, created_by')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      console.error('Activity not found:', activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Simplified permission check - allow all authenticated users for now
    // TODO: Implement proper permission checking later
    console.log('Activity found:', activity.id);

    // Generate unique filename and storage path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const uniqueId = uuidv4();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${activityId}/${uniqueId}.${fileExtension}`;
    const originalStoragePath = `${activityId}/originals/${uniqueId}_${sanitizedFileName}`;

    console.log('[Upload API] Uploading to storage path:', storagePath);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('activity-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload API] Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage', 
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('[Upload API] File uploaded successfully:', uploadData);

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

    // Create document record in database with minimal required fields
    const titleText = file.name.replace(/\.[^/.]+$/, '');
    const documentData: any = {
      activity_id: activityId,
      url: urlData.publicUrl,
      format: file.type,
      title: [{ text: titleText, lang: 'en' }], // Keep as array, Supabase will handle JSONB conversion
      category_code: 'A01',
      file_name: file.name,
      file_size: file.size,
      is_external: false,
      file_path: storagePath
    };

    // Add optional fields only if they have values
    if (thumbnailUrl) {
      documentData.thumbnail_url = thumbnailUrl;
    }

    console.log('[Upload API] Inserting document record:', documentData);

    const { data: document, error: dbError } = await supabase
      .from('activity_documents')
      .insert(documentData)
      .select()
      .single();

    if (dbError) {
      console.error('[Upload API] Database insert error:', {
        error: dbError,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('activity-documents')
        .remove([storagePath]);

      if (thumbnailUrl) {
        const thumbnailStoragePath = `${activityId}/thumbnails/${uniqueId}_thumb.jpg`;
        await supabase.storage
          .from('activity-documents')
          .remove([thumbnailStoragePath]);
      }

      return NextResponse.json({ 
        error: 'Failed to save document record',
        details: dbError.message,
        hint: dbError.hint 
      }, { status: 500 });
    }

    // Insert default category into junction table
    const { error: categoryError } = await supabase
      .from('activity_document_categories')
      .insert({
        document_id: document.id,
        category_code: 'A01'
      });

    if (categoryError) {
      console.error('[Upload API] Error inserting default category:', categoryError);
      // Don't fail the whole request, category is still in main table
    }

    // Return the created document in a format compatible with the frontend
    return NextResponse.json({
      id: document.id,
      url: document.url,
      fileName: document.file_name,
      fileSize: document.file_size,
      mimeType: document.format,
      thumbnailUrl: document.thumbnail_url,
      uploadedAt: document.created_at,
      // IATI format for immediate use
      document: {
        url: document.url,
        format: document.format,
        title: document.title,
        description: document.description,
        categoryCode: document.category_code,
        languageCodes: document.language_codes,
        documentDate: document.document_date,
        recipientCountries: document.recipient_countries,
        thumbnailUrl: document.thumbnail_url,
        isImage: document.format?.startsWith('image/') || false,
        // Metadata
        _id: document.id,
        _fileName: document.file_name,
        _fileSize: document.file_size,
        _isExternal: false,
        _createdAt: document.created_at,
      }
    });

  } catch (error) {
    console.error('Upload API error:', error);
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
