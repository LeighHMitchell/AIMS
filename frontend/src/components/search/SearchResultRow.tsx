'use client'

import React from 'react'
import { Building2, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodePill } from './CodePill'
import { format } from 'date-fns'
import type {
  SearchResult,
  ActivitySearchResult,
  OrganisationSearchResult,
  SectorSearchResult,
  TagSearchResult,
  UserSearchResult,
  ContactSearchResult,
  SearchResultType,
  SECTOR_HIERARCHY_LABELS
} from '@/types/search'

// Sector hierarchy labels
const sectorHierarchyLabels = {
  'category': 'Sector category',
  'sector': 'Sector',
  'sub-sector': 'Sub-sector'
} as const

// Result type display labels
const resultTypeLabels: Record<SearchResultType, string> = {
  activity: 'Activity',
  organisation: 'Organisation',
  sector: 'Sector',
  tag: 'Tag',
  user: 'User',
  contact: 'Contact'
}

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
  /** Whether to show the type indicator below (for full variant) */
  showTypeIndicator?: boolean
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
 * Renders avatar/icon for the result type
 * Note: Sectors and Tags do NOT render any icons per specification
 */
function ResultAvatar({
  result,
  size = 'md'
}: {
  result: SearchResult
  size?: 'xs' | 'sm' | 'md'
}) {
  const sizeClasses = size === 'xs' ? 'w-5 h-5' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconSize = size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-sm'

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
          <span className={cn('text-blue-600 font-semibold', textSize)}>A</span>
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
          <span className={cn('text-orange-600 font-semibold', textSize)}>U</span>
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
 * Get updated_at from result metadata
 */
function getUpdatedAt(result: SearchResult): string | undefined {
  return result.metadata?.updated_at
}

/**
 * Get the subtitle/description for a result
 * Falls back to constructed descriptions for some types
 */
function getResultSubtitle(result: SearchResult): string | undefined {
  // Use explicit subtitle if available
  if (result.subtitle) return result.subtitle
  
  // Construct fallback descriptions based on type
  switch (result.type) {
    case 'activity':
      if (result.metadata.reporting_org) {
        return result.metadata.reporting_org_acronym 
          ? `${result.metadata.reporting_org} (${result.metadata.reporting_org_acronym})`
          : result.metadata.reporting_org
      }
      break
    case 'organisation':
      const orgParts: string[] = []
      if (result.metadata.organisation_type) orgParts.push(result.metadata.organisation_type)
      if (result.metadata.geography) orgParts.push(result.metadata.geography)
      if (orgParts.length > 0) return orgParts.join(' • ')
      break
    case 'sector':
      return sectorHierarchyLabels[result.metadata.hierarchy_level] || 'Sector'
    case 'tag':
      const count = result.metadata.activity_count ?? 0
      return `${count} ${count === 1 ? 'activity' : 'activities'}`
    case 'user':
      const userParts: string[] = []
      if (result.metadata.position) userParts.push(result.metadata.position)
      if (result.metadata.organisation) userParts.push(result.metadata.organisation)
      if (userParts.length > 0) return userParts.join(' • ')
      break
    case 'contact':
      const contactParts: string[] = []
      if (result.metadata.position) contactParts.push(result.metadata.position)
      if (result.metadata.organisation) contactParts.push(result.metadata.organisation)
      if (contactParts.length > 0) return contactParts.join(' • ')
      break
  }
  return undefined
}

/**
 * Get the code/identifier for a result (for the code pill)
 */
function getResultCode(result: SearchResult): string | undefined {
  switch (result.type) {
    case 'activity':
      return result.metadata.iati_identifier || result.metadata.partner_id
    case 'organisation':
      return result.metadata.code
    case 'sector':
      return result.metadata.code
    default:
      return undefined
  }
}

/**
 * SearchResultRow Component
 *
 * A unified component for rendering search results across all entity types.
 * Google-style design:
 * - Minimal favicon-sized icons
 * - Blue titles with hover underline
 * - Subtitle/description below title
 * - Subtle type indicator at bottom
 */
export function SearchResultRow({
  result,
  searchQuery,
  onClick,
  variant = 'compact',
  className,
  showTypeIndicator = true
}: SearchResultRowProps) {
  const hasAvatar = result.type !== 'sector' && result.type !== 'tag'
  const isTag = result.type === 'tag'
  const subtitle = getResultSubtitle(result)
  const code = getResultCode(result)
  const updatedAt = getUpdatedAt(result)

  // Compact variant - used in typeahead dropdowns
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 w-full',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        {/* Small avatar for compact */}
        {hasAvatar && (
          <div className="flex-shrink-0">
            <ResultAvatar result={result} size="sm" />
          </div>
        )}
        
        {/* Tag hash for tags */}
        {isTag && (
          <span className="text-purple-600 font-semibold text-sm">#</span>
        )}

        {/* Code pill + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {code && <CodePill code={code} />}
          <span className="font-medium text-sm text-gray-900 truncate">
            {highlightText(result.title, searchQuery)}
            {result.type === 'activity' && result.metadata.acronym && (
              <span className="text-gray-500"> ({result.metadata.acronym})</span>
            )}
          </span>
        </div>
      </div>
    )
  }

  // Full variant - Google-style layout for search results page
  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full group',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Favicon-sized avatar */}
      {hasAvatar && (
        <div className="flex-shrink-0 mt-1">
          <ResultAvatar result={result} size="xs" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row - Google blue, larger, hover underline */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tag hash prefix */}
          {isTag && (
            <span className="text-purple-600 font-semibold">#</span>
          )}
          
          {/* Code pill */}
          {code && <CodePill code={code} />}
          
          {/* Title - Google style */}
          <h3 className="text-base text-blue-800 group-hover:underline font-medium">
            {highlightText(result.title, searchQuery)}
            {result.type === 'activity' && result.metadata.acronym && (
              <span className="text-gray-600 font-normal"> ({result.metadata.acronym})</span>
            )}
            {result.type === 'organisation' && result.metadata.acronym && (
              <span className="text-gray-600 font-normal"> ({result.metadata.acronym})</span>
            )}
          </h3>
        </div>

        {/* Subtitle/description */}
        {subtitle && (
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
            {highlightText(subtitle, searchQuery)}
          </p>
        )}

        {/* Type indicator + Updated date (subtle) */}
        {showTypeIndicator && (
          <div className="text-xs text-gray-400 mt-1.5">
            {resultTypeLabels[result.type]}
            {updatedAt && (
              <span> • Updated {format(new Date(updatedAt), 'MMM d, yyyy')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchResultRow
