"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
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
} from 'recharts'
import { CalendarIcon, BarChart3, Table as TableIcon } from 'lucide-react'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { ChartTooltipCard, ChartTooltipRow } from '@/components/ui/chart-tooltip'
import { format } from 'date-fns'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';

// Color palette
const COLORS = {
  numberOfProjects: '#4c5568',     // Blue Slate
  numberOfOrganisations: '#7b95a7' // Cool Steel
}

// Data keys configuration
const COUNT_DATA_KEYS = [
  { key: 'numberOfProjects', label: 'Projects', color: COLORS.numberOfProjects },
  { key: 'numberOfOrganisations', label: 'Organisations', color: COLORS.numberOfOrganisations },
]

// DAC 5-digit sector category names (1-digit level)
const SECTOR_CATEGORIES: Record<string, string> = {
  '1': 'Social Infrastructure & Services',
  '2': 'Economic Infrastructure & Services',
  '3': 'Production Sectors',
  '4': 'Multi-Sector',
  '5': 'Commodity Aid & General Program Assistance',
  '6': 'Action Relating to Debt',
  '7': 'Humanitarian Aid',
  '9': 'Unallocated / Unspecified',
  '0': 'Admin Costs of Donors'
}

// DAC 3-digit sector names
const SECTOR_NAMES: Record<string, string> = {
  '110': 'Education',
  '111': 'Education, Level Unspecified',
  '112': 'Basic Education',
  '113': 'Secondary Education',
  '114': 'Post-Secondary Education',
  '120': 'Health',
  '121': 'Health, General',
  '122': 'Basic Health',
  '123': 'Non-communicable Diseases',
  '130': 'Population & Reproductive Health',
  '140': 'Water Supply & Sanitation',
  '150': 'Government & Civil Society',
  '151': 'Government & Civil Society, General',
  '152': 'Conflict, Peace & Security',
  '160': 'Other Social Infrastructure',
  '210': 'Transport & Storage',
  '220': 'Communications',
  '230': 'Energy',
  '231': 'Energy Policy',
  '232': 'Energy Generation, Renewable',
  '233': 'Energy Generation, Non-Renewable',
  '234': 'Hybrid Energy Plants',
  '235': 'Nuclear Energy Plants',
  '236': 'Energy Distribution',
  '240': 'Banking & Financial Services',
  '250': 'Business & Other Services',
  '310': 'Agriculture, Forestry & Fishing',
  '311': 'Agriculture',
  '312': 'Forestry',
  '313': 'Fishing',
  '320': 'Industry, Mining & Construction',
  '321': 'Industry',
  '322': 'Mineral Resources & Mining',
  '323': 'Construction',
  '330': 'Trade Policies & Regulations',
  '331': 'Trade Policies & Regulations',
  '332': 'Tourism',
  '410': 'General Environment Protection',
  '430': 'Other Multisector',
  '510': 'General Budget Support',
  '520': 'Food Aid/Food Security',
  '530': 'Other Commodity Assistance',
  '600': 'Action Relating to Debt',
  '720': 'Emergency Response',
  '730': 'Reconstruction & Rehabilitation',
  '740': 'Disaster Prevention & Preparedness',
  '910': 'Administrative Costs of Donors',
  '920': 'Support to NGOs',
  '930': 'Refugees in Donor Countries',
  '998': 'Unallocated/Unspecified'
}

// Helper to get parent sector info from a sector code
const getParentSectorInfo = (sectorCode: string) => {
  const code = sectorCode.toString()
  const categoryCode = code.substring(0, 1)
  const sectorCodePrefix = code.length >= 3 ? code.substring(0, 3) : code

  return {
    categoryCode,
    categoryName: SECTOR_CATEGORIES[categoryCode] || 'Unknown Category',
    sectorCodePrefix,
    sectorName: SECTOR_NAMES[sectorCodePrefix] || 'Unknown Sector'
  }
}

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

