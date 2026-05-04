"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DollarSign, Wallet, Calendar, Download, Table as TableIcon, AlertCircle, CalendarIcon, SlidersHorizontal, Check, Search, ChevronDown, AlignLeft, Layers } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { IATI_ORGANIZATION_TYPES, getOrganizationTypeName, getOrganizationTypeCode } from '@/data/iati-organization-types'
import { SectorHierarchyFilter, SectorFilterSelection } from '@/components/maps/SectorHierarchyFilter'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

// Inline currency formatter to avoid initialization issues
const formatCurrencyAbbreviated = (value: number): string => {
  const isNegative = value < 0
  const absValue = Math.abs(value)

  let formatted = ''
  if (absValue >= 1000000000) {
    formatted = `$${Math.round(absValue / 1000000000)}b`
  } else if (absValue >= 1000000) {
    formatted = `$${Math.round(absValue / 1000000)}m`
  } else if (absValue >= 1000) {
    formatted = `$${Math.round(absValue / 1000)}k`
  } else {
    formatted = `$${Math.round(absValue)}`
  }

  return isNegative ? `-${formatted}` : formatted
}

// Generate list of available years (from 2010 to current year + 10)
const currentYear = new Date().getFullYear()
const AVAILABLE_YEARS = Array.from(
  { length: currentYear + 10 - 2010 + 1 },
  (_, i) => 2010 + i
)

// Organization type colors for stacked bars — slate-only for dashboard consistency.
const ORG_TYPE_COLORS: Record<string, string> = {
  '10': '#1e293b', // Government — slate-800
  '15': '#334155', // Other Public Sector — slate-700
  '21': '#475569', // International NGO — slate-600
  '22': '#4c5568', // National NGO — Blue Slate
  '23': '#5d6b7a', // Regional NGO — medium slate
  '24': '#64748b', // Partner Country NGO — slate-500
  '30': '#6b7789', // Public Private Partnership — Blue Slate light
  '40': '#7b95a7', // Multilateral — Cool Steel
  '60': '#5f7a8c', // Foundation — Cool Steel dark
  '70': '#94a3b8', // Private Sector — slate-400
  '71': '#9bb0bf', // Private Sector Provider — Cool Steel light
  '72': '#a3b5c2', // Private Sector Recipient — light steel
  '73': '#cbd5e1', // Private Sector Third — slate-300
  '80': '#cfd0d5', // Academic — Pale Slate
  '90': '#8a9199', // Other — neutral accent
}

// `Metric` enumerates every selectable metric in the chart's metric
// multi-select. `tx_<code>` keys map 1:1 to IATI transaction type codes 1–13;
// `budgets` and `planned` are the non-transaction metrics.
type Metric =
  | 'budgets'
  | 'planned'
  | 'tx_1' | 'tx_2' | 'tx_3' | 'tx_4' | 'tx_5' | 'tx_6' | 'tx_7'
  | 'tx_8' | 'tx_9' | 'tx_10' | 'tx_11' | 'tx_12' | 'tx_13'
type ChartViewMode = 'bar' | 'stacked' | 'table'
type OpenFilter = 'calendar' | 'year' | 'orgType' | 'sector' | 'metric' | null

// Ordered metric definitions. `code` is rendered as the badge in the
// dropdown for the 13 IATI transaction types. `budgets` and `planned`
// have no code badge.
const METRIC_DEFS: Array<{ key: Metric; label: string; code?: string }> = [
  { key: 'budgets', label: 'Total Budgets' },
  { key: 'planned', label: 'Total Planned Disbursements' },
  { key: 'tx_1', label: 'Incoming Funds', code: '1' },
  { key: 'tx_2', label: 'Outgoing Commitments', code: '2' },
  { key: 'tx_3', label: 'Disbursements', code: '3' },
  { key: 'tx_4', label: 'Expenditures', code: '4' },
  { key: 'tx_5', label: 'Interest Payments', code: '5' },
  { key: 'tx_6', label: 'Loan Repayments', code: '6' },
  { key: 'tx_7', label: 'Reimbursements', code: '7' },
  { key: 'tx_8', label: 'Purchases of Equity', code: '8' },
  { key: 'tx_9', label: 'Sales of Equity', code: '9' },
  { key: 'tx_10', label: 'Credit Guarantees', code: '10' },
  { key: 'tx_11', label: 'Incoming Commitments', code: '11' },
  { key: 'tx_12', label: 'Outgoing Pledges', code: '12' },
  { key: 'tx_13', label: 'Incoming Pledges', code: '13' },
]
const METRIC_LABEL: Record<Metric, string> = METRIC_DEFS.reduce((acc, m) => {
  acc[m.key] = m.label
  return acc
}, {} as Record<Metric, string>)
const ALL_METRIC_KEYS: Metric[] = METRIC_DEFS.map(m => m.key)

interface AllDonorsChartProps {
  dateRange?: {
    from: Date
    to: Date
  }
  refreshKey?: number
  onDataChange?: (data: DonorData[]) => void
  compact?: boolean
}

interface DonorData {
  id: string
  name: string
  acronym: string | null
  type: string | null
  totalBudget: number
  totalPlannedDisbursement: number
  totalCommitment: number
  totalActualDisbursement: number
  // Per-transaction-type aggregate keyed by IATI code ('1'..'13').
  // Optional for back-compat with any caller that constructs DonorData
  // without it (older API responses).
  byTxType?: Record<string, number>
}

export function AllDonorsHorizontalBarChart({ dateRange, refreshKey, onDataChange, compact = false }: AllDonorsChartProps) {
  const isExpanded = useChartExpansion()
  const [allData, setAllData] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)
  // Multi-select metrics. Default is Disbursements only so the initial
  // chart matches the previous default behavior. Users can layer in any
  // combination of Budgets, Planned Disbursements, and the 13 IATI
  // transaction types — values are summed across the selection.
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3'])
  const toggleMetric = (m: Metric) => {
    setSelectedMetrics(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
  }
  const clearMetrics = () => setSelectedMetrics([])
  const selectAllMetrics = () => setSelectedMetrics([...ALL_METRIC_KEYS])
  const metricsLabel = selectedMetrics.length === 0
    ? 'No metric selected'
    : selectedMetrics.length === 1
      ? METRIC_LABEL[selectedMetrics[0]]
      : `${selectedMetrics.length} metrics selected`
  // Primary metric is used for sort tie-breaks and any single-icon UI.
  const primaryMetric: Metric | null = selectedMetrics[0] ?? null
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('bar')
  const [showPercentage, setShowPercentage] = useState(false)
  // Empty array = "All organization types"; any non-empty selection narrows the chart.
  const [orgTypeFilter, setOrgTypeFilter] = useState<string[]>([])
  const toggleOrgType = (code: string) => {
    setOrgTypeFilter(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }
  const clearOrgTypes = () => setOrgTypeFilter([])
  const selectAllOrgTypes = () => setOrgTypeFilter(IATI_ORGANIZATION_TYPES.map(t => t.code))
  const orgTypeFilterLabel = orgTypeFilter.length === 0
    ? 'All organization types'
    : orgTypeFilter.length === 1
      ? IATI_ORGANIZATION_TYPES.find(t => t.code === orgTypeFilter[0])?.name || orgTypeFilter[0]
      : `${orgTypeFilter.length} types selected`

  // Calendar and year selection state (like other charts)
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)
  const [localDateRange, setLocalDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [hoveredDonorKey, setHoveredDonorKey] = useState<string | null>(null)

  // Sector filter state — uses the same multi-level shape as the Atlas
  // SectorHierarchyFilter: groups (1-digit), categories (3-digit), sub-sectors (5-digit).
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  })
  // Sector dropdown open state is mirrored into `openFilter` so only ONE
  // top-row dropdown can be open at a time (matches the year/calendar/
  // org-type dropdowns).
  const [showOnlyActiveSectors, setShowOnlyActiveSectors] = useState(false)

  // Coordinate which filter dropdown is open (only one at a time)
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null)
  const filterOpenHandler = (key: Exclude<OpenFilter, null>) => (open: boolean) => {
    setOpenFilter(prev => open ? key : (prev === key ? null : prev))
  }

  // Calculate effective date range from selected years and local date range
  const effectiveDateRange = useMemo(() => {
    if (localDateRange?.from && localDateRange?.to) {
      return localDateRange
    }
    // Fallback to passed dateRange or default
    if (dateRange?.from && dateRange?.to) {
      return dateRange
    }
    const now = new Date()
    return {
      from: new Date(now.getFullYear() - 5, 0, 1),
      to: now
    }
  }, [localDateRange, dateRange])

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
        const params = new URLSearchParams({
          dateFrom: '2000-01-01',
          dateTo: '2050-12-31'
        })
        const response = await apiFetch(`/api/analytics/all-donors?${params}`)
        if (response.ok) {
          const result = await response.json()
          // For now, use a reasonable default range
          const currentYr = new Date().getFullYear()
          setActualDataRange({ minYear: currentYr - 5, maxYear: currentYr })
          setSelectedYears([currentYr - 5, currentYr])
        }
      } catch (err) {
        console.error('Failed to fetch actual data range:', err)
        // Fallback to default range
        const currentYr = new Date().getFullYear()
        setActualDataRange({ minYear: currentYr - 5, maxYear: currentYr })
        setSelectedYears([currentYr - 5, currentYr])
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

  // Handle year click - select start and end of range
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

  // Select all years
  const selectAllYears = () => {
    setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
  }

  // Select only years with actual data
  const selectDataRange = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      const currentYr = new Date().getFullYear()
      setSelectedYears([currentYr - 5, currentYr])
    }
  }

  // Check if a year is between start and end
  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  // Get year label based on calendar type
  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return `${year}`
  }

  // Reset to defaults
  const handleReset = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      const currentYr = new Date().getFullYear()
      setSelectedYears([currentYr - 5, currentYr])
    }
    setOrgTypeFilter([])
    setSelectedMetrics(['tx_3'])
    setChartViewMode('bar')
    setSectorFilter({ sectorCategories: [], sectors: [], subSectors: [] })
    const calendarYear = customYears.find(cy =>
      cy.name.toLowerCase().includes('calendar') ||
      cy.name.toLowerCase().includes('gregorian')
    ) || customYears[0]
    if (calendarYear) {
      setCalendarType(calendarYear.id)
    }
  }

  // Use date strings for dependency array stability
  const dateFromStr = effectiveDateRange.from.toISOString()
  const dateToStr = effectiveDateRange.to.toISOString()
  const sectorFilterKey = useMemo(() => (
    [
      sectorFilter.sectorCategories.slice().sort().join(','),
      sectorFilter.sectors.slice().sort().join(','),
      sectorFilter.subSectors.slice().sort().join(','),
    ].join('|')
  ), [sectorFilter])

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFromStr, dateToStr, refreshKey, orgTypeFilter.join(','), sectorFilterKey, calendarType])

  const fetchData = async () => {
    try {
      setLoading(true)

      const queryParams = new URLSearchParams({
        dateFrom: effectiveDateRange.from.toISOString(),
        dateTo: effectiveDateRange.to.toISOString(),
        orgType: orgTypeFilter.length > 0 ? orgTypeFilter.join(',') : 'all',
      })

      if (calendarType) {
        queryParams.set('customYearId', calendarType)
      }

      // Multi-level sector filter (groups + categories + sub-sectors).
      if (sectorFilter.sectorCategories.length > 0) {
        queryParams.set('sectorGroups', sectorFilter.sectorCategories.join(','))
      }
      if (sectorFilter.sectors.length > 0) {
        queryParams.set('sectorCategories', sectorFilter.sectors.join(','))
      }
      if (sectorFilter.subSectors.length > 0) {
        queryParams.set('sectorSubSectors', sectorFilter.subSectors.join(','))
      }

      console.log('[AllDonors] fetching with sector filter:', {
        groups: sectorFilter.sectorCategories,
        categories: sectorFilter.sectors,
        subSectors: sectorFilter.subSectors,
        url: `/api/analytics/all-donors?${queryParams}`,
      })
      const response = await apiFetch(`/api/analytics/all-donors?${queryParams}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch donor data')
      }

      setAllData(result.data || [])
      onDataChange?.(result.data || [])
    } catch (error) {
      console.error('[AllDonorsChart] Error fetching donor data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Resolve a single metric's value off a donor record. Transaction-type
  // keys (`tx_<code>`) read from `byTxType[<code>]`; the API guarantees
  // those entries exist for every donor it returns, but we tolerate older
  // payloads (no `byTxType`) by defaulting to 0.
  const getMetricValue = (donor: DonorData, m: Metric): number => {
    if (m === 'budgets') return donor.totalBudget || 0
    if (m === 'planned') return donor.totalPlannedDisbursement || 0
    const code = m.slice(3) // 'tx_3' -> '3'
    return donor.byTxType?.[code] || 0
  }

  // Sum every selected metric for a single donor — this is the displayed
  // value across the whole UI (bar length, tooltips, table totals, CSV).
  const sumForDonor = (d: DonorData): number =>
    selectedMetrics.reduce((s, m) => s + getMetricValue(d, m), 0)

  // Filter and sort data by the summed value across selected metrics.
  // Donors whose sum is 0 fall out of the chart entirely.
  const displayData = useMemo(() => {
    if (selectedMetrics.length === 0) return []
    return [...allData]
      .map(d => ({ donor: d, sum: sumForDonor(d) }))
      .filter(({ sum }) => sum > 0)
      .sort((a, b) => b.sum - a.sum)
      .map(({ donor }) => donor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allData, selectedMetrics])

  // Grand total of the selected-metric sum across all visible donors —
  // used for the percentage column in tooltips/CSV.
  const total = useMemo(() => {
    return displayData.reduce((sum, d) => sum + sumForDonor(d), 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayData, selectedMetrics])

  const formatCurrency = (value: number) => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      return formatCurrencyAbbreviated(value)
    } catch (error) {
      console.error('[AllDonorsChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  const formatPercentage = (value: number) => {
    if (total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  // Prepare data for chart. `value` is the sum across all selected metrics.
  const chartData = useMemo(() => {
    return displayData.map(donor => {
      const value = sumForDonor(donor)

      // Use acronym if available, otherwise use truncated name
      const displayName = donor.acronym || (donor.name.length > 30 ? donor.name.substring(0, 30) + '...' : donor.name)

      return {
        name: displayName,
        fullName: donor.name,
        acronym: donor.acronym,
        value,
        totalBudget: donor.totalBudget,
        totalPlannedDisbursement: donor.totalPlannedDisbursement,
        totalCommitment: donor.totalCommitment || 0,
        totalActualDisbursement: donor.totalActualDisbursement,
        byTxType: donor.byTxType,
        percentage: total > 0 ? ((value / total) * 100) : 0,
        type: donor.type,
        typeName: donor.type ? getOrganizationTypeName(donor.type) : null
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayData, selectedMetrics, total])

  // Prepare stacked data by org type - with individual donors as stacked segments
  const stackedData = useMemo(() => {
    if (chartViewMode !== 'stacked') return { rows: [], allDonorKeys: [], donorInfo: {} }

    // Group by org type
    const byType: Record<string, { type: string; typeName: string; value: number; donors: typeof chartData }> = {}

    chartData.forEach(donor => {
      const typeCode = donor.type || '90' // Default to "Other" if no type
      if (!byType[typeCode]) {
        byType[typeCode] = {
          type: typeCode,
          typeName: getOrganizationTypeName(typeCode),
          value: 0,
          donors: []
        }
      }
      byType[typeCode].value += donor.value
      byType[typeCode].donors.push(donor)
    })

    // Sort groups by total value and donors within each group
    const sortedGroups = Object.values(byType)
      .sort((a, b) => b.value - a.value)
      .map(group => ({
        ...group,
        donors: group.donors.sort((a, b) => b.value - a.value)
      }))

    // Create unique donor keys and info map
    const allDonorKeys: string[] = []
    const donorInfo: Record<string, { name: string; fullName: string; acronym: string | null; typeCode: string; typeName: string; color: string }> = {}

    // Generate colors for each donor within their org type
    sortedGroups.forEach(group => {
      const baseColor = ORG_TYPE_COLORS[group.type] || '#64748b'
      group.donors.forEach((donor, idx) => {
        const key = `donor_${donor.name.replace(/[^a-zA-Z0-9]/g, '_')}_${idx}`
        allDonorKeys.push(key)
        // Generate shade variation based on index
        const shade = Math.max(0.4, 1 - (idx * 0.1))
        const r = parseInt(baseColor.slice(1, 3), 16)
        const g = parseInt(baseColor.slice(3, 5), 16)
        const b = parseInt(baseColor.slice(5, 7), 16)
        const color = `rgb(${Math.round(r * shade + 255 * (1 - shade))}, ${Math.round(g * shade + 255 * (1 - shade))}, ${Math.round(b * shade + 255 * (1 - shade))})`
        donorInfo[key] = {
          name: donor.name,
          fullName: donor.fullName,
          acronym: donor.acronym,
          typeCode: group.type,
          typeName: group.typeName,
          color
        }
      })
    })

    // Transform to recharts format - each row has all donor values as separate keys
    const rows = sortedGroups.map(group => {
      const row: Record<string, any> = {
        name: group.typeName,
        typeCode: group.type,
        totalValue: group.value,
        donorCount: group.donors.length
      }

      group.donors.forEach((donor, idx) => {
        const key = `donor_${donor.name.replace(/[^a-zA-Z0-9]/g, '_')}_${idx}`
        row[key] = donor.value
      })

      return row
    })

    return { rows, allDonorKeys, donorInfo }
  }, [chartData, chartViewMode])

  // Custom Y-axis tick that never wraps text
  const NoWrapTick = ({ x, y, payload }: any) => {
    const label = payload?.value || ''
    return (
      <text x={x} y={y} textAnchor="end" dominantBaseline="central" fill="#64748b" fontSize={11}>
        {label}
      </text>
    )
  }

  // Single Blue Slate fill for all bars in the non-stacked view —
  // keeps this chart visually consistent with other ranked breakdown
  // charts on the dashboard.
  const barColor = '#4c5568'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload

      // Single label that always reflects the current metric selection.
      // For one selected metric we use that metric's name; for two or more
      // we use a generic "Selected Total" so the per-metric breakdown
      // doesn't bloat the tooltip (out of scope per spec).
      const tooltipLabel = selectedMetrics.length === 1
        ? METRIC_LABEL[selectedMetrics[0]]
        : 'Selected Total'

      // Format org name with acronym
      const orgDisplay = data.acronym
        ? `${data.fullName} (${data.acronym})`
        : data.fullName

      const subtitle = data.type ? (
        <span className="flex items-center gap-1.5">
          {getOrganizationTypeCode(data.type) && (
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
              {getOrganizationTypeCode(data.type)}
            </code>
          )}
          <span>{getOrganizationTypeName(data.type)}</span>
        </span>
      ) : undefined

      const rows: any[] = [
        {
          label: tooltipLabel,
          value: formatTooltipCurrency(data.value, isExpanded),
          color: '#4c5568',
        },
      ]
      if (showPercentage) {
        rows[0].bordered = true
        rows.push({
          label: '% of Total',
          value: formatPercentage(data.value),
        })
      }

      return (
        <ChartTooltipCard
          title={orgDisplay}
          subtitle={subtitle}
          rows={rows}
        />
      )
    }
    return null
  }

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = chartViewMode === 'stacked' ? stackedData.rows : chartData
    if (dataToExport.length === 0) return

    let headers: string[]
    let rows: string[]

    if (chartViewMode === 'stacked') {
      headers = ['Organization Type', 'Type Code', 'Total Value', 'Number of Development Partners']
      rows = stackedData.rows.map((d: any) => {
        return [
          d.name,
          d.typeCode,
          d.totalValue.toFixed(2),
          d.donorCount.toString()
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })
    } else {
      headers = [
        'Organization',
        'Acronym',
        'Type Code',
        'Type Name',
        'Total Budgets',
        'Planned Disbursements',
        'Commitments',
        'Actual Disbursements',
        'Selected Metrics',
        'Selected Total',
        'Percentage of Total'
      ]
      const selectedLabel = selectedMetrics.map(m => METRIC_LABEL[m]).join('; ')
      rows = chartData.map(d => {
        const selectedValue = d.value.toFixed(2)
        const percentage = total > 0 ? `${((d.value / total) * 100).toFixed(2)}%` : '0%'

        return [
          d.fullName || '',
          d.acronym || '',
          d.type || '',
          d.typeName || '',
          d.totalBudget.toFixed(2),
          d.totalPlannedDisbursement.toFixed(2),
          d.totalCommitment.toFixed(2),
          d.totalActualDisbursement.toFixed(2),
          selectedLabel,
          selectedValue,
          percentage
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })
    }

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `all-donors-financial-overview-${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />
    }
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">No data available</p>
        </div>
      )
    }
    // Show top 10 donors in compact mode
    const compactData = chartData.slice(0, 10)
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={compactData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis type="number" tickFormatter={formatAxisCurrency} fontSize={10} />
            <YAxis
              type="category"
              dataKey="name"
              width={55}
              tick={<NoWrapTick />}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill={barColor}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading || customYearsLoading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  const hasData = chartViewMode === 'stacked' ? stackedData.rows.length > 0 : chartData.length > 0

  if (!hasData) {
    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left Side - Calendar and Year Selector */}
          <div className="flex items-start gap-2">
            {customYears.length > 0 && (
              <>
                {/* Calendar Type Selector */}
                <div className="flex gap-1 border rounded-lg p-1 bg-white">
                  <DropdownMenu open={openFilter === 'calendar'} onOpenChange={filterOpenHandler('calendar')}>
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

                {/* Year Range Selector */}
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex gap-1 border rounded-lg p-1 bg-white">
                    <DropdownMenu open={openFilter === 'year'} onOpenChange={filterOpenHandler('year')}>
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

          {/* Right Side - Org Type Filter + Metric multi-select */}
          <div className="flex items-center gap-3">
            <DropdownMenu open={openFilter === 'orgType'} onOpenChange={filterOpenHandler('orgType')}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[280px] h-9 justify-between font-normal">
                  <span className="truncate text-body">{orgTypeFilterLabel}</span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[360px] max-h-[400px] overflow-y-auto p-1"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="sticky top-0 z-10 bg-card flex items-center justify-between gap-2 px-2 py-2 border-b border-border mb-1">
                  <span className="text-helper font-semibold text-foreground">Organization Types</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={selectAllOrgTypes}
                      disabled={orgTypeFilter.length === IATI_ORGANIZATION_TYPES.length}
                      className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    <button
                      type="button"
                      onClick={clearOrgTypes}
                      disabled={orgTypeFilter.length === 0}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {IATI_ORGANIZATION_TYPES.map(type => {
                  const checked = orgTypeFilter.includes(type.code)
                  return (
                    <button
                      key={type.code}
                      type="button"
                      onClick={() => toggleOrgType(type.code)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
                    >
                      <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
                      <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">{type.code}</code>
                      <span className="text-foreground truncate">{type.name}</span>
                    </button>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Metric multi-select — same shape as the main controls bar so
                the user can re-add a metric while seeing the empty state. */}
            <DropdownMenu open={openFilter === 'metric'} onOpenChange={filterOpenHandler('metric')}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[280px] h-9 justify-between font-normal">
                  <span className="flex items-center gap-2 truncate text-body">
                    {selectedMetrics.length === 1 && primaryMetric === 'budgets' && (
                      <Wallet className="h-4 w-4 flex-shrink-0" />
                    )}
                    {selectedMetrics.length === 1 && primaryMetric === 'planned' && (
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                    )}
                    {selectedMetrics.length === 1 && primaryMetric && primaryMetric.startsWith('tx_') && (
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{metricsLabel}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[320px] max-h-[400px] overflow-y-auto p-1"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="sticky top-0 z-10 bg-card flex items-center justify-between gap-2 px-2 py-2 border-b border-border mb-1">
                  <span className="text-helper font-semibold text-foreground">Metrics</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={selectAllMetrics}
                      disabled={selectedMetrics.length === ALL_METRIC_KEYS.length}
                      className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    <button
                      type="button"
                      onClick={clearMetrics}
                      disabled={selectedMetrics.length === 0}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {METRIC_DEFS.map((def, idx) => {
                  const checked = selectedMetrics.includes(def.key)
                  const showSeparator = idx === 2
                  return (
                    <React.Fragment key={def.key}>
                      {showSeparator && <div className="my-1 border-t border-border" />}
                      <button
                        type="button"
                        onClick={() => toggleMetric(def.key)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
                      >
                        <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
                        {def.code && (
                          <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">{def.code}</code>
                        )}
                        <span className="text-foreground truncate">{def.label}</span>
                      </button>
                    </React.Fragment>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            {selectedMetrics.length === 0 ? (
              <>
                <p className="text-muted-foreground font-medium">Select at least one metric</p>
                <p className="text-body text-muted-foreground mt-2">Choose Total Budgets, Planned Disbursements, or any IATI transaction type from the metrics dropdown</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground font-medium">No development partner data available</p>
                <p className="text-body text-muted-foreground mt-2">Try adjusting your date range or filters</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls Row - Calendar/Year on left, Filters on right */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left Side - Calendar and Year Selector */}
        <div className="flex items-start gap-2">
          {customYears.length > 0 && (
            <>
              {/* Calendar Type Selector */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <DropdownMenu open={openFilter === 'calendar'} onOpenChange={filterOpenHandler('calendar')}>
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
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex gap-1 border rounded-lg p-1 bg-white">
                  <DropdownMenu open={openFilter === 'year'} onOpenChange={filterOpenHandler('year')}>
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

        {/* Right Side - Org Type Filter, Sector Filter, Metric Selector, View Mode and Export Controls */}
        <div className="flex items-center gap-3">
          <DropdownMenu open={openFilter === 'orgType'} onOpenChange={filterOpenHandler('orgType')}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[280px] h-9 justify-between font-normal">
                <span className="truncate text-body">{orgTypeFilterLabel}</span>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[360px] max-h-[400px] overflow-y-auto p-1"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="sticky top-0 z-10 bg-card flex items-center justify-between gap-2 px-2 py-2 border-b border-border mb-1">
                <span className="text-helper font-semibold text-foreground">Organization Types</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={selectAllOrgTypes}
                    disabled={orgTypeFilter.length === IATI_ORGANIZATION_TYPES.length}
                    className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={clearOrgTypes}
                    disabled={orgTypeFilter.length === 0}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {IATI_ORGANIZATION_TYPES.map(type => {
                const checked = orgTypeFilter.includes(type.code)
                return (
                  <button
                    key={type.code}
                    type="button"
                    onClick={() => toggleOrgType(type.code)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
                  >
                    <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
                    <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">{type.code}</code>
                    <span className="text-foreground truncate">{type.name}</span>
                  </button>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sector Filter — same hierarchical picker used in the Atlas tab.
              `showOnlyActiveSectors` toggle is local-only (no activityCounts
              wired since the chart aggregates server-side). Open-state is
              coordinated through `openFilter` so only one top-row dropdown
              can be open at a time. */}
          <SectorHierarchyFilter
            selected={sectorFilter}
            onChange={setSectorFilter}
            open={openFilter === 'sector'}
            onOpenChange={filterOpenHandler('sector')}
            showOnlyActiveSectors={showOnlyActiveSectors}
            onShowOnlyActiveSectorsChange={setShowOnlyActiveSectors}
            className="min-w-[280px] h-9"
          />

          {/* Metric multi-select. Mirrors the Organization Types dropdown
              pattern in this same file. The trigger only shows a leading
              icon when EXACTLY ONE metric is selected (Wallet for budgets,
              Calendar for planned, DollarSign for any tx type); otherwise
              the trigger label is the count summary. */}
          <DropdownMenu open={openFilter === 'metric'} onOpenChange={filterOpenHandler('metric')}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[280px] h-9 justify-between font-normal">
                <span className="flex items-center gap-2 truncate text-body">
                  {selectedMetrics.length === 1 && primaryMetric === 'budgets' && (
                    <Wallet className="h-4 w-4 flex-shrink-0" />
                  )}
                  {selectedMetrics.length === 1 && primaryMetric === 'planned' && (
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                  )}
                  {selectedMetrics.length === 1 && primaryMetric && primaryMetric.startsWith('tx_') && (
                    <DollarSign className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{metricsLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[320px] max-h-[400px] overflow-y-auto p-1"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="sticky top-0 z-10 bg-card flex items-center justify-between gap-2 px-2 py-2 border-b border-border mb-1">
                <span className="text-helper font-semibold text-foreground">Metrics</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={selectAllMetrics}
                    disabled={selectedMetrics.length === ALL_METRIC_KEYS.length}
                    className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={clearMetrics}
                    disabled={selectedMetrics.length === 0}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {METRIC_DEFS.map((def, idx) => {
                const checked = selectedMetrics.includes(def.key)
                // Insert a visual separator between the two non-transaction
                // metrics (budgets, planned) and the 13 IATI transaction types.
                const showSeparator = idx === 2
                return (
                  <React.Fragment key={def.key}>
                    {showSeparator && <div className="my-1 border-t border-border" />}
                    <button
                      type="button"
                      onClick={() => toggleMetric(def.key)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
                    >
                      <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
                      {def.code && (
                        <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">{def.code}</code>
                      )}
                      <span className="text-foreground truncate">{def.label}</span>
                    </button>
                  </React.Fragment>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartViewMode('bar')}
              className={cn("h-8 w-8", chartViewMode === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Horizontal Bar Chart"
              aria-label="Horizontal Bar Chart"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartViewMode('stacked')}
              className={cn("h-8 w-8", chartViewMode === 'stacked' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Stacked by Org Type"
              aria-label="Stacked Horizontal Bar Chart"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChartViewMode('table')}
              className={cn("h-8 w-8", chartViewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Table View"
              aria-label="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
          {/* CSV export — wrapped in a matching bordered container so it
              reads as a peer of the chart-type toggle group at the same
              visual scale. */}
          <div className="flex items-center rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportCSV}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div id="all-donors-chart">
        {chartViewMode === 'table' ? (
          <div className="rounded-md border overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-white z-10 [&>th]:align-bottom">
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  {/* One column per selected metric — column headers reflect
                      the user's current selection in the metric multi-select.
                      A trailing "Total" column shows the sum across all
                      selected metrics (only when 2+ are selected, otherwise
                      it's redundant with the single metric column). */}
                  {selectedMetrics.map((m) => {
                    const code = METRIC_DEFS.find(d => d.key === m)?.code
                    return (
                      <TableHead key={m} className="text-right whitespace-normal">
                        {code && (
                          <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs mr-1.5">
                            {code}
                          </code>
                        )}
                        {METRIC_LABEL[m]}
                      </TableHead>
                    )
                  })}
                  {selectedMetrics.length > 1 && (
                    <TableHead className="text-right">Total</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.fullName}</TableCell>
                    <TableCell>
                      {item.type && (
                        <span className="flex items-center gap-1.5">
                          <code className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">
                            {item.type}
                          </code>
                          <span className="text-body text-muted-foreground">{item.typeName}</span>
                        </span>
                      )}
                    </TableCell>
                    {selectedMetrics.map((m) => (
                      <TableCell key={m} className="text-right">
                        {formatCurrencyAbbreviated(getMetricValue(item as unknown as DonorData, m))}
                      </TableCell>
                    ))}
                    {selectedMetrics.length > 1 && (
                      <TableCell className="text-right font-medium">
                        {formatCurrencyAbbreviated(item.value)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : chartViewMode === 'stacked' ? (
          <div className="p-4">
            <ResponsiveContainer width="100%" height={Math.max(400, stackedData.rows.length * 60)}>
              <BarChart
                data={stackedData.rows}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_STRUCTURE_COLORS.grid}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={formatAxisCurrency}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={<NoWrapTick />}
                  axisLine={{ stroke: '#cbd5e1' }}
                  width={170}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0]?.payload
                      // Use the tracked hovered donor key
                      const donorDetails = hoveredDonorKey ? stackedData.donorInfo[hoveredDonorKey] : null
                      const hoveredValue = hoveredDonorKey && dataPoint ? dataPoint[hoveredDonorKey] : null

                      // Format donor name with acronym
                      const donorDisplay = donorDetails
                        ? donorDetails.acronym
                          ? `${donorDetails.fullName} (${donorDetails.acronym})`
                          : donorDetails.fullName
                        : null

                      return (
                        <div className="bg-white border border-border rounded-lg shadow-lg overflow-hidden max-w-md">
                          <div className="bg-surface-muted px-3 py-2 border-b border-border">
                            <div className="flex items-center gap-2">
                              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
                                {dataPoint?.typeCode}
                              </code>
                              <span className="font-semibold text-foreground text-body">{label}</span>
                            </div>
                            <p className="text-body text-foreground mt-1 font-medium">
                              {dataPoint?.donorCount} organization{dataPoint?.donorCount !== 1 ? 's' : ''}, Total {formatTooltipCurrency(dataPoint?.totalValue || 0, isExpanded)}
                            </p>
                          </div>
                          {donorDetails && hoveredValue ? (
                            <div className="p-3">
                              <p className="font-semibold text-foreground text-body">{donorDisplay}</p>
                              <p className="text-lg font-bold text-foreground mt-1">
                                {formatTooltipCurrency(hoveredValue, isExpanded)}
                              </p>
                            </div>
                          ) : (
                            <div className="p-2 text-helper text-muted-foreground">
                              Hover over a segment to see details
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {stackedData.allDonorKeys.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="donors"
                    fill={stackedData.donorInfo[key]?.color || '#64748b'}
                    onMouseEnter={() => setHoveredDonorKey(key)}
                    onMouseLeave={() => setHoveredDonorKey(null)}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-4">
            <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 35)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_STRUCTURE_COLORS.grid}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={formatAxisCurrency}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={<NoWrapTick />}
                  axisLine={{ stroke: '#cbd5e1' }}
                  width={140}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={barColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed">
        This chart ranks funding organizations by their financial contributions, helping stakeholders understand the development assistance landscape. Pick any combination of metrics — Total Budgets, Total Planned Disbursements, and the 13 IATI transaction types — from the metrics dropdown; bars show the sum across every metric you select.
        The stacked view groups development partners by organization type, showing individual organizations as segments within each bar for quick identification of major contributors.
      </p>
    </div>
  )
}
