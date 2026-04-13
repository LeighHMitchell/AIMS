"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Target, LayoutGrid, List } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [banners, setBanners] = useState<Record<string, string>>({})

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

    // Fetch all SDG banners in one request
    const fetchBanners = async () => {
      try {
        const res = await apiFetch('/api/profile-banners/sdg')
        if (res.ok) {
          const data = await res.json()
          const result: Record<string, string> = {}
          Object.entries(data).forEach(([id, val]: [string, any]) => {
            if (val.banner) result[id] = val.banner
          })
          setBanners(result)
        }
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
              <CardContent className="p-6 text-center">
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
              <div className="flex items-center border rounded-md flex-shrink-0">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none h-9"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className="rounded-l-none h-9"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* SDG Table View */}
          {viewMode === 'list' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted">
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-medium text-muted-foreground px-4 py-3 w-16"></th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3 w-20">Goal</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3">Name</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Description</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-3 w-28">Activities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sdgs.map(sdg => (
                      <tr key={sdg.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/sdgs/${sdg.id}`}>
                            <div className="w-10 h-10 rounded overflow-hidden shadow-sm">
                              <img
                                src={`/images/sdg/E_SDG_Icons-${sdg.id.toString().padStart(2, '0')}.jpg`}
                                alt={`SDG ${sdg.id}`}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sdg.color }}>
                            {sdg.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/sdgs/${sdg.id}`} className="font-medium text-foreground hover:underline">
                            {sdg.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-muted-foreground line-clamp-2 max-w-md">
                            {sdg.description}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {sdg.activityCount > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {sdg.activityCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* SDG Grid/Card View */}
          {viewMode === 'card' && (
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
                    bannerImage={banners[String(sdg.id)]}
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
