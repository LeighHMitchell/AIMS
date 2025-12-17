import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FAQQuestionRow, toFAQQuestion, FAQQuestionStatus } from '@/types/faq-enhanced';

export const dynamic = 'force-dynamic';

/**
 * GET /api/faq/questions/[id]
 * Get a single question by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('faq_questions')
      .select(`
        *,
        users!faq_questions_user_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        assigned_user:users!faq_questions_assigned_to_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        faq:faq!faq_questions_linked_faq_id_fkey (
          id,
          question,
          answer,
          category
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }
      console.error('[FAQ Question] Error fetching:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toFAQQuestion(data as FAQQuestionRow),
    });
  } catch (error) {
    console.error('[FAQ Question] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/faq/questions/[id]
 * Update a question (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      question,
      context,
      tags,
      status,
      assignedTo,
      adminNotes,
      linkedFaqId,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (question !== undefined) updateData.question = question.trim();
    if (context !== undefined) updateData.context = context?.trim() || null;
    if (tags !== undefined) updateData.tags = tags || [];
    if (status !== undefined) {
      updateData.status = status as FAQQuestionStatus;
      // Set published_at when status changes to published
      if (status === 'published' && !body.publishedAt) {
        updateData.published_at = new Date().toISOString();
      }
    }
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo || null;
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes?.trim() || null;
    if (linkedFaqId !== undefined) updateData.linked_faq_id = linkedFaqId || null;

    const { data, error } = await supabase
      .from('faq_questions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        users!faq_questions_user_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        assigned_user:users!faq_questions_assigned_to_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        faq:faq!faq_questions_linked_faq_id_fkey (
          id,
          question,
          answer,
          category
        )
      `)
      .single();

    if (error) {
      console.error('[FAQ Question] Error updating:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toFAQQuestion(data as FAQQuestionRow),
      message: 'Question updated successfully',
    });
  } catch (error) {
    console.error('[FAQ Question] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/faq/questions/[id]
 * Delete a question (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { error } = await supabase
      .from('faq_questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[FAQ Question] Error deleting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('[FAQ Question] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
