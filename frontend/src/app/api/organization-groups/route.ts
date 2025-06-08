import { NextRequest, NextResponse } from "next/server";
import { 
  loadOrganizationGroups, 
  createOrganizationGroup, 
  updateOrganizationGroup, 
  deleteOrganizationGroup,
  getOrganizationGroupById 
} from "@/lib/organizationGroups";
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[AIMS] GET /api/organization-groups - Starting request');
    
    // Try Supabase first if available
    if (supabaseAdmin) {
      console.log('[AIMS] supabaseAdmin is initialized, attempting to fetch organization groups...');
      
      try {
        // Fetch all organization groups with their members
        const { data: groups, error: groupsError } = await supabaseAdmin
          .from('organization_groups')
          .select(`
            id, name, description, created_by, created_at, updated_at,
            organization_group_members(organization_id)
          `)
          .order('name');

        if (!groupsError && groups) {
          console.log('[AIMS] Successfully fetched organization groups from Supabase:', groups?.length || 0);
          
          const formattedGroups = (groups || []).map((group: any) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            createdBy: group.created_by,
            createdAt: group.created_at,
            updatedAt: group.updated_at,
            memberCount: group.organization_group_members?.length || 0,
            organizationIds: group.organization_group_members?.map((m: any) => m.organization_id) || []
          }));

          return NextResponse.json(formattedGroups);
        } else {
          console.error('[AIMS] Supabase error, falling back to file storage:', groupsError);
        }
      } catch (supabaseError) {
        console.log('[AIMS] Supabase operation failed, falling back to file storage:', supabaseError);
      }
    } else {
      console.log('[AIMS] supabaseAdmin not available, using file storage');
    }

    // Fallback to file-based storage
    console.log('[AIMS] Using file-based storage for organization groups');
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const orgGroupsFilePath = path.join(process.cwd(), 'data', 'organization-groups.json');
    
    try {
      const fileContent = await fs.readFile(orgGroupsFilePath, 'utf-8');
      const organizationGroups = JSON.parse(fileContent);
      
      console.log('[AIMS] Successfully loaded organization groups from file:', organizationGroups?.length || 0);
      
      // Ensure organizationGroups is an array
      const groupsArray = Array.isArray(organizationGroups) ? organizationGroups : [];
      
      // Transform groups to ensure they have the required structure
      const transformedGroups = groupsArray.map((group: any) => ({
        id: group.id || crypto.randomUUID(),
        name: group.name || 'Unnamed Group',
        description: group.description || '',
        createdBy: group.createdBy || group.created_by || null,
        createdAt: group.createdAt || group.created_at || new Date().toISOString(),
        updatedAt: group.updatedAt || group.updated_at || new Date().toISOString(),
        memberCount: group.memberCount || group.organizationIds?.length || 0,
        organizationIds: group.organizationIds || []
      }));
      
      return NextResponse.json(transformedGroups);
      
    } catch (fileError) {
      console.error('[AIMS] Error reading organization groups file:', fileError);
      
      // Return empty array if file doesn't exist or can't be read
      console.log('[AIMS] Returning empty organization groups array');
      return NextResponse.json([]);
    }

  } catch (error) {
    console.error('[AIMS] Error fetching organization groups:', error);
    
    // Return empty array as final fallback
    return NextResponse.json([]);
  }
}

interface CreateGroupRequest {
  name: string;
  description?: string;
  organizationIds: string[];
  createdBy: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[AIMS] POST /api/organization-groups - Starting request');
    
    if (!supabaseAdmin) {
      console.error('[AIMS] supabaseAdmin is null or undefined');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body: CreateGroupRequest = await request.json();
    
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check if group name already exists
    const { data: existingGroup, error: checkError } = await supabaseAdmin
      .from('organization_groups')
      .select('id, name')
      .eq('name', body.name.trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[AIMS] Error checking existing group:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing groups' },
        { status: 500 }
      );
    }

