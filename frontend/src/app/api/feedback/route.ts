import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FEEDBACK_TYPES } from '@/data/feedback-types';

// Mock user ID to database user ID mapping (using actual existing user IDs)
const USER_ID_MAP: Record<string, string> = {
  "1": "8f26db11-07f0-4708-aedc-63b7bb88b1af", // Yadanar Mitchell (super_user)
  "2": "3d0bc8e0-3330-4b71-8d71-91c611930ee8", // Jane Smith (dev_partner_tier_1)
  "3": "bb56c9f5-da9e-4ddd-9adc-e1f1ce94be98", // Su Wai (gov_partner_tier_1)
  "4": "3ae961fa-a5c1-49b7-81e7-567ffcd3b85d", // Min Aung (gov_partner_tier_2)
  "5": "6369d451-00c6-4fd8-a3fb-ee96ea60b2ec", // James Brown (dev_partner_tier_2)
  "admin": "8f26db11-07f0-4708-aedc-63b7bb88b1af", // Admin maps to super_user
  "leigh": "8f26db11-07f0-4708-aedc-63b7bb88b1af", // Leigh Mitchell
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
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[AIMS Feedback API] GET request for user:', userId);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Feedback API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Test database connection first
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('[AIMS Feedback API] Database connection test failed:', testError);
        return NextResponse.json({ 
          error: 'Database connection test failed',
          details: testError.message 
        }, { status: 500 });
      }
      
      console.log('[AIMS Feedback API] Database connection test passed');
    } catch (dbError) {
      console.error('[AIMS Feedback API] Database connection error:', dbError);
      return NextResponse.json({ 
        error: 'Database connection error',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Test if feedback table exists and is accessible
    try {
      const { data: feedbackTest, error: feedbackTestError } = await supabase
        .from('feedback')
        .select('id')
        .limit(1);
      
      if (feedbackTestError) {
        console.error('[AIMS Feedback API] Feedback table test failed:', feedbackTestError);
        return NextResponse.json({ 
          error: 'Feedback table not accessible',
          details: feedbackTestError.message 
        }, { status: 500 });
      }
      
      console.log('[AIMS Feedback API] Feedback table test passed');
    } catch (tableError) {
      console.error('[AIMS Feedback API] Feedback table error:', tableError);
      return NextResponse.json({ 
        error: 'Feedback table error',
        details: tableError instanceof Error ? tableError.message : 'Unknown error'
      }, { status: 500 });
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
    
    // First, get total count
    let countQuery = supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true });

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (category) {
      countQuery = countQuery.eq('category', category);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('[AIMS Feedback API] Error getting count:', countError);
    }
    
    // Then get the actual data
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
    
    // Get user details for all feedback items
    let enrichedFeedback = feedback || [];
    
    if (feedback && feedback.length > 0) {
      console.log('[AIMS Feedback API] Starting user enrichment...');
      
      // Get unique user IDs
      const userIds = Array.from(new Set(feedback.map((item: any) => item.user_id).filter(Boolean)));
      
      // Fetch user details for all user IDs
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      if (usersError) {
        console.warn('[AIMS Feedback API] Could not fetch user details:', usersError);
      }
      
      // Create a map of user ID to user details
      const userMap = new Map();
      (users || []).forEach((user: any) => {
        userMap.set(user.id, {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown User'
        });
      });
      
      // Enrich feedback with actual user data
      enrichedFeedback = feedback.map((item: any) => ({
        ...item,
        user: userMap.get(item.user_id) || {
          id: item.user_id || 'unknown',
          email: 'Unknown User',
          first_name: null,
          last_name: null,
          full_name: 'Unknown User'
        }
      }));
      
      console.log('[AIMS Feedback API] User enrichment completed');
    }

    return NextResponse.json({ 
      feedback: enrichedFeedback,
      total: totalCount || 0,
      page,
      limit,
      totalPages: Math.ceil((totalCount || 0) / limit)
    });
  } catch (error) {
    console.error('[AIMS Feedback API] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, category, feature, subject, message, priority, attachment_url, attachment_filename, attachment_type, attachment_size } = body;

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

    // Test database connection
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('[AIMS Feedback API] Database connection test failed:', testError);
        return NextResponse.json({ 
          error: 'Database connection test failed',
          details: testError.message 
        }, { status: 500 });
      }
      
      console.log('[AIMS Feedback API] Database connection test passed');
    } catch (dbError) {
      console.error('[AIMS Feedback API] Database connection error:', dbError);
      return NextResponse.json({ 
        error: 'Database connection error',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Test if feedback table exists
    try {
      const { data: feedbackTest, error: feedbackTestError } = await supabase
        .from('feedback')
        .select('id')
        .limit(1);
      
      if (feedbackTestError) {
        console.error('[AIMS Feedback API] Feedback table test failed:', feedbackTestError);
        return NextResponse.json({ 
          error: 'Feedback table not accessible',
          details: feedbackTestError.message 
        }, { status: 500 });
      }
      
      console.log('[AIMS Feedback API] Feedback table test passed');
    } catch (tableError) {
      console.error('[AIMS Feedback API] Feedback table error:', tableError);
      return NextResponse.json({ 
        error: 'Feedback table error',
        details: tableError instanceof Error ? tableError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Map mock user ID to real database user ID if needed
    let realUserId = userId;
    if (!isValidUUID(userId)) {
      realUserId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(realUserId)) {
      realUserId = "8f26db11-07f0-4708-aedc-63b7bb88b1af"; // fallback to existing super_user
    }

    // The feedback table might reference auth.users instead of public.users
    // Let's check what the current authenticated user ID is
    console.log('[AIMS Feedback API] Checking user authentication and table structure');
    
    // For now, let's try to use a known working approach
    // If the feedback table references auth.users, we need to use auth.uid()
    // Let's try to insert without checking user existence first
    console.log('[AIMS Feedback API] Attempting direct insert with user ID:', realUserId);

    // Validate priority if provided
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const finalPriority = priority && validPriorities.includes(priority) ? priority : 'medium';

    // Insert feedback with feature field
    const insertData: any = {
      user_id: realUserId,
      category,
      feature: feature?.trim() || null,  // Always include feature field
      subject: subject?.trim() || null,
      message: message.trim(),
      status: 'open',
      priority: finalPriority
    };

    console.log('[AIMS Feedback API] Including feature field:', insertData.feature);

    // Check if attachment columns exist by trying to get a sample feedback record
    let hasAttachmentColumns = false;
    try {
      const { data: sampleFeedback, error: sampleError } = await supabase
        .from('feedback')
        .select('*')
        .limit(1);
      
      if (!sampleError && sampleFeedback && sampleFeedback.length > 0) {
        hasAttachmentColumns = 'attachment_url' in sampleFeedback[0] && 
                              'attachment_filename' in sampleFeedback[0] && 
                              'attachment_type' in sampleFeedback[0] && 
                              'attachment_size' in sampleFeedback[0];
      }
      
      console.log('[AIMS Feedback API] Attachment columns exist:', hasAttachmentColumns);
    } catch (error) {
      console.warn('[AIMS Feedback API] Could not check for attachment columns:', error);
      // Assume columns exist to avoid blocking attachment uploads
      hasAttachmentColumns = true;
    }

    // Include attachment fields if provided and columns exist
    if (attachment_url && hasAttachmentColumns) {
      insertData.attachment_url = attachment_url;
      insertData.attachment_filename = attachment_filename;
      insertData.attachment_type = attachment_type;
      insertData.attachment_size = attachment_size;
    } else if (attachment_url && !hasAttachmentColumns) {
      console.warn('[AIMS Feedback API] Attachment provided but columns do not exist. Please run the database migration to add attachment support.');
    }

    console.log('[AIMS Feedback API] Inserting feedback with attachment data:', {
      hasAttachment: !!attachment_url,
      filename: attachment_filename,
      attachmentUrl: attachment_url,
      attachmentType: attachment_type,
      attachmentSize: attachment_size,
      hasAttachmentColumns,
      insertData: {
        user_id: insertData.user_id,
        category: insertData.category,
        hasSubject: !!insertData.subject,
        messageLength: insertData.message?.length || 0,
        attachmentFields: {
          attachment_url: insertData.attachment_url,
          attachment_filename: insertData.attachment_filename,
          attachment_type: insertData.attachment_type,
          attachment_size: insertData.attachment_size
        }
      }
    });

    // Log the actual insertData object being sent to database
    console.log('[AIMS Feedback API] Final insertData object:', JSON.stringify(insertData, null, 2));

    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[AIMS Feedback API] Error inserting feedback:', insertError);
      
      // Provide more specific error information
      let errorMessage = 'Failed to submit feedback';
      if (insertError.message) {
        errorMessage += `: ${insertError.message}`;
      }
      if (insertError.code) {
        console.error('[AIMS Feedback API] Error code:', insertError.code);
      }
      if (insertError.details) {
        console.error('[AIMS Feedback API] Error details:', insertError.details);
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: insertError.code,
        details: insertError.details
      }, { status: 500 });
    }

    // Log what was actually saved to the database
    console.log('[AIMS Feedback API] Feedback saved successfully. Database record:', JSON.stringify(feedback, null, 2));

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
    const { userId, id, status, priority, feature, admin_notes, assigned_to } = body;

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
    if (feature !== undefined) updateData.feature = feature?.trim() || null;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    
    // Set resolved_at if status is being changed to resolved
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    } else if (status === 'open' || status === 'in_progress') {
      updateData.resolved_at = null;
    }

    console.log('[AIMS Feedback API] Attempting to update feedback with data:', updateData);
    
    const { data: feedback, error: updateError } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[AIMS Feedback API] Error updating feedback:', updateError);
      console.error('[AIMS Feedback API] Error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      
      // Provide more specific error information
      let errorMessage = 'Failed to update feedback';
      if (updateError.code === '23514') { // Check constraint violation
        errorMessage = 'Invalid status value. The status must be one of: open, in_progress, resolved, closed, archived';
      } else if (updateError.message) {
        errorMessage += `: ${updateError.message}`;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint
      }, { status: 500 });
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

// DELETE - Delete feedback (for admin users)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, id } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 });
    }

    console.log('[AIMS Feedback API] DELETE request for user:', userId, 'feedback:', id);

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

    // Allow super users and dev partners to delete feedback
    const allowedRoles = ['super_user', 'dev_partner_tier_1', 'dev_partner_tier_2'];
    if (!allowedRoles.includes(user.role)) {
      console.log('[AIMS Feedback API] Delete access denied - user role is:', user.role, 'but requires one of:', allowedRoles);
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        details: `Your role is '${user.role}' but one of these roles is required: ${allowedRoles.join(', ')}` 
      }, { status: 403 });
    }

    // Delete the feedback
    const { error: deleteError } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[AIMS Feedback API] Error deleting feedback:', deleteError);
      return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
    }

    console.log('[AIMS Feedback API] Feedback deleted successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Feedback deleted successfully' 
    });
  } catch (error) {
    console.error('[AIMS Feedback API] Error in DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
