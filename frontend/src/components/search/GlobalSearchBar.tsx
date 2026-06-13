"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { debounce } from 'lodash'
import { Search, X, Loader2 } from "@/components/icons/hugeicons"
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchResultRow } from './SearchResultRow'
import type { SearchResult } from '@/types/search'
import { normalizeSearchResults } from '@/lib/search-normalizer'
import { apiFetch } from '@/lib/api-fetch';

interface GlobalSearchBarProps {
  className?: string
  placeholder?: string
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** "nav" = collapsible search in top nav (default), "page" = always expanded for search page */
  variant?: "nav" | "page"
  /** Size of the search bar - "default" for nav, "large" for page */
  size?: "default" | "large"
  /** Callback when search is submitted (Enter pressed). If provided in page mode, prevents navigation. */
  onSearch?: (query: string) => void
  /** Auto focus the input on mount (useful for page mode) */
  autoFocus?: boolean
}

export function GlobalSearchBar({
  className,
  placeholder = "Search projects, development partners, tags...",
  isExpanded: controlledExpanded,
  onExpandedChange,
  variant = "nav",
  size = "default",
  onSearch,
  autoFocus = false
}: GlobalSearchBarProps) {
  // In page mode, always expanded
  const isPageMode = variant === "page"
  const [internalExpanded, setInternalExpanded] = useState(isPageMode)

  // Use controlled or uncontrolled mode (page mode is always expanded)
  const isExpanded = isPageMode ? true : (controlledExpanded !== undefined ? controlledExpanded : internalExpanded)
  const setIsExpanded = (expanded: boolean) => {
    if (isPageMode) return // Cannot collapse in page mode
    if (onExpandedChange) {
      onExpandedChange(expanded)
    } else {
      setInternalExpanded(expanded)
    }
  }
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // In-session cache of suggestion responses (keyed by lowercased query) so
  // repeats and backspacing are instant — no spinner, no network round-trip.
  const suggestionsCacheRef = useRef<Map<string, { suggestions: SearchResult[] }>>(new Map())
  // Tracks the in-flight suggestions request so stale responses can be aborted.
  const suggestionsAbortRef = useRef<AbortController | null>(null)

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
    setError(null)
    setSuggestions([])
    setShowSuggestions(false)
  }, [])

  // Click outside handler (only for nav mode)
  useEffect(() => {
    if (isPageMode) return // Don't collapse in page mode
    
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
  }, [isExpanded, query, handleCollapse, isPageMode])
  
  // Auto-focus input in page mode
  useEffect(() => {
    if (isPageMode && autoFocus) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isPageMode, autoFocus])

  // Apply a cached suggestions response instantly (no spinner, no network).
  // Returns true on a cache hit.
  const applyCachedSuggestions = useCallback((searchQuery: string): boolean => {
    const cached = suggestionsCacheRef.current.get(searchQuery.trim().toLowerCase())
    if (!cached) return false
    setSuggestions(cached.suggestions)
    setShowSuggestions(true)
    setIsLoadingSuggestions(false)
    return true
  }, [])

  // Fetch search suggestions (cache-first, stale-while-revalidate, abortable)
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setIsLoadingSuggestions(false)
      return
    }

    // Instant cache hit — done, no request.
    if (applyCachedSuggestions(q)) return

    // Cache miss: keep any existing suggestions visible while we fetch
    // (stale-while-revalidate) and only show the spinner.
    setShowSuggestions(true)
    setIsLoadingSuggestions(true)

    // Cancel any in-flight request so only the latest query's result renders.
    if (suggestionsAbortRef.current) suggestionsAbortRef.current.abort()
    const controller = new AbortController()
    suggestionsAbortRef.current = controller

    try {
      const response = await apiFetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=8`,
        {
          signal: controller.signal,
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
      // Normalize suggestions to the new type format
      const normalizedSuggestions = normalizeSearchResults(data.suggestions || [])
      suggestionsCacheRef.current.set(q.toLowerCase(), { suggestions: normalizedSuggestions })

      // Ignore if a newer request superseded this one.
      if (controller.signal.aborted) return
      setSuggestions(normalizedSuggestions)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Suggestions error:', err)
      setSuggestions([])
    } finally {
      // Only clear the spinner if this is still the latest request.
      if (suggestionsAbortRef.current === controller) {
        setIsLoadingSuggestions(false)
      }
    }
  }, [applyCachedSuggestions])

  // Debounced suggestions function (snappy now that repeats are cached)
  const debouncedFetchSuggestions = useCallback(
    debounce((query: string) => fetchSuggestions(query), 180),
    [fetchSuggestions]
  )

  // Handle input change with debounce
  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    setOpen(true) // Always open when typing
    setError(null)

    // While typing, the dropdown shows ONLY lightweight, fully-indexed
    // suggestions (the fast `/api/search/suggestions` endpoint). The heavier
    // full search runs only when the user submits (Enter) or clicks
    // "View all results" — this keeps the typeahead snappy and halves the
    // backend work per keystroke.
    if (value.trim().length >= 2) {
      // Serve cached results immediately (e.g. on backspace/retype) without
      // waiting for the debounce; otherwise debounce a fresh fetch.
      if (applyCachedSuggestions(value)) {
        debouncedFetchSuggestions.cancel()
      } else {
        debouncedFetchSuggestions(value)
      }
    } else {
      debouncedFetchSuggestions.cancel()
      setShowSuggestions(false)
      setSuggestions([])
    }
  }, [debouncedFetchSuggestions, applyCachedSuggestions])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchResult) => {
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
      case 'organisation':
        router.push(`/organizations/${suggestion.id}`)
        break
      case 'sector':
        router.push(`/sectors/${suggestion.metadata.code}`)
        break
      case 'tag':
        router.push(`/tags/${suggestion.id}`)
        break
      default:
        // For other types, run the full search for the suggestion's title
        setQuery(suggestion.title)
        if (onSearch) {
          onSearch(suggestion.title)
        } else {
          setIsExpanded(false)
          router.push(`/search?q=${encodeURIComponent(suggestion.title)}`)
        }
    }
  }, [router, onSearch])

  // Navigate to full search results page or call onSearch callback
  const handleSearchSubmit = useCallback(() => {
    if (query.trim()) {
      setOpen(false)
      if (onSearch) {
        // Use callback (for page mode)
        onSearch(query.trim())
      } else {
        // Navigate to search page (for nav mode)
        setIsExpanded(false)
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      }
    }
  }, [query, router, onSearch])

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('')
    setError(null)
    setSuggestions([])
    setShowSuggestions(false)
    // Notify parent to clear results (for page mode)
    if (onSearch) {
      onSearch('')
    }
  }, [onSearch])

  // Handle Enter key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchSubmit()
    }
    if (e.key === 'Escape') {
      if (isPageMode) {
        // In page mode, just clear the input and close dropdown
        handleClear()
        setOpen(false)
      } else {
        handleCollapse()
      }
    }
  }, [handleSearchSubmit, handleCollapse, isPageMode, handleClear])

  // Cleanup on unmount — cancel pending debounce and any in-flight request
  useEffect(() => {
    return () => {
      debouncedFetchSuggestions.cancel()
      suggestionsAbortRef.current?.abort()
    }
  }, [debouncedFetchSuggestions])

  // Size-based styles
  const inputHeight = size === "large" ? "h-14" : "h-10"
  const iconSize = size === "large" ? "h-5 w-5" : "h-4 w-4"
  const inputTextSize = size === "large" ? "text-base" : "text-body"
  const popoverWidth = size === "large" ? "w-full max-w-2xl" : "w-[500px]"
  
  // Render the search input (used in both modes)
  const renderSearchInput = () => (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative flex items-center w-full h-full rounded-full", isPageMode && "cursor-text")}>
          <div className={cn("ml-4", size === "large" && "ml-5")}>
            <Search className={cn(iconSize, "text-muted-foreground")} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn(
              inputHeight,
              inputTextSize,
              "flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none"
            )}
          />
          {isLoadingSuggestions && (
            <Loader2 className={cn("mr-3", iconSize, "text-muted-foreground animate-spin")} />
          )}
          {!isLoadingSuggestions && query && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                size === "large" ? "mr-2 h-8 w-8" : "mr-1 h-6 w-6"
              )}
            >
              <X className={size === "large" ? "h-4 w-4" : "h-3 w-3"} />
            </button>
          )}
          {/* Only show close button in nav mode */}
          {!isPageMode && (
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
          )}
          {/* Add padding on right when in page mode with no query */}
          {isPageMode && !query && !isLoadingSuggestions && (
            <div className={size === "large" ? "w-5" : "w-3"} />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={cn(popoverWidth, "p-0 max-h-96 shadow-none border-none bg-transparent")}
        align={isPageMode ? "center" : "start"}
        hidden={!query.trim()}
      >
                  <Command className="border border-border rounded-lg bg-popover shadow-lg">
                    <CommandList className="max-h-80 overflow-y-auto">
                      {isLoadingSuggestions && suggestions.length === 0 && (
                        <div className="p-4 text-center text-body text-muted-foreground">
                          Searching...
                        </div>
                      )}

                      {!isLoadingSuggestions && error && (
                        <div className="p-4 text-center text-body text-destructive">
                          {error}
                        </div>
                      )}

                      {/* Typeahead suggestions (fast, indexed) */}
                      {!error && query && query.trim().length >= 2 && showSuggestions && (
                        <>
                          {/* Show suggestions if available */}
                          {suggestions.length > 0 && (
                            <CommandGroup>
                              <div className="px-2 py-1.5 text-helper font-semibold text-muted-foreground border-b border-border">
                                Suggestions
                              </div>
                              {suggestions.map((suggestion) => (
                                <CommandItem
                                  key={`suggestion-${suggestion.type}-${suggestion.id}`}
                                  onSelect={() => handleSuggestionClick(suggestion)}
                                  className="cursor-pointer py-3 px-2 hover:bg-muted"
                                >
                                  <SearchResultRow
                                    result={suggestion}
                                    searchQuery={query}
                                    variant="compact"
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}

                          {/* Empty state — no quick matches, but full search is still one click away */}
                          {!isLoadingSuggestions && suggestions.length === 0 && (
                            <div className="px-2 py-3 text-center text-body text-muted-foreground">
                              No quick matches. Press Enter to search everything
                            </div>
                          )}
                        </>
                      )}
                    </CommandList>
                    {/* Run the full search across all entity types */}
                    {!error && query.trim().length >= 1 && (
                      <div className="border-t border-border p-2">
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
  )
  
  // Page mode: always show expanded input without animation
  if (isPageMode) {
    return (
      <div className={cn("relative w-full", className)} ref={containerRef}>
        <div className={cn(
          "relative flex items-center rounded-full border border-border bg-card w-full",
          inputHeight
        )}>
          {renderSearchInput()}
        </div>
      </div>
    )
  }
  
  // Nav mode: collapsible with animation
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
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
            className="relative flex items-center h-10 rounded-full border border-border bg-card"
          >
            {renderSearchInput()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
