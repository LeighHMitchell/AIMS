"use client"

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Filter, Building2, Target, User, Grid3X3, ChevronLeft, ChevronRight, UserCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MainLayout } from '@/components/layout/main-layout'
import { SearchResultsSkeleton } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface SearchResult {
  id: string
  type: 'activity' | 'organization' | 'user' | 'sector' | 'tag' | 'contact'
  title: string
  subtitle?: string
  metadata?: {
    status?: string
    reporting_org?: string
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

interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams?.get('q') || ''
  
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState('all')
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
      
      if (resetResults || pageNum === 1) {
        setResults(data.results || [])
      } else {
        setResults(prev => [...prev, ...(data.results || [])])
      }
      
      setTotalResults(data.total || data.results?.length || 0)
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
    const counts = {
      all: results.length,
      activity: results.filter(r => r.type === 'activity').length,
      organization: results.filter(r => r.type === 'organization').length,
      user: results.filter(r => r.type === 'user').length,
      sector: results.filter(r => r.type === 'sector').length,
      tag: results.filter(r => r.type === 'tag').length,
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
      case 'contact':
        // Navigate to the activity that contains this contact
        if (result.metadata?.activity_id) {
          router.push(`/activities/${result.metadata.activity_id}#contacts`)
        }
        break
    }
  }, [router])

  // Get icon for result type
  const getResultIcon = (result: SearchResult) => {
    const { type, metadata } = result
    
    // Handle activity icons
    if (type === 'activity' && metadata?.activity_icon_url) {
      return (
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={metadata.activity_icon_url} 
            alt="Activity icon" 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = `
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span class="text-blue-600 font-semibold">A</span>
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
        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
          <img 
            src={metadata.profile_picture_url} 
            alt="Profile" 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = `
                <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span class="text-orange-600 font-semibold">U</span>
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
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-white">
          <img 
            src={metadata.logo_url} 
            alt="Organization logo" 
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = `
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span class="text-green-600 font-semibold">O</span>
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
        return <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Target className="h-5 w-5 text-blue-600" />
        </div>
      case 'organization':
        return <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Building2 className="h-5 w-5 text-green-600" />
        </div>
      case 'user':
        return <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-orange-600" />
        </div>
      case 'sector':
        return <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
          <Grid3X3 className="h-5 w-5 text-teal-600" />
        </div>
      case 'tag':
        return <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <span className="text-purple-600 font-semibold text-lg">#</span>
        </div>
      case 'contact':
        return <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <UserCircle className="h-5 w-5 text-indigo-600" />
        </div>
      default:
        return <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-600 font-semibold">?</span>
        </div>
    }
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="all" className="text-sm">
                All ({resultCounts.all})
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-sm">
                Activities ({resultCounts.activity})
              </TabsTrigger>
              <TabsTrigger value="organization" className="text-sm">
                Organizations ({resultCounts.organization})
              </TabsTrigger>
              <TabsTrigger value="user" className="text-sm">
                Users ({resultCounts.user})
              </TabsTrigger>
              <TabsTrigger value="sector" className="text-sm">
                Sectors ({resultCounts.sector})
              </TabsTrigger>
              <TabsTrigger value="tag" className="text-sm">
                Tags ({resultCounts.tag})
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-sm">
                Contacts ({resultCounts.contact})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading && results.length === 0 ? (
                <SearchResultsSkeleton />
              ) : filteredResults.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    {activeTab === 'all' 
                      ? 'No results found' 
                      : `No ${activeTab} results found`
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
                            <div className="flex-shrink-0">
                              {getResultIcon(result)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                                    {result.title}
                                  </h3>
                                  {result.type === 'activity' && (
                                    <div className="mt-1 text-sm text-gray-600 space-y-1">
                                      {result.metadata?.partner_id && (
                                        <div>Partner ID: {result.metadata.partner_id}</div>
                                      )}
                                      {result.metadata?.reporting_org && (
                                        <div>Reported by: {result.metadata.reporting_org}</div>
                                      )}
                                    </div>
                                  )}
                                  {result.type === 'organization' && result.subtitle && (
                                    <div className="mt-1 text-sm text-gray-600">
                                      {result.subtitle}
                                    </div>
                                  )}
                                  {result.type === 'user' && result.subtitle && (
                                    <div className="mt-1 text-sm text-gray-600">
                                      {result.subtitle}
                                    </div>
                                  )}
                                  {result.type === 'sector' && (
                                    <div className="mt-1 text-sm text-gray-600">
                                      Sector Code: {result.metadata?.sector_code}
                                    </div>
                                  )}
                                  {result.type === 'tag' && (
                                    <div className="mt-1 text-sm text-gray-600">
                                      {result.metadata?.activity_count || 0} activities
                                    </div>
                                  )}
                                  {result.metadata?.tags && result.metadata.tags.length > 0 && (
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                      {result.metadata.tags.slice(0, 3).map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                      {result.metadata.tags.length > 3 && (
                                        <span className="text-xs text-gray-400">
                                          +{result.metadata.tags.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-shrink-0 ml-4 text-right">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs mb-2",
                                      result.type === 'activity' && "border-blue-200 text-blue-700",
                                      result.type === 'organization' && "border-green-200 text-green-700",
                                      result.type === 'user' && "border-orange-200 text-orange-700",
                                      result.type === 'sector' && "border-teal-200 text-teal-700",
                                      result.type === 'tag' && "border-purple-200 text-purple-700"
                                    )}
                                  >
                                    {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                  </Badge>
                                  {result.metadata?.updated_at && (
                                    <div className="text-xs text-gray-400">
                                      Updated {format(new Date(result.metadata.updated_at), 'MMM d, yyyy')}
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
                Search for activities, organizations, users, sectors, and tags using the search bar above.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">Activities</Badge>
                <Badge variant="outline">Organizations</Badge>
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