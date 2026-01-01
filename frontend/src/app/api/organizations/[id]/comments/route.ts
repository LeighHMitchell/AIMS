import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Enhanced comments API for organizations

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

// GET comments for an organization with enhanced features
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Org Comments API] GET request for organization:', params.id);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Org Comments API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Parse query parameters for search and filtering
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search');
    const contextSection = url.searchParams.get('section');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    console.log('[Org Comments API] Search params:', { searchTerm, contextSection, type, status, includeArchived });
    
    // First check if organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', params.id)
      .single();
    
    if (orgError || !organization) {
      console.error('[Org Comments API] Organization not found:', params.id, orgError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    // Check if comments table exists by trying to query it
    try {
      let query = supabase
        .from('organization_comments')
        .select(`
          *,
          replies:organization_comment_replies(*)
        `)
        .eq('organization_id', params.id);
        
      // Filter archived comments unless specifically requested
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data: comments, error: commentsError } = await query;
      
      console.log('[Org Comments API] Query result:', { 
        commentsCount: comments?.length || 0, 
        organizationId: params.id,
        includeArchived,
        error: commentsError 
      });

      if (commentsError) {
        console.error('[Org Comments API] Comments table error:', commentsError);
        
        // If table doesn't exist, return empty array with helpful message
        if (commentsError.code === '42P01') { // Table doesn't exist
          console.log('[Org Comments API] Comments table not found - database setup required');
          return NextResponse.json([], { 
            headers: { 
              'X-Comments-Status': 'Database setup required. Organization comments table not found.' 
            }
          });
        }
        
        throw commentsError;
      }
      
      console.log(`[Org Comments API] Found ${comments?.length || 0} comments`);
      return NextResponse.json(comments || []);
      
    } catch (tableError) {
      console.error('[Org Comments API] Table access error:', tableError);
      
      // Return empty array with setup instructions
      return NextResponse.json([], { 
        headers: { 
          'X-Comments-Status': 'Database setup required. Organization comments table not found.' 
        }
      });
    }
    
  } catch (error) {
    console.error('[Org Comments API] Unexpected error:', error);
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
    
    console.log('[Org Comments API] POST request for organization:', params.id);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Org Comments API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // First check if organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', params.id)
      .single();
    
    if (orgError || !organization) {
      console.error('[Org Comments API] Organization not found for comment:', params.id, orgError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    // Map mock user ID to real database user ID if needed
    let userId = user.id;
    if (!isValidUUID(userId)) {
      userId = USER_ID_MAP[userId] || userId;
    }
    
    // Validate that we have a valid UUID now
    if (!isValidUUID(userId)) {
      console.error('[Org Comments API] Invalid user ID after mapping:', userId);
      userId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // Fallback
    }
    
    // Parse mentions from the content
    const mentions = parseMentions(content);

    // Check if this is a reply to an existing comment
    if (parentCommentId) {
      try {
        const replyData = {
          organization_id: params.id,
          parent_comment_id: parentCommentId,
          user_id: userId,
          user_name: user.name || 'Unknown User',
          user_role: user.role || 'user',
          content: content,
          message: content,
          type: type || 'Feedback',
          mentions: JSON.stringify(mentions),
          attachments: JSON.stringify([]),
          is_read: JSON.stringify({}),
        };
        
        const { data: newReply, error: replyError } = await supabase
          .from('organization_comment_replies')
          .insert(replyData)
          .select()
          .single();

        if (replyError) {
          console.error('[Org Comments API] Error adding reply:', replyError);
          return NextResponse.json(
            { error: `Failed to add reply: ${replyError.message}` },
            { status: 500 }
          );
        }

        return GET(request, { params });
      } catch (tableError) {
        console.error('[Org Comments API] Table access error for replies:', tableError);
        return NextResponse.json({ 
          error: 'Comments feature not available - database setup required.' 
        }, { status: 503 });
      }
    } else {
      // Try to insert new comment
      try {
        const commentData = {
          organization_id: params.id,
          user_id: userId,
          user_name: user.name || 'Unknown User',
          user_role: user.role || 'user',
          content: content,
          message: content,
          type: type || 'Feedback',
          status: 'Open',
          context_section: contextSection || null,
          context_field: contextField || null,
          mentions: JSON.stringify(mentions),
          attachments: JSON.stringify([]),
          is_read: JSON.stringify({}),
          is_archived: false,
        };
        
        const { data: newComment, error: commentError } = await supabase
          .from('organization_comments')
          .insert(commentData)
          .select()
          .single();

        if (commentError) {
          console.error('[Org Comments API] Error adding comment:', commentError);
          
          if (commentError.code === '42P01') {
            return NextResponse.json({ 
              error: 'Comments feature not available - database setup required.' 
            }, { status: 503 });
          }
          
          return NextResponse.json(
            { error: `Failed to add comment: ${commentError.message}` },
            { status: 500 }
          );
        }

        return GET(request, { params });
      } catch (tableError) {
        console.error('[Org Comments API] Table access error for comments:', tableError);
        return NextResponse.json({ 
          error: 'Comments feature not available - database setup required.' 
        }, { status: 503 });
      }
    }
  } catch (error) {
    console.error('[Org Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// PATCH to resolve/update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { commentId, status, resolved } = body;
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (resolved !== undefined) updateData.resolved = resolved;

    const { error } = await supabase
      .from('organization_comments')
      .update(updateData)
      .eq('id', commentId)
      .eq('organization_id', params.id);

    if (error) {
      console.error('[Org Comments API] Error updating comment:', error);
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    return GET(request, { params });
  } catch (error) {
    console.error('[Org Comments API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}



