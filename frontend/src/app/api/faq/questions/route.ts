import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { FAQQuestionRow, toFAQQuestion, FAQQuestionStatus } from '@/types/faq-enhanced';
import { notifyManagersOfNewQuestion } from '@/lib/faq-notifications';

export const dynamic = 'force-dynamic';

/**
 * GET /api/faq/questions
 * List all user-submitted questions (admin view)
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
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

    // Get all questions for stats calculation
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('faq_questions')
      .select('id, status, created_at, updated_at, published_at');

    if (allQuestionsError) {
      console.error('[FAQ Questions] Error fetching all questions:', allQuestionsError);
    }

    // Calculate extended stats
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const stats = {
      pending: 0,
      in_progress: 0,
      published: 0,
      rejected: 0,
      duplicate: 0,
      // Extended stats
      pendingThisWeek: 0,
      pendingAvgWaitDays: 0,
      pendingChangePercent: 0,
      inProgressAvgDays: 0,
      inProgressOldestDays: 0,
      publishedThisMonth: 0,
      publishedChangePercent: 0,
      responseRate: 0,
      avgResolutionDays: 0,
    };

    if (allQuestions && allQuestions.length > 0) {
      const pendingQuestions: any[] = [];
      const inProgressQuestions: any[] = [];
      const publishedQuestions: any[] = [];
      const resolvedQuestions: any[] = []; // published, rejected, duplicate

      // Count by status and categorize
      allQuestions.forEach((q: any) => {
        const status = q.status as keyof typeof stats;
        if (status in stats && typeof stats[status] === 'number') {
          (stats[status] as number)++;
        }

        const createdAt = new Date(q.created_at);

        if (q.status === 'pending') {
          pendingQuestions.push(q);
          if (createdAt >= oneWeekAgo) {
            stats.pendingThisWeek++;
          }
        } else if (q.status === 'in_progress') {
          inProgressQuestions.push(q);
        } else if (q.status === 'published') {
          publishedQuestions.push(q);
          const publishedAt = q.published_at ? new Date(q.published_at) : new Date(q.updated_at);
          if (publishedAt >= oneMonthAgo) {
            stats.publishedThisMonth++;
          }
          resolvedQuestions.push(q);
        } else if (q.status === 'rejected' || q.status === 'duplicate') {
          resolvedQuestions.push(q);
        }
      });

      // Calculate pending average wait days
      if (pendingQuestions.length > 0) {
        const totalWaitDays = pendingQuestions.reduce((sum, q) => {
          const createdAt = new Date(q.created_at);
          const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + daysDiff;
        }, 0);
        stats.pendingAvgWaitDays = totalWaitDays / pendingQuestions.length;
      }

      // Calculate pending change percent (this month vs last month)
      const pendingLastMonth = allQuestions.filter((q: any) => {
        const createdAt = new Date(q.created_at);
        return q.status === 'pending' && createdAt >= twoMonthsAgo && createdAt < oneMonthAgo;
      }).length;
      const pendingThisMonth = allQuestions.filter((q: any) => {
        const createdAt = new Date(q.created_at);
        return q.status === 'pending' && createdAt >= oneMonthAgo;
      }).length;
      if (pendingLastMonth > 0) {
        stats.pendingChangePercent = Math.round(((pendingThisMonth - pendingLastMonth) / pendingLastMonth) * 100);
      } else if (pendingThisMonth > 0) {
        stats.pendingChangePercent = 100;
      }

      // Calculate in-progress average days and oldest
      if (inProgressQuestions.length > 0) {
        let oldestDays = 0;
        const totalDays = inProgressQuestions.reduce((sum, q) => {
          const createdAt = new Date(q.created_at);
          const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > oldestDays) {
            oldestDays = daysDiff;
          }
          return sum + daysDiff;
        }, 0);
        stats.inProgressAvgDays = totalDays / inProgressQuestions.length;
        stats.inProgressOldestDays = Math.round(oldestDays);
      }

      // Calculate published change percent
      const publishedLastMonth = allQuestions.filter((q: any) => {
        const publishedAt = q.published_at ? new Date(q.published_at) : new Date(q.updated_at);
        return q.status === 'published' && publishedAt >= twoMonthsAgo && publishedAt < oneMonthAgo;
      }).length;
      if (publishedLastMonth > 0) {
        stats.publishedChangePercent = Math.round(((stats.publishedThisMonth - publishedLastMonth) / publishedLastMonth) * 100);
      } else if (stats.publishedThisMonth > 0) {
        stats.publishedChangePercent = 100;
      }

      // Calculate response rate (resolved / total * 100)
      const totalQuestions = allQuestions.length;
      if (totalQuestions > 0) {
        stats.responseRate = Math.round((resolvedQuestions.length / totalQuestions) * 100);
      }

      // Calculate average resolution time (for resolved questions)
      if (resolvedQuestions.length > 0) {
        const totalResolutionDays = resolvedQuestions.reduce((sum, q) => {
          const createdAt = new Date(q.created_at);
          const resolvedAt = q.published_at ? new Date(q.published_at) : new Date(q.updated_at);
          const daysDiff = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, daysDiff);
        }, 0);
        stats.avgResolutionDays = totalResolutionDays / resolvedQuestions.length;
      }
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
      stats,
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
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
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
