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
 * Pre-fetch and resolve all organizations in batch before the main import loop.
 *
 * Instead of calling getOrCreateOrganization() per org per activity (N×M queries),
 * this resolves all unique org refs/names with a handful of batch queries, then
 * falls back to individual creation only for genuinely new orgs.
 *
 * @param supabase - Supabase client (admin recommended)
 * @param orgParams - All organization params collected from activities
 * @returns Map keyed by ref AND lowercase name → org UUID
 */
export async function prefetchOrganizations(
  supabase: SupabaseClient<any>,
  orgParams: OrganizationParams[]
): Promise<Map<string, string>> {
  const cache = new Map<string, string>();
  if (orgParams.length === 0) return cache;

  // --- 1. Deduplicate by ref || name ---
  const uniqueMap = new Map<string, OrganizationParams>();
  for (const p of orgParams) {
    const key = p.ref || p.name?.toLowerCase();
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, p);
    }
  }
  const uniqueOrgs = Array.from(uniqueMap.values());
  const allRefs = uniqueOrgs.map(o => o.ref).filter((r): r is string => !!r);
  console.log(`[Org Prefetch] ${orgParams.length} total params → ${uniqueOrgs.length} unique (${allRefs.length} with refs)`);

  // Helper to store result in cache under both ref and lowercase name
  const storeInCache = (ref: string | undefined, name: string | undefined, id: string) => {
    if (ref) cache.set(ref, id);
    if (name) cache.set(name.toLowerCase(), id);
  };

  // --- 2. Batch fetch by iati_org_id ---
  if (allRefs.length > 0) {
    try {
      const { data: refMatches } = await withTimeout(
        Promise.resolve(supabase
          .from('organizations')
          .select('id, name, iati_org_id')
          .in('iati_org_id', allRefs)),
        DB_TIMEOUT_MS * 2,
        'Batch fetch orgs by ref'
      ) as any;
      if (refMatches) {
        for (const org of refMatches) {
          storeInCache(org.iati_org_id, org.name, org.id);
        }
        console.log(`[Org Prefetch] Matched ${refMatches.length} orgs by iati_org_id`);
      }
    } catch (err) {
      console.warn('[Org Prefetch] Batch ref lookup failed, will fall back:', err);
    }
  }

  // --- 3. Batch fetch alias_refs (single query, client-side check) ---
  const unresolvedWithRef = uniqueOrgs.filter(o => o.ref && !cache.has(o.ref));
  if (unresolvedWithRef.length > 0) {
    try {
      const { data: aliasOrgs } = await withTimeout(
        Promise.resolve(supabase
          .from('organizations')
          .select('id, name, alias_refs')
          .not('alias_refs', 'is', null)),
        DB_TIMEOUT_MS * 2,
        'Batch fetch orgs with alias_refs'
      ) as any;
      if (aliasOrgs) {
        for (const param of unresolvedWithRef) {
          const match = aliasOrgs.find((org: any) =>
            Array.isArray(org.alias_refs) && org.alias_refs.includes(param.ref)
          );
          if (match) {
            storeInCache(param.ref, param.name, match.id);
          }
        }
        const aliasResolved = unresolvedWithRef.filter(o => o.ref && cache.has(o.ref)).length;
        if (aliasResolved > 0) {
          console.log(`[Org Prefetch] Matched ${aliasResolved} orgs by alias_refs`);
        }
      }
    } catch (err) {
      console.warn('[Org Prefetch] Alias ref lookup failed:', err);
    }
  }

  // --- 4. Batch fetch by name for name-only orgs ---
  const nameOnlyOrgs = uniqueOrgs.filter(o => !o.ref && o.name && !cache.has(o.name.toLowerCase()));
  if (nameOnlyOrgs.length > 0) {
    try {
      // Fetch all orgs and match names client-side (case-insensitive)
      // Supabase doesn't support .in() with ilike, so we filter client-side
      const { data: nameMatches } = await withTimeout(
        Promise.resolve(supabase
          .from('organizations')
          .select('id, name')),
        DB_TIMEOUT_MS * 2,
        'Batch fetch orgs for name matching'
      ) as any;
      if (nameMatches) {
        const nameLookup = new Map<string, string>();
        for (const org of nameMatches) {
          if (org.name) nameLookup.set(org.name.toLowerCase(), org.id);
        }
        for (const param of nameOnlyOrgs) {
          const matchId = nameLookup.get(param.name!.toLowerCase());
          if (matchId) {
            storeInCache(undefined, param.name, matchId);
          }
        }
      }
    } catch (err) {
      console.warn('[Org Prefetch] Name batch lookup failed:', err);
    }
  }

  // --- 5. Create genuinely new orgs individually ---
  const stillUnresolved = uniqueOrgs.filter(o => {
    const key = o.ref || o.name?.toLowerCase();
    return key && !cache.has(key);
  });
  if (stillUnresolved.length > 0) {
    console.log(`[Org Prefetch] Creating ${stillUnresolved.length} new organizations...`);
    for (const param of stillUnresolved) {
      const orgId = await getOrCreateOrganization(supabase, param);
      if (orgId) {
        storeInCache(param.ref, param.name, orgId);
      }
    }
  }

  console.log(`[Org Prefetch] Resolved ${cache.size} cache entries total`);
  return cache;
}
