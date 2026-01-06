"use client"

import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, BarChart3, LineChart as LineChartIcon, Table2 } from 'lucide-react'
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

type ViewMode = 'bar' | 'line' | 'table'

// Brand color palette
const CHART_COLORS = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
}

// Transaction type configuration
export const TRANSACTION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  '1': { label: 'Incoming Commitment', color: CHART_COLORS.blueSlate },
  '2': { label: 'Outgoing Commitment', color: CHART_COLORS.coolSteel },
  '3': { label: 'Disbursement', color: CHART_COLORS.primaryScarlet },
  '4': { label: 'Expenditure', color: CHART_COLORS.paleSlate },
  '5': { label: 'Interest Repayment', color: CHART_COLORS.blueSlate },
  '6': { label: 'Loan Repayment', color: CHART_COLORS.coolSteel },
  '7': { label: 'Reimbursement', color: CHART_COLORS.primaryScarlet },
  '8': { label: 'Purchase of Equity', color: CHART_COLORS.blueSlate },
  '9': { label: 'Sale of Equity', color: CHART_COLORS.coolSteel },
  '11': { label: 'Credit Guarantee', color: CHART_COLORS.paleSlate },
  '12': { label: 'Incoming Funds', color: CHART_COLORS.blueSlate },
  '13': { label: 'Commitment Cancellation', color: CHART_COLORS.primaryScarlet },
}

// Single series data point (for budgets, planned disbursements)
export interface SingleSeriesDataPoint {
  year: number
  total: number
}

// Multi series data point (for transactions by type)
export interface MultiSeriesDataPoint {
  year: number
  totals: Record<string, number>
}

interface YearlyTotalsBarChartProps {
  title: string
  description?: string
  loading?: boolean
  height?: number
  // For single series (budgets, planned disbursements)
  singleSeriesData?: SingleSeriesDataPoint[]
  singleSeriesColor?: string
  singleSeriesLabel?: string
  // For multi series (transactions by type)
  multiSeriesData?: MultiSeriesDataPoint[]
  // Collapsible settings
  defaultCollapsed?: boolean
  // View mode settings
  defaultViewMode?: ViewMode
  showViewModeToggle?: boolean
  // Optional additional controls to render in the header (e.g., CustomYearSelector)
  headerControls?: React.ReactNode
}

// Currency formatters matching CumulativeFinancialOverview
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

