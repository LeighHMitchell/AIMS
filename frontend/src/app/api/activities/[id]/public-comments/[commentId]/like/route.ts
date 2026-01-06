import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/activities/[id]/public-comments/[commentId]/like
// Toggle like on a public comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { commentId } = params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify comment exists
    const { data: comment, error: commentError } = await supabase
      .from('activity_public_comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user already liked this comment
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('activity_public_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected when not liked)
      console.error('Error checking like status:', likeCheckError);
      return NextResponse.json(
        { error: 'Failed to check like status' },
        { status: 500 }
      );
    }

    let isLiked: boolean;
    let newLikesCount: number;

    if (existingLike) {
      // Unlike: remove the like
      const { error: deleteError } = await supabase
        .from('activity_public_comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return NextResponse.json(
          { error: 'Failed to unlike comment' },
          { status: 500 }
        );
      }

      isLiked = false;
      newLikesCount = Math.max(0, comment.likes_count - 1);
    } else {
      // Like: add the like
      const { error: insertError } = await supabase
        .from('activity_public_comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId,
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return NextResponse.json(
          { error: 'Failed to like comment' },
          { status: 500 }
        );
      }

      isLiked = true;
      newLikesCount = comment.likes_count + 1;
    }

    return NextResponse.json({
      success: true,
      isLiked,
      likesCount: newLikesCount,
    });
  } catch (error) {
    console.error('Error in POST /api/activities/[id]/public-comments/[commentId]/like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
