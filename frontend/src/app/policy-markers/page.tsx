"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CardShell } from '@/components/ui/card-shell'
import { Badge } from '@/components/ui/badge'
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
  icon?: string | null
  color?: string | null
}

interface PMSummaryData {
  markers: PolicyMarker[]
  groups: Record<string, PolicyMarker[]>
  totalActivities: number
}

const GROUP_ORDER = [
  { key: 'oecd_dac', label: 'OECD DAC Policy Marker' },
  { key: 'other', label: 'Other' },
]

export default function PolicyMarkersListingPage() {
  const [data, setData] = useState<PMSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [banners, setBanners] = useState<Record<string, { banner: string; banner_position: number }>>({})
  const [query, setQuery] = useState('')
  const { isSuperUser } = useUserRole()
  const canEdit = isSuperUser()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFetch('/api/policy-markers/summary')
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

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Policy Markers</h1>
                <p className="text-muted-foreground mt-1">
                  {q
                    ? `${filteredCount} of ${totalMarkers} markers`
                    : `${totalMarkers} markers across ${totalActivities} activity alignments`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter markers…"
                  className="h-9 pl-9 pr-8"
                  aria-label="Filter policy markers"
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
              <div className="flex items-center border rounded-md">
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-r-none h-9">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="rounded-l-none h-9">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* List View */}
          {viewMode === 'list' && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-section-label font-medium text-muted-foreground uppercase">
                <div className="w-10 flex-shrink-0" />
                <div className="flex-1">Name</div>
                <div className="w-40 hidden md:block">Category</div>
                <div className="w-16 text-center">IATI</div>
                <div className="w-20 text-right">Activities</div>
                {canEdit && <div className="w-10 flex-shrink-0" />}
              </div>
              {GROUP_ORDER.map(group => {
                const markers = filteredGroups[group.key] || []
                if (markers.length === 0) return null
                return markers.map((marker: PolicyMarker) => {
                  const IconComponent = getIconForMarker(marker.iati_code, marker.icon)
                  return (
                    <Link
                      key={marker.uuid}
                      href={`/policy-markers/${marker.uuid}`}
                      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-body truncate">{marker.name}</h3>
                        <p className="text-helper text-muted-foreground truncate">{marker.description}</p>
                      </div>
                      <div className="w-40 hidden md:block">
                        <span className="text-helper text-muted-foreground">{group.label}</span>
                      </div>
                      <div className="w-16 text-center">
                        {marker.is_iati_standard && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 bg-blue-50 text-blue-700">IATI</Badge>
                        )}
                      </div>
                      <div className="w-20 text-right">
                        {marker.activityCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{marker.activityCount}</Badge>
                        )}
                      </div>
                      {canEdit && (
                        <div className="w-10 flex-shrink-0 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/policy-markers/${marker.uuid}/edit`) }}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit policy marker"
                            aria-label="Edit policy marker"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </Link>
                  )
                })
              })}
            </div>
          )}

          {/* Card View - Grouped sections */}
          {viewMode === 'card' && GROUP_ORDER.map(group => {
            const markers = filteredGroups[group.key] || []
            if (markers.length === 0) return null

            return (
              <div key={group.key} className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3">{group.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                            variant="outline"
                            size="icon"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/policy-markers/${marker.uuid}/edit`) }}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
                          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
                            <span className="text-body font-medium">
                              {marker.activityCount} {marker.activityCount === 1 ? 'activity' : 'activities'}
                            </span>
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
