import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

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

// POST - Toggle reaction on comment or reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { user, commentId, replyId, reactionType } = body;
    
    console.log('[AIMS Reactions API] Toggle reaction request:', { commentId, replyId, reactionType, user: user?.name });
    if (!supabase) {
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

    // Validate reaction type
    const validReactions = ['thumbs_up', 'thumbs_down', 'heart', 'celebrate', 'confused'];
    if (!validReactions.includes(reactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    // Use the database function to toggle reaction
    const { data, error } = await supabase.rpc('toggle_comment_reaction', {
      p_comment_id: commentId || null,
      p_reply_id: replyId || null,
      p_user_id: userId,
      p_user_name: user.name || 'Unknown User',
      p_reaction_type: reactionType
    });

    if (error) {
      console.error('[AIMS Reactions API] Error toggling reaction:', error);
      return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
    }

    console.log('[AIMS Reactions API] Reaction toggled successfully:', data);

    // Get updated reaction counts
    let reactionCounts;
    if (commentId) {
      const { data: counts, error: countsError } = await supabase.rpc('get_comment_reaction_counts', {
        p_comment_id: commentId
      });
      
      if (countsError) {
        console.error('[AIMS Reactions API] Error getting reaction counts:', countsError);
      } else {
        reactionCounts = counts;
      }
    } else if (replyId) {
      const { data: counts, error: countsError } = await supabase.rpc('get_reply_reaction_counts', {
        p_reply_id: replyId
      });
      
      if (countsError) {
        console.error('[AIMS Reactions API] Error getting reaction counts:', countsError);
      } else {
        reactionCounts = counts;
      }
    }

    return NextResponse.json({
      action: data,
      reactionCounts: reactionCounts || []
    });

  } catch (error) {
    console.error('[AIMS Reactions API] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}

// GET - Get reaction counts for a comment or reply
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const url = new URL(request.url);
    const commentId = url.searchParams.get('commentId');
    const replyId = url.searchParams.get('replyId');
    
    console.log('[AIMS Reactions API] Get reactions request:', { commentId, replyId });
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    let reactionCounts;
    if (commentId) {
      const { data, error } = await supabase.rpc('get_comment_reaction_counts', {
        p_comment_id: commentId
      });
      
      if (error) {
        console.error('[AIMS Reactions API] Error getting comment reaction counts:', error);
        return NextResponse.json({ error: 'Failed to get reaction counts' }, { status: 500 });
      }
      
      reactionCounts = data;
    } else if (replyId) {
      const { data, error } = await supabase.rpc('get_reply_reaction_counts', {
        p_reply_id: replyId
      });
      
      if (error) {
        console.error('[AIMS Reactions API] Error getting reply reaction counts:', error);
        return NextResponse.json({ error: 'Failed to get reaction counts' }, { status: 500 });
      }
      
      reactionCounts = data;
    } else {
      return NextResponse.json({ error: 'Either commentId or replyId must be provided' }, { status: 400 });
    }

    return NextResponse.json({
      reactionCounts: reactionCounts || []
    });

  } catch (error) {
    console.error('[AIMS Reactions API] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to get reactions' }, { status: 500 });
  }
}