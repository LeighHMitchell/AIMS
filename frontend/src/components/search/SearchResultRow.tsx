'use client'

import React from 'react'
import { Building2, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodePill } from './CodePill'
import type {
  SearchResult,
  ActivitySearchResult,
  OrganisationSearchResult,
  SectorSearchResult,
  TagSearchResult,
  UserSearchResult,
  ContactSearchResult,
  SECTOR_HIERARCHY_LABELS
} from '@/types/search'

// Sector hierarchy labels
const sectorHierarchyLabels = {
  'category': 'Sector category',
  'sector': 'Sector',
  'sub-sector': 'Sub-sector'
} as const

interface SearchResultRowProps {
  /** The search result to render */
  result: SearchResult
  /** Optional search query for highlighting */
  searchQuery?: string
  /** Optional click handler */
  onClick?: () => void
  /** Display variant - compact for typeahead, full for search page */
  variant?: 'compact' | 'full'
  /** Optional additional className */
  className?: string
}

/**
 * Highlights matched text in a string, avoiding codes and IDs
 * Only highlights human-readable names
 */
function highlightText(text: string, query?: string): React.ReactNode {
  if (!query || !text) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const startIndex = lowerText.indexOf(lowerQuery)

  if (startIndex === -1) return text

  return (
    <>
      {text.slice(0, startIndex)}
      <mark className="bg-yellow-100 text-inherit rounded-sm px-0.5">
        {text.slice(startIndex, startIndex + query.length)}
      </mark>
      {text.slice(startIndex + query.length)}
    </>
  )
}

/**
 * Formats organisation name with acronym: "Full Name (ACRONYM)"
 */
function formatOrganisationName(name: string, acronym?: string): string {
  if (!acronym) return name
  return `${name} (${acronym})`
}

/**
 * Renders avatar/icon for the result type
 * Note: Sectors and Tags do NOT render any icons per specification
 */
function ResultAvatar({
  result,
  size = 'md'
}: {
  result: SearchResult
  size?: 'sm' | 'md'
}) {
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  // Sectors and Tags: NO icons per specification
  if (result.type === 'sector' || result.type === 'tag') {
    return null
  }

  // Activity with custom icon
  if (result.type === 'activity' && result.metadata.activity_icon_url) {
    return (
      <div className={cn(sizeClasses, 'rounded-full overflow-hidden border border-gray-200 flex-shrink-0')}>
        <img
          src={result.metadata.activity_icon_url}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      </div>
    )
  }

  // User with profile picture
  if (result.type === 'user' && result.metadata.profile_picture_url) {
    return (
      <div className={cn(sizeClasses, 'rounded-full overflow-hidden border border-gray-200 flex-shrink-0')}>
        <img
          src={result.metadata.profile_picture_url}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      </div>
    )
  }

  // Organisation with logo
  if (result.type === 'organisation' && result.metadata.logo_url) {
    return (
      <div className={cn(sizeClasses, 'rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0')}>
        <img
          src={result.metadata.logo_url}
          alt=""
          className="w-full h-full object-contain p-0.5"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      </div>
    )
  }

  // Default fallback icons
  switch (result.type) {
    case 'activity':
      return (
        <div className={cn(sizeClasses, 'bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0')}>
          <span className="text-blue-600 font-semibold text-sm">A</span>
        </div>
      )
    case 'organisation':
      return (
        <div className={cn(sizeClasses, 'bg-green-100 rounded-full flex items-center justify-center flex-shrink-0')}>
          <Building2 className={cn(iconSize, 'text-green-600')} />
        </div>
      )
    case 'user':
      return (
        <div className={cn(sizeClasses, 'bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0')}>
          <span className="text-orange-600 font-semibold text-sm">U</span>
        </div>
      )
    case 'contact':
      return (
        <div className={cn(sizeClasses, 'bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0')}>
          <UserCircle className={cn(iconSize, 'text-indigo-600')} />
        </div>
      )
    default:
      return null
  }
}

