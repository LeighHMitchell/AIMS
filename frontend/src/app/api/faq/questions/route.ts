import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FAQQuestionRow, toFAQQuestion, FAQQuestionStatus } from '@/types/faq-enhanced';
import { notifyManagersOfNewQuestion } from '@/lib/faq-notifications';

export const dynamic = 'force-dynamic';

/**
 * GET /api/faq/questions
 * List all user-submitted questions (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as FAQQuestionStatus | 'all' | null;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const userId = searchParams.get('userId'); // Filter by specific user

    // Build query - fetch questions without joins first
    let query = supabase
      .from('faq_questions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      // Support comma-separated statuses (e.g., "pending,in_progress")
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else if (statuses.length > 1) {
        query = query.in('status', statuses);
      }
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[FAQ Questions] Error fetching:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user data for the questions
    const userIds = [...new Set((data || []).map((q: any) => q.user_id).filter(Boolean))];
    const assignedIds = [...new Set((data || []).map((q: any) => q.assigned_to).filter(Boolean))];
    const allUserIds = [...new Set([...userIds, ...assignedIds])];

    let usersMap: Record<string, any> = {};
    if (allUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', allUserIds);

      usersMap = (usersData || []).reduce((acc: Record<string, any>, u: any) => {
        acc[u.id] = u;
        return acc;
      }, {});
    }

    // Enrich questions with user data
    const enrichedData = (data || []).map((q: any) => ({
      ...q,
      users: usersMap[q.user_id] || null,
      assigned_user: q.assigned_to ? usersMap[q.assigned_to] || null : null,
    }));

    // Get status counts for dashboard
    const { data: statusCounts, error: countError } = await supabase
      .from('faq_questions')
      .select('status')
      .then(({ data, error }) => {
        if (error) return { data: null, error };

        const counts = {
          pending: 0,
          in_progress: 0,
          published: 0,
          rejected: 0,
          duplicate: 0,
        };

        data?.forEach((q) => {
          if (q.status in counts) {
            counts[q.status as keyof typeof counts]++;
          }
        });

        return { data: counts, error: null };
      });

    if (countError) {
      console.error('[FAQ Questions] Error counting:', countError);
    }

    const questions = (enrichedData as FAQQuestionRow[]).map(toFAQQuestion);

    return NextResponse.json({
      success: true,
      data: questions,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      stats: statusCounts || {
        pending: 0,
        in_progress: 0,
        published: 0,
        rejected: 0,
        duplicate: 0,
      },
    });
  } catch (error) {
    console.error('[FAQ Questions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faq/questions
 * Submit a new question
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, question, context, tags, relatedFaqId } = body;

    // Validation
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Insert the question
    const { data, error } = await supabase
      .from('faq_questions')
      .insert({
        user_id: userId,
        question: question.trim(),
        context: context?.trim() || null,
        tags: tags || [],
        related_faq_id: relatedFaqId || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[FAQ Questions] Error creating:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user info for the notification
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    const userName = userData
      ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
      : 'A user';

    // Notify managers about the new question (async, don't block response)
    notifyManagersOfNewQuestion(data.id, question.trim(), userName).catch((err) => {
      console.error('[FAQ Questions] Error sending notifications:', err);
    });

    return NextResponse.json({
      success: true,
      data: toFAQQuestion(data as FAQQuestionRow),
      message: 'Question submitted successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[FAQ Questions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
