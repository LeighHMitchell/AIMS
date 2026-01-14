"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Download, BarChart3, LineChart as LineChartIcon, TrendingUp as TrendingUpIcon, Table as TableIcon, X, Image, CalendarIcon, RotateCcw } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'
import { splitTransactionAcrossYears } from '@/utils/year-allocation'
import { FLOW_TYPE_COLORS, TRANSACTION_TYPE_CHART_COLORS, BRAND_COLORS } from '@/components/analytics/sectors/sectorColorMap'
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'

// Generate list of available years (from 2010 to current year + 10)
const currentYear = new Date().getFullYear()
const AVAILABLE_YEARS = Array.from(
  { length: currentYear + 10 - 2010 + 1 },
  (_, i) => 2010 + i
)
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

interface FinanceTypeFlowChartProps {
  dateRange?: {
    from: Date
    to: Date
  }
  refreshKey?: number
  onDataChange?: (data: any[]) => void
  compact?: boolean
}

type ViewMode = 'bar' | 'line' | 'area' | 'table'
type TimeMode = 'periodic' | 'cumulative'

// Use imported brand colors for flow types and transaction types
// FLOW_TYPE_COLORS and TRANSACTION_TYPE_CHART_COLORS are imported from sectorColorMap

// Local aliases for the imported colors (for backwards compatibility in this file)
const FLOW_TYPE_BASE_COLORS = FLOW_TYPE_COLORS
const TRANSACTION_TYPE_COLORS_LOCAL = TRANSACTION_TYPE_CHART_COLORS

