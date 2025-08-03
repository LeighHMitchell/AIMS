import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock user ID to database user ID mapping
const USER_ID_MAP: Record<string, string> = {
  "1": "85a65398-5d71-4633-a50b-2f167a0b6f7a", // John Doe - super_user
  "2": "0864da76-2323-44a5-ac33-b27786da024e", // Jane Smith - dev_partner_tier_1
  "3": "e75c1196-8daa-41f7-b9dd-e8b0bb62981f", // Mike Johnson - dev_partner_tier_2
  "4": "ab800211-10a9-4d2f-8cfb-bb007fe01c51", // Sarah Williams - gov_partner_tier_1
  "5": "0420c51c-eb0c-44c6-8dd8-380e88e9e6ed", // Tom Brown - gov_partner_tier_2
};

// Helper to check if string is a valid UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// GET comments for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[AIMS Comments API] GET request for activity:', params.id);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Comments API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('[AIMS Comments API] Checking if activity exists...');
    
    // First check if activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', params.id)
      .single();
    
    console.log('[AIMS Comments API] Activity query result:', { activity, activityError });
    
    if (activityError || !activity) {
      console.error('[AIMS Comments API] Activity not found:', params.id, activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    console.log('[AIMS Comments API] Activity found, fetching comments...');
    
    // Get comments from the database - using the correct schema
    const { data: comments, error: commentsError } = await supabase
      .from('activity_comments')
                  .select(`
              id,
              activity_id,
              user_id,
              user_name,
              user_role,
              content,
              type,
              status,
              resolved_by_id,
              resolved_by_name,
              resolved_at,
              resolution_note,
              created_at
            `)
      .eq('activity_id', params.id)
      .order('created_at', { ascending: false });
    
    if (commentsError) {
      console.error('[AIMS Comments API] Error fetching comments:', commentsError);
      // If table doesn't exist, return empty array instead of error
      if (commentsError.code === '42P01') {
        console.log('[AIMS Comments API] Comments table does not exist, returning empty array');
        return NextResponse.json([]);
      }
      return NextResponse.json(
        { error: 'Failed to fetch comments', details: commentsError.message },
        { status: 500 }
      );
    }
    
    console.log('[AIMS Comments API] Found', comments?.length || 0, 'comments');
    
    // Get replies for each comment
    const commentIds = (comments || []).map((c: any) => c.id);
    let replies: any[] = [];
    
    if (commentIds.length > 0) {
      const { data: repliesData, error: repliesError } = await supabase
        .from('activity_comment_replies')
        .select(`
          id,
          comment_id,
          user_id,
          user_name,
          user_role,
          content,
          type,
          created_at
        `)
        .in('comment_id', commentIds)
        .order('created_at', { ascending: true });
      
      if (repliesError) {
        console.error('[AIMS Comments API] Error fetching replies:', repliesError);
      } else {
        replies = repliesData || [];
      }
    }

    // Get likes for comments and replies
    let likes: any[] = [];
    if (commentIds.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from('activity_comment_likes')
        .select(`
          id,
          comment_id,
          reply_id,
          user_id,
          like_type,
          created_at
        `)
        .or(`comment_id.in.(${commentIds.join(',')}),reply_id.in.(${replies.map(r => r.id).join(',') || 'null'})`);
      
      if (likesError) {
        console.error('[AIMS Comments API] Error fetching likes:', likesError);
      } else {
        likes = likesData || [];
      }
    }
    
    // Transform comments to match expected format
    const transformedComments = (comments || []).map((comment: any) => {
      const commentReplies = replies.filter(r => r.comment_id === comment.id).map(reply => {
        const replyLikes = likes.filter(l => l.reply_id === reply.id);
        const thumbsUp = replyLikes.filter(l => l.like_type === 'thumbs_up').length;
        const thumbsDown = replyLikes.filter(l => l.like_type === 'thumbs_down').length;
        
        return {
          id: reply.id,
          author: {
            userId: reply.user_id,
            name: reply.user_name,
            role: reply.user_role,
          },
          type: reply.type || 'Feedback',
          message: reply.content,
          createdAt: reply.created_at,
          likes: {
            thumbsUp,
            thumbsDown,
            userLike: null // We'll need user ID to determine this
          }
        };
      });

      const commentLikes = likes.filter(l => l.comment_id === comment.id);
      const thumbsUp = commentLikes.filter(l => l.like_type === 'thumbs_up').length;
      const thumbsDown = commentLikes.filter(l => l.like_type === 'thumbs_down').length;

      return {
      id: comment.id,
      activityId: comment.activity_id,
      author: {
        userId: comment.user_id,
          name: comment.user_name,
          role: comment.user_role,
      },
      type: comment.type || 'Feedback',
        message: comment.content,
      createdAt: comment.created_at,
        status: comment.status || 'Open',
        resolvedBy: comment.resolved_by_id ? {
          userId: comment.resolved_by_id,
          name: comment.resolved_by_name,
          role: 'user'
        } : undefined,
        resolvedAt: comment.resolved_at,
        resolutionNote: comment.resolution_note,
        replies: commentReplies,
        likes: {
          thumbsUp,
          thumbsDown,
          userLike: null // We'll need user ID to determine this
        },
      attachments: []
      };
    });
    
    return NextResponse.json(transformedComments);
  } catch (error) {
    console.error('[AIMS Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST new comment, reply, resolve, or like
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, message, type, action, commentId, replyId, resolutionNote, likeType } = body;
    
    console.log('[AIMS Comments API] POST request for activity:', params.id);
    console.log('[AIMS Comments API] Action:', action);
    console.log('[AIMS Comments API] User:', user);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Comments API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // First check if activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', params.id)
      .single();
    
    if (activityError || !activity) {
      console.error('[AIMS Comments API] Activity not found for comment:', params.id, activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    // Handle like/unlike actions
    if (action === 'like' || action === 'unlike') {
      const targetId = replyId || commentId;
      const targetColumn = replyId ? 'reply_id' : 'comment_id';
      
      if (action === 'like') {
        // Remove any existing like from this user first
        await supabase
          .from('activity_comment_likes')
          .delete()
          .eq(targetColumn, targetId)
          .eq('user_id', user.id);
        
        // Add new like
        const { error: likeError } = await supabase
          .from('activity_comment_likes')
          .insert({
            [targetColumn]: targetId,
            user_id: user.id,
            like_type: likeType, // 'thumbs_up' or 'thumbs_down'
          });
        
        if (likeError) {
          console.error('[AIMS Comments API] Error adding like:', likeError);
          return NextResponse.json({ error: 'Failed to add like' }, { status: 500 });
        }
      } else {
        // Remove like
        const { error: unlikeError } = await supabase
          .from('activity_comment_likes')
          .delete()
          .eq(targetColumn, targetId)
          .eq('user_id', user.id);
        
        if (unlikeError) {
          console.error('[AIMS Comments API] Error removing like:', unlikeError);
          return NextResponse.json({ error: 'Failed to remove like' }, { status: 500 });
        }
      }
      
      return NextResponse.json({ success: true });
    }
    
    // Handle different actions
    if (action === 'reply') {
      // Add a reply to an existing comment
      const { data: reply, error: replyError } = await supabase
        .from('activity_comment_replies')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          user_name: user.name,
          user_role: user.role,
          content: message, // Using 'content' column as that's what exists in the table
          type: type || 'Feedback'
        })
        .select()
        .single();
      
      if (replyError) {
        console.error('[AIMS Comments API] Error creating reply:', replyError);
        return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        reply: {
          id: reply.id,
          author: {
            userId: reply.user_id,
            name: reply.user_name,
            role: reply.user_role,
          },
          type: reply.type,
          message: reply.content,
          createdAt: reply.created_at,
          likes: {
            thumbsUp: 0,
            thumbsDown: 0,
            userLike: null
          }
        }
      });
    }
    
    if (action === 'resolve' || action === 'reopen') {
      // Update comment status
      const status = action === 'resolve' ? 'Resolved' : 'Open';
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      };
      
      if (action === 'resolve') {
        updateData.resolved_by_id = user.id;
        updateData.resolved_by_name = user.name;
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution_note = resolutionNote || null;
      } else {
        updateData.resolved_by_id = null;
        updateData.resolved_by_name = null;
        updateData.resolved_at = null;
        updateData.resolution_note = null;
      }
      
      const { data: updatedComment, error: updateError } = await supabase
        .from('activity_comments')
        .update(updateData)
        .eq('id', commentId)
        .select()
        .single();
      
      if (updateError) {
        console.error('[AIMS Comments API] Error updating comment status:', updateError);
        return NextResponse.json({ error: 'Failed to update comment status' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        comment: updatedComment
      });
    }
    
    // Create new comment (default action)
    console.log('[AIMS Comments API] Creating new comment...');
    
    // Map mock user ID to real database user ID if needed
    let userId = user.id;
    if (!isValidUUID(userId)) {
      userId = USER_ID_MAP[userId] || userId;
      console.log(`[AIMS Comments API] Mapped mock user ID ${user.id} to database ID ${userId}`);
    }
    
    // Validate that we have a valid UUID now
    if (!isValidUUID(userId)) {
      console.error('[AIMS Comments API] Invalid user ID after mapping:', userId);
      // Use the first available user as fallback for testing
      userId = Object.values(USER_ID_MAP)[0];
      console.log(`[AIMS Comments API] Using fallback user ID: ${userId}`);
    }
    
    const commentData = {
      activity_id: params.id,
      user_id: userId,
      user_name: user.name || 'Anonymous',
      user_role: user.role || 'user',
      content: message, // Using 'content' column as that's what exists in the table
      type: type || 'Feedback',
      status: 'Open'
    };
    
    console.log('[AIMS Comments API] Inserting comment:', commentData);
    
    const { data: newComment, error: insertError } = await supabase
      .from('activity_comments')
      .insert(commentData)
      .select()
      .single();
    
    if (insertError) {
      console.error('[AIMS Comments API] Error inserting comment:', insertError);
      // If table doesn't exist, provide helpful error
      if (insertError.code === '42P01') {
        return NextResponse.json(
          { error: 'Comments system not yet set up for this database. Please contact administrator.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create comment', details: insertError.message },
        { status: 500 }
      );
    }
    
    console.log('[AIMS Comments API] Comment created successfully:', newComment.id);
    
    // Return the formatted comment
    const formattedComment = {
      id: newComment.id,
      activityId: newComment.activity_id,
      author: {
        userId: newComment.user_id,
        name: newComment.user_name,
        role: newComment.user_role,
      },
      type: newComment.type,
      message: newComment.content,
      createdAt: newComment.created_at,
      status: newComment.status,
      replies: [],
      likes: {
        thumbsUp: 0,
        thumbsDown: 0,
        userLike: null
      },
      attachments: []
    };
    
    return NextResponse.json({ 
      success: true, 
      comment: formattedComment 
    });
    
  } catch (error) {
    console.error('[AIMS Comments API] Unexpected error in POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 