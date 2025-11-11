/**
 * Organization Helper Functions
 * 
 * Shared utilities for organization lookup and creation during IATI import.
 * Follows IATI 2.03 standard for organization reference resolution.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface OrganizationParams {
  ref?: string;  // IATI organization identifier
  name?: string; // Organization name
  type?: string; // IATI organization type code (e.g., "10", "80")
}

/**
 * Find or create an organization by ref or name (case-insensitive).
 * 
 * Resolution order (IATI 2.03 compliant):
 * 1. Lookup by iati_org_id (ref) if provided - exact match
 * 2. Lookup by name if provided - case-insensitive match using ILIKE
 * 3. Create new organization if not found
 * 
 * @param supabase - Supabase client (server-side or client-side)
 * @param params - Organization parameters (ref, name, type)
 * @returns Organization UUID or null if creation failed
 */
export async function getOrCreateOrganization(
  supabase: SupabaseClient<any>,
  { ref, name, type }: OrganizationParams
): Promise<string | null> {
  // Validate input - need at least ref or name
  if (!ref && !name) {
    console.warn('[Org Helper] Cannot resolve organization: both ref and name are missing');
    return null;
  }

  const orgName = name || ref || 'Unknown Organization';
  console.log(`[Org Helper] Resolving organization: "${orgName}" (ref: ${ref || 'none'}, type: ${type || 'none'})`);

  // Step 1: Look up by IATI organization ID (ref) if provided
  if (ref) {
    const { data: existingByRef, error: refError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('iati_org_id', ref)
      .maybeSingle();

    if (refError) {
      console.error('[Org Helper] Error looking up by ref:', refError);
    } else if (existingByRef) {
      console.log(`[Org Helper] ✓ Found by ref "${ref}": ${existingByRef.name} (ID: ${existingByRef.id})`);
      return existingByRef.id;
    }
  }

  // Step 2: Look up by name (case-insensitive) if provided
  if (name) {
    const { data: existingByName, error: nameError } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('name', name)
      .limit(1);

    if (nameError) {
      console.error('[Org Helper] Error looking up by name:', nameError);
    } else if (existingByName && existingByName.length > 0) {
      const org = existingByName[0];
      console.log(`[Org Helper] ✓ Found by name "${name}": ${org.name} (ID: ${org.id})`);
      return org.id;
    }
  }

  // Step 3: Create new organization if not found
  console.log(`[Org Helper] Creating new organization: "${orgName}" (ref: ${ref || 'none'}, type: ${type || 'none'})`);

  const newOrgData: any = {
    name: orgName,
    iati_org_id: ref || null,
    alias_refs: ref ? [ref] : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Add type fields if provided
  // Support both 'type' and 'Organisation_Type_Code' for compatibility
  if (type) {
    newOrgData.type = type;
    newOrgData.Organisation_Type_Code = type;
  }

  // Country is explicitly set to null (per user requirement)
  newOrgData.country = null;

  const { data: newOrg, error: createError } = await supabase
    .from('organizations')
    .insert(newOrgData)
    .select('id, name')
    .single();

  if (createError) {
    console.error(`[Org Helper] ✗ Error creating organization "${orgName}":`, createError);
    return null;
  }

  if (!newOrg) {
    console.error(`[Org Helper] ✗ Failed to create organization "${orgName}": no data returned`);
    return null;
  }

  console.log(`[Org Helper] ✓ Created organization "${newOrg.name}" (ID: ${newOrg.id})`);
  return newOrg.id;
}

/**
 * Batch resolve or create multiple organizations.
 * More efficient than calling getOrCreateOrganization repeatedly.
 * 
 * @param supabase - Supabase client
 * @param organizations - Array of organization parameters
 * @returns Map of organization key (ref or name) to UUID
 */
export async function batchGetOrCreateOrganizations(
  supabase: SupabaseClient<any>,
  organizations: OrganizationParams[]
): Promise<Map<string, string>> {
  const orgMap = new Map<string, string>();
  
  for (const org of organizations) {
    const orgId = await getOrCreateOrganization(supabase, org);
    if (orgId) {
      // Store by both ref and name for flexible lookup
      if (org.ref) orgMap.set(org.ref, orgId);
      if (org.name) orgMap.set(org.name, orgId);
    }
  }
  
  return orgMap;
}

