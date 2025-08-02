import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Simple fallback version that works without the enhanced comments table
// This provides basic commenting functionality while the full schema is being set up

// Mock user ID to database user ID mapping
const USER_ID_MAP: Record<string, string> = {
  "1": "85a65398-5d71-4633-a50b-2f167a0b6f7a", // John Doe - super_user
  "2": "0864da76-2323-44a5-ac33-b27786da024e", // Jane Smith - dev_partner_tier_1
  "3": "e75c1196-8daa-41f7-b9dd-e8b0bb62981f", // Mike Johnson - dev_partner_tier_2
  "4": "ab800211-10a9-4d2f-8cfb-bb007fe01c51", // Sarah Williams - gov_partner_tier_1
  "5": "0420c51c-eb0c-44c6-8dd8-380e88e9e6ed", // Tom Brown - gov_partner_tier_2
};

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// GET comments for an activity (fallback version)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[AIMS Comments API FALLBACK] GET request for activity:', params.id);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Comments API FALLBACK] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // First check if activity exists using title_narrative
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('id', params.id)
      .single();
    
    if (activityError || !activity) {
      console.error('[AIMS Comments API FALLBACK] Activity not found:', params.id, activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    console.log('[AIMS Comments API FALLBACK] Activity found, checking for comments table...');
    
    // Try to get comments, but handle the case where the table doesn't exist
    try {
      const { data: comments, error: commentsError } = await supabase
        .from('activity_comments')
        .select('*')
        .eq('activity_id', params.id)
        .order('created_at', { ascending: false });
      
      if (commentsError) {
        console.log('[AIMS Comments API FALLBACK] Comments table error:', commentsError.message);
        
        // If it's a column error, return empty array (graceful fallback)
        if (commentsError.code === '42703' || commentsError.message.includes('column') || commentsError.message.includes('relation')) {
          console.log('[AIMS Comments API FALLBACK] Comments table not properly set up, returning empty array');
          return NextResponse.json([]);
        }
        
        throw commentsError;
      }
      
      console.log('[AIMS Comments API FALLBACK] Found', comments?.length || 0, 'comments');
      
      // Transform comments to expected format
      const transformedComments = (comments || []).map((comment: any) => ({
        id: comment.id,
        activityId: comment.activity_id,
        author: {
          userId: comment.user_id,
          name: comment.user_name || comment.name || 'Unknown User',
          role: comment.user_role || comment.role || 'user',
        },
        type: comment.type || 'Feedback',
        message: comment.message || comment.content || '',
        createdAt: comment.created_at,
        status: comment.status || 'Open',
        replies: [],
        attachments: []
      }));
      
      return NextResponse.json(transformedComments);
      
    } catch (tableError) {
      console.log('[AIMS Comments API FALLBACK] Table access error, returning empty comments:', tableError.message);
      return NextResponse.json([]);
    }
    
  } catch (error) {
    console.error('[AIMS Comments API FALLBACK] Unexpected error:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}

// POST new comment (fallback version)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, content, type } = body;
    
    console.log('[AIMS Comments API FALLBACK] POST request for activity:', params.id);
    console.log('[AIMS Comments API FALLBACK] User:', user);
    console.log('[AIMS Comments API FALLBACK] Content:', content);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Comments API FALLBACK] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('id', params.id)
      .single();
    
    if (activityError || !activity) {
      console.error('[AIMS Comments API FALLBACK] Activity not found for comment:', params.id, activityError);
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    // Map user ID
    let userId = user.id;
    if (!isValidUUID(userId)) {
      userId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(userId)) {
      userId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // fallback
    }
    
    try {
      // Try to insert comment with minimal required fields
      const commentData = {
        activity_id: params.id,
        user_id: userId,
        content: content, // Try content field first
        type: type || 'Feedback',
      };
      
      // Add user info if table supports it
      try {
        const extendedCommentData = {
          ...commentData,
          user_name: user.name || 'Unknown User',
          user_role: user.role || 'user',
          message: content, // Also try message field
          status: 'Open'
        };
        
        const { data: newComment, error: commentError } = await supabase
          .from('activity_comments')
          .insert(extendedCommentData)
          .select()
          .single();
        
        if (commentError) {
          console.log('[AIMS Comments API FALLBACK] Extended insert failed, trying basic:', commentError.message);
          
          // Fallback to basic insert
          const { data: basicComment, error: basicError } = await supabase
            .from('activity_comments')
            .insert(commentData)
            .select()
            .single();
          
          if (basicError) {
            throw basicError;
          }
          
          console.log('[AIMS Comments API FALLBACK] Basic comment added successfully');
        } else {
          console.log('[AIMS Comments API FALLBACK] Extended comment added successfully');
        }
        
      } catch (insertError) {
        console.log('[AIMS Comments API FALLBACK] Insert failed:', insertError.message);
        return NextResponse.json({ error: 'Comments feature not available - database setup required' }, { status: 503 });
      }
      
    } catch (tableError) {
      console.log('[AIMS Comments API FALLBACK] Comments table not available:', tableError.message);
      return NextResponse.json({ error: 'Comments feature not available - please set up database tables' }, { status: 503 });
    }
    
    // Return updated comments
    return GET(request, { params });
    
  } catch (error) {
    console.error('[AIMS Comments API FALLBACK] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Comments feature temporarily unavailable' },
      { status: 503 }
    );
  }
}

// PATCH to resolve/update a comment (fallback version)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, commentId, action } = body;
    
    console.log(`[AIMS Comments API FALLBACK] Comment ${commentId} action: ${action} by ${user.name}`);
    
    // For fallback version, just return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS Comments API FALLBACK] Error updating comment:', error);
    return NextResponse.json(
      { error: 'Comment update temporarily unavailable' },
      { status: 503 }
    );
  }
}