import { supabaseAdmin } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface OrganizationGroup {
  id: string; // UUID
  name: string;
  description: string;
  organizationIds: string[]; // Array of organization UUIDs
  createdBy: string; // User UUID
  createdByName?: string; // User's name
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  updatedBy?: string; // User UUID
  updatedByName?: string;
  memberCount?: number;
}

// Reusable Supabase query to fetch groups with members
const selectQuery = `
  id,
  name,
  description,
  created_by,
  created_at,
  updated_at,
  organization_group_members:organization_group_members (
    organization_id
  )
`;

// Helper to format Supabase data into our application's OrganizationGroup interface
function formatGroup(group: any): OrganizationGroup {
  return {
    id: group.id,
    name: group.name,
    description: group.description || '',
    organizationIds: group.organization_group_members?.map((m: any) => m.organization_id) || [],
    memberCount: group.organization_group_members?.length || 0,
    createdBy: group.created_by || 'system', // Handle null created_by
    createdByName: 'Unknown User', // We'll fetch this separately if needed
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

// Load all organization groups from the database
export async function loadOrganizationGroups(): Promise<OrganizationGroup[]> {
  console.log('[DB] Loading organization groups...');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_groups')
      .select(selectQuery)
      .order('created_at', { ascending: false });

    console.log('[DB] Raw query response:', {
      error: error,
      dataExists: !!data,
      dataLength: data?.length || 0,
      rawData: data
    });

    if (error) {
      console.error('[DB] Error loading groups:', error);
      throw error;
    }
    
    if (!data) {
      console.warn('[DB] No data returned from query');
      return [];
    }
    
    console.log('[DB] Processing groups data...');
    const formatted = data.map((group: any, index: number) => {
      console.log(`[DB] Processing group ${index + 1}:`, {
        id: group.id,
        name: group.name,
        membersCount: group.organization_group_members?.length || 0,
        rawGroup: group
      });
      return formatGroup(group);
    });
    
    console.log(`[DB] Successfully loaded and formatted ${formatted.length} organization groups.`);
    return formatted;
  } catch (error) {
    console.error('[DB] Exception in loadOrganizationGroups:', error);
    throw error;
  }
}

// Get a single organization group by ID
export async function getOrganizationGroupById(id: string): Promise<OrganizationGroup | null> {
  console.log(`[DB] Getting group by ID: ${id}`);

  const { data, error } = await supabaseAdmin
    .from('organization_groups')
    .select(selectQuery)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      console.log(`[DB] Group with ID ${id} not found.`);
      return null;
    }
    console.error(`[DB] Error getting group ${id}:`, error);
    throw error;
  }

  return data ? formatGroup(data) : null;
}

interface CreateGroupInput {
  name: string;
  description?: string;
  organizationIds: string[];
  createdBy: string; // User UUID
}

