import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication before any file operations
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) {
    return authResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    // SECURITY: Ignore client-provided userId - use authenticated user's ID instead
    // const userId = formData.get('userId') as string; // REMOVED - security risk

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Use authenticated user's ID for all operations
    const userId = user!.id;

    console.log('[Feedback Upload] File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      userId
    });

    // Debug: Check if it's a screenshot
    if (file.name.toLowerCase().includes('screenshot') || file.name.toLowerCase().includes('screen shot')) {
      console.log('[Feedback Upload] Screenshot detected:', file.name);
    }

    // Validate file type - allow images and common document types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type: ${file.type}. Please upload images, PDFs, or text documents.`
      }, { status: 400 });
    }

    // Use a more permissive content type for Supabase storage
    // Supabase storage can be strict about MIME types
    let supabaseContentType = 'application/octet-stream';

    if (file.type.startsWith('image/')) {
      supabaseContentType = file.type;
    } else if (file.type === 'application/pdf') {
      supabaseContentType = 'application/pdf';
    } else {
      // For other file types, use octet-stream to avoid MIME type restrictions
      supabaseContentType = 'application/octet-stream';
    }

    // Validate file size (max 10MB for feedback attachments)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File size exceeds 10MB limit'
      }, { status: 400 });
    }

    // Validate Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Feedback Upload] Missing Supabase configuration');
      return NextResponse.json({
        error: 'File upload service not configured'
      }, { status: 500 });
    }

    // Create Supabase client with service role for file operations
    // SECURITY: Only reached after authentication succeeds
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique filename and storage path
    // SECURITY: Path is scoped to authenticated user's ID
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}_${uuidv4()}.${fileExtension}`;
    const storagePath = `feedback-attachments/${userId}/${uniqueFilename}`;

    console.log('[Feedback Upload] Uploading to path:', storagePath);

    // Convert File to ArrayBuffer for Supabase
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, fileBuffer, {
        contentType: supabaseContentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[Feedback Upload] Storage upload error:', uploadError);
      return NextResponse.json({
        error: `Failed to upload file: ${uploadError.message}`
      }, { status: 500 });
    }

    console.log('[Feedback Upload] File uploaded successfully:', uploadData);

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    console.log('[Feedback Upload] Public URL generated:', publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      type: file.type,
      size: file.size,
      path: storagePath,
      uploadedBy: userId
    });

  } catch (error) {
    console.error('[Feedback Upload] Error:', error);
    return NextResponse.json({
      error: 'Internal server error during file upload'
    }, { status: 500 });
  }
}

// OPTIONS for CORS preflight - does not perform any file operations
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
