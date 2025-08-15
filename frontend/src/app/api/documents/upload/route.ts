import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { generateThumbnail, supportsThumbnail } from '@/lib/thumbnail-generator';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';

// Create Supabase client with service role key for file uploads
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const activityId = formData.get('activityId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate Supabase configuration
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase storage not configured' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role for file operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const filePath = `documents/${activityId || 'temp'}/${uniqueFilename}`;
    
    // Convert File to ArrayBuffer for Supabase
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    
    // Generate thumbnail if supported
    let thumbnailUrl: string | null = null;
    if (supportsThumbnail(file.type)) {
      try {
        // Create temporary file for thumbnail generation
        const tempDir = join(process.cwd(), 'temp', 'thumbnails');
        await mkdir(tempDir, { recursive: true });
        
        const tempFilePath = join(tempDir, `${uniqueFilename}`);
        const buffer = Buffer.from(fileBuffer);
        await writeFile(tempFilePath, buffer);

        // Generate thumbnail
        const thumbnailResult = await generateThumbnail(tempFilePath, file.type, tempDir);
        
        if (thumbnailResult) {
          // Upload thumbnail to Supabase Storage
          const thumbnailBuffer = await require('fs').promises.readFile(thumbnailResult.thumbnailPath);
          const thumbnailStoragePath = `documents/${activityId || 'temp'}/thumbnails/${uniqueFilename}_thumb.jpg`;
          
          const { data: thumbUploadData, error: thumbUploadError } = await supabase.storage
            .from('uploads')
            .upload(thumbnailStoragePath, thumbnailBuffer, {
              cacheControl: '3600',
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabase.storage
              .from('uploads')
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
    
    return NextResponse.json({
      url: publicUrl,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      thumbnailUrl,
      uploadedAt: new Date().toISOString(),
      path: data.path
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Add OPTIONS method for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
