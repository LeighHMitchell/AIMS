"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CardShell } from '@/components/ui/card-shell'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, getSortIcon, sortableHeaderClasses } from '@/components/ui/table'
import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/skeleton-loader'
import { AlertCircle, List, LayoutGrid, Search, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api-fetch'
import { getIconForMarker, getMarkerColor } from '@/lib/policy-marker-utils'
import { useUserRole } from '@/hooks/useUserRole'

interface PolicyMarker {
  id: number
  uuid: string
  code: string
  name: string
  description: string
  marker_type: string
  iati_code?: string
  is_iati_standard: boolean
  activityCount: number
  significantCount: number
  principalCount: number
  icon?: string | null
  color?: string | null
}

interface PMSummaryData {
  markers: PolicyMarker[]
  groups: Record<string, PolicyMarker[]>
  totalActivities: number
}

const GROUP_ORDER = [
  // vocab = IATI PolicyMarkerVocabulary code (1 = OECD DAC CRS, 99 = Reporting Organisation)
  { key: 'oecd_dac', label: 'OECD DAC Policy Marker', vocab: '1' },
  { key: 'other', label: 'Other', vocab: '99' },
]

export default function PolicyMarkersListingPage() {
  const [data, setData] = useState<PMSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [banners, setBanners] = useState<Record<string, { banner: string; banner_position: number }>>({})
  const [query, setQuery] = useState('')
  const [sortField, setSortField] = useState<'name' | 'category' | 'activities'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const { isSuperUser } = useUserRole()
  const canEdit = isSuperUser()
  const router = useRouter()

  const toggleSort = (field: 'name' | 'category' | 'activities') => {
    if (sortField === field) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortOrder('asc') }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFetch('/api/policy-markers/summary', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to fetch policy markers')
        const result = await response.json()
        setData(result)
      } catch (err: any) {
        console.error('[PM Listing] Error:', err)
        setError(err.message || 'Failed to load policy markers')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await apiFetch('/api/profile-banners/policy_marker')
        if (!res.ok) return
        setBanners(await res.json())
      } catch {
        // Banners are optional
      }
    }
    fetchBanners()
  }, [])

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6 space-y-6">
            <PageHeaderSkeleton />
            <CardGridSkeleton count={12} columns={3} />
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Policy Markers</h2>
                <p className="text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const totalMarkers = data.markers.length
  const totalActivities = data.markers.reduce((sum, m) => sum + m.activityCount, 0)

  // Quick text filter across name, description, and codes
  const q = query.trim().toLowerCase()
  const matchesQuery = (m: PolicyMarker) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    (m.description || '').toLowerCase().includes(q) ||
    (m.code || '').toLowerCase().includes(q) ||
    (m.iati_code || '').toLowerCase().includes(q)
  const filteredGroups: Record<string, PolicyMarker[]> = {}
  GROUP_ORDER.forEach(g => { filteredGroups[g.key] = (data.groups[g.key] || []).filter(matchesQuery) })
  const filteredCount = Object.values(filteredGroups).reduce((sum, arr) => sum + arr.length, 0)

  // Flat, sortable rows for the table view
  const tableRows = GROUP_ORDER.flatMap(g => (filteredGroups[g.key] || []).map(m => ({ marker: m, category: g.label, vocab: g.vocab })))
    .sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.marker.name.localeCompare(b.marker.name)
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category) || a.marker.name.localeCompare(b.marker.name)
      else cmp = a.marker.activityCount - b.marker.activityCount
      return sortOrder === 'asc' ? cmp : -cmp
    })

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Policy Markers</h1>
            <p className="text-muted-foreground mt-1">
              {q
                ? `${filteredCount} of ${totalMarkers} markers`
                : `${totalMarkers} markers across ${totalActivities} activity alignments`}
            </p>
          </div>

          {/* Filters + View Toggle */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search policy markers..."
                  className="pl-10 pr-9"
                  aria-label="Search policy markers"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center border rounded-md flex-shrink-0">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-r-none h-9">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="rounded-l-none h-9">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* List View */}
          {viewMode === 'list' && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={sortableHeaderClasses} onClick={() => toggleSort('name')}>
                      <span className="inline-flex items-center gap-1">Name {getSortIcon('name', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className={`hidden md:table-cell ${sortableHeaderClasses}`} onClick={() => toggleSort('category')}>
                      <span className="inline-flex items-center gap-1">Category {getSortIcon('category', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleSort('activities')}>
                      <span className="inline-flex items-center gap-1 justify-end">Activities {getSortIcon('activities', sortField, sortOrder)}</span>
                    </TableHead>
                    {canEdit && <TableHead className="w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map(({ marker, category, vocab }) => {
                    const IconComponent = getIconForMarker(marker.iati_code, marker.icon)
                    return (
                      <TableRow
                        key={marker.uuid}
                        className="group/row cursor-pointer"
                        onClick={() => router.push(`/policy-markers/${marker.uuid}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
                              <IconComponent className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-foreground truncate">{marker.name}</div>
                              <div className="text-helper text-muted-foreground font-normal truncate">{marker.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-foreground">
                          {vocab && (
                            <span className="font-mono text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 mr-2">{vocab}</span>
                          )}
                          {category}
                        </TableCell>
                        <TableCell className="text-right text-foreground">{marker.activityCount}</TableCell>
                        {canEdit && (
                          <TableCell className="opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/policy-markers/${marker.uuid}/edit`)}
                                title="Edit policy marker"
                                aria-label="Edit policy marker"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Card View - Grouped sections */}
          {viewMode === 'card' && GROUP_ORDER.map(group => {
            const markers = filteredGroups[group.key] || []
            if (markers.length === 0) return null

            return (
              <div key={group.key} className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3">{group.label}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {markers.map((marker: PolicyMarker) => {
                    const IconComponent = getIconForMarker(marker.iati_code, marker.icon)
                    const markerBanner = banners[String(marker.id)]

                    return (
                      <CardShell
                        key={marker.uuid}
                        href={`/policy-markers/${marker.uuid}`}
                        ariaLabel={marker.name}
                        bannerColor={getMarkerColor(marker)}
                        bannerActions={canEdit ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/policy-markers/${marker.uuid}/edit`) }}
                            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit policy marker"
                            aria-label="Edit policy marker"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : undefined}
                        bannerContent={
                          markerBanner?.banner ? (
                            <img
                              src={markerBanner.banner}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
                              style={{ objectPosition: `center ${markerBanner.banner_position ?? 50}%` }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <IconComponent className="h-12 w-12 text-white/20" />
                            </div>
                          )
                        }
                        bannerOverlay={
                          <>
                            <h2 className="text-body font-bold text-white leading-tight">
                              <Link
                                href={`/policy-markers/${marker.uuid}`}
                                className="relative z-10 hover:underline inline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {marker.name}
                              </Link>
                            </h2>
                          </>
                        }
                      >
                        <div className="relative flex-1 p-5 flex flex-col bg-card">
                          <p className="text-helper text-muted-foreground line-clamp-3 mb-3">
                            {marker.description}
                          </p>
                          <div className="mt-auto pt-3 border-t border-border">
                            <span className="text-body font-medium">
                              {marker.activityCount} {marker.activityCount === 1 ? 'activity' : 'activities'}
                            </span>
                            <div className="flex items-center gap-3 mt-1 text-helper text-muted-foreground">
                              <span title="Activities where this is a significant objective">
                                <span className="font-medium text-foreground">{marker.significantCount}</span> significant
                              </span>
                              <span title="Activities where this is a principal objective">
                                <span className="font-medium text-foreground">{marker.principalCount}</span> principal
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardShell>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {totalMarkers === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No policy markers found. Add policy markers to activities to see them here.</p>
              </CardContent>
            </Card>
          )}

          {/* No search results */}
          {totalMarkers > 0 && filteredCount === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No policy markers match &ldquo;{query}&rdquo;.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery('')}>Clear filter</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
