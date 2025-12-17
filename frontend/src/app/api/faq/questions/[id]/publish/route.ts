import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FAQQuestionRow, toFAQQuestion } from '@/types/faq-enhanced';
import { notifyUserOfAnswer } from '@/lib/faq-notifications';
import { sendQuestionAnsweredEmail } from '@/lib/email/faq-emails';

export const dynamic = 'force-dynamic';

/**
 * POST /api/faq/questions/[id]/publish
 * Publish a question as a new FAQ entry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { answer, category, tags } = body;

    // Validation
    if (!answer || !answer.trim()) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Get the question
    const { data: question, error: questionError } = await supabase
      .from('faq_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Create the FAQ entry
    const { data: faq, error: faqError } = await supabase
      .from('faq')
      .insert({
        question: question.question,
        answer: answer.trim(),
        category: category.trim(),
        tags: tags || question.tags || [],
        status: 'published',
        source_question_id: questionId,
      })
      .select()
      .single();

    if (faqError) {
      console.error('[Publish Question] Error creating FAQ:', faqError);
      return NextResponse.json({ error: faqError.message }, { status: 500 });
    }

    // Update the question status to published and link to the FAQ
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('faq_questions')
      .update({
        status: 'published',
        linked_faq_id: faq.id,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Publish Question] Error updating question:', updateError);
      // Don't fail - the FAQ was created successfully
    }

    // Notify the user who asked the question (async, don't block response)
    notifyUserOfAnswer(
      question.user_id,
      questionId,
      faq.id,
      question.question
    ).catch((err) => {
      console.error('[Publish Question] Error sending notification:', err);
    });

    // Send email notification to the user (async, don't block response)
    (async () => {
      try {
        // Get user's email
        const { data: userData } = await supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', question.user_id)
          .single();

        if (userData?.email) {
          const userName = [userData.first_name, userData.last_name]
            .filter(Boolean)
            .join(' ') || 'User';

          await sendQuestionAnsweredEmail({
            userEmail: userData.email,
            userName,
            question: question.question,
            answer: answer.trim(),
          });
        }
      } catch (emailErr) {
        console.error('[Publish Question] Error sending email:', emailErr);
      }
    })();

    return NextResponse.json({
      success: true,
      faq,
      question: updatedQuestion ? toFAQQuestion(updatedQuestion as FAQQuestionRow) : null,
      message: 'Question published as FAQ successfully',
    });
  } catch (error) {
    console.error('[Publish Question] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
