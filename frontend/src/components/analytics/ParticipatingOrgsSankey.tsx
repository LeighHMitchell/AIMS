"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExpandableCard } from '@/components/ui/expandable-card'
import {
  Download,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Hash,
  AlertCircle
} from 'lucide-react'
import { exportChartToJPG } from '@/lib/chart-export'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import * as d3Sankey from 'd3-sankey'

interface ParticipatingOrgsSankeyProps {
  refreshKey?: number
}

interface SankeyNode {
  id: string
  name: string
  role: number
  roleLabel: string
  column: number
}

interface SankeyLink {
  source: string
  target: string
  value: number
  activityCount: number
}

interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
  summary: {
    totalActivities: number
    totalOrganizations: number
    totalBudget: number
    byRole: {
      funding: number
      accountable: number
      extending: number
      implementing: number
    }
  }
  metric: string
}

type ViewMode = 'sankey' | 'table'
type MetricMode = 'count' | 'value'

// Role colors - custom palette
const ROLE_COLORS: Record<number, string> = {
  1: '#dc2625', // Funding - Primary Scarlet
  3: '#4c5568', // Extending - Blue Slate
  2: '#7b95a7', // Accountable - Cool Steel
  4: '#cfd0d5', // Implementing - Pale Slate
}

const ROLE_LABELS: Record<number, string> = {
  1: 'Funding',
  3: 'Extending',
  2: 'Accountable',
  4: 'Implementing',
}

const ROLE_DESCRIPTIONS: Record<number, string> = {
  1: 'Donors / Financing Providers',
  3: 'Implementers',
  2: 'Contract Holders',
  4: 'Executing Partners',
}

