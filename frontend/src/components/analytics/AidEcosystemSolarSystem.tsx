"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { LoadingText } from '@/components/ui/loading-text'
import { Button } from '@/components/ui/button'
import { AlertCircle, SlidersHorizontal, Search, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getOrgTypeLabel } from '@/lib/org-type-mappings'
import { useRouter } from 'next/navigation'
// @ts-ignore
import sectorGroupData from '@/data/SectorGroup.json'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils'

/**
 * Aid Ecosystem Solar System
 *
 * Figure 3 equivalent: organisational gravity and hierarchy
 *
 * This chart visualizes the relative financial gravity of organisations in the
 * aid ecosystem using a radial/concentric layout. Organizations are positioned
 * in rings based on their transaction volume rank.
 *
 * Ring logic:
 * - Inner ring: Top 10% of organizations by transaction volume
 * - Middle ring: Next 30% (10-40%)
 * - Outer ring: Remaining 60%
 *
 * Visual encoding:
 * - Node radius: Scaled by transaction volume (logarithmic)
 * - Node color: Organization type
 * - Position: Evenly distributed angularly within each ring
 *
 * Interactivity:
 * - Hover: Show tooltip with org details
 * - Click: Navigate to organization profile page
 *
 * TODO: Optional future node2vec/UMAP pipeline for advanced clustering
 * TODO: Export as image or CSV
 */

/**
 * Custom color palette for Aid Ecosystem visualization
 * Primary: #dc2625 (red), #c9a24d (gold), #5f7f7a (teal), #7b95a7 (blue-gray)
 * Neutral: #4c5568 (dark slate), #cfd0d5 (light gray), #f1f4f8 (off-white)
 */

// Organization type colors - custom palette
const ORG_TYPE_COLORS: Record<string, string> = {
  // Government family - blue-gray tones
  '10': '#5a7a8a',   // Government - darker blue-gray
  '11': '#7b95a7',   // Local Government - blue-gray (primary)
  '15': '#9ab0bc',   // Other Public Sector - lighter blue-gray

  // NGO family - teal/sage tones
  '21': '#4a6b66',   // International NGO - darker teal
  '22': '#5f7f7a',   // National NGO - teal (primary)
  '23': '#7a9994',   // Regional NGO - medium teal
  '24': '#96b3ae',   // Partner Country NGO - lighter teal

  // Partnership & Multilateral - accent colors
  '30': '#8b6d5c',   // Public Private Partnership - warm brown
  '40': '#dc2625',   // Multilateral - red (primary)

  // Foundation - gold
  '60': '#c9a24d',   // Foundation - gold (primary)

  // Private Sector family - slate tones
  '70': '#4c5568',   // Private Sector - dark slate (primary)
  '71': '#3d4555',   // Private Sector Provider - darker slate
  '72': '#6b7280',   // Private Sector Recipient - medium slate
  '73': '#9ca3af',   // Private Sector Third - light slate

  // Academic & Other
  '80': '#7c6f9c',   // Academic - muted purple
  '90': '#8b9298',   // Other - neutral gray

  // Fallback for text-based types
  'Government': '#7b95a7',
  'International Financial Institution': '#dc2625',
  'Other Multilateral': '#e05a59',
}

// Ring colors - using palette with transparency
const RING_COLORS = {
  inner: 'rgba(220, 38, 37, 0.10)',   // Red tint for top 10%
  middle: 'rgba(201, 162, 77, 0.10)', // Gold tint for next 30%
  outer: 'rgba(76, 85, 104, 0.06)'    // Slate tint for bottom 60%
}

// Ring stroke colors - using palette
const RING_STROKES = {
  inner: '#dc2625',   // Red for inner ring
  middle: '#c9a24d',  // Gold for middle ring
  outer: '#cfd0d5'    // Light gray for outer ring
}

interface EcosystemOrganization {
  id: string
  name: string
  acronym: string | null
  organisationType: string | null
  totalValue: number
  humanitarianValue: number
  developmentValue: number
  outgoingValue: number
  incomingValue: number
  humanitarianScore: number
  funderScore: number
  rank: number
  ringTier: 'inner' | 'middle' | 'outer'
}

// Sector filtering types
type AggregationLevel = 'group' | 'category' | 'sector'

