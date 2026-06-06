"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CardShell } from '@/components/ui/card-shell'
import { Badge } from '@/components/ui/badge'
import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/skeleton-loader'
import { AlertCircle, ArrowRight, MapPin, LayoutGrid, Activity, List, Pencil, Search as SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, getSortIcon, sortableHeaderClasses } from '@/components/ui/table'
import { UsdAmount } from '@/components/ui/usd-amount'
import { apiFetch } from '@/lib/api-fetch'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
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
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const router = useRouter()
  const { isSuperUser } = useUserRole()
  const canEdit = isSuperUser()
  const [searchQuery, setSearchQuery] = useState('')
  const locQuery = searchQuery.trim().toLowerCase()
  const filteredRegions = locQuery
    ? regions.filter(r => (r.name || '').toLowerCase().includes(locQuery) || (r.type || '').toLowerCase().includes(locQuery) || (r.st_pcode || '').toLowerCase().includes(locQuery))
    : regions
  const [sortField, setSortField] = useState<'name' | 'type' | 'activities' | 'committed' | 'disbursed'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortOrder('asc') }
  }
  const sortedRegions = [...filteredRegions].sort((a, b) => {
    let cmp = 0
    if (sortField === 'name') cmp = (a.name || '').localeCompare(b.name || '')
    else if (sortField === 'type') cmp = (a.type || '').localeCompare(b.type || '') || (a.name || '').localeCompare(b.name || '')
    else if (sortField === 'activities') cmp = a.activityCount - b.activityCount
    else if (sortField === 'committed') cmp = a.commitments - b.commitments
    else cmp = a.disbursements - b.disbursements
    return sortOrder === 'asc' ? cmp : -cmp
  })

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
          <div className="w-full p-6 space-y-6">
            <PageHeaderSkeleton />
            <CardGridSkeleton count={15} columns={3} />
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
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Location Profiles</h1>
            <p className="text-muted-foreground mt-1">
              {totalActivities} activities across {regions.length} States, Regions &amp; Union Territories
            </p>
          </div>

          {/* Filters + View Toggle */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  aria-label="Search locations"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
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

          {/* List/Table View */}
          {viewMode === 'list' && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={sortableHeaderClasses} onClick={() => toggleSort('name')}>
                      <span className="inline-flex items-center gap-1">Location {getSortIcon('name', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className={sortableHeaderClasses} onClick={() => toggleSort('type')}>
                      <span className="inline-flex items-center gap-1">Type {getSortIcon('type', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleSort('activities')}>
                      <span className="inline-flex items-center gap-1 justify-end">Activities {getSortIcon('activities', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleSort('committed')}>
                      <span className="inline-flex items-center gap-1 justify-end">Committed {getSortIcon('committed', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleSort('disbursed')}>
                      <span className="inline-flex items-center gap-1 justify-end">Disbursed {getSortIcon('disbursed', sortField, sortOrder)}</span>
                    </TableHead>
                    {canEdit && <TableHead className="w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRegions.map(region => (
                    <TableRow
                      key={region.st_pcode}
                      className="group/row cursor-pointer"
                      onClick={() => router.push(`/location-profiles/${region.st_pcode}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{region.name}</span>
                          <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{region.st_pcode}</code>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{region.type}</TableCell>
                      <TableCell className="text-right text-foreground">{region.activityCount}</TableCell>
                      <TableCell className="text-right"><UsdAmount value={region.commitments} /></TableCell>
                      <TableCell className="text-right"><UsdAmount value={region.disbursements} /></TableCell>
                      {canEdit && (
                        <TableCell className="opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/location-profiles/${region.st_pcode}/edit`)}
                              title="Edit location"
                              aria-label="Edit location"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Grid/Card View */}
          {viewMode === 'card' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredRegions.map(region => (
                <CardShell
                  key={region.st_pcode}
                  href={`/location-profiles/${region.st_pcode}`}
                  ariaLabel={`${region.name} - ${region.type}`}
                  bannerColor={TYPE_COLORS[region.type] || '#64748b'}
                  bannerActions={canEdit ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/location-profiles/${region.st_pcode}/edit`) }}
                      className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit location"
                      aria-label="Edit location"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : undefined}
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
                      <span className="text-body font-medium">
                        {region.activityCount} {region.activityCount === 1 ? 'activity' : 'activities'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border mt-auto">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Committed</p>
                        <p className="text-body font-semibold text-foreground">{formatCurrencyShort(region.commitments)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Disbursed</p>
                        <p className="text-body font-semibold text-foreground">{formatCurrencyShort(region.disbursements)}</p>
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
