import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface ParticipatingOrganization {
  id: string;
  activity_id: string;
  organization_id: string;
  role_type: 'extending' | 'implementing' | 'government';
  display_order: number;
  created_at: string;
  updated_at: string;
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
    return NextResponse.json(data || []);
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

    const { organization_id, role_type, display_order = 0 } = body;

    console.log('[AIMS] Parsed body:', { organization_id, role_type, display_order });
    console.log('[AIMS] Activity ID from URL:', activityId);

    if (!organization_id || !role_type) {
      console.error('[AIMS] Missing required fields:', { organization_id, role_type });
      return NextResponse.json(
        { error: 'organization_id and role_type are required' },
        { status: 400 }
      );
    }

    if (!['extending', 'implementing', 'government'].includes(role_type)) {
      return NextResponse.json(
        { error: 'role_type must be one of: extending, implementing, government' },
        { status: 400 }
      );
    }

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

    // Insert new participating organization
    const { data, error } = await supabaseAdmin
      .from('activity_participating_organizations')
      .insert({
        activity_id: activityId,
        organization_id,
        role_type,
        display_order
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

// DELETE /api/activities/[id]/participating-organizations
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organization_id');
    const roleType = url.searchParams.get('role_type');

    console.log('[AIMS] DELETE /api/activities/[id]/participating-organizations for activity:', activityId);
    console.log('[AIMS] Organization ID:', organizationId, 'Role type:', roleType);

    if (!organizationId || !roleType) {
      return NextResponse.json(
        { error: 'organization_id and role_type query parameters are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    
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