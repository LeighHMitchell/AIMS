/**
 * Contact Helper Functions
 *
 * Shared utilities for contact lookup and creation during IATI import.
 * Follows the same pattern as organization-helpers.ts: tiered matching
 * with batch prefetch for performance.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ContactParams {
  email?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  phone?: string;
  phoneNumber?: string;
  countryCode?: string;
  fax?: string;
  faxCountryCode?: string;
  faxNumber?: string;
  position?: string;
  jobTitle?: string;
  department?: string;
  organisation?: string;
  organisationId?: string;
  website?: string;
  mailingAddress?: string;
  profilePhoto?: string;
  notes?: string;
  secondaryEmail?: string;
}

const DB_TIMEOUT_MS = 5000;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out: ${operationName}`)), timeoutMs)
    )
  ]);
};

/**
 * Compute a dedup key for contact params.
 * email (lowercased, trimmed) > firstName+lastName > null (no dedup possible)
 */
export function contactDedupKey(params: ContactParams): string | null {
  if (params.email && params.email.trim()) {
    return `email:${params.email.trim().toLowerCase()}`;
  }
  if (params.firstName?.trim() && params.lastName?.trim()) {
    return `name:${params.firstName.trim().toLowerCase()}_${params.lastName.trim().toLowerCase()}`;
  }
  return null;
}

/**
 * Find or create a contact by email or name.
 *
 * Resolution order:
 * 1. Email match (case-insensitive)
 * 2. First name + last name match (case-insensitive)
 * 3. Create new contact
 */
export async function getOrCreateContact(
  supabase: SupabaseClient<any>,
  params: ContactParams
): Promise<string | null> {
  if (!params.email && !params.firstName && !params.lastName) {
    console.warn('[Contact Helper] Cannot resolve contact: no email or name provided');
    return null;
  }

  const displayName = params.email || `${params.firstName || ''} ${params.lastName || ''}`.trim() || 'Unknown';
  console.log(`[Contact Helper] Resolving contact: "${displayName}"`);

  try {
    // Step 1: Try email match
    if (params.email && params.email.trim()) {
      try {
        const queryPromise = supabase
          .from('contacts')
          .select('id')
          .ilike('email', params.email.trim())
          .maybeSingle();

        const { data: emailMatch, error } = await withTimeout(
          Promise.resolve(queryPromise),
          DB_TIMEOUT_MS,
          `Resolve contact by email ${params.email}`
        ) as any;

        if (!error && emailMatch) {
          console.log(`[Contact Helper] Found by email: ${displayName} (ID: ${emailMatch.id})`);
          return emailMatch.id;
        }
      } catch (err) {
        console.warn('[Contact Helper] Error querying by email:', err);
      }
    }

    // Step 2: Try first+last name match
    if (params.firstName?.trim() && params.lastName?.trim()) {
      try {
        const queryPromise = supabase
          .from('contacts')
          .select('id')
          .ilike('first_name', params.firstName.trim())
          .ilike('last_name', params.lastName.trim())
          .maybeSingle();

        const { data: nameMatch, error } = await withTimeout(
          Promise.resolve(queryPromise),
          DB_TIMEOUT_MS,
          `Resolve contact by name ${displayName}`
        ) as any;

        if (!error && nameMatch) {
          console.log(`[Contact Helper] Found by name: ${displayName} (ID: ${nameMatch.id})`);
          return nameMatch.id;
        }
      } catch (err) {
        console.warn('[Contact Helper] Error querying by name:', err);
      }
    }

    // Step 3: Create new contact
    console.log(`[Contact Helper] Creating new contact: "${displayName}"`);

    const newContactData: Record<string, any> = {
      title: params.title || null,
      first_name: params.firstName || null,
      middle_name: params.middleName || null,
      last_name: params.lastName || null,
      email: params.email || null,
      secondary_email: params.secondaryEmail || null,
      phone: params.phone || null,
      phone_number: params.phoneNumber || null,
      country_code: params.countryCode || null,
      fax: params.fax || null,
      fax_country_code: params.faxCountryCode || null,
      fax_number: params.faxNumber || null,
      position: params.position || null,
      job_title: params.jobTitle || null,
      department: params.department || null,
      organisation: params.organisation || null,
      organisation_id: params.organisationId || null,
      website: params.website || null,
      mailing_address: params.mailingAddress || null,
      profile_photo: params.profilePhoto || null,
      notes: params.notes || null,
    };

    try {
      const createPromise = supabase
        .from('contacts')
        .insert(newContactData)
        .select('id')
        .single();

      const { data: created, error: createError } = await withTimeout(
        Promise.resolve(createPromise),
        DB_TIMEOUT_MS,
        `Create contact ${displayName}`
      ) as any;

      if (createError) {
        // Handle unique constraint violation (email already exists from concurrent insert)
        if (createError.code === '23505' && params.email) {
          console.log('[Contact Helper] Contact already exists (concurrent insert), looking up...');
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .ilike('email', params.email.trim())
            .maybeSingle();

          if (existing) {
            console.log(`[Contact Helper] Found existing contact after conflict: ${existing.id}`);
            return existing.id;
          }
        }
        console.error(`[Contact Helper] Error creating contact "${displayName}":`, createError);
        return null;
      }

      if (created) {
        console.log(`[Contact Helper] Created contact: "${displayName}" (ID: ${created.id})`);
        return created.id;
      }
    } catch (createErr) {
      console.error(`[Contact Helper] Timeout/error creating contact "${displayName}":`, createErr);
      return null;
    }

    return null;
  } catch (err) {
    console.error(`[Contact Helper] Unexpected error for "${displayName}":`, err);
    return null;
  }
}

