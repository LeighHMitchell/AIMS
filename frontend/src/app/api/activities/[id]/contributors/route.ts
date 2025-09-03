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
      console.log('[AIMS] Supabase admin client not available - using local mode for contributors');
      // In local mode, try to get contributors from local storage or return empty array
      try {
        const { localDb } = await import('@/lib/db/local-db');
        // For now, return empty array since local-db doesn't implement contributors table
        // The frontend will handle this by using the props contributors
        return NextResponse.json([]);
      } catch (error) {
        console.error('[AIMS] Error with local database:', error);
        return NextResponse.json([]);
      }
    }

    // Assume modern schema with all columns (we know nominated_by_name exists from testing)
    const hasOrganizationName = true;
    const hasNominatedByName = true;
    
    console.log('[Contributors API] Using modern schema with nominated_by_name column');
    
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
            .select('id, email, username, full_name, first_name, last_name, name, job_title, title')
            .in('id', userIds);
          
          enrichedContributors = enrichedContributors.map((contributor: any) => {
            const user = users?.find((u: any) => u.id === contributor.nominated_by);
            let userName = 'Unknown User';
            
            if (user) {
              console.log('[Contributors API] User data from DB:', user);
              
              // Try different possible name fields in order of preference with type checking
              if (user.name && typeof user.name === 'string' && user.name.trim() !== '') {
                userName = user.name.trim();
              } else if (user.full_name && typeof user.full_name === 'string' && user.full_name.trim() !== '') {
                userName = user.full_name.trim();
              } else if (user.first_name || user.last_name) {
                const nameParts = [];
                if (user.first_name && typeof user.first_name === 'string' && user.first_name.trim() !== '') {
                  nameParts.push(user.first_name.trim());
                }
                if (user.last_name && typeof user.last_name === 'string' && user.last_name.trim() !== '') {
                  nameParts.push(user.last_name.trim());
                }
                if (nameParts.length > 0) {
                  userName = nameParts.join(' ');
                }
              } else if (user.job_title && typeof user.job_title === 'string' && user.job_title.trim() !== '') {
                userName = user.job_title.trim();
              } else if (user.title && typeof user.title === 'string' && user.title.trim() !== '') {
                userName = user.title.trim();
              } else if (user.username && typeof user.username === 'string' && user.username.trim() !== '') {
                userName = user.username.trim();
              } else if (user.email && typeof user.email === 'string' && user.email.trim() !== '') {
                const emailParts = user.email.split('@');
                if (emailParts[0]) {
                  userName = emailParts[0];
                }
              }
              
              console.log('[Contributors API] Final user name:', userName);
            }
            
            return {
              ...contributor,
              nominated_by_name: userName
            };
          });
        }
      }
      
      // For existing contributors with 'Unknown User', try to update their names from the users data we fetched
      console.log('[Contributors API] hasNominatedByName:', hasNominatedByName);
      console.log('[Contributors API] enrichedContributors count:', enrichedContributors?.length);
      
      if (!hasNominatedByName) {
        // This was already handled above when we fetched user data and enriched contributors
        console.log('[Contributors API] No nominated_by_name column, skipping fix logic');
      } else {
        console.log('[Contributors API] Has nominated_by_name column, checking for Unknown User entries');
        
        // If the column exists but has 'Unknown User' or null, try to update it from the users table
        const contributorsWithUnknownUser = enrichedContributors.filter((c: any) => 
          (c.nominated_by_name === 'Unknown User' || c.nominated_by_name === null || c.nominated_by_name === '') && c.nominated_by
        );
        
        console.log('[Contributors API] Found contributors with Unknown User:', contributorsWithUnknownUser.length);
        
        if (contributorsWithUnknownUser.length > 0) {
          const userIds = Array.from(new Set(contributorsWithUnknownUser.map((c: any) => c.nominated_by)));
          console.log('[Contributors API GET] Looking up users for IDs:', userIds);
          
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, username, full_name, first_name, last_name, name, job_title, title')
            .in('id', userIds);
            
          console.log('[Contributors API GET] Found users:', users);
          if (usersError) {
            console.error('[Contributors API GET] Error fetching users:', usersError);
          }
          
          enrichedContributors = enrichedContributors.map((contributor: any) => {
            if ((contributor.nominated_by_name === 'Unknown User' || contributor.nominated_by_name === null || contributor.nominated_by_name === '') && contributor.nominated_by) {
              const user = users?.find((u: any) => u.id === contributor.nominated_by);
              let userName = 'Unknown User';
              
              if (user) {
                console.log('[Contributors API GET] Updating user data for Unknown User:', user);
                
                // Apply the same name resolution logic
                if (user.name && typeof user.name === 'string' && user.name.trim() !== '') {
                  userName = user.name.trim();
                } else if (user.full_name && typeof user.full_name === 'string' && user.full_name.trim() !== '') {
                  userName = user.full_name.trim();
                } else if (user.first_name || user.last_name) {
                  const nameParts = [];
                  if (user.first_name && typeof user.first_name === 'string' && user.first_name.trim() !== '') {
                    nameParts.push(user.first_name.trim());
                  }
                  if (user.last_name && typeof user.last_name === 'string' && user.last_name.trim() !== '') {
                    nameParts.push(user.last_name.trim());
                  }
                  if (nameParts.length > 0) {
                    userName = nameParts.join(' ');
                  }
                } else if (user.job_title && typeof user.job_title === 'string' && user.job_title.trim() !== '') {
                  userName = user.job_title.trim();
                } else if (user.title && typeof user.title === 'string' && user.title.trim() !== '') {
                  userName = user.title.trim();
                } else if (user.username && typeof user.username === 'string' && user.username.trim() !== '') {
                  userName = user.username.trim();
                } else if (user.email && typeof user.email === 'string' && user.email.trim() !== '') {
                  const emailParts = user.email.split('@');
                  if (emailParts[0]) {
                    userName = emailParts[0];
                  }
                }
                
                console.log('[Contributors API GET] Updated user name:', userName);
                
                // Update the database with the correct user name
                if (userName !== 'Unknown User') {
                  console.log('[Contributors API GET] Persisting user name to database for contributor:', contributor.id);
                  supabase
                    .from('activity_contributors')
                    .update({ nominated_by_name: userName })
                    .eq('id', contributor.id)
                    .then(({ error }) => {
                      if (error) {
                        console.error('[Contributors API GET] Error updating contributor:', error);
                      } else {
                        console.log('[Contributors API GET] Successfully updated contributor in database');
                      }
                    });
                }
              }
              
              return {
                ...contributor,
                nominated_by_name: userName
              };
            }
            return contributor;
          });
        }
      }
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
      // Ensure we have a valid user name - if empty or 'Unknown User', try to get from database
      let finalNominatedByName = nominatedByName;
      if (!finalNominatedByName || finalNominatedByName.trim() === '' || finalNominatedByName.trim() === 'Unknown User') {
        // If no name provided, try to fetch from users table
        if (nominatedBy) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('id, email, username, full_name, first_name, last_name, name, job_title, title')
              .eq('id', nominatedBy)
              .single();
            
            if (userData) {
              console.log('[Contributors POST] User data from DB:', userData);
              
              // Apply the same logic as in GET route
              if (userData.name && typeof userData.name === 'string' && userData.name.trim() !== '') {
                finalNominatedByName = userData.name.trim();
              } else if (userData.full_name && typeof userData.full_name === 'string' && userData.full_name.trim() !== '') {
                finalNominatedByName = userData.full_name.trim();
              } else if (userData.first_name || userData.last_name) {
                const nameParts = [];
                if (userData.first_name && typeof userData.first_name === 'string' && userData.first_name.trim() !== '') {
                  nameParts.push(userData.first_name.trim());
                }
                if (userData.last_name && typeof userData.last_name === 'string' && userData.last_name.trim() !== '') {
                  nameParts.push(userData.last_name.trim());
                }
                if (nameParts.length > 0) {
                  finalNominatedByName = nameParts.join(' ');
                }
              } else if (userData.job_title && typeof userData.job_title === 'string' && userData.job_title.trim() !== '') {
                finalNominatedByName = userData.job_title.trim();
              } else if (userData.title && typeof userData.title === 'string' && userData.title.trim() !== '') {
                finalNominatedByName = userData.title.trim();
              } else if (userData.username && typeof userData.username === 'string' && userData.username.trim() !== '') {
                finalNominatedByName = userData.username.trim();
              } else if (userData.email && typeof userData.email === 'string' && userData.email.trim() !== '') {
                const emailParts = userData.email.split('@');
                if (emailParts[0]) {
                  finalNominatedByName = emailParts[0];
                }
              }
              
              console.log('[Contributors POST] Final user name from DB:', finalNominatedByName);
            }
          } catch (error) {
            console.error('[Contributors POST] Error fetching user data:', error);
          }
        }
        
        // Final fallback
        if (!finalNominatedByName || finalNominatedByName.trim() === '') {
          finalNominatedByName = 'Unknown User';
        }
      }
      contributorData.nominated_by_name = finalNominatedByName.trim();
      console.log('[Contributors POST] Final nominated_by_name:', contributorData.nominated_by_name);
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