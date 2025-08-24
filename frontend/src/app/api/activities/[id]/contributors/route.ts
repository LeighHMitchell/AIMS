import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// GET /api/activities/[id]/contributors - Fetch contributors for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const activityId = params.id;
  console.log('[AIMS] GET /api/activities/[id]/contributors for activity:', activityId);

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // First check which columns exist
    const { data: tableInfo } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'activity_contributors');
    
    const hasOrganizationName = tableInfo?.some((col: any) => col.column_name === 'organization_name');
    const hasNominatedByName = tableInfo?.some((col: any) => col.column_name === 'nominated_by_name');
    
    // Build select query based on available columns
    let selectQuery = `
      id,
      activity_id,
      organization_id,
      status,
      role,
      nominated_by,
      nominated_at,
      responded_at,
      can_edit_own_data,
      can_view_other_drafts,
      created_at,
      updated_at
    `;
    
    if (hasOrganizationName) {
      selectQuery += `, organization_name`;
    }
    if (hasNominatedByName) {
      selectQuery += `, nominated_by_name`;
    }

    const { data: contributors, error } = await supabase
      .from('activity_contributors')
      .select(selectQuery)
      .eq('activity_id', activityId)
      .order('nominated_at', { ascending: false });

    if (error) {
      console.error('[AIMS] Error fetching contributors:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Populate missing data from related tables if needed
    let enrichedContributors = contributors || [];
    
    if (enrichedContributors.length > 0) {
      // If organization_name is missing, fetch from organizations table
      if (!hasOrganizationName) {
        const orgIds = Array.from(new Set(enrichedContributors.map((c: any) => c.organization_id)));
        const { data: organizations } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        
        enrichedContributors = enrichedContributors.map((contributor: any) => ({
          ...contributor,
          organization_name: organizations?.find((o: any) => o.id === contributor.organization_id)?.name || 'Unknown Organization'
        }));
      }
      
      // If nominated_by_name is missing, fetch from users table
      if (!hasNominatedByName) {
        const userIds = Array.from(new Set(enrichedContributors.map((c: any) => c.nominated_by).filter(Boolean)));
        if (userIds.length > 0) {
          // Try to get user info with flexible column selection
          const { data: users } = await supabase
            .from('users')
            .select('id, email, username, full_name, first_name, last_name, name')
            .in('id', userIds);
          
          enrichedContributors = enrichedContributors.map((contributor: any) => {
            const user = users?.find((u: any) => u.id === contributor.nominated_by);
            let userName = 'Unknown User';
            
            if (user) {
              // Try different possible name fields in order of preference
              userName = user.name || 
                        user.full_name || 
                        (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : '') ||
                        user.username || 
                        user.email || 
                        `User ID: ${user.id}`;
              
              // Clean up the name and ensure it's not empty
              userName = userName.trim();
              if (!userName || userName === '') {
                userName = 'Unknown User';
              }
            }
            
            return {
              ...contributor,
              nominated_by_name: userName
            };
          });
        }
      }
      
      // Also ensure existing contributors have proper nominated_by_name
      enrichedContributors = enrichedContributors.map((contributor: any) => {
        // If nominated_by_name is missing or is 'Unknown User' but we have nominated_by, try to populate it
        if ((!contributor.nominated_by_name || contributor.nominated_by_name === 'Unknown User') && contributor.nominated_by) {
          // This will be handled by the above logic if the column doesn't exist
          // For existing records with the column, we'll keep the current value
          return contributor;
        }
        return contributor;
      });
    }

    console.log('[AIMS] Found contributors:', enrichedContributors?.length || 0);
    return NextResponse.json(enrichedContributors);

  } catch (error) {
    console.error('[AIMS] Unexpected error fetching contributors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributors' },
      { status: 500 }
    );
  }
}

