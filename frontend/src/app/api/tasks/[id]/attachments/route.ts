import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { TaskAttachmentType } from '@/types/task';

export const dynamic = 'force-dynamic';

// Helper to check task access
async function checkTaskAccess(
  supabase: any,
  taskId: string,
  userId: string
): Promise<{ hasAccess: boolean; isCreator: boolean; isSuperUser: boolean; task: any }> {
  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  const isSuperUser = user?.role === 'super_user';

  // Get task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, created_by')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { hasAccess: false, isCreator: false, isSuperUser, task: null };
  }

  const isCreator = task.created_by === userId;

  // Check if user is assignee or has share
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('id')
    .eq('task_id', taskId)
    .eq('assignee_id', userId)
    .single();

  const { data: share } = await supabase
    .from('task_shares')
    .select('id')
    .eq('task_id', taskId)
    .eq('shared_with_id', userId)
    .single();

  const hasAccess = isSuperUser || isCreator || !!assignment || !!share;

  return { hasAccess, isCreator, isSuperUser, task };
}

// GET /api/tasks/[id]/attachments - List attachments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: taskId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check access
    const { hasAccess, task } = await checkTaskAccess(supabase, taskId, userId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch attachments
    const { data: attachments, error } = await supabase
      .from('task_attachments')
      .select(`
        *,
        uploader:users!uploaded_by_user_id(id, first_name, last_name, email, avatar_url)
      `)
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('[Attachments API] Error fetching attachments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: attachments || [],
    });
  } catch (error) {
    console.error('[Attachments API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/attachments - Add attachment to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: taskId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Parse form data (for file uploads)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const description = formData.get('description') as string | null;
    const attachmentType = (formData.get('attachment_type') as TaskAttachmentType) || 'document';

    if (!userId || !file) {
      return NextResponse.json({
        error: 'User ID and file are required'
      }, { status: 400 });
    }

    // Check access - only creators and super users can add attachments
    const { hasAccess, isCreator, isSuperUser, task } = await checkTaskAccess(supabase, taskId, userId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!isCreator && !isSuperUser) {
      return NextResponse.json({
        error: 'Only task creators can add attachments'
      }, { status: 403 });
    }

    // Generate file path: taskId/timestamp_filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${taskId}/${timestamp}_${sanitizedFileName}`;

    // Upload file to storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Attachments API] Upload error:', uploadError);
      return NextResponse.json({
        error: 'Failed to upload file: ' + uploadError.message
      }, { status: 500 });
    }

    // Create attachment record
    const { data: attachment, error: createError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        file_path: uploadData.path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        description: description || null,
        attachment_type: attachmentType,
        uploaded_by_user_id: userId,
        uploaded_at: new Date().toISOString(),
      })
      .select(`
        *,
        uploader:users!uploaded_by_user_id(id, first_name, last_name, email, avatar_url)
      `)
      .single();

    if (createError) {
      // Try to clean up uploaded file
      await supabase.storage.from('task-attachments').remove([uploadData.path]);
      console.error('[Attachments API] Error creating record:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    console.log('[Attachments API] Attachment created:', attachment.id);

    return NextResponse.json({
      success: true,
      data: attachment,
    }, { status: 201 });
  } catch (error) {
    console.error('[Attachments API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/attachments - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: taskId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const attachmentId = searchParams.get('attachmentId');

    if (!userId || !attachmentId) {
      return NextResponse.json({
        error: 'User ID and attachment ID are required'
      }, { status: 400 });
    }

    // Check access
    const { isCreator, isSuperUser, task } = await checkTaskAccess(supabase, taskId, userId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!isCreator && !isSuperUser) {
      return NextResponse.json({
        error: 'Only task creators can delete attachments'
      }, { status: 403 });
    }

    // Get attachment to find file path
    const { data: attachment, error: fetchError } = await supabase
      .from('task_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('task-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      console.warn('[Attachments API] Storage delete warning:', storageError);
      // Continue anyway - record delete is more important
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      console.error('[Attachments API] Error deleting record:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('[Attachments API] Attachment deleted:', attachmentId);

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted',
    });
  } catch (error) {
    console.error('[Attachments API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
