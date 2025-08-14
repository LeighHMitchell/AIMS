import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateThumbnail, supportsThumbnail } from '@/lib/thumbnail-generator';

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

    // Create a unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    
    // Define upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents', activityId || 'temp');
    
    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true });
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const filePath = join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);
    
    // Generate public URL
    const publicUrl = `/uploads/documents/${activityId || 'temp'}/${uniqueFilename}`;
    
    // Generate thumbnail if supported
    let thumbnailUrl: string | null = null;
    if (supportsThumbnail(file.type)) {
      try {
        const thumbnailDir = join(process.cwd(), 'public', 'uploads', 'thumbnails', activityId || 'temp');
        const thumbnailResult = await generateThumbnail(filePath, file.type, thumbnailDir);
        if (thumbnailResult) {
          thumbnailUrl = thumbnailResult.thumbnailUrl;
        }
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
      uploadedAt: new Date().toISOString()
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
