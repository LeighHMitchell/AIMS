"use client"

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { AlertCircle, ChevronRight, ChevronDown, Search, DollarSign, BarChart3, Activity } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { getSectorColor } from '@/lib/sector-colors'

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

function formatCurrencyShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

export default function SectorsListingPage() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

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
        <div className="min-h-screen">
          <div className="w-full p-6">
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full mb-2" />
            ))}
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
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Sectors</h2>
                <p className="text-slate-600">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const topGroup = [...data.groups].sort((a, b) => b.totalValue - a.totalValue)[0]

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Sectors</h1>
            <p className="text-sm text-slate-500">
              DAC CRS Purpose Codes — {data.totals.activeSectors} active sectors across {data.totals.totalActivities} activities
            </p>
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total Funding</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrencyShort(data.totals.totalFunding)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-600">Active Sectors</p>
                    <p className="text-xl font-bold text-slate-900">{data.totals.activeSectors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-600">Top Sector Group</p>
                    <p className="text-xl font-bold text-slate-900 truncate">{topGroup?.name || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Hierarchical tree */}
          <div className="space-y-1">
            {filteredGroups.map(group => {
              const isGroupExpanded = expandedGroups.has(group.code)
              const groupColor = getSectorColor(group.code)

              return (
                <div key={group.code}>
                  {/* Group level */}
                  <div
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    style={{ borderLeft: `4px solid ${groupColor}` }}
                  >
                    <button onClick={() => toggleGroup(group.code)} className="flex-shrink-0">
                      {isGroupExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    <code className="text-xs font-mono font-bold text-slate-500 flex-shrink-0 w-8">{group.code}</code>
                    <Link
                      href={`/sectors/${group.code}`}
                      className="font-semibold text-slate-900 text-sm flex-1 text-left hover:text-blue-600"
                    >
                      {group.name}
                    </Link>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {group.activityCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {group.activityCount} activities
                        </Badge>
                      )}
                      {group.totalValue > 0 && (
                        <span className="text-xs font-medium text-slate-500">{formatCurrencyShort(group.totalValue)}</span>
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  {isGroupExpanded && (
                    <div className="ml-8 space-y-0.5">
                      {group.categories.map(cat => {
                        const isCatExpanded = expandedCategories.has(cat.code)

                        return (
                          <div key={cat.code}>
                            <button
                              onClick={() => toggleCategory(cat.code)}
                              className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 transition-colors ml-2"
                            >
                              {cat.sectors && cat.sectors.length > 0 ? (
                                isCatExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                )
                              ) : (
                                <div className="w-3.5" />
                              )}
                              <code className="text-xs font-mono text-slate-400 flex-shrink-0 w-8">{cat.code}</code>
                              <Link
                                href={`/sectors/${cat.code}`}
                                onClick={e => e.stopPropagation()}
                                className="font-medium text-slate-700 text-sm flex-1 text-left hover:text-blue-600"
                              >
                                {cat.name}
                              </Link>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {cat.activityCount > 0 && (
                                  <span className="text-[10px] text-slate-400">{cat.activityCount}</span>
                                )}
                                {cat.totalValue > 0 && (
                                  <span className="text-xs text-slate-400">{formatCurrencyShort(cat.totalValue)}</span>
                                )}
                              </div>
                            </button>

                            {/* Sectors (5-digit) */}
                            {isCatExpanded && cat.sectors && (
                              <div className="ml-10 space-y-0.5">
                                {cat.sectors.map(sector => (
                                  <Link
                                    key={sector.code}
                                    href={`/sectors/${sector.code}`}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors ml-4"
                                  >
                                    <code className="text-xs font-mono text-slate-400 flex-shrink-0 w-12">{sector.code}</code>
                                    <span className="text-sm text-slate-600 flex-1">{sector.name}</span>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      {sector.activityCount > 0 && (
                                        <span className="text-[10px] text-slate-400">{sector.activityCount}</span>
                                      )}
                                      {sector.totalValue > 0 && (
                                        <span className="text-xs text-slate-400">{formatCurrencyShort(sector.totalValue)}</span>
                                      )}
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
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">
                    {searchTerm ? `No sectors matching "${searchTerm}"` : 'No sector data found'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
