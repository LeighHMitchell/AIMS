/**
 * Organization Alias Validation Utilities
 * Functions for validating and normalizing organization alias data
 */

export interface Organization {
  id: string
  name: string
  iati_org_id?: string | null
  alias_refs?: string[]
  name_aliases?: string[]
}

/**
 * Normalize an array of alias strings
 * - Trims whitespace
 * - Removes duplicates
 * - Filters out empty strings
 * - Sorts alphabetically
 */
export function normalizeAliasArray(arr: string[]): string[] {
  if (!arr || !Array.isArray(arr)) {
    return []
  }

  const normalized = arr
    .map(item => item.trim())
    .filter(item => item.length > 0)

  // Remove duplicates and sort
  return [...new Set(normalized)].sort()
}

/**
 * Validate alias refs to ensure no conflicts with existing organizations
 * Returns array of error messages (empty if valid)
 */
export function validateAliasRefs(
  refs: string[],
  currentOrgId: string,
  existingOrgs: Organization[]
): string[] {
  const errors: string[] = []
  const normalizedRefs = normalizeAliasArray(refs)

  // Check if any alias matches another org's canonical IATI ID
  for (const ref of normalizedRefs) {
    const conflictOrg = existingOrgs.find(
      org => org.id !== currentOrgId && org.iati_org_id === ref
    )

    if (conflictOrg) {
      errors.push(
        `"${ref}" is already used as the canonical IATI identifier for ${conflictOrg.name}`
      )
    }
  }

  // Check for duplicates within the array
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const ref of refs) {
    const normalized = ref.trim().toLowerCase()
    if (seen.has(normalized)) {
      duplicates.add(ref.trim())
    }
    seen.add(normalized)
  }

  if (duplicates.size > 0) {
    errors.push(
      `Duplicate aliases found: ${Array.from(duplicates).join(', ')}`
    )
  }

  return errors
}

/**
 * Check if any aliases conflict with other organizations
 * Returns map of conflicting aliases to organization names
 */
export function checkAliasConflicts(
  orgId: string,
  aliases: string[],
  existingOrgs: Organization[]
): Map<string, string> {
  const conflicts = new Map<string, string>()
  const normalizedAliases = normalizeAliasArray(aliases)

  for (const alias of normalizedAliases) {
    // Check canonical IATI IDs
    const conflictOrg = existingOrgs.find(
      org => org.id !== orgId && org.iati_org_id === alias
    )

    if (conflictOrg) {
      conflicts.set(alias, `${conflictOrg.name} (canonical ID)`)
      continue
    }

    // Check other org's aliases
    const aliasConflict = existingOrgs.find(
      org =>
        org.id !== orgId &&
        (org.alias_refs?.includes(alias) || org.name_aliases?.includes(alias))
    )

    if (aliasConflict) {
      conflicts.set(alias, `${aliasConflict.name} (alias)`)
    }
  }

  return conflicts
}

/**
 * Validate name aliases
 * Returns array of error messages (empty if valid)
 */
export function validateNameAliases(names: string[]): string[] {
  const errors: string[] = []

  // Check for very short names (likely typos)
  const tooShort = names.filter(name => name.trim().length < 2)
  if (tooShort.length > 0) {
    errors.push(
      `The following aliases are too short (min 2 characters): ${tooShort.join(', ')}`
    )
  }

  // Check for duplicates
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const name of names) {
    const normalized = name.trim().toLowerCase()
    if (seen.has(normalized)) {
      duplicates.add(name.trim())
    }
    seen.add(normalized)
  }

  if (duplicates.size > 0) {
    errors.push(
      `Duplicate name aliases found: ${Array.from(duplicates).join(', ')}`
    )
  }

  return errors
}

/**
 * Check if a string looks like an IATI organization identifier
 * IATI IDs typically follow pattern: XX-XXX-XXXXXX
 */
export function looksLikeIATIIdentifier(str: string): boolean {
  if (!str) return false
  
  // Basic pattern check for IATI org IDs
  // Examples: GB-GOV-1, US-EIN-123456789, XM-DAC-7
  const iatiPattern = /^[A-Z]{2}(-[A-Z0-9]+){1,3}$/i
  
  return iatiPattern.test(str.trim())
}

/**
 * Suggest whether a ref should be in alias_refs vs name_aliases
 */
export function suggestAliasType(value: string): 'ref' | 'name' {
  if (looksLikeIATIIdentifier(value)) {
    return 'ref'
  }
  
  // If it's mostly numbers or short codes, it's probably a ref
  if (/^[0-9-]+$/.test(value) || value.length <= 10) {
    return 'ref'
  }
  
  // Otherwise, it's probably a name
  return 'name'
}

/**
 * Generate a unique key for an organization reference
 * Used for deduplication during imports
 */
export function getOrgRefKey(ref: string | null, narrative: string | null): string {
  const refPart = ref?.trim().toLowerCase() || 'no-ref'
  const narrativePart = narrative?.trim().toLowerCase() || 'no-narrative'
  return `${refPart}::${narrativePart}`
}

