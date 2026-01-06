"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { debounce } from 'lodash'
import { Search, X, Loader2, Building2, Target, UserCircle } from 'lucide-react'
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
import { AnimatePresence, motion } from 'framer-motion'

interface SearchResult {
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
    // Contact specific metadata
    activity_id?: string
    activity_title?: string
    position?: string
    organisation?: string
    email?: string
    phone?: string
    contact_type?: string
  }
}

interface SearchSuggestion {
  id: string
  type: 'activity' | 'organization' | 'sector' | 'tag' | 'user' | 'contact'
  title: string
  subtitle?: string
  metadata?: {
    count?: number
    category?: string
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Handle expand
  const handleExpand = useCallback(() => {
    setIsExpanded(true)
    // Focus input after animation
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  // Handle collapse
  const handleCollapse = useCallback(() => {
    setIsExpanded(false)
    setOpen(false)
    setQuery('')
    setResults([])
    setError(null)
    setLoading(false)
    setIsSearching(false)
    setHasSearched(false)
    setSuggestions([])
    setShowSuggestions(false)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isExpanded &&
        !query
      ) {
        handleCollapse()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded, query, handleCollapse])

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([])
      setPopularSearches([])
      setShowSuggestions(false)
      setIsLoadingSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)
    setShowSuggestions(true)

    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=8`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setPopularSearches(data.popularSearches || [])
    } catch (err) {
      console.error('Suggestions error:', err)
      setSuggestions([])
      setPopularSearches([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [])

  // Debounced suggestions function
  const debouncedFetchSuggestions = useCallback(
    debounce((query: string) => fetchSuggestions(query), 300),
    [fetchSuggestions]
  )

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setError(null)
      setLoading(false)
      setIsSearching(false)
      setHasSearched(false)
      return
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      setIsSearching(true)
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
      setHasSearched(true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      console.error('Search error:', err)
      setError('Failed to perform search')
      setResults([])
      setHasSearched(true)
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    setOpen(true) // Always open when typing

    // Clear previous timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Fetch suggestions for queries with 2+ characters
    if (value.trim().length >= 2) {
      debouncedFetchSuggestions(value)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
      setPopularSearches([])
    }

    // Search immediately with 1 character
    if (value.trim().length >= 1) {
      // Set loading state immediately when user starts typing
      setLoading(true)
      setError(null)
      setResults([]) // Clear previous results immediately
      setHasSearched(false) // Reset search state when starting new search

      // Set new timeout for debounced search with very fast delay
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value)
      }, 150) // Reduced to 150ms for snappier feel
    } else {
      // Clear results if no input
      setResults([])
      setError(null)
      setLoading(false)
      setIsSearching(false)
      setHasSearched(false)
      setShowSuggestions(false)
    }
  }, [performSearch, debouncedFetchSuggestions])

  // Navigate to result
  const handleResultClick = useCallback((result: SearchResult) => {
    setOpen(false)
    setQuery('')
    setResults([])
    setIsExpanded(false)

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
        // Navigate to dedicated sector detail page
        router.push(`/sectors/${encodeURIComponent(result.metadata?.sector_code || result.id)}`)
        break
      case 'tag':
        router.push(`/activities?tag=${encodeURIComponent(result.title)}`)
        break
      case 'contact':
        // Navigate to the activity that contains this contact
        if (result.metadata?.activity_id) {
          router.push(`/activities/${result.metadata.activity_id}#contacts`)
        }
        break
    }
  }, [router])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    setOpen(false)
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setIsExpanded(false)

    // Navigate based on suggestion type
    switch (suggestion.type) {
      case 'activity':
        router.push(`/activities/${suggestion.id}`)
        break
      case 'organization':
        router.push(`/organizations/${suggestion.id}`)
        break
      case 'sector':
        router.push(`/sectors/${suggestion.id}`)
        break
      case 'tag':
        router.push(`/tags/${suggestion.id}`)
        break
      default:
        // For other types, set the query and let normal search handle it
        setQuery(suggestion.title)
        setOpen(true)
        setIsExpanded(true)
    }
  }, [router])

  // Handle popular search click
  const handlePopularSearchClick = useCallback((searchTerm: string) => {
    setQuery(searchTerm)
    setOpen(true)
    setShowSuggestions(false)
    performSearch(searchTerm)
  }, [performSearch])

  // Navigate to full search results page
  const handleSearchSubmit = useCallback(() => {
    if (query.trim()) {
      setOpen(false)
      setIsExpanded(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }, [query, router])

  // Handle Enter key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchSubmit()
    }
    if (e.key === 'Escape') {
      handleCollapse()
    }
  }, [handleSearchSubmit, handleCollapse])

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setLoading(false)
    setIsSearching(false)
    setHasSearched(false)
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
      case 'contact':
        return <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
          <UserCircle className="h-4 w-4 text-indigo-600" />
        </div>
      default:
        return <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-gray-600 font-semibold text-sm">?</span>
        </div>
    }
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="search-icon"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleExpand}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
            aria-label="Open search"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        ) : (
          <motion.div
            key="search-input"
            initial={{ width: 40, opacity: 0 }}
            animate={{ width: 500, opacity: 1 }}
            exit={{ width: 40, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="relative"
          >
            <motion.div
              initial={{ backdropFilter: "blur(0px)" }}
              animate={{ backdropFilter: "blur(12px)" }}
              className="relative"
            >
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <div className="relative flex items-center overflow-hidden rounded-full border border-border bg-card/80 backdrop-blur-md focus-within:ring-0 focus-within:border-border">
                    <div className="ml-4">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setOpen(true)}
                      placeholder={placeholder}
                      className="h-10 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-0 focus:outline-none border-none"
                    />
                    {(loading || isSearching) && (
                      <Loader2 className="mr-2 h-4 w-4 text-muted-foreground animate-spin" />
                    )}
                    {!loading && !isSearching && query && (
                      <motion.button
                        type="button"
                        onClick={handleClear}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="mr-1 flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </motion.button>
                    )}
                    <motion.button
                      type="button"
                      onClick={handleCollapse}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="mr-2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                      aria-label="Close search"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[500px] p-0 max-h-96 shadow-none"
                  align="start"
                >
                  <Command>
                    <CommandList className="max-h-80 overflow-y-auto">
                      {(loading || isSearching) && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Searching...
                        </div>
                      )}

                      {!loading && !isSearching && error && (
                        <div className="p-4 text-center text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      {!loading && !isSearching && !error && query && results.length === 0 && hasSearched && query.trim().length > 0 && (
                        <CommandEmpty>No results found for "{query}"</CommandEmpty>
                      )}

                      {/* Show suggestions when typing */}
                      {!loading && !isSearching && !error && query && query.trim().length >= 2 && showSuggestions && (
                        <>
                          {/* Show suggestions if available */}
                          {suggestions.length > 0 && (
                            <CommandGroup>
                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 border-b border-gray-100">
                                Suggestions
                              </div>
                              {suggestions.map((suggestion) => (
                                <CommandItem
                                  key={`suggestion-${suggestion.type}-${suggestion.id}`}
                                  onSelect={() => handleSuggestionClick(suggestion)}
                                  className="cursor-pointer py-3 px-2 hover:bg-gray-50"
                                >
                                  <div className="flex items-start gap-3 w-full">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {getResultIcon(suggestion as any)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className="font-medium text-sm truncate text-gray-900"
                                        dangerouslySetInnerHTML={{ __html: suggestion.title }}
                                      />
                                      {suggestion.subtitle && (
                                        <div
                                          className="text-xs text-gray-500 mt-1 truncate"
                                          dangerouslySetInnerHTML={{ __html: suggestion.subtitle }}
                                        />
                                      )}
                                      {suggestion.metadata?.category && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          {suggestion.metadata.category}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}

                          {/* Show popular searches if available */}
                          {popularSearches.length > 0 && suggestions.length === 0 && (
                            <CommandGroup>
                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 border-b border-gray-100">
                                Popular Searches
                              </div>
                              {popularSearches.map((search, idx) => (
                                <CommandItem
                                  key={`popular-${idx}`}
                                  onSelect={() => handlePopularSearchClick(search)}
                                  className="cursor-pointer py-3 px-2 hover:bg-gray-50"
                                >
                                  <div className="flex items-start gap-3 w-full">
                                    <div className="flex-shrink-0 mt-0.5">
                                      <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate text-gray-900">
                                        {search}
                                      </div>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </>
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
                                          <span dangerouslySetInnerHTML={{ __html: result.title }} />
                                          {result.type === 'organization' && result.metadata?.acronym && (
                                            <span className="ml-2">({result.metadata.acronym})</span>
                                          )}
                                          {result.type === 'activity' && result.metadata?.acronym && (
                                            <span className="ml-2">({result.metadata.acronym})</span>
                                          )}
                                        </div>
                                        {result.type === 'organization' && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {result.subtitle && (
                                              <div
                                                className="truncate"
                                                dangerouslySetInnerHTML={{ __html: result.subtitle }}
                                              />
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
                                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                                {result.metadata?.partner_id && (
                                                  <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate">
                                                    {result.metadata.partner_id}
                                                  </span>
                                                )}
                                                {result.metadata?.iati_id && (
                                                  <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate">
                                                    {result.metadata.iati_id}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {result.type === 'user' && result.subtitle && (
                                          <div
                                            className="text-xs text-gray-500 mt-1 truncate"
                                            dangerouslySetInnerHTML={{ __html: result.subtitle }}
                                          />
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