interface ProjectOrgCountsBySectorProps {
  dateRange: DateRange
  refreshKey?: number
  compact?: boolean
}

// Generate list of available years (from 2010 to current year + 10)
const currentYear = new Date().getFullYear()
const AVAILABLE_YEARS = Array.from(
  { length: currentYear + 10 - 2010 + 1 },
  (_, i) => 2010 + i
)

export function ProjectOrgCountsBySector({
  dateRange: initialDateRange,
  refreshKey = 0,
  compact = false
}: ProjectOrgCountsBySectorProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [sectors, setSectors] = useState<SectorSummary[]>([])
  const [uniqueTotals, setUniqueTotals] = useState<{ uniqueProjects: number; uniqueOrganisations: number }>({ uniqueProjects: 0, uniqueOrganisations: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupByLevel, setGroupByLevel] = useState<'1' | '3' | '5'>('3')
  // Top N sectors to show before grouping the remainder into "All Other Sectors".
  // Mirrors the Top 3/5/10 shortcut on SectorDisbursementOverTime.
  const [topN, setTopN] = useState<number>(10)
  // Rank sectors by project count or organisation count (descending).
  const [sortBy, setSortBy] = useState<'numberOfProjects' | 'numberOfOrganisations'>('numberOfProjects')
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(['numberOfProjects', 'numberOfOrganisations'])
  )
  const [localDateRange, setLocalDateRange] = useState<DateRange>(initialDateRange)

  // Calendar type state
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

          let selectedCalendar: CustomYear | undefined

          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }

          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }

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
        const sortedYears = [...selectedYears].sort((a, b) => a - b)
        const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
        const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])

        setLocalDateRange({
          from: firstYearRange.start,
          to: lastYearRange.end
        })
      }
    }
  }, [calendarType, selectedYears, customYears])

  // Update local date range when prop changes
  useEffect(() => {
    if (!calendarType && initialDateRange?.from && initialDateRange?.to) {
      setLocalDateRange(initialDateRange)
    }
  }, [initialDateRange, calendarType])

  // Fetch data from API
  useEffect(() => {
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
        setUniqueTotals(result.totals || { uniqueProjects: 0, uniqueOrganisations: 0 })
      } catch (err) {
        console.error('[ProjectOrgCountsBySector] Error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [localDateRange, refreshKey, groupByLevel])

  const toggleSeries = (dataKey: string) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey)
      } else {
        newSet.add(dataKey)
      }
      return newSet
    })
  }

  // Handle year click - select start and end of range (max 2 years)
  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      setSelectedYears([start, end])
    } else if (selectedYears.length === 0) {
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        setSelectedYears([])
      } else {
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        setSelectedYears([start, end])
      }
    } else {
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

  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return `${year}`
  }

  // Process sectors data: sort by the chosen count (desc), then top N +
  // "All Other Sectors".
  const chartData = useMemo(() => {
    if (sectors.length === 0) return []

    const sortedSectors = [...sectors].sort((a, b) => b[sortBy] - a[sortBy])
    const topSectors = sortedSectors.slice(0, topN)
    const otherSectors = sortedSectors.slice(topN)

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
  }, [sectors, topN, sortBy])

  const formatCount = (value: number) => {
    if (!Number.isInteger(value)) return ''
    return value.toLocaleString()
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

    const rows: ChartTooltipRow[] = payload.map((entry) => ({
      label: entry.name,
      value: entry.value?.toLocaleString(),
      color: entry.color,
    }))

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

  const chartHeight = compact ? 200 : 350

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
                orientation="left"
                tickFormatter={formatCount}
                fontSize={10}
                tick={{ fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {COUNT_DATA_KEYS.map(({ key, label, color }) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={label}
                  fill={color}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  // Loading state
  if (loading && sectors.length === 0) {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Projects & Organisations by Sector
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ChartLoadingPlaceholder />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Projects & Organisations by Sector
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
        {/* Controls row — dimension toggle + Top-N left; view toggle + reset + CSV right. */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Group By Toggle Buttons */}
            <ChartViewToggle
              ariaLabel="Group by level"
              variant="text"
              value={groupByLevel}
              onValueChange={setGroupByLevel}
              options={[
                { value: '1', label: 'Sector Category' },
                { value: '3', label: 'Sector' },
                { value: '5', label: 'Sub-sector' },
              ]}
            />

            {/* Top N quick picker — same set used in SectorDisbursementOverTime. */}
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setTopN(n)}
                  className={
                    topN === n
                      ? 'text-xs font-medium px-2 h-8 rounded bg-muted text-foreground'
                      : 'text-xs px-2 h-8 rounded text-muted-foreground hover:bg-muted'
                  }
                  title={`Show top ${n} sectors`}
                >
                  Top {n}
                </button>
              ))}
            </div>

            {/* Sort-by dropdown — ranks sectors by projects or organisations. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  Sort: {sortBy === 'numberOfProjects' ? 'Projects' : 'Organisations'}
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className={sortBy === 'numberOfProjects' ? 'bg-muted font-medium' : ''}
                  onClick={() => setSortBy('numberOfProjects')}
                >
                  <CodeChip className="mr-1.5">1</CodeChip>Projects
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={sortBy === 'numberOfOrganisations' ? 'bg-muted font-medium' : ''}
                  onClick={() => setSortBy('numberOfOrganisations')}
                >
                  <CodeChip className="mr-1.5">2</CodeChip>Organisations
                </DropdownMenuItem>
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
              COUNT_DATA_KEYS.forEach(({ key, label }) => {
                row[label] = (s as Record<string, unknown>)[key]
              })
              return row
            })}
            title="Projects & Organisations by Sector"
          />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 pb-4">
        <div className="bg-card" style={{ minHeight: chartHeight + 60 }}>
          {viewMode === 'chart' ? (
            <>
              {/* Chart */}
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
                      height={110}
                      tick={<CustomXAxisTick />}
                      interval={0}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                      orientation="left"
                      tickFormatter={formatCount}
                      fontSize={12}
                      tick={{ fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {COUNT_DATA_KEYS.map(({ key, label, color }) => (
                      visibleSeries.has(key) && (
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
                {COUNT_DATA_KEYS.map(({ key, label, color }) => {
                  const isVisible = visibleSeries.has(key)
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded transition-all ${
                        isVisible ? 'opacity-100' : 'opacity-40'
                      } hover:bg-muted/50`}
                      onClick={() => toggleSeries(key)}
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
               columns, color squares, h+v scroll). Projects/Organisations are
               COUNT columns: excluded from any footer total (summing them
               across overlapping sectors double-counts), so the auto totals row
               is suppressed. */
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
                  { key: 'numberOfProjects', label: 'Projects', numeric: true, includeInTotal: false, color: COLORS.numberOfProjects, format: (v) => (Number(v) || 0).toLocaleString() },
                  { key: 'numberOfOrganisations', label: 'Orgs', numeric: true, includeInTotal: false, color: COLORS.numberOfOrganisations, format: (v) => (Number(v) || 0).toLocaleString() },
                ]}
                totalsRow={false}
                maxHeight={chartHeight}
                emptyMessage="No data available for the selected date range"
              />
            )
          )}
        </div>

        {/* Explanatory text */}

        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart shows the number of projects and unique organisations involved in each {groupByLevel === '1' ? 'sector category' : groupByLevel === '3' ? 'sector' : 'sub-sector'}.
          Since activities can be tagged with multiple sectors, the same project or organisation may appear across different groupings.
          Use the toggle to switch between Sector Category, Sector, or Sub-sector levels, and check the table view footer for true unique totals across the entire portfolio.
        </p>
      </CardContent>
    </Card>
  )
}
