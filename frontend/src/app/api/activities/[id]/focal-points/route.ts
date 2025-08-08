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

    // Fetch current focal point assignments
    const { data: assignments, error } = await supabase
      .from('activity_contacts')
      .select(`
        id,
        user_id,
        type,
        name,
        email,
        organisation,
        role,
        users!inner(id, name, first_name, last_name, email, role, organisation)
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

    // Group by type
    const governmentFocalPoints = assignments?.filter((a: any) => a.type === 'government_focal_point') || [];
    const developmentPartnerFocalPoints = assignments?.filter((a: any) => a.type === 'development_partner_focal_point') || [];

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

    if (action === 'remove') {
      // Remove assignment
      const { error } = await supabase
        .from('activity_contacts')
        .delete()
        .eq('activity_id', id)
        .eq('user_id', user_id)
        .eq('type', type);

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
        .select('id, name, first_name, last_name, email, role, organisation')
        .eq('id', user_id)
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
        .eq('activity_id', id)
        .eq('user_id', user_id)
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
        user_id: user_id,
        type: type,
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email,
        organisation: user.organisation,
        role: user.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
