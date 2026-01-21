import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { FAQAttachmentRow, toFAQAttachment } from '@/types/faq-enhanced';

export const dynamic = 'force-dynamic';

/**
 * GET /api/faq/[id]/attachments
 * List all attachments for a FAQ
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: faqId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('faq_attachments')
      .select('*')
      .eq('faq_id', faqId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[FAQ Attachments] Error fetching:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const attachments = (data as FAQAttachmentRow[]).map(toFAQAttachment);

    return NextResponse.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    console.error('[FAQ Attachments] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faq/[id]/attachments
 * Create an attachment record (after file is uploaded)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: faqId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { fileUrl, filename, fileType, fileSize, caption, createdBy } = body;

    // Validation
    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Verify the FAQ exists
    const { data: faq, error: faqError } = await supabase
      .from('faq')
      .select('id')
      .eq('id', faqId)
      .single();

    if (faqError || !faq) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    // Get the current max display_order
    const { data: maxOrderData } = await supabase
      .from('faq_attachments')
      .select('display_order')
      .eq('faq_id', faqId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.display_order ?? -1) + 1;

    // Insert the attachment
    const { data, error } = await supabase
      .from('faq_attachments')
      .insert({
        faq_id: faqId,
        file_url: fileUrl,
        filename,
        file_type: fileType || null,
        file_size: fileSize || null,
        display_order: nextOrder,
        caption: caption || null,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[FAQ Attachments] Error creating:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toFAQAttachment(data as FAQAttachmentRow),
      message: 'Attachment added successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[FAQ Attachments] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
