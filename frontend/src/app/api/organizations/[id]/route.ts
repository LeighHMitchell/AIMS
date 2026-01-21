import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  
  try {
    const { id } = await params;
    console.log('[AIMS] GET /api/organizations/[id] - Starting request for ID:', id);
    
    if (!supabase) {
      console.error('[AIMS] Supabase client is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
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
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', id);
    
    const { data: contributions, error: contributionsError } = await supabase
      .from('activity_contributors')
      .select('activity_id')
      .eq('organization_id', id)
      .in('contribution_type', ['funder', 'implementer', 'funding', 'implementing']);
    
    let totalActivitiesCount = 0;
    
    if (activities && !activitiesError) {
      totalActivitiesCount += activities.length;
    }
    
    if (contributions && !contributionsError) {
      // Get unique activity IDs from contributions
      const contributionActivityIds = new Set(contributions.map((c: any) => c.activity_id));
      
      // Check which of these activities exist (regardless of status)
      const { data: contributedActivities } = await supabase
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
      // Map country back to country_represented for frontend form compatibility
      country_represented: organization.country,
      // Add default values for IATI fields if not present
      default_currency: organization.default_currency || 'USD',
      default_language: organization.default_language || 'en',
      secondary_reporter: organization.secondary_reporter || false,
      // Add default values for image positioning fields
      banner_position: organization.banner_position ?? 50,
      logo_scale: organization.logo_scale ?? 100
    };
    
    console.log('[AIMS] Found organization:', organization.name);
    console.log('[AIMS] DB country:', organization.country);
    console.log('[AIMS] Returning country_represented:', enhancedOrganization.country_represented);
    console.log('[AIMS] DB default_currency:', organization.default_currency);
    console.log('[AIMS] Returning default_currency:', enhancedOrganization.default_currency);
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  
  try {
    const { id } = await params;
    console.log('[AIMS] PUT /api/organizations/[id] - Updating organization:', id);
    const body = await request.json();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    // Remove computed fields before updating
    const { active_project_count, ...updates } = body;
    
    // Handle alias fields - normalize and validate
    if ('alias_refs' in updates) {
      if (updates.alias_refs) {
        // Normalize: trim, remove duplicates, filter empty strings
        updates.alias_refs = [...new Set(
          updates.alias_refs
            .map((ref: string) => ref.trim())
            .filter((ref: string) => ref.length > 0)
        )];
        
        // Validate: ensure no alias is another org's canonical IATI ID
        if (updates.alias_refs.length > 0) {
          const { data: conflictOrgs } = await supabase
            .from('organizations')
            .select('id, iati_org_id, name')
            .in('iati_org_id', updates.alias_refs)
            .neq('id', id);
          
          if (conflictOrgs && conflictOrgs.length > 0) {
            const conflicts = conflictOrgs.map(o => `${o.iati_org_id} (${o.name})`).join(', ');
            return NextResponse.json(
              { error: `Alias conflict: ${conflicts} already use these identifiers as their canonical IATI IDs` },
              { status: 400 }
            );
          }
        }
      } else {
        updates.alias_refs = [];
      }
    }
    
    if ('name_aliases' in updates) {
      if (updates.name_aliases) {
        // Normalize: trim, remove duplicates, filter empty strings
        updates.name_aliases = [...new Set(
          updates.name_aliases
            .map((name: string) => name.trim())
            .filter((name: string) => name.length > 0)
        )];
      } else {
        updates.name_aliases = [];
      }
    }
    
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

    // Handle banner_position field - ensure it's a valid integer between 0-100
    if ('banner_position' in updates) {
      const pos = parseInt(updates.banner_position);
      updates.banner_position = isNaN(pos) ? 50 : Math.max(0, Math.min(100, pos));
    }

    // Handle logo_scale field - ensure it's a valid integer between 50-150
    if ('logo_scale' in updates) {
      const scale = parseInt(updates.logo_scale);
      updates.logo_scale = isNaN(scale) ? 100 : Math.max(50, Math.min(150, scale));
    }

    // Handle iati_org_id field - convert empty strings to null to avoid unique constraint issues
    if ('iati_org_id' in updates) {
      if (!updates.iati_org_id || updates.iati_org_id.trim() === '') {
        updates.iati_org_id = null;
      }
    }
    
    // Map frontend field names to database column names
    if ('country_represented' in updates) {
      console.log('[AIMS] Received country_represented:', updates.country_represented);
      updates.country = updates.country_represented;
      console.log('[AIMS] Saving to country column:', updates.country);
      delete updates.country_represented;
    }
    
    if ('organisation_type' in updates) {
      // Save to both type and organisation_type columns for compatibility
      updates.type = updates.organisation_type;
      updates.organisation_type = updates.organisation_type;
    }
    
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error updating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Updated organization:', data.name);
    console.log('[AIMS] Stored country in DB:', data.country);

    // Enhance response with frontend field mappings
    const enhancedData = {
      ...data,
      country_represented: data.country,
      organisation_type: data.organisation_type || data.type
    };

    const response = NextResponse.json(enhancedData);
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  
  try {
    const { id } = await params;
    console.log('[AIMS] DELETE /api/organizations/[id] - Deleting organization:', id);
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    // Check if organization has dependencies
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', id)
      .limit(1);
    
    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with assigned users' },
        { status: 400 }
      );
    }
    
    // Check for activities
    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .eq('created_by_org', id)
      .limit(1);
    
    if (activities && activities.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with associated activities' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[AIMS] Error deleting organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Deleted organization:', id);
    
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
