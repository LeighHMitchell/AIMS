"use client"

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CardShell } from '@/components/ui/card-shell'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton, StatsRowSkeleton } from '@/components/ui/skeleton-loader'
import { Input } from '@/components/ui/input'
import { AlertCircle, ChevronRight, ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Search, PieChart, List, LayoutGrid, Activity, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import { formatCurrencyShort } from '@/lib/format'
import { UsdAmount } from '@/components/ui/usd-amount'

// Color palette for sector groups
const SECTOR_COLORS: Record<string, string> = {
  '100': '#4C5568', '110': '#3C6255', '120': '#7c3aed', '130': '#b45309',
  '140': '#0e7490', '150': '#be185d', '160': '#4338ca', '200': '#059669',
  '210': '#dc2626', '220': '#7c3aed', '230': '#0d9488', '300': '#6366f1',
  '310': '#ea580c', '320': '#2563eb', '330': '#9333ea', '400': '#16a34a',
  '410': '#e11d48', '430': '#0284c7', '500': '#ca8a04', '510': '#65a30d',
  '520': '#a855f7', '530': '#f97316', '600': '#64748b', '700': '#475569',
  '900': '#334155', '998': '#1e293b',
}

function getSectorColor(code: string): string {
  return SECTOR_COLORS[code] || '#4C5568'
}

interface SectorNode {
  code: string
  name: string
  activityCount: number
  totalValue: number
  sectors?: SectorNode[]
}

interface CategoryNode extends SectorNode {
  sectors: SectorNode[]
}

interface GroupNode extends SectorNode {
  categories: CategoryNode[]
}

interface SummaryData {
  groups: GroupNode[]
  totals: {
    totalActivities: number
    totalFunding: number
    activeSectors: number
    totalSectorCodes: number
  }
}

export default function SectorsListingPage() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [banners, setBanners] = useState<Record<string, string>>({})
  const router = useRouter()
  const { isSuperUser } = useUserRole()
  const canEdit = isSuperUser()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFetch('/api/sectors/summary')
        if (!response.ok) throw new Error('Failed to fetch sector data')
        const result = await response.json()
        setData(result)
      } catch (err: any) {
        console.error('[Sectors] Error:', err)
        setError(err.message || 'Failed to load sectors')
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Fetch all sector banners
    const fetchBanners = async () => {
      try {
        const res = await apiFetch('/api/profile-banners/sector')
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

  const toggleGroup = (code: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleCategory = (code: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!data) return []
    const term = searchTerm.toLowerCase().trim()
    if (!term) return data.groups.filter(g => g.activityCount > 0 || g.totalValue > 0)

    return data.groups
      .map(group => {
        const groupMatches = group.name.toLowerCase().includes(term) || group.code.includes(term)
        const filteredCategories = group.categories
          .map(cat => {
            const catMatches = cat.name.toLowerCase().includes(term) || cat.code.includes(term)
            const filteredSectors = cat.sectors.filter(s =>
              s.name.toLowerCase().includes(term) || s.code.includes(term)
            )
            if (catMatches || filteredSectors.length > 0) {
              return { ...cat, sectors: catMatches ? cat.sectors : filteredSectors }
            }
            return null
          })
          .filter(Boolean) as CategoryNode[]

        if (groupMatches || filteredCategories.length > 0) {
          return { ...group, categories: groupMatches ? group.categories : filteredCategories }
        }
        return null
      })
      .filter(Boolean) as GroupNode[]
  }, [data, searchTerm])

  const allExpanded = expandedGroups.size >= filteredGroups.length && filteredGroups.length > 0

  const toggleExpandAll = () => {
    if (!data) return
    if (allExpanded) {
      setExpandedGroups(new Set())
      setExpandedCategories(new Set())
    } else {
      setExpandedGroups(new Set(filteredGroups.map(g => g.code)))
      const cats = new Set<string>()
      filteredGroups.forEach(g => g.categories.forEach(c => cats.add(c.code)))
      setExpandedCategories(cats)
    }
  }

  // Auto-expand when searching
  useMemo(() => {
    if (searchTerm.trim()) {
      setExpandedGroups(new Set(filteredGroups.map(g => g.code)))
      const cats = new Set<string>()
      filteredGroups.forEach(g => g.categories.forEach(c => cats.add(c.code)))
      setExpandedCategories(cats)
    }
  }, [searchTerm, filteredGroups])

  if (loading) {
    return (
      <MainLayout>
        <div className="w-full">
          <div className="w-full space-y-6">
            <PageHeaderSkeleton />
            <StatsRowSkeleton tiles={3} />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
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
        <div className="w-full">
          <div className="w-full">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Sectors</h2>
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
      <div className="w-full">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sectors</h1>
              <p className="text-muted-foreground mt-1">
                DAC CRS Purpose Codes — {data.totals.activeSectors} active sectors across {data.totals.totalActivities} activities
              </p>
            </div>
          </div>

          {/* Search bar + View Toggle + Expand/Collapse All */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search sectors by name or code"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center border rounded-md flex-shrink-0">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-r-none h-9">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="rounded-l-none h-9">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            {viewMode === 'list' && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleExpandAll}
                disabled={filteredGroups.length === 0}
                aria-label={allExpanded ? 'Collapse all' : 'Expand all'}
              >
                {allExpanded ? <ChevronsDownUp className="h-4 w-4 mr-2" /> : <ChevronsUpDown className="h-4 w-4 mr-2" />}
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
            )}
          </div>

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="space-y-8">
              {filteredGroups.map(group => (
                <div key={group.code} className="space-y-4">
                  {/* Group card — the whole sector (e.g. 110 Education), full width */}
                  <CardShell
                    href={`/sectors/${group.code}`}
                    ariaLabel={`${group.code}: ${group.name}`}
                    bannerColor={getSectorColor(group.code)}
                    bannerActions={canEdit ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/sectors/${group.code}/edit`) }}
                        className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit sector"
                        aria-label="Edit sector"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : undefined}
                    bannerImage={banners[group.code]}
                    bannerContent={!banners[group.code] ? (
                      <div className="h-full w-full flex items-center justify-center pointer-events-none">
                        <span className="text-6xl font-bold text-white/15 font-mono">{group.code}</span>
                      </div>
                    ) : undefined}
                    bannerOverlay={
                      <h2 className="text-xl font-bold text-white leading-tight">
                        {group.name}
                      </h2>
                    }
                  >
                    <div className="relative flex-1 p-5 flex items-center justify-between bg-card">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-body font-medium">
                          {group.activityCount} {group.activityCount === 1 ? 'activity' : 'activities'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-helper text-muted-foreground">
                        {group.totalValue > 0 ? (
                          <span className="font-semibold text-foreground">{formatCurrencyShort(group.totalValue)}</span>
                        ) : (
                          <span>No financial data</span>
                        )}
                        <span>{group.categories.length} sub-sector{group.categories.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </CardShell>

                  {/* Sub-sector cards — narrower + indented under the group card to show nesting */}
                  <div className="ml-4 pl-5 border-l-2 border-border">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {group.categories.map(cat => (
                      <CardShell
                        key={cat.code}
                        href={`/sectors/${cat.code}`}
                        ariaLabel={`${cat.code}: ${cat.name}`}
                        bannerColor={getSectorColor(group.code)}
                        bannerActions={canEdit ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/sectors/${cat.code}/edit`) }}
                            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit sector"
                            aria-label="Edit sector"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : undefined}
                        bannerImage={banners[cat.code]}
                        bannerContent={!banners[cat.code] ? (
                          <div className="h-full w-full flex items-center justify-center pointer-events-none">
                            <span className="text-5xl font-bold text-white/15 font-mono">{cat.code}</span>
                          </div>
                        ) : undefined}
                        bannerOverlay={
                          <h2 className="text-body font-bold text-white leading-tight">
                            {cat.name}
                          </h2>
                        }
                      >
                        <div className="relative flex-1 p-5 flex flex-col bg-card">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              <span className="text-body font-medium">
                                {cat.activityCount} {cat.activityCount === 1 ? 'activity' : 'activities'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-helper text-muted-foreground mt-auto pt-3 border-t border-border">
                            {cat.totalValue > 0 ? (
                              <span className="font-semibold text-foreground">{formatCurrencyShort(cat.totalValue)}</span>
                            ) : (
                              <span>No financial data</span>
                            )}
                            {cat.sectors && cat.sectors.length > 0 && (
                              <span>{cat.sectors.length} sub-sectors</span>
                            )}
                          </div>
                        </div>
                      </CardShell>
                      ))}
                      </div>
                    </div>
                  </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm ? `No sectors matching "${searchTerm}"` : 'No sector data found'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hierarchical tree */}
          {viewMode === 'list' && <div className="border border-border rounded-lg overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 px-3 py-2 bg-surface-muted border-b border-border text-section-label font-medium text-muted-foreground uppercase">
              <div className="w-4 flex-shrink-0" />
              <div className="w-12 flex-shrink-0">Code</div>
              <div className="flex-1">Name</div>
              <div className="w-24 text-right flex-shrink-0">Activities</div>
              <div className="w-24 text-right flex-shrink-0">Funding</div>
            </div>

            {filteredGroups.map((group, groupIdx) => {
              const isGroupExpanded = expandedGroups.has(group.code)

              return (
                <div key={group.code}>
                  {/* Group level */}
                  <div
                    className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors ${groupIdx > 0 ? 'border-t border-border' : ''}`}
                  >
                    <button onClick={() => toggleGroup(group.code)} className="flex-shrink-0 w-4">
                      {isGroupExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 inline-block align-middle mr-2">{group.code}</code>
                      <Link
                        href={`/sectors/${group.code}`}
                        className="font-semibold text-foreground text-body hover:text-blue-600"
                      >
                        {group.name}
                      </Link>
                    </div>
                    <div className="w-24 text-right flex-shrink-0">
                      {group.activityCount > 0 ? (
                        <span className="text-body text-foreground">{group.activityCount}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </div>
                    <div className="w-24 text-right flex-shrink-0">
                      <UsdAmount value={group.totalValue} />
                    </div>
                  </div>

                  {/* Categories */}
                  {isGroupExpanded && (
                    <div>
                      {group.categories.map(cat => {
                        const isCatExpanded = expandedCategories.has(cat.code)

                        return (
                          <div key={cat.code}>
                            <div
                              className="flex items-center gap-3 px-3 py-2.5 pl-10 border-t border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => toggleCategory(cat.code)}
                            >
                              <div className="flex-shrink-0 w-4">
                                {cat.sectors && cat.sectors.length > 0 ? (
                                  isCatExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  )
                                ) : (
                                  <div className="w-3.5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <code className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 inline-block align-middle mr-2">{cat.code}</code>
                                <Link
                                  href={`/sectors/${cat.code}`}
                                  onClick={e => e.stopPropagation()}
                                  className="font-medium text-foreground text-body hover:text-blue-600"
                                >
                                  {cat.name}
                                </Link>
                              </div>
                              <div className="w-24 text-right flex-shrink-0">
                                {cat.activityCount > 0 ? (
                                  <span className="text-body text-foreground">{cat.activityCount}</span>
                                ) : (
                                  <span className="text-muted-foreground">–</span>
                                )}
                              </div>
                              <div className="w-24 text-right flex-shrink-0">
                                <UsdAmount value={cat.totalValue} />
                              </div>
                            </div>

                            {/* Sectors (5-digit) */}
                            {isCatExpanded && cat.sectors && (
                              <div>
                                {cat.sectors.map(sector => (
                                  <Link
                                    key={sector.code}
                                    href={`/sectors/${sector.code}`}
                                    className="flex items-center gap-3 px-3 py-2 pl-16 border-t border-border/30 hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="w-4 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <code className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 inline-block align-middle mr-2">{sector.code}</code>
                                      <span className="text-body text-muted-foreground">{sector.name}</span>
                                    </div>
                                    <div className="w-24 text-right flex-shrink-0">
                                      {sector.activityCount > 0 ? (
                                        <span className="text-body text-foreground">{sector.activityCount}</span>
                                      ) : (
                                        <span className="text-muted-foreground">–</span>
                                      )}
                                    </div>
                                    <div className="w-24 text-right flex-shrink-0">
                                      <UsdAmount value={sector.totalValue} />
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredGroups.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? `No sectors matching "${searchTerm}"` : 'No sector data found'}
                </p>
              </div>
            )}
          </div>}
        </div>
      </div>
    </MainLayout>
  )
}
