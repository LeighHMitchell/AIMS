"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowRight, Target, List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SDGCardModern from '@/components/sdgs/SDGCardModern'
import { SDG_GOALS } from '@/data/sdg-targets'
import { apiFetch } from '@/lib/api-fetch'

interface SDGListItem {
  id: number
  name: string
  description: string
  color: string
  activityCount: number
}

export default function SDGListingPage() {
  const [sdgs, setSdgs] = useState<SDGListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    const fetchSDGs = async () => {
      try {
        const response = await apiFetch('/api/sdgs')
        if (!response.ok) throw new Error('Failed to fetch SDG data')
        const data = await response.json()
        setSdgs(data.sdgs || [])
      } catch (err: any) {
        console.error('[SDG Listing] Error:', err)
        setError(err.message || 'Failed to load SDGs')
      } finally {
        setLoading(false)
      }
    }
    fetchSDGs()
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
              {Array.from({ length: 17 }).map((_, i) => (
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

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading SDGs</h2>
                <p className="text-slate-600">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const totalActivities = sdgs.reduce((sum, s) => sum + s.activityCount, 0)

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Sustainable Development Goals</h1>
                  <p className="text-muted-foreground mt-1">
                    {totalActivities} activities aligned across 17 SDGs
                  </p>
                </div>
              </div>
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none gap-1"
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none gap-1"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </Button>
              </div>
            </div>
          </div>

          {/* SDG List View */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sdgs.map(sdg => (
                <Link key={sdg.id} href={`/sdgs/${sdg.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 overflow-hidden" style={{ borderLeftColor: sdg.color }}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden shadow-sm">
                          <img
                            src={`/images/sdg/E_SDG_Icons-${sdg.id.toString().padStart(2, '0')}.jpg`}
                            alt={`SDG ${sdg.id}`}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sdg.color }}>
                              Goal {sdg.id}
                            </span>
                            {sdg.activityCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {sdg.activityCount} {sdg.activityCount === 1 ? 'activity' : 'activities'}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1">
                            {sdg.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {sdg.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* SDG Grid/Card View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sdgs.map(sdg => {
                const goal = SDG_GOALS.find(g => g.id === sdg.id) || {
                  id: sdg.id,
                  name: sdg.name,
                  description: sdg.description,
                  color: sdg.color,
                }
                return (
                  <SDGCardModern
                    key={sdg.id}
                    goal={goal}
                    activityCount={sdg.activityCount}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
