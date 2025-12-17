import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/faq/[id]/attachments/[attachmentId]
 * Delete a FAQ attachment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id: faqId, attachmentId } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get the attachment to find the file path
    const { data: attachment, error: fetchError } = await supabase
      .from('faq_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('faq_id', faqId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Try to delete the file from storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey && attachment.file_url) {
      try {
        const storageClient = createClient(supabaseUrl, supabaseServiceKey);

        // Extract the path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/uploads/faq-attachments/...
        const urlParts = attachment.file_url.split('/uploads/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          console.log('[FAQ Attachment Delete] Deleting file:', storagePath);

          const { error: deleteError } = await storageClient.storage
            .from('uploads')
            .remove([storagePath]);

          if (deleteError) {
            console.warn('[FAQ Attachment Delete] Failed to delete file from storage:', deleteError);
            // Continue anyway - the database record will be deleted
          }
        }
      } catch (storageError) {
        console.warn('[FAQ Attachment Delete] Storage deletion error:', storageError);
        // Continue anyway
      }
    }

    // Delete the database record
    const { error } = await supabase
      .from('faq_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('[FAQ Attachment Delete] Error deleting record:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('[FAQ Attachment Delete] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
