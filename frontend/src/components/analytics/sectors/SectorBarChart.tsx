"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getSortIcon } from '@/components/ui/table'
import { SectorMetrics, SectorAnalyticsFilters, SectorSortField, SortDirection } from '@/types/sector-analytics'
import { BarChart3, Download, AlignLeft, AlignVerticalSpaceAround, Users, FolderKanban, Table as TableIcon, Search } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { CHART_BAR_COLORS } from './sectorColorMap'
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { formatAxisCurrency, formatCurrencyPrecise, formatCurrencyCompact } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartDataTable } from '@/components/ui/chart-data-table'

interface SectorBarChartProps {
  data: SectorMetrics[]
  filters: SectorAnalyticsFilters
  compact?: boolean
}

type ChartOrientation = 'horizontal' | 'vertical'
type ViewType = 'bar' | 'table'

export function SectorBarChart({ data, filters, compact = false }: SectorBarChartProps) {
  const [orientation, setOrientation] = useState<ChartOrientation>('horizontal')
  const [viewType, setViewType] = useState<ViewType>('bar')
  const [showProjectCount, setShowProjectCount] = useState(false)
  const [showPartnerCount, setShowPartnerCount] = useState(false)
  const [topN, setTopN] = useState(10)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  
  // Table-specific state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SectorSortField>('actual')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const chartData = useMemo(() => {
    // Sort by actual disbursements by default
    const sorted = [...data].sort((a, b) => b.actualDisbursements - a.actualDisbursements)

    return sorted.slice(0, topN).map(item => ({
      name: item.sectorName,
      code: item.sectorCode,
      planned: item.plannedDisbursements,
      actual: item.actualDisbursements,
      commitments: item.outgoingCommitments,
      budgets: item.budgets,
      projects: item.projectCount,
      partners: item.partnerCount,
      fullName: item.sectorName,
      plannedPercentage: item.plannedPercentage,
      actualPercentage: item.actualPercentage
    }))
  }, [data, topN])

  // Custom Y-axis tick for horizontal bar chart (code and name on same line, wrapping)
  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const item = chartData.find(d => d.name === payload.value)
    if (!item) return null
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-345} y={-25} width={340} height={50}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
              paddingRight: '5px',
            }}
          >
            {/* Code badge inline, immediately before the name (single wrapping
                block) so they read on one line with no gap between them. */}
            <div
              style={{
                fontSize: '11px',
                color: '#64748B',
                textAlign: 'right',
                lineHeight: '1.4',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                  fontSize: '11px',
                  backgroundColor: '#e2e8f0',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  color: '#475569',
                  marginRight: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.code}
              </span>
              {item.name}
            </div>
          </div>
        </foreignObject>
      </g>
    )
  }

  // Custom X-axis tick for vertical bar chart (code and name on same line, wrapping)
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const item = chartData.find(d => d.name === payload.value)
    if (!item) return null
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-75} y={5} width={150} height={100}>
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'center',
              height: '100%',
              gap: '4px'
            }}
          >
            <span 
              style={{ 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                fontSize: '10px',
                backgroundColor: '#e2e8f0',
                padding: '2px 5px',
                borderRadius: '3px',
                color: '#475569',
                flexShrink: 0
              }}
            >
              {item.code}
            </span>
            <span 
              style={{ 
                fontSize: '10px', 
                color: '#64748B',
                textAlign: 'center',
                lineHeight: '1.3',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal'
              }}
            >
              {item.name}
            </span>
          </div>
        </foreignObject>
      </g>
    )
  }

  // Table data with search and sort
  const tableData = useMemo(() => {
    let filtered = [...data]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.sectorName.toLowerCase().includes(query) ||
        item.sectorCode.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query)
      )
    }

    const sorted = filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case 'name':
          aVal = a.sectorName
          bVal = b.sectorName
          break
        case 'planned':
          aVal = a.plannedDisbursements
          bVal = b.plannedDisbursements
          break
        case 'actual':
          aVal = a.actualDisbursements
          bVal = b.actualDisbursements
          break
        case 'commitments':
          aVal = a.outgoingCommitments
          bVal = b.outgoingCommitments
          break
        case 'budgets':
          aVal = a.budgets
          bVal = b.budgets
          break
        case 'projects':
          aVal = a.projectCount
          bVal = b.projectCount
          break
        case 'partners':
          aVal = a.partnerCount
          bVal = b.partnerCount
          break
        default:
          return 0
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
    })

    return sorted
  }, [data, searchQuery, sortField, sortDirection])

  const handleSort = (field: SectorSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Use brand color palette for chart bars
  const barColors: Record<string, string> = {
    budgets: CHART_BAR_COLORS.budgets,        // Cool Steel
    planned: CHART_BAR_COLORS.planned,        // Blue Slate
    commitments: CHART_BAR_COLORS.commitments, // Pale Slate
    actual: CHART_BAR_COLORS.actual,          // Primary Scarlet (highlight)
    projects: CHART_BAR_COLORS.projects,      // Dark Slate
    partners: CHART_BAR_COLORS.partners       // Dark Steel
  }

  // Handle legend click to toggle series visibility
  const handleLegendClick = (dataKey: string) => {
    const newHiddenSeries = new Set(hiddenSeries)
    if (newHiddenSeries.has(dataKey)) {
      newHiddenSeries.delete(dataKey)
    } else {
      newHiddenSeries.add(dataKey)
    }
    setHiddenSeries(newHiddenSeries)
  }

  // Custom legend with click to hide/show
  const renderLegend = (props: any) => {
    const { payload } = props

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.dataKey)

          return (
            <li
              key={`item-${index}`}
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => handleLegendClick(entry.dataKey)}
              style={{ opacity: isHidden ? 0.3 : 1 }}
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-body text-foreground">{entry.value}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload

      const nonZeroPayload = payload.filter((entry: any) =>
        entry.value != null && entry.value !== 0 && !hiddenSeries.has(entry.dataKey)
      )

      if (nonZeroPayload.length === 0) return null

      const title = (
        <span>
          <code className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs mr-1.5">
            {dataPoint.code}
          </code>
          {dataPoint.fullName}
        </span>
      )
      const rows = nonZeroPayload.map((entry: any) => ({
        label: entry.name,
        value: entry.dataKey === 'projects' || entry.dataKey === 'partners'
          ? entry.value.toLocaleString()
          : formatCurrencyCompact(entry.value),
        color: entry.color,
      }))
      return <ChartTooltipCard title={title} rows={rows} maxWidth={460} />
    }
    return null
  }

  const handleExportCSV = () => {
    const dataToExport = viewType === 'table' ? tableData : chartData
    const headers = ['Sector Code', 'Sector Name', 'Budgets', 'Planned', 'Commitments', 'Actual', 'Projects', 'Partners']
    const rows = dataToExport.map(d => [
      viewType === 'table' ? d.sectorCode : d.code,
      `"${viewType === 'table' ? d.sectorName : d.fullName}"`,
      (viewType === 'table' ? d.budgets : d.budgets).toFixed(2),
      (viewType === 'table' ? d.plannedDisbursements : d.planned).toFixed(2),
      (viewType === 'table' ? d.outgoingCommitments : d.commitments).toFixed(2),
      (viewType === 'table' ? d.actualDisbursements : d.actual).toFixed(2),
      viewType === 'table' ? d.projectCount : d.projects,
      viewType === 'table' ? d.partnerCount : d.partners
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sector-analytics-${new Date().getTime()}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getLevelLabel = () => {
    switch (filters.groupByLevel) {
      case '1': return 'Category'
      case '3': return 'Sector'
      case '5': return 'Sub-sector'
      default: return 'Sector'
    }
  }

  // Calculate totals for table footer
  const totals = useMemo(() => ({
    planned: tableData.reduce((sum, item) => sum + item.plannedDisbursements, 0),
    actual: tableData.reduce((sum, item) => sum + item.actualDisbursements, 0),
    commitments: tableData.reduce((sum, item) => sum + item.outgoingCommitments, 0),
    budgets: tableData.reduce((sum, item) => sum + item.budgets, 0),
    projects: tableData.reduce((sum, item) => sum + item.projectCount, 0),
    partners: new Set(tableData.flatMap(item => Array(item.partnerCount).fill(0))).size
  }), [tableData])

  const SortButton = ({ field, label }: { field: SectorSortField, label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 font-medium hover:bg-muted/80"
      onClick={() => handleSort(field)}
    >
      <span>{label}</span>
      <span className="ml-1">{getSortIcon(field, sortField, sortDirection)}</span>
    </Button>
  )

  // Get fill color with hidden state
  const getBarFill = (dataKey: string) => {
    return hiddenSeries.has(dataKey) ? '#cbd5e1' : barColors[dataKey]
  }

  // Get bar opacity based on hidden state
  const getBarOpacity = (dataKey: string) => {
    return hiddenSeries.has(dataKey) ? 0.3 : 1
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">No data available</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData.slice(0, 8)}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={formatAxisCurrency} fontSize={10} />
            <YAxis
              type="category"
              dataKey="name"
              width={75}
              tick={{ fontSize: 9 }}
              interval={0}
              tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="actual" name="Actual" fill={CHART_BAR_COLORS.actual} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Sector Analysis
          </CardTitle>
          <CardDescription>No sector data available for the selected filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground font-medium">No data available</p>
              <p className="text-body text-muted-foreground mt-2">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader>
        {/* Controls — Top-N (or table search) left; button groups + CSV right,
            all on one line. Button groups match the Financial Totals styling. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {viewType === 'bar' ? (
              <Select value={topN.toString()} onValueChange={(value) => setTopN(parseInt(value))}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="15">Top 15</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="relative flex-1 max-w-sm min-w-[180px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sectors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
            )}
          </div>

          {/* Right: button groups + CSV. */}
          <div className="flex items-center gap-2 flex-wrap">
            {viewType === 'bar' && (
              <>
                {/* Orientation toggle */}
                <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOrientation('horizontal')}
                    className={cn("h-8 w-8", orientation === 'horizontal' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                    title="Horizontal"
                    aria-label="Horizontal bars"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOrientation('vertical')}
                    className={cn("h-8 w-8", orientation === 'vertical' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                    title="Vertical"
                    aria-label="Vertical bars"
                  >
                    <AlignVerticalSpaceAround className="h-4 w-4" />
                  </Button>
                </div>

                {/* Projects / Partners toggle */}
                <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowProjectCount(!showProjectCount)}
                    className={cn("h-8 w-8", showProjectCount ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                    title="Projects"
                    aria-label="Toggle projects"
                  >
                    <FolderKanban className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPartnerCount(!showPartnerCount)}
                    className={cn("h-8 w-8", showPartnerCount ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                    title="Partners"
                    aria-label="Toggle partners"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* View toggle (bar/table) */}
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewType('bar')}
                className={cn("h-8 w-8", viewType === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Bar Chart"
                aria-label="Bar Chart"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewType('table')}
                className={cn("h-8 w-8", viewType === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Export */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportCSV}
              className="h-8 w-8"
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent id="sector-analysis-chart">
        {viewType === 'bar' ? (
          <ResponsiveContainer 
            width="100%" 
            height={600}
          >
            {orientation === 'horizontal' ? (
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatAxisCurrency}
                stroke="#64748B"
                fontSize={12}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={350} 
                tick={<CustomYAxisTick />}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
              <Bar 
                dataKey="budgets" 
                fill={getBarFill('budgets')} 
                name="Budgets"
                opacity={getBarOpacity('budgets')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              <Bar 
                dataKey="planned" 
                fill={getBarFill('planned')} 
                name="Planned"
                opacity={getBarOpacity('planned')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              <Bar 
                dataKey="commitments" 
                fill={getBarFill('commitments')} 
                name="Commitments"
                opacity={getBarOpacity('commitments')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              <Bar 
                dataKey="actual" 
                fill={getBarFill('actual')} 
                name="Actual"
                opacity={getBarOpacity('actual')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              {showProjectCount && (
                <Bar 
                  dataKey="projects" 
                  fill={getBarFill('projects')} 
                  name="Projects"
                  opacity={getBarOpacity('projects')}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                />
              )}
              {showPartnerCount && (
                <Bar 
                  dataKey="partners" 
                  fill={getBarFill('partners')} 
                  name="Partners"
                  opacity={getBarOpacity('partners')}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                />
              )}
            </BarChart>
            ) : (
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 130 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
              <XAxis 
                dataKey="name" 
                tick={<CustomXAxisTick />}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                height={120}
                interval={0}
              />
              <YAxis
                tickFormatter={formatAxisCurrency}
                stroke="#64748B"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
              <Bar 
                dataKey="budgets" 
                fill={getBarFill('budgets')} 
                name="Budgets"
                opacity={getBarOpacity('budgets')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              <Bar 
                dataKey="planned" 
                fill={getBarFill('planned')} 
                name="Planned"
                opacity={getBarOpacity('planned')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              <Bar 
                dataKey="commitments" 
                fill={getBarFill('commitments')} 
                name="Commitments"
                opacity={getBarOpacity('commitments')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              <Bar 
                dataKey="actual" 
                fill={getBarFill('actual')} 
                name="Actual"
                opacity={getBarOpacity('actual')}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
              {showProjectCount && (
                <Bar 
                  dataKey="projects" 
                  fill={getBarFill('projects')} 
                  name="Projects"
                  opacity={getBarOpacity('projects')}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                />
              )}
              {showPartnerCount && (
                <Bar 
                  dataKey="partners" 
                  fill={getBarFill('partners')} 
                  name="Partners"
                  opacity={getBarOpacity('partners')}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                />
              )}
            </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          /* Table View — shared ChartDataTable (sticky header, sortable
             columns, color squares, footer totals, h+v scroll). Money columns
             use full-precision currency for parity with the gold-standard
             Financial Totals table; project/partner counts are excluded from
             the footer totals (summing them across sectors double-counts). */
          <ChartDataTable
            rows={tableData}
            columns={[
              {
                key: 'sectorName',
                label: 'Sector',
                numeric: false,
                format: (_v, row) => (
                  <span className="flex items-center gap-2">
                    <code className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">
                      {(row as any).sectorCode}
                    </code>
                    <span className="font-semibold text-foreground">{(row as any).sectorName}</span>
                  </span>
                ),
              },
              {
                key: 'plannedDisbursements',
                label: 'Planned',
                numeric: true,
                currency: 'USD',
                color: CHART_BAR_COLORS.planned,
              },
              {
                key: 'actualDisbursements',
                label: 'Actual',
                numeric: true,
                currency: 'USD',
                color: CHART_BAR_COLORS.actual,
                format: (v) => (
                  <span className="font-semibold" style={{ color: CHART_BAR_COLORS.actual }}>
                    {formatCurrencyPrecise(Number(v) || 0)}
                  </span>
                ),
              },
              { key: 'outgoingCommitments', label: 'Commitments', numeric: true, currency: 'USD', color: CHART_BAR_COLORS.commitments },
              { key: 'budgets', label: 'Budgets', numeric: true, currency: 'USD', color: CHART_BAR_COLORS.budgets },
              { key: 'projectCount', label: 'Projects', numeric: true, includeInTotal: false, format: (v) => (Number(v) || 0).toLocaleString() },
              { key: 'partnerCount', label: 'Partners', numeric: true, includeInTotal: false, format: (v) => (Number(v) || 0).toLocaleString() },
            ]}
            currency="USD"
            maxHeight={600}
            emptyMessage="No sectors found matching your search"
          />
        )}
      </CardContent>
    </Card>
  )
}