/**
 * Activity Result Row
 * Format: [ACTIVITY ID] Activity Title (ACRONYM)
 * Secondary: Sector • Location (optional)
 */
function ActivityRow({
  result,
  searchQuery,
  variant
}: {
  result: ActivitySearchResult
  searchQuery?: string
  variant: 'compact' | 'full'
}) {
  const { metadata } = result
  // Primary identifier is iati_identifier or partner_id
  const primaryId = metadata.iati_identifier || metadata.partner_id

  return (
    <div className="flex-1 min-w-0">
      {/* Primary line: [ID] Title (Acronym) */}
      <div className="flex items-center gap-2 flex-wrap">
        {primaryId && <CodePill code={primaryId} />}
        <span className="font-medium text-sm text-gray-900 truncate">
          {highlightText(result.title, searchQuery)}
          {metadata.acronym && (
            <span className="text-gray-600"> ({metadata.acronym})</span>
          )}
        </span>
      </div>

      {/* Secondary line: Reporting org info */}
      {variant === 'full' && metadata.reporting_org && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {metadata.reporting_org}
          {metadata.reporting_org_acronym && ` (${metadata.reporting_org_acronym})`}
        </div>
      )}
    </div>
  )
}

/**
 * Organisation Result Row
 * Format: [CODE] Organisation Name (ACRONYM)
 * Secondary: Organisation type • Geography
 */
function OrganisationRow({
  result,
  searchQuery,
  variant
}: {
  result: OrganisationSearchResult
  searchQuery?: string
  variant: 'compact' | 'full'
}) {
  const { metadata } = result
  const formattedName = formatOrganisationName(result.title, metadata.acronym)

  // Build secondary line: org type • geography
  const secondaryParts: string[] = []
  if (metadata.organisation_type) {
    secondaryParts.push(metadata.organisation_type)
  }
  if (metadata.geography) {
    secondaryParts.push(metadata.geography)
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Primary line: [CODE] Name (Acronym) */}
      <div className="flex items-center gap-2 flex-wrap">
        {metadata.code && <CodePill code={metadata.code} />}
        <span className="font-medium text-sm text-gray-900 truncate">
          {highlightText(formattedName, searchQuery)}
        </span>
      </div>

      {/* Secondary line: Org type • Geography */}
      {secondaryParts.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {secondaryParts.join(' • ')}
        </div>
      )}
    </div>
  )
}

/**
 * Sector Result Row
 * Format: [CODE] Name
 * Secondary: Sector category | Sector | Sub-sector
 * NO icons, logos, or avatars
 */
function SectorRow({
  result,
  searchQuery,
  variant
}: {
  result: SectorSearchResult
  searchQuery?: string
  variant: 'compact' | 'full'
}) {
  const { metadata } = result
  const hierarchyLabel = sectorHierarchyLabels[metadata.hierarchy_level] || 'Sector'

  return (
    <div className="flex-1 min-w-0">
      {/* Primary line: [CODE] Name */}
      <div className="flex items-center gap-2 flex-wrap">
        <CodePill code={metadata.code} />
        <span className="font-medium text-sm text-gray-900 truncate">
          {highlightText(result.title, searchQuery)}
        </span>
      </div>

      {/* Secondary line: Hierarchy level */}
      <div className="text-xs text-muted-foreground mt-1">
        {hierarchyLabel}
      </div>
    </div>
  )
}

/**
 * Tag Result Row
 * Format: # Tag Name
 * Secondary: Tag • X activities
 * NO icons
 */
