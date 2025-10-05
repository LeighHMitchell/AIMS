import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface ParticipatingOrganization {
  id: string;
  activity_id: string;
  organization_id: string;
  role_type: 'extending' | 'implementing' | 'government' | 'funding';
  display_order: number;
  created_at: string;
  updated_at: string;
  
  // IATI Standard fields
  iati_role_code: number;              // 1-4 (required by IATI)
  iati_org_ref?: string;               // Organization IATI identifier (@ref)
  org_type?: string;                   // Organization type code (@type)
  activity_id_ref?: string;            // Related activity IATI ID (@activity-id)
  crs_channel_code?: string;           // CRS channel code (@crs-channel-code)
  narrative?: string;                  // Organization name (<narrative>)
  narrative_lang?: string;             // Language code (xml:lang)
  narratives?: Array<{ lang: string; text: string }>; // Multilingual names
  org_activity_id?: string;            // Organisation's own activity reference
  reporting_org_ref?: string;          // Reporting organisation reference
  secondary_reporter?: boolean;        // Secondary reporter flag
  
  // Joined organization data
  organization?: {
    id: string;
    name: string;
    acronym?: string;
    iati_org_id?: string;
    logo?: string;
    country?: string;
    organisation_type?: string;
  };
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// GET /api/activities/[id]/participating-organizations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    console.log('[AIMS] GET /api/activities/[id]/participating-organizations for activity:', activityId);
    
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
      .from('activity_participating_organizations')
      .select(`
        *,
        organization:organizations(
          id,
          name,
          acronym,
          iati_org_id,
          logo,
          country,
          organisation_type
        )
      `)
      .eq('activity_id', activityId)
      .order('display_order, created_at');

    if (error) {
      console.error('[AIMS] Error fetching participating organizations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Found participating organizations:', data?.length || 0);
    
    // Process narratives JSON field
    const processedData = data?.map(org => ({
      ...org,
      narratives: org.narratives ? JSON.parse(org.narratives) : null
    })) || [];
    
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('[AIMS] Unexpected error in GET participating organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/activities/[id]/participating-organizations
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body = await request.json();
    console.log('[AIMS] POST /api/activities/[id]/participating-organizations for activity:', activityId);
    console.log('[AIMS] Request body:', JSON.stringify(body, null, 2));

    const { 
      organization_id, 
      role_type, 
      display_order = 0,
      iati_role_code,
      iati_org_ref,
      org_type,
      activity_id_ref,
      crs_channel_code,
      narrative,
      narrative_lang = 'en',
      narratives,
      org_activity_id,
      reporting_org_ref,
      secondary_reporter = false
    } = body;

    console.log('[AIMS] Parsed body:', { organization_id, role_type, iati_role_code, display_order });
    console.log('[AIMS] Activity ID from URL:', activityId);

    if (!organization_id || !role_type) {
      console.error('[AIMS] Missing required fields:', { organization_id, role_type });
      return NextResponse.json(
        { error: 'organization_id and role_type are required' },
        { status: 400 }
      );
    }

    if (!['extending', 'implementing', 'government', 'funding'].includes(role_type)) {
      return NextResponse.json(
        { error: 'role_type must be one of: extending, implementing, government, funding' },
        { status: 400 }
      );
    }

    // Map role_type to IATI role code (use provided code if available, otherwise map from role_type)
    const iatiRoleCodeMap: Record<string, number> = {
      'funding': 1,
      'government': 2,
      'extending': 3,
      'implementing': 4
    };
    
    const finalIatiRoleCode = iati_role_code || iatiRoleCodeMap[role_type];

    const supabaseAdmin = getSupabaseAdmin();
    
    // Check if this organization is already participating in this role
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('activity_participating_organizations')
      .select('id')
      .eq('activity_id', activityId)
      .eq('organization_id', organization_id)
      .eq('role_type', role_type)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[AIMS] Error checking existing participating organization:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Organization is already participating in this role' },
        { status: 409 }
      );
    }

    // Insert new participating organization with IATI fields
    const { data, error } = await supabaseAdmin
      .from('activity_participating_organizations')
      .insert({
        activity_id: activityId,
        organization_id,
        role_type,
        display_order,
        iati_role_code: finalIatiRoleCode,
        iati_org_ref,
        org_type,
        activity_id_ref,
        crs_channel_code,
        narrative,
        narrative_lang,
        narratives: narratives ? JSON.stringify(narratives) : null,
        org_activity_id,
        reporting_org_ref,
        secondary_reporter
      })
      .select(`
        *,
        organization:organizations(
          id,
          name,
          acronym,
          iati_org_id,
          logo,
          country,
          organisation_type
        )
      `)
      .single();

    if (error) {
      console.error('[AIMS] Error creating participating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Created participating organization:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Unexpected error in POST participating organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/activities/[id]/participating-organizations
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body = await request.json();
    console.log('[AIMS] PUT /api/activities/[id]/participating-organizations for activity:', activityId);
    console.log('[AIMS] Request body:', JSON.stringify(body, null, 2));

    const { 
      participating_org_id,  // ID of the participating org record to update
      organization_id,
      role_type,
      iati_org_ref,
      org_type,
      activity_id_ref,
      crs_channel_code,
      narrative,
      narrative_lang,
      narratives,
      org_activity_id,
      reporting_org_ref,
      secondary_reporter
    } = body;

    if (!participating_org_id) {
      return NextResponse.json(
        { error: 'participating_org_id is required' },
        { status: 400 }
      );
    }

    // Map role_type to IATI role code if role_type is provided
    const iatiRoleCodeMap: Record<string, number> = {
      'funding': 1,
      'government': 2,
      'extending': 3,
      'implementing': 4
    };

    const supabaseAdmin = getSupabaseAdmin();
    
    // Build update object dynamically
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (organization_id) updateData.organization_id = organization_id;
    if (role_type) {
      updateData.role_type = role_type;
      updateData.iati_role_code = iatiRoleCodeMap[role_type];
    }
    if (iati_org_ref !== undefined) updateData.iati_org_ref = iati_org_ref;
    if (org_type !== undefined) updateData.org_type = org_type;
    if (activity_id_ref !== undefined) updateData.activity_id_ref = activity_id_ref;
    if (crs_channel_code !== undefined) updateData.crs_channel_code = crs_channel_code;
    if (narrative !== undefined) updateData.narrative = narrative;
    if (narrative_lang !== undefined) updateData.narrative_lang = narrative_lang;
    if (narratives !== undefined) updateData.narratives = narratives ? JSON.stringify(narratives) : null;
    if (org_activity_id !== undefined) updateData.org_activity_id = org_activity_id;
    if (reporting_org_ref !== undefined) updateData.reporting_org_ref = reporting_org_ref;
    if (secondary_reporter !== undefined) updateData.secondary_reporter = secondary_reporter;

    const { data, error } = await supabaseAdmin
      .from('activity_participating_organizations')
      .update(updateData)
      .eq('id', participating_org_id)
      .eq('activity_id', activityId)
      .select(`
        *,
        organization:organizations(
          id,
          name,
          acronym,
          iati_org_id,
          logo,
          country,
          organisation_type
        )
      `)
      .single();

    if (error) {
      console.error('[AIMS] Error updating participating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Participating organization not found' },
        { status: 404 }
      );
    }

    console.log('[AIMS] Updated participating organization:', data);
    
    // Process narratives JSON field
    const processedData = {
      ...data,
      narratives: data.narratives ? JSON.parse(data.narratives) : null
    };
    
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('[AIMS] Unexpected error in PUT participating organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id]/participating-organizations
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const url = new URL(request.url);
    const participatingOrgId = url.searchParams.get('id');
    const organizationId = url.searchParams.get('organization_id');
    const roleType = url.searchParams.get('role_type');

    console.log('[AIMS] DELETE /api/activities/[id]/participating-organizations for activity:', activityId);
    console.log('[AIMS] Participating Org ID:', participatingOrgId, 'Organization ID:', organizationId, 'Role type:', roleType);

    const supabaseAdmin = getSupabaseAdmin();
    
    // If no specific parameters provided, delete all participating organizations for this activity
    if (!participatingOrgId && !organizationId && !roleType) {
      console.log('[AIMS] No specific parameters provided, deleting all participating organizations for activity:', activityId);
      
      const { data, error } = await supabaseAdmin
        .from('activity_participating_organizations')
        .delete()
        .eq('activity_id', activityId)
        .select();

      if (error) {
        console.error('[AIMS] Error deleting all participating organizations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log('[AIMS] Deleted all participating organizations for activity:', activityId, 'Count:', data?.length || 0);
      return NextResponse.json({ success: true, deletedCount: data?.length || 0 });
    }
    
    // Support deleting by ID (preferred) or by organization_id + role_type (backward compatibility)
    if (participatingOrgId) {
      console.log('[AIMS] Attempting to delete by ID:', participatingOrgId, 'from activity:', activityId);
      
      const { data, error } = await supabaseAdmin
        .from('activity_participating_organizations')
        .delete()
        .eq('id', participatingOrgId)
        .eq('activity_id', activityId)
        .select();

      if (error) {
        console.error('[AIMS] Error deleting participating organization:', error);
        console.error('[AIMS] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return NextResponse.json({ 
          error: error.message,
          details: error.details,
          hint: error.hint 
        }, { status: 500 });
      }

      if (!data || data.length === 0) {
        console.warn('[AIMS] No participating organization found to delete with ID:', participatingOrgId);
        return NextResponse.json({ 
          error: 'Participating organization not found or already deleted' 
        }, { status: 404 });
      }

      console.log('[AIMS] Successfully deleted participating organization:', data);
    } else if (organizationId && roleType) {
      const { error } = await supabaseAdmin
        .from('activity_participating_organizations')
        .delete()
        .eq('activity_id', activityId)
        .eq('organization_id', organizationId)
        .eq('role_type', roleType);

      if (error) {
        console.error('[AIMS] Error deleting participating organization:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: 'Either id or both organization_id and role_type query parameters are required' },
        { status: 400 }
      );
    }

    console.log('[AIMS] Deleted participating organization');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS] Unexpected error in DELETE participating organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 