// POST /api/activities/[id]/contributors - Add a new contributor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const activityId = params.id;
  console.log('[AIMS] POST /api/activities/[id]/contributors for activity:', activityId);

  try {
    const body = await request.json();
    console.log('[AIMS] Request body:', JSON.stringify(body, null, 2));

    const {
      organizationId,
      organizationName,
      status = 'nominated',
      role = 'contributor',
      nominatedBy,
      nominatedByName,
      canEditOwnData = true,
      canViewOtherDrafts = false
    } = body;

    if (!organizationId || !organizationName) {
      return NextResponse.json(
        { error: 'Organization ID and name are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Check if contributor already exists
    const { data: existing } = await supabase
      .from('activity_contributors')
      .select('id')
      .eq('activity_id', activityId)
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Organization is already a contributor' },
        { status: 409 }
      );
    }

    // Check if required columns exist in the table
    const { data: tableInfo } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'activity_contributors');
    
    const hasOrganizationName = tableInfo?.some((col: any) => col.column_name === 'organization_name');
    const hasNominatedByName = tableInfo?.some((col: any) => col.column_name === 'nominated_by_name');
    
    console.log('[AIMS] Table has organization_name:', hasOrganizationName);
    console.log('[AIMS] Table has nominated_by_name:', hasNominatedByName);

    // Build the contributor data with proper user information
    const contributorData: any = {
      activity_id: activityId,
      organization_id: organizationId,
      status,
      role,
      nominated_by: nominatedBy || null,
      can_edit_own_data: canEditOwnData,
      can_view_other_drafts: canViewOtherDrafts
    };

    // Always add organization_name if the column exists
    if (hasOrganizationName) {
      contributorData.organization_name = organizationName;
    }
    
    // Always add nominated_by_name if the column exists, with proper fallback logic
    if (hasNominatedByName) {
      // Ensure we have a valid user name
      let finalNominatedByName = nominatedByName;
      if (!finalNominatedByName || finalNominatedByName.trim() === '') {
        finalNominatedByName = 'Unknown User';
      }
      contributorData.nominated_by_name = finalNominatedByName.trim();
    }

    console.log('[AIMS] Creating contributor with data:', contributorData);

    const { data: contributor, error } = await supabase
      .from('activity_contributors')
      .insert(contributorData)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error creating contributor:', error);
      
      // Provide more specific error messages
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This organization is already a contributor to this activity' }, { status: 409 });
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Activity or organization not found' }, { status: 404 });
      }
      if (error.message.includes('nominated_by_name')) {
        return NextResponse.json({ error: 'Database schema issue: nominated_by_name column missing. Please run the database migration.' }, { status: 500 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Created contributor:', contributor);
    return NextResponse.json(contributor, { status: 201 });

  } catch (error) {
    console.error('[AIMS] Unexpected error creating contributor:', error);
    return NextResponse.json(
      { error: 'Failed to create contributor' },
      { status: 500 }
    );
  }
}

// PUT /api/activities/[id]/contributors - Update a contributor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const activityId = params.id;
  console.log('[AIMS] PUT /api/activities/[id]/contributors for activity:', activityId);

  try {
    const body = await request.json();
    const { contributorId, ...updates } = body;

    if (!contributorId) {
      return NextResponse.json(
        { error: 'Contributor ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Add responded_at if status is being changed to accepted/declined
    if (updates.status && ['accepted', 'declined'].includes(updates.status)) {
      updates.responded_at = new Date().toISOString();
    }

    const { data: contributor, error } = await supabase
      .from('activity_contributors')
      .update(updates)
      .eq('id', contributorId)
      .eq('activity_id', activityId)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error updating contributor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Updated contributor:', contributor);
    return NextResponse.json(contributor);

  } catch (error) {
    console.error('[AIMS] Unexpected error updating contributor:', error);
    return NextResponse.json(
      { error: 'Failed to update contributor' },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id]/contributors/[contributorId] - Remove a contributor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const activityId = params.id;
  const url = new URL(request.url);
  const contributorId = url.searchParams.get('contributorId');

  console.log('[AIMS] DELETE /api/activities/[id]/contributors for activity:', activityId, 'contributor:', contributorId);

  if (!contributorId) {
    return NextResponse.json(
      { error: 'Contributor ID is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from('activity_contributors')
      .delete()
      .eq('id', contributorId)
      .eq('activity_id', activityId);

    if (error) {
      console.error('[AIMS] Error deleting contributor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Deleted contributor:', contributorId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[AIMS] Unexpected error deleting contributor:', error);
    return NextResponse.json(
      { error: 'Failed to delete contributor' },
      { status: 500 }
    );
  }
}