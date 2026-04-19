"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CardShell } from '@/components/ui/card-shell'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowRight, Bookmark, List, LayoutGrid, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import { getIconForMarker, MARKER_TYPE_BADGE_CLASSES, getMarkerTypeLabel } from '@/lib/policy-marker-utils'

const GROUP_COLORS: Record<string, string> = {
  'environmental': '#16a34a',
  'social_governance': '#2563eb',
  'other': '#7c3aed',
  'custom': '#64748b',
}

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
}

interface PMSummaryData {
  markers: PolicyMarker[]
  groups: Record<string, PolicyMarker[]>
  totalActivities: number
}

const GROUP_ORDER = [
  { key: 'environmental', label: 'Environmental' },
  { key: 'social_governance', label: 'Social & Governance' },
  { key: 'other', label: 'Other' },
  { key: 'custom', label: 'Custom' },
]

export default function PolicyMarkersListingPage() {
  const [data, setData] = useState<PMSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')

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

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
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

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-muted-foreground" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Policy Markers</h1>
                <p className="text-muted-foreground mt-1">
                  {totalMarkers} markers across {totalActivities} activity alignments
                </p>
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
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-section-label font-medium text-muted-foreground uppercase">
                <div className="w-10 flex-shrink-0" />
                <div className="flex-1">Name</div>
                <div className="w-40 hidden md:block">Category</div>
                <div className="w-16 text-center">IATI</div>
                <div className="w-20 text-right">Activities</div>
              </div>
              {GROUP_ORDER.map(group => {
                const markers = data.groups[group.key] || []
                if (markers.length === 0) return null
                return markers.map((marker: PolicyMarker) => {
                  const IconComponent = getIconForMarker(marker.iati_code)
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
                    </Link>
                  )
                })
              })}
            </div>
          )}

          {/* Card View - Grouped sections */}
          {viewMode === 'card' && GROUP_ORDER.map(group => {
            const markers = data.groups[group.key] || []
            if (markers.length === 0) return null
            const groupColor = GROUP_COLORS[group.key] || '#64748b'

            return (
              <div key={group.key} className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3">{group.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {markers.map((marker: PolicyMarker) => {
                    const IconComponent = getIconForMarker(marker.iati_code)

                    return (
                      <CardShell
                        key={marker.uuid}
                        href={`/policy-markers/${marker.uuid}`}
                        ariaLabel={marker.name}
                        bannerColor={groupColor}
                        bannerContent={
                          <div className="h-full w-full flex items-center justify-center">
                            <IconComponent className="h-12 w-12 text-white/20" />
                          </div>
                        }
                        bannerOverlay={
                          <>
                            <div className="flex items-center gap-1.5 mb-1">
                              {marker.is_iati_standard && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">IATI</Badge>
                              )}
                              {marker.iati_code && (
                                <code className="text-xs px-1.5 py-0.5 bg-white/20 text-white/90 rounded font-mono">{marker.iati_code}</code>
                              )}
                            </div>
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
                            <Activity className="w-4 h-4 text-muted-foreground" />
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
        </div>
      </div>
    </MainLayout>
  )
}
