"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Download, CalendarIcon, RotateCcw } from 'lucide-react'
import { LoadingText } from '@/components/ui/loading-text'
import { format } from 'date-fns'
import html2canvas from 'html2canvas'
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

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

// Color palette - brand colors
const COLORS = {
  newCommitments: '#dc2625',       // Primary Scarlet
  plannedDisbursements: '#4c5568', // Blue Slate
  actualDisbursements: '#7b95a7',  // Cool Steel
  budgets: '#5f7f7a',              // Deep Teal
}

// Data keys configuration for financial metrics
const FINANCIAL_DATA_KEYS = [
  { key: 'budgets', label: 'Budgets (USDm)', color: COLORS.budgets },
  { key: 'plannedDisbursements', label: 'Planned Disbursements (USDm)', color: COLORS.plannedDisbursements },
  { key: 'newCommitments', label: 'Commitments (USDm)', color: COLORS.newCommitments },
  { key: 'actualDisbursements', label: 'Disbursements (USDm)', color: COLORS.actualDisbursements },
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
  // First digit is always the category code (no padding needed)
  const categoryCode = code.substring(0, 1)
  // First 3 digits are the sector code (if available)
  const sectorCodePrefix = code.length >= 3 ? code.substring(0, 3) : code

  return {
    categoryCode,
    categoryName: SECTOR_CATEGORIES[categoryCode] || 'Unknown Category',
    sectorCodePrefix,
    sectorName: SECTOR_NAMES[sectorCodePrefix] || 'Unknown Sector'
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
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [sectors, setSectors] = useState<SectorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupByLevel, setGroupByLevel] = useState<'1' | '3' | '5'>('3')
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

  const chartRef = useRef<HTMLDivElement>(null)

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


  // Process sectors data: top N + "All Other Sectors"
  const chartData = useMemo(() => {
    if (sectors.length === 0) return []

    const topSectors = sectors.slice(0, TOP_SECTORS_COUNT)
    const otherSectors = sectors.slice(TOP_SECTORS_COUNT)

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
  }, [sectors])

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
    const fullName = sectorData?.sectorName || label
    const sectorCode = sectorData?.sectorCode || ''

    // Get parent sector info for hierarchical display
    const parentInfo = sectorCode && sectorCode !== 'OTHER' ? getParentSectorInfo(sectorCode) : null

    return (
      <div className="bg-card border rounded-lg shadow-lg min-w-[320px] overflow-hidden">
        <div className="bg-surface-muted px-4 py-3 border-b border-border">
          {/* Hierarchical sector info */}
          {parentInfo && groupByLevel !== '1' && (
            <div className="mb-2 text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground mr-1.5">{parentInfo.categoryCode}</span>
              <span>{parentInfo.categoryName}</span>
              {groupByLevel === '5' && (
                <>
                  <span className="mx-1">›</span>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground mr-1.5">{parentInfo.sectorCodePrefix}</span>
                  <span>{parentInfo.sectorName}</span>
                </>
              )}
            </div>
          )}
          <div>
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground mr-2">
              {sectorCode}
            </span>
            <span className="font-semibold text-sm">{fullName}</span>
          </div>
        </div>
        <div className="p-4">
        <table className="w-full text-sm">
          <tbody>
            {payload.map((entry, index) => (
              <tr key={index} className={(entry.name as string || '').includes('Planned Disbursements') ? 'border-b' : ''}>
                <td className="py-1.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    {(() => {
                      const codeMap: Record<string, string> = { 'Incoming Funds': '1', 'Outgoing Commitments': '2', 'Commitments': '2', 'Disbursements': '3', 'Expenditures': '4', 'Credit Guarantee': '10', 'Incoming Commitments': '11', 'Disbursement': '3' }
                      const name = (entry.name as string || '').replace(/\s*\(.*?\)\s*$/, '')
                      const code = codeMap[name]
                      return code ? <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground">{code}</code> : null
                    })()}
                    <span className="text-foreground">{(entry.name as string || '').replace(/\s*\(.*?\)\s*$/, '')}</span>
                  </div>
                </td>
                <td className="py-1.5 text-right font-medium">
                  {entry.name?.includes('Number')
                    ? entry.value?.toLocaleString()
                    : formatCurrencyAbbreviated(entry.value as number)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
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

  const handleSaveChart = async () => {
    if (chartRef.current && localDateRange?.from && localDateRange?.to) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
        })
        const link = document.createElement('a')
        link.download = `sector-disbursement-${format(localDateRange.from, 'yyyy-MM-dd')}-to-${format(localDateRange.to, 'yyyy-MM-dd')}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } catch (error) {
        console.error('Error saving chart:', error)
      }
    }
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

  // Reset to defaults: Data range years, Calendar Year (Gregorian), Sector view
  const handleReset = () => {
    // Reset to data range (or fallback to all years)
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
    }
    // Reset to Sector level (3-digit)
    setGroupByLevel('3')
    // Reset to Calendar Year (look for one with name containing "Calendar" or first one)
    const calendarYear = customYears.find(cy =>
      cy.name.toLowerCase().includes('calendar') ||
      cy.name.toLowerCase().includes('gregorian')
    ) || customYears[0]
    if (calendarYear) {
      setCalendarType(calendarYear.id)
    }
  }

  const chartHeight = compact ? 200 : 500

  // Compact mode
  if (compact) {
    // Show loading if still loading OR if custom years haven't loaded yet
    if ((loading && sectors.length === 0) || customYearsLoading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    }
    if (error) {
      return <div className="h-full flex items-center justify-center text-red-500"><p className="text-sm">{error}</p></div>
    }
    return (
      <div ref={chartRef} className="bg-card h-full">
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
                tickFormatter={formatYAxisCurrency}
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
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Planned and Actual Disbursement by Sector
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <LoadingText>Loading disbursement data...</LoadingText>
        </CardContent>
      </Card>
    )
  }

  // Non-compact mode: error state
  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
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
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        {/* Controls Row */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          {/* Calendar & Year Selectors - Left Side */}
          <div className="flex items-start gap-2 flex-wrap">
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
                      {customYears.map(cy => (
                        <DropdownMenuItem
                          key={cy.id}
                          className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                          onClick={() => setCalendarType(cy.id)}
                        >
                          {cy.name}
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
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
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
                          <span className="text-xs font-medium text-foreground">Select Year Range</span>
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
                                    ? 'bg-primary text-primary-foreground'
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
                  {/* Date Range Indicator */}
                  {localDateRange?.from && localDateRange?.to && (
                    <span className="text-xs text-muted-foreground text-center">
                      {format(localDateRange.from, 'MMM d, yyyy')} – {format(localDateRange.to, 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Controls - Right Side */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Group By Toggle Buttons */}
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <Button
                variant={groupByLevel === '1' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setGroupByLevel('1')}
              >
                Sector Category
              </Button>
              <Button
                variant={groupByLevel === '3' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setGroupByLevel('3')}
              >
                Sector
              </Button>
              <Button
                variant={groupByLevel === '5' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setGroupByLevel('5')}
              >
                Sub-sector
              </Button>
            </div>

            {/* Chart/Table Toggle */}
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8",
                  viewMode === 'chart'
                    ? "bg-card shadow-sm text-foreground hover:bg-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('chart')}
              >
                Chart
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8",
                  viewMode === 'table'
                    ? "bg-card shadow-sm text-foreground hover:bg-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>

            {/* Reset Button */}
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={handleReset}
                title="Reset to defaults"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Save Button */}
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={handleSaveChart}
                title="Save chart as image"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 pb-4">
        <div ref={chartRef} className="bg-card" style={{ minHeight: chartHeight + 60 }}>
          {viewMode === 'chart' ? (
            <>
              {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mb-4">
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
                        tickFormatter={formatYAxisCurrency}
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

            </>
          ) : (
            /* Table View */
            <div className="overflow-auto" style={{ height: chartHeight }}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="font-semibold text-foreground sticky left-0 bg-muted">Sector</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Budgets (USDm)</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Planned Disbursements (USDm)</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Commitments (USDm)</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Disbursements (USDm)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedYears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Select one or more years to view data
                      </TableCell>
                    </TableRow>
                  ) : chartData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No data available for the selected date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    chartData.map((sector, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/50">
                        <TableCell className="font-medium sticky left-0 bg-card">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground mr-2">
                            {sector.sectorCode}
                          </span>
                          {sector.sectorName}
                        </TableCell>
                        <TableCell className="text-right">
                          {(sector.budgets / 1000000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(sector.plannedDisbursements / 1000000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(sector.newCommitments / 1000000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(sector.actualDisbursements / 1000000).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {chartData.length > 0 && selectedYears.length > 0 && (
                  <tfoot>
                    <TableRow className="bg-muted font-semibold border-t-2">
                      <TableCell className="sticky left-0 bg-muted">Total</TableCell>
                      <TableCell className="text-right">
                        {(chartData.reduce((sum, s) => sum + s.budgets, 0) / 1000000).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(chartData.reduce((sum, s) => sum + s.plannedDisbursements, 0) / 1000000).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(chartData.reduce((sum, s) => sum + s.newCommitments, 0) / 1000000).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(chartData.reduce((sum, s) => sum + s.actualDisbursements, 0) / 1000000).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>
          )}
        </div>

        {/* Explanatory Text */}
        <p className="text-xs text-muted-foreground mt-4">
          This chart compares budgets, planned disbursements, commitments, and actual disbursements by sector.
          Toggle metrics on/off using the legend above. View data by Sector Category, Sector, or Sub-sector level.
          The top 10 sectors are shown individually; remaining sectors are grouped in &ldquo;All Other Sectors&rdquo;.
          Budgets and planned disbursements are pro-rated when spanning multiple years.
          Compare planned vs actual to identify funding gaps or over-delivery.
        </p>
      </CardContent>
    </Card>
  )
}
