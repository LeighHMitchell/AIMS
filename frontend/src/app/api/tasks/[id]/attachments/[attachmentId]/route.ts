import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id]/attachments/[attachmentId] - Get signed URL for download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id: taskId, attachmentId } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isSuperUser = user?.role === 'super_user';

    // Check if user can access this task
    const { data: task } = await supabase
      .from('tasks')
      .select('id, created_by')
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isCreator = task.created_by === userId;

    // Check assignment or share
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

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get attachment
    const { data: attachment, error: attachmentError } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Create signed URL (valid for 1 hour)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(attachment.file_path, 3600); // 1 hour

    if (signError || !signedUrl) {
      console.error('[Attachments API] Error creating signed URL:', signError);
      return NextResponse.json({
        error: 'Failed to create download URL'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...attachment,
        download_url: signedUrl.signedUrl,
      },
    });
  } catch (error) {
    console.error('[Attachments API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
