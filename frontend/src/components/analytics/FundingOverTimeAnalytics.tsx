"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Layers,
  Download,
  Building2,
  AlertCircle,
  Info,
  Maximize2
} from 'lucide-react'
import { BarChartSkeleton } from '@/components/ui/skeleton-loader'
import { exportChartToJPG, downloadCSV, convertToCSV } from '@/lib/chart-export'
import { toast } from 'sonner'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { apiFetch } from '@/lib/api-fetch';

// Color scheme
const COLORS = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
  // Data type specific colors
  actual: '#059669',      // Green for confirmed actuals
  partial: '#d97706',     // Amber for current year partial
  indicative: '#6366f1',  // Indigo for future indicative
}

// Interface for the new unified API response
interface FundingTimeSeriesPoint {
  organization_id: string
  organization_name: string
  organization_acronym: string | null
  year: number
  amount_usd: number
  data_source: 'transactions' | 'organization_budgets'
  data_type: 'actual' | 'partial' | 'indicative'
  transaction_count?: number
}

interface ApiResponse {
  data: FundingTimeSeriesPoint[]
  metadata: {
    currentYear: number
    organizationCount: number
    dataSourcesUsed: string[]
    note: string
  }
}

type ChartViewType = 'line' | 'bar' | 'area' | 'table'

// Legend item component for data types
const DataTypeLegendItem = ({ color, label, isDashed = false }: { color: string; label: string; isDashed?: boolean }) => (
  <div className="flex items-center gap-2 text-sm">
    <div className="flex items-center">
      {isDashed ? (
        <svg width="24" height="2" className="flex-shrink-0">
          <line x1="0" y1="1" x2="24" y2="1" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
        </svg>
      ) : (
        <div className="w-6 h-0.5 flex-shrink-0" style={{ backgroundColor: color }} />
      )}
    </div>
    <span className="text-gray-600">{label}</span>
  </div>
)

// Get color for data type
const getDataTypeColor = (dataType: string) => {
  switch (dataType) {
    case 'actual': return COLORS.actual
    case 'partial': return COLORS.partial
    case 'indicative': return COLORS.indicative
    default: return COLORS.blueSlate
  }
}

// Get label for data type
const getDataTypeLabel = (dataType: string) => {
  switch (dataType) {
    case 'actual': return 'Actual'
    case 'partial': return 'YTD'
    case 'indicative': return 'Indicative'
    default: return dataType
  }
}

