"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getOrgTypeLabel } from '@/lib/org-type-mappings'
import { useRouter } from 'next/navigation'

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

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        flowType,
        includeHumanitarian: includeHumanitarian.toString(),
        transactionType: '3', // Disbursements only
        minValueUSD: '100000' // $100K threshold (lower for smaller datasets)
      })

      if (dateRange?.from) {
        params.set('dateFrom', dateRange.from.toISOString())
      }
      if (dateRange?.to) {
        params.set('dateTo', dateRange.to.toISOString())
      }

      const response = await fetch(`/api/analytics/ecosystem?${params}`)
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
  }, [dateRange, flowType, includeHumanitarian, onDataChange])

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
    return <Skeleton className="w-full h-full min-h-[300px]" />
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

  // Render empty state
  if (!chartData.nodes.length) {
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
      {/* Header with info */}
      <div className="flex items-center justify-between">
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

        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Info className="h-4 w-4" />
                <span className="text-xs">How to read</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                <strong>Rings:</strong> Organizations closer to center have higher transaction volumes<br />
                <strong>Size:</strong> Node size represents total transaction value<br />
                <strong>Color:</strong> Organization type<br />
                <strong>Click:</strong> Navigate to organization profile
              </p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="rounded-lg p-4 relative"
        style={{ backgroundColor: '#ffffff', border: '1px solid #cfd0d5' }}
      >
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

          {/* Center label */}
          <text
            x={chartData.centerX}
            y={chartData.centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#4c5568"
            fontSize="12"
            fontWeight="500"
          >
            Financial Core
          </text>

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

      {/* Methodology note */}
      <p className="text-xs leading-relaxed" style={{ color: '#7b95a7' }}>
        Organizations ranked by transaction volume and arranged by relative financial gravity.
        Inner ring contains top 10% by disbursement value, middle ring next 30%, outer ring remaining
        organizations. Node size reflects total transaction volume.
        Only organizations with &gt;$100K in disbursements shown.
      </p>
    </div>
  )
}
