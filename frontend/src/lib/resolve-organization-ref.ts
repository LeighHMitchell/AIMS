/**
 * Utility to resolve organization references (including aliases) to canonical organizations
 * Used when displaying transactions to ensure correct logos/links even when using alias IDs
 */

interface Organization {
  id: string
  name: string
  acronym?: string | null
  iati_org_id?: string | null
  alias_refs?: string[] | null
  name_aliases?: string[] | null
  logo?: string | null
  [key: string]: any
}

/**
 * Resolve an organization reference (IATI ID or alias) to the canonical organization
 * 
 * @param ref - The organization reference (could be IATI ID or alias)
 * @param organizations - Array of organizations to search
 * @returns The matched organization or null
 */
export function resolveOrganizationByRef(
  ref: string | null | undefined,
  organizations: Organization[]
): Organization | null {
  if (!ref || !organizations || organizations.length === 0) {
    return null
  }

  const normalizedRef = ref.trim()

  // Step 1: Try direct match by iati_org_id
  const directMatch = organizations.find(
    org => org.iati_org_id === normalizedRef
  )
  if (directMatch) {
    return directMatch
  }

  // Step 2: Try match by alias_refs array
  const aliasMatch = organizations.find(
    org => org.alias_refs && org.alias_refs.includes(normalizedRef)
  )
  if (aliasMatch) {
    return aliasMatch
  }

  // Step 3: Fallback to legacy matching by organization ID
  const idMatch = organizations.find(org => org.id === normalizedRef)
  if (idMatch) {
    return idMatch
  }

  return null
}

/**
 * Resolve multiple organization references at once
 * Useful for batch processing of transactions
 * 
 * @param refs - Array of organization references
 * @param organizations - Array of organizations to search
 * @returns Map of ref -> organization
 */
export function resolveOrganizationsByRefs(
  refs: (string | null | undefined)[],
  organizations: Organization[]
): Map<string, Organization> {
  const resolved = new Map<string, Organization>()

  for (const ref of refs) {
    if (!ref) continue
    
    const org = resolveOrganizationByRef(ref, organizations)
    if (org) {
      resolved.set(ref, org)
    }
  }

  return resolved
}

/**
 * Get organization display info (name, logo, link) from a reference
 * 
 * @param ref - The organization reference
 * @param organizations - Array of organizations to search
 * @returns Display info or fallback values
 */
export function getOrganizationDisplay(
  ref: string | null | undefined,
  organizations: Organization[]
): {
  id: string | null
  name: string
  acronym: string | null
  logo: string | null
  iati_org_id: string | null
} {
  const org = resolveOrganizationByRef(ref, organizations)

  if (org) {
    return {
      id: org.id,
      name: org.name,
      acronym: org.acronym || null,
      logo: org.logo || null,
      iati_org_id: org.iati_org_id || null
    }
  }

  // Fallback: return the ref as the name
  return {
    id: null,
    name: ref || 'Unknown',
    acronym: null,
    logo: null,
    iati_org_id: ref || null
  }
}

