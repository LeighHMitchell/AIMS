import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { FocalPointType } from '@/types/focal-points';
import {
  notifyUserOfAssignment,
  notifyUserOfHandoff,
  notifyHandoffAccepted,
  notifyHandoffDeclined,
  notifyFocalPointRemoved,
} from '@/lib/focal-point-notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Fetch current focal point assignments with enhanced organization data and handoff tracking
    const { data: assignments, error } = await supabase
      .from('activity_contacts')
      .select(`
        id,
        type,
        title,
        first_name,
        last_name,
        email,
        organisation,
        position,
        profile_photo,
        user_id,
        focal_point_status,
        assigned_by,
        assigned_by_name,
        assigned_at,
        handed_off_by,
        handed_off_by_name,
        handed_off_at,
        handed_off_to,
        focal_point_responded_at,
        users:user_id (
          id,
          role,
          job_title,
          title,
          organization_id,
          organizations:organization_id (
            id,
            name,
            acronym,
            iati_org_id,
            country
          )
        )
      `)
      .eq('activity_id', id)
      .in('type', ['government_focal_point', 'development_partner_focal_point']);

    if (error) {
      console.error('[AIMS] Error fetching focal point assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // Format assignments with enhanced organization information and handoff tracking
    const formattedAssignments = assignments?.map((a: any) => {
      const user = a.users;
      const organization = user?.organizations;
      
      return {
        id: a.id,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email,
        email: a.email,
        organisation: a.organisation,
        role: user?.role || a.position || 'Focal Point',
        job_title: user?.job_title,
        title: user?.title || a.title,
        type: a.type,
        avatar_url: a.profile_photo,
        user_id: a.user_id,
        status: a.focal_point_status || 'assigned',
        assigned_by: a.assigned_by,
        assigned_by_name: a.assigned_by_name,
        assigned_at: a.assigned_at,
        handed_off_by: a.handed_off_by,
        handed_off_by_name: a.handed_off_by_name,
        handed_off_at: a.handed_off_at,
        handed_off_to: a.handed_off_to,
        responded_at: a.focal_point_responded_at,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          acronym: organization.acronym,
          iati_org_id: organization.iati_org_id,
          country: organization.country
        } : null
      };
    }) || [];

    // Group by type
    const governmentFocalPoints = formattedAssignments.filter((a: any) => a.type === 'government_focal_point');
    const developmentPartnerFocalPoints = formattedAssignments.filter((a: any) => a.type === 'development_partner_focal_point');

    return NextResponse.json({
      government_focal_points: governmentFocalPoints,
      development_partner_focal_points: developmentPartnerFocalPoints
    });

  } catch (error) {
    console.error('[AIMS] Error in focal points GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const { user_id, type, action = 'assign', current_user_id } = body;

    if (!user_id || !type) {
      return NextResponse.json(
        { error: 'User ID and type are required' },
        { status: 400 }
      );
    }

    if (!['government_focal_point', 'development_partner_focal_point'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid focal point type' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Get current user details if provided
    let currentUserData: any = null;
    let currentUserName = 'System';
    let isSuperUser = false;

    if (current_user_id) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role, first_name, last_name, email')
        .eq('id', current_user_id)
        .single();

      if (!userError && userData) {
        currentUserData = userData;
        currentUserName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email;
        isSuperUser = userData.role === 'super_user';
      }
    }

    // Get activity details for notifications
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('id', id)
      .single();

    if (activityError || !activity) {
      console.error('[AIMS] Activity not found:', id, activityError);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activityTitle = activity.title_narrative || 'Untitled Activity';

    // Handle different actions
    if (action === 'remove') {
      return handleRemove(supabase, user_id, id, type as FocalPointType, currentUserData, currentUserName, isSuperUser, activityTitle);
    }

    if (action === 'handoff') {
      return handleHandoff(supabase, user_id, id, type as FocalPointType, currentUserData, currentUserName, activityTitle);
    }

    if (action === 'accept_handoff') {
      return handleAcceptHandoff(supabase, user_id, id, type as FocalPointType, currentUserName, activityTitle);
    }

    if (action === 'decline_handoff') {
      return handleDeclineHandoff(supabase, user_id, id, type as FocalPointType, currentUserName, activityTitle);
    }

    // Default: Super user assignment
    if (!isSuperUser) {
      return NextResponse.json(
        { error: 'Only super users can directly assign focal points' },
        { status: 403 }
      );
    }

    return handleAssign(supabase, user_id, id, type as FocalPointType, currentUserData, currentUserName, activityTitle);

  } catch (error) {
    console.error('[AIMS] Error in focal points POST API:', error);
        return NextResponse.json(
      { error: 'Internal server error' },
          { status: 500 }
        );
  }
}

// Handle super user assignment
async function handleAssign(
  supabase: any,
  userId: string,
  activityId: string,
  type: FocalPointType,
  currentUser: any,
  currentUserName: string,
  activityTitle: string
) {
  // Get user details
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, title, email, role, organisation, avatar_url')
    .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('[AIMS] Error fetching user for assignment:', userError);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

  // Check if assignment already exists
      const { data: existing } = await supabase
        .from('activity_contacts')
        .select('id')
    .eq('activity_id', activityId)
        .eq('email', user.email)
        .eq('type', type)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'User is already assigned as this focal point type' },
          { status: 400 }
        );
      }

      // Create new assignment
      const contactData = {
    activity_id: activityId,
        type: type,
    user_id: user.id,
    title: user.title,
    first_name: user.first_name || user.email.split('@')[0],
    last_name: user.last_name || 'User',
    position: user.role || null,
        email: user.email,
        organisation: user.organisation,
    profile_photo: user.avatar_url,
    focal_point_status: 'assigned',
    assigned_by: currentUser?.id,
    assigned_by_name: currentUserName,
    assigned_at: new Date().toISOString()
      };

      const { data: newAssignment, error } = await supabase
        .from('activity_contacts')
        .insert(contactData)
        .select()
        .single();

      if (error) {
        console.error('[AIMS] Error creating focal point assignment:', error);
        return NextResponse.json(
          { error: 'Failed to create assignment' },
          { status: 500 }
        );
      }

  // Send notification to the assigned user
  try {
    await notifyUserOfAssignment(user.id, activityId, activityTitle, currentUserName, type);
  } catch (notifyError) {
    console.error('[AIMS] Error sending assignment notification:', notifyError);
  }

      return NextResponse.json({ 
        success: true, 
        action: 'assigned',
        assignment: newAssignment 
      });
    }

