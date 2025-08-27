import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FEEDBACK_TYPES } from '@/data/feedback-types';

// Mock user ID to database user ID mapping (same pattern as other routes)
const USER_ID_MAP: Record<string, string> = {
  "1": "85a65398-5d71-4633-a50b-2f167a0b6f7a",
  "2": "0864da76-2323-44a5-ac33-b27786da024e", 
  "3": "e75c1196-8daa-41f7-b9dd-e8b0bb62981f",
  "4": "ab800211-10a9-4d2f-8cfb-bb007fe01c51",
  "5": "0420c51c-eb0c-44c6-8dd8-380e88e9e6ed",
  "leigh": "4bc8e3ca-b34b-4c7d-b599-f7e26119cd54", // Leigh Mitchell
};

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// GET - Retrieve feedback (for admin users)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[AIMS Feedback API] GET request for user:', userId);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Feedback API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Map mock user ID to real database user ID if needed
    let realUserId = userId;
    if (!isValidUUID(userId)) {
      realUserId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(realUserId)) {
      realUserId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // fallback
    }

    // Get user role to check permissions
    console.log('[AIMS Feedback API] Looking up user with ID:', realUserId);
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', realUserId)
      .single();

    console.log('[AIMS Feedback API] User lookup result:', { user, userError });

    if (userError || !user) {
      console.error('[AIMS Feedback API] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[AIMS Feedback API] User role:', user.role);

    // Allow super users and dev partners to view all feedback
    const allowedRoles = ['super_user', 'dev_partner_tier_1', 'dev_partner_tier_2'];
    if (!allowedRoles.includes(user.role)) {
      console.log('[AIMS Feedback API] Access denied - user role is:', user.role, 'but requires one of:', allowedRoles);
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: `Your role is '${user.role}' but one of these roles is required: ${allowedRoles.join(', ')}` 
      }, { status: 403 });
    }

    // Build query - using simpler approach to avoid foreign key issues
    console.log('[AIMS Feedback API] Building feedback query...');
    
    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: feedback, error: feedbackError } = await query;

    if (feedbackError) {
      console.error('[AIMS Feedback API] Error fetching feedback:', feedbackError);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    console.log('[AIMS Feedback API] Found', feedback?.length || 0, 'feedback items');

    // If we have feedback, get user details for each one
    let enrichedFeedback = feedback || [];
    
    if (feedback && feedback.length > 0) {
      console.log('[AIMS Feedback API] Enriching feedback with user details...');
      
      // Get unique user IDs
      const userIds = [...new Set(feedback.map(f => f.user_id))];
      
      // Fetch user details
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, full_name')
        .in('id', userIds);
      
      if (usersError) {
        console.error('[AIMS Feedback API] Error fetching users:', usersError);
        // Continue without user details
      } else {
        console.log('[AIMS Feedback API] Found user details for', users?.length || 0, 'users');
        
        // Create user lookup map
        const userMap = (users || []).reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, any>);
        
        // Enrich feedback with user details
        enrichedFeedback = feedback.map(item => ({
          ...item,
          user: userMap[item.user_id] || {
            id: item.user_id,
            email: 'Unknown',
            first_name: null,
            last_name: null,
            full_name: null
          }
        }));
      }
    }

    return NextResponse.json({ feedback: enrichedFeedback });
  } catch (error) {
    console.error('[AIMS Feedback API] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, category, subject, message, attachment_url, attachment_filename, attachment_type, attachment_size } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate required fields
    if (!category || !message?.trim()) {
      return NextResponse.json({ 
        error: 'Category and message are required' 
      }, { status: 400 });
    }

    // Validate category is valid
    const validCategories = FEEDBACK_TYPES.map(type => type.code);
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category' 
      }, { status: 400 });
    }

    console.log('[AIMS Feedback API] POST request for user:', userId);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Feedback API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Map mock user ID to real database user ID if needed
    let realUserId = userId;
    if (!isValidUUID(userId)) {
      realUserId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(realUserId)) {
      realUserId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // fallback
    }

    // Insert feedback with attachment data
    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: realUserId,
        category,
        subject: subject?.trim() || null,
        message: message.trim(),
        status: 'open',
        priority: 'medium',
        attachment_url: attachment_url || null,
        attachment_filename: attachment_filename || null,
        attachment_type: attachment_type || null,
        attachment_size: attachment_size || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('[AIMS Feedback API] Error inserting feedback:', insertError);
      return NextResponse.json({ 
        error: 'Failed to submit feedback' 
      }, { status: 500 });
    }

    console.log('[AIMS Feedback API] Feedback submitted successfully');
    return NextResponse.json({ 
      success: true, 
      feedback,
      message: 'Feedback submitted successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('[AIMS Feedback API] Error in POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update feedback (for admin users)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, id, status, priority, admin_notes, assigned_to } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 });
    }

    console.log('[AIMS Feedback API] PUT request for user:', userId);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Feedback API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Map mock user ID to real database user ID if needed
    let realUserId = userId;
    if (!isValidUUID(userId)) {
      realUserId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(realUserId)) {
      realUserId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // fallback
    }

    // Get user role to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', realUserId)
      .single();

    if (userError || !user) {
      console.error('[AIMS Feedback API] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Allow super users and dev partners to update feedback
    const allowedRoles = ['super_user', 'dev_partner_tier_1', 'dev_partner_tier_2'];
    if (!allowedRoles.includes(user.role)) {
      console.log('[AIMS Feedback API] Update access denied - user role is:', user.role, 'but requires one of:', allowedRoles);
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        details: `Your role is '${user.role}' but one of these roles is required: ${allowedRoles.join(', ')}` 
      }, { status: 403 });
    }

    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    
    // Set resolved_at if status is being changed to resolved
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    } else if (status === 'open' || status === 'in_progress') {
      updateData.resolved_at = null;
    }

    const { data: feedback, error: updateError } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[AIMS Feedback API] Error updating feedback:', updateError);
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
    }

    console.log('[AIMS Feedback API] Feedback updated successfully');
    return NextResponse.json({ 
      success: true, 
      feedback,
      message: 'Feedback updated successfully' 
    });
  } catch (error) {
    console.error('[AIMS Feedback API] Error in PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
