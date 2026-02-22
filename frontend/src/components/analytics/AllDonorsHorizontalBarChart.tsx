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
import { LoadingText } from '@/components/ui/loading-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DollarSign, Wallet, Calendar, Download, FileImage, Table as TableIcon, AlertCircle, CalendarIcon, RotateCcw, SlidersHorizontal, Check, Search } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { IATI_ORGANIZATION_TYPES, getOrganizationTypeName, getOrganizationTypeCode } from '@/data/iati-organization-types'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';

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

// Organization type colors for stacked bars
const ORG_TYPE_COLORS: Record<string, string> = {
  '10': '#1e40af', // Government - blue-800
  '15': '#3b82f6', // Other Public Sector - blue-500
  '21': '#059669', // International NGO - emerald-600
  '22': '#10b981', // National NGO - emerald-500
  '23': '#34d399', // Regional NGO - emerald-400
  '24': '#6ee7b7', // Partner Country NGO - emerald-300
  '30': '#7c3aed', // Public Private Partnership - violet-600
  '40': '#dc2626', // Multilateral - red-600
  '60': '#f59e0b', // Foundation - amber-500
  '70': '#64748b', // Private Sector - slate-500
  '71': '#475569', // Private Sector Provider - slate-600
  '72': '#94a3b8', // Private Sector Recipient - slate-400
  '73': '#cbd5e1', // Private Sector Third - slate-300
  '80': '#8b5cf6', // Academic - violet-500
  '90': '#6b7280', // Other - gray-500
}

type ViewMode = 'budgets' | 'planned' | 'commitments' | 'disbursements'
type ChartViewMode = 'bar' | 'stacked' | 'table'
type SectorAggregationLevel = 'group' | 'category' | 'sector'

interface SectorHierarchyItem {
  code: string
  name: string
  groupCode?: string
  groupName?: string
  categoryCode?: string
  categoryName?: string
}

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
}

export function AllDonorsHorizontalBarChart({ dateRange, refreshKey, onDataChange, compact = false }: AllDonorsChartProps) {
  const [allData, setAllData] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('disbursements')
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('bar')
  const [showPercentage, setShowPercentage] = useState(false)
  const [orgTypeFilter, setOrgTypeFilter] = useState<string>('all')

  // Calendar and year selection state (like other charts)
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)
  const [localDateRange, setLocalDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [hoveredDonorKey, setHoveredDonorKey] = useState<string | null>(null)

  // Sector filter state
  const [sectorAggregationLevel, setSectorAggregationLevel] = useState<SectorAggregationLevel>('group')
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set())
  const [sectorData, setSectorData] = useState<SectorHierarchyItem[]>([])
  const [sectorFilterSearch, setSectorFilterSearch] = useState('')

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

  // Fetch sector hierarchy data for filtering
  useEffect(() => {
    const fetchSectorData = async () => {
      try {
        const response = await apiFetch('/api/analytics/disbursements-by-sector?dateFrom=2000-01-01T00:00:00.000Z&dateTo=2050-12-31T23:59:59.999Z')
        if (response.ok) {
          const result = await response.json()
          const sectors = result.sectors || []
          // Transform to hierarchy items
          const items: SectorHierarchyItem[] = sectors.map((s: any) => ({
            code: s.sectorCode,
            name: s.sectorName,
            groupCode: s.groupCode,
            groupName: s.groupName,
            categoryCode: s.categoryCode,
            categoryName: s.categoryName
          }))
          setSectorData(items)
        }
      } catch (err) {
        console.error('Failed to fetch sector data:', err)
      }
    }
    fetchSectorData()
  }, [])

  // Aggregate sector data based on aggregation level
  const aggregatedSectorData = useMemo(() => {
    if (sectorAggregationLevel === 'sector') {
      return sectorData.map(s => ({
        code: s.code,
        name: s.name,
        groupCode: s.groupCode,
        groupName: s.groupName
      }))
    } else if (sectorAggregationLevel === 'category') {
      const categoryMap = new Map<string, { code: string; name: string; groupCode: string; groupName: string }>()
      sectorData.forEach(s => {
        const key = s.categoryCode || '998'
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            code: s.categoryCode || '998',
            name: s.categoryName || 'Unallocated',
            groupCode: s.groupCode || '998',
            groupName: s.groupName || 'Other'
          })
        }
      })
      return Array.from(categoryMap.values())
    } else {
      // group level
      const groupMap = new Map<string, { code: string; name: string; groupCode: string; groupName: string }>()
      sectorData.forEach(s => {
        const key = s.groupCode || '998'
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            code: s.groupCode || '998',
            name: s.groupName || 'Other',
            groupCode: s.groupCode || '998',
            groupName: s.groupName || 'Other'
          })
        }
      })
      return Array.from(groupMap.values())
    }
  }, [sectorData, sectorAggregationLevel])

  // Filter sectors based on search text
  const filteredSectorItems = useMemo(() => {
    if (!sectorFilterSearch.trim()) return aggregatedSectorData
    const search = sectorFilterSearch.toLowerCase()
    return aggregatedSectorData.filter(item =>
      item.code.toLowerCase().includes(search) ||
      item.name.toLowerCase().includes(search)
    )
  }, [aggregatedSectorData, sectorFilterSearch])

  // Sector filter helper functions
  const toggleSectorVisibility = (code: string) => {
    setSelectedSectors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(code)) {
        newSet.delete(code)
      } else {
        newSet.add(code)
      }
      return newSet
    })
  }

  const selectAllSectors = () => {
    setSelectedSectors(new Set(aggregatedSectorData.map(item => item.code)))
  }

  const clearAllSectors = () => {
    setSelectedSectors(new Set())
  }

  // Reset sector filter when aggregation level changes
  useEffect(() => {
    setSelectedSectors(new Set())
    setSectorFilterSearch('')
  }, [sectorAggregationLevel])

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
    setOrgTypeFilter('all')
    setViewMode('disbursements')
    setChartViewMode('bar')
    setSectorAggregationLevel('group')
    setSelectedSectors(new Set())
    setSectorFilterSearch('')
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
  const selectedSectorsStr = Array.from(selectedSectors).sort().join(',')

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFromStr, dateToStr, refreshKey, orgTypeFilter, selectedSectorsStr, sectorAggregationLevel])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('[AllDonorsChart] Starting data fetch')

      const queryParams = new URLSearchParams({
        dateFrom: effectiveDateRange.from.toISOString(),
        dateTo: effectiveDateRange.to.toISOString(),
        orgType: orgTypeFilter
      })

      // Add sector filter if any sectors are selected
      if (selectedSectors.size > 0) {
        queryParams.set('sectorCodes', Array.from(selectedSectors).join(','))
        queryParams.set('sectorLevel', sectorAggregationLevel)
      }

      const response = await apiFetch(`/api/analytics/all-donors?${queryParams}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch donor data')
      }

      console.log('[AllDonorsChart] Fetched donors:', result.count)
      setAllData(result.data || [])
      onDataChange?.(result.data || [])
    } catch (error) {
      console.error('[AllDonorsChart] Error fetching donor data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort data based on view mode
  const displayData = useMemo(() => {
    // Sort by selected metric
    const sorted = [...allData].sort((a, b) => {
      if (viewMode === 'budgets') {
        return b.totalBudget - a.totalBudget
      } else if (viewMode === 'planned') {
        return b.totalPlannedDisbursement - a.totalPlannedDisbursement
      } else if (viewMode === 'commitments') {
        return (b.totalCommitment || 0) - (a.totalCommitment || 0)
      } else {
        return b.totalActualDisbursement - a.totalActualDisbursement
      }
    })

    // Filter out orgs with zero value for selected metric
    return sorted.filter(d => {
      if (viewMode === 'budgets') return d.totalBudget > 0
      if (viewMode === 'planned') return d.totalPlannedDisbursement > 0
      if (viewMode === 'commitments') return (d.totalCommitment || 0) > 0
      return d.totalActualDisbursement > 0
    })
  }, [allData, viewMode])

  // Calculate total for percentage display
  const total = useMemo(() => {
    return displayData.reduce((sum, d) => {
      if (viewMode === 'budgets') return sum + d.totalBudget
      if (viewMode === 'planned') return sum + d.totalPlannedDisbursement
      if (viewMode === 'commitments') return sum + (d.totalCommitment || 0)
      return sum + d.totalActualDisbursement
    }, 0)
  }, [displayData, viewMode])

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

  // Prepare data for chart based on view mode
  const chartData = useMemo(() => {
    return displayData.map(donor => {
      let value = 0
      if (viewMode === 'budgets') {
        value = donor.totalBudget
      } else if (viewMode === 'planned') {
        value = donor.totalPlannedDisbursement
      } else if (viewMode === 'commitments') {
        value = donor.totalCommitment || 0
      } else {
        value = donor.totalActualDisbursement
      }

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
        percentage: total > 0 ? ((value / total) * 100) : 0,
        type: donor.type,
        typeName: donor.type ? getOrganizationTypeName(donor.type) : null
      }
    })
  }, [displayData, viewMode, total])

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

  // Single color for non-stacked bar chart (all bars same color)
  const barColor = '#334155' // slate-700

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload

      // Get the selected metric based on viewMode
      const getSelectedMetric = () => {
        switch (viewMode) {
          case 'budgets':
            return { name: 'Total Budgets', value: data.totalBudget, color: '#334155' }
          case 'planned':
            return { name: 'Planned Disbursements', value: data.totalPlannedDisbursement, color: '#475569' }
          case 'commitments':
            return { name: 'Total Commitments', value: data.totalCommitment, color: '#64748b' }
          case 'disbursements':
            return { name: 'Total Disbursements', value: data.totalActualDisbursement, color: '#94a3b8' }
        }
      }

      const selectedMetric = getSelectedMetric()

      // Format org name with acronym
      const orgDisplay = data.acronym
        ? `${data.fullName} (${data.acronym})`
        : data.fullName

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-surface-muted px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm max-w-[280px] break-words">{orgDisplay}</p>
            {data.type && (
              <div className="flex items-center gap-1.5 mt-1">
                {getOrganizationTypeCode(data.type) && (
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-xs">
                    {getOrganizationTypeCode(data.type)}
                  </code>
                )}
                <span className="text-xs text-slate-600">{getOrganizationTypeName(data.type)}</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600 text-sm">{selectedMetric.name}</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrencyAbbreviated(selectedMetric.value)}
              </span>
            </div>
            {showPercentage && (
              <div className="flex items-center justify-between gap-4 mt-1 pt-1 border-t border-slate-100">
                <span className="text-slate-500 text-xs">% of Total</span>
                <span className="text-sm font-medium text-slate-700">
                  {formatPercentage(data.value)}
                </span>
              </div>
            )}
          </div>
        </div>
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
      headers = ['Organization Type', 'Type Code', 'Total Value', 'Number of Donors']
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
        'Selected Metric Value',
        'Percentage of Total'
      ]
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

  // Export to JPG
  const handleExportJPG = () => {
    const chartElement = document.querySelector('#all-donors-chart') as HTMLElement
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
            link.download = `all-donors-financial-overview-${new Date().getTime()}.jpg`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        }, 'image/jpeg', 0.95)
      })
    })
  }

  // Get view mode label
  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'budgets': return 'Total Budgets'
      case 'planned': return 'Planned Disbursements'
      case 'commitments': return 'Commitments'
      case 'disbursements': return 'Actual Disbursements'
    }
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    }
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-slate-500">
          <p className="text-sm">No data available</p>
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
            <XAxis type="number" tickFormatter={formatCurrency} fontSize={10} />
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
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
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
                          className={calendarType === cy.id ? 'bg-slate-100 font-medium' : ''}
                          onClick={() => setCalendarType(cy.id)}
                        >
                          {cy.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Year Range Selector */}
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex gap-1 border rounded-lg p-1 bg-white">
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
                          <span className="text-xs font-medium text-slate-700">Select Year Range</span>
                          <div className="flex gap-1">
                            <button
                              onClick={selectAllYears}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                            >
                              All
                            </button>
                            <button
                              onClick={selectDataRange}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
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
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }
                                `}
                                title="Click to select start, then click another to select end"
                              >
                                {getYearLabel(year)}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                          Click start year, then click end year
                        </p>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {localDateRange?.from && localDateRange?.to && (
                    <span className="text-[10px] text-slate-500">
                      {format(localDateRange.from, 'MMM d, yyyy')} – {format(localDateRange.to, 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Side - Org Type Filter */}
          <div className="flex items-center gap-2">
            <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organization Types</SelectItem>
                {IATI_ORGANIZATION_TYPES.map(type => (
                  <SelectItem key={type.code} value={type.code}>
                    <span className="flex items-center gap-2">
                      <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">{type.code}</code>
                      {type.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-slate-600 font-medium">No donor data available</p>
            <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
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
                        className={calendarType === cy.id ? 'bg-slate-100 font-medium' : ''}
                        onClick={() => setCalendarType(cy.id)}
                      >
                        {cy.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Year Range Selector with Date Range below */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex gap-1 border rounded-lg p-1 bg-white">
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
                        <span className="text-xs font-medium text-slate-700">Select Year Range</span>
                        <div className="flex gap-1">
                          <button
                            onClick={selectAllYears}
                            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                          >
                            All
                          </button>
                          <button
                            onClick={selectDataRange}
                            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
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
                                    : 'text-slate-600 hover:bg-slate-100'
                                }
                              `}
                              title="Click to select start, then click another to select end"
                            >
                              {getYearLabel(year)}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 text-center">
                        Click start year, then click end year
                      </p>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* Date Range Indicator */}
                {localDateRange?.from && localDateRange?.to && (
                  <span className="text-[10px] text-slate-500">
                    {format(localDateRange.from, 'MMM d, yyyy')} – {format(localDateRange.to, 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side - Org Type Filter, Sector Filter, Metric Selector, View Mode and Export Controls */}
        <div className="flex items-center gap-2">
          <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organization Types</SelectItem>
              {IATI_ORGANIZATION_TYPES.map(type => (
                <SelectItem key={type.code} value={type.code}>
                  <span className="flex items-center gap-2">
                    <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">{type.code}</code>
                    {type.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sector Filter */}
          <div className="flex gap-1 rounded-lg p-1 bg-slate-100">
            {/* Sector Aggregation Level Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 text-xs", sectorAggregationLevel === 'group' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              onClick={() => setSectorAggregationLevel('group')}
            >
              Category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 text-xs", sectorAggregationLevel === 'category' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              onClick={() => setSectorAggregationLevel('category')}
            >
              Sector
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 text-xs", sectorAggregationLevel === 'sector' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              onClick={() => setSectorAggregationLevel('sector')}
            >
              Sub-sector
            </Button>

            {/* Sector Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {selectedSectors.size > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {selectedSectors.size}
                    </span>
                  )}
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-3 w-[340px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700">
                    Filter by {sectorAggregationLevel === 'group' ? 'Sector Category' : sectorAggregationLevel === 'category' ? 'Sector' : 'Sub-sector'}
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

                {/* Sector list */}
                <div className="max-h-[320px] overflow-y-auto space-y-0.5 border-t pt-2">
                  {filteredSectorItems.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-4">
                      No matching items found
                    </div>
                  ) : (
                    filteredSectorItems.map((item) => {
                      const isSelected = selectedSectors.has(item.code)

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

                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t text-center">
                  {selectedSectors.size} of {aggregatedSectorData.length} {sectorAggregationLevel === 'group' ? 'categories' : sectorAggregationLevel === 'category' ? 'sectors' : 'sub-sectors'} selected
                  {selectedSectors.size === 0 && ' (showing all)'}
                </p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budgets">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span>Total Budgets</span>
                </div>
              </SelectItem>
              <SelectItem value="planned">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Total Planned Disbursements</span>
                </div>
              </SelectItem>
              <SelectItem value="commitments">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Commitments</span>
                </div>
              </SelectItem>
              <SelectItem value="disbursements">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Disbursements</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 rounded-lg p-1 bg-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartViewMode('bar')}
              className={cn("h-8", chartViewMode === 'bar' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              title="Horizontal Bar Chart"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <rect x="3" y="10" width="13" height="4" rx="1" />
                <rect x="3" y="16" width="8" height="4" rx="1" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartViewMode('stacked')}
              className={cn("h-8", chartViewMode === 'stacked' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              title="Stacked by Org Type"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="8" height="4" rx="1" />
                <rect x="11" y="4" width="6" height="4" rx="1" fill="currentColor" fillOpacity="0.3" />
                <rect x="17" y="4" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.5" />
                <rect x="3" y="10" width="10" height="4" rx="1" />
                <rect x="13" y="10" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.3" />
                <rect x="3" y="16" width="6" height="4" rx="1" />
                <rect x="9" y="16" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.3" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartViewMode('table')}
              className={cn("h-8", chartViewMode === 'table' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
              title="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
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
              disabled={chartViewMode === 'table'}
            >
              <FileImage className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2"
              title="Reset to defaults"
            >
              <RotateCcw className="h-4 w-4" />
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
                <TableRow className="sticky top-0 bg-white z-10">
                  <TableHead className="bg-white">Organization</TableHead>
                  <TableHead className="bg-white">Type</TableHead>
                  <TableHead className="text-right bg-white">Total Budgets</TableHead>
                  <TableHead className="text-right bg-white">Planned Disbursements</TableHead>
                  <TableHead className="text-right bg-white">Commitments</TableHead>
                  <TableHead className="text-right bg-white">Actual Disbursements</TableHead>
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
                          <span className="text-sm text-slate-600">{item.typeName}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrencyAbbreviated(item.totalBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyAbbreviated(item.totalPlannedDisbursement)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyAbbreviated(item.totalCommitment)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyAbbreviated(item.totalActualDisbursement)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : chartViewMode === 'stacked' ? (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
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
                  tickFormatter={formatCurrency}
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
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-w-md">
                          <div className="bg-surface-muted px-3 py-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-xs">
                                {dataPoint?.typeCode}
                              </code>
                              <span className="font-semibold text-slate-900 text-sm">{label}</span>
                            </div>
                            <p className="text-sm text-slate-700 mt-1 font-medium">
                              {dataPoint?.donorCount} organization{dataPoint?.donorCount !== 1 ? 's' : ''}, Total {formatCurrencyAbbreviated(dataPoint?.totalValue || 0)}
                            </p>
                          </div>
                          {donorDetails && hoveredValue ? (
                            <div className="p-3">
                              <p className="font-semibold text-slate-900 text-sm">{donorDisplay}</p>
                              <p className="text-lg font-bold text-slate-900 mt-1">
                                {formatCurrencyAbbreviated(hoveredValue)}
                              </p>
                            </div>
                          ) : (
                            <div className="p-2 text-xs text-slate-500">
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
          <div className="bg-white rounded-lg border border-slate-200 p-4">
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
                  tickFormatter={formatCurrency}
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

      {/* Explanatory Text */}
      <p className="text-sm text-slate-500 leading-relaxed">
        This chart ranks funding organizations by their financial contributions, helping stakeholders understand
        the development assistance landscape. Compare organizations by total budgets, planned disbursements,
        commitments, or actual disbursements (aggregated by provider organization). The stacked view groups
        donors by organization type, showing individual organizations as segments within each bar.
      </p>
    </div>
  )
}
