import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload API] Starting document upload...');
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Upload API] Database connection failed');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // TODO: Add authentication when auth pattern is established
    const user = { id: 'system' }; // Temporary user for development

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transactionId = formData.get('transactionId') as string;
    const activityId = formData.get('activityId') as string;
    const description = formData.get('description') as string;
    const documentType = formData.get('documentType') as string || 'evidence';

    console.log('[Upload API] Parsed data:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      transactionId,
      activityId,
      documentType
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF, images, Excel, Word, or CSV files.' 
      }, { status: 400 });
    }

    // Check if user has permission to upload documents for this transaction
    if (activityId) {
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .select(`
          id,
          created_by,
          activity_contributors(user_id, role)
        `)
        .eq('id', activityId)
        .single();

      if (activityError || !activity) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
      }

      const hasPermission = activity.created_by === user.id ||
        (activity.activity_contributors && activity.activity_contributors.some((contrib: any) => 
          contrib.user_id === user.id && ['editor', 'admin'].includes(contrib.role)
        ));

      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `transaction-documents/${transactionId}/${timestamp}_${sanitizedFileName}`;

    console.log('[Upload API] Uploading to storage path:', storagePath);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('transaction-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload API] Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: uploadError.message || 'Unknown storage error' 
      }, { status: 500 });
    }

    console.log('[Upload API] Storage upload successful:', uploadData);

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('transaction-documents')
      .getPublicUrl(storagePath);

    console.log('[Upload API] Saving document record to database...');
    
    // Save document record to database
    const { data: document, error: dbError } = await supabase
      .from('transaction_documents')
      .insert({
        transaction_id: transactionId,
        activity_id: activityId || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_url: urlData.publicUrl,
        description: description || null,
        document_type: documentType,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Upload API] Database insert error:', dbError);
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('transaction-documents')
        .remove([storagePath]);

      return NextResponse.json({ 
        error: 'Failed to save document record', 
        details: dbError.message || 'Unknown database error' 
      }, { status: 500 });
    }

    console.log('[Upload API] Document saved successfully:', document);

    return NextResponse.json({
      id: document.id,
      fileName: document.file_name,
      fileSize: document.file_size,
      fileType: document.file_type,
      fileUrl: document.file_url,
      description: document.description,
      documentType: document.document_type,
      uploadedAt: document.created_at
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