export function ParticipatingOrgsSankey({ refreshKey = 0 }: ParticipatingOrgsSankeyProps) {
  const [data, setData] = useState<SankeyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('sankey')
  const [metricMode, setMetricMode] = useState<MetricMode>('count')
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/participating-orgs-sankey?metric=${metricMode}`)

      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('[ParticipatingOrgsSankey] Error:', err)
      setError('Failed to load participating organizations data')
    } finally {
      setLoading(false)
    }
  }, [metricMode])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshKey])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value))
  }

  const handleExportCSV = useCallback(() => {
    if (!data) return

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined || value === '') return ''
      const stringValue = String(value)
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    let csvContent: string
    let filename: string

    if (viewMode === 'sankey') {
      const headers = ['Source Organization', 'Source Role', 'Target Organization', 'Target Role', 'Activity Count', 'Budget Value (USD)']
      const rows = data.links.map((link) => {
        const sourceNode = data.nodes.find((n) => n.id === link.source)
        const targetNode = data.nodes.find((n) => n.id === link.target)
        return [
          escapeCSV(sourceNode?.name || link.source),
          escapeCSV(sourceNode?.roleLabel || ''),
          escapeCSV(targetNode?.name || link.target),
          escapeCSV(targetNode?.roleLabel || ''),
          link.activityCount,
          link.value,
        ].join(',')
      })
      csvContent = [headers.join(','), ...rows].join('\n')
      filename = 'participating-orgs-flow'
    } else {
      const headers = ['Organization', 'Role', 'Role Code']
      const rows = data.nodes.map((node) => [
        escapeCSV(node.name),
        escapeCSV(node.roleLabel),
        node.role,
      ].join(','))
      csvContent = [headers.join(','), ...rows].join('\n')
      filename = 'participating-orgs-list'
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [data, viewMode])

  const handleExportJPG = useCallback(() => {
    if (chartRef.current) {
      exportChartToJPG(chartRef.current, 'participating-orgs-sankey')
    }
  }, [])

  // Calculate Sankey layout using d3-sankey
  const sankeyLayout = useMemo(() => {
    if (!data || data.nodes.length === 0) return null

    const width = 1000
    const height = 500
    const margin = { top: 30, right: 200, bottom: 20, left: 200 }

    try {
      // Include ALL nodes, not just connected ones
      // Create sankey data with numeric indices for links
      const nodeIdToIndex = new Map<string, number>()
      const sankeyNodes = data.nodes.map((node, index) => {
        nodeIdToIndex.set(node.id, index)
        return {
          name: node.name,
          role: node.role,
          roleLabel: node.roleLabel,
          column: node.column,
          originalId: node.id,
        }
      })

      // Filter and create links with numeric source/target indices
      const sankeyLinks: Array<{
        source: number
        target: number
        value: number
        activityCount: number
        sourceId: string
        targetId: string
      }> = []

      data.links.forEach((link) => {
        const sourceIdx = nodeIdToIndex.get(link.source)
        const targetIdx = nodeIdToIndex.get(link.target)

        if (sourceIdx !== undefined && targetIdx !== undefined) {
          sankeyLinks.push({
            source: sourceIdx,
            target: targetIdx,
            value: Math.max(link.value, 1), // Ensure minimum value for visibility
            activityCount: link.activityCount,
            sourceId: link.source,
            targetId: link.target,
          })
        }
      })

      // Group nodes by column for positioning
      const nodesByColumn = new Map<number, typeof sankeyNodes>()
      sankeyNodes.forEach((node) => {
        if (!nodesByColumn.has(node.column)) {
          nodesByColumn.set(node.column, [])
        }
        nodesByColumn.get(node.column)!.push(node)
      })
      
      const availableColumns = Array.from(nodesByColumn.keys()).sort((a, b) => a - b)
      const columnXPositions = new Map<number, number>()
      const availableWidth = width - margin.left - margin.right
      
      // Calculate x positions for each column
      availableColumns.forEach((col, idx) => {
        const position = margin.left + (idx / Math.max(availableColumns.length - 1, 1)) * availableWidth
        columnXPositions.set(col, position)
      })

      // Create sankey generator
      const sankey = d3Sankey.sankey<any, any>()
        .nodeWidth(20)
        .nodePadding(20)
        .nodeId((d: any, i: number) => i) // Use index as node ID
        .nodeAlign(d3Sankey.sankeyLeft)
        .extent([
          [margin.left, margin.top],
          [width - margin.right, height - margin.bottom],
        ])

      // Generate layout - only if we have links, otherwise position manually
      let result: any
      if (sankeyLinks.length > 0) {
        result = sankey({
          nodes: sankeyNodes.map((d) => ({ ...d })),
          links: sankeyLinks.map((d) => ({ ...d })),
        })
      } else {
        // No links, create a basic layout with all nodes positioned by column
        result = {
          nodes: sankeyNodes.map((node: any, index: number) => {
            const targetX = columnXPositions.get(node.column) || margin.left
            const nodesInColumn = nodesByColumn.get(node.column) || []
            const nodeIndex = nodesInColumn.findIndex((n: any) => n.originalId === node.originalId)
            const totalNodes = nodesInColumn.length
            const columnHeight = height - margin.top - margin.bottom
            const nodeHeight = Math.max(20, (columnHeight - (totalNodes - 1) * 20) / totalNodes)
            const y0 = margin.top + nodeIndex * (nodeHeight + 20)
            
            return {
              ...node,
              x0: targetX - 10,
              x1: targetX + 10,
              y0: y0,
              y1: y0 + nodeHeight,
            }
          }),
          links: [],
        }
      }

      // Post-process: ensure all nodes without links are positioned
      if (sankeyLinks.length > 0) {
        // After d3-sankey layout, manually position any nodes that weren't positioned
        const nodesWithLinks = new Set<any>()
        result.links.forEach((link: any) => {
          nodesWithLinks.add(link.source)
          nodesWithLinks.add(link.target)
        })

        result.nodes.forEach((node: any) => {
          if (!nodesWithLinks.has(node)) {
            // Node has no links, position it manually based on column
            const targetX = columnXPositions.get(node.column) || margin.left
            const nodesInColumn = nodesByColumn.get(node.column) || []
            const nodeIndex = nodesInColumn.findIndex((n: any) => n.originalId === node.originalId)
            const totalNodes = nodesInColumn.length
            const columnHeight = height - margin.top - margin.bottom
            const nodeHeight = Math.max(20, (columnHeight - (totalNodes - 1) * 20) / totalNodes)
            const y0 = margin.top + nodeIndex * (nodeHeight + 20)
            
            node.x0 = targetX - 10
            node.x1 = targetX + 10
            node.y0 = y0
            node.y1 = y0 + nodeHeight
          }
        })
      }

      return {
        width,
        height,
        margin,
        nodes: result.nodes,
        links: result.links,
        filteredNodes: data.nodes,
      }
    } catch (error) {
      console.error('[ParticipatingOrgsSankey] Sankey layout error:', error)
      return null
    }
  }, [data])

  // Generate link path
  const linkPath = d3Sankey.sankeyLinkHorizontal()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <p className="text-red-700">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    )
  }

  const roleOrder = [1, 3, 2, 4] // Funding → Extending → Accountable → Implementing
  const hasNodes = data.nodes.length > 0
  const hasLinks = data.links.length > 0

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roleOrder.map((role) => {
          const count = role === 1 ? data.summary.byRole.funding
            : role === 2 ? data.summary.byRole.accountable
            : role === 3 ? data.summary.byRole.extending
            : data.summary.byRole.implementing

          return (
            <Card key={role} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ROLE_COLORS[role] }}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[role]}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Chart Card */}
      <ExpandableCard
        title={
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Organization Role Flow</span>
          </div>
        }
        description="Flow of participating organizations across IATI roles: Funding → Extending → Accountable → Implementing"
        exportData={data.links}
      >
        <div ref={chartRef} className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Metric:</span>
              <div className="flex gap-1">
                <Button
                  variant={metricMode === 'count' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMetricMode('count')}
                >
                  <Hash className="h-4 w-4 mr-1" />
                  Count
                </Button>
                <Button
                  variant={metricMode === 'value' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMetricMode('value')}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Budget Value
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex">
                <Button
                  variant={viewMode === 'sankey' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('sankey')}
                  className="rounded-r-none"
                >
                  <Activity className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-l-none"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJPG}>
                <Download className="h-4 w-4 mr-1" />
                JPG
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-slate-600">Total Activities:</span>
                <span className="ml-2 font-bold text-slate-900">
                  {formatNumber(data.summary.totalActivities)}
                </span>
              </div>
              <div>
                <span className="text-sm text-slate-600">Organizations:</span>
                <span className="ml-2 font-bold text-slate-900">
                  {formatNumber(data.summary.totalOrganizations)}
                </span>
              </div>
              <div>
                <span className="text-sm text-slate-600">Total Budget:</span>
                <span className="ml-2 font-bold text-slate-900">
                  {formatCurrency(data.summary.totalBudget)}
                </span>
              </div>
            </div>
          </div>

          {/* Chart / Table */}
          {viewMode === 'sankey' ? (
            <div className="overflow-x-auto bg-white rounded-lg border p-4">
              {!hasNodes ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <AlertCircle className="h-12 w-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No Organizations Found</p>
                  <p className="text-sm mt-2 text-center max-w-md">
                    No participating organizations found for this dataset.
                  </p>
                </div>
              ) : sankeyLayout ? (
                <svg
                  ref={svgRef}
                  width={sankeyLayout.width}
                  height={sankeyLayout.height}
                  className="mx-auto"
                >
                  {/* Column Headers */}
                  <g>
                    {roleOrder.map((role) => {
                      // Find nodes with this role and calculate average x position
                      const roleNodes = sankeyLayout.nodes.filter((n: any) => n.role === role)
                      if (roleNodes.length === 0) return null
                      
                      // Calculate average x position for this role's column
                      const avgX = roleNodes.reduce((sum: number, node: any) => {
                        return sum + (node.x0 + node.x1) / 2
                      }, 0) / roleNodes.length
                      
                      return (
                        <text
                          key={role}
                          x={avgX}
                          y={12}
                          className="text-xs font-semibold"
                          fill={ROLE_COLORS[role]}
                          textAnchor="middle"
                        >
                          {ROLE_LABELS[role]} ({role})
                        </text>
                      )
                    })}
                  </g>

                  {/* Links */}
                  <g fill="none">
                    {sankeyLayout.links.map((link: any, index: number) => {
                      const sourceNode = link.source
                      const targetNode = link.target
                      const linkId = `${sourceNode?.originalId || index}-${targetNode?.originalId || index}`
                      const isHovered = hoveredLink === linkId

                      return (
                        <g key={index}>
                          <path
                            d={linkPath(link) || ''}
                            stroke={isHovered ? ROLE_COLORS[sourceNode?.role || 1] : '#94a3b8'}
                            strokeWidth={Math.max(link.width || 1, 2)}
                            strokeOpacity={isHovered ? 0.8 : 0.4}
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredLink(linkId)}
                            onMouseLeave={() => setHoveredLink(null)}
                          >
                            <title>
                              {sourceNode?.name} → {targetNode?.name}
                              {'\n'}Activities: {link.activityCount}
                              {metricMode === 'value' && `\nValue: ${formatCurrency(link.value)}`}
                            </title>
                          </path>
                        </g>
                      )
                    })}
                  </g>

                  {/* Nodes */}
                  <g>
                    {sankeyLayout.nodes.map((node: any, index: number) => (
                      <g key={index}>
                        <rect
                          x={node.x0}
                          y={node.y0}
                          width={node.x1 - node.x0}
                          height={Math.max(node.y1 - node.y0, 4)}
                          fill={ROLE_COLORS[node.role]}
                          rx={2}
                          className="cursor-pointer"
                        >
                          <title>
                            {node.name}
                            {'\n'}Role: {node.roleLabel}
                          </title>
                        </rect>
                        <text
                          x={node.x0 < sankeyLayout.width / 2 ? node.x1 + 6 : node.x0 - 6}
                          y={(node.y0 + node.y1) / 2}
                          dy="0.35em"
                          textAnchor={node.x0 < sankeyLayout.width / 2 ? 'start' : 'end'}
                          className="text-xs"
                          fill="#475569"
                        >
                          {node.name.length > 30 ? node.name.substring(0, 30) + '...' : node.name}
                        </text>
                      </g>
                    ))}
                  </g>
                </svg>
              ) : (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <p>Unable to render Sankey diagram</p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Organization</TableHead>
                    <TableHead>Source Role</TableHead>
                    <TableHead>Target Organization</TableHead>
                    <TableHead>Target Role</TableHead>
                    <TableHead className="text-right">Activities</TableHead>
                    {metricMode === 'value' && (
                      <TableHead className="text-right">Budget Value</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.links.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={metricMode === 'value' ? 6 : 5} className="text-center py-8 text-slate-500">
                        No role flows found. Activities need organizations in consecutive roles to create flows.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.links.slice(0, 50).map((link, index) => {
                      const sourceNode = data.nodes.find((n) => n.id === link.source)
                      const targetNode = data.nodes.find((n) => n.id === link.target)

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {sourceNode?.name || link.source}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: ROLE_COLORS[sourceNode?.role || 1] + '20',
                                color: ROLE_COLORS[sourceNode?.role || 1],
                              }}
                            >
                              {sourceNode?.roleLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {targetNode?.name || link.target}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: ROLE_COLORS[targetNode?.role || 4] + '20',
                                color: ROLE_COLORS[targetNode?.role || 4],
                              }}
                            >
                              {targetNode?.roleLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(link.activityCount)}
                          </TableCell>
                          {metricMode === 'value' && (
                            <TableCell className="text-right">
                              {formatCurrency(link.value)}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              {data.links.length > 50 && (
                <p className="text-sm text-slate-500 mt-2 text-center">
                  Showing top 50 of {data.links.length} flows
                </p>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t">
            {roleOrder.map((role) => (
              <div key={role} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: ROLE_COLORS[role] }}
                />
                <span className="text-sm text-slate-600">
                  {ROLE_LABELS[role]} ({role})
                </span>
              </div>
            ))}
          </div>
        </div>
      </ExpandableCard>
    </div>
  )
}
