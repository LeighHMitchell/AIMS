"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CardShell } from '@/components/ui/card-shell'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowRight, MapPin, List, LayoutGrid, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import { formatCurrencyShort } from '@/lib/format'

// Static map thumbnail for each state/region using OpenStreetMap static tiles
function getMapThumbnail(pcode: string): string {
  // Myanmar state/region center coordinates for map thumbnails
  const coords: Record<string, [number, number]> = {
    'MMR001': [25.5, 97.0],   // Kachin
    'MMR002': [20.5, 97.0],   // Kayah
    'MMR003': [16.5, 98.5],   // Kayin
    'MMR004': [20.0, 93.5],   // Chin
    'MMR005': [22.0, 96.5],   // Sagaing
    'MMR006': [25.0, 96.0],   // Tanintharyi
    'MMR007': [17.0, 96.5],   // Bago
    'MMR008': [21.5, 95.0],   // Magway
    'MMR009': [19.5, 96.5],   // Mandalay
    'MMR010': [16.5, 97.8],   // Mon
    'MMR011': [19.5, 94.5],   // Rakhine
    'MMR012': [17.0, 96.2],   // Yangon
    'MMR013': [22.0, 96.0],   // Shan (South)
    'MMR014': [21.0, 97.5],   // Shan (East)
    'MMR015': [23.5, 98.0],   // Shan (North)
    'MMR016': [16.5, 96.5],   // Ayeyarwady
    'MMR017': [19.8, 96.1],   // Naypyidaw
    'MMR018': [12.0, 99.0],   // Tanintharyi
  }
  const [lat, lng] = coords[pcode] || [19.5, 96.0]
  return `https://tile.openstreetmap.org/7/${Math.floor((lng + 180) / 360 * 128)}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 128)}.png`
}

interface RegionListItem {
  name: string
  type: string
  st_pcode: string
  flag: string
  activityCount: number
  commitments: number
  disbursements: number
}

const TYPE_COLORS: Record<string, string> = {
  'State': '#4C5568',
  'Region': '#3C6255',
  'Union Territory': '#7c3aed',
}

export default function LocationProfilesPage() {
  const [regions, setRegions] = useState<RegionListItem[]>([])
  const [totalActivities, setTotalActivities] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await apiFetch('/api/location-profiles')
        if (!response.ok) throw new Error('Failed to fetch location data')
        const data = await response.json()
        setRegions(data.regions || [])
        setTotalActivities(data.totalActivities || 0)
      } catch (err: any) {
        console.error('[Location Profiles] Error:', err)
        setError(err.message || 'Failed to load location profiles')
      } finally {
        setLoading(false)
      }
    }
    fetchRegions()
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
              {Array.from({ length: 15 }).map((_, i) => (
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
                <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Location Profiles</h2>
                <p className="text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Location Profiles</h1>
                  <p className="text-muted-foreground mt-1">
                    {totalActivities} activities across {regions.length} States, Regions &amp; Union Territories
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

          {/* List/Table View */}
          {viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Location</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">Activities</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">Committed</th>
                        <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">Disbursed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regions.map(region => (
                        <tr key={region.st_pcode} className="border-b border-border/50 hover:bg-muted/50 cursor-pointer" onClick={() => window.location.href = `/location-profiles/${region.st_pcode}`}>
                          <td className="py-2.5 px-3">
                            <Link href={`/location-profiles/${region.st_pcode}`} className="hover:underline">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{region.name}</span>
                                <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{region.st_pcode}</code>
                              </div>
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-foreground">{region.type}</td>
                          <td className="py-2.5 px-3 text-right text-foreground">{region.activityCount}</td>
                          <td className="py-2.5 px-3 text-right">{region.commitments > 0 ? formatCurrencyShort(region.commitments) : <span className="text-muted-foreground">—</span>}</td>
                          <td className="py-2.5 px-3 text-right">{region.disbursements > 0 ? formatCurrencyShort(region.disbursements) : <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid/Card View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {regions.map(region => (
                <CardShell
                  key={region.st_pcode}
                  href={`/location-profiles/${region.st_pcode}`}
                  ariaLabel={`${region.name} - ${region.type}`}
                  bannerColor={TYPE_COLORS[region.type] || '#64748b'}
                  bannerContent={
                    <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
                      <img
                        src={getMapThumbnail(region.st_pcode)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <MapPin className="h-12 w-12 text-white/20 relative z-10" />
                    </div>
                  }
                  bannerOverlay={
                    <>
                      <Badge className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0 mb-1">
                        {region.type}
                      </Badge>
                      <h2 className="text-lg font-bold text-white">
                        <Link
                          href={`/location-profiles/${region.st_pcode}`}
                          className="relative z-10 hover:underline inline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {region.name}
                        </Link>
                      </h2>
                    </>
                  }
                >
                  <div className="relative flex-1 p-5 flex flex-col bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {region.activityCount} {region.activityCount === 1 ? 'activity' : 'activities'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border mt-auto">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Committed</p>
                        <p className="text-sm font-semibold text-foreground">{formatCurrencyShort(region.commitments)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Disbursed</p>
                        <p className="text-sm font-semibold text-foreground">{formatCurrencyShort(region.disbursements)}</p>
                      </div>
                    </div>
                  </div>
                </CardShell>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
