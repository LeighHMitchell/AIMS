import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/activity-contributors - Starting request');
  
  try {
    // Check if getSupabaseAdmin is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get activityId from query params if provided
    const searchParams = request.nextUrl.searchParams;
    const activityId = searchParams.get('activityId');

    let query = getSupabaseAdmin().from('activity_contributors').select('*');
    
    // Filter by activity if activityId is provided
    if (activityId) {
      query = query.eq('activity_id', activityId);
    }

    const { data: contributors, error } = await query;

    if (error) {
      console.error('[AIMS] Error fetching activity contributors:', error);
      
      // Return empty array if table doesn't exist
      if (error.code === '42P01') {
        console.log('[AIMS] activity_contributors table does not exist, returning empty array');
        return NextResponse.json([]);
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Fetched activity contributors count:', contributors?.length || 0);
    
    const response = NextResponse.json(contributors || []);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

// POST /api/activity-contributors - Add a new contributor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[AIMS] POST /api/activity-contributors - Adding contributor');
    console.log('[AIMS] Request body:', body);
    
    // Validate required fields
    if (!body.organizationId || !body.organizationName) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, organizationName' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // Check if contributor already exists for this activity
    if (body.activityId) {
      const { data: existingContributor } = await supabase
        .from('activity_contributors')
        .select('id')
        .eq('activity_id', body.activityId)
        .eq('organization_id', body.organizationId)
        .single();

      if (existingContributor) {
        return NextResponse.json(
          { error: 'Contributor already exists for this activity' },
          { status: 409 }
        );
      }
    }
    
    // Create new contributor
    const contributorData = {
      id: uuidv4(),
      activity_id: body.activityId || null,
      organization_id: body.organizationId,
      organization_name: body.organizationName,
      status: body.status || 'nominated',
      role: body.role || 'contributor',
      nominated_by: body.nominatedBy || null,
      nominated_by_name: body.nominatedByName || null,
      nominated_at: new Date().toISOString(),
      can_edit_own_data: body.canEditOwnData ?? true,
      can_view_other_drafts: body.canViewOtherDrafts ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('[AIMS] Creating contributor with data:', contributorData);
    
    const { data: newContributor, error } = await supabase
      .from('activity_contributors')
      .insert(contributorData)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error creating contributor:', error);
      return NextResponse.json(
        { error: 'Failed to create contributor', details: error.message },
        { status: 500 }
      );
    }

    console.log('[AIMS] Successfully created contributor:', newContributor.id);
    
    const response = NextResponse.json(newContributor, { status: 201 });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/activity-contributors - Remove a contributor
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const contributorId = url.searchParams.get('contributorId');
    
    if (!contributorId) {
      return NextResponse.json(
        { error: 'Contributor ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] DELETE /api/activity-contributors - Removing contributor:', contributorId);
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    const { error } = await supabase
      .from('activity_contributors')
      .delete()
      .eq('id', contributorId);

    if (error) {
      console.error('[AIMS] Error deleting contributor:', error);
      return NextResponse.json(
        { error: 'Failed to delete contributor', details: error.message },
        { status: 500 }
      );
    }

    console.log('[AIMS] Successfully deleted contributor:', contributorId);
    
    const response = NextResponse.json({ success: true });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 