export function YearlyTotalsBarChart({
  title,
  description,
  loading = false,
  height = 300,
  singleSeriesData,
  singleSeriesColor = '#4c5568',
  singleSeriesLabel = 'Total',
  multiSeriesData,
  defaultCollapsed = true,
  defaultViewMode = 'bar',
  showViewModeToggle = true,
  headerControls,
}: YearlyTotalsBarChartProps) {
  // Collapsible state
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode)

  // Determine which mode we're in
  const isMultiSeries = !!multiSeriesData && multiSeriesData.length > 0
  const isSingleSeries = !!singleSeriesData && singleSeriesData.length > 0

  // Process multi-series data to get active transaction types
  const activeTransactionTypes = useMemo(() => {
    if (!multiSeriesData) return []
    
    const types = new Set<string>()
    multiSeriesData.forEach(point => {
      Object.entries(point.totals).forEach(([type, value]) => {
        if (value > 0) types.add(type)
      })
    })
    
    // Sort by type code
    return Array.from(types).sort((a, b) => parseInt(a) - parseInt(b))
  }, [multiSeriesData])

  // Transform multi-series data for Recharts
  const chartData = useMemo(() => {
    if (isMultiSeries && multiSeriesData) {
      return multiSeriesData.map(point => ({
        year: point.year.toString(),
        ...point.totals,
      })).sort((a, b) => parseInt(a.year) - parseInt(b.year))
    }
    
    if (isSingleSeries && singleSeriesData) {
      return singleSeriesData.map(point => ({
        year: point.year.toString(),
        total: point.total,
      })).sort((a, b) => parseInt(a.year) - parseInt(b.year))
    }
    
    return []
  }, [isMultiSeries, isSingleSeries, multiSeriesData, singleSeriesData])

  // Custom tooltip for multi-series
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const nonZeroPayload = payload.filter((entry: any) => entry.value != null && entry.value > 0)

      if (nonZeroPayload.length === 0) {
        return null
      }

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{label}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                {nonZeroPayload.map((entry: any, index: number) => {
                  const typeConfig = TRANSACTION_TYPE_CONFIG[entry.dataKey]
                  return (
                    <tr key={index} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-1.5 pr-4 flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-700 font-medium flex items-center gap-2">
                          {typeConfig && (
                            <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                              {entry.dataKey}
                            </code>
                          )}
                          <span>{typeConfig?.label || entry.name}</span>
                        </span>
                      </td>
                      <td className="py-1.5 text-right font-semibold text-slate-900">
                        {formatTooltipValue(entry.value)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Simple tooltip for single series
  const SimpleTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && payload[0].value > 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
          <p className="font-semibold text-slate-900 text-sm">{label}</p>
          <p className="font-bold text-slate-900 text-lg">{formatTooltipValue(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  // Custom legend renderer
  const renderLegend = (props: any) => {
    const { payload } = props

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const typeConfig = TRANSACTION_TYPE_CONFIG[entry.dataKey]
          return (
            <li
              key={`item-${index}`}
              className="flex items-center gap-2"
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-700">
                {typeConfig?.label || entry.value}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  // Table view component
  const TableView = () => {
    if (isMultiSeries) {
      // Calculate grand totals for each type
      const grandTotals: Record<string, number> = {}
      activeTransactionTypes.forEach(type => {
        grandTotals[type] = chartData.reduce((sum, row) => sum + (Number(row[type]) || 0), 0)
      })
      const grandTotal = Object.values(grandTotals).reduce((sum, val) => sum + val, 0)

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700 bg-slate-50">Year</th>
                {activeTransactionTypes.map(type => (
                  <th key={type} className="text-right py-3 px-4 font-semibold text-slate-700 bg-slate-50">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: TRANSACTION_TYPE_CONFIG[type]?.color || '#94a3b8' }}
                      />
                      <span className="truncate max-w-[120px]" title={TRANSACTION_TYPE_CONFIG[type]?.label}>
                        {TRANSACTION_TYPE_CONFIG[type]?.label || `Type ${type}`}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-slate-50">Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => {
                const rowTotal = activeTransactionTypes.reduce((sum, type) => sum + (Number(row[type]) || 0), 0)
                return (
                  <tr key={row.year} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{row.year}</td>
                    {activeTransactionTypes.map(type => (
                      <td key={type} className="text-right py-2.5 px-4 text-slate-700 font-mono text-xs">
                        {row[type] ? formatTooltipValue(Number(row[type])) : '—'}
                      </td>
                    ))}
                    <td className="text-right py-2.5 px-4 font-semibold text-slate-900 font-mono text-xs">
                      {formatTooltipValue(rowTotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100">
                <td className="py-3 px-4 font-bold text-slate-900">Total</td>
                {activeTransactionTypes.map(type => (
                  <td key={type} className="text-right py-3 px-4 font-bold text-slate-900 font-mono text-xs">
                    {formatTooltipValue(grandTotals[type])}
                  </td>
                ))}
                <td className="text-right py-3 px-4 font-bold text-slate-900 font-mono text-xs">
                  {formatTooltipValue(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )
    }

    // Single series table
    const grandTotal = chartData.reduce((sum, row) => sum + (Number(row.total) || 0), 0)
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-700 bg-slate-50">Year</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-slate-50">{singleSeriesLabel}</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, idx) => (
              <tr key={row.year} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="py-2.5 px-4 font-medium text-slate-900">{row.year}</td>
                <td className="text-right py-2.5 px-4 text-slate-700 font-mono text-xs">
                  {row.total ? formatTooltipValue(Number(row.total)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-100">
              <td className="py-3 px-4 font-bold text-slate-900">Total</td>
              <td className="text-right py-3 px-4 font-bold text-slate-900 font-mono text-xs">
                {formatTooltipValue(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  // Line chart component
  const LineChartView = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
        <XAxis
          dataKey="year"
          stroke="#64748B"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCurrency}
          stroke="#64748B"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={isMultiSeries ? <CustomTooltip /> : <SimpleTooltip />} />
        {isMultiSeries && <Legend content={renderLegend} />}
        
        {isMultiSeries ? (
          activeTransactionTypes.map((type) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={TRANSACTION_TYPE_CONFIG[type]?.color || '#94a3b8'}
              strokeWidth={2}
              dot={{ fill: TRANSACTION_TYPE_CONFIG[type]?.color || '#94a3b8', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
          ))
        ) : (
          <Line
            type="monotone"
            dataKey="total"
            stroke={singleSeriesColor}
            strokeWidth={2}
            dot={{ fill: singleSeriesColor, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-in-out"
            name={singleSeriesLabel}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )

  // Bar chart component
  const BarChartView = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
        <XAxis
          dataKey="year"
          stroke="#64748B"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCurrency}
          stroke="#64748B"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={isMultiSeries ? <CustomTooltip /> : <SimpleTooltip />} />
        {isMultiSeries && <Legend content={renderLegend} />}
        
        {isMultiSeries ? (
          activeTransactionTypes.map((type) => (
            <Bar
              key={type}
              dataKey={type}
              fill={TRANSACTION_TYPE_CONFIG[type]?.color || '#94a3b8'}
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
          ))
        ) : (
          <Bar
            dataKey="total"
            fill={singleSeriesColor}
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-in-out"
            name={singleSeriesLabel}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )

  // View mode toggle component
  const ViewModeToggle = () => (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(value) => value && setViewMode(value as ViewMode)}
      className="bg-slate-100 p-0.5 rounded-md"
    >
      <ToggleGroupItem
        value="bar"
        aria-label="Bar Chart"
        className="h-7 w-7 p-0 data-[state=on]:bg-white data-[state=on]:shadow-sm"
        title="Bar Chart"
      >
        <BarChart3 className="h-3.5 w-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="line"
        aria-label="Line Chart"
        className="h-7 w-7 p-0 data-[state=on]:bg-white data-[state=on]:shadow-sm"
        title="Line Chart"
      >
        <LineChartIcon className="h-3.5 w-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="table"
        aria-label="Table View"
        className="h-7 w-7 p-0 data-[state=on]:bg-white data-[state=on]:shadow-sm"
        title="Table View"
      >
        <Table2 className="h-3.5 w-3.5" />
      </ToggleGroupItem>
    </ToggleGroup>
  )

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerControls}
            {showViewModeToggle && <ViewModeToggle />}
          </div>
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            <Skeleton className="w-full" style={{ height }} />
          </CardContent>
        )}
      </Card>
    )
  }

  const hasData = chartData.length > 0

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerControls}
          {showViewModeToggle && hasData && <ViewModeToggle />}
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          {hasData ? (
            <>
              {viewMode === 'bar' && <BarChartView />}
              {viewMode === 'line' && <LineChartView />}
              {viewMode === 'table' && <TableView />}
            </>
          ) : (
            <div className="flex items-center justify-center text-slate-400" style={{ height }}>
              <p className="text-sm">No data available</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

