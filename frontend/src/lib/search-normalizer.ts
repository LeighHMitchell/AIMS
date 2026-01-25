/**
 * Search Result Normalizer
 *
 * Converts API search responses to the standardized SearchResult types.
 * Handles legacy API formats and normalizes data for consistent rendering.
 */

import type {
  SearchResult,
  ActivitySearchResult,
  OrganisationSearchResult,
  SectorSearchResult,
  TagSearchResult,
  UserSearchResult,
  ContactSearchResult,
  SearchResultType
} from '@/types/search'

// Legacy API result interface (what the API currently returns)
export interface LegacySearchResult {
  id: string
  type: 'activity' | 'organization' | 'user' | 'sector' | 'tag' | 'contact'
  title: string
  subtitle?: string
  metadata?: {
    acronym?: string
    status?: string
    reporting_org?: string
    reporting_org_acronym?: string
    manager?: string
    tags?: string[]
    partner_id?: string
    iati_id?: string
    iati_identifier?: string
    updated_at?: string
    sector_code?: string
    sector_category?: string
    profile_picture_url?: string
    logo_url?: string
    banner_url?: string
    activity_icon_url?: string
    code?: string
    activity_count?: number
    activity_id?: string
    activity_title?: string
    position?: string
    organisation?: string
    email?: string
    phone?: string
    contact_type?: string
    // Organisation fields
    organisation_type?: string
    geography?: string
    // Sector hierarchy
    hierarchy_level?: 'category' | 'sector' | 'sub-sector'
    parent_code?: string
    parent_name?: string
  }
}

/**
 * Strips HTML tags from highlighted text
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Determines sector hierarchy level from the code
 * DAC3 codes are 3 digits, DAC5 codes are 5 digits
 */
function determineSectorHierarchyLevel(code: string): 'category' | 'sector' | 'sub-sector' {
  const cleanCode = code.replace(/\D/g, '')
  if (cleanCode.length <= 3) {
    return 'category'
  }
  return 'sector'
}

/**
 * Normalizes an activity result
 */
function normalizeActivity(result: LegacySearchResult): ActivitySearchResult {
  return {
    type: 'activity',
    id: result.id,
    title: stripHtml(result.title),
    subtitle: result.subtitle,
    metadata: {
      acronym: result.metadata?.acronym,
      status: result.metadata?.status,
      reporting_org: result.metadata?.reporting_org,
      reporting_org_acronym: result.metadata?.reporting_org_acronym,
      manager: result.metadata?.manager,
      tags: result.metadata?.tags,
      partner_id: result.metadata?.partner_id,
      iati_id: result.metadata?.iati_id,
      iati_identifier: result.metadata?.iati_identifier,
      activity_icon_url: result.metadata?.activity_icon_url,
      updated_at: result.metadata?.updated_at
    }
  }
}

/**
 * Normalizes an organisation result
 * Note: API may return "organization" (US spelling), we normalize to "organisation"
 */
function normalizeOrganisation(result: LegacySearchResult): OrganisationSearchResult {
  return {
    type: 'organisation',
    id: result.id,
    title: stripHtml(result.title),
    subtitle: result.subtitle,
    metadata: {
      acronym: result.metadata?.acronym,
      code: result.metadata?.code,
      organisation_type: result.metadata?.organisation_type,
      geography: result.metadata?.geography || result.subtitle,
      logo_url: result.metadata?.logo_url,
      banner_url: result.metadata?.banner_url,
      updated_at: result.metadata?.updated_at
    }
  }
}

/**
 * Normalizes a sector result
 * Never displays "DAC" in the output
 */
function normalizeSector(result: LegacySearchResult): SectorSearchResult {
  const code = result.metadata?.sector_code || result.metadata?.code || result.id
  const hierarchyLevel = result.metadata?.hierarchy_level || determineSectorHierarchyLevel(code)

  // Strip any "DAC" prefix from the title
  let title = stripHtml(result.title)
  title = title.replace(/^DAC\s*/i, '').replace(/\s*DAC\s*$/i, '')

  return {
    type: 'sector',
    id: result.id,
    title,
    subtitle: result.subtitle,
    metadata: {
      code,
      hierarchy_level: hierarchyLevel,
      parent_code: result.metadata?.parent_code,
      parent_name: result.metadata?.parent_name,
      updated_at: result.metadata?.updated_at
    }
  }
}

/**
 * Normalizes a tag result
 */
function normalizeTag(result: LegacySearchResult): TagSearchResult {
  return {
    type: 'tag',
    id: result.id,
    title: stripHtml(result.title),
    subtitle: result.subtitle,
    metadata: {
      activity_count: result.metadata?.activity_count ?? 0,
      updated_at: result.metadata?.updated_at
    }
  }
}

/**
 * Normalizes a user result
 */
function normalizeUser(result: LegacySearchResult): UserSearchResult {
  return {
    type: 'user',
    id: result.id,
    title: stripHtml(result.title),
    subtitle: result.subtitle,
    metadata: {
      position: result.metadata?.position,
      organisation: result.metadata?.organisation,
      email: result.metadata?.email,
      profile_picture_url: result.metadata?.profile_picture_url,
      updated_at: result.metadata?.updated_at
    }
  }
}

/**
 * Normalizes a contact result
 */
function normalizeContact(result: LegacySearchResult): ContactSearchResult {
  return {
    type: 'contact',
    id: result.id,
    title: stripHtml(result.title),
    subtitle: result.subtitle,
    metadata: {
      activity_id: result.metadata?.activity_id,
      activity_title: result.metadata?.activity_title,
      position: result.metadata?.position,
      organisation: result.metadata?.organisation,
      email: result.metadata?.email,
      phone: result.metadata?.phone,
      contact_type: result.metadata?.contact_type,
      updated_at: result.metadata?.updated_at
    }
  }
}

/**
 * Normalizes a single search result from API format to the new typed format
 */
export function normalizeSearchResult(result: LegacySearchResult): SearchResult {
  switch (result.type) {
    case 'activity':
      return normalizeActivity(result)
    case 'organization':
      // Normalize US spelling to UK spelling
      return normalizeOrganisation(result)
    case 'sector':
      return normalizeSector(result)
    case 'tag':
      return normalizeTag(result)
    case 'user':
      return normalizeUser(result)
    case 'contact':
      return normalizeContact(result)
    default:
      // Fallback - treat unknown types as activities
      return normalizeActivity(result)
  }
}

/**
 * Normalizes an array of search results
 */
export function normalizeSearchResults(results: LegacySearchResult[]): SearchResult[] {
  return results.map(normalizeSearchResult)
}

/**
 * Maps the legacy API type to the new SearchResultType
 * Handles the organization -> organisation conversion
 */
export function mapLegacyType(type: string): SearchResultType {
  if (type === 'organization') {
    return 'organisation'
  }
  return type as SearchResultType
}
