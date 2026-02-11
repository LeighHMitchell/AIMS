"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowRight } from 'lucide-react'
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
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Sustainable Development Goals</h1>
            <p className="text-sm text-slate-500">
              {totalActivities} activities aligned across 17 SDGs
            </p>
          </div>

          {/* SDG Cards Grid */}
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
        </div>
      </div>
    </MainLayout>
  )
}
