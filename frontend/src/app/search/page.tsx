"use client"

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainLayout } from '@/components/layout/main-layout'
import { SearchResultsSkeleton } from '@/components/ui/skeleton-loader'
import { SearchResultRow } from '@/components/search'
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar'
import { cn } from '@/lib/utils'
import { Search, Activity, Building2, PieChart, Tag, Users, Contact2, Clock, X, Sparkles, ArrowRight } from 'lucide-react'
import type { SearchResult, SearchResultType } from '@/types/search'
import { normalizeSearchResults } from '@/lib/search-normalizer'
import { LoadingText } from '@/components/ui/loading-text'

const RECENT_SEARCHES_KEY = 'aims:recent-searches'
const MAX_RECENT_SEARCHES = 6

const SUGGESTED_QUERIES: string[] = [
  'Health',
  'Education',
  'Climate',
  'Infrastructure',
  'Gender',
  'Agriculture',
]

function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT_SEARCHES)
      : []
  } catch {
    return []
  }
}

function writeRecentSearches(values: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(values.slice(0, MAX_RECENT_SEARCHES)))
  } catch {
    // ignore quota errors
  }
}

// Result type ordering and labels
const searchResultOrder: SearchResultType[] = [
  'activity',
  'organisation',
  'sector',
  'tag',
  'user',
  'contact'
]

const resultTypeLabels: Record<SearchResultType, string> = {
  activity: 'Activities',
  organisation: 'Organisations',
  sector: 'Sectors',
  tag: 'Tags',
  user: 'Users',
  contact: 'Contacts'
}

const resultTypeIcons: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  activity: Activity,
  organisation: Building2,
  sector: PieChart,
  tag: Tag,
  user: Users,
  contact: Contact2
}


