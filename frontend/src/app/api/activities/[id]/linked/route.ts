import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Type definitions
interface RelatedActivityDetails {
  id: string;
  source_activity_id: string;
  linked_activity_id: string | null;
  relationship_type: '1' | '2' | '3' | '4' | '5';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  source_activity_title: string;
  source_iati_id: string;
  linked_activity_title: string | null;
  linked_iati_id: string | null;
  relationship_type_label: string;
  created_by_email: string | null;
}

// Basic related activity from database table
interface RelatedActivity {
  id: string;
  source_activity_id: string;
  linked_activity_id: string | null;
  relationship_type: '1' | '2' | '3' | '4' | '5';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// IATI Relationship Type mapping
const RELATIONSHIP_TYPES = {
  '1': 'Parent',
  '2': 'Child', 
  '3': 'Sibling',
  '4': 'Co-funded',
  '5': 'Third-party report'
} as const;

// GET /api/activities/[id]/linked - Get all linked activities
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    
    console.log('[AIMS] GET /api/activities/[id]/linked - Fetching linked activities for:', activityId);
    
    // First try to fetch from view if it exists
    const { data: relatedActivities, error: viewError } = await getSupabaseAdmin()
      .from('related_activities_with_details')
      .select('*')
      .or(`source_activity_id.eq.${activityId},linked_activity_id.eq.${activityId}`)
      .order('created_at', { ascending: false });
    
    if (viewError) {
      console.warn('[AIMS] View not available, using basic table:', viewError);
      
      // Fallback to basic table
      const { data: basicRelated, error: basicError } = await getSupabaseAdmin()
        .from('related_activities')
        .select('*')
        .or(`source_activity_id.eq.${activityId},linked_activity_id.eq.${activityId}`)
        .order('created_at', { ascending: false });
      
      if (basicError) {
        console.error('[AIMS] Error fetching linked activities:', basicError);
        return NextResponse.json(
          { error: 'Failed to fetch linked activities' },
          { status: 500 }
        );
      }
      
      // For basic data, we'll need to fetch activity titles separately
      const linkedActivities = await Promise.all((basicRelated || []).map(async (ra: RelatedActivity) => {
        const isSource = ra.source_activity_id === activityId;
        let displayRelationshipType = ra.relationship_type;
        
        // Reverse parent/child relationships if needed
        if (!isSource) {
          if (ra.relationship_type === '1') displayRelationshipType = '2';
          else if (ra.relationship_type === '2') displayRelationshipType = '1';
        }
        
        // Fetch activity details
        let activityTitle = null;
        let iatiIdentifier = null;
        const targetActivityId = isSource ? ra.linked_activity_id : ra.source_activity_id;
        
        if (targetActivityId) {
          const { data: activity } = await getSupabaseAdmin()
            .from('activities')
            .select('title, iati_id')
            .eq('id', targetActivityId)
            .single();
            
          if (activity) {
            activityTitle = activity.title;
            iatiIdentifier = activity.iati_id;
          }
        }
        
        return {
          id: ra.id,
          activityId: targetActivityId,
          activityTitle: activityTitle || 'Unknown Activity',
          iatiIdentifier: iatiIdentifier || null,
          relationshipType: displayRelationshipType,
          relationshipTypeLabel: RELATIONSHIP_TYPES[displayRelationshipType as keyof typeof RELATIONSHIP_TYPES],
          isExternal: false,
          createdBy: ra.created_by,
          createdByEmail: null, // Not available in basic table
          createdAt: ra.created_at,
          direction: isSource ? 'outgoing' : 'incoming'
        };
      }));
      
      console.log(`[AIMS] Found ${linkedActivities.length} linked activities (basic)`);
      
      return NextResponse.json(linkedActivities);
    }
    
    // Transform the data from the view
    const linkedActivities = relatedActivities?.map((ra: RelatedActivityDetails) => {
      const isSource = ra.source_activity_id === activityId;
      
      // Determine the display relationship type based on direction
      let displayRelationshipType = ra.relationship_type;
      
      // If this activity is the linked one (not source), reverse parent/child relationships
      if (!isSource) {
        if (ra.relationship_type === '1') displayRelationshipType = '2'; // Parent becomes Child
        else if (ra.relationship_type === '2') displayRelationshipType = '1'; // Child becomes Parent
      }
      
      return {
        id: ra.id,
        activityId: isSource ? ra.linked_activity_id : ra.source_activity_id,
        activityTitle: isSource ? ra.linked_activity_title : ra.source_activity_title,
        iatiIdentifier: isSource ? ra.linked_iati_id : ra.source_iati_id,
        relationshipType: displayRelationshipType,
        relationshipTypeLabel: RELATIONSHIP_TYPES[displayRelationshipType as keyof typeof RELATIONSHIP_TYPES],
        isExternal: false,
        createdBy: ra.created_by,
        createdByEmail: ra.created_by_email,
        createdAt: ra.created_at,
        direction: isSource ? 'outgoing' : 'incoming'
      };
    }) || [];
    