// Handle handoff initiation
async function handleHandoff(
  supabase: any,
  targetUserId: string,
  activityId: string,
  type: FocalPointType,
  currentUser: any,
  currentUserName: string,
  activityTitle: string
) {
  if (!currentUser) {
    return NextResponse.json(
      { error: 'Authentication required for handoff' },
      { status: 401 }
    );
  }

  // Verify current user is a focal point for this activity
  const { data: currentFocalPoint } = await supabase
    .from('activity_contacts')
    .select('id, user_id, type, email')
    .eq('activity_id', activityId)
    .eq('type', type)
    .eq('user_id', currentUser.id)
    .in('focal_point_status', ['assigned', 'accepted'])
    .single();

  if (!currentFocalPoint) {
    return NextResponse.json(
      { error: 'You are not a focal point for this activity' },
      { status: 403 }
    );
  }

  // Get target user details
  const { data: targetUser, error: targetUserError } = await supabase
    .from('users')
    .select('id, first_name, last_name, title, email, role, organisation, avatar_url')
    .eq('id', targetUserId)
    .single();

  if (targetUserError || !targetUser) {
    return NextResponse.json(
      { error: 'Target user not found' },
      { status: 404 }
    );
  }

  // Check if target user already has this focal point type
  const { data: existing } = await supabase
    .from('activity_contacts')
    .select('id')
    .eq('activity_id', activityId)
    .eq('email', targetUser.email)
    .eq('type', type)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'User is already assigned as this focal point type' },
      { status: 400 }
    );
  }

  // Update current focal point to pending_handoff status
  const { error: updateError } = await supabase
    .from('activity_contacts')
    .update({
      focal_point_status: 'pending_handoff',
      handed_off_by: currentUser.id,
      handed_off_by_name: currentUserName,
      handed_off_to: targetUser.id,
      handed_off_at: new Date().toISOString()
    })
    .eq('id', currentFocalPoint.id);

  if (updateError) {
    console.error('[AIMS] Error initiating handoff:', updateError);
    return NextResponse.json(
      { error: 'Failed to initiate handoff' },
      { status: 500 }
    );
  }

  // Send notification to target user
  try {
    await notifyUserOfHandoff(targetUser.id, activityId, activityTitle, currentUserName, type);
  } catch (notifyError) {
    console.error('[AIMS] Error sending handoff notification:', notifyError);
  }

  return NextResponse.json({ 
    success: true, 
    action: 'handoff_initiated'
  });
}

// Handle accept handoff
async function handleAcceptHandoff(
  supabase: any,
  userId: string,
  activityId: string,
  type: FocalPointType,
  currentUserName: string,
  activityTitle: string
) {
  // Find the pending handoff for this user
  const { data: pendingHandoff } = await supabase
    .from('activity_contacts')
    .select('id, handed_off_by, handed_off_by_name, user_id, email, first_name, last_name, title, organisation, profile_photo, position')
    .eq('activity_id', activityId)
    .eq('type', type)
    .eq('handed_off_to', userId)
    .eq('focal_point_status', 'pending_handoff')
    .single();

  if (!pendingHandoff) {
    return NextResponse.json(
      { error: 'No pending handoff found for you' },
      { status: 404 }
    );
  }

  // Get accepting user details
  const { data: acceptingUser, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, title, email, role, organisation, avatar_url')
    .eq('id', userId)
    .single();

  if (userError || !acceptingUser) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  const acceptingUserName = `${acceptingUser.first_name || ''} ${acceptingUser.last_name || ''}`.trim() || acceptingUser.email;

  // Create new focal point record for the accepting user
  const newFocalPointData = {
    activity_id: activityId,
    type: type,
    user_id: acceptingUser.id,
    title: acceptingUser.title,
    first_name: acceptingUser.first_name || acceptingUser.email.split('@')[0],
    last_name: acceptingUser.last_name || 'User',
    position: acceptingUser.role || null,
    email: acceptingUser.email,
    organisation: acceptingUser.organisation,
    profile_photo: acceptingUser.avatar_url,
    focal_point_status: 'accepted',
    assigned_by: pendingHandoff.handed_off_by,
    assigned_by_name: pendingHandoff.handed_off_by_name,
    assigned_at: new Date().toISOString(),
    handed_off_by: pendingHandoff.handed_off_by,
    handed_off_by_name: pendingHandoff.handed_off_by_name,
    handed_off_at: new Date().toISOString(),
    focal_point_responded_at: new Date().toISOString()
  };

  const { data: newAssignment, error: insertError } = await supabase
    .from('activity_contacts')
    .insert(newFocalPointData)
    .select()
    .single();

  if (insertError) {
    console.error('[AIMS] Error creating new focal point assignment:', insertError);
    return NextResponse.json(
      { error: 'Failed to accept handoff' },
      { status: 500 }
    );
  }

  // Remove the old focal point assignment (the one with pending_handoff status)
  const { error: deleteError } = await supabase
    .from('activity_contacts')
    .delete()
    .eq('id', pendingHandoff.id);

  if (deleteError) {
    console.error('[AIMS] Error removing old focal point:', deleteError);
    // Don't fail the request, the new assignment is already created
  }

  // Notify the original focal point that handoff was accepted
  if (pendingHandoff.handed_off_by) {
    try {
      await notifyHandoffAccepted(pendingHandoff.handed_off_by, activityId, activityTitle, acceptingUserName, type);
    } catch (notifyError) {
      console.error('[AIMS] Error sending handoff accepted notification:', notifyError);
    }
  }

  return NextResponse.json({ 
    success: true, 
    action: 'handoff_accepted',
    assignment: newAssignment
  });
}

// Handle decline handoff
async function handleDeclineHandoff(
  supabase: any,
  userId: string,
  activityId: string,
  type: FocalPointType,
  currentUserName: string,
  activityTitle: string
) {
  // Find the pending handoff for this user
  const { data: pendingHandoff } = await supabase
    .from('activity_contacts')
    .select('id, handed_off_by, handed_off_by_name, user_id')
    .eq('activity_id', activityId)
    .eq('type', type)
    .eq('handed_off_to', userId)
    .eq('focal_point_status', 'pending_handoff')
    .single();

  if (!pendingHandoff) {
    return NextResponse.json(
      { error: 'No pending handoff found for you' },
      { status: 404 }
    );
  }

  // Get declining user details for notification
  const { data: decliningUser } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', userId)
    .single();

  const decliningUserName = decliningUser 
    ? `${decliningUser.first_name || ''} ${decliningUser.last_name || ''}`.trim() || decliningUser.email
    : 'User';

  // Restore the original focal point status to 'assigned'
  const { error: updateError } = await supabase
    .from('activity_contacts')
    .update({
      focal_point_status: 'assigned',
      handed_off_to: null,
      focal_point_responded_at: new Date().toISOString()
    })
    .eq('id', pendingHandoff.id);

  if (updateError) {
    console.error('[AIMS] Error declining handoff:', updateError);
    return NextResponse.json(
      { error: 'Failed to decline handoff' },
      { status: 500 }
    );
  }

  // Notify the original focal point that handoff was declined
  if (pendingHandoff.handed_off_by) {
    try {
      await notifyHandoffDeclined(pendingHandoff.handed_off_by, activityId, activityTitle, decliningUserName, type);
    } catch (notifyError) {
      console.error('[AIMS] Error sending handoff declined notification:', notifyError);
    }
  }

  return NextResponse.json({ 
    success: true, 
    action: 'handoff_declined'
  });
}

// Handle remove focal point
async function handleRemove(
  supabase: any,
  contactId: string,
  activityId: string,
  type: FocalPointType,
  currentUser: any,
  currentUserName: string,
  isSuperUser: boolean,
  activityTitle: string
) {
  // Get the focal point to be removed
  const { data: focalPoint } = await supabase
    .from('activity_contacts')
    .select('id, user_id, email, first_name, last_name')
    .eq('id', contactId)
    .single();

  if (!focalPoint) {
    return NextResponse.json(
      { error: 'Focal point not found' },
      { status: 404 }
    );
  }

  // Check permissions: only super user or the focal point themselves can remove
  if (!isSuperUser && currentUser?.id !== focalPoint.user_id) {
    return NextResponse.json(
      { error: 'Unauthorized to remove this focal point' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('activity_contacts')
    .delete()
    .eq('id', contactId);

  if (error) {
    console.error('[AIMS] Error removing focal point assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }

  // Notify the removed user (if not removing themselves)
  if (focalPoint.user_id && currentUser?.id !== focalPoint.user_id) {
    try {
      await notifyFocalPointRemoved(focalPoint.user_id, activityId, activityTitle, currentUserName, type);
    } catch (notifyError) {
      console.error('[AIMS] Error sending removal notification:', notifyError);
    }
  }  return NextResponse.json({ success: true, action: 'removed' });
}