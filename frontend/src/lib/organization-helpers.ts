/**
 * Organization Helper Functions
 *
 * Shared utilities for organization lookup and creation during IATI import.
 * Follows IATI 2.03 standard for organization reference resolution.
 *
 * NOTE: Uses direct Supabase queries instead of API endpoints to avoid
 * URL parsing issues in server-side code.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface OrganizationParams {
  ref?: string;  // IATI organization identifier
  name?: string; // Organization name
  type?: string; // IATI organization type code (e.g., "10", "80")
}

// Timeout for database operations in milliseconds
const DB_TIMEOUT_MS = 5000;

// Helper to wrap promises with timeout
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out: ${operationName}`)), timeoutMs)
    )
  ]);
};

/**
 * Find or create an organization by ref or name (case-insensitive).
 *
 * Resolution order (IATI 2.03 compliant):
 * 1. Try exact match on iati_org_id (most reliable)
 * 2. Try match in alias_refs array
 * 3. Try case-insensitive name match
 * 4. Create new organization if not found
 *
 * @param supabase - Supabase client (admin client recommended for server-side)
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

  try {
    // Step 1: Try exact match by iati_org_id (most reliable)
    if (ref) {
      try {
        const queryPromise = supabase
          .from('organizations')
          .select('id, name, iati_org_id, alias_refs')
          .eq('iati_org_id', ref)
          .maybeSingle();

        const { data: orgByRef, error: refError } = await withTimeout(
          queryPromise,
          DB_TIMEOUT_MS,
          `Resolve org by ref ${ref}`
        );

        if (!refError && orgByRef) {
          console.log(`[Org Helper] ✓ Found by iati_org_id: ${orgByRef.name} (ID: ${orgByRef.id})`);
          return orgByRef.id;
        }
      } catch (err) {
        console.warn(`[Org Helper] Error querying by iati_org_id:`, err);
      }

      // Step 2: Try match in alias_refs array
      try {
        const aliasQueryPromise = supabase
          .from('organizations')
          .select('id, name, alias_refs')
          .not('alias_refs', 'is', null);

        const { data: allOrgs } = await withTimeout(
          aliasQueryPromise,
          DB_TIMEOUT_MS,
          `Query orgs with alias_refs`
        );

        const aliasMatch = allOrgs?.find((org: any) =>
          org.alias_refs && Array.isArray(org.alias_refs) && org.alias_refs.includes(ref)
        );

        if (aliasMatch) {
          console.log(`[Org Helper] ✓ Found by alias_refs: ${aliasMatch.name} (ID: ${aliasMatch.id})`);
          return aliasMatch.id;
        }
      } catch (err) {
        console.warn(`[Org Helper] Error querying alias_refs:`, err);
      }
    }

    // Step 3: Try case-insensitive name match (only if no ref provided)
    if (name && !ref) {
      try {
        const nameQueryPromise = supabase
          .from('organizations')
          .select('id, name')
          .ilike('name', name);

        const { data: orgsByName } = await withTimeout(
          nameQueryPromise,
          DB_TIMEOUT_MS,
          `Resolve org by name ${name}`
        );

        if (orgsByName && orgsByName.length > 0) {
          // Prefer exact case match, otherwise take first
          const exactMatch = orgsByName.find((o: any) => o.name === name);
          const match = exactMatch || orgsByName[0];
          console.log(`[Org Helper] ✓ Found by name: ${match.name} (ID: ${match.id})`);
          return match.id;
        }
      } catch (err) {
        console.warn(`[Org Helper] Error querying by name:`, err);
      }
    }

    // Step 4: Create new organization
    console.log(`[Org Helper] Creating new organization: "${orgName}"`);

    const newOrgData = {
      name: orgName,
      iati_org_id: ref || null,
      alias_refs: ref ? [ref] : [],
      type: type || null,
      Organisation_Type_Code: type || null,
      country: null // Per user requirement
    };

    try {
      const createQueryPromise = supabase
        .from('organizations')
        .insert(newOrgData)
        .select('id, name')
        .single();

      const { data: createdOrg, error: createError } = await withTimeout(
        createQueryPromise,
        DB_TIMEOUT_MS,
        `Create org ${orgName}`
      );

      if (createError) {
        // Check if it's a unique constraint violation (org already exists)
        if (createError.code === '23505') {
          console.log(`[Org Helper] Organization already exists, trying to find it...`);
          // Try to find the existing organization
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id, name')
            .or(`iati_org_id.eq.${ref},name.ilike.${orgName}`)
            .maybeSingle();

          if (existingOrg) {
            console.log(`[Org Helper] ✓ Found existing org after conflict: ${existingOrg.name} (ID: ${existingOrg.id})`);
            return existingOrg.id;
          }
        }
        console.error(`[Org Helper] ✗ Error creating organization "${orgName}":`, createError);
        return null;
      }

      if (createdOrg) {
        console.log(`[Org Helper] ✓ Created organization: "${createdOrg.name}" (ID: ${createdOrg.id})`);
        return createdOrg.id;
      }
    } catch (createErr) {
      console.error(`[Org Helper] Timeout/error creating organization "${orgName}":`, createErr);
      return null;
    }

    return null;
  } catch (err) {
    console.error(`[Org Helper] Unexpected error in getOrCreateOrganization for "${orgName}":`, err);
    return null;
  }
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