function TagRow({
  result,
  searchQuery,
  variant
}: {
  result: TagSearchResult
  searchQuery?: string
  variant: 'compact' | 'full'
}) {
  const { metadata } = result
  const activityCount = metadata.activity_count ?? 0

  return (
    <div className="flex-1 min-w-0">
      {/* Primary line: # Tag Name */}
      <div className="flex items-center gap-1">
        <span className="text-purple-600 font-semibold text-sm">#</span>
        <span className="font-medium text-sm text-gray-900 truncate">
          {highlightText(result.title, searchQuery)}
        </span>
      </div>

      {/* Secondary line: Tag • X activities */}
      <div className="text-xs text-muted-foreground mt-1">
        Tag • {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
      </div>
    </div>
  )
}

/**
 * User Result Row
 * Format: User Name
 * Secondary: Position • Organisation
 */
function UserRow({
  result,
  searchQuery,
  variant
}: {
  result: UserSearchResult
  searchQuery?: string
  variant: 'compact' | 'full'
}) {
  const { metadata } = result

  // Build secondary line
  const secondaryParts: string[] = []
  if (metadata.position) {
    secondaryParts.push(metadata.position)
  }
  if (metadata.organisation) {
    secondaryParts.push(metadata.organisation)
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Primary line: Name */}
      <div className="font-medium text-sm text-gray-900 truncate">
        {highlightText(result.title, searchQuery)}
      </div>

      {/* Secondary line: Position • Organisation */}
      {secondaryParts.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {secondaryParts.join(' • ')}
        </div>
      )}
    </div>
  )
}

/**
 * Contact Result Row
 * Format: Contact Name
 * Secondary: Position • Organisation • Email
 */
function ContactRow({
  result,
  searchQuery,
  variant
}: {
  result: ContactSearchResult
  searchQuery?: string
  variant: 'compact' | 'full'
}) {
  const { metadata } = result

  // Build secondary line
  const secondaryParts: string[] = []
  if (metadata.position) {
    secondaryParts.push(metadata.position)
  }
  if (metadata.organisation) {
    secondaryParts.push(metadata.organisation)
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Primary line: Name */}
      <div className="font-medium text-sm text-gray-900 truncate">
        {highlightText(result.title, searchQuery)}
      </div>

      {/* Secondary line: Position • Organisation */}
      {secondaryParts.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {secondaryParts.join(' • ')}
        </div>
      )}

      {/* Tertiary line: Activity context (for contacts) */}
      {variant === 'full' && metadata.activity_title && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          Activity: {metadata.activity_title}
        </div>
      )}
    </div>
  )
}

/**
 * SearchResultRow Component
 *
 * A unified component for rendering search results across all entity types.
 * Follows the design specification:
 * - Codes first, names second, context last
 * - Never display "DAC"
 * - IDs/codes in monospaced grey pills
 * - Sectors and Tags have no icons
 */
export function SearchResultRow({
  result,
  searchQuery,
  onClick,
  variant = 'compact',
  className
}: SearchResultRowProps) {
  const avatar = <ResultAvatar result={result} size={variant === 'compact' ? 'sm' : 'md'} />
  const hasAvatar = result.type !== 'sector' && result.type !== 'tag'

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Avatar - only for non-sector, non-tag types */}
      {hasAvatar && (
        <div className="flex-shrink-0 mt-0.5">
          {avatar}
        </div>
      )}

      {/* Content - render based on type */}
      {result.type === 'activity' && (
        <ActivityRow result={result} searchQuery={searchQuery} variant={variant} />
      )}
      {result.type === 'organisation' && (
        <OrganisationRow result={result} searchQuery={searchQuery} variant={variant} />
      )}
      {result.type === 'sector' && (
        <SectorRow result={result} searchQuery={searchQuery} variant={variant} />
      )}
      {result.type === 'tag' && (
        <TagRow result={result} searchQuery={searchQuery} variant={variant} />
      )}
      {result.type === 'user' && (
        <UserRow result={result} searchQuery={searchQuery} variant={variant} />
      )}
      {result.type === 'contact' && (
        <ContactRow result={result} searchQuery={searchQuery} variant={variant} />
      )}
    </div>
  )
}

export default SearchResultRow
