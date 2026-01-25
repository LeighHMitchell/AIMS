/**
 * Shared Search Result Types
 *
 * Uses discriminated unions to ensure type safety across all search result types.
 * These types enforce the rendering rules:
 * - Codes first, names second, context last
 * - Never display "DAC" in the UI
 * - IDs/codes in monospaced grey pills
 */

// Base metadata shared across types
interface BaseMetadata {
  updated_at?: string
}

// Activity-specific metadata
export interface ActivitySearchMetadata extends BaseMetadata {
  acronym?: string
  status?: string
  reporting_org?: string
  reporting_org_acronym?: string
  manager?: string
  tags?: string[]
  partner_id?: string
  iati_id?: string
  iati_identifier?: string
  activity_icon_url?: string
}

// Organisation-specific metadata
export interface OrganisationSearchMetadata extends BaseMetadata {
  acronym?: string
  code?: string
  organisation_type?: string
  geography?: string
  logo_url?: string
  banner_url?: string
}

// Sector-specific metadata
export interface SectorSearchMetadata extends BaseMetadata {
  code: string
  hierarchy_level: 'category' | 'sector' | 'sub-sector'
  parent_code?: string
  parent_name?: string
}

// Tag-specific metadata
export interface TagSearchMetadata extends BaseMetadata {
  activity_count?: number
}

// User-specific metadata
export interface UserSearchMetadata extends BaseMetadata {
  position?: string
  organisation?: string
  email?: string
  profile_picture_url?: string
}

// Contact-specific metadata
export interface ContactSearchMetadata extends BaseMetadata {
  activity_id?: string
  activity_title?: string
  position?: string
  organisation?: string
  email?: string
  phone?: string
  contact_type?: string
}

// Discriminated union for search result types
export type SearchResultType = 'activity' | 'organisation' | 'sector' | 'tag' | 'user' | 'contact'

// Activity search result
export interface ActivitySearchResult {
  type: 'activity'
  id: string
  title: string
  subtitle?: string
  metadata: ActivitySearchMetadata
}

// Organisation search result
export interface OrganisationSearchResult {
  type: 'organisation'
  id: string
  title: string
  subtitle?: string
  metadata: OrganisationSearchMetadata
}

// Sector search result
export interface SectorSearchResult {
  type: 'sector'
  id: string
  title: string
  subtitle?: string
  metadata: SectorSearchMetadata
}

// Tag search result
export interface TagSearchResult {
  type: 'tag'
  id: string
  title: string
  subtitle?: string
  metadata: TagSearchMetadata
}

// User search result
export interface UserSearchResult {
  type: 'user'
  id: string
  title: string
  subtitle?: string
  metadata: UserSearchMetadata
}

// Contact search result
export interface ContactSearchResult {
  type: 'contact'
  id: string
  title: string
  subtitle?: string
  metadata: ContactSearchMetadata
}

// Union type for all search results
export type SearchResult =
  | ActivitySearchResult
  | OrganisationSearchResult
  | SectorSearchResult
  | TagSearchResult
  | UserSearchResult
  | ContactSearchResult

// Search suggestion type (same structure as search results for consistency)
export type SearchSuggestion = SearchResult

// Search response type
export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Suggestions response type
export interface SuggestionsResponse {
  suggestions: SearchSuggestion[]
  popularSearches: string[]
}

// Helper type guard functions
export function isActivityResult(result: SearchResult): result is ActivitySearchResult {
  return result.type === 'activity'
}

export function isOrganisationResult(result: SearchResult): result is OrganisationSearchResult {
  return result.type === 'organisation'
}

export function isSectorResult(result: SearchResult): result is SectorSearchResult {
  return result.type === 'sector'
}

export function isTagResult(result: SearchResult): result is TagSearchResult {
  return result.type === 'tag'
}

export function isUserResult(result: SearchResult): result is UserSearchResult {
  return result.type === 'user'
}

export function isContactResult(result: SearchResult): result is ContactSearchResult {
  return result.type === 'contact'
}

// Sector hierarchy level display names
export const SECTOR_HIERARCHY_LABELS: Record<SectorSearchMetadata['hierarchy_level'], string> = {
  'category': 'Sector category',
  'sector': 'Sector',
  'sub-sector': 'Sub-sector'
}

// Result type ordering priority for search results (activities first)
export const SEARCH_RESULT_ORDER: SearchResultType[] = [
  'activity',
  'organisation',
  'sector',
  'tag',
  'user',
  'contact'
]

// Result type display labels
export const RESULT_TYPE_LABELS: Record<SearchResultType, string> = {
  activity: 'Activities',
  organisation: 'Organisations',
  sector: 'Sectors',
  tag: 'Tags',
  user: 'Users',
  contact: 'Contacts'
}