    if (existingGroup) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 400 }
      );
    }

    // Create the organization group
    const { data: newGroup, error: createError } = await supabaseAdmin
      .from('organization_groups')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        created_by: body.createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('[AIMS] Error creating group:', createError);
      return NextResponse.json(
        { error: `Failed to create group: ${createError.message}` },
        { status: 500 }
      );
    }

    console.log('[AIMS] Created group:', newGroup);

    // Add organization memberships if any were provided
    if (body.organizationIds && body.organizationIds.length > 0) {
      const memberships = body.organizationIds.map(orgId => ({
        organization_group_id: newGroup.id,
        organization_id: orgId,
        created_at: new Date().toISOString()
      }));

      const { error: membershipError } = await supabaseAdmin
        .from('organization_group_members')
        .insert(memberships);

      if (membershipError) {
        console.error('[AIMS] Error adding group memberships:', membershipError);
        // Don't fail the entire request if memberships fail
        console.log('[AIMS] Group created but some memberships may have failed');
      } else {
        console.log(`[AIMS] Added ${memberships.length} organization memberships to group`);
      }
    }

    const response = {
      id: newGroup.id,
      name: newGroup.name,
      description: newGroup.description,
      createdBy: newGroup.created_by,
      createdAt: newGroup.created_at,
      memberCount: body.organizationIds?.length || 0
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[AIMS] Organization groups error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: `Failed to create organization group: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }
    
    const data = await request.json();
    
    // Enhanced validation and debugging
    console.log('[ORGANIZATION-GROUPS] PUT request data:', {
      id,
      name: data.name,
      organizationIds: data.organizationIds,
      organizationIdsLength: data.organizationIds?.length,
      updatedBy: data.updatedBy,
      updatedByName: data.updatedByName
    });
    
    if (!data.updatedBy) {
      return NextResponse.json({ error: "User ID for 'updatedBy' is required" }, { status: 400 });
    }

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      console.error('[ORGANIZATION-GROUPS] Invalid group ID UUID:', id);
      return NextResponse.json(
        { error: "Invalid group ID format" },
        { status: 400 }
      );
    }
    
    if (!uuidRegex.test(data.updatedBy)) {
      console.error('[ORGANIZATION-GROUPS] Invalid updatedBy UUID:', data.updatedBy);
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }
    
    if (data.organizationIds) {
      if (!Array.isArray(data.organizationIds) || data.organizationIds.length === 0) {
        console.error('[ORGANIZATION-GROUPS] Invalid organizationIds for update:', data.organizationIds);
        return NextResponse.json(
          { error: "Organization IDs must be a non-empty array" },
          { status: 400 }
        );
      }
      
      const invalidOrgIds = data.organizationIds.filter((orgId: string) => !uuidRegex.test(orgId));
      if (invalidOrgIds.length > 0) {
        console.error('[ORGANIZATION-GROUPS] Invalid organization UUIDs for update:', invalidOrgIds);
        return NextResponse.json(
          { error: `Invalid organization ID formats: ${invalidOrgIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate group names (excluding current group)
    if (data.name) {
      const existingGroups = await loadOrganizationGroups();
      const duplicateGroup = existingGroups.find(g => 
        g.id !== id && g.name.toLowerCase() === data.name.toLowerCase()
      );
      
      if (duplicateGroup) {
        console.warn('[ORGANIZATION-GROUPS] Duplicate group name for update:', data.name);
        return NextResponse.json({ error: "A group with this name already exists." }, { status: 409 });
      }
    }

    const updatedGroup = await updateOrganizationGroup(
      id, 
      {
        name: data.name,
        description: data.description,
        organizationIds: data.organizationIds
      },
      data.updatedBy
    );
    
    if (!updatedGroup) {
      return NextResponse.json({ error: "Group not found or failed to update" }, { status: 404 });
    }
    
    console.log('[ORGANIZATION-GROUPS] Successfully updated group:', updatedGroup.id);
    
    return NextResponse.json(updatedGroup);
  } catch (error: any) {
    console.error("Error updating organization group:", error);
    
    // Enhanced error reporting
    let errorMessage = "Failed to update organization group";
    let statusCode = 500;
    
    if (error.code) {
      console.error("PostgreSQL error code:", error.code);
      
      switch (error.code) {
        case '23503': // Foreign key violation
          // Check which foreign key constraint failed
          if (error.details && error.details.includes('organization_id')) {
            errorMessage = "One or more organization IDs are invalid or do not exist";
            statusCode = 400;
          } else if (error.details && error.details.includes('added_by_fkey')) {
            errorMessage = "Invalid user ID - user does not exist in the system";
            statusCode = 400;
          } else if (error.details && error.details.includes('updated_by')) {
            errorMessage = "Invalid updater user ID - user does not exist in the system";
            statusCode = 400;
          } else {
            errorMessage = "Foreign key constraint violation - invalid reference";
            statusCode = 400;
          }
          break;
        case '23505': // Unique constraint violation
          errorMessage = "A group with this name already exists";
          statusCode = 409;
          break;
        case '42501': // Insufficient privilege (RLS)
          errorMessage = "Insufficient permissions to update organization group";
          statusCode = 403;
          break;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error.message,
        code: error.code,
        hint: error.hint 
      },
      { status: statusCode }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }
    
    const success = await deleteOrganizationGroup(id);
    
    if (!success) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting organization group:", error);
    return NextResponse.json(
      { error: "Failed to delete organization group", details: error.message },
      { status: 500 }
    );
  }
} 