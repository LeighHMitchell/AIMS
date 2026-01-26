import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

/**
 * POST /api/activities/[id]/readiness/[itemId]/upload
 * Upload an evidence document for a checklist item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId, itemId: checklistItemId } = await params;
    console.log('[Readiness Upload API] Starting upload for activity:', activityId, 'item:', checklistItemId);

    if (!activityId || !checklistItemId) {
      return NextResponse.json(
        { error: 'Activity ID and Item ID are required' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[Readiness Upload API] No file provided in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Readiness Upload API] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file size (10MB limit for evidence documents)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF, images, Office documents, or text files.' 
      }, { status: 400 });
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Verify checklist item exists
    const { data: item, error: itemError } = await supabase
      .from('readiness_checklist_items')
      .select('id')
      .eq('id', checklistItemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // Ensure a response record exists for this item
    let responseId: string;

    const { data: existingResponse } = await supabase
      .from('activity_readiness_responses')
      .select('id')
      .eq('activity_id', activityId)
      .eq('checklist_item_id', checklistItemId)
      .single();

    if (existingResponse) {
      responseId = existingResponse.id;
    } else {
      // Create a response record with in_progress status
      const { data: newResponse, error: createError } = await supabase
        .from('activity_readiness_responses')
        .insert({
          activity_id: activityId,
          checklist_item_id: checklistItemId,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (createError || !newResponse) {
        console.error('[Readiness Upload API] Error creating response:', createError);
        return NextResponse.json({ error: 'Failed to create response record' }, { status: 500 });
      }

      responseId = newResponse.id;
    }

    // Generate unique filename and storage path
    const fileExtension = file.name.split('.').pop();
    const uniqueId = uuidv4();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `readiness/${activityId}/${checklistItemId}/${uniqueId}.${fileExtension}`;

    console.log('[Readiness Upload API] Uploading to storage path:', storagePath);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('activity-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Readiness Upload API] Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage', 
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('[Readiness Upload API] File uploaded successfully:', uploadData);

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('activity-documents')
      .getPublicUrl(storagePath);

    // Create evidence document record in database
    const { data: document, error: dbError } = await supabase
      .from('readiness_evidence_documents')
      .insert({
        response_id: responseId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        uploaded_by: user?.id || null,
        uploaded_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('[Readiness Upload API] Database insert error:', dbError);
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('activity-documents')
        .remove([storagePath]);

      return NextResponse.json({ 
        error: 'Failed to save document record',
        details: dbError.message 
      }, { status: 500 });
    }

    // Fetch user name if uploaded_by is set
    let uploadedByUser = null;
    if (document.uploaded_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', document.uploaded_by)
        .single();
      if (userData) {
        uploadedByUser = {
          id: userData.id,
          name: [userData.first_name, userData.last_name].filter(Boolean).join(' ')
        };
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        file_url: document.file_url,
        file_type: document.file_type,
        file_size: document.file_size,
        uploaded_at: document.uploaded_at,
        uploaded_by_user: uploadedByUser,
      }
    });

  } catch (error) {
    console.error('[Readiness Upload API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]/readiness/[itemId]/upload
 * Delete an evidence document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId, itemId: checklistItemId } = await params;
    
    // Get document ID from query params
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Fetch the document to get storage path
    const { data: document, error: fetchError } = await supabase
      .from('readiness_evidence_documents')
      .select('id, storage_path, response_id')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify the document belongs to a response for this activity
    const { data: response } = await supabase
      .from('activity_readiness_responses')
      .select('activity_id')
      .eq('id', document.response_id)
      .single();

    if (!response || response.activity_id !== activityId) {
      return NextResponse.json({ error: 'Document not found for this activity' }, { status: 404 });
    }

    // Delete from storage
    if (document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('activity-documents')
        .remove([document.storage_path]);

      if (storageError) {
        console.error('[Readiness Upload API] Storage delete error:', storageError);
        // Continue to delete database record even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('readiness_evidence_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('[Readiness Upload API] Database delete error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete document record',
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('[Readiness Upload API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
