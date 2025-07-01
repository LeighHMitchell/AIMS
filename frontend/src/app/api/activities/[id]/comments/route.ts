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
      
      // Let's also try to list all activities to debug
      const { data: allActivities, error: listError } = await supabase
        .from('activities')
        .select('id, title')
        .limit(5);
      
      console.log('[AIMS Comments API] Sample activities in DB:', allActivities, listError);
      
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    console.log('[AIMS Comments API] Activity found, fetching comments...');
    
    // Get comments from the database
    const { data: comments, error: commentsError } = await supabase
      .from('activity_comments')
      .select(`
        id,
        activity_id,
        user_id,
        content,
        type,
        created_at,
        users!activity_comments_user_id_fkey (
          id,
          name,
          role
        )
      `)
      .eq('activity_id', params.id)
      .order('created_at', { ascending: false });
    
    if (commentsError) {
      console.error('[AIMS Comments API] Error fetching comments:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }
    
    console.log('[AIMS Comments API] Found', comments?.length || 0, 'comments');
    
    // Transform comments to match expected format
    const transformedComments = (comments || []).map((comment: any) => ({
      id: comment.id,
      activityId: comment.activity_id,
      author: {
        userId: comment.user_id,
        name: comment.users?.name || 'Unknown User',
        role: comment.users?.role || 'user',
      },
      type: comment.type || 'Feedback',
      message: comment.content, // Map content to message
      createdAt: comment.created_at,
      status: 'Open', // Default status since it's not in the current schema
      replies: [], // No replies in current schema
      attachments: []
    }));
    
    return NextResponse.json(transformedComments);
  } catch (error) {
    console.error('[AIMS Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, content, type } = body;
    
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
      .select('id, title')
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
    
    // Insert new comment
    const commentData = {
      activity_id: params.id,
      user_id: userId,
      content: content, // Map message to content
      type: type || 'Feedback',
    };
    
    console.log('[AIMS Comments API] Inserting comment with data:', commentData);
    
    const { data: newComment, error: commentError } = await supabase
      .from('activity_comments')
      .insert(commentData)
      .select()
      .single();
    
    if (commentError) {
      console.error('[AIMS Comments API] Error adding comment:', commentError);
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

// PATCH to resolve/update a comment (for future use)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, commentId, action } = body;
    
    // For now, just return success since the current schema doesn't support status
    console.log(`[AIMS Comments API] Comment ${commentId} action: ${action} by ${user.name}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS Comments API] Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
} 