interface SectorItem {
  code: string
  name: string
  groupCode?: string
  groupName?: string
  categoryCode?: string
  categoryName?: string
}

interface AidEcosystemSolarSystemProps {
  dateRange?: { from: Date; to: Date }
  refreshKey?: number
  flowType?: string
  includeHumanitarian?: boolean
  compact?: boolean
  onDataChange?: (data: EcosystemOrganization[]) => void
}

// Format currency for display
const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function AidEcosystemSolarSystem({
  dateRange,
  refreshKey = 0,
  flowType = 'all',
  includeHumanitarian = true,
  compact = false,
  onDataChange
}: AidEcosystemSolarSystemProps) {
  const [data, setData] = useState<EcosystemOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredOrg, setHoveredOrg] = useState<EcosystemOrganization | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Sector filtering state
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>('group')
  const [visibleSectors, setVisibleSectors] = useState<Set<string>>(new Set())
  const [pendingSectors, setPendingSectors] = useState<Set<string>>(new Set()) // Working selection in dropdown
  const [sectorFilterSearch, setSectorFilterSearch] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Process sector data based on aggregation level
  const aggregatedSectorData = useMemo(() => {
    const rawData = sectorGroupData?.data || []

    if (aggregationLevel === 'sector') {
      // 5-digit subsector level - return unique codes
      const seen = new Set<string>()
      return rawData
        .filter((item: any) => {
          const code = item.code
          if (!code || code.length !== 5 || seen.has(code)) return false
          seen.add(code)
          return true
        })
        .map((item: any) => ({
          code: item.code,
          name: item.name || `Sector ${item.code}`,
          groupCode: item['codeforiati:group-code'],
          groupName: item['codeforiati:group-name'],
          categoryCode: item['codeforiati:category-code'],
          categoryName: item['codeforiati:category-name']
        }))
        .sort((a: SectorItem, b: SectorItem) => a.code.localeCompare(b.code))
    } else if (aggregationLevel === 'category') {
      // 3-digit sector category level
      const categoryMap = new Map<string, SectorItem>()
      rawData.forEach((item: any) => {
        const code = item['codeforiati:category-code']
        const name = item['codeforiati:category-name']
        if (code && !categoryMap.has(code)) {
          categoryMap.set(code, {
            code,
            name: name || `Sector ${code}`,
            groupCode: item['codeforiati:group-code'],
            groupName: item['codeforiati:group-name']
          })
        }
      })
      return Array.from(categoryMap.values()).sort((a, b) => a.code.localeCompare(b.code))
    } else {
      // 'group' - sector category level (DAC 1-digit groups like 110, 120, etc.)
      const groupMap = new Map<string, SectorItem>()
      rawData.forEach((item: any) => {
        const code = item['codeforiati:group-code']
        const name = item['codeforiati:group-name']
        if (code && !groupMap.has(code)) {
          groupMap.set(code, {
            code,
            name: name || `Category ${code}`
          })
        }
      })
      return Array.from(groupMap.values()).sort((a, b) => a.code.localeCompare(b.code))
    }
  }, [aggregationLevel])

  // Filter sectors by search term
  const filteredSectors = useMemo(() => {
    if (!sectorFilterSearch.trim()) return aggregatedSectorData
    const search = sectorFilterSearch.toLowerCase()
    return aggregatedSectorData.filter((s: SectorItem) =>
      s.code.toLowerCase().includes(search) ||
      s.name.toLowerCase().includes(search)
    )
  }, [aggregatedSectorData, sectorFilterSearch])

  // Expand selected codes to 5-digit codes for API filtering
  const expandSectorCodes = useCallback((codes: Set<string>): string[] => {
    if (codes.size === 0) return []

    const rawData = sectorGroupData?.data || []
    const expandedCodes = new Set<string>()

    codes.forEach(code => {
      if (aggregationLevel === 'sector') {
        // Already 5-digit, use as-is
        expandedCodes.add(code)
      } else if (aggregationLevel === 'category') {
        // 3-digit: find all 5-digit codes under this category
        rawData.forEach((item: any) => {
          if (item['codeforiati:category-code'] === code && item.code?.length === 5) {
            expandedCodes.add(item.code)
          }
        })
      } else {
        // group: find all 5-digit codes under this group
        rawData.forEach((item: any) => {
          if (item['codeforiati:group-code'] === code && item.code?.length === 5) {
            expandedCodes.add(item.code)
          }
        })
      }
    })

    return Array.from(expandedCodes)
  }, [aggregationLevel])

  // Toggle sector visibility in pending selection (not applied until dropdown closes)
  const toggleSectorVisibility = (code: string) => {
    setPendingSectors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(code)) {
        newSet.delete(code)
      } else {
        newSet.add(code)
      }
      return newSet
    })
  }

  // Select all sectors (pending)
  const selectAllSectors = () => {
    setPendingSectors(new Set(aggregatedSectorData.map((s: SectorItem) => s.code)))
  }

  // Clear all sectors (pending)
  const clearAllSectors = () => {
    setPendingSectors(new Set())
  }

  // Select top N sectors (pending)
  const selectTopNSectors = (n: number) => {
    const topCodes = aggregatedSectorData.slice(0, n).map((s: SectorItem) => s.code)
    setPendingSectors(new Set(topCodes))
  }

  // Handle dropdown open/close - apply pending selection when closed
  const handleFilterOpenChange = (open: boolean) => {
    if (open) {
      // Opening: sync pending with current visible
      setPendingSectors(new Set(visibleSectors))
    } else {
      // Closing: apply pending selection to trigger refresh
      setVisibleSectors(new Set(pendingSectors))
    }
    setIsFilterOpen(open)
  }

  // Reset sector selection when aggregation level changes
  useEffect(() => {
    setVisibleSectors(new Set())
    setPendingSectors(new Set())
    setSectorFilterSearch('')
  }, [aggregationLevel])

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        flowType,
        includeHumanitarian: includeHumanitarian.toString(),
        transactionType: '3' // Disbursements only
      })

      if (dateRange?.from) {
        params.set('dateFrom', dateRange.from.toISOString())
      }
      if (dateRange?.to) {
        params.set('dateTo', dateRange.to.toISOString())
      }

      // Add sector filter if any sectors selected
      if (visibleSectors.size > 0) {
        const expandedCodes = expandSectorCodes(visibleSectors)
        if (expandedCodes.length > 0) {
          params.set('sectors', expandedCodes.join(','))
        }
      }

      const response = await apiFetch(`/api/analytics/ecosystem?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch ecosystem data')
      }

      setData(result.data || [])
      onDataChange?.(result.data || [])
    } catch (err) {
      console.error('[AidEcosystemSolarSystem] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [dateRange, flowType, includeHumanitarian, onDataChange, visibleSectors, expandSectorCodes])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshKey])

  // Get chart dimensions based on container
  const dimensions = useMemo(() => {
    const size = compact ? 300 : 600
    return {
      width: size,
      height: size,
      margin: compact ? 20 : 40
    }
  }, [compact])

  // Calculate ring radii and node positions
  const chartData = useMemo(() => {
    if (!data.length) return { nodes: [], rings: [] }

    const { width, height, margin } = dimensions
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - margin

    // Ring radii (as fractions of max radius)
    const rings = [
      { tier: 'inner' as const, innerRadius: 0.15, outerRadius: 0.35 },
      { tier: 'middle' as const, innerRadius: 0.40, outerRadius: 0.65 },
      { tier: 'outer' as const, innerRadius: 0.70, outerRadius: 0.95 }
    ]

    // Calculate node sizes (square root scaling for better visual differentiation)
    const maxValue = Math.max(...data.map(d => d.totalValue))
    const minValue = Math.min(...data.map(d => d.totalValue))
    const minNodeSize = compact ? 4 : 8
    const maxNodeSize = compact ? 25 : 50

    // Group organizations by ring tier
    const orgsByTier: Record<string, EcosystemOrganization[]> = {
      inner: [],
      middle: [],
      outer: []
    }
    data.forEach(org => {
      orgsByTier[org.ringTier].push(org)
    })

    // Position nodes within each ring
    const nodes: Array<{
      org: EcosystemOrganization
      x: number
      y: number
      radius: number
      color: string
    }> = []

    rings.forEach(ring => {
      const orgs = orgsByTier[ring.tier]
      const ringRadius = ((ring.innerRadius + ring.outerRadius) / 2) * maxRadius
      const angleStep = (2 * Math.PI) / Math.max(orgs.length, 1)
      // Random offset for visual variety
      const angleOffset = Math.random() * Math.PI * 2

      orgs.forEach((org, i) => {
        const angle = angleOffset + i * angleStep
        // Add slight radial jitter for overlapping prevention
        const jitter = (Math.random() - 0.5) * 0.1 * maxRadius * (ring.outerRadius - ring.innerRadius)
        const r = ringRadius + jitter

        // Calculate node size using square root scaling for better visual differentiation
        // Square root makes large values stand out more than log scaling
        const sizeRatio = Math.sqrt((org.totalValue - minValue) / (maxValue - minValue || 1))
        const nodeRadius = minNodeSize + sizeRatio * (maxNodeSize - minNodeSize)

        nodes.push({
          org,
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle),
          radius: nodeRadius,
          color: ORG_TYPE_COLORS[org.organisationType || '90'] || '#6b7280'
        })
      })
    })

    return {
      nodes,
      rings: rings.map(ring => ({
        ...ring,
        radius: ((ring.innerRadius + ring.outerRadius) / 2) * maxRadius,
        innerRadiusPx: ring.innerRadius * maxRadius,
        outerRadiusPx: ring.outerRadius * maxRadius
      })),
      centerX,
      centerY,
      maxRadius
    }
  }, [data, dimensions, compact])

  // Handle node click - navigate to organization
  const handleNodeClick = (org: EcosystemOrganization) => {
    router.push(`/organizations/${org.id}`)
  }

  // Handle mouse events for tooltip
  const handleMouseEnter = (org: EcosystemOrganization, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      })
    }
    setHoveredOrg(org)
  }

  const handleMouseLeave = () => {
    setHoveredOrg(null)
  }

  // Get unique org types for legend
  const legendItems = useMemo(() => {
    const types = new Set(data.map(d => d.organisationType || '90'))
    return Array.from(types).map(type => ({
      value: type,
      color: ORG_TYPE_COLORS[type] || '#6b7280',
      label: getOrgTypeLabel(type)
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [data])

  // Render loading state
  if (loading) {
    return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  // Render empty state (only when no filter is applied - otherwise show full UI with empty message)
  if (!chartData.nodes.length && visibleSectors.size === 0 && !compact) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-sm">No organization data available</p>
      </div>
    )
  }

  const { width, height } = dimensions

  // Compact view
  if (compact) {
    return (
      <div ref={containerRef} className="w-full h-full relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          style={{ maxHeight: '100%' }}
        >
          {/* Ring backgrounds */}
          {chartData.rings.map((ring, i) => (
            <circle
              key={i}
              cx={chartData.centerX}
              cy={chartData.centerY}
              r={ring.outerRadiusPx}
              fill={RING_COLORS[ring.tier]}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
          ))}

          {/* Nodes */}
          {chartData.nodes.map((node, i) => (
            <circle
              key={i}
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill={node.color}
              fillOpacity={0.7}
              stroke={node.color}
              strokeWidth={1}
              className="cursor-pointer transition-opacity hover:opacity-100"
              style={{ opacity: hoveredOrg?.id === node.org.id ? 1 : 0.7 }}
              onMouseEnter={(e) => handleMouseEnter(node.org, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleNodeClick(node.org)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredOrg && (
          <div
            className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 pointer-events-none"
            style={{
              left: tooltipPos.x + 10,
              top: tooltipPos.y - 10,
              transform: tooltipPos.x > width / 2 ? 'translateX(-100%)' : undefined
            }}
          >
            <p className="font-medium text-xs text-slate-900 truncate max-w-[150px]">
              {hoveredOrg.name}
            </p>
            <p className="text-xs text-slate-500">
              #{hoveredOrg.rank} - {formatCurrency(hoveredOrg.totalValue)}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Full view
  return (
    <div className="space-y-4">
      {/* Header with info and sector filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Ring legend */}
        <div className="flex items-center gap-3 text-xs" style={{ color: '#4c5568' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(220, 38, 37, 0.15)', border: '2px solid #dc2625' }} />
            <span className="font-medium">Top 10%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(201, 162, 77, 0.15)', border: '2px solid #c9a24d' }} />
            <span className="font-medium">Next 30%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(76, 85, 104, 0.1)', border: '2px dashed #cfd0d5' }} />
            <span className="font-medium">Bottom 60%</span>
          </div>
        </div>

        {/* Sector Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Aggregation Level Toggle */}
          <div className="flex gap-1 rounded-lg p-1 bg-slate-100">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8", aggregationLevel === 'group' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              onClick={() => setAggregationLevel('group')}
            >
              Sector Category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8", aggregationLevel === 'category' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              onClick={() => setAggregationLevel('category')}
            >
              Sector
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8", aggregationLevel === 'sector' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              onClick={() => setAggregationLevel('sector')}
            >
              Sub-sector
            </Button>
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu open={isFilterOpen} onOpenChange={handleFilterOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 border">
                <SlidersHorizontal className="h-4 w-4" />
                Filter
                {(isFilterOpen ? pendingSectors.size : visibleSectors.size) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 text-slate-900 rounded-full">
                    {isFilterOpen ? pendingSectors.size : visibleSectors.size}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-3 w-[340px]">
              {/* Header with All/Clear */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-700">
                  Filter by {aggregationLevel === 'group' ? 'Sector Category' : aggregationLevel === 'category' ? 'Sector' : 'Sub-sector'}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={selectAllSectors}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                  >
                    All
                  </button>
                  <button
                    onClick={clearAllSectors}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search box */}
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by code or name..."
                  value={sectorFilterSearch}
                  onChange={(e) => setSectorFilterSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Quick select buttons */}
              <div className="flex gap-1 mb-2 flex-wrap">
                <span className="text-[10px] text-slate-500 self-center mr-1">Quick:</span>
                {[3, 5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => selectTopNSectors(n)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
                  >
                    Top {n}
                  </button>
                ))}
              </div>

              {/* Checkbox list */}
              <div className="max-h-[320px] overflow-y-auto space-y-0.5 border-t pt-2">
                {filteredSectors.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-4">
                    No matching items found
                  </div>
                ) : (
                  filteredSectors.map((item: SectorItem) => {
                    const isSelected = pendingSectors.has(item.code)
                    return (
                      <button
                        key={item.code}
                        onClick={() => toggleSectorVisibility(item.code)}
                        className="flex items-start gap-2 w-full py-1.5 px-1 text-left rounded hover:bg-slate-50"
                      >
                        <div className={`
                          w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
                          ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}
                        `}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded flex-shrink-0 bg-muted text-muted-foreground">
                          {item.code}
                        </span>
                        <span className="text-sm text-slate-700 leading-tight">
                          {item.name}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Footer summary */}
              <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t text-center">
                {pendingSectors.size} of {aggregatedSectorData.length} {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected
                {pendingSectors.size === 0 && ' (showing all organizations)'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 text-center italic">
                Close dropdown to apply filter
              </p>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="rounded-lg p-4 relative"
        style={{ backgroundColor: '#ffffff', border: '1px solid #cfd0d5' }}
      >
        {/* Empty state when sector filter returns no results */}
        {data.length === 0 && visibleSectors.size > 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">No organizations found</p>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              No organizations have transactions in the selected {aggregationLevel === 'group' ? 'sector categories' : aggregationLevel === 'category' ? 'sectors' : 'sub-sectors'}.
              Try selecting different sectors or clearing the filter.
            </p>
          </div>
        )}

        {/* Show chart when we have data or no filter applied */}
        {(data.length > 0 || visibleSectors.size === 0) && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ maxHeight: '600px' }}
        >
          {/* Define circular paths for curved text */}
          <defs>
            {chartData.rings.map((ring, i) => {
              // Create arc path for text to follow (top half of circle)
              const labelRadius = ring.outerRadiusPx - 8
              const cx = chartData.centerX
              const cy = chartData.centerY
              // Arc from left to right along top of circle
              const startX = cx - labelRadius
              const startY = cy
              const endX = cx + labelRadius
              const endY = cy
              return (
                <path
                  key={`ring-path-${ring.tier}`}
                  id={`ring-path-${ring.tier}`}
                  d={`M ${startX} ${startY} A ${labelRadius} ${labelRadius} 0 0 1 ${endX} ${endY}`}
                  fill="none"
                />
              )
            })}
          </defs>

          {/* Ring backgrounds */}
          {chartData.rings.map((ring, i) => (
            <g key={i}>
              <circle
                cx={chartData.centerX}
                cy={chartData.centerY}
                r={ring.outerRadiusPx}
                fill={RING_COLORS[ring.tier]}
                stroke={RING_STROKES[ring.tier]}
                strokeWidth={ring.tier === 'inner' ? 2 : 1.5}
                strokeDasharray={ring.tier === 'outer' ? '4 2' : undefined}
              />
              {/* Curved ring label following the arc */}
              <text
                fill={ring.tier === 'inner' ? '#dc2625' : ring.tier === 'middle' ? '#c9a24d' : '#4c5568'}
                fontWeight="600"
                fontSize={ring.tier === 'outer' ? '14' : '12'}
                letterSpacing="1.5"
              >
                <textPath
                  xlinkHref={`#ring-path-${ring.tier}`}
                  href={`#ring-path-${ring.tier}`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {ring.tier === 'inner'
                    ? '─── TOP 10% ───'
                    : ring.tier === 'middle'
                      ? '─── NEXT 30% ───'
                      : '─── BOTTOM 60% ───'}
                </textPath>
              </text>
            </g>
          ))}

          {/* Nodes */}
          {chartData.nodes.map((node, i) => (
            <g key={i}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={node.color}
                fillOpacity={hoveredOrg?.id === node.org.id ? 1 : 0.7}
                stroke={node.color}
                strokeWidth={hoveredOrg?.id === node.org.id ? 2 : 1}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => handleMouseEnter(node.org, e)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleNodeClick(node.org)}
              />
              {/* Label for top organizations */}
              {node.org.rank <= 10 && (
                <text
                  x={node.x}
                  y={node.y + node.radius + 10}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-600 pointer-events-none"
                >
                  {node.org.acronym || node.org.name.substring(0, 10)}
                </text>
              )}
            </g>
          ))}
        </svg>
        )}

        {/* Tooltip */}
        {hoveredOrg && (
          <div
            className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 pointer-events-none max-w-xs"
            style={{
              left: Math.min(tooltipPos.x + 15, width - 200),
              top: Math.max(tooltipPos.y - 15, 10)
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: ORG_TYPE_COLORS[hoveredOrg.organisationType || '90'] }}
              />
              <span className="font-semibold text-slate-900 text-sm truncate">
                {hoveredOrg.name}
              </span>
            </div>
            {hoveredOrg.organisationType && (
              <p className="text-xs text-slate-500 mb-2">
                {getOrgTypeLabel(hoveredOrg.organisationType)}
              </p>
            )}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Rank:</span>
                <span className="font-medium text-slate-900">#{hoveredOrg.rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Value:</span>
                <span className="font-medium text-slate-900">{formatCurrency(hoveredOrg.totalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Ring:</span>
                <span className="font-medium text-slate-900 capitalize">{hoveredOrg.ringTier}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Click to view organization profile
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="rounded-lg p-4" style={{ backgroundColor: '#f1f4f8' }}>
        <p className="text-xs font-medium mb-2" style={{ color: '#4c5568' }}>Organization Types</p>
        <div className="flex flex-wrap gap-3">
          {legendItems.map(item => (
            <div key={item.value} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs" style={{ color: '#4c5568' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">
        <p>
          This chart visualises the relative financial gravity of organisations within the aid ecosystem by arranging them in concentric rings based on total disbursement volume. Organisations at the centre represent the largest financial actors in the system, while those further out operate at progressively smaller scales. The inner ring contains the top ten percent of organisations by disbursement value, the middle ring contains the next thirty percent, and the outer ring contains the remaining organisations. Node size corresponds to the total value of funds flowing through each organisation, and colour indicates organisation type. By presenting the aid ecosystem in this radial form, the chart highlights how concentrated or distributed financial power is within the system, making it easy to see whether aid flows are dominated by a small number of large actors or spread across a wider range of organisations. Rankings are recalculated dynamically based on the selected time period and filters.
        </p>
        <p className="text-xs text-slate-500">
          <strong>METHODOLOGY:</strong> Inner ring contains the top 10% of organizations by total disbursement value. Middle ring contains the next 30% (ranks 11-40%). Outer ring contains the remaining organizations (bottom 60%).
        </p>
      </div>
    </div>
  )
}