function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams?.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<'all' | SearchResultType>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    setRecentSearches(readRecentSearches())
  }, [])

  const rememberSearch = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((v) => v.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)
      writeRecentSearches(next)
      return next
    })
  }, [])

  const removeRecentSearch = useCallback((value: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((v) => v !== value)
      writeRecentSearches(next)
      return next
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    writeRecentSearches([])
    setRecentSearches([])
  }, [])

  const ITEMS_PER_PAGE = 20

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, pageNum: number = 1, resetResults: boolean = true) => {
    if (!searchQuery.trim()) {
      setResults([])
      setTotalResults(0)
      setHasMore(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=${ITEMS_PER_PAGE}`,
        {
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

      // Normalize results to new type format
      const normalizedResults = normalizeSearchResults(data.results || [])

      if (resetResults || pageNum === 1) {
        setResults(normalizedResults)
      } else {
        setResults(prev => [...prev, ...normalizedResults])
      }

      setTotalResults(data.total || normalizedResults.length)
      setHasMore(data.hasMore || false)
      setPage(pageNum)

    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to perform search')
      setResults([])
      setTotalResults(0)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial search on mount
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery, performSearch])

  // Handle search submit
  const handleSearchSubmit = useCallback((searchQuery: string) => {
    const newQuery = searchQuery.trim()
    setQuery(newQuery)
    setPage(1)

    // Update URL
    const params = new URLSearchParams()
    if (newQuery) params.set('q', newQuery)
    router.push(`/search?${params.toString()}`)

    // Clear results immediately if query is empty
    if (!newQuery) {
      setResults([])
      setTotalResults(0)
      setHasMore(false)
      return
    }

    // Remember this search locally
    rememberSearch(newQuery)

    // Perform search
    performSearch(newQuery, 1, true)
  }, [router, performSearch, rememberSearch])

  // Filter results by type
  const getFilteredResults = useCallback((type?: string) => {
    if (!type || type === 'all') return results
    return results.filter(result => result.type === type)
  }, [results])

  // Get result counts by type
  const getResultCounts = useCallback(() => {
    const counts: Record<'all' | SearchResultType, number> = {
      all: results.length,
      activity: results.filter(r => r.type === 'activity').length,
      organisation: results.filter(r => r.type === 'organisation').length,
      sector: results.filter(r => r.type === 'sector').length,
      tag: results.filter(r => r.type === 'tag').length,
      user: results.filter(r => r.type === 'user').length,
      contact: results.filter(r => r.type === 'contact').length,
    }
    return counts
  }, [results])

  // Navigate to result
  const handleResultClick = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'activity':
        router.push(`/activities/${result.id}`)
        break
      case 'organisation':
        router.push(`/organizations/${result.id}`)
        break
      case 'user':
        router.push(`/users/${result.id}`)
        break
      case 'sector':
        router.push(`/sectors/${encodeURIComponent(result.metadata.code)}`)
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

  const filteredResults = getFilteredResults(activeTab)
  const resultCounts = getResultCounts()

  return (
    <MainLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Search</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Find activities, organisations, sectors, tags, users, and contacts.
          </p>
        </div>

        {/* Search Bar - Always visible at top, centered */}
        <div className={cn(
          "flex flex-col items-center mb-8",
          !query && "pt-12 pb-8" // Extra padding when no results to center visually
        )}>
          <div className="w-full max-w-2xl">
            <GlobalSearchBar
              variant="page"
              size="large"
              placeholder="Search activities, organisations, sectors, tags..."
              onSearch={handleSearchSubmit}
              autoFocus={!initialQuery}
            />
          </div>
          
          {/* Empty state - shown when no query */}
          {!query && (
            <div className="mt-8 w-full max-w-2xl space-y-8">
              {recentSearches.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-section-label">Recent searches</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-helper text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {recentSearches.map((term) => (
                      <li
                        key={term}
                        className="group flex items-center gap-2 rounded-md hover:bg-muted/60 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleSearchSubmit(term)}
                          className="flex-1 flex items-center gap-3 px-3 py-2 text-left"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-body text-foreground">{term}</span>
                          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${term}`}
                          onClick={() => removeRecentSearch(term)}
                          className="px-2 py-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-section-label">Try searching for</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSearchSubmit(q)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-body text-foreground hover:bg-muted transition-colors"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      {q}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="text-section-label text-muted-foreground mb-3">Search covers</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {searchResultOrder.map((type) => {
                    const Icon = resultTypeIcons[type]
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-body text-muted-foreground"
                      >
                        <Icon className="h-4 w-4" />
                        {resultTypeLabels[type]}
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          )}
          
          {/* Results Summary - shown when there's a query */}
          {query && (
            <div className="mt-4 text-body text-muted-foreground">
              {loading ? (
                <span>Searching...</span>
              ) : (
                <span>
                  {totalResults > 0
                    ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"`
                    : `No results found for "${query}"`
                  }
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-6 text-center border border-destructive/30 rounded-lg bg-destructive/10">
            <div className="text-destructive mb-2">Search Error</div>
            <div className="text-muted-foreground">{error}</div>
          </div>
        )}

        {/* Results */}
        {query && !error && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | SearchResultType)} className="w-full">
            <TabsList className="h-auto bg-transparent p-0 gap-6 border-b mb-6 flex flex-wrap rounded-none justify-start">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 -mb-px text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors"
              >
                All <span className="ml-1 text-xs text-muted-foreground/70">{resultCounts.all}</span>
              </TabsTrigger>
              {searchResultOrder.map((type) => {
                const isEmpty = resultCounts[type] === 0
                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    disabled={isEmpty}
                    className={cn(
                      "rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 -mb-px text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors",
                      isEmpty && "opacity-40 cursor-not-allowed hover:text-muted-foreground"
                    )}
                  >
                    {resultTypeLabels[type]} <span className="ml-1 text-xs text-muted-foreground/70">{resultCounts[type]}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading && results.length === 0 ? (
                <SearchResultsSkeleton />
              ) : filteredResults.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground">
                    {activeTab === 'all'
                      ? 'No results found'
                      : `No ${resultTypeLabels[activeTab as SearchResultType].toLowerCase()} found`
                    }
                  </div>
                </div>
              ) : (
                <>
                  {/* Results List - Google-style divider-separated */}
                  <div className="divide-y divide-gray-100">
                    {filteredResults.map((result) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="py-5 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                        onClick={() => handleResultClick(result)}
                      >
                        <SearchResultRow
                          result={result}
                          searchQuery={query}
                          variant="full"
                          showTypeIndicator={true}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="text-center py-6">
                      <Button
                        onClick={() => performSearch(query, page + 1, false)}
                        disabled={loading}
                        variant="outline"
                      >
                        {loading ? <LoadingText>Loading...</LoadingText> : 'Load More Results'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

      </div>
    </MainLayout>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="p-8 text-center">
          <div className="animate-pulse">Loading search...</div>
        </div>
      </MainLayout>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