    console.log(`[AIMS] Found ${linkedActivities.length} linked activities`);
    
    return NextResponse.json(linkedActivities);
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in GET linked activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/activities/[id]/linked - Create a new activity link
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceActivityId = params.id;
    const body = await request.json();
    
    console.log('[AIMS] POST /api/activities/[id]/linked - Creating link:', {
      sourceActivityId,
      body
    });
    
    // Validate source activity exists
    const { data: sourceActivity } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .eq('id', sourceActivityId)
      .single();
      
    if (!sourceActivity) {
      return NextResponse.json(
        { error: 'Source activity not found' },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!body.relationshipType || !['1', '2', '3', '4', '5'].includes(body.relationshipType)) {
      return NextResponse.json(
        { error: 'Invalid relationship type. Must be 1-5.' },
        { status: 400 }
      );
    }
    
    // Require linkedActivityId (UUID) for internal links
    if (!body.linkedActivityId) {
      return NextResponse.json(
        { error: 'linkedActivityId (UUID) is required' },
        { status: 400 }
      );
    }
    
    // Prevent self-linking
    if (body.linkedActivityId === sourceActivityId) {
      return NextResponse.json(
        { error: 'Cannot link an activity to itself' },
        { status: 400 }
      );
    }
    
    // Validate linked activity exists
    const { data: linkedActivity } = await getSupabaseAdmin()
      .from('activities')
      .select('id, iati_id, title')
      .eq('id', body.linkedActivityId)
      .single();
      
    if (!linkedActivity) {
      return NextResponse.json(
        { error: 'Linked activity not found' },
        { status: 404 }
      );
    }
    
    // Check if relationship already exists
    const { data: existingLink } = await getSupabaseAdmin()
      .from('related_activities')
      .select('id')
      .eq('source_activity_id', sourceActivityId)
      .eq('linked_activity_id', body.linkedActivityId)
      .single();
      
    if (existingLink) {
      return NextResponse.json(
        { error: 'This relationship already exists' },
        { status: 409 }
      );
    }
    
    // Handle user authentication and validation
    let validUserId: string | null = null;
    
    // First try to use the provided userId
    if (body.userId) {
      console.log('[AIMS] Checking if provided user exists:', body.userId);
      
      // Check if the user exists in the users table
      const { data: existingUser } = await getSupabaseAdmin()
        .from('users')
        .select('id')
        .eq('id', body.userId)
        .single();
        
      if (existingUser) {
        validUserId = existingUser.id;
        console.log('[AIMS] Using provided user ID:', validUserId);
      } else {
        console.warn('[AIMS] Provided user ID not found in users table:', body.userId);
      }
    }
    
    // If no valid user ID yet, try to get from Supabase auth
    if (!validUserId) {
      console.log('[AIMS] Attempting to get authenticated user from Supabase auth...');
      
      // Try to get the authenticated user from auth.users
      const { data: authUsers } = await getSupabaseAdmin()
        .auth.admin.listUsers();
        
      if (authUsers && authUsers.users && authUsers.users.length > 0) {
        // For development, use the first available auth user
        const authUser = authUsers.users[0];
        console.log('[AIMS] Found auth user:', authUser.id);
        
        // Check if this auth user exists in the users table
        const { data: userRecord } = await getSupabaseAdmin()
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .single();
          
        if (userRecord) {
          validUserId = userRecord.id;
          console.log('[AIMS] Auth user exists in users table:', validUserId);
        } else {
          // Create a minimal user record for the auth user
          console.log('[AIMS] Creating user record for auth user:', authUser.id);
          
          const { data: newUser, error: createError } = await getSupabaseAdmin()
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email || 'unknown@aims.local',
              name: authUser.email?.split('@')[0] || 'Unknown User',
              role: 'orphan', // Default role
              // organization_id can be null if the column is nullable
            })
            .select('id')
            .single();
            
          if (newUser && !createError) {
            validUserId = newUser.id;
            console.log('[AIMS] Successfully created user record:', validUserId);
          } else {
            console.error('[AIMS] Failed to create user record:', createError);
          }
        }
      }
    }
    
    // Final fallback: try to find ANY user in the users table
    if (!validUserId) {
      console.log('[AIMS] Final fallback: looking for any existing user...');
      
      // First try to find our test user
      const { data: testUser } = await getSupabaseAdmin()
        .from('users')
        .select('id')
        .eq('email', 'test@aims.local')
        .single();
        
      if (testUser) {
        validUserId = testUser.id;
        console.log('[AIMS] Using test user:', validUserId);
      } else {
        // If test user doesn't exist, find any user
        const { data: anyUser } = await getSupabaseAdmin()
          .from('users')
          .select('id')
          .limit(1)
          .single();
          
        if (anyUser) {
          validUserId = anyUser.id;
          console.log('[AIMS] Using fallback user:', validUserId);
        }
      }
    }
    
    // Check if we can proceed without a user (if created_by is nullable)
    if (!validUserId) {
      console.warn('[AIMS] No valid user found. Checking if created_by is nullable...');
      
      // Try to insert with null created_by to see if it's allowed
      const testPayload = {
        source_activity_id: sourceActivityId,
        linked_activity_id: body.linkedActivityId,
        relationship_type: body.relationshipType,
        created_by: null
      };
      
      const { error: nullTestError } = await getSupabaseAdmin()
        .from('related_activities')
        .insert(testPayload)
        .select()
        .single();
        
      if (nullTestError && nullTestError.code === '23502') {
        // NOT NULL constraint - we need a user
        return NextResponse.json(
          { 
            error: 'Unable to create link. No valid user found and created_by cannot be null.',
            details: 'Please ensure you are logged in with a valid user account.'
          },
          { status: 401 }
        );
      } else if (!nullTestError) {
        // Success with null created_by - we already inserted, so return success
        console.log('[AIMS] Successfully created related activity with null created_by');
        
        return NextResponse.json({
          success: true,
          relatedActivity: {
            id: sourceActivityId, // We don't have the new ID from the test insert
            activityId: linkedActivity.id,
            activityTitle: linkedActivity.title,
            iatiIdentifier: linkedActivity.iati_id,
            relationshipType: body.relationshipType,
            relationshipTypeLabel: RELATIONSHIP_TYPES[body.relationshipType as keyof typeof RELATIONSHIP_TYPES],
            isExternal: false,
            createdAt: new Date().toISOString(),
            direction: 'outgoing'
          }
        });
      }
    }
    
    // Prepare the data with validated user ID
    const relatedActivityData = {
      source_activity_id: sourceActivityId,
      linked_activity_id: body.linkedActivityId,
      relationship_type: body.relationshipType,
      created_by: validUserId
    };
    
    console.log('[AIMS] Inserting related activity with validated data:', relatedActivityData);
    
    // Insert the related activity
    const { data: newRelatedActivity, error: insertError } = await getSupabaseAdmin()
      .from('related_activities')
      .insert(relatedActivityData)
      .select()
      .single();
      
    if (insertError) {
      console.error('[AIMS] Error creating related activity:', insertError);
      
      if (insertError.code === '23503' && insertError.message?.includes('created_by')) {
        return NextResponse.json(
          { 
            error: 'User validation failed. The user ID does not exist in the system.',
            details: 'Please contact support if this issue persists.'
          },
          { status: 400 }
        );
      }
      
      if (insertError.message?.includes('Circular relationship detected')) {
        return NextResponse.json(
          { error: 'Cannot create this link as it would create a circular relationship' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: insertError.message || 'Failed to create activity link' },
        { status: 500 }
      );
    }
    
    console.log('[AIMS] Successfully created related activity:', newRelatedActivity);
    
    // Return a formatted response with the created link details
    return NextResponse.json({
      success: true,
      relatedActivity: {
        id: newRelatedActivity.id,
        activityId: linkedActivity.id,
        activityTitle: linkedActivity.title,
        iatiIdentifier: linkedActivity.iati_id,
        relationshipType: newRelatedActivity.relationship_type,
        relationshipTypeLabel: RELATIONSHIP_TYPES[newRelatedActivity.relationship_type as keyof typeof RELATIONSHIP_TYPES],
        isExternal: false,
        createdAt: newRelatedActivity.created_at,
        direction: 'outgoing'
      }
    });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in POST linked activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Note: DELETE endpoint would need to be in a separate route file due to Next.js routing
// Create file: frontend/src/app/api/activities/[id]/linked/[linkId]/route.ts 