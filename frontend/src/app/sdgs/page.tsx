"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/skeleton-loader'
import { AlertCircle, Target, LayoutGrid, List, Pencil, Search as SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, getSortIcon, sortableHeaderClasses } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import SDGCardModern from '@/components/sdgs/SDGCardModern'
import { SDG_GOALS } from '@/data/sdg-targets'
import { apiFetch } from '@/lib/api-fetch'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'

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
  const router = useRouter()
  const { isSuperUser } = useUserRole()
  const canEdit = isSuperUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'goal' | 'name' | 'activities'>('goal')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const toggleSort = (field: 'goal' | 'name' | 'activities') => {
    if (sortField === field) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortOrder('asc') }
  }

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
          <div className="w-full p-6 space-y-6">
            <PageHeaderSkeleton />
            <CardGridSkeleton count={17} columns={3} />
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
                <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading SDGs</h2>
                <p className="text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const totalActivities = sdgs.reduce((sum, s) => sum + s.activityCount, 0)
  const q = searchQuery.trim().toLowerCase()
  const baseFilteredSdgs = q
    ? sdgs.filter(s => `${s.id}`.includes(q) || (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q))
    : sdgs
  const filteredSdgs = [...baseFilteredSdgs].sort((a, b) => {
    let cmp = 0
    if (sortField === 'goal') cmp = a.id - b.id
    else if (sortField === 'name') cmp = (a.name || '').localeCompare(b.name || '')
    else cmp = a.activityCount - b.activityCount
    return sortOrder === 'asc' ? cmp : -cmp
  })

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Sustainable Development Goals</h1>
            <p className="text-muted-foreground mt-1">
              {totalActivities} activities aligned across 17 SDGs
            </p>
          </div>

          {/* Filters + View Toggle */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  aria-label="Search SDGs"
                  placeholder="Search SDGs..."
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

          {/* SDG Table View */}
          {viewMode === 'list' && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16" />
                    <TableHead className={`w-20 ${sortableHeaderClasses}`} onClick={() => toggleSort('goal')}>
                      <span className="inline-flex items-center gap-1">Goal {getSortIcon('goal', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className={sortableHeaderClasses} onClick={() => toggleSort('name')}>
                      <span className="inline-flex items-center gap-1">Name {getSortIcon('name', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead className={`text-right w-28 ${sortableHeaderClasses}`} onClick={() => toggleSort('activities')}>
                      <span className="inline-flex items-center gap-1 justify-end">Activities {getSortIcon('activities', sortField, sortOrder)}</span>
                    </TableHead>
                    {canEdit && <TableHead className="w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSdgs.map(sdg => (
                    <TableRow
                      key={sdg.id}
                      className="group/row cursor-pointer"
                      onClick={() => router.push(`/sdgs/${sdg.id}`)}
                    >
                      <TableCell>
                        <div className="w-9 h-9 rounded overflow-hidden shadow-sm">
                          <img
                            src={`/images/sdg/E_SDG_Icons-${sdg.id.toString().padStart(2, '0')}.jpg`}
                            alt={`SDG ${sdg.id}`}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-section-label font-bold uppercase" style={{ color: sdg.color }}>{sdg.id}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{sdg.name}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        <p className="line-clamp-2 max-w-md">{sdg.description}</p>
                      </TableCell>
                      <TableCell className="text-right text-foreground">{sdg.activityCount}</TableCell>
                      {canEdit && (
                        <TableCell className="opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/sdgs/${sdg.id}/edit`)}
                              title="Edit SDG"
                              aria-label="Edit SDG"
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

          {/* SDG Grid/Card View */}
          {viewMode === 'card' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredSdgs.map(sdg => {
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
                    bannerActions={canEdit ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/sdgs/${sdg.id}/edit`) }}
                        className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit SDG"
                        aria-label="Edit SDG"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : undefined}
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
