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
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  BarChart3, 
  LineChart as LineChartIcon, 
  Table as TableIcon, 
  Layers,
  Download,
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { getTemporalCategory } from '@/types/organization-funding-envelope'
import { exportChartToCSV, exportChartToJPG } from '@/lib/chart-export'
import { toast } from 'sonner'

// Color scheme
const COLORS = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8'
}

// Color palette for multiple donors
const DONOR_COLORS = [
  COLORS.primaryScarlet,
  COLORS.blueSlate,
  COLORS.coolSteel,
  '#e11d48', // Pink/Red variant
  '#7c3aed', // Purple variant
  '#059669', // Green variant
  '#ea580c', // Orange variant
  '#0369a1', // Blue variant
]

interface FundingEnvelopeDataPoint {
  organization_id: string
  organization_name: string
  organization_acronym: string | null
  year: number
  amount: number
  amount_usd: number
  currency: string
  status: string
  category: 'past' | 'current' | 'future'
}

type ChartViewType = 'line' | 'bar' | 'area' | 'table'

export function FundingOverTimeAnalytics() {
  const [selectedDonors, setSelectedDonors] = useState<string[]>([])
  const [chartView, setChartView] = useState<ChartViewType>('line')
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym: string | null }>>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [envelopeData, setEnvelopeData] = useState<FundingEnvelopeDataPoint[]>([])
  const chartRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()

  // Fetch organizations that have funding envelopes
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoadingOrgs(true)
        const response = await fetch('/api/organizations/funding-envelopes-summary')
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

  // Fetch funding envelope data when donors are selected
  useEffect(() => {
    const fetchData = async () => {
      if (selectedDonors.length === 0) {
        setEnvelopeData([])
        return
      }

      try {
        setLoading(true)
        const response = await fetch(
          `/api/analytics/funding-envelopes?organizationIds=${selectedDonors.join(',')}`
        )
        if (!response.ok) throw new Error('Failed to fetch funding envelope data')
        const data = await response.json()
        setEnvelopeData(data)
      } catch (error) {
        console.error('Error fetching funding envelope data:', error)
        toast.error('Failed to load funding data')
        setEnvelopeData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedDonors])

  // Prepare chart data - group by year with each donor as a separate series
  // Also track temporal category for each data point for coloring
  const chartData = useMemo(() => {
    if (!envelopeData || envelopeData.length === 0) return []

    // Get all unique years
    const years = Array.from(new Set(envelopeData.map(d => d.year))).sort((a, b) => a - b)
    
    // Get all selected organizations
    const selectedOrgs = selectedDonors.map(id => {
      const org = organizations.find(o => o.id === id)
      return org ? { id, name: org.name, acronym: org.acronym } : null
    }).filter(Boolean) as Array<{ id: string; name: string; acronym: string | null }>

    // Build data structure: array of year objects with each donor as a property
    // Also include category info for each donor-year combination
    return years.map(year => {
      const yearData: any = { year }
      
      selectedOrgs.forEach(org => {
        const orgData = envelopeData.find(
          d => d.organization_id === org.id && d.year === year
        )
        const displayName = org.acronym || org.name
        if (orgData) {
          yearData[displayName] = orgData.amount_usd || 0
          // Store category for coloring: `${displayName}_category`
          yearData[`${displayName}_category`] = orgData.category
        } else {
          yearData[displayName] = 0
          yearData[`${displayName}_category`] = 'past' // Default
        }
      })

      return yearData
    })
  }, [envelopeData, selectedDonors, organizations])

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Deduplicate payload by donor name (since multiple segments share the same dataKey)
      const uniqueEntries = new Map()
      payload.forEach((entry: any) => {
        if (entry.name && !uniqueEntries.has(entry.name)) {
          uniqueEntries.set(entry.name, entry)
        }
      })
      const deduplicatedPayload = Array.from(uniqueEntries.values())

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
              </tr>
            </thead>
            <tbody>
              {deduplicatedPayload.map((entry: any, index: number) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : COLORS.platinum }}>
                  <td className="px-3 py-2" style={{ color: entry.color || COLORS.primaryScarlet, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                    {entry.name}
                  </td>
                  <td className="px-3 py-2 text-right font-medium" style={{ color: COLORS.blueSlate, borderBottom: `1px solid ${COLORS.paleSlate}` }}>
                    {formatCurrency(entry.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    return null
  }

  // Prepare data segments for line/area charts (past/current/future styling)
  const getChartSegments = () => {
    if (!envelopeData || envelopeData.length === 0) return { past: [], current: [], future: [] }

    const years = Array.from(new Set(envelopeData.map(d => d.year))).sort((a, b) => a - b)
    const selectedOrgs = selectedDonors.map(id => {
      const org = organizations.find(o => o.id === id)
      return org ? { id, name: org.name, acronym: org.acronym } : null
    }).filter(Boolean) as Array<{ id: string; name: string; acronym: string | null }>

    const segments: {
      past: Array<{ year: number; [key: string]: any }>
      current: Array<{ year: number; [key: string]: any }>
      future: Array<{ year: number; [key: string]: any }>
    } = {
      past: [],
      current: [],
      future: []
    }

    years.forEach(year => {
      const yearData: any = { year }
      let hasFuture = false
      let hasCurrent = false
      let hasPast = false

      selectedOrgs.forEach(org => {
        const orgData = envelopeData.find(d => d.organization_id === org.id && d.year === year)
        const displayName = org.acronym || org.name
        if (orgData) {
          yearData[displayName] = orgData.amount_usd || 0
          if (orgData.category === 'future') hasFuture = true
          else if (orgData.category === 'current') hasCurrent = true
          else hasPast = true
        } else {
          yearData[displayName] = 0
        }
      })

      if (hasFuture) segments.future.push(yearData)
      else if (hasCurrent) segments.current.push(yearData)
      else segments.past.push(yearData)
    })

    return segments
  }

  // Handle CSV export
  const handleExportCSV = () => {
    if (chartData.length === 0) {
      toast.error('No data to export')
      return
    }

    exportChartToCSV(chartData, 'Funding Over Time')
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

  const segments = getChartSegments()
  const minYear = chartData.length > 0 ? Math.min(...chartData.map(d => d.year)) : currentYear
  const maxYear = chartData.length > 0 ? Math.max(...chartData.map(d => d.year)) : currentYear

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: COLORS.primaryScarlet }} />
                Funding Over Time
              </CardTitle>
              <CardDescription className="mt-1">
                Compare indicative organisation-level funding across multiple donors over time
              </CardDescription>
            </div>
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
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin" style={{ color: COLORS.primaryScarlet }} />
              <p className="mt-4" style={{ color: COLORS.blueSlate }}>Loading funding data...</p>
            </div>
          </CardContent>
        </Card>
      ) : chartData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center" style={{ color: COLORS.blueSlate }}>
              <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: COLORS.paleSlate }} />
              <p className="font-medium mb-1">No data available</p>
              <p className="text-sm">The selected organizations don't have funding envelope data for this period</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card ref={chartRef}>
          <CardContent className="pt-6">
            {chartView === 'line' && (() => {
              // Create segments for each donor based on temporal categories
              const lineSegments: Array<{
                name: string
                data: any[]
                color: string
                strokeDasharray?: string
                showInLegend: boolean
                donorName: string
              }> = []

              donorNames.forEach((name, donorIndex) => {
                // Separate data by category for this donor
                const pastPoints: any[] = []
                const currentPoints: any[] = []
                const futurePoints: any[] = []

                chartData.forEach(point => {
                  if (point[name] !== undefined && point[name] !== null) {
                    const category = point[`${name}_category`] as 'past' | 'current' | 'future'
                    if (category === 'past') {
                      pastPoints.push(point)
                    } else if (category === 'current') {
                      currentPoints.push(point)
                    } else {
                      futurePoints.push(point)
                    }
                  }
                })

                // Past segment - solid red
                if (pastPoints.length > 0) {
                  lineSegments.push({
                    name: donorIndex === 0 ? name : '',
                    donorName: name,
                    data: pastPoints,
                    color: COLORS.primaryScarlet,
                    showInLegend: donorIndex === 0
                  })
                }

                // Current segment - solid cool steel (connect from last past point if exists)
                if (currentPoints.length > 0) {
                  const currentSegment = pastPoints.length > 0 
                    ? [pastPoints[pastPoints.length - 1], ...currentPoints]
                    : currentPoints
                  lineSegments.push({
                    name: '',
                    donorName: name,
                    data: currentSegment,
                    color: COLORS.coolSteel,
                    showInLegend: false
                  })
                }

                // Future segment - dashed blue slate (connect from last current/past point)
                if (futurePoints.length > 0) {
                  const lastPoint = currentPoints.length > 0
                    ? currentPoints[currentPoints.length - 1]
                    : (pastPoints.length > 0 ? pastPoints[pastPoints.length - 1] : null)
                  
                  const futureSegment = lastPoint && lastPoint.year < futurePoints[0].year
                    ? [lastPoint, ...futurePoints]
                    : futurePoints
                  
                  lineSegments.push({
                    name: '',
                    donorName: name,
                    data: futureSegment,
                    color: COLORS.blueSlate,
                    strokeDasharray: '8 4',
                    showInLegend: false
                  })
                }
              })

              return (
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.paleSlate} />
                    <XAxis
                      dataKey="year"
                      type="number"
                      domain={[minYear, maxYear]}
                      tickCount={maxYear - minYear + 1}
                      allowDecimals={false}
                      stroke={COLORS.blueSlate}
                      tick={{ fill: COLORS.blueSlate }}
                    />
                    <YAxis
                      stroke={COLORS.blueSlate}
                      tick={{ fill: COLORS.blueSlate }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {lineSegments.map((segment, idx) => (
                      <Line
                        key={`line-${segment.donorName}-${idx}`}
                        type="monotone"
                        data={segment.data}
                        dataKey={segment.donorName}
                        {...(segment.showInLegend ? { name: segment.name } : {})}
                        stroke={segment.color}
                        strokeWidth={2}
                        {...(segment.strokeDasharray ? { strokeDasharray: segment.strokeDasharray } : {})}
                        dot={(props: any) => {
                          if (!props || !props.payload) return null
                          const year = props.payload.year
                          const point = segment.data.find(d => d.year === year)
                          if (!point) return null
                          const category = point[`${segment.donorName}_category`] as 'past' | 'current' | 'future'
                          let dotColor = COLORS.primaryScarlet
                          if (category === 'current') dotColor = COLORS.coolSteel
                          else if (category === 'future') dotColor = COLORS.blueSlate
                          return <circle cx={props.cx} cy={props.cy} r={4} fill={dotColor} />
                        }}
                        connectNulls={true}
                        legendType={segment.showInLegend ? undefined : 'none'}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )
            })()}

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
                  <Legend />
                  {donorNames.map((name) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      name={name}
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => {
                        const category = entry[`${name}_category`] as 'past' | 'current' | 'future'
                        let color = COLORS.primaryScarlet
                        if (category === 'past') {
                          color = COLORS.primaryScarlet
                        } else if (category === 'current') {
                          color = COLORS.coolSteel
                        } else {
                          color = COLORS.blueSlate
                        }
                        return <Cell key={`cell-${name}-${index}`} fill={color} />
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
                  <Legend />
                  {donorNames.map((name, index) => {
                    const color = DONOR_COLORS[index % DONOR_COLORS.length]
                    return (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        name={name}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.5}
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
                      return (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : COLORS.platinum }}>
                          <td className="border p-3 font-medium" style={{ color: COLORS.blueSlate, borderColor: COLORS.paleSlate }}>
                            {row.year}
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
              <p className="font-medium mb-1">Important: Non-Aggregatable Data</p>
              <p>
                These figures represent indicative organisation-level funding from the perspective of each organisation only. 
                They are intended for planning and coordination purposes and must not be aggregated across organisations or treated as national totals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
