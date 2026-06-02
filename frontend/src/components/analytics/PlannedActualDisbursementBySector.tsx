"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartDataTable, CodeChip } from '@/components/ui/chart-data-table'
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
import { CalendarIcon, BarChart3, Table as TableIcon } from 'lucide-react'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { ChartTooltipCard, ChartTooltipRow } from '@/components/ui/chart-tooltip'
import { format } from 'date-fns'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { getCategoryInfo, getSectorInfo } from '@/lib/dac-sector-utils'

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

// Color palette - slate-only for dashboard consistency
const COLORS = {
  newCommitments: '#334155',       // slate-700
  plannedDisbursements: '#4c5568', // Blue Slate
  actualDisbursements: '#7b95a7',  // Cool Steel
  budgets: '#cfd0d5',              // Pale Slate
}

// Data keys configuration for financial metrics
const FINANCIAL_DATA_KEYS = [
  { key: 'budgets', label: 'Budgets', color: COLORS.budgets },
  { key: 'plannedDisbursements', label: 'Planned Disbursements', color: COLORS.plannedDisbursements },
  { key: 'newCommitments', label: 'Outgoing Commitments', color: COLORS.newCommitments },
  { key: 'actualDisbursements', label: 'Disbursements', color: COLORS.actualDisbursements },
]

// Sort options for the "sort by" dropdown — keyed to the metric the user wants
// to rank sectors by (descending). Mirrors the financial series.
const SORT_OPTIONS: { key: 'budgets' | 'plannedDisbursements' | 'newCommitments' | 'actualDisbursements'; label: string; code?: string }[] = [
  { key: 'actualDisbursements', label: 'Disbursements', code: '3' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'plannedDisbursements', label: 'Planned Disbursements' },
  { key: 'newCommitments', label: 'Outgoing Commitments', code: '2' },
]


interface SectorSummary {
  sectorCode: string
  sectorName: string
  newCommitments: number
  plannedDisbursements: number
  actualDisbursements: number
  budgets: number
  numberOfProjects: number
  numberOfOrganisations: number
}

interface DateRange {
  from: Date
  to: Date
}

interface PlannedActualDisbursementBySectorProps {
  dateRange: DateRange
  refreshKey?: number
  compact?: boolean
}

// Top N sectors to show before "All Other Sectors"
const TOP_SECTORS_COUNT = 10

// Helper to get parent sector info from a sector code.
// Names resolve through the full DAC helpers (getCategoryInfo for the 3-digit
// DAC category, getSectorInfo for the 5-digit sub-sector). When the helper has
// no match we fall back to the raw code itself — never a generic "Unknown" —
// so any plotted code stays legible.
const getParentSectorInfo = (sectorCode: string) => {
  const code = sectorCode.toString()
  // First digit is the DAC top-level group code (no helper coverage; fall back
  // to the digit itself rather than a generic placeholder).
  const categoryCode = code.substring(0, 1)
  // First 3 digits are the DAC category code (if available)
  const sectorCodePrefix = code.length >= 3 ? code.substring(0, 3) : code

  // getCategoryInfo keys off the first 3 digits of the code → DAC category name.
  const categoryName = getCategoryInfo(categoryCode)?.name || categoryCode
  // Prefer the 3-digit DAC category name; for full 5-digit codes also try the
  // exact sub-sector. Fall back to the raw 3-digit prefix.
  const sectorName =
    getCategoryInfo(sectorCodePrefix)?.name ||
    getSectorInfo(sectorCodePrefix)?.name ||
    sectorCodePrefix

  return {
    categoryCode,
    categoryName,
    sectorCodePrefix,
    sectorName
  }
}

// Generate list of available years (from 2010 to current year + 10)
const currentYear = new Date().getFullYear()
const AVAILABLE_YEARS = Array.from(
  { length: currentYear + 10 - 2010 + 1 },
  (_, i) => 2010 + i
)