export function FundingOverTimeAnalytics() {
  const [selectedDonors, setSelectedDonors] = useState<string[]>([])
  const [chartView, setChartView] = useState<ChartViewType>('line')
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym: string | null }>>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [timeSeriesData, setTimeSeriesData] = useState<FundingTimeSeriesPoint[]>([])
  const [metadata, setMetadata] = useState<ApiResponse['metadata'] | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()

  // Fetch organizations that have funding data (either transactions or envelopes)
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoadingOrgs(true)
        const response = await apiFetch('/api/organizations/funding-envelopes-summary')
        if (!response.ok) throw new Error('Failed to fetch organizations')
        const data = await response.json()
        setOrganizations(
          data.organizations.map((org: any) => ({
            id: org.id,
            name: org.name,
            acronym: org.acronym
          }))
        )
      } catch (error) {
        console.error('Error fetching organizations:', error)
        toast.error('Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }

    fetchOrganizations()
  }, [])

  // Fetch unified time series data when donors are selected
  useEffect(() => {
    const fetchData = async () => {
      if (selectedDonors.length === 0) {
        setTimeSeriesData([])
        setMetadata(null)
        return
      }

      try {
        setLoading(true)
        const response = await apiFetch(`/api/analytics/funding-over-time?organizationIds=${selectedDonors.join(',')}`
        )
        if (!response.ok) throw new Error('Failed to fetch funding time series data')
        const result: ApiResponse = await response.json()
        setTimeSeriesData(result.data)
        setMetadata(result.metadata)
      } catch (error) {
        console.error('Error fetching funding time series data:', error)
        toast.error('Failed to load funding data')
        setTimeSeriesData([])
        setMetadata(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedDonors])

  // Prepare chart data - group by year with each donor as a separate series
  const chartData = useMemo(() => {
    if (!timeSeriesData || timeSeriesData.length === 0) return []

    // Get all unique years
    const years = Array.from(new Set(timeSeriesData.map(d => d.year))).sort((a, b) => a - b)
    
    // Get all selected organizations
    const selectedOrgs = selectedDonors.map(id => {
      const org = organizations.find(o => o.id === id)
      return org ? { id, name: org.name, acronym: org.acronym } : null
    }).filter(Boolean) as Array<{ id: string; name: string; acronym: string | null }>

    // Build data structure
    return years.map(year => {
      const yearData: any = { year }
      
      selectedOrgs.forEach(org => {
        const orgData = timeSeriesData.find(
          d => d.organization_id === org.id && d.year === year
        )
        const displayName = org.acronym || org.name
        if (orgData) {
          yearData[displayName] = orgData.amount_usd || 0
          yearData[`${displayName}_data_type`] = orgData.data_type
          yearData[`${displayName}_data_source`] = orgData.data_source
          yearData[`${displayName}_transaction_count`] = orgData.transaction_count
        } else {
          yearData[displayName] = 0
          // Infer data type based on year
          yearData[`${displayName}_data_type`] = year < currentYear ? 'actual' : (year === currentYear ? 'partial' : 'indicative')
          yearData[`${displayName}_data_source`] = year <= currentYear ? 'transactions' : 'organization_budgets'
        }
      })

      return yearData
    })
  }, [timeSeriesData, selectedDonors, organizations, currentYear])

  // Get organization names for legend
  const donorNames = useMemo(() => {
    return selectedDonors.map(id => {
      const org = organizations.find(o => o.id === id)
      return org ? (org.acronym || org.name) : id
    })
  }, [selectedDonors, organizations])

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  // Custom tooltip with data source info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const uniqueEntries = new Map()
      payload.forEach((entry: any) => {
        if (entry.name && !uniqueEntries.has(entry.name)) {
          uniqueEntries.set(entry.name, entry)
        }
      })
      const deduplicatedPayload = Array.from(uniqueEntries.values())
      const yearLabel = typeof label === 'number' ? label : parseInt(label)

      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ borderColor: COLORS.paleSlate }}>
          <div className="px-3 py-2 font-semibold" style={{ backgroundColor: COLORS.platinum, color: COLORS.blueSlate, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
            {label}
          </div>
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: COLORS.platinum }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.blueSlate, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                  Donor
                </th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: COLORS.blueSlate, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                  Amount
                </th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: COLORS.blueSlate, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {deduplicatedPayload.map((entry: any, index: number) => {
                const dataType = entry.payload?.[`${entry.name}_data_type`] || 'actual'
                const txCount = entry.payload?.[`${entry.name}_transaction_count`]
                
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : COLORS.platinum }}>
                    <td className="px-3 py-2" style={{ color: entry.color || COLORS.primaryScarlet, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                      {entry.name}
                    </td>
                    <td className="px-3 py-2 text-right font-medium" style={{ color: COLORS.blueSlate, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                      {formatCurrency(entry.value)}
                      {txCount && <span className="text-xs text-gray-400 ml-1">({txCount} txns)</span>}
                    </td>
                    <td className="px-3 py-2 text-center" style={{ borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: getDataTypeColor(dataType),
                          color: getDataTypeColor(dataType)
                        }}
                      >
                        {getDataTypeLabel(dataType)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-gray-500" style={{ borderTop: `1px solid ${COLORS.paleSlate}`, backgroundColor: COLORS.platinum }}>
            {yearLabel < currentYear && 'Source: Activity transactions (disbursements + expenditures)'}
            {yearLabel === currentYear && 'Source: Activity transactions (year-to-date)'}
            {yearLabel > currentYear && 'Source: Organisation indicative budgets'}
          </div>
        </div>
      )
    }
    return null
  }

  // Handle CSV export with metadata columns
  const handleExportCSV = () => {
    if (timeSeriesData.length === 0) {
      toast.error('No data to export')
      return
    }

    // Prepare export data with metadata columns
    const exportData = timeSeriesData.map(point => ({
      organization_name: point.organization_name,
      organization_acronym: point.organization_acronym || '',
      year: point.year,
      amount_usd: point.amount_usd,
      data_source: point.data_source,
      data_type: point.data_type,
      transaction_count: point.transaction_count || ''
    }))

    const csvContent = convertToCSV(exportData)
    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(csvContent, `funding-over-time-${timestamp}.csv`)
    toast.success('CSV exported successfully')
  }

  // Handle JPG export
  const handleExportJPG = async () => {
    if (!chartRef.current) {
      toast.error('Chart element not found')
      return
    }

    try {
      await exportChartToJPG(chartRef.current, 'funding-over-time')
      toast.success('Image exported successfully')
    } catch (error) {
      console.error('Error exporting JPG:', error)
      toast.error('Failed to export image')
    }
  }

  // Organization options for multi-select
  const organizationOptions: MultiSelectOption[] = organizations.map(org => ({
    label: org.acronym ? `${org.name} (${org.acronym})` : org.name,
    value: org.id
  }))

  const minYear = chartData.length > 0 ? Math.min(...chartData.map(d => d.year)) : currentYear
  const maxYear = chartData.length > 0 ? Math.max(...chartData.map(d => d.year)) : currentYear

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" style={{ color: COLORS.primaryScarlet }} />
                  Funding Over Time
                </CardTitle>
                <CardDescription className="mt-1">
                  Compare funding across multiple donors over time
                </CardDescription>
              </div>
              {/* Info tooltip explaining data sources */}
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm p-4 bg-white border shadow-lg">
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-gray-900">About this data</p>
                      <ul className="space-y-1 text-gray-600">
                        <li><span className="font-medium" style={{ color: COLORS.actual }}>Past years:</span> Aggregated from published IATI activity transactions (disbursements + expenditures)</li>
                        <li><span className="font-medium" style={{ color: COLORS.partial }}>Current year:</span> Year-to-date transaction totals (partial data)</li>
                        <li><span className="font-medium" style={{ color: COLORS.indicative }}>Future years:</span> Indicative organisation-level budgets (subject to change)</li>
                      </ul>
                      <p className="text-xs text-gray-500 pt-2 border-t">
                        Future projections should not be treated as commitments.
                      </p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Donor Multi-Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2" style={{ color: COLORS.blueSlate }}>
                <Building2 className="h-4 w-4" />
                Select Donors
              </label>
              <MultiSelect
                options={organizationOptions}
                selected={selectedDonors}
                onChange={setSelectedDonors}
                placeholder="Select organizations to compare..."
                disabled={loadingOrgs}
                showSelectAll={true}
                selectedLabel={`donor${selectedDonors.length !== 1 ? 's' : ''} selected`}
              />
            </div>

            {/* Chart Type Toggle and Export Buttons */}
            {selectedDonors.length > 0 && (
              <div className="flex items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: COLORS.paleSlate }}>
                <div className="flex gap-1 border rounded-lg p-1" style={{ backgroundColor: COLORS.platinum }}>
                  <Button
                    variant={chartView === 'line' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartView('line')}
                    className="h-8"
                    style={chartView === 'line' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                  >
                    <LineChartIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartView === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartView('bar')}
                    className="h-8"
                    style={chartView === 'bar' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartView === 'area' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartView('area')}
                    className="h-8"
                    style={chartView === 'area' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartView === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartView('table')}
                    className="h-8"
                    style={chartView === 'table' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={loading || chartData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportJPG}
                    disabled={loading || chartData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    JPG
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Type Legend - only show when expanded */}
      {isExpanded && selectedDonors.length > 0 && chartData.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-6 justify-center">
              <DataTypeLegendItem color={COLORS.actual} label="Actuals (activity transactions)" />
              <DataTypeLegendItem color={COLORS.partial} label="Current year (partial YTD)" />
              <DataTypeLegendItem color={COLORS.indicative} label="Future years (indicative budgets)" isDashed />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart/Table Display */}
      {selectedDonors.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center" style={{ color: COLORS.blueSlate }}>
              <Building2 className="h-12 w-12 mx-auto mb-4" style={{ color: COLORS.paleSlate }} />
              <p className="font-medium mb-1">No donors selected</p>
              <p className="text-sm">Select one or more organizations to compare funding over time</p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-6">
            <BarChartSkeleton height="300px" bars={8} />
          </CardContent>
        </Card>
      ) : chartData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center" style={{ color: COLORS.blueSlate }}>
              <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: COLORS.paleSlate }} />
              <p className="font-medium mb-1">No data available</p>
              <p className="text-sm">The selected organizations don&apos;t have funding data for this period</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card ref={chartRef}>
          <CardContent className="pt-6">
            {chartView === 'line' && (
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.paleSlate} />
                  <XAxis
                    dataKey="year"
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                  />
                  <YAxis
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {isExpanded && <Legend />}
                  {/* Vertical reference line at current year boundary */}
                  <ReferenceLine 
                    x={currentYear} 
                    stroke={COLORS.partial} 
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: 'Now', position: 'top', fill: COLORS.partial, fontSize: 12 }}
                  />
                  {donorNames.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={COLORS.blueSlate}
                      strokeWidth={2}
                      dot={(props: any) => {
                        if (!props || !props.payload) return null
                        const dataType = props.payload[`${name}_data_type`]
                        const color = getDataTypeColor(dataType)
                        const isIndicative = dataType === 'indicative'
                        return (
                          <circle 
                            cx={props.cx} 
                            cy={props.cy} 
                            r={isIndicative ? 5 : 4} 
                            fill={color}
                            stroke={isIndicative ? color : 'none'}
                            strokeWidth={isIndicative ? 2 : 0}
                            fillOpacity={isIndicative ? 0.3 : 1}
                          />
                        )
                      }}
                      connectNulls={true}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}

            {chartView === 'bar' && (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.paleSlate} />
                  <XAxis
                    dataKey="year"
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                  />
                  <YAxis
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {isExpanded && <Legend />}
                  <ReferenceLine 
                    x={currentYear} 
                    stroke={COLORS.partial} 
                    strokeDasharray="4 4"
                    strokeWidth={2}
                  />
                  {donorNames.map((name) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      name={name}
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => {
                        const dataType = entry[`${name}_data_type`] as string
                        return (
                          <Cell 
                            key={`cell-${name}-${index}`} 
                            fill={getDataTypeColor(dataType)}
                            fillOpacity={dataType === 'indicative' ? 0.6 : 1}
                            stroke={dataType === 'indicative' ? getDataTypeColor(dataType) : 'none'}
                            strokeWidth={dataType === 'indicative' ? 2 : 0}
                            strokeDasharray={dataType === 'indicative' ? '4 2' : undefined}
                          />
                        )
                      })}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartView === 'area' && (
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.paleSlate} />
                  <XAxis
                    dataKey="year"
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                  />
                  <YAxis
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {isExpanded && <Legend />}
                  <ReferenceLine 
                    x={currentYear} 
                    stroke={COLORS.partial} 
                    strokeDasharray="4 4"
                    strokeWidth={2}
                  />
                  {donorNames.map((name) => {
                    return (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        name={name}
                        stroke={COLORS.blueSlate}
                        fill={COLORS.blueSlate}
                        fillOpacity={0.4}
                        strokeWidth={2}
                        connectNulls={true}
                      />
                    )
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartView === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: COLORS.platinum }}>
                      <th className="border p-3 text-left font-semibold" style={{ color: COLORS.blueSlate, borderColor: COLORS.paleSlate }}>
                        Year
                      </th>
                      <th className="border p-3 text-center font-semibold" style={{ color: COLORS.blueSlate, borderColor: COLORS.paleSlate }}>
                        Data Type
                      </th>
                      {donorNames.map((name) => (
                        <th
                          key={name}
                          className="border p-3 text-right font-semibold"
                          style={{ color: COLORS.blueSlate, borderColor: COLORS.paleSlate }}
                        >
                          {name}
                        </th>
                      ))}
                      <th className="border p-3 text-right font-semibold" style={{ color: COLORS.blueSlate, borderColor: COLORS.paleSlate }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, index) => {
                      const rowTotal = donorNames.reduce((sum, name) => sum + (row[name] || 0), 0)
                      const firstDonorDataType = row[`${donorNames[0]}_data_type`] as string
                      return (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : COLORS.platinum }}>
                          <td className="border p-3 font-medium" style={{ color: COLORS.blueSlate, borderColor: COLORS.paleSlate }}>
                            {row.year}
                          </td>
                          <td className="border p-3 text-center" style={{ borderColor: COLORS.paleSlate }}>
                            <Badge 
                              variant="outline"
                              style={{ 
                                borderColor: getDataTypeColor(firstDonorDataType),
                                color: getDataTypeColor(firstDonorDataType)
                              }}
                            >
                              {firstDonorDataType === 'actual' ? 'Actual' : 
                               firstDonorDataType === 'partial' ? 'Partial (YTD)' : 'Indicative'}
                            </Badge>
                          </td>
                          {donorNames.map((name) => (
                            <td
                              key={name}
                              className="border p-3 text-right"
                              style={{ color: COLORS.blueSlate, borderColor: COLORS.paleSlate }}
                            >
                              {formatCurrency(row[name] || 0)}
                            </td>
                          ))}
                          <td className="border p-3 text-right font-semibold" style={{ color: COLORS.primaryScarlet, borderColor: COLORS.paleSlate }}>
                            {formatCurrency(rowTotal)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Important Note */}
      <Card style={{ borderColor: COLORS.paleSlate, backgroundColor: COLORS.platinum }}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: COLORS.primaryScarlet }} />
            <div className="text-sm" style={{ color: COLORS.blueSlate }}>
              <p className="font-medium mb-1">Important: Data Interpretation</p>
              <p>
                <strong>Past years</strong> show confirmed transaction data (disbursements and expenditures). 
                <strong> Current year</strong> figures are year-to-date and will update as new transactions are recorded. 
                <strong> Future years</strong> reflect indicative organisation-level budgets and are subject to change—they should not be treated as firm commitments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
