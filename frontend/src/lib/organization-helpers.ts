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
 * 1. Use /api/organizations/resolve for fuzzy matching (handles ref and name)
 * 2. Create new organization via POST /api/organizations if not found
 * 
 * NOTE: Uses API endpoints instead of direct Supabase to avoid RLS/timeout issues
 * 
 * @param supabase - Supabase client (kept for backward compatibility, but not used)
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
    // Step 1: Try to resolve using existing API endpoint (server-side, no RLS issues)
    try {
      const resolveResponse = await withTimeout(
        fetch('/api/organizations/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref, narrative: name })
        }),
        DB_TIMEOUT_MS,
        `Resolve org ${orgName}`
      );

      if (resolveResponse.ok) {
        const resolveData = await resolveResponse.json();
        if (resolveData.matched && resolveData.organization) {
          console.log(`[Org Helper] ✓ Resolved via API: ${resolveData.organization.name} (ID: ${resolveData.organization.id}, method: ${resolveData.method})`);
          return resolveData.organization.id;
        }
      } else {
        console.warn(`[Org Helper] Resolve API returned ${resolveResponse.status}, will try to create`);
      }
    } catch (resolveErr) {
      console.error(`[Org Helper] Error resolving organization "${orgName}":`, resolveErr);
      // Continue to creation step
    }

    // Step 2: Create new organization via API (handles duplicate checking)
    console.log(`[Org Helper] Creating new organization via API: "${orgName}"`);

    const newOrgData: any = {
      name: orgName,
      iati_org_id: ref || null,
      alias_refs: ref ? [ref] : [],
      type: type || null,
      Organisation_Type_Code: type || null,
      country: null // Per user requirement
    };

    try {
      const createResponse = await withTimeout(
        fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrgData)
        }),
        DB_TIMEOUT_MS,
        `Create org ${orgName}`
      );

      if (createResponse.ok) {
        const createdOrg = await createResponse.json();
        console.log(`[Org Helper] ✓ Created organization via API: "${createdOrg.name}" (ID: ${createdOrg.id})`);
        return createdOrg.id;
      } else {
        const errorText = await createResponse.text();
        console.error(`[Org Helper] ✗ API error creating organization "${orgName}":`, errorText);
        return null;
      }
    } catch (createErr) {
      console.error(`[Org Helper] Timeout/error creating organization "${orgName}":`, createErr);
      return null;
    }
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
