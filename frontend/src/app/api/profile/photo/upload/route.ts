import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - only images
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image file (JPEG, PNG, GIF, or WebP)' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for profile photos)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate environment variable
    const VERCEL_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!VERCEL_BLOB_TOKEN) {
      return NextResponse.json(
        { error: 'Cloud storage not configured' },
        { status: 500 }
      );
    }

    // Create a unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    
    // Upload to Vercel Blob storage
    const blob = await put(`profiles/${uniqueFilename}`, file, {
      access: 'public',
      token: VERCEL_BLOB_TOKEN,
    });
    
    // Use the cloud URL
    const publicUrl = blob.url;
    
    return NextResponse.json({
      url: publicUrl,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile photo' },
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