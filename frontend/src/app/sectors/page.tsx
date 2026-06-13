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
import { AlertCircle, ChevronRight, ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Search, PieChart, List, LayoutGrid, Activity, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import { formatCurrencyShort } from '@/lib/format'
import { UsdAmount } from '@/components/ui/usd-amount'
import { getBroadCategoryForGroup, BROAD_CATEGORY_ORDER } from '@/lib/sector-hierarchy'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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

interface BroadCategoryStat {
  code: string
  name: string
  activityCount: number
  totalValue: number
}

interface SummaryData {
  groups: GroupNode[]
  broadCategories?: BroadCategoryStat[]
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
  const [collapsedBroad, setCollapsedBroad] = useState<Set<string>>(new Set())
  // List/table view: broad rows are collapsed by default (drill-to-expand),
  // unlike the card view where broad sections are expanded by default.
  const [expandedBroad, setExpandedBroad] = useState<Set<string>>(new Set())
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

  const toggleBroadRow = (code: string) => {
    setExpandedBroad(prev => {
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

  const toggleBroad = (code: string) => {
    setCollapsedBroad(prev => {
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

  // Group the visible groups under their OECD broad category for the card view.
  // Header aggregates come from the API's distinct broad rollup (single source
  // of truth); groups within a section and sections themselves sort by $ desc.
  const broadSections = useMemo(() => {
    const lookup = new Map<string, BroadCategoryStat>()
    ;(data?.broadCategories || []).forEach(b => lookup.set(b.code, b))

    const byBroad = new Map<string, GroupNode[]>()
    filteredGroups.forEach(g => {
      const broad = getBroadCategoryForGroup(g.code)
      if (!byBroad.has(broad.code)) byBroad.set(broad.code, [])
      byBroad.get(broad.code)!.push(g)
    })

    return Array.from(byBroad.entries())
      .map(([code, groups]) => {
        const meta = BROAD_CATEGORY_ORDER.find(b => b.code === code)
        const stat = lookup.get(code)
        const groupsSorted = [...groups].sort((a, b) => b.totalValue - a.totalValue)
        return {
          code,
          name: meta?.name || 'Other / Non-Sector Allocable',
          groups: groupsSorted,
          activityCount: stat?.activityCount ?? 0,
          totalValue: stat?.totalValue ?? groupsSorted.reduce((s, g) => s + g.totalValue, 0),
        }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
  }, [filteredGroups, data])

  const allExpanded = broadSections.length > 0
    && expandedBroad.size >= broadSections.length
    && expandedGroups.size >= filteredGroups.length

  const toggleExpandAll = () => {
    if (!data) return
    if (allExpanded) {
      setExpandedBroad(new Set())
      setExpandedGroups(new Set())
      setExpandedCategories(new Set())
    } else {
      setExpandedBroad(new Set(broadSections.map(s => s.code)))
      setExpandedGroups(new Set(filteredGroups.map(g => g.code)))
      const cats = new Set<string>()
      filteredGroups.forEach(g => g.categories.forEach(c => cats.add(c.code)))
      setExpandedCategories(cats)
    }
  }

  // Card view: broad sections default expanded, so "expand all" = no section
  // collapsed. Collapse/expand all toggles every broad section at once.
  const cardAllExpanded = broadSections.length > 0 && collapsedBroad.size === 0
  const toggleExpandAllCards = () => {
    if (cardAllExpanded) {
      setCollapsedBroad(new Set(broadSections.map(s => s.code)))
    } else {
      setCollapsedBroad(new Set())
    }
  }

  // Auto-expand when searching
  useMemo(() => {
    if (searchTerm.trim()) {
      setExpandedBroad(new Set(broadSections.map(s => s.code)))
      setExpandedGroups(new Set(filteredGroups.map(g => g.code)))
      const cats = new Set<string>()
      filteredGroups.forEach(g => g.categories.forEach(c => cats.add(c.code)))
      setExpandedCategories(cats)
    }
  }, [searchTerm, filteredGroups, broadSections])

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

  // Full-width panel listing a category's funded 5-digit purpose codes ($ desc).
  const renderSectorPanel = (sectors: SectorNode[] = [], keyPrefix: string) => {
    const funded = sectors
      .filter(s => s.totalValue > 0 || s.activityCount > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
    if (funded.length === 0) return null
    return (
      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
        <div className="text-section-label font-medium text-muted-foreground uppercase mb-3">
          Purpose codes
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {funded.map(s => (
            <Link
              key={`${keyPrefix}-${s.code}`}
              href={`/sectors/${s.code}`}
              className="flex flex-col rounded-xl border border-border bg-card p-3 hover:shadow-md hover:border-foreground/20 transition-all"
            >
              <code className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 self-start mb-1.5">{s.code}</code>
              <span className="text-helper font-medium text-foreground leading-tight line-clamp-2 min-h-[2.2em] mb-2">{s.name}</span>
              <div className="mt-auto flex items-center justify-between gap-1 pt-2 border-t border-border">
                <span className="text-helper font-semibold text-foreground">{formatCurrencyShort(s.totalValue)}</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{s.activityCount} {s.activityCount === 1 ? 'activity' : 'activities'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Banner visual wrapped in a link so the WHOLE banner (image or faint code
  // number) navigates to the sector profile — not just the title text.
  const sectorBannerLink = (code: string, numberClass: string) => (
    <Link
      href={`/sectors/${code}`}
      className="absolute inset-0 block"
      aria-label={`View ${code} profile`}
    >
      {banners[code] ? (
        <img
          src={banners[code]}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <span className={`${numberClass} font-bold text-white/15 font-mono`}>{code}</span>
        </div>
      )}
    </Link>
  )

  // Render a single group: full-width banner + either its category-card grid
  // (each card inline-expandable to its 5-digit codes) or, for single-child
  // duplicate groups like 130, an expandable banner straight to the 5-digit codes.
  const renderGroupCard = (group: GroupNode) => {
    const cats = group.categories || []
    const isDuplicate = cats.length === 1 && cats[0].code === group.code
    const dupExpanded = isDuplicate && expandedCategories.has(group.code)
    const dupFunded = isDuplicate
      ? cats[0].sectors.filter(s => s.totalValue > 0 || s.activityCount > 0).length
      : 0

    return (
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
          bannerContent={sectorBannerLink(group.code, 'text-6xl')}
          bannerOverlay={
            <h2 className="text-xl font-bold text-white leading-tight">
              <Link
                href={`/sectors/${group.code}`}
                className="relative z-10 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {group.name}
              </Link>
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
              {isDuplicate ? (
                dupFunded > 0 ? (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCategory(group.code) }}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    aria-label={dupExpanded ? 'Hide purpose codes' : 'Show purpose codes'}
                  >
                    {dupExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {dupFunded} code{dupFunded === 1 ? '' : 's'}
                  </button>
                ) : (
                  <span>No purpose codes</span>
                )
              ) : (
                <span>{cats.length} sub-sector{cats.length === 1 ? '' : 's'}</span>
              )}
            </div>
          </div>
        </CardShell>

        {/* Single-child duplicate (e.g. 130): expand the banner straight to 5-digit */}
        {isDuplicate && dupExpanded && renderSectorPanel(cats[0].sectors, group.code)}

        {/* Sub-sector cards — narrower + indented under the group card to show nesting */}
        {!isDuplicate && (
          <div className="ml-4 pl-5 border-l-2 border-border">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[...cats].sort((a, b) => b.totalValue - a.totalValue).map(cat => {
                const expanded = expandedCategories.has(cat.code)
                const funded = (cat.sectors || []).filter(s => s.totalValue > 0 || s.activityCount > 0).length
                return (
                  <React.Fragment key={cat.code}>
                    <CardShell
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
                      bannerContent={sectorBannerLink(cat.code, 'text-5xl')}
                      bannerOverlay={
                        <h2 className="text-body font-bold text-white leading-tight">
                          <Link
                            href={`/sectors/${cat.code}`}
                            className="relative z-10 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cat.name}
                          </Link>
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
                          {funded > 0 && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCategory(cat.code) }}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                              aria-label={expanded ? 'Hide purpose codes' : 'Show purpose codes'}
                            >
                              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              {funded} code{funded === 1 ? '' : 's'}
                            </button>
                          )}
                        </div>
                      </div>
                    </CardShell>
                    {expanded && funded > 0 && (
                      <div className="col-span-full mb-2">
                        {renderSectorPanel(cat.sectors, cat.code)}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // One row of the list/table view, rendered with the shared <Table> primitives.
  // The 4-level tree (broad → group → category → 5-digit) is flattened into rows;
  // indentation conveys depth. Row click toggles expansion; the name/edit links
  // stopPropagation so they navigate instead of toggling.
  const renderTreeRow = (opts: {
    code: string
    name: string
    level: number
    activityCount: number
    totalValue: number
    expandable: boolean
    isExpanded: boolean
    onToggle?: () => void
    nameClass: string
    topBorder?: boolean
    editable: boolean
  }) => {
    const { code, name, level, activityCount, totalValue, expandable, isExpanded, onToggle, nameClass, topBorder, editable } = opts
    const chevronSize = level === 0 ? 'h-4 w-4' : 'h-3.5 w-3.5'
    return (
      <TableRow
        key={code}
        onClick={onToggle}
        className={`group/row ${topBorder ? 'border-t-2 border-border' : ''} ${onToggle ? 'cursor-pointer' : ''}`}
      >
        <TableCell className="py-2.5 align-middle">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 1.5}rem` }}>
            <span className="w-4 flex-shrink-0 inline-flex items-center">
              {expandable ? (isExpanded
                ? <ChevronDown className={`${chevronSize} text-muted-foreground`} />
                : <ChevronRight className={`${chevronSize} text-muted-foreground`} />) : null}
            </span>
            <code className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">{code}</code>
            <Link href={`/sectors/${code}`} onClick={e => e.stopPropagation()} className={`${nameClass} hover:text-blue-600`}>{name}</Link>
          </div>
        </TableCell>
        <TableCell className="py-2.5 align-middle text-right">
          {activityCount > 0 ? <span className="text-foreground">{activityCount}</span> : <span className="text-muted-foreground">–</span>}
        </TableCell>
        <TableCell className="py-2.5 align-middle text-right"><UsdAmount value={totalValue} /></TableCell>
        {canEdit && (
          <TableCell className="py-2.5 align-middle text-right">
            {editable && (
              <Link
                href={`/sectors/${code}/edit`}
                onClick={e => e.stopPropagation()}
                className="inline-flex opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                title="Edit sector"
                aria-label={`Edit ${name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            )}
          </TableCell>
        )}
      </TableRow>
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
                DAC CRS Purpose Codes: {data.totals.activeSectors} active sectors across {data.totals.totalActivities} activities
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
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center border rounded-md flex-shrink-0">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-r-none h-9">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="rounded-l-none h-9">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            {viewMode === 'list' ? (
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
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleExpandAllCards}
                disabled={broadSections.length === 0}
                aria-label={cardAllExpanded ? 'Collapse all' : 'Expand all'}
              >
                {cardAllExpanded ? <ChevronsDownUp className="h-4 w-4 mr-2" /> : <ChevronsUpDown className="h-4 w-4 mr-2" />}
                {cardAllExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
            )}
          </div>

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="space-y-10">
              {broadSections.map(section => {
                const collapsed = collapsedBroad.has(section.code)
                return (
                  <section key={section.code}>
                    {/* Broad-category section header (OECD top tier).
                        Chevron toggles collapse; code + title link to the profile. */}
                    <div className="w-full flex items-center gap-3 pb-3 mb-5 border-b border-border">
                      <button
                        onClick={() => toggleBroad(section.code)}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
                      >
                        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                      <Link
                        href={`/sectors/${section.code}`}
                        className="flex items-center gap-3 flex-1 min-w-0 group/broad"
                        aria-label={`${section.code}: ${section.name}`}
                      >
                        <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-1 flex-shrink-0">{section.code}</span>
                        <h2 className="text-2xl font-bold text-foreground min-w-0 truncate group-hover/broad:underline">{section.name}</h2>
                      </Link>
                      <div className="flex items-center gap-4 text-helper text-muted-foreground flex-shrink-0">
                        {section.activityCount > 0 && (
                          <span>{section.activityCount} {section.activityCount === 1 ? 'activity' : 'activities'}</span>
                        )}
                        {section.totalValue > 0 && (
                          <span className="font-semibold text-foreground text-base">{formatCurrencyShort(section.totalValue)}</span>
                        )}
                      </div>
                    </div>

                    {!collapsed && (
                      <div className="space-y-8">
                        {section.groups.map(group => renderGroupCard(group))}
                      </div>
                    )}
                  </section>
                )
              })}
              {filteredGroups.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm ? `No sectors matching "${searchTerm}"` : 'No sector data found'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hierarchical tree — shared <Table>, 4-level expand/collapse as rows */}
          {viewMode === 'list' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right whitespace-nowrap w-28">Activities</TableHead>
                  <TableHead className="text-right whitespace-nowrap w-44">Committed + Disbursed</TableHead>
                  {canEdit && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadSections.map((section, sectionIdx) => {
                  const isBroadExpanded = expandedBroad.has(section.code)
                  return (
                    <React.Fragment key={section.code}>
                      {renderTreeRow({
                        code: section.code, name: section.name, level: 0,
                        activityCount: section.activityCount, totalValue: section.totalValue,
                        expandable: true, isExpanded: isBroadExpanded,
                        onToggle: () => toggleBroadRow(section.code),
                        nameClass: 'font-bold text-foreground text-body',
                        topBorder: sectionIdx > 0, editable: true,
                      })}
                      {isBroadExpanded && section.groups.map(group => {
                        const isGroupExpanded = expandedGroups.has(group.code)
                        return (
                          <React.Fragment key={group.code}>
                            {renderTreeRow({
                              code: group.code, name: group.name, level: 1,
                              activityCount: group.activityCount, totalValue: group.totalValue,
                              expandable: true, isExpanded: isGroupExpanded,
                              onToggle: () => toggleGroup(group.code),
                              nameClass: 'font-semibold text-foreground text-body', editable: true,
                            })}
                            {isGroupExpanded && group.categories.map(cat => {
                              const isCatExpanded = expandedCategories.has(cat.code)
                              const hasSectors = !!(cat.sectors && cat.sectors.length > 0)
                              return (
                                <React.Fragment key={cat.code}>
                                  {renderTreeRow({
                                    code: cat.code, name: cat.name, level: 2,
                                    activityCount: cat.activityCount, totalValue: cat.totalValue,
                                    expandable: hasSectors, isExpanded: isCatExpanded,
                                    onToggle: hasSectors ? () => toggleCategory(cat.code) : undefined,
                                    nameClass: 'font-medium text-foreground text-body', editable: true,
                                  })}
                                  {isCatExpanded && cat.sectors && cat.sectors.map(sector =>
                                    renderTreeRow({
                                      code: sector.code, name: sector.name, level: 3,
                                      activityCount: sector.activityCount, totalValue: sector.totalValue,
                                      expandable: false, isExpanded: false,
                                      nameClass: 'text-muted-foreground text-body', editable: false,
                                    })
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
                {filteredGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground py-8">
                      {searchTerm ? `No sectors matching "${searchTerm}"` : 'No sector data found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
