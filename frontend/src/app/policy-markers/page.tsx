"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { getIconForMarker, MARKER_TYPE_BADGE_CLASSES, getMarkerTypeLabel } from '@/lib/policy-marker-utils'

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
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Policy Markers</h1>
            <p className="text-sm text-muted-foreground">
              {totalMarkers} markers across {totalActivities} activity alignments
            </p>
          </div>

          {/* Grouped sections */}
          {GROUP_ORDER.map(group => {
            const markers = data.groups[group.key] || []
            if (markers.length === 0) return null

            return (
              <div key={group.key} className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3">{group.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {markers.map((marker: PolicyMarker) => {
                    const IconComponent = getIconForMarker(marker.iati_code)
                    const badgeClass = MARKER_TYPE_BADGE_CLASSES[marker.marker_type] || MARKER_TYPE_BADGE_CLASSES.other

                    return (
                      <Link key={marker.uuid} href={`/policy-markers/${marker.uuid}`}>
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
                                    {marker.name}
                                  </h3>
                                  {marker.activityCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                      {marker.activityCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {marker.description}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  {marker.is_iati_standard && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 bg-blue-50 text-blue-700">
                                      IATI
                                    </Badge>
                                  )}
                                  {marker.iati_code && (
                                    <code className="text-[10px] px-1 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                                      {marker.iati_code}
                                    </code>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {totalMarkers === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No policy markers found. Add policy markers to activities to see them here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
