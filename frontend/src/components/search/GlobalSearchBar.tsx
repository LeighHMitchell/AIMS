"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, X, Loader2, Building2, Target } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'activity' | 'organization' | 'user' | 'sector' | 'tag'
  title: string
  subtitle?: string
  metadata?: {
    status?: string
    reporting_org?: string
    reporting_org_acronym?: string
    manager?: string
    tags?: string[]
    partner_id?: string
    iati_id?: string
    updated_at?: string
    sector_code?: string
    sector_category?: string
    profile_picture_url?: string
    logo_url?: string
    banner_url?: string
    activity_icon_url?: string
    code?: string
    activity_count?: number
  }
}

interface GlobalSearchBarProps {
  className?: string
  placeholder?: string
}

export function GlobalSearchBar({ 
  className,
  placeholder = "Search projects, donors, tags…" 
}: GlobalSearchBarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Don't set loading here since it's already set in handleInputChange
      setError(null)

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      console.error('Search error:', err)
      setError('Failed to perform search')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    setOpen(true) // Always open when typing
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Search immediately with 1 character
    if (value.trim().length >= 1) {
      // Set loading state immediately when user starts typing
      setLoading(true)
      setError(null)
      setResults([]) // Clear previous results immediately
      
      // Set new timeout for debounced search with very fast delay
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value)
      }, 300) // 300ms debounce delay for better UX
    } else {
      // Clear results if no input
      setResults([])
      setError(null)
      setLoading(false)
    }
  }, [performSearch])

  // Navigate to result
  const handleResultClick = useCallback((result: SearchResult) => {
    setOpen(false)
    setQuery('')
    setResults([])

    switch (result.type) {
      case 'activity':
        router.push(`/activities/${result.id}`)
        break
      case 'organization':
        router.push(`/organizations/${result.id}`)
        break
      case 'user':
        router.push(`/users/${result.id}`)
        break
      case 'sector':
        router.push(`/activities?sector=${encodeURIComponent(result.metadata?.sector_code || result.title)}`)
        break
      case 'tag':
        router.push(`/activities?tag=${encodeURIComponent(result.title)}`)
        break
    }
  }, [router])

  // Navigate to full search results page
  const handleSearchSubmit = useCallback(() => {
    if (query.trim()) {
      setOpen(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }, [query, router])

  // Handle Enter key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchSubmit()
    }
  }, [handleSearchSubmit])

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Format result subtitle based on type
  const getResultSubtitle = (result: SearchResult) => {
    switch (result.type) {
      case 'activity':
        const parts = []
        if (result.metadata?.partner_id) parts.push(result.metadata.partner_id)
        if (result.metadata?.reporting_org) parts.push(result.metadata.reporting_org)
        return parts.join(' • ')
      case 'organization':
        return result.subtitle || 'Organization'
      case 'tag':
        return `Tag • ${result.metadata?.activity_count || 0} activities`
      case 'user':
        return result.subtitle || 'User'
      default:
        return ''
    }
  }

  // Get icon component for result type
  const getResultIcon = (result: SearchResult) => {
    const { type, metadata } = result
    
    // Handle activity icons
    if (type === 'activity' && metadata?.activity_icon_url) {
      return (
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
          <img 
            src={metadata.activity_icon_url} 
            alt="Activity icon" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to default icon if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = `
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-blue-600 font-semibold text-sm">A</span>
                </div>
              `
            }}
          />
        </div>
      )
    }
    
    // Handle profile pictures for users
    if (type === 'user' && metadata?.profile_picture_url) {
      return (
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
          <img 
            src={metadata.profile_picture_url} 
            alt="Profile" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to default icon if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = `
                <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span class="text-orange-600 font-semibold text-sm">U</span>
                </div>
              `
            }}
          />
        </div>
      )
    }
    
    // Handle logos for organizations
    if (type === 'organization' && metadata?.logo_url) {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 bg-white">
          <img 
            src={metadata.logo_url} 
            alt="Organization logo" 
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              // Fallback to default icon if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = `
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span class="text-green-600 font-semibold text-sm">O</span>
                </div>
              `
            }}
          />
        </div>
      )
    }
    
    // Default icons for each type
    switch (type) {
      case 'activity':
        return <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-sm">A</span>
        </div>
      case 'organization':
        return <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <Building2 className="h-4 w-4 text-green-600" />
        </div>
      case 'user':
        return <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <span className="text-orange-600 font-semibold text-sm">U</span>
        </div>
      case 'sector':
        return <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
          <span className="text-teal-600 font-semibold text-sm">S</span>
        </div>
      case 'tag':
        return <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-purple-600 font-semibold text-sm">#</span>
        </div>
      default:
        return <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-gray-600 font-semibold text-sm">?</span>
        </div>
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="w-full">
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            className="pl-10 pr-9 rounded-xl w-full"
          />
        </PopoverTrigger>
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!loading && query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
          <PopoverContent 
            className="w-[500px] p-0 max-h-96" 
            align="start"
        >
        <Command>
          <CommandList className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            
            {!loading && error && (
              <div className="p-4 text-center text-sm text-destructive">
                {error}
              </div>
            )}
            
            {!loading && !error && query && results.length === 0 && query.trim().length > 0 && (
              <CommandEmpty>No results found for "{query}"</CommandEmpty>
            )}
            
            {!loading && !error && results.length > 0 && (
              <>
                {/* Group results by type */}
                {[
                  { type: 'activity', label: 'Activities', color: 'blue' },
                  { type: 'organization', label: 'Organizations', color: 'green' },
                  { type: 'user', label: 'Users', color: 'orange' },
                  { type: 'sector', label: 'Sectors', color: 'teal' },
                  { type: 'tag', label: 'Tags', color: 'purple' }
                ].map(({ type, label, color }) => {
                  const typeResults = results.filter(r => r.type === type)
                  if (typeResults.length === 0) return null
                  
                  return (
                    <CommandGroup key={type}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 border-b border-gray-100">
                        {label}
                      </div>
                      {typeResults.map((result) => (
                        <CommandItem
                          key={`${result.type}-${result.id}`}
                          onSelect={() => handleResultClick(result)}
                          className="cursor-pointer py-3 px-2 hover:bg-gray-50"
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex-shrink-0 mt-0.5">
                              {getResultIcon(result)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate text-gray-900">
                                {result.title}
                              </div>
                              {result.type === 'organization' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {result.subtitle && (
                                    <div className="truncate">
                                      {result.subtitle}
                                    </div>
                                  )}
                                </div>
                              )}
                              {result.type === 'activity' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {result.metadata?.reporting_org && (
                                    <div className="truncate mb-1">
                                      {result.metadata.reporting_org}
                                      {result.metadata.reporting_org_acronym && 
                                        ` (${result.metadata.reporting_org_acronym})`
                                      }
                                    </div>
                                  )}
                                  {(result.metadata?.partner_id || result.metadata?.iati_id) && (
                                    <div className="truncate">
                                      {[result.metadata?.partner_id, result.metadata?.iati_id]
                                        .filter(Boolean)
                                        .join(' • ')
                                      }
                                    </div>
                                  )}
                                </div>
                              )}
                              {result.type === 'user' && result.subtitle && (
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                  {result.subtitle}
                                </div>
                              )}
                              {result.type === 'sector' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Sector
                                </div>
                              )}
                              {result.type === 'tag' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {result.metadata?.activity_count || 0} activities
                                </div>
                              )}
                              {result.metadata?.tags && result.metadata.tags.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {result.metadata.tags.slice(0, 2).map((tag, idx) => (
                                    <Badge 
                                      key={idx} 
                                      variant="secondary" 
                                      className="text-xs py-0 h-4"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {result.metadata.tags.length > 2 && (
                                    <span className="text-xs text-gray-400">
                                      +{result.metadata.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )
                })}
              </>
            )}
            
            {!loading && query.length > 0 && query.length < 1 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Start typing to search
              </div>
            )}
          </CommandList>
          {/* Add "View All Results" option at bottom if there are results */}
          {!loading && !error && query.trim() && results.length > 0 && (
            <div className="border-t border-gray-100 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchSubmit}
                className="w-full justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Search className="h-4 w-4 mr-2" />
                View all results for "{query}"
              </Button>
            </div>
          )}
        </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}