// Create a new organization group and its members
export async function createOrganizationGroup(groupInput: CreateGroupInput): Promise<OrganizationGroup> {
  console.log('[DB] Creating new group:', {
    name: groupInput.name,
    description: groupInput.description,
    organizationIdsCount: groupInput.organizationIds.length,
    organizationIds: groupInput.organizationIds,
    createdBy: groupInput.createdBy
  });

  // First, validate that all organization IDs exist
  console.log('[DB] Validating organization IDs...');
  const { data: existingOrgs, error: validateError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .in('id', groupInput.organizationIds);

  if (validateError) {
    console.error('[DB] Error validating organization IDs:', validateError);
    throw validateError;
  }

  if (!existingOrgs || existingOrgs.length !== groupInput.organizationIds.length) {
    const foundIds = existingOrgs?.map((o: { id: string }) => o.id) || [];
    const missingIds = groupInput.organizationIds.filter(id => !foundIds.includes(id));
    console.error('[DB] Missing organization IDs:', missingIds);
    throw new Error(`Organization IDs not found: ${missingIds.join(', ')}`);
  }

  console.log('[DB] All organization IDs validated successfully');

  // Validate that the user exists
  console.log('[DB] Validating user ID:', groupInput.createdBy);
  const { data: existingUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, full_name')
    .eq('id', groupInput.createdBy)
    .single();

  if (userError) {
    console.warn('[DB] Could not validate user (might be RLS issue):', userError);
    // Don't throw error for user validation issues - might be RLS
  } else if (existingUser) {
    console.log('[DB] User validated successfully:', existingUser.full_name);
  } else {
    console.warn('[DB] User not found but proceeding:', groupInput.createdBy);
  }

  // Step 1: Insert into organization_groups table
  console.log('[DB] Inserting group record...');
  const { data: newGroup, error: groupError } = await supabaseAdmin
    .from('organization_groups')
    .insert({
      name: groupInput.name,
      description: groupInput.description,
      created_by: null, // Set to null to avoid foreign key constraint issues
    })
    .select('id, name, description, created_by, created_at, updated_at')
    .single();

  if (groupError) {
    console.error('[DB] Error creating group:', groupError);
    throw groupError;
  }

  console.log('[DB] Group created successfully:', newGroup.id);

  // Step 2: Insert members into organization_group_members table
  const membersToInsert = groupInput.organizationIds.map(orgId => ({
    group_id: newGroup.id,
    organization_id: orgId,
    added_by: null, // Set to null to avoid foreign key constraint issues
  }));
  
  console.log('[DB] Inserting group members:', membersToInsert.length);
  const { data: insertedMembers, error: memberError } = await supabaseAdmin
    .from('organization_group_members')
    .insert(membersToInsert)
    .select();

  if (memberError) {
    console.error('[DB] Error adding members to group:', memberError);
    // Clean up by deleting the group if members fail to be added
    console.log('[DB] Cleaning up group due to member insertion failure...');
    await supabaseAdmin.from('organization_groups').delete().eq('id', newGroup.id);
    throw memberError;
  }
  
  console.log(`[DB] Successfully created group "${newGroup.name}" with ${insertedMembers?.length || 0} members.`);
  const finalGroup = await getOrganizationGroupById(newGroup.id);
  
  if (!finalGroup) {
    throw new Error('Failed to retrieve created group');
  }
  
  return finalGroup;
}

interface UpdateGroupInput {
  name?: string;
  description?: string;
  organizationIds?: string[];
}

// Update an organization group and its members
export async function updateOrganizationGroup(id: string, updates: UpdateGroupInput, updatedBy: string): Promise<OrganizationGroup | null> {
  console.log(`[DB] Updating group ID: ${id}`);

  // Step 1: Update the core group details if provided
  if (updates.name || updates.description) {
    const { error: updateError } = await supabaseAdmin
      .from('organization_groups')
      .update({ 
        name: updates.name, 
        description: updates.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('[DB] Error updating group details:', updateError);
      throw updateError;
    }
  }

  // Step 2: Sync members if organizationIds are provided
  if (updates.organizationIds) {
    // Delete existing members
    const { error: deleteError } = await supabaseAdmin
      .from('organization_group_members')
      .delete()
      .eq('group_id', id);

    if (deleteError) {
      console.error('[DB] Error deleting old members:', deleteError);
      throw deleteError;
    }

    // Insert new members
    const membersToInsert = updates.organizationIds.map(orgId => ({
      group_id: id,
      organization_id: orgId,
      added_by: null, // Set to null to avoid foreign key constraint issues
    }));

    if (membersToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('organization_group_members')
        .insert(membersToInsert);

      if (insertError) {
        console.error('[DB] Error inserting new members:', insertError);
        throw insertError;
      }
    }
  }

  console.log(`[DB] Successfully updated group ${id}.`);
  return getOrganizationGroupById(id);
}

// Delete an organization group
export async function deleteOrganizationGroup(id: string): Promise<boolean> {
  console.log(`[DB] Deleting group ID: ${id}`);
  
  // The database is set up with ON DELETE CASCADE for group_id in
  // organization_group_members, so deleting the group will also delete members.
  const { error } = await supabaseAdmin
    .from('organization_groups')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`[DB] Error deleting group ${id}:`, error);
    return false;
  }

  console.log(`[DB] Successfully deleted group ${id}.`);
  return true;
} 