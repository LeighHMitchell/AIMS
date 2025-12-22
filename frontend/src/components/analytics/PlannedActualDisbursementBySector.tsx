"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  ReferenceLine,
} from 'recharts'
import { Download, X, ChevronDown } from 'lucide-react'
import html2canvas from 'html2canvas'

// Color palette - custom scheme
const COLORS = {
  newCommitments: '#dc2625',       // Primary Scarlet
  plannedDisbursements: '#4c5568', // Blue Slate
  actualDisbursements: '#7b95a7',  // Cool Steel
  numberOfProjects: '#f59e0b',     // Amber for visibility
  numberOfOrganisations: '#8b5cf6' // Purple for visibility
}

// Data keys configuration for toggling
const DATA_KEYS = [
  { key: 'newCommitments', label: 'New Commitments (USDm)', color: COLORS.newCommitments, isCount: false },
  { key: 'plannedDisbursements', label: 'Planned Disbursements (USDm)', color: COLORS.plannedDisbursements, isCount: false },
  { key: 'actualDisbursements', label: 'Actual Disbursements (USDm)', color: COLORS.actualDisbursements, isCount: false },
  { key: 'numberOfProjects', label: 'Number of Projects', color: COLORS.numberOfProjects, isCount: true },
  { key: 'numberOfOrganisations', label: 'Number of Organisations', color: COLORS.numberOfOrganisations, isCount: true },
]

interface SectorSummary {
  sectorCode: string
  sectorName: string
  newCommitments: number
  plannedDisbursements: number
  actualDisbursements: number
  numberOfProjects: number
  numberOfOrganisations: number
}

interface YearData {
  year: string
  sectors: SectorSummary[]
}

interface DateRange {
  from: Date
  to: Date
}

interface PlannedActualDisbursementBySectorProps {
  dateRange: DateRange
  refreshKey?: number
}

export function PlannedActualDisbursementBySector({
  dateRange,
  refreshKey = 0
}: PlannedActualDisbursementBySectorProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [data, setData] = useState<YearData[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(['newCommitments', 'plannedDisbursements', 'actualDisbursements'])
  )
  const chartRef = useRef<HTMLDivElement>(null)

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (selectedYears.length > 0) {
          params.append('years', selectedYears.join(','))
        }

        const response = await fetch(`/api/analytics/sector-disbursement-summary?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const result = await response.json()
        
        // Map fiscalYears to years for backwards compatibility
        const yearsData = result.fiscalYears || result.years || []
        setData(yearsData.map((fy: any) => ({
          year: fy.fiscalYear || fy.year,
          sectors: fy.sectors
        })))
        
        const availableYearsData = result.availableFiscalYears || result.availableYears || []
        if (availableYearsData.length > 0 && availableYears.length === 0) {
          setAvailableYears(availableYearsData)
          // Default to all years if none selected
          if (selectedYears.length === 0) {
            setSelectedYears(availableYearsData)
          }
        }
      } catch (err) {
        console.error('[PlannedActualDisbursementBySector] Error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedYears, refreshKey])

  const removeYear = (yearToRemove: string) => {
    setSelectedYears(prev => prev.filter(y => y !== yearToRemove))
  }

  const addYear = (year: string) => {
    if (!selectedYears.includes(year)) {
      setSelectedYears(prev => [...prev, year].sort().reverse())
    }
    setIsDropdownOpen(false)
  }

  // Define which keys are currency vs count metrics
  const currencyKeys = ['newCommitments', 'plannedDisbursements', 'actualDisbursements']
  const countKeys = ['numberOfProjects', 'numberOfOrganisations']

  const toggleSeries = (dataKey: string) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev)
      const isCountMetric = countKeys.includes(dataKey)
      const isCurrencyMetric = currencyKeys.includes(dataKey)

      if (newSet.has(dataKey)) {
        // If already visible, just hide it
        newSet.delete(dataKey)
      } else {
        // If showing a count metric, remove all currency metrics
        if (isCountMetric) {
          currencyKeys.forEach(key => newSet.delete(key))
        }
        // If showing a currency metric, remove all count metrics
        if (isCurrencyMetric) {
          countKeys.forEach(key => newSet.delete(key))
        }
        // Add the new selection
        newSet.add(dataKey)
      }
      return newSet
    })
  }

  // Merge data from all selected years
  const chartData = useMemo(() => {
    if (data.length === 0) return []

    // Aggregate data across all selected years
    const sectorMap = new Map<string, SectorSummary>()

    data.forEach(yearData => {
      yearData.sectors.forEach(sector => {
        const existing = sectorMap.get(sector.sectorCode)
        if (existing) {
          existing.newCommitments += sector.newCommitments
          existing.plannedDisbursements += sector.plannedDisbursements
          existing.actualDisbursements += sector.actualDisbursements
          existing.numberOfProjects += sector.numberOfProjects
          existing.numberOfOrganisations += sector.numberOfOrganisations
        } else {
          sectorMap.set(sector.sectorCode, { ...sector })
        }
      })
    })

    // Convert to array and sort by total value
    const sectors = Array.from(sectorMap.values())
    sectors.sort((a, b) => {
      const totalA = a.plannedDisbursements + a.actualDisbursements
      const totalB = b.plannedDisbursements + b.actualDisbursements
      return totalB - totalA
    })

    // Truncate sector names for display
    return sectors.map(sector => ({
      ...sector,
      displayName: sector.sectorName.length > 20
        ? sector.sectorName.substring(0, 17) + '...'
        : sector.sectorName
    }))
  }, [data])

  // Calculate Y-axis domain for currency values (symmetric around 0 if negative values exist)
  const currencyYAxisDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto']
    
    // Only consider visible currency series
    const currencyKeys = DATA_KEYS.filter(k => !k.isCount && visibleSeries.has(k.key)).map(k => k.key)
    if (currencyKeys.length === 0) return ['auto', 'auto']
    
    let minValue = 0
    let maxValue = 0
    
    chartData.forEach(sector => {
      currencyKeys.forEach(key => {
        const value = sector[key as keyof typeof sector] as number
        if (value < minValue) minValue = value
        if (value > maxValue) maxValue = value
      })
    })
    
    // If there are negative values, make the domain symmetric around 0
    if (minValue < 0) {
      const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue))
      // Add 10% padding
      const paddedMax = absMax * 1.1
      return [-paddedMax, paddedMax]
    }
    
    // If all positive, let Recharts handle it automatically with some padding
    return [0, 'auto']
  }, [chartData, visibleSeries])

  // Format currency for Y-axis (e.g., $27m, -$23m)
  const formatYAxisCurrency = (value: number) => {
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (absValue >= 1000000000) {
      return `${sign}$${(absValue / 1000000000).toFixed(0)}b`
    } else if (absValue >= 1000000) {
      return `${sign}$${(absValue / 1000000).toFixed(0)}m`
    } else if (absValue >= 1000) {
      return `${sign}$${(absValue / 1000).toFixed(0)}k`
    }
    return `${sign}$${absValue.toFixed(0)}`
  }

  // Format count for right Y-axis (no decimals)
  const formatCount = (value: number) => {
    if (!Number.isInteger(value)) return ''
    return value.toLocaleString()
  }

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Custom tooltip with table format
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null

    // Find full sector data
    const sectorData = chartData.find(s => s.displayName === label)
    const fullName = sectorData?.sectorName || label
    const sectorCode = sectorData?.sectorCode || ''

    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg min-w-[320px]">
        <div className="mb-3 pb-2 border-b">
          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 mr-2">
            {sectorCode}
          </span>
          <span className="font-semibold text-sm">{fullName}</span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {payload.map((entry, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="py-1.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-700">{entry.name}</span>
                  </div>
                </td>
                <td className="py-1.5 text-right font-medium">
                  {entry.name?.includes('Number') 
                    ? entry.value?.toLocaleString()
                    : formatCurrencyFull(entry.value as number)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Custom X-axis tick component for wrapping labels
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const sectorData = chartData.find(s => s.displayName === payload.value)
    const sectorCode = sectorData?.sectorCode || ''
    const sectorName = sectorData?.sectorName || payload.value
    
    // Split name into words for wrapping
    const words = sectorName.split(' ')
    const lines: string[] = []
    let currentLine = ''
    const maxCharsPerLine = 18
    
    words.forEach((word: string) => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim()
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    })
    if (currentLine) lines.push(currentLine)

    return (
      <g transform={`translate(${x},${y})`}>
        {/* Sector code with background */}
        <rect 
          x={-20} 
          y={8} 
          width={40} 
          height={16} 
          rx={3}
          fill="#e5e7eb" 
        />
        <text
          x={0}
          y={20}
          textAnchor="middle"
          fill="#6B7280"
          fontSize={10}
          fontFamily="monospace"
        >
          {sectorCode}
        </text>
        {/* Sector name lines */}
        {lines.map((line, index) => (
          <text
            key={index}
            x={0}
            y={36 + index * 14}
            textAnchor="middle"
            fill="#374151"
            fontSize={11}
          >
            {line}
          </text>
        ))}
      </g>
    )
  }

  const handleSaveChart = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
        })
        const link = document.createElement('a')
        link.download = `planned-actual-disbursement-by-sector-${selectedYears.join('-')}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } catch (error) {
        console.error('Error saving chart:', error)
      }
    }
  }

  // Get years available for adding (not already selected)
  const yearsToAdd = availableYears.filter(y => !selectedYears.includes(y))

  // Calculate dynamic chart height based on data
  const chartHeight = Math.max(400, chartData.length * 80)

  if (loading && data.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Planned and Actual Disbursement by Sector
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Planned and Actual Disbursement by Sector
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading data: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Planned and Actual Disbursement by Sector
          </CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Year</span>
              <div className="relative">
                <div 
                  className="flex items-center gap-1 px-2 py-1 border rounded-lg bg-white min-w-[150px] cursor-pointer hover:border-slate-400 flex-wrap"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {selectedYears.length === 0 ? (
                    <span className="text-slate-400 text-sm">Select...</span>
                  ) : (
                    <>
                      {selectedYears.map(year => (
                        <Badge
                          key={year}
                          variant="secondary"
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 gap-1 cursor-default text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {year.replace('FY', '')}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeYear(year)
                            }}
                          />
                        </Badge>
                      ))}
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 ml-auto text-slate-400" />
                </div>
                
                {/* Dropdown for adding years */}
                {isDropdownOpen && yearsToAdd.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                    {yearsToAdd.map(year => (
                      <div
                        key={year}
                        className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                        onClick={() => addYear(year)}
                      >
                        {year.replace('FY', '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chart/Table Toggle */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('chart')}
              >
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>

            {/* Save Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSaveChart}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              title="Save chart as image"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div ref={chartRef} className="bg-white">
          {viewMode === 'chart' ? (
            <>
              {/* Interactive Legend */}
              <div className="flex flex-wrap justify-center gap-4 mb-4">
                {DATA_KEYS.map(({ key, label, color }) => {
                  const isVisible = visibleSeries.has(key)
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded transition-all ${
                        isVisible ? 'opacity-100' : 'opacity-40'
                      } hover:bg-gray-50`}
                      onClick={() => toggleSeries(key)}
                      title={isVisible ? `Click to hide ${label}` : `Click to show ${label}`}
                    >
                      <div 
                        className="w-4 h-4 rounded-sm" 
                        style={{ backgroundColor: color }}
                      />
                      <span className={`text-sm ${isVisible ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Chart */}
              {chartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available for the selected year(s)
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 60, left: 50, bottom: 120 }}
                    barCategoryGap="15%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="displayName"
                      height={110}
                      tick={<CustomXAxisTick />}
                      interval={0}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    {/* Left Y-axis for currency values */}
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      domain={currencyYAxisDomain as [number | string, number | string]}
                      tickFormatter={formatYAxisCurrency}
                      fontSize={12}
                      tick={{ fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* Right Y-axis for counts */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={formatCount}
                      fontSize={12}
                      tick={{ fill: '#9333ea' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    {/* Zero reference line for currency axis */}
                    <ReferenceLine yAxisId="left" y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                    <Tooltip content={<CustomTooltip />} />
                    {DATA_KEYS.map(({ key, label, color, isCount }) => (
                      visibleSeries.has(key) && (
                        <Bar
                          key={key}
                          dataKey={key}
                          name={label}
                          fill={color}
                          yAxisId={isCount ? 'right' : 'left'}
                          radius={[0, 0, 0, 0]}
                        />
                      )
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            /* Table View */
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 sticky left-0 bg-gray-50">Sector</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">New Commitments (USDm)</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Planned Disbursements (USDm)</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Actual Disbursements (USDm)</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Number of Projects</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Number of Organisations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No data available for the selected year(s)
                      </TableCell>
                    </TableRow>
                  ) : (
                    chartData.map((sector, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50">
                        <TableCell className="font-medium sticky left-0 bg-white">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 mr-2">
                            {sector.sectorCode}
                          </span>
                          {sector.sectorName}
                        </TableCell>
                        <TableCell className="text-right">
                          {(sector.newCommitments / 1000000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(sector.plannedDisbursements / 1000000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(sector.actualDisbursements / 1000000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{sector.numberOfProjects}</TableCell>
                        <TableCell className="text-right">{sector.numberOfOrganisations}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
