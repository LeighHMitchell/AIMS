import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Enhanced comments API with full schema support
// This provides complete commenting functionality with all features

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

// Helper to parse mentions from message
function parseMentions(message: string): Array<{id: string, name: string, type: 'user' | 'organization'}> {
  const mentions: Array<{id: string, name: string, type: 'user' | 'organization'}> = [];
  
  // Parse @user mentions (format: @[UserName](user_id))
  const userMentions = message.match(/@\[([^\]]+)\]\(([^)]+)\)/g);
  if (userMentions) {
    userMentions.forEach(mention => {
      const match = mention.match(/@\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        mentions.push({
          id: match[2],
          name: match[1],
          type: 'user'
        });
      }
    });
  }
  
  // Parse #organization mentions (format: #[OrgName](org_id))
  const orgMentions = message.match(/#\[([^\]]+)\]\(([^)]+)\)/g);
  if (orgMentions) {
    orgMentions.forEach(mention => {
      const match = mention.match(/#\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        mentions.push({
          id: match[2],
          name: match[1],
          type: 'organization'
        });
      }
    });
  }
  
  return mentions;
}

// GET comments for an activity with enhanced features
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

    // Parse query parameters for search and filtering
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search');
    const contextSection = url.searchParams.get('section');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    console.log('[AIMS Comments API] Search params:', { searchTerm, contextSection, type, status, includeArchived });
    
    // First check if activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('id', params.id)
      .single();
    
    if (activityError || !activity) {
      console.error('[AIMS Comments API] Activity not found:', params.id, activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    console.log('[AIMS Comments API] Activity found, fetching comments...');
    
    // Check if comments table exists by trying to query it
    try {
      let query = supabase
        .from('activity_comments')
        .select(`
          *,
          replies:activity_comment_replies(*)
        `)
        .eq('activity_id', params.id);
        
      // Filter archived comments unless specifically requested
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data: comments, error: commentsError } = await query;
      
      console.log('[AIMS Comments API] Query result:', { 
        commentsCount: comments?.length || 0, 
        activityId: params.id,
        includeArchived,
        error: commentsError 
      });

      if (commentsError) {
        console.error('[AIMS Comments API] Comments table error:', commentsError);
        
        // If table doesn't exist, return empty array with helpful message
        if (commentsError.code === '42P01') { // Table doesn't exist
          console.log('[AIMS Comments API] Comments table not found - database setup required');
          return NextResponse.json([], { 
            headers: { 
              'X-Comments-Status': 'Database setup required. Run activate-advanced-comments.sql in Supabase.' 
            }
          });
        }
        
        throw commentsError;
      }
      
      console.log(`[AIMS Comments API] Found ${comments?.length || 0} comments`);
      return NextResponse.json(comments || []);
      
    } catch (tableError) {
      console.error('[AIMS Comments API] Table access error:', tableError);
      
      // Return empty array with setup instructions
      return NextResponse.json([], { 
        headers: { 
          'X-Comments-Status': 'Database setup required. Run activate-advanced-comments.sql in Supabase.' 
        }
      });
    }
    
  } catch (error) {
    console.error('[AIMS Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST new comment with enhanced features
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, content, type, parentCommentId, contextSection, contextField } = body;
    
    console.log('[AIMS Comments API] POST request for activity:', params.id);
    console.log('[AIMS Comments API] User:', user);
    console.log('[AIMS Comments API] Content:', content);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Comments API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // First check if activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('id', params.id)
      .single();
    
    if (activityError || !activity) {
      console.error('[AIMS Comments API] Activity not found for comment:', params.id, activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    console.log('[AIMS Comments API] Activity found, preparing to insert comment...');
    
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
      userId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // John Doe
      console.log('[AIMS Comments API] Using fallback user ID:', userId);
    }
    
    // Parse mentions from the content
    const mentions = parseMentions(content);
    console.log('[AIMS Comments API] Parsed mentions:', mentions);

    // Check if this is a reply to an existing comment
    if (parentCommentId) {
      // Try to insert reply
      try {
        const replyData = {
          comment_id: parentCommentId,
          user_id: userId,
          user_name: user.name || 'Unknown User',
          user_role: user.role || 'user',
          message: content,
          type: type || 'Feedback',
          mentions: JSON.stringify(mentions),
          attachments: JSON.stringify([]),
          is_read: JSON.stringify({}),
        };
        
        console.log('[AIMS Comments API] Inserting reply with data:', replyData);
        
        const { data: newReply, error: replyError } = await supabase
          .from('activity_comment_replies')
          .insert(replyData)
          .select()
          .single();
        
        if (replyError) {
          console.error('[AIMS Comments API] Error adding reply:', replyError);
          
          // Check if table doesn't exist
          if (replyError.code === '42P01') {
            return NextResponse.json({ 
              error: 'Comments feature not available - database setup required. Run activate-advanced-comments.sql in Supabase.' 
            }, { status: 503 });
          }
          
          return NextResponse.json(
            { error: `Failed to add reply: ${replyError.message}` },
            { status: 500 }
          );
        }
        
        console.log(`[AIMS Comments API] Reply added successfully:`, newReply);
      } catch (tableError) {
        console.error('[AIMS Comments API] Table access error for replies:', tableError);
        return NextResponse.json({ 
          error: 'Comments feature not available - database setup required. Run activate-advanced-comments.sql in Supabase.' 
        }, { status: 503 });
      }
    } else {
      // Try to insert new comment
      try {
        const commentData = {
          activity_id: params.id,
          user_id: userId,
          user_name: user.name || 'Unknown User',
          user_role: user.role || 'user',
          content: content, // Original field (required for backward compatibility)
          message: content, // New field (for enhanced features)
          type: type || 'Feedback',
          status: 'Open',
          context_section: contextSection || null,
          context_field: contextField || null,
          mentions: JSON.stringify(mentions),
          attachments: JSON.stringify([]),
          is_read: JSON.stringify({}),
          is_archived: false, // Explicitly set to false so it appears in default queries
        };
        
        console.log('[AIMS Comments API] Inserting comment with data:', commentData);
        
        const { data: newComment, error: commentError } = await supabase
          .from('activity_comments')
          .insert(commentData)
          .select()
          .single();
        
        if (commentError) {
          console.error('[AIMS Comments API] Error adding comment:', commentError);
          
          // Check if table doesn't exist
          if (commentError.code === '42P01') {
            return NextResponse.json({ 
              error: 'Comments feature not available - database setup required. Run activate-advanced-comments.sql in Supabase.' 
            }, { status: 503 });
          }
          
          console.error('[AIMS Comments API] Error details:', {
            code: commentError.code,
            message: commentError.message,
            details: commentError.details,
            hint: commentError.hint
          });
          return NextResponse.json(
            { error: `Failed to add comment: ${commentError.message}` },
            { status: 500 }
          );
        }
        
        console.log(`[AIMS Comments API] Comment added successfully:`, newComment);
      } catch (tableError) {
        console.error('[AIMS Comments API] Table access error for comments:', tableError);
        return NextResponse.json({ 
          error: 'Comments feature not available - database setup required. Run activate-advanced-comments.sql in Supabase.' 
        }, { status: 503 });
      }
    }
    
    // Return all comments for the activity
    return GET(request, { params });
  } catch (error) {
    console.error('[AIMS Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// PATCH to resolve/update a comment with enhanced features
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, commentId, action, resolutionNote } = body;
    
    console.log(`[AIMS Comments API] Comment ${commentId} action: ${action} by ${user.name}`);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Comments API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Map mock user ID to real database user ID if needed
    let userId = user.id;
    if (!isValidUUID(userId)) {
      userId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(userId)) {
      userId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // fallback
    }
    
    let updateData: any = {};
    
    if (action === 'resolve') {
      updateData = {
        status: 'Resolved',
        resolved_by_id: userId,
        resolved_by_name: user.name || 'Unknown User',
        resolved_at: new Date().toISOString(),
        resolution_note: resolutionNote || null
      };
    } else if (action === 'reopen') {
      updateData = {
        status: 'Open',
        resolved_by_id: null,
        resolved_by_name: null,
        resolved_at: null,
        resolution_note: null
      };
    } else if (action === 'mark_read') {
      // Get current read status and update it
      const { data: comment, error: fetchError } = await supabase
        .from('activity_comments')
        .select('is_read')
        .eq('id', commentId)
        .single();
      
      if (!fetchError && comment) {
        const currentReadStatus = comment.is_read ? JSON.parse(comment.is_read) : {};
        currentReadStatus[userId] = true;
        
        updateData = {
          is_read: JSON.stringify(currentReadStatus)
        };
      }
    } else if (action === 'archive') {
      updateData = {
        is_archived: true,
        archived_by_id: userId,
        archived_by_name: user.name || 'Unknown User',
        archived_at: new Date().toISOString(),
        archive_reason: body.archiveReason || null
      };
    } else if (action === 'unarchive') {
      updateData = {
        is_archived: false,
        archived_by_id: null,
        archived_by_name: null,
        archived_at: null,
        archive_reason: null
      };
    }
    
    const { data: updatedComment, error: updateError } = await supabase
      .from('activity_comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single();
    
    if (updateError) {
      console.error('[AIMS Comments API] Error updating comment:', updateError);
      return NextResponse.json(
        { error: `Failed to update comment: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`[AIMS Comments API] Comment updated successfully:`, updatedComment);
    
    return NextResponse.json({ success: true, comment: updatedComment });
  } catch (error) {
    console.error('[AIMS Comments API] Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE comment with enhanced features and permission checks
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { commentId, user } = body;
    
    console.log('[AIMS Comments API] DELETE request for comment:', commentId, 'by user:', user);
    
    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Comments API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // First check if the comment exists and get its details
    const { data: comment, error: fetchError } = await supabase
      .from('activity_comments')
      .select('id, user_id, user_name, activity_id')
      .eq('id', commentId)
      .single();
    
    if (fetchError || !comment) {
      console.error('[AIMS Comments API] Comment not found:', commentId, fetchError);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Verify the comment belongs to the current activity
    if (comment.activity_id !== params.id) {
      return NextResponse.json({ error: 'Comment does not belong to this activity' }, { status: 403 });
    }
    
    // Convert user ID if needed (support for test user mapping)
    let userId = user.id;
    if (!isValidUUID(userId)) {
      userId = USER_ID_MAP[userId] || userId;
    }
    
    // Permission check: Only the comment author or admin can delete
    const isAuthor = comment.user_id === userId;
    const isAdmin = user.role && ['super_user', 'admin'].includes(user.role);
    
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ 
        error: 'Permission denied. Only the comment author or an admin can delete comments.' 
      }, { status: 403 });
    }
    
    // Delete the comment (this will cascade delete replies due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('activity_comments')
      .delete()
      .eq('id', commentId);
    
    if (deleteError) {
      console.error('[AIMS Comments API] Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }
    
    console.log('[AIMS Comments API] Comment deleted successfully:', commentId);
    
    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AIMS Comments API] Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}