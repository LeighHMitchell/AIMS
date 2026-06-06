'use client'

import React from 'react'
import { Building2, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodePill } from './CodePill'
import type { SearchResult } from '@/types/search'

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
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = size === 'xs' ? 'w-5 h-5' : size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
  const iconSize = size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
  const textSize = size === 'xs' ? 'text-[10px]' : size === 'lg' ? 'text-lg' : 'text-body'

  // Sectors and Tags: NO icons per specification
  if (result.type === 'sector' || result.type === 'tag') {
    return null
  }

  // Activity with custom icon
  if (result.type === 'activity' && result.metadata.activity_icon_url) {
    return (
      <div className={cn(sizeClasses, 'rounded-full overflow-hidden border border-border flex-shrink-0')}>
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
      <div className={cn(sizeClasses, 'rounded-full overflow-hidden border border-border flex-shrink-0')}>
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
      <div className={cn(sizeClasses, 'rounded-lg overflow-hidden border border-border bg-white flex-shrink-0')}>
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
          <Building2 className={cn(iconSize, 'text-[hsl(var(--success-icon))]')} />
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
 * Build the detail line for a contact result: job title / role, department,
 * and organisation, joined with bullets (only the parts that exist).
 */
function getContactDetail(result: SearchResult): string | undefined {
  if (result.type !== 'contact') return undefined
  const m = result.metadata
  const seen = new Set<string>()
  const parts = [
    m.job_title || m.position || m.role,
    m.department,
    m.organisation,
  ].filter((p): p is string => {
    if (!p || !p.trim()) return false
    const key = p.trim().toLowerCase()
    if (seen.has(key)) return false // drop duplicates (e.g. org repeated in department)
    seen.add(key)
    return true
  })
  return parts.length > 0 ? parts.join(' • ') : result.subtitle || undefined
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
  const code = getResultCode(result)
  const contactDetail = getContactDetail(result)

  // Compact variant - used in typeahead dropdowns
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-start gap-2 w-full',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        {/* Small avatar for compact */}
        {hasAvatar && (
          <div className="flex-shrink-0 mt-0.5">
            <ResultAvatar result={result} size="sm" />
          </div>
        )}

        {/* Tag hash for tags */}
        {isTag && (
          <span className="text-purple-600 font-semibold text-body">#</span>
        )}

        {/* Code pill + Title + acronym — all inline on one line, wrapping as needed */}
        <div className="flex-1 min-w-0 font-medium text-body text-foreground break-words">
          {code && <CodePill code={code} className="mr-1.5 align-middle" />}
          {highlightText(result.title, searchQuery)}
          {(result.type === 'activity' || result.type === 'organisation') && result.metadata.acronym && (
            <> ({result.metadata.acronym})</>
          )}
        </div>
      </div>
    )
  }

  // Full variant - single-line result for the search results page
  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full group',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Larger avatar/logo for the results page */}
      {hasAvatar && (
        <div className="flex-shrink-0">
          <ResultAvatar result={result} size="lg" />
        </div>
      )}

      {/* Tag hash prefix */}
      {isTag && (
        <span className="text-purple-600 font-semibold">#</span>
      )}

      {/* Code pill + title + acronym — all on one line, wrapping if needed.
          Contacts append their role / department / org inline on the same line. */}
      <div className="flex-1 min-w-0 text-base font-medium text-foreground break-words">
        {code && <CodePill code={code} className="mr-1.5 align-middle" />}
        <span className="group-hover:underline">
          {highlightText(result.title, searchQuery)}
          {(result.type === 'activity' || result.type === 'organisation') && result.metadata.acronym && (
            <> ({result.metadata.acronym})</>
          )}
        </span>
        {result.type === 'contact' && contactDetail && (
          <> • {highlightText(contactDetail, searchQuery)}</>
        )}
      </div>
    </div>
  )
}

export default SearchResultRow
