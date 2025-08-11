import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Fetch current focal point assignments with enhanced organization data
    const { data: assignments, error } = await supabase
      .from('activity_contacts')
      .select(`
        id,
        type,
        first_name,
        last_name,
        email,
        organisation,
        position,
        profile_photo,
        user_id,
        users:user_id (
          id,
          role,
          job_title,
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

    // Format assignments with enhanced organization information
    const formattedAssignments = assignments?.map((a: any) => {
      const user = a.users;
      const organization = user?.organizations;
      
      return {
        id: a.id,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email,
        email: a.email,
        organisation: a.organisation, // Keep for backward compatibility
        role: user?.role || a.position || 'Focal Point',
        job_title: user?.job_title,
        type: a.type,
        avatar_url: a.profile_photo,
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const { user_id, type, action = 'assign' } = body;

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

    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Check if activity exists before proceeding
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', id)
      .single();

    if (activityError || !activity) {
      console.error('[AIMS] Activity not found:', id, activityError);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (action === 'remove') {
      // Remove assignment by contact_id (passed as user_id for now)
      const contact_id = user_id; // The frontend sends contact_id as user_id for removal
      const { error } = await supabase
        .from('activity_contacts')
        .delete()
        .eq('id', contact_id);

      if (error) {
        console.error('[AIMS] Error removing focal point assignment:', error);
        return NextResponse.json(
          { error: 'Failed to remove assignment' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Assign user - first get user details
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, organisation, avatar_url')
        .eq('id', user_id)
        .single();

      if (userError || !user) {
        console.error('[AIMS] Error fetching user for assignment:', userError);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if assignment already exists (by email + type)
      const { data: existing } = await supabase
        .from('activity_contacts')
        .select('id')
        .eq('activity_id', id)
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
        activity_id: id,
        type: type,
        user_id: user.id, // Store user_id to enable enhanced data retrieval
        first_name: user.first_name || user.email.split('@')[0], // Use email username as fallback
        last_name: user.last_name || 'User', // Required field - use generic fallback
        position: user.role || 'Focal Point', // Required field - use descriptive fallback
        email: user.email,
        organisation: user.organisation,
        profile_photo: user.avatar_url
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

      return NextResponse.json({ 
        success: true, 
        action: 'assigned',
        assignment: newAssignment 
      });
    }

  } catch (error) {
    console.error('[AIMS] Error in focal points POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



