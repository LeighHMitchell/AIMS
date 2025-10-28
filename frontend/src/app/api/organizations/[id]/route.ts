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
    
    // Calculate total activities reported by this organization
    const { data: activities, error: activitiesError } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .eq('reporting_org_id', params.id);
    
    const { data: contributions, error: contributionsError } = await getSupabaseAdmin()
      .from('activity_contributors')
      .select('activity_id')
      .eq('organization_id', params.id)
      .in('contribution_type', ['funder', 'implementer', 'funding', 'implementing']);
    
    let totalActivitiesCount = 0;
    
    if (activities && !activitiesError) {
      totalActivitiesCount += activities.length;
    }
    
    if (contributions && !contributionsError) {
      // Get unique activity IDs from contributions
      const contributionActivityIds = new Set(contributions.map((c: any) => c.activity_id));
      
      // Check which of these activities exist (regardless of status)
      const { data: contributedActivities } = await getSupabaseAdmin()
        .from('activities')
        .select('id')
        .in('id', Array.from(contributionActivityIds));
      
      if (contributedActivities) {
        totalActivitiesCount += contributedActivities.length;
      }
    }
    
    // Enhance organization with computed fields
    const enhancedOrganization = {
      ...organization,
      // Ensure we use the correct organisation_type field for frontend compatibility
      organisation_type: organization.organisation_type || organization.type,
      active_project_count: totalActivitiesCount,
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
    const { active_project_count, ...updates } = body;
    
    // Handle new IATI fields - ensure proper data types and defaults
    if ('reporting_org_secondary_reporter' in updates) {
      updates.reporting_org_secondary_reporter = updates.reporting_org_secondary_reporter || false;
    }
    
    if ('last_updated_datetime' in updates) {
      // Auto-update to current timestamp if not provided
      updates.last_updated_datetime = updates.last_updated_datetime || new Date().toISOString();
    }
    
    if ('default_currency' in updates) {
      updates.default_currency = updates.default_currency || 'USD';
    }
    
    if ('default_language' in updates) {
      updates.default_language = updates.default_language || 'en';
    }
    
    // Handle iati_org_id field - convert empty strings to null to avoid unique constraint issues
    if ('iati_org_id' in updates) {
      if (!updates.iati_org_id || updates.iati_org_id.trim() === '') {
        updates.iati_org_id = null;
      }
    }
    
    // Map frontend field names to database column names
    if ('country_represented' in updates) {
      updates.country = updates.country_represented;
      delete updates.country_represented;
    }
    
    if ('organisation_type' in updates) {
      // Save to both type and organisation_type columns for compatibility
      updates.type = updates.organisation_type;
      updates.organisation_type = updates.organisation_type;
    }
    
    const { data, error } = await getSupabaseAdmin()
      .from('organizations')
      .update(updates)
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