export function PlannedActualDisbursementBySector({
  dateRange: initialDateRange,
  refreshKey = 0,
  compact = false
}: PlannedActualDisbursementBySectorProps) {
  const isExpanded = useChartExpansion()
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [sectors, setSectors] = useState<SectorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupByLevel, setGroupByLevel] = useState<'1' | '3' | '5'>('3')
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]['key']>('actualDisbursements')
  const [visibleFinancialSeries, setVisibleFinancialSeries] = useState<Set<string>>(
    new Set(['newCommitments', 'plannedDisbursements', 'actualDisbursements', 'budgets'])
  )
  const [localDateRange, setLocalDateRange] = useState<DateRange>(initialDateRange)

  // Calendar type state (will be set from custom years on load)
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)


  // Fetch custom years on mount and set system default
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await apiFetch('/api/custom-years')
        if (response.ok) {
          const result = await response.json()
          const years = result.data || []
          setCustomYears(years)

          // Determine which calendar to use
          let selectedCalendar: CustomYear | undefined

          // First priority: system default
          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }

          // Fallback: first available custom year
          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }

          // Set the calendar type
          if (selectedCalendar) {
            setCalendarType(selectedCalendar.id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch custom years:', err)
      } finally {
        setCustomYearsLoading(false)
      }
    }
    fetchCustomYears()
  }, [])

  // Fetch actual data range on mount to know which years have data
  useEffect(() => {
    const fetchActualDataRange = async () => {
      try {
        // Query for min/max years with actual data
        const response = await apiFetch('/api/analytics/sector-disbursement-summary?dateFrom=2000-01-01&dateTo=2050-12-31&groupByLevel=1')
        if (response.ok) {
          const result = await response.json()
          const sectors = result.sectors || []

          // If we have data, set the actual data range
          if (sectors.length > 0) {
            let minYear: number
            let maxYear: number

            // Check for date range info in the response
            if (result.dataRange) {
              minYear = new Date(result.dataRange.min).getFullYear()
              maxYear = new Date(result.dataRange.max).getFullYear()
            } else {
              // Default to reasonable range if no explicit data range
              const currentYr = new Date().getFullYear()
              minYear = 2015
              maxYear = currentYr
            }

            setActualDataRange({ minYear, maxYear })

            // Set initial selected years to the data range
            setSelectedYears([minYear, maxYear])
          }
        }
      } catch (err) {
        console.error('Failed to fetch actual data range:', err)
      }
    }
    fetchActualDataRange()
  }, [])

  // Update date range when calendar type or years change
  useEffect(() => {
    if (customYears.length > 0 && selectedYears.length > 0) {
      const customYear = customYears.find(cy => cy.id === calendarType)
      if (customYear) {
        // Calculate combined date range spanning all selected years
        const sortedYears = [...selectedYears].sort((a, b) => a - b)
        const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
        const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])

        const newRange = {
          from: firstYearRange.start,
          to: lastYearRange.end
        }

        console.log('[PlannedActualDisbursementBySector] Calendar changed:', {
          calendarType,
          customYearName: customYear.name,
          selectedYears: sortedYears,
          dateRange: {
            from: newRange.from.toISOString().split('T')[0],
            to: newRange.to.toISOString().split('T')[0]
          }
        })

        setLocalDateRange(newRange)
      }
    }
  }, [calendarType, selectedYears, customYears])

  // Update local date range when prop changes (only if no calendar type set yet)
  useEffect(() => {
    // Only update if we haven't set a calendar type yet (waiting for custom years to load)
    if (!calendarType && initialDateRange?.from && initialDateRange?.to) {
      setLocalDateRange(initialDateRange)
    }
  }, [initialDateRange, calendarType])

  // Fetch data from API
  useEffect(() => {
    // Guard: ensure date range is valid before fetching
    if (!localDateRange?.from || !localDateRange?.to) {
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.append('dateFrom', localDateRange.from.toISOString().split('T')[0])
        params.append('dateTo', localDateRange.to.toISOString().split('T')[0])
        params.append('groupByLevel', groupByLevel)

        const response = await apiFetch(`/api/analytics/sector-disbursement-summary?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const result = await response.json()
        setSectors(result.sectors || [])
      } catch (err) {
        console.error('[PlannedActualDisbursementBySector] Error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [localDateRange, refreshKey, groupByLevel])

  const toggleFinancialSeries = (dataKey: string) => {
    setVisibleFinancialSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey)
      } else {
        newSet.add(dataKey)
      }
      return newSet
    })
  }


  // Process sectors data: sort by the chosen metric (desc), then top N +
  // "All Other Sectors".
  const chartData = useMemo(() => {
    if (sectors.length === 0) return []

    const sortedSectors = [...sectors].sort(
      (a, b) => (b[sortBy] as number) - (a[sortBy] as number)
    )
    const topSectors = sortedSectors.slice(0, TOP_SECTORS_COUNT)
    const otherSectors = sortedSectors.slice(TOP_SECTORS_COUNT)

    const result = [...topSectors]
    if (otherSectors.length > 0) {
      const allOther: SectorSummary = {
        sectorCode: 'OTHER',
        sectorName: 'All Other Sectors',
        newCommitments: 0,
        plannedDisbursements: 0,
        actualDisbursements: 0,
        budgets: 0,
        numberOfProjects: 0,
        numberOfOrganisations: 0,
      }

      otherSectors.forEach(sector => {
        allOther.newCommitments += sector.newCommitments
        allOther.plannedDisbursements += sector.plannedDisbursements
        allOther.actualDisbursements += sector.actualDisbursements
        allOther.budgets += sector.budgets
        allOther.numberOfProjects += sector.numberOfProjects
        allOther.numberOfOrganisations += sector.numberOfOrganisations
      })

      result.push(allOther)
    }

    return result.map(sector => ({
      ...sector,
      displayName: sector.sectorName.length > 20
        ? sector.sectorName.substring(0, 17) + '...'
        : sector.sectorName
    }))
  }, [sectors, sortBy])

  // Calculate Y-axis domain for financial chart
  const financialYAxisDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto']

    const visibleKeys = FINANCIAL_DATA_KEYS.filter(k => visibleFinancialSeries.has(k.key)).map(k => k.key)
    if (visibleKeys.length === 0) return ['auto', 'auto']

    let minValue = 0
    let maxValue = 0

    chartData.forEach(sector => {
      visibleKeys.forEach(key => {
        const value = sector[key as keyof typeof sector] as number
        if (value < minValue) minValue = value
        if (value > maxValue) maxValue = value
      })
    })

    if (minValue < 0) {
      const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue))
      const paddedMax = absMax * 1.1
      return [-paddedMax, paddedMax]
    }

    return [0, 'auto']
  }, [chartData, visibleFinancialSeries])

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

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null

    const sectorData = chartData.find(s => s.displayName === label)
    const fullName = sectorData?.sectorName || label || ''
    const sectorCode = sectorData?.sectorCode || ''

    const parentInfo = sectorCode && sectorCode !== 'OTHER' ? getParentSectorInfo(sectorCode) : null

    const breadcrumb = parentInfo && groupByLevel !== '1' ? (
      <span>
        <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground mr-1.5">{parentInfo.categoryCode}</code>
        <span>{parentInfo.categoryName}</span>
        {groupByLevel === '5' && (
          <>
            <span className="mx-1">›</span>
            <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground mr-1.5">{parentInfo.sectorCodePrefix}</code>
            <span>{parentInfo.sectorName}</span>
          </>
        )}
      </span>
    ) : null

    const codeMap: Record<string, string> = { 'Incoming Funds': '1', 'Outgoing Commitments': '2', 'Commitments': '2', 'Disbursements': '3', 'Expenditures': '4', 'Credit Guarantee': '10', 'Incoming Commitments': '11', 'Disbursement': '3' }

    const rows: ChartTooltipRow[] = payload.map((entry) => {
      const name = (entry.name as string || '').replace(/\s*\(.*?\)\s*$/, '')
      return {
        label: name,
        value: entry.name?.includes('Number')
          ? entry.value?.toLocaleString()
          : formatTooltipCurrency(entry.value as number, isExpanded),
        color: entry.color,
        code: codeMap[name],
        bordered: (entry.name as string || '').includes('Planned Disbursements'),
      }
    })

    return (
      <ChartTooltipCard
        title={
          <span>
            {sectorCode && (
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground mr-2">{sectorCode}</code>
            )}
            {fullName}
          </span>
        }
        subtitle={breadcrumb}
        rows={rows}
        minWidth={320}
      />
    )
  }

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const sectorData = chartData.find(s => s.displayName === payload.value)
    const sectorCode = sectorData?.sectorCode || ''
    const sectorName = sectorData?.sectorName || payload.value

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
        <rect x={-20} y={8} width={40} height={16} rx={3} fill="#e5e7eb" />
        <text x={0} y={20} textAnchor="middle" fill="#6B7280" fontSize={10} fontFamily="monospace">
          {sectorCode}
        </text>
        {lines.map((line, index) => (
          <text key={index} x={0} y={36 + index * 14} textAnchor="middle" fill="#374151" fontSize={11}>
            {line}
          </text>
        ))}
      </g>
    )
  }

  // Handle year click - select start and end of range (max 2 years)
  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      // Shift+click with one year selected: set as end of range
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      setSelectedYears([start, end])
    } else if (selectedYears.length === 0) {
      // No selection: set as start
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        // Clicking same year: deselect
        setSelectedYears([])
      } else {
        // Clicking different year: set range
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        setSelectedYears([start, end])
      }
    } else {
      // Already have 2 years (range): start fresh with this year
      setSelectedYears([year])
    }
  }

  // Select all years (first to last)
  const selectAllYears = () => {
    setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
  }

  // Select only years with actual data
  const selectDataRange = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      // Fallback to reasonable default
      const currentYr = new Date().getFullYear()
      setSelectedYears([currentYr - 5, currentYr])
    }
  }

  // Check if a year is between start and end (for light blue highlighting)
  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  // Get year label for a specific year
  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return `${year}`
  }

  const chartHeight = compact ? 200 : 500

  // Compact mode
  if (compact) {
    // Show loading if still loading OR if custom years haven't loaded yet
    if ((loading && sectors.length === 0) || customYearsLoading) {
      return <ChartLoadingPlaceholder />
    }
    if (error) {
      return <div className="h-full flex items-center justify-center text-destructive"><p className="text-body">{error}</p></div>
    }
    return (
      <div className="bg-card h-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
              barCategoryGap="20%"
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
              <XAxis
                dataKey="displayName"
                height={50}
                tick={{ fontSize: 9, fill: '#6B7280' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                domain={financialYAxisDomain as [number | string, number | string]}
                tickFormatter={formatAxisCurrency}
                fontSize={10}
                tick={{ fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine yAxisId="left" y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              {FINANCIAL_DATA_KEYS.map(({ key, label, color }) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={label}
                  fill={color}
                  yAxisId="left"
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  // Non-compact mode: loading state
  if (loading && sectors.length === 0) {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Planned and Actual Disbursement by Sector
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ChartLoadingPlaceholder />
        </CardContent>
      </Card>
    )
  }

  // Non-compact mode: error state
  if (error) {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Planned and Actual Disbursement by Sector
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-destructive">Error loading data: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-2">
        {/* Calendar + year selector on its own row at the top */}
        <div className="flex items-start gap-2 mb-4">
            {customYears.length > 0 && (
              <>
                {/* Calendar Type Selector */}
                <div className="flex gap-1 border rounded-lg p-1 bg-card">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                        <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {sortCustomYearsCalendarFirst(customYears).map(cy => (
                        <DropdownMenuItem
                          key={cy.id}
                          className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                          onClick={() => setCalendarType(cy.id)}
                        >
                          <span className="flex items-center gap-2">
                            {cy.shortName && (
                              <span className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                {cy.shortName.trim()}
                              </span>
                            )}
                            {cy.name}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Year Range Selector with Date Range below */}
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1 border rounded-lg p-1 bg-card">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          title={localDateRange?.from && localDateRange?.to
                            ? `${format(localDateRange.from, 'MMM d, yyyy')} – ${format(localDateRange.to, 'MMM d, yyyy')}`
                            : undefined}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {selectedYears.length === 0
                            ? 'Select years'
                            : selectedYears.length === 1
                              ? getYearLabel(selectedYears[0])
                              : `${getYearLabel(Math.min(...selectedYears))} - ${getYearLabel(Math.max(...selectedYears))}`}
                          <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="p-3 w-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-helper font-medium text-foreground">Select Year Range</span>
                          <div className="flex gap-1">
                            <button
                              onClick={selectAllYears}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                            >
                              All
                            </button>
                            <button
                              onClick={selectDataRange}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                            >
                              Data
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {AVAILABLE_YEARS.map((year) => {
                            const isStartOrEnd = selectedYears.length > 0 &&
                              (year === Math.min(...selectedYears) || year === Math.max(...selectedYears))
                            const inRange = isYearInRange(year)

                            return (
                              <button
                                key={year}
                                onClick={(e) => handleYearClick(year, e.shiftKey)}
                                className={`
                                  px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap
                                  ${isStartOrEnd
                                    ? 'bg-muted text-foreground'
                                    : inRange
                                      ? 'bg-primary/20 text-primary'
                                      : 'text-muted-foreground hover:bg-muted'
                                  }
                                `}
                                title="Click to select start, then click another to select end"
                              >
                                {getYearLabel(year)}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 text-center">
                          Click start year, then click end year
                        </p>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </>
            )}
        </div>
        {/* Controls row — dimension toggle left; view toggle + reset + CSV right. */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Group By Toggle Buttons */}
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8", groupByLevel === '1' ? "bg-muted text-foreground" : "text-muted-foreground")}
                onClick={() => setGroupByLevel('1')}
              >
                Sector Category
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8", groupByLevel === '3' ? "bg-muted text-foreground" : "text-muted-foreground")}
                onClick={() => setGroupByLevel('3')}
              >
                Sector
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8", groupByLevel === '5' ? "bg-muted text-foreground" : "text-muted-foreground")}
                onClick={() => setGroupByLevel('5')}
              >
                Sub-sector
              </Button>
            </div>

            {/* Sort-by dropdown — ranks sectors by the chosen metric (desc). */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  Sort: {SORT_OPTIONS.find(o => o.key === sortBy)?.label}
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SORT_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.key}
                    className={sortBy === opt.key ? 'bg-muted font-medium' : ''}
                    onClick={() => setSortBy(opt.key)}
                  >
                    {opt.code && <CodeChip className="mr-1.5">{opt.code}</CodeChip>}{opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* View toggle + reset + CSV, right-aligned. */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Chart/Table Toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('chart')}
                className={cn("h-8 w-8", viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Chart View"
                aria-label="Chart View"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('table')}
                className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>

          <CsvExportButton
            rows={chartData.map((s) => {
              const row: Record<string, unknown> = { Sector: s.sectorName }
              FINANCIAL_DATA_KEYS.forEach(({ key, label }) => {
                row[label] = (s as Record<string, unknown>)[key]
              })
              return row
            })}
            title="Financial Summary by Sector"
          />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 pb-4">
        <div className="bg-card" style={{ minHeight: chartHeight + 60 }}>
          {viewMode === 'chart' ? (
            <>
                {/* Financial Chart */}
                {selectedYears.length === 0 ? (
                  <div className="flex items-center justify-center text-muted-foreground" style={{ height: chartHeight }}>
                    Select one or more years to view data
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center text-muted-foreground" style={{ height: chartHeight }}>
                    No data available for the selected date range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 50, bottom: 0 }}
                      barCategoryGap="20%"
                      barGap={0}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                      <XAxis
                        dataKey="displayName"
                        height={100}
                        tick={<CustomXAxisTick />}
                        interval={0}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        orientation="left"
                        domain={financialYAxisDomain as [number | string, number | string]}
                        tickFormatter={formatAxisCurrency}
                        fontSize={12}
                        tick={{ fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                      <Tooltip content={<CustomTooltip />} />
                      {FINANCIAL_DATA_KEYS.map(({ key, label, color }) => (
                        visibleFinancialSeries.has(key) && (
                          <Bar
                            key={key}
                            dataKey={key}
                            name={label}
                            fill={color}
                            radius={[0, 0, 0, 0]}
                          />
                        )
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {/* Legend — below the chart */}
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {FINANCIAL_DATA_KEYS.map(({ key, label, color }) => {
                    const isVisible = visibleFinancialSeries.has(key)
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded transition-all ${
                          isVisible ? 'opacity-100' : 'opacity-40'
                        } hover:bg-muted/50`}
                        onClick={() => toggleFinancialSeries(key)}
                        title={isVisible ? `Click to hide ${label}` : `Click to show ${label}`}
                      >
                        <div
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className={`text-sm ${isVisible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
            </>
          ) : (
            /* Table View — shared ChartDataTable (sticky header, sortable
               columns, color squares, footer column totals, h+v scroll). Money
               columns use full-precision currency for parity with the gold-
               standard Financial Totals table; the per-column colors mirror the
               bar series. */
            selectedYears.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground" style={{ height: chartHeight }}>
                Select one or more years to view data
              </div>
            ) : (
              <ChartDataTable
                rows={chartData}
                columns={[
                  {
                    key: 'sectorName',
                    label: 'Sector',
                    numeric: false,
                    format: (_v, row) => (
                      <span className="flex items-center gap-2">
                        <code className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground flex-shrink-0">
                          {(row as any).sectorCode}
                        </code>
                        <span>{(row as any).sectorName}</span>
                      </span>
                    ),
                  },
                  { key: 'budgets', label: 'Budgets', numeric: true, currency: 'USD', color: COLORS.budgets },
                  { key: 'plannedDisbursements', label: 'Planned Disbursements', numeric: true, currency: 'USD', color: COLORS.plannedDisbursements },
                  { key: 'newCommitments', label: 'Outgoing Commitments', numeric: true, currency: 'USD', color: COLORS.newCommitments },
                  { key: 'actualDisbursements', label: 'Disbursements', numeric: true, currency: 'USD', color: COLORS.actualDisbursements },
                ]}
                currency="USD"
                maxHeight={chartHeight}
                emptyMessage="No data available for the selected date range"
              />
            )
          )}
        </div>

        {/* Explanatory text */}

        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart compares budgets, planned disbursements, outgoing commitments, and actual disbursements by sector.
          Toggle metrics on or off using the legend above, and switch between Sector Category, Sector, or Sub-sector groupings to view data at different DAC code levels.
          Compare planned versus actual figures to identify funding gaps or over-delivery across sectors.
        </p>
      </CardContent>
    </Card>
  )
}
