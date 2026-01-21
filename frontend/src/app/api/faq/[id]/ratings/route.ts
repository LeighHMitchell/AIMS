import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { FAQRatingRow, toFAQRating, FAQRatingSummary, RatingType } from '@/types/faq-enhanced';

export const dynamic = 'force-dynamic';

/**
 * GET /api/faq/[id]/ratings
 * Get rating summary for a FAQ
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: faqId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all ratings for this FAQ
    const { data, error } = await supabase
      .from('faq_ratings')
      .select('*')
      .eq('faq_id', faqId);

    if (error) {
      console.error('[FAQ Ratings] Error fetching:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ratings = (data as FAQRatingRow[]) || [];

    // Calculate summary
    const questionPositive = ratings.filter(r => r.rating_type === 'question_helpful' && r.is_positive).length;
    const questionNegative = ratings.filter(r => r.rating_type === 'question_helpful' && !r.is_positive).length;
    const answerPositive = ratings.filter(r => r.rating_type === 'answer_helpful' && r.is_positive).length;
    const answerNegative = ratings.filter(r => r.rating_type === 'answer_helpful' && !r.is_positive).length;

    // Get user's rating if userId provided
    let userRating: FAQRatingSummary['userRating'] = undefined;
    if (userId) {
      const userQuestionRating = ratings.find(r => r.user_id === userId && r.rating_type === 'question_helpful');
      const userAnswerRating = ratings.find(r => r.user_id === userId && r.rating_type === 'answer_helpful');
      userRating = {
        questionHelpful: userQuestionRating?.is_positive,
        answerHelpful: userAnswerRating?.is_positive,
      };
    }

    const summary: FAQRatingSummary = {
      faqId,
      questionHelpful: {
        positive: questionPositive,
        negative: questionNegative,
        total: questionPositive + questionNegative,
      },
      answerHelpful: {
        positive: answerPositive,
        negative: answerNegative,
        total: answerPositive + answerNegative,
      },
      userRating,
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[FAQ Ratings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faq/[id]/ratings
 * Submit or update a rating
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
    const { userId, ratingType, isPositive, comment } = body;

    // Validation
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!ratingType || !['question_helpful', 'answer_helpful'].includes(ratingType)) {
      return NextResponse.json({ error: 'Valid rating type is required' }, { status: 400 });
    }

    if (typeof isPositive !== 'boolean') {
      return NextResponse.json({ error: 'isPositive must be a boolean' }, { status: 400 });
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

    // Upsert the rating (update if exists, insert if not)
    const { data, error } = await supabase
      .from('faq_ratings')
      .upsert(
        {
          faq_id: faqId,
          user_id: userId,
          rating_type: ratingType as RatingType,
          is_positive: isPositive,
          comment: comment?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'faq_id,user_id,rating_type',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[FAQ Ratings] Error upserting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toFAQRating(data as FAQRatingRow),
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    console.error('[FAQ Ratings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