/**
 * Pre-fetch and resolve all contacts in batch before the main import loop.
 *
 * Returns a Map keyed by dedup key → contact UUID.
 */
export async function prefetchContacts(
  supabase: SupabaseClient<any>,
  contactParams: ContactParams[]
): Promise<Map<string, string>> {
  const cache = new Map<string, string>();
  if (contactParams.length === 0) return cache;

  // Deduplicate by key
  const uniqueMap = new Map<string, ContactParams>();
  for (const p of contactParams) {
    const key = contactDedupKey(p);
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, p);
    }
  }
  const uniqueContacts = Array.from(uniqueMap.values());
  const allEmails = uniqueContacts
    .map(c => c.email?.trim().toLowerCase())
    .filter((e): e is string => !!e && e.length > 0);

  console.log(`[Contact Prefetch] ${contactParams.length} total params -> ${uniqueContacts.length} unique (${allEmails.length} with emails)`);

  const storeInCache = (params: ContactParams, id: string) => {
    const key = contactDedupKey(params);
    if (key) cache.set(key, id);
  };

  // --- 1. Batch fetch by email ---
  if (allEmails.length > 0) {
    try {
      const { data: emailMatches } = await withTimeout(
        Promise.resolve(supabase
          .from('contacts')
          .select('id, email, first_name, last_name')
          .in('email', allEmails)),
        DB_TIMEOUT_MS * 2,
        'Batch fetch contacts by email'
      ) as any;

      if (emailMatches) {
        // Build email lookup
        const emailLookup = new Map<string, string>();
        for (const c of emailMatches) {
          if (c.email) emailLookup.set(c.email.trim().toLowerCase(), c.id);
        }
        for (const param of uniqueContacts) {
          if (param.email?.trim()) {
            const matchId = emailLookup.get(param.email.trim().toLowerCase());
            if (matchId) storeInCache(param, matchId);
          }
        }
        console.log(`[Contact Prefetch] Matched ${emailMatches.length} contacts by email`);
      }
    } catch (err) {
      console.warn('[Contact Prefetch] Batch email lookup failed:', err);
    }
  }

  // --- 2. Batch fetch by name for unresolved contacts ---
  const nameOnlyContacts = uniqueContacts.filter(c => {
    const key = contactDedupKey(c);
    return key && !cache.has(key) && c.firstName?.trim() && c.lastName?.trim();
  });

  if (nameOnlyContacts.length > 0) {
    try {
      const { data: allContacts } = await withTimeout(
        Promise.resolve(supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .limit(5000)),
        DB_TIMEOUT_MS * 2,
        'Batch fetch contacts for name matching'
      ) as any;

      if (allContacts) {
        const nameLookup = new Map<string, string>();
        for (const c of allContacts) {
          if (c.first_name && c.last_name) {
            const nk = `${c.first_name.trim().toLowerCase()}_${c.last_name.trim().toLowerCase()}`;
            nameLookup.set(nk, c.id);
          }
        }
        for (const param of nameOnlyContacts) {
          const nk = `${param.firstName!.trim().toLowerCase()}_${param.lastName!.trim().toLowerCase()}`;
          const matchId = nameLookup.get(nk);
          if (matchId) storeInCache(param, matchId);
        }
      }
    } catch (err) {
      console.warn('[Contact Prefetch] Name batch lookup failed:', err);
    }
  }

  // --- 3. Create genuinely new contacts individually ---
  const stillUnresolved = uniqueContacts.filter(c => {
    const key = contactDedupKey(c);
    return key && !cache.has(key);
  });

  if (stillUnresolved.length > 0) {
    console.log(`[Contact Prefetch] Creating ${stillUnresolved.length} new contacts...`);
    for (const param of stillUnresolved) {
      const contactId = await getOrCreateContact(supabase, param);
      if (contactId) storeInCache(param, contactId);
    }
  }

  console.log(`[Contact Prefetch] Resolved ${cache.size} cache entries total`);
  return cache;
}
