import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ActivityLogger } from '@/lib/activity-logger';

export interface Partner {
  id: string;
  name: string;
  code?: string;
  type?: string;
  iatiOrgId?: string;
  fullName?: string;
  acronym?: string;
  organisationType?: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  banner?: string;
  countryRepresented?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Create Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[AIMS] Missing Supabase environment variables');
    throw new Error('Missing required environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// GET /api/partners
export async function GET(request: NextRequest) {
  try {
    console.log('[AIMS] GET /api/partners (using organizations table)');
    
    // Create Supabase client
    const supabaseAdmin = getSupabaseAdmin();
    
    // Query organizations table instead of partners
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('name');

    if (error) {
      console.error('[AIMS] Error fetching organizations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Found organizations:', data?.length || 0);

    // Transform to match partner interface if needed
    const partners = data?.map((org: any) => ({
      ...org,
      // Map any missing fields that exist in Partner interface
      code: org.code || null,
      iatiOrgId: org.iati_org_id || null,
      fullName: org.full_name || org.name,
      acronym: org.acronym || null,
      organisationType: org.organisation_type || null,
      countryRepresented: org.country_represented || null,
    })) || [];

    return NextResponse.json(partners);
  } catch (error) {
    console.error('[AIMS] Unexpected error in GET /api/partners:', error);
    console.error('[AIMS] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/partners
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[AIMS] POST /api/partners (using organizations table) - Starting request');
    console.log('[AIMS] Request body:', JSON.stringify(body, null, 2));

    // Create Supabase client
    const supabaseAdmin = getSupabaseAdmin();

    // Prepare data for organizations table
    const organizationData = {
      name: body.name,
      type: body.type || 'development_partner',
      country: body.country || null,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      website: body.website || null,
      // Additional partner fields
      code: body.code || null,
      iati_org_id: body.iatiOrgId || null,
      full_name: body.fullName || null,
      acronym: body.acronym || null,
      organisation_type: body.organisationType || null,
      description: body.description || null,
      logo: body.logo || null,
      banner: body.banner || null,
      country_represented: body.countryRepresented || null,
    };

    console.log('[AIMS] Creating organization with data:', JSON.stringify(organizationData, null, 2));

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .insert([organizationData])
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error creating organization:', error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 400 }
      );
    }

    console.log('[AIMS] Created new organization:', data);
    
    // Log the activity if user information is provided
    if (body.user) {
      await ActivityLogger.partnerAdded(data, body.user);
    }
    
    // Transform back to partner format for frontend compatibility
    const partner = {
      ...data,
      iatiOrgId: data.iati_org_id,
      fullName: data.full_name,
      organisationType: data.organisation_type,
      countryRepresented: data.country_represented,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/partners
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    console.log('[AIMS] PUT /api/partners (using organizations table) - Updating:', id);

    if (!id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabaseAdmin = getSupabaseAdmin();

    // Map partner fields to organization fields
    const organizationUpdates = {
      ...updates,
      iati_org_id: updates.iatiOrgId || updates.iati_org_id,
      full_name: updates.fullName || updates.full_name,
      organisation_type: updates.organisationType || updates.organisation_type,
      country_represented: updates.countryRepresented || updates.country_represented,
    };

    // Remove camelCase fields
    delete organizationUpdates.iatiOrgId;
    delete organizationUpdates.fullName;
    delete organizationUpdates.organisationType;
    delete organizationUpdates.countryRepresented;

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(organizationUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error updating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Updated organization:', data);
    
    // Log the activity if user information is provided
    if (body.user) {
      await ActivityLogger.partnerUpdated(data, body.user);
    }
    
    // Transform back to partner format
    const partner = {
      ...data,
      iatiOrgId: data.iati_org_id,
      fullName: data.full_name,
      organisationType: data.organisation_type,
      countryRepresented: data.country_represented,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(partner);
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/partners/[id]
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    console.log('[AIMS] DELETE /api/partners (using organizations table) - Deleting:', id);

    if (!id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabaseAdmin = getSupabaseAdmin();

    // Check if organization has users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('organization_id', id)
      .limit(1);

    if (usersError) {
      console.error('[AIMS] Error checking users:', usersError);
      return NextResponse.json({ error: 'Failed to check organization dependencies' }, { status: 500 });
    }

    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with assigned users' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AIMS] Error deleting organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Deleted organization:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 