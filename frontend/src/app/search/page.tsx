"use client"

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainLayout } from '@/components/layout/main-layout'
import { SearchResultsSkeleton } from '@/components/ui/skeleton-loader'
import { SearchResultRow, CodePill } from '@/components/search'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { SearchResult, SearchResultType } from '@/types/search'
import { normalizeSearchResults } from '@/lib/search-normalizer'

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

// Badge colors for result types
const resultTypeBadgeColors: Record<SearchResultType, string> = {
  activity: 'border-blue-200 text-blue-700',
  organisation: 'border-green-200 text-green-700',
  sector: 'border-teal-200 text-teal-700',
  tag: 'border-purple-200 text-purple-700',
  user: 'border-orange-200 text-orange-700',
  contact: 'border-indigo-200 text-indigo-700'
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

    // Perform search
    performSearch(newQuery, 1, true)
  }, [router, performSearch])

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

  // Get updated_at from result metadata
  const getUpdatedAt = (result: SearchResult): string | undefined => {
    return result.metadata?.updated_at
  }

  const filteredResults = getFilteredResults(activeTab)
  const resultCounts = getResultCounts()

  return (
    <MainLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Results</h1>

          {/* Results Summary */}
          {query && (
            <div className="mt-4 text-sm text-gray-600">
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
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <div className="text-red-600 mb-2">Search Error</div>
              <div className="text-gray-600">{error}</div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {query && !error && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | SearchResultType)} className="w-full">
            <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
              <TabsTrigger value="all" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                All ({resultCounts.all})
              </TabsTrigger>
              {searchResultOrder.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {resultTypeLabels[type]} ({resultCounts[type]})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading && results.length === 0 ? (
                <SearchResultsSkeleton />
              ) : filteredResults.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    {activeTab === 'all'
                      ? 'No results found'
                      : `No ${resultTypeLabels[activeTab as SearchResultType].toLowerCase()} found`
                    }
                  </div>
                </div>
              ) : (
                <>
                  {/* Results List */}
                  <div className="space-y-4">
                    {filteredResults.map((result) => (
                      <Card
                        key={`${result.type}-${result.id}`}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <SearchResultRow
                                    result={result}
                                    searchQuery={query}
                                    variant="full"
                                  />
                                </div>
                                <div className="flex-shrink-0 ml-4 text-right">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs mb-2",
                                      resultTypeBadgeColors[result.type]
                                    )}
                                  >
                                    {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                  </Badge>
                                  {getUpdatedAt(result) && (
                                    <div className="text-xs text-gray-400">
                                      Updated {format(new Date(getUpdatedAt(result)!), 'MMM d, yyyy')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
                        {loading ? 'Loading...' : 'Load More Results'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* No Query State */}
        {!query && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Search the AIMS Database</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Search for activities, organisations, users, sectors, and tags using the search bar above.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">Activities</Badge>
                <Badge variant="outline">Organisations</Badge>
                <Badge variant="outline">Users</Badge>
                <Badge variant="outline">Sectors</Badge>
                <Badge variant="outline">Tags</Badge>
              </div>
            </CardContent>
          </Card>
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
