import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[AIMS] GET /api/organizations/[id] - Starting request for ID:', params.id);
  
  try {
    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const { data: organization, error } = await getSupabaseAdmin()
      .from('organizations')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      console.error('[AIMS] Error fetching organization:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Calculate active project count
    const { data: activities, error: activitiesError } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .eq('created_by_org', params.id)
      .eq('activity_status', 'implementation');
    
    const { data: contributions, error: contributionsError } = await getSupabaseAdmin()
      .from('activity_contributors')
      .select('activity_id')
      .eq('organization_id', params.id)
      .in('contribution_type', ['funder', 'implementer', 'funding', 'implementing']);
    
    let activeProjectCount = 0;
    
    if (activities && !activitiesError) {
      activeProjectCount += activities.length;
    }
    
    if (contributions && !contributionsError) {
      // Get unique activity IDs from contributions
      const contributionActivityIds = new Set(contributions.map((c: any) => c.activity_id));
      
      // Check which of these are active
      const { data: activeContributedActivities } = await getSupabaseAdmin()
        .from('activities')
        .select('id')
        .in('id', Array.from(contributionActivityIds))
        .eq('activity_status', 'implementation');
      
      if (activeContributedActivities) {
        activeProjectCount += activeContributedActivities.length;
      }
    }
    
    // Enhance organization with computed fields
    const enhancedOrganization = {
      ...organization,
      active_project_count: activeProjectCount,
      // Add default values for IATI fields if not present
      default_currency: organization.default_currency || 'USD',
      default_language: organization.default_language || 'en',
      secondary_reporter: organization.secondary_reporter || false
    };
    
    console.log('[AIMS] Found organization:', organization.name);
    
    const response = NextResponse.json(enhancedOrganization);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[AIMS] PUT /api/organizations/[id] - Updating organization:', params.id);
  
  try {
    const body = await request.json();
    
    // Remove computed fields before updating
    const { active_project_count, ...updateData } = body;
    
    const { data, error } = await getSupabaseAdmin()
      .from('organizations')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error updating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Updated organization:', data.name);
    
    const response = NextResponse.json(data);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[AIMS] DELETE /api/organizations/[id] - Deleting organization:', params.id);
  
  try {
    // Check if organization has dependencies
    const { data: users } = await getSupabaseAdmin()
      .from('users')
      .select('id')
      .eq('organization_id', params.id)
      .limit(1);
    
    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with assigned users' },
        { status: 400 }
      );
    }
    
    // Check for activities
    const { data: activities } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .eq('created_by_org', params.id)
      .limit(1);
    
    if (activities && activities.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with associated activities' },
        { status: 400 }
      );
    }
    
    const { error } = await getSupabaseAdmin()
      .from('organizations')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      console.error('[AIMS] Error deleting organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Deleted organization:', params.id);
    
    const response = NextResponse.json({ success: true });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 