// Function to blend two colors together
const blendColors = (color1: string, color2: string, ratio: number = 0.5): string => {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)

  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)

  const r = Math.round(r1 * ratio + r2 * (1 - ratio))
  const g = Math.round(g1 * ratio + g2 * (1 - ratio))
  const b = Math.round(b1 * ratio + b2 * (1 - ratio))

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Function to generate shades for finance types within a flow type
const generateFinanceTypeShades = (baseColor: string, financeType: string, index: number, total: number): string => {
  // Parse hex color
  const r = parseInt(baseColor.slice(1, 3), 16)
  const g = parseInt(baseColor.slice(3, 5), 16)
  const b = parseInt(baseColor.slice(5, 7), 16)

  // Generate lighter/darker shades based on index
  // We'll create a range from 40% darker to 40% lighter
  const factor = 0.4 - (index / (total - 1 || 1)) * 0.8

  const adjust = (value: number, factor: number) => {
    if (factor > 0) {
      // Lighten
      return Math.min(255, Math.round(value + (255 - value) * factor))
    } else {
      // Darken
      return Math.max(0, Math.round(value * (1 + factor)))
    }
  }

  const newR = adjust(r, factor)
  const newG = adjust(g, factor)
  const newB = adjust(b, factor)

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

export function FinanceTypeFlowChart({
  dateRange,
  refreshKey,
  onDataChange,
  compact = false
}: FinanceTypeFlowChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [allFlowTypes, setAllFlowTypes] = useState<Array<{code: string, name: string}>>([])
  const [allFinanceTypes, setAllFinanceTypes] = useState<Array<{code: string, name: string}>>([])
  const [selectedFlowTypes, setSelectedFlowTypes] = useState<string[]>(['10']) // Default to ODA (code 10)
  const [selectedFinanceTypes, setSelectedFinanceTypes] = useState<string[]>(['110', '421']) // Default to Standard grant (110) and Aid loan (421)
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['3']) // Default to Disbursement (code 3)
  const [viewMode, setViewMode] = useState<ViewMode>('bar')
  const [timeMode, setTimeMode] = useState<TimeMode>('periodic')


  // Calendar and year selection state (like other charts)
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)
  const [localDateRange, setLocalDateRange] = useState<{ from: Date; to: Date } | null>(null)

  // Calculate effective date range from selected years and local date range
  const effectiveDateRange = useMemo(() => {
    if (localDateRange?.from && localDateRange?.to) {
      return localDateRange
    }
    // Fallback to a reasonable default if no years selected yet
    const now = new Date()
    return {
      from: new Date(now.getFullYear() - 5, 0, 1),
      to: now
    }
  }, [localDateRange])

  // Transaction type options (IATI Standard v2.03)
  const transactionTypes = [
    { code: '1', name: 'Incoming Funds' },
    { code: '2', name: 'Outgoing Commitment' },
    { code: '3', name: 'Disbursement' },
    { code: '4', name: 'Expenditure' },
    { code: '5', name: 'Interest Payment' },
    { code: '6', name: 'Loan Repayment' },
    { code: '7', name: 'Reimbursement' },
    { code: '8', name: 'Purchase of Equity' },
    { code: '9', name: 'Sale of Equity' },
    { code: '10', name: 'Credit Guarantee' },
    { code: '11', name: 'Incoming Commitment' },
    { code: '12', name: 'Outgoing Pledge' },
    { code: '13', name: 'Incoming Pledge' }
  ]

  // Fetch custom years on mount and set system default
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await fetch('/api/custom-years')
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
        // Query with a wide date range to find actual data bounds
        const params = new URLSearchParams({
          dateFrom: '2000-01-01',
          dateTo: '2050-12-31'
        })
        const response = await fetch(`/api/analytics/finance-type-flow-data?${params}`)
        if (response.ok) {
          const result = await response.json()
          const transactions = result.transactions || []

          if (transactions.length > 0) {
            // Find min/max years from the transaction dates
            let minYear = Infinity
            let maxYear = -Infinity

            transactions.forEach((t: any) => {
              if (t.date) {
                const year = new Date(t.date).getFullYear()
                if (year < minYear) minYear = year
                if (year > maxYear) maxYear = year
              }
            })

            if (minYear !== Infinity && maxYear !== -Infinity) {
              setActualDataRange({ minYear, maxYear })
              // Set initial selected years to the data range
              setSelectedYears([minYear, maxYear])
            }
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
    // Reset to data range (or fallback to all years)
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
    }
    // Reset to ODA flow type
    setSelectedFlowTypes(['10'])
    // Reset finance types to standard grant and aid loan
    setSelectedFinanceTypes(['110', '421'])
    // Reset transaction types to Disbursement
    setSelectedTransactionTypes(['3'])
    // Reset view mode
    setViewMode('bar')
    setTimeMode('periodic')
    // Reset calendar to default
    const calendarYear = customYears.find(cy =>
      cy.name.toLowerCase().includes('calendar') ||
      cy.name.toLowerCase().includes('gregorian')
    ) || customYears[0]
    if (calendarYear) {
      setCalendarType(calendarYear.id)
    }
  }

  // Fetch data from consolidated API (with server-side caching)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Build query params
        const params = new URLSearchParams({
          dateFrom: effectiveDateRange.from.toISOString(),
          dateTo: effectiveDateRange.to.toISOString()
        })

        // Fetch all data from consolidated API (flow types, finance types, and transactions)
        const response = await fetch(`/api/analytics/finance-type-flow-data?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const data = await response.json()

        if (!data.transactions || data.transactions.length === 0) {
          setRawData([])
          setAllFlowTypes([])
          setAllFinanceTypes([])
          setSelectedFlowTypes([])
          return
        }

        // Process data for year allocation
        const processedData: any[] = []

        data.transactions.forEach((t: any) => {
          // Pass value_usd (set from the value field) since the API already converts values to USD
          const txToProcess = { ...t, transaction_date: t.date, value_usd: t.value }

          const yearAllocations = splitTransactionAcrossYears(txToProcess)

          yearAllocations.forEach(({ year, amount }) => {
            processedData.push({
              year,
              flowType: t.flowType,
              financeType: t.financeType,
              transactionType: t.transactionType,
              value: amount,
              date: t.date
            })
          })
        })

        // Get unique transaction types from the data
        const uniqueTransactionTypes = [...new Set(processedData.map((t: any) => t.transactionType))]
        
        setRawData(processedData)
        setAllFlowTypes(data.flowTypes)
        setAllFinanceTypes(data.financeTypes)
        
        // Keep the default ODA selection if it exists in the data, otherwise use first available
        if (data.flowTypes.length > 0) {
          const hasODA = data.flowTypes.some((ft: any) => ft.code === '10')
          if (hasODA && selectedFlowTypes.includes('10')) {
            // ODA exists and is already selected, keep it
          } else if (!hasODA && selectedFlowTypes.includes('10')) {
            // ODA doesn't exist in data, select first available
            setSelectedFlowTypes([data.flowTypes[0].code])
          } else if (selectedFlowTypes.length === 0 || !data.flowTypes.some((ft: any) => selectedFlowTypes.includes(ft.code))) {
            // No valid flow types selected, select first available
            setSelectedFlowTypes([data.flowTypes[0].code])
          }
        }
        
        // Update transaction types if current selection has no data
        if (uniqueTransactionTypes.length > 0) {
          const hasSelectedType = selectedTransactionTypes.some(st => uniqueTransactionTypes.includes(st))
          if (!hasSelectedType) {
            // No currently selected transaction types have data, select all available
            setSelectedTransactionTypes(uniqueTransactionTypes)
          }
        }

      } catch (err) {
        console.error('[FinanceTypeFlowChart] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [effectiveDateRange, refreshKey]) // Removed selectedTransactionTypes - filter client-side instead

  // Aggregate data - restructured to show flow types on X-axis
  const chartData = useMemo(() => {
    if (rawData.length === 0 || selectedFlowTypes.length === 0) return []

    // Filter by selected flow types
    let filteredData = rawData.filter(d => selectedFlowTypes.includes(d.flowType))

    // Filter by selected transaction types (client-side)
    if (selectedTransactionTypes.length > 0) {
      filteredData = filteredData.filter(d => selectedTransactionTypes.includes(d.transactionType))
    }

    // If specific finance types are selected, filter by those
    if (selectedFinanceTypes.length > 0) {
      filteredData = filteredData.filter(d => selectedFinanceTypes.includes(d.financeType))
    }

    // Determine which finance types to show in the chart
    const financeTypesToShow = selectedFinanceTypes.length > 0
      ? allFinanceTypes.filter(ft => selectedFinanceTypes.includes(ft.code))
      : allFinanceTypes

    // Find year range
    const years = filteredData.map(d => d.year)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    // Create data points - ONE point per year with all flow types
    const dataPoints: any[] = []

    for (let year = minYear; year <= maxYear; year++) {
      const point: any = {
        year,
        label: `${year}`, // Show only year on X-axis
      }

      // For each flow type and transaction type, add all finance type data
      selectedFlowTypes.forEach(flowType => {
        selectedTransactionTypes.forEach(transactionType => {
          // Initialize all finance types with unique keys per flow type and transaction type
          financeTypesToShow.forEach(financeType => {
            const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
            point[uniqueKey] = 0
          })

          // Aggregate values for this year-flowType-transactionType combination
          filteredData
            .filter(d => d.year === year && d.flowType === flowType && d.transactionType === transactionType)
            .forEach(item => {
              const uniqueKey = `${flowType}_${item.transactionType}_${item.financeType}`
              point[uniqueKey] = (point[uniqueKey] || 0) + item.value
            })
        })
      })

      dataPoints.push(point)
    }

    // Sort by year
    dataPoints.sort((a, b) => a.year - b.year)

    // Apply cumulative transformation if needed
    if (timeMode === 'cumulative' && dataPoints.length > 0) {
      // Apply cumulative calculation for each flow type and transaction type across years
      for (let i = 1; i < dataPoints.length; i++) {
        selectedFlowTypes.forEach(flowType => {
          selectedTransactionTypes.forEach(transactionType => {
            financeTypesToShow.forEach(financeType => {
              const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
              dataPoints[i][uniqueKey] = dataPoints[i][uniqueKey] + dataPoints[i - 1][uniqueKey]
            })
          })
        })
      }
    }

    return dataPoints
  }, [rawData, selectedFlowTypes, selectedFinanceTypes, selectedTransactionTypes, allFinanceTypes, timeMode])

  // Notify parent component of data change in useEffect to avoid render-time state updates
  useEffect(() => {
    if (onDataChange && chartData.length > 0) {
      onDataChange(chartData)
    }
  }, [chartData, onDataChange])

  // Format currency for display
  const formatCurrency = (value: number) => {
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

  // Use the module-level currency formatter for tooltips
  const formatTooltipValue = formatCurrencyAbbreviated

  // Helper function to get flow type name from code
  const getFlowTypeName = (code: string): string => {
    const flowType = allFlowTypes.find(ft => ft.code === code)
    return flowType ? flowType.name : code
  }

  // Helper function to get finance type name from code
  const getFinanceTypeName = (code: string): string => {
    const financeType = allFinanceTypes.find(ft => ft.code === code)
    return financeType ? financeType.name : code
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    // Filter out zero values
    const nonZeroPayload = payload.filter((entry: any) => entry.value && entry.value !== 0)

    if (nonZeroPayload.length === 0) return null

    const year = payload[0]?.payload?.year

    // Group entries by flow type for organized display
    const groupedByFlowType = new Map<string, any[]>()

    nonZeroPayload.forEach((entry: any) => {
      // Extract flow type from the dataKey (format: "10_110" -> "10")
      const flowTypeCode = entry.dataKey.split('_')[0]
      if (!groupedByFlowType.has(flowTypeCode)) {
        groupedByFlowType.set(flowTypeCode, [])
      }
      groupedByFlowType.get(flowTypeCode)!.push(entry)
    })

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">
            {year}
          </p>
        </div>
        <div className="p-2 max-h-96 overflow-y-auto">
          {Array.from(groupedByFlowType.entries()).map(([flowTypeCode, entries], groupIdx) => (
            <div key={flowTypeCode} className={groupIdx > 0 ? 'mt-3 pt-3 border-t border-slate-200' : ''}>
              <div className="mb-2">
                <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-xs">{flowTypeCode}</code>
                {' '}
                <span className="text-xs text-slate-600">{getFlowTypeName(flowTypeCode)}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {entries.map((entry: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-1.5 pr-4 flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-700 font-medium">{entry.name}</span>
                      </td>
                      <td className="py-1.5 text-right font-semibold text-slate-900">
                        {formatTooltipValue(entry.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Custom legend formatter
  const renderLegend = (props: any) => {
    const { payload } = props
    if (!payload || payload.length === 0) return null

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center pt-4">
        {payload.map((entry: any, index: number) => {
          // Parse the name to extract parts: "Disbursement - ODA - 110 Standard grant"
          const parts = entry.value.split(' - ')
          const transactionTypeName = parts[0] || ''
          const flowTypeName = parts[1] || ''
          const financeTypePart = parts[2] || ''

          // Extract transaction type code
          const transactionType = selectedTransactionTypes.find(code => {
            const name = transactionTypes.find(tt => tt.code === code)?.name
            return name === transactionTypeName
          })

          // Extract flow type code
          const flowType = allFlowTypes.find(ft => ft.name === flowTypeName)

          // Extract finance type code from the finance type part
          const financeTypeMatch = financeTypePart.match(/^(\d+)\s+(.+)$/)
          const financeTypeCode = financeTypeMatch ? financeTypeMatch[1] : ''
          const financeTypeName = financeTypeMatch ? financeTypeMatch[2] : financeTypePart

          return (
            <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-700">
                <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-xs text-slate-700">
                  {transactionType}
                </code>
                {' '}{transactionTypeName} -{' '}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-xs text-slate-700">
                  {flowType?.code}
                </code>
                {' '}{flowTypeName} -{' '}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-xs text-slate-700">
                  {financeTypeCode}
                </code>
                {' '}{financeTypeName}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (chartData.length === 0) return

    // Build headers - one column per transaction type + flow type + finance type combination
    const headers = ['Year']
    selectedFlowTypes.forEach(flowType => {
      selectedTransactionTypes.forEach(transactionType => {
        const txTypeName = transactionTypes.find(tt => tt.code === transactionType)?.name || transactionType
        allFinanceTypes.forEach(ft => {
          headers.push(`${txTypeName} - ${flowType} - ${ft.code} ${ft.name}`)
        })
      })
    })

    // Build rows
    const rows = chartData.map(row => {
      const values = [row.year]
      selectedFlowTypes.forEach(flowType => {
        selectedTransactionTypes.forEach(transactionType => {
          allFinanceTypes.forEach(ft => {
            const uniqueKey = `${flowType}_${transactionType}_${ft.code}`
            values.push((row[uniqueKey] || 0).toFixed(2))
          })
        })
      })
      return values.map(v => `"${v}"`).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `finance-type-flow-${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export to JPG
  const handleExportJPG = () => {
    const chartElement = document.querySelector('#finance-type-flow-chart') as HTMLElement
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
            link.download = `finance-type-flow-${new Date().getTime()}.jpg`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        }, 'image/jpeg', 0.95)
      })
    })
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <Skeleton className="h-full w-full" />
    }
    if (error || chartData.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-slate-500">
          <p className="text-sm">{error || 'No data available'}</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
            <XAxis
              dataKey="label"
              stroke="#64748B"
              fontSize={10}
              angle={0}
              textAnchor="middle"
              height={30}
              interval={0}
            />
            <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            {selectedFlowTypes.slice(0, 1).map(flowType => {
              const financeTypesToShow = selectedFinanceTypes.length > 0
                ? allFinanceTypes.filter(ft => selectedFinanceTypes.includes(ft.code)).slice(0, 5)
                : allFinanceTypes.slice(0, 5)
              return selectedTransactionTypes.slice(0, 1).map((transactionType) => {
                const flowTypeColor = FLOW_TYPE_BASE_COLORS[flowType] || BRAND_COLORS.paleSlate
                const transactionTypeColor = TRANSACTION_TYPE_COLORS_LOCAL[transactionType] || BRAND_COLORS.paleSlate
                const blendedBaseColor = blendColors(flowTypeColor, transactionTypeColor, 0.65)
                return financeTypesToShow.map((financeType, index) => {
                  const color = generateFinanceTypeShades(blendedBaseColor, financeType.code, index, financeTypesToShow.length)
                  const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
                  const isLastInStack = index === financeTypesToShow.length - 1
                  return (
                    <Bar
                      key={uniqueKey}
                      dataKey={uniqueKey}
                      name={financeType.name}
                      stackId={`${flowType}_${transactionType}`}
                      fill={color}
                      isAnimationActive={false}
                      radius={isLastInStack ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  )
                })
              }).flat()
            }).flat()}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Financial Flows by Finance Type
          </CardTitle>
          <CardDescription>
            Visualize financial flows by finance types across different flow types over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Financial Flows by Finance Type
          </CardTitle>
          <CardDescription>
            Visualize financial flows by finance types across different flow types over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (allFlowTypes.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Financial Flows by Finance Type
          </CardTitle>
          <CardDescription>
            Visualize financial flows by finance types across different flow types over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No data available</p>
              <p className="text-xs mt-2">Add transactions with finance type and flow type to see this chart</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-2">
        {/* Controls Row */}
        <div className="flex items-start justify-between gap-2">
          {/* Calendar & Year Selectors - Left Side */}
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

            {/* All Other Controls - Right Side */}
            <div className="flex items-center gap-2">
              {/* Flow Type Multi-Select */}
              <div className="w-[200px]">
                <MultiSelect
                  options={allFlowTypes.map(ft => ({
                    label: `${ft.code} - ${ft.name}`,
                    value: ft.code,
                    code: ft.code,
                    name: ft.name
                  } as any))}
                  selected={selectedFlowTypes}
                  onChange={setSelectedFlowTypes}
                  placeholder="Flow Types..."
                  showSelectAll={true}
                  selectedLabel="Flow Types selected"
                  renderOption={(option: any) => (
                    <span className="flex items-center gap-2">
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                        {option.code}
                      </code>
                      <span className="text-sm">{option.name}</span>
                    </span>
                  )}
                />
              </div>

              {/* Finance Type Multi-Select */}
              <div className="w-[220px]">
                <MultiSelect
                  options={allFinanceTypes.map(ft => ({
                    label: `${ft.code} - ${ft.name}`,
                    value: ft.code,
                    code: ft.code,
                    name: ft.name
                  } as any))}
                  selected={selectedFinanceTypes}
                  onChange={setSelectedFinanceTypes}
                  placeholder="Finance Types (All)"
                  showSelectAll={true}
                  selectedLabel="Finance Types selected"
                  renderOption={(option: any) => (
                    <span className="flex items-center gap-2">
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                        {option.code}
                      </code>
                      <span className="text-sm">{option.name}</span>
                    </span>
                  )}
                />
              </div>

              {/* Transaction Type Multi-Select */}
              <div className="w-[200px]">
                <MultiSelect
                  options={transactionTypes.map(tt => ({
                    label: `${tt.code} - ${tt.name}`,
                    value: tt.code,
                    code: tt.code,
                    name: tt.name
                  } as any))}
                  selected={selectedTransactionTypes}
                  onChange={setSelectedTransactionTypes}
                  placeholder="Transaction Types..."
                  selectedLabel="Transaction Types selected"
                  onClear={() => {
                    // Keep at least one transaction type selected - default to Disbursement
                    setSelectedTransactionTypes(['3'])
                  }}
                  renderOption={(option: any) => (
                    <span className="flex items-center gap-2">
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                        {option.code}
                      </code>
                      <span className="text-sm">{option.name}</span>
                    </span>
                  )}
                />
              </div>
              {/* Time Mode Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={timeMode === 'periodic' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeMode('periodic')}
                  className="h-8"
                >
                  Periodic
                </Button>
                <Button
                  variant={timeMode === 'cumulative' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeMode('cumulative')}
                  className="h-8"
                >
                  Cumulative
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={viewMode === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('bar')}
                  className="h-8"
                  title="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('line')}
                  className="h-8"
                  title="Line"
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('area')}
                  className="h-8"
                  title="Area"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8"
                  title="Table"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Reset Button */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
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

              {/* Export Buttons */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 px-2"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportJPG}
                  className="h-8 px-2"
                  title="Export to JPG"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
      </CardHeader>
      <CardContent id="finance-type-flow-chart">
        {chartData.length > 0 ? (
          <>
            {/* Bar Chart View */}
            {viewMode === 'bar' && (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  key={`bar-${selectedFlowTypes.join('-')}-${selectedFinanceTypes.join('-')}`}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    fontSize={11}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} wrapperStyle={{ paddingTop: '20px' }} />
                  {selectedFlowTypes.map(flowType => {
                    // Determine which finance types to show
                    const financeTypesToShow = selectedFinanceTypes.length > 0
                      ? allFinanceTypes.filter(ft => selectedFinanceTypes.includes(ft.code))
                      : allFinanceTypes

                    return selectedTransactionTypes.map((transactionType, txIndex) => {
                      const txTypeName = transactionTypes.find(tt => tt.code === transactionType)?.name || transactionType
                      // Blend flow type and transaction type colors for unique visual distinction
                      const flowTypeColor = FLOW_TYPE_BASE_COLORS[flowType] || BRAND_COLORS.paleSlate
                      const transactionTypeColor = TRANSACTION_TYPE_COLORS_LOCAL[transactionType] || BRAND_COLORS.paleSlate
                      const blendedBaseColor = blendColors(flowTypeColor, transactionTypeColor, 0.65) // 65% flow type, 35% transaction type

                      return financeTypesToShow.map((financeType, index) => {
                        const color = generateFinanceTypeShades(blendedBaseColor, financeType.code, index, financeTypesToShow.length)
                        const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
                        const isLastInStack = index === financeTypesToShow.length - 1
                        return (
                          <Bar
                            key={uniqueKey}
                            dataKey={uniqueKey}
                            name={`${txTypeName} - ${getFlowTypeName(flowType)} - ${financeType.code} ${financeType.name}`}
                            stackId={`${flowType}_${transactionType}`}
                            fill={color}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-in-out"
                            radius={isLastInStack ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        )
                      })
                    }).flat()
                  }).flat()}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Line Chart View */}
            {viewMode === 'line' && (
              <ResponsiveContainer width="100%" height={500}>
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  key={`line-${selectedFlowTypes.join('-')}-${selectedFinanceTypes.join('-')}`}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    fontSize={11}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} wrapperStyle={{ paddingTop: '20px' }} />
                  {selectedFlowTypes.map(flowType => {
                    // Determine which finance types to show
                    const financeTypesToShow = selectedFinanceTypes.length > 0
                      ? allFinanceTypes.filter(ft => selectedFinanceTypes.includes(ft.code))
                      : allFinanceTypes

                    return selectedTransactionTypes.map((transactionType, txIndex) => {
                      const txTypeName = transactionTypes.find(tt => tt.code === transactionType)?.name || transactionType
                      // Blend flow type and transaction type colors for unique visual distinction
                      const flowTypeColor = FLOW_TYPE_BASE_COLORS[flowType] || BRAND_COLORS.paleSlate
                      const transactionTypeColor = TRANSACTION_TYPE_COLORS_LOCAL[transactionType] || BRAND_COLORS.paleSlate
                      const blendedBaseColor = blendColors(flowTypeColor, transactionTypeColor, 0.65) // 65% flow type, 35% transaction type

                      return financeTypesToShow.map((financeType, index) => {
                        const color = generateFinanceTypeShades(blendedBaseColor, financeType.code, index, financeTypesToShow.length)
                        const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
                        // Alternate stroke patterns and widths for better differentiation
                        const strokeWidth = 2.5 + (index % 3) * 0.5 // 2.5, 3, 3.5
                        const dashArray = index % 3 === 0 ? undefined : index % 3 === 1 ? "8 4" : "12 6"
                        return (
                          <Line
                            key={uniqueKey}
                            type="monotone"
                            dataKey={uniqueKey}
                            name={`${txTypeName} - ${getFlowTypeName(flowType)} - ${financeType.code} ${financeType.name}`}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            dot={{ fill: color, r: 4 }}
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-in-out"
                          />
                        )
                      })
                    }).flat()
                  }).flat()}
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Area Chart View */}
            {viewMode === 'area' && (
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  key={`area-${selectedFlowTypes.join('-')}-${selectedFinanceTypes.join('-')}`}
                >
                  <defs>
                    {selectedFlowTypes.map(flowType => {
                      const financeTypesToShow = selectedFinanceTypes.length > 0
                        ? allFinanceTypes.filter(ft => selectedFinanceTypes.includes(ft.code))
                        : allFinanceTypes
                      
                      return selectedTransactionTypes.map((transactionType) => {
                        const flowTypeColor = FLOW_TYPE_BASE_COLORS[flowType] || BRAND_COLORS.paleSlate
                        const transactionTypeColor = TRANSACTION_TYPE_COLORS_LOCAL[transactionType] || BRAND_COLORS.paleSlate
                        const blendedBaseColor = blendColors(flowTypeColor, transactionTypeColor, 0.65)
                        
                        return financeTypesToShow.map((financeType, index) => {
                          const color = generateFinanceTypeShades(blendedBaseColor, financeType.code, index, financeTypesToShow.length)
                          const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
                          const gradientId = `gradient${uniqueKey.replace(/[^a-zA-Z0-9]/g, '')}`
                          
                          return (
                            <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                            </linearGradient>
                          )
                        })
                      }).flat()
                    }).flat()}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    fontSize={11}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} wrapperStyle={{ paddingTop: '20px' }} />
                  {selectedFlowTypes.map(flowType => {
                    const financeTypesToShow = selectedFinanceTypes.length > 0
                      ? allFinanceTypes.filter(ft => selectedFinanceTypes.includes(ft.code))
                      : allFinanceTypes

                    return selectedTransactionTypes.map((transactionType) => {
                      const txTypeName = transactionTypes.find(tt => tt.code === transactionType)?.name || transactionType
                      const flowTypeColor = FLOW_TYPE_BASE_COLORS[flowType] || BRAND_COLORS.paleSlate
                      const transactionTypeColor = TRANSACTION_TYPE_COLORS_LOCAL[transactionType] || BRAND_COLORS.paleSlate
                      const blendedBaseColor = blendColors(flowTypeColor, transactionTypeColor, 0.65)

                      return financeTypesToShow.map((financeType, index) => {
                        const color = generateFinanceTypeShades(blendedBaseColor, financeType.code, index, financeTypesToShow.length)
                        const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
                        const gradientId = `gradient${uniqueKey.replace(/[^a-zA-Z0-9]/g, '')}`
                        const strokeWidth = 2 + (index % 3) * 0.5
                        const dashArray = index % 3 === 0 ? undefined : index % 3 === 1 ? "8 4" : "12 6"
                        
                        return (
                          <Area
                            key={uniqueKey}
                            type="monotone"
                            dataKey={uniqueKey}
                            name={`${txTypeName} - ${getFlowTypeName(flowType)} - ${financeType.code} ${financeType.name}`}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            fill={`url(#${gradientId})`}
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-in-out"
                          />
                        )
                      })
                    }).flat()
                  }).flat()}
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="rounded-md border max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-white z-10">Year</TableHead>
                      {selectedFlowTypes.map(flowType => (
                        <React.Fragment key={flowType}>
                          {selectedTransactionTypes.map(transactionType => {
                            const txTypeName = transactionTypes.find(tt => tt.code === transactionType)?.name || transactionType
                            return (
                              <React.Fragment key={`${flowType}_${transactionType}`}>
                                {allFinanceTypes.map(financeType => (
                                  <TableHead key={`${flowType}_${transactionType}_${financeType.code}`} className="text-right sticky top-0 bg-white">
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="flex items-center gap-1">
                                        <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                                          {transactionType}
                                        </code>
                                        <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                                          {flowType}
                                        </code>
                                        <code className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono text-xs">
                                          {financeType.code}
                                        </code>
                                      </div>
                                      <span className="text-xs text-slate-600">{txTypeName} - {financeType.name}</span>
                                    </div>
                                  </TableHead>
                                ))}
                              </React.Fragment>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.year}</TableCell>
                        {selectedFlowTypes.map(flowType => (
                          <React.Fragment key={flowType}>
                            {selectedTransactionTypes.map(transactionType => (
                              <React.Fragment key={`${flowType}_${transactionType}`}>
                                {allFinanceTypes.map(financeType => {
                                  const uniqueKey = `${flowType}_${transactionType}_${financeType.code}`
                                  return (
                                    <TableCell key={uniqueKey} className="text-right">
                                      {formatTooltipValue(row[uniqueKey] || 0)}
                                    </TableCell>
                                  )
                                })}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">
                {selectedFlowTypes.length === 0 ? 'No flow types selected' : 'No data available'}
              </p>
              <p className="text-xs mt-2">
                {selectedFlowTypes.length === 0
                  ? 'Select one or more flow types to view the chart'
                  : 'Try adjusting your filter selections'
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Chart Description */}
      <div className="border-t border-slate-200 px-6 py-4 bg-white">
        <p className="text-sm text-slate-600">
          This chart visualizes financial flows by breaking down transactions according to their flow type (e.g., ODA, OOF, private flows)
          and finance type (e.g., grants, loans, equity investments). Understanding these classifications is essential for analyzing
          the nature and terms of development assistance—whether funds are concessional or non-concessional, repayable or not,
          and how they align with international reporting standards like the OECD DAC. Use the filters to compare different
          transaction types (commitments, disbursements, expenditures) across time periods, helping identify trends in how
          aid is structured and delivered. The periodic view shows year-by-year flows, while cumulative view reveals the
          total accumulated value over time.
        </p>
      </div>

      {/* Selected Filters Display */}
      {(selectedTransactionTypes.length > 0 || selectedFlowTypes.length > 0 || selectedFinanceTypes.length > 0) && (
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex flex-col gap-3">
            {/* Flow Types */}
            {selectedFlowTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-700 min-w-[140px]">
                  {selectedFlowTypes.length} Flow Type{selectedFlowTypes.length !== 1 ? 's' : ''}:
                </span>
                <div className="flex gap-2 flex-wrap flex-1">
                  {selectedFlowTypes.map(code => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200"
                    >
                      <code className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {code}
                      </code>
                      <span className="text-sm text-slate-700">{getFlowTypeName(code)}</span>
                      <button
                        onClick={() => {
                          setSelectedFlowTypes(selectedFlowTypes.filter(f => f !== code))
                        }}
                        className="ml-1 hover:bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                        title="Remove flow type"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Finance Types */}
            {selectedFinanceTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-700 min-w-[140px]">
                  {selectedFinanceTypes.length} Finance Type{selectedFinanceTypes.length !== 1 ? 's' : ''}:
                </span>
                <div className="flex gap-2 flex-wrap flex-1">
                  {selectedFinanceTypes.map(code => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200"
                    >
                      <code className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {code}
                      </code>
                      <span className="text-sm text-slate-700">{getFinanceTypeName(code)}</span>
                      <button
                        onClick={() => {
                          setSelectedFinanceTypes(selectedFinanceTypes.filter(f => f !== code))
                        }}
                        className="ml-1 hover:bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                        title="Remove finance type"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Types */}
            {selectedTransactionTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-700 min-w-[140px]">
                  {selectedTransactionTypes.length} Transaction Type{selectedTransactionTypes.length !== 1 ? 's' : ''}:
                </span>
                <div className="flex gap-2 flex-wrap flex-1">
                  {selectedTransactionTypes.map(code => {
                    const txType = transactionTypes.find(tt => tt.code === code)
                    if (!txType) return null
                    return (
                      <Badge
                        key={code}
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200"
                      >
                        <code className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {code}
                        </code>
                        <span className="text-sm text-slate-700">{txType.name}</span>
                        <button
                          onClick={() => {
                            const newTypes = selectedTransactionTypes.filter(t => t !== code)
                            if (newTypes.length > 0) {
                              setSelectedTransactionTypes(newTypes)
                            }
                          }}
                          className="ml-1 hover:bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                          title="Remove transaction type"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
