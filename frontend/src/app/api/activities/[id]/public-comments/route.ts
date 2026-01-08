import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  PublicCommentRow,
  PublicComment,
  transformPublicComment,
} from '@/types/public-comment';

export const dynamic = 'force-dynamic';

// GET /api/activities/[id]/public-comments
// Fetch all public comments for an activity with nested replies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id: activityId } = await params;

    // Get current user ID from query params (for checking likes)
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('userId');

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Fetch all comments for this activity
    const { data: comments, error: commentsError } = await supabase
      .from('activity_public_comments')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching public comments:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // If user is logged in, fetch their likes
    let userLikes: Set<string> = new Set();
    if (currentUserId) {
      const { data: likes } = await supabase
        .from('activity_public_comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId);

      if (likes) {
        userLikes = new Set(likes.map((l: { comment_id: string }) => l.comment_id));
      }
    }

    // Organize comments into tree structure
    const commentMap = new Map<string, PublicComment>();
    const topLevelComments: PublicComment[] = [];

    // First pass: create all comment objects
    for (const row of comments as PublicCommentRow[]) {
      const comment = transformPublicComment(
        row,
        userLikes.has(row.id),
        []
      );
      commentMap.set(row.id, comment);
    }

    // Second pass: organize into parent-child relationships
    for (const row of comments as PublicCommentRow[]) {
      const comment = commentMap.get(row.id)!;
      if (row.parent_id && commentMap.has(row.parent_id)) {
        const parent = commentMap.get(row.parent_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      } else if (!row.parent_id) {
        topLevelComments.push(comment);
      }
    }

    // Sort replies by created_at (oldest first for conversation flow)
    Array.from(commentMap.values()).forEach((comment) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort(
          (a: PublicComment, b: PublicComment) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    });

    return NextResponse.json({
      comments: topLevelComments,
      total: comments?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/activities/[id]/public-comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/activities/[id]/public-comments
// Create a new public comment or reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id: activityId } = await params;
    const body = await request.json();

    const { content, parentId, user } = body;

    // Validate required fields
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (!user?.id || !user?.name) {
      return NextResponse.json(
        { error: 'User information is required' },
        { status: 400 }
      );
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // If parentId provided, verify parent comment exists
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('activity_public_comments')
        .select('id')
        .eq('id', parentId)
        .eq('activity_id', activityId)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    // Create the comment
    const { data: newComment, error: insertError } = await supabase
      .from('activity_public_comments')
      .insert({
        activity_id: activityId,
        parent_id: parentId || null,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar || null,
        user_role: user.role || null,
        content: content.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating public comment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Transform and return the new comment
    const transformedComment = transformPublicComment(
      newComment as PublicCommentRow,
      false,
      []
    );

    return NextResponse.json(
      { comment: transformedComment },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/activities/[id]/public-comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id]/public-comments
// Delete a public comment (only by the author)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id: activityId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('commentId');
    const userId = searchParams.get('userId');

    if (!commentId || !userId) {
      return NextResponse.json(
        { error: 'Comment ID and User ID are required' },
        { status: 400 }
      );
    }

    // Verify the comment belongs to this user
    const { data: comment, error: fetchError } = await supabase
      .from('activity_public_comments')
      .select('id, user_id')
      .eq('id', commentId)
      .eq('activity_id', activityId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.user_id !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment (cascades to replies and likes)
    const { error: deleteError } = await supabase
      .from('activity_public_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting public comment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/activities/[id]/public-comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
