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
import { BarChart3, Download, AlignLeft, AlignVerticalSpaceAround, Users, FolderKanban, Table as TableIcon, Search, FileImage } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { CHART_BAR_COLORS } from './sectorColorMap'
// Inline currency formatter to avoid initialization issues
const formatCurrencyAbbreviated = (value: number): string => {
  const isNegative = value < 0
  const absValue = Math.abs(value)

  let formatted = ''
  if (absValue >= 1000000000) {
    formatted = `$${(absValue / 1000000000).toFixed(1)}b`
  } else if (absValue >= 1000000) {
    formatted = `$${(absValue / 1000000).toFixed(1)}m`
  } else if (absValue >= 1000) {
    formatted = `$${(absValue / 1000).toFixed(1)}k`
  } else {
    formatted = `$${absValue.toFixed(0)}`
  }

  return isNegative ? `-${formatted}` : formatted
}

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
              gap: '6px'
            }}
          >
            <span 
              style={{ 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                fontSize: '11px',
                backgroundColor: '#e2e8f0',
                padding: '2px 6px',
                borderRadius: '3px',
                color: '#475569',
                flexShrink: 0
              }}
            >
              {item.code}
            </span>
            <span 
              style={{ 
                fontSize: '11px', 
                color: '#64748B',
                textAlign: 'right',
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

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  // Use shared currency formatter for tooltips
  const formatTooltipCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    return formatCurrencyAbbreviated(value)
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
              <span className="text-sm text-slate-700">{entry.value}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  // Table-based tooltip matching Financial Overview style
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      
      // Filter out zero/null values and hidden series
      const nonZeroPayload = payload.filter((entry: any) => 
        entry.value != null && entry.value !== 0 && !hiddenSeries.has(entry.dataKey)
      )

      if (nonZeroPayload.length === 0) return null

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-w-md">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">
              <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-xs mr-1.5">
                {dataPoint.code}
              </code>
              {dataPoint.fullName}
            </p>
          </div>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full text-sm">
              <tbody>
                {nonZeroPayload.map((entry: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-700 font-medium">{entry.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {entry.dataKey === 'projects' || entry.dataKey === 'partners' 
                        ? entry.value.toLocaleString()
                        : formatTooltipCurrency(entry.value)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
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

  // Export to JPG using html2canvas
  const handleExportJPG = () => {
    const chartElement = document.querySelector('#sector-analysis-chart') as HTMLElement
    if (!chartElement) return

    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      }).then(canvas => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = `sector-analysis-${new Date().getTime()}.jpg`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        }, 'image/jpeg', 0.95)
      })
    })
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
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">No data available</p>
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
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={(v) => v >= 1e6 ? `$${(v/1e6).toFixed(0)}m` : `$${(v/1e3).toFixed(0)}k`} fontSize={10} />
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
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sector Analysis
          </CardTitle>
          <CardDescription>No sector data available for the selected filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No data available</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sector Analysis by {getLevelLabel()}
            </CardTitle>
            <CardDescription>
              Financial flows and project distribution across sectors
            </CardDescription>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* View Type Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={viewType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('bar')}
                  className="h-8"
                  title="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('table')}
                  className="h-8"
                  title="Table"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Bar Chart specific controls */}
              {viewType === 'bar' && (
                <>
                  {/* Orientation Toggle Buttons */}
                  <div className="flex gap-1 border rounded-lg p-1 bg-white">
                    <Button
                      variant={orientation === 'horizontal' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setOrientation('horizontal')}
                      className="h-8"
                      title="Horizontal"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={orientation === 'vertical' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setOrientation('vertical')}
                      className="h-8"
                      title="Vertical"
                    >
                      <AlignVerticalSpaceAround className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Top N Selector */}
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

                  {/* Project/Partner Toggle Buttons */}
                  <div className="flex gap-1 border rounded-lg p-1 bg-white">
                    <Button
                      variant={showProjectCount ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setShowProjectCount(!showProjectCount)}
                      className="h-8"
                      title="Projects"
                    >
                      <FolderKanban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={showPartnerCount ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setShowPartnerCount(!showPartnerCount)}
                      className="h-8"
                      title="Partners"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* Table specific controls */}
              {viewType === 'table' && (
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search sectors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-8"
                  />
                </div>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 px-2"
                title="Export to CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJPG}
                className="h-8 px-2"
                title="Export to JPG"
                disabled={viewType === 'table'}
              >
                <FileImage className="h-4 w-4" />
              </Button>
            </div>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} horizontal={false} />
              <XAxis 
                type="number" 
                tickFormatter={formatCurrency} 
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
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                tick={<CustomXAxisTick />}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                height={120}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency} 
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
          /* Table View */
          <div className="rounded-md border overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead className="min-w-[200px]">
                    <SortButton field="name" label="Sector" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="planned" label="Planned" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="actual" label="Actual" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="commitments" label="Commitments" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="budgets" label="Budgets" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="projects" label="Projects" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="partners" label="Partners" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      No sectors found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {tableData.map((item, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                                {item.sectorCode}
                              </code>
                              <span className="font-semibold text-slate-900">{item.sectorName}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <div className="font-medium">{formatCurrency(item.plannedDisbursements)}</div>
                            <div className="text-xs text-slate-500">{item.plannedPercentage.toFixed(1)}%</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <div className="font-semibold" style={{ color: CHART_BAR_COLORS.actual }}>{formatCurrency(item.actualDisbursements)}</div>
                            <div className="text-xs text-slate-500">{item.actualPercentage.toFixed(1)}%</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.outgoingCommitments)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.budgets)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.projectCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.partnerCount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-slate-100 font-semibold sticky bottom-0">
                      <TableCell>
                        <div className="font-bold text-slate-900">Total</div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totals.planned)}
                      </TableCell>
                      <TableCell className="text-right font-bold" style={{ color: CHART_BAR_COLORS.actual }}>
                        {formatCurrency(totals.actual)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totals.commitments)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totals.budgets)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {totals.projects.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        -
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
