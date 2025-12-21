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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Download, BarChart3, LineChart as LineChartIcon, TrendingUp as TrendingUpIcon, Table as TableIcon, X, Image } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MultiSelect } from '@/components/ui/multi-select'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { splitTransactionAcrossYears } from '@/utils/year-allocation'
import { FLOW_TYPE_COLORS, TRANSACTION_TYPE_CHART_COLORS, BRAND_COLORS } from '@/components/analytics/sectors/sectorColorMap'

interface FinanceTypeFlowChartProps {
  dateRange?: {
    from: Date
    to: Date
  }
  refreshKey?: number
  onDataChange?: (data: any[]) => void
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
  onDataChange
}: FinanceTypeFlowChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [allFlowTypes, setAllFlowTypes] = useState<Array<{code: string, name: string}>>([])
  const [allFinanceTypes, setAllFinanceTypes] = useState<Array<{code: string, name: string}>>([])
  const [selectedFlowTypes, setSelectedFlowTypes] = useState<string[]>(['10']) // Default to ODA (code 10)
  const [selectedFinanceTypes, setSelectedFinanceTypes] = useState<string[]>([]) // Empty = all finance types
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['1']) // Default to Incoming Commitment (code 1) - most commonly has finance type data
  const [viewMode, setViewMode] = useState<ViewMode>('bar')
  const [timeMode, setTimeMode] = useState<TimeMode>('periodic')
  
  // Allocation method toggle (for future use when budgets/disbursements are added)
  const [allocationMethod, setAllocationMethod] = useState<'proportional' | 'period-start'>('proportional')

  // Transaction type options
  const transactionTypes = [
    { code: '1', name: 'Incoming Commitment' },
    { code: '2', name: 'Outgoing Commitment' },
    { code: '3', name: 'Disbursement' },
    { code: '4', name: 'Expenditure' },
    { code: '5', name: 'Interest Repayment' },
    { code: '6', name: 'Loan Repayment' },
    { code: '7', name: 'Reimbursement' },
    { code: '8', name: 'Purchase of Equity' },
    { code: '9', name: 'Sale of Equity' },
    { code: '11', name: 'Credit Guarantee' },
    { code: '12', name: 'Incoming Funds' },
    { code: '13', name: 'Commitment Cancellation' }
  ]

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch flow types and finance types from API
        const flowTypesResponse = await fetch('/api/analytics/flow-types')
        const flowTypesData = await flowTypesResponse.json()

        const financeTypesResponse = await fetch('/api/analytics/finance-types')
        const financeTypesData = await financeTypesResponse.json()

        // Fetch all transactions with their activity defaults for finance_type and flow_type
        // Join with activities to get default values when transaction values are null
        let query = supabase
          .from('transactions')
          .select(`
            transaction_date,
            finance_type,
            flow_type,
            value,
            value_usd,
            currency,
            transaction_type,
            activity_id,
            activities!transactions_activity_id_fkey1 (
              default_finance_type,
              default_flow_type
            )
          `)
          .eq('status', 'actual')
          .order('transaction_date', { ascending: true })

        // Apply date range filter if provided
        if (dateRange) {
          query = query
            .gte('transaction_date', dateRange.from.toISOString())
            .lte('transaction_date', dateRange.to.toISOString())
        }

        const { data: transactions, error: transactionsError } = await query

        if (transactionsError) {
          console.error('[FinanceTypeFlowChart] Error fetching transactions:', transactionsError)
          setError('Failed to fetch transaction data')
          return
        }

        if (!transactions || transactions.length === 0) {
          setRawData([])
          setAllFlowTypes([])
          setAllFinanceTypes([])
          setSelectedFlowTypes([])
          return
        }

        // Process data - use inferred values (transaction-level or activity defaults)
        const processedData: any[] = []

        transactions.forEach((t: any) => {
          // Try value_usd first, then fall back to raw value
          let value = parseFloat(String(t.value_usd)) || 0

          // Fall back to raw value if no USD conversion exists
          if (!value && t.value) {
            value = parseFloat(String(t.value)) || 0
          }

          // Skip transactions without any valid value
          if (!value) {
            return
          }

          // Get activity defaults
          const activityDefaults = t.activities || {}

          // Use transaction value if set, otherwise fall back to activity default
          const effectiveFinanceType = t.finance_type || activityDefaults.default_finance_type
          const effectiveFlowType = t.flow_type || activityDefaults.default_flow_type

          // Skip if we don't have both finance_type and flow_type (even after fallback)
          if (!effectiveFinanceType || !effectiveFlowType) {
            return
          }

          // Apply proportional allocation if enabled
          const txToProcess = allocationMethod === 'proportional'
            ? t
            : { ...t, period_start: null, period_end: null }

          const yearAllocations = splitTransactionAcrossYears(txToProcess)

          yearAllocations.forEach(({ year, amount }) => {
            // Use effective (inferred) finance_type and flow_type
            const financeType = String(effectiveFinanceType)
            const flowType = String(effectiveFlowType)
            // Convert to string to match selectedTransactionTypes format
            const transactionType = String(t.transaction_type || 'Unknown')

            processedData.push({
              year,
              flowType,
              financeType,
              transactionType,
              value: amount,
              date: t.transaction_date
            })
          })
        })

        // Get unique flow type codes from data
        const uniqueFlowTypeCodes = Array.from(new Set(processedData.map((d: any) => d.flowType)))
        const uniqueFinanceTypeCodes = Array.from(new Set(processedData.map((d: any) => d.financeType)))

        // Filter flow types to only include those present in the data
        const relevantFlowTypes = flowTypesData.filter((ft: any) =>
          uniqueFlowTypeCodes.includes(ft.code)
        ).sort((a: any, b: any) => a.code.localeCompare(b.code))

        // Filter finance types to only include those present in the data
        const relevantFinanceTypes = financeTypesData.filter((ft: any) =>
          uniqueFinanceTypeCodes.includes(ft.code)
        ).sort((a: any, b: any) => a.code.localeCompare(b.code))

        setRawData(processedData)
        setAllFlowTypes(relevantFlowTypes)
        setAllFinanceTypes(relevantFinanceTypes)

        // Keep the default ODA selection if it exists in the data, otherwise use first available
        if (relevantFlowTypes.length > 0) {
          const hasODA = relevantFlowTypes.some((ft: any) => ft.code === '10')
          if (hasODA && selectedFlowTypes.includes('10')) {
            // ODA exists and is already selected, keep it
          } else if (!hasODA && selectedFlowTypes.includes('10')) {
            // ODA doesn't exist in data, select first available
            setSelectedFlowTypes([relevantFlowTypes[0].code])
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
  }, [dateRange, refreshKey, allocationMethod]) // Removed selectedTransactionTypes - filter client-side instead

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

  const formatTooltipValue = (value: number) => {
    const isNegative = value < 0
    const absValue = Math.abs(value)

    let formatted = ''
    if (absValue >= 1000000000) {
      formatted = `$${(absValue / 1000000000).toFixed(2)}b`
    } else if (absValue >= 1000000) {
      formatted = `$${(absValue / 1000000).toFixed(2)}m`
    } else if (absValue >= 1000) {
      formatted = `$${(absValue / 1000).toFixed(2)}k`
    } else {
      formatted = `$${absValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    return isNegative ? `-${formatted}` : formatted
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

  // Get available flow types for dropdown (exclude already selected)
  const availableFlowTypes = allFlowTypes.filter(ft => !selectedFlowTypes.includes(ft.code))

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

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title and Description */}
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Financial Flows by Finance Type
            </CardTitle>
            <CardDescription>
              {timeMode === 'cumulative' ? 'Cumulative' : 'Period-by-period'} tracking of how finance types (grants, loans, debt relief, etc.) contribute to flows across ODA, OOF, and other categories
            </CardDescription>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Filters - Left Side */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Flow Type Multi-Select */}
              <div className="w-[240px]">
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
              <div className="w-[280px]">
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
              <div className="w-[240px]">
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
            </div>

            {/* View Controls and Export - Right Side */}
            <div className="flex items-center gap-2 flex-wrap">
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

              {/* Allocation Method Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white">
                  <Label htmlFor="allocation-toggle-finance-type" className="text-sm text-slate-700 cursor-pointer">
                    {allocationMethod === 'proportional' ? 'Proportional' : 'Period Start'}
                  </Label>
                  <Switch
                    id="allocation-toggle-finance-type"
                    checked={allocationMethod === 'proportional'}
                    onCheckedChange={(checked) => setAllocationMethod(checked ? 'proportional' : 'period-start')}
                  />
                </div>
                <HelpTextTooltip 
                  content={
                    allocationMethod === 'proportional'
                      ? "Allocates budget and planned disbursement amounts across their time periods. For example, a $100,000 budget from July 2024 to June 2025 will be split proportionally across those 12 months."
                      : "Shows the full budget or planned disbursement amount at its start date. Useful for seeing when amounts were originally planned or committed."
                  }
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={viewMode === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('bar')}
                  className="h-8"
                >
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  Bar
                </Button>
                <Button
                  variant={viewMode === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('line')}
                  className="h-8"
                >
                  <LineChartIcon className="h-4 w-4 mr-1.5" />
                  Line
                </Button>
                <Button
                  variant={viewMode === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('area')}
                  className="h-8"
                >
                  <TrendingUpIcon className="h-4 w-4 mr-1.5" />
                  Area
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8"
                >
                  <TableIcon className="h-4 w-4 mr-1.5" />
                  Table
                </Button>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 w-8 p-0"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJPG}
                  className="h-8 w-8 p-0"
                  title="Export to JPG"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
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
                  key={`bar-${selectedFlowTypes.join('-')}-${selectedFinanceTypes.join('-')}-${allocationMethod}`}
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
                  key={`line-${selectedFlowTypes.join('-')}-${selectedFinanceTypes.join('-')}-${allocationMethod}`}
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
                  key={`area-${selectedFlowTypes.join('-')}-${selectedFinanceTypes.join('-')}-${allocationMethod}`}
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
