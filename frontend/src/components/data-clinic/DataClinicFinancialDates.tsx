"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Calendar, DollarSign, BarChart3, Table as TableIcon, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrganizationTypeName } from "@/data/iati-organization-types"
import { ExpandableChartCard } from "@/components/analytics/ExpandableChartCard"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts"

// Download an array of rows as a CSV file.
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Small right-aligned toolbar: table/chart toggle + CSV download.
function ChartToolbar({ view, onView, onCsv }: { view: 'chart' | 'table'; onView: (v: 'chart' | 'table') => void; onCsv: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <div className="flex items-center border rounded-md">
        <Button variant={view === 'chart' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-r-none" title="Chart view" onClick={() => onView('chart')}>
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button variant={view === 'table' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-l-none" title="Table view" onClick={() => onView('table')}>
          <TableIcon className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Download CSV" onClick={onCsv}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface OrgFinancialDateRange {
  orgType: string
  orgTypeName: string
  earliestYear: number
  latestYear: number
  activityCount: number
}

// Shaded-header hover card matching the rest of the app's chart tooltips.
function CalendarYearTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 border-b border-border">
        <p className="font-semibold text-foreground text-body">CY {d.year}</p>
      </div>
      <div className="px-3 py-2 text-body">
        <span className="text-muted-foreground">Transactions: </span>
        <span className="font-semibold text-foreground">{d.count}</span>
      </div>
    </div>
  )
}

export function DataClinicFinancialDates() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeData, setRangeData] = useState<OrgFinancialDateRange[]>([])
  const [yearData, setYearData] = useState<{ year: string; count: number }[]>([])
  const [timelineView, setTimelineView] = useState<'chart' | 'table'>('chart')
  const [txView, setTxView] = useState<'chart' | 'table'>('chart')
  const [yearFrom, setYearFrom] = useState<string>('all')
  const [yearTo, setYearTo] = useState<string>('all')

  useEffect(() => {
    fetchFinancialDates()
  }, [])

  const fetchFinancialDates = async () => {
    try {
      setLoading(true)
      setError(null)

      // Org type isn't stored on the activity directly — it's resolved through
      // participating organisations → the organisation record's type. So we
      // fetch three sets and join them in memory:
      //   transactions (date)  →  activity_participating_organizations (org id)  →  organizations (type)
      const [txRes, apoRes, orgRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('activity_id, transaction_date')
          .is('deleted_at', null)
          .not('transaction_date', 'is', null),
        supabase
          .from('activity_participating_organizations')
          .select('activity_id, organization_id')
          .is('deleted_at', null),
        supabase
          .from('organizations')
          .select('id, type')
          .is('deleted_at', null),
      ])

      if (txRes.error || apoRes.error || orgRes.error) {
        console.error('[FinancialDates] Error fetching data:', txRes.error || apoRes.error || orgRes.error)
        setError('Failed to fetch transaction data')
        return
      }

      const transactions = txRes.data || []
      if (transactions.length === 0) {
        setRangeData([])
        setYearData([])
        return
      }

      // Transactions per calendar year (for the volume-over-time chart)
      const yearMap = new Map<number, number>()
      transactions.forEach((t: any) => {
        if (!t.transaction_date) return
        const y = new Date(t.transaction_date).getFullYear()
        if (!Number.isNaN(y)) yearMap.set(y, (yearMap.get(y) || 0) + 1)
      })
      setYearData(
        Array.from(yearMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([year, count]) => ({ year: String(year), count }))
      )

      // organisation id → IATI org type code
      const orgTypeById = new Map<string, string>()
      for (const org of orgRes.data || []) {
        if (org.type) orgTypeById.set(org.id, org.type)
      }

      // activity id → set of org type codes (via its participating organisations)
      const activityOrgTypes = new Map<string, Set<string>>()
      for (const po of apoRes.data || []) {
        if (!po.activity_id || !po.organization_id) continue
        const type = orgTypeById.get(po.organization_id)
        if (!type) continue
        if (!activityOrgTypes.has(po.activity_id)) activityOrgTypes.set(po.activity_id, new Set())
        activityOrgTypes.get(po.activity_id)!.add(type)
      }

      // Map to track earliest and latest transaction years per org type
      const orgTypeMap = new Map<string, { earliest: number; latest: number; count: number }>()

      transactions.forEach((transaction: any) => {
        const types = activityOrgTypes.get(transaction.activity_id)
        if (!types) return
        const year = new Date(transaction.transaction_date).getFullYear()

        types.forEach((orgType) => {
          if (!orgTypeMap.has(orgType)) {
            orgTypeMap.set(orgType, { earliest: year, latest: year, count: 1 })
          } else {
            const existing = orgTypeMap.get(orgType)!
            existing.earliest = Math.min(existing.earliest, year)
            existing.latest = Math.max(existing.latest, year)
            existing.count++
          }
        })
      })

      // Convert to array
      const rangeArray: OrgFinancialDateRange[] = Array.from(orgTypeMap.entries())
        .map(([orgType, data]) => ({
          orgType,
          orgTypeName: getOrganizationTypeName(orgType),
          earliestYear: data.earliest,
          latestYear: data.latest,
          activityCount: data.count
        }))
        .sort((a, b) => a.orgTypeName.localeCompare(b.orgTypeName))

      setRangeData(rangeArray)

    } catch (err) {
      console.error('[FinancialDates] Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Activity Timeline by Organization Type
          </CardTitle>
          <CardDescription>
            Transaction date ranges for each organization type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[600px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Activity Timeline by Organization Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (rangeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Activity Timeline by Organization Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No transaction data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate the overall min and max years for the scale
  const allYears = rangeData.flatMap(d => [d.earliestYear, d.latestYear])
  const minYear = Math.min(...allYears)
  const maxYear = Math.max(...allYears)
  const yearRange = maxYear - minYear + 1

  // Calculate pixel width per year
  const chartWidth = 1200
  const leftPadding = 250
  const rightPadding = 50
  const availableWidth = chartWidth - leftPadding - rightPadding
  const pixelsPerYear = availableWidth / yearRange

  const rowHeight = 50
  const chartHeight = rangeData.length * rowHeight + 100

  // Year picker: available years + the filtered set shown in the bar chart
  const availableYears = yearData.map((d) => d.year)
  const filteredYearData = yearData.filter((d) => {
    const y = Number(d.year)
    if (yearFrom !== 'all' && y < Number(yearFrom)) return false
    if (yearTo !== 'all' && y > Number(yearTo)) return false
    return true
  })

  const datesFooter = (
    <p className="text-body text-muted-foreground leading-relaxed">
      The timeline plots the span of years over which each type of organisation has reported transactions,
      while the bar chart counts how many transactions fall in each calendar year. A short range or a gap means
      an organisation type — or a whole year — has little or no recorded financial activity, which often
      signals disbursements that are missing, reported late, or not yet entered. Use these views to spot
      reporters and periods with sparse or outdated coverage and follow up to fill the gaps, so the platform
      reflects spending closer to real time and your aid data stays complete and trustworthy.
    </p>
  )

  return (
    <div className="space-y-6">
      <ExpandableChartCard
        title="Financial Activity Timeline by Organisation Type"
        description="Range of transaction years for each organisation type"
        height={Math.min(chartHeight, 620)}
        expandedFill
        expandedFooter={datesFooter}
      >
        <div className="flex flex-col h-full gap-2">
          <ChartToolbar
            view={timelineView}
            onView={setTimelineView}
            onCsv={() => downloadCsv(
              'financial-activity-timeline.csv',
              ['Organisation Type', 'Earliest Year', 'Latest Year', 'Transactions'],
              rangeData.map((d) => [d.orgTypeName, d.earliestYear, d.latestYear, d.activityCount])
            )}
          />
          {timelineView === 'table' ? (
            <div className="flex-1 min-h-0 overflow-auto rounded-md border">
              <table className="w-full text-body">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Organisation Type</th>
                    <th className="px-4 py-2 text-right font-medium">Earliest Year</th>
                    <th className="px-4 py-2 text-right font-medium">Latest Year</th>
                    <th className="px-4 py-2 text-right font-medium">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeData.map((d) => (
                    <tr key={d.orgType} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-2">{d.orgTypeName}</td>
                      <td className="px-4 py-2 text-right">{d.earliestYear}</td>
                      <td className="px-4 py-2 text-right">{d.latestYear}</td>
                      <td className="px-4 py-2 text-right">{d.activityCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="flex-1 min-h-0 border border-border rounded-lg bg-white"
          >
            {/* Year axis labels at top */}
            <g>
              {Array.from({ length: yearRange }, (_, i) => {
                const year = minYear + i
                const x = leftPadding + (i * pixelsPerYear)
                return (
                  <g key={year}>
                    <line
                      x1={x}
                      y1={40}
                      x2={x}
                      y2={chartHeight - 20}
                      stroke="#e2e8f0"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={x}
                      y={30}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#64748b"
                    >
                      {year}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* Organization type rows */}
            {rangeData.map((data, index) => {
              const y = 60 + (index * rowHeight)
              const startX = leftPadding + ((data.earliestYear - minYear) * pixelsPerYear)
              const endX = leftPadding + ((data.latestYear - minYear) * pixelsPerYear)
              const barWidth = Math.max(endX - startX, 3) // Minimum width of 3px

              return (
                <g key={data.orgType}>
                  {/* Organization type label */}
                  <text
                    x={10}
                    y={y + 15}
                    fontSize={13}
                    fill="#334155"
                    fontWeight="500"
                  >
                    {data.orgTypeName}
                  </text>

                  {/* Range bar */}
                  <g className="hover:opacity-80 transition-opacity cursor-pointer">
                    <rect
                      x={startX}
                      y={y}
                      width={barWidth}
                      height={30}
                      fill="#3b82f6"
                      rx={4}
                      opacity={0.8}
                    />

                    {/* Start year marker */}
                    <circle
                      cx={startX}
                      cy={y + 15}
                      r={5}
                      fill="#1e40af"
                    />

                    {/* End year marker */}
                    <circle
                      cx={endX}
                      cy={y + 15}
                      r={5}
                      fill="#1e40af"
                    />

                    {/* Year labels on the bar if there's space */}
                    {barWidth > 80 && (
                      <>
                        <text
                          x={startX + 10}
                          y={y + 20}
                          fontSize={11}
                          fill="white"
                          fontWeight="600"
                        >
                          {data.earliestYear}
                        </text>
                        <text
                          x={endX - 10}
                          y={y + 20}
                          fontSize={11}
                          fill="white"
                          fontWeight="600"
                          textAnchor="end"
                        >
                          {data.latestYear}
                        </text>
                      </>
                    )}

                    {/* Tooltip trigger area */}
                    <title>
                      {data.orgTypeName}
                      {'\n'}First transaction: {data.earliestYear}
                      {'\n'}Last transaction: {data.latestYear}
                      {'\n'}Transactions: {data.activityCount}
                    </title>
                  </g>
                </g>
              )
            })}
          </svg>
          )}
        </div>
      </ExpandableChartCard>

      <ExpandableChartCard
        title="Transactions by Year"
        description="Number of transactions recorded in each calendar year"
        height={380}
        expandedFill
        expandedFooter={datesFooter}
      >
        <div className="flex flex-col h-full gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={yearFrom} onValueChange={setYearFrom}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue placeholder="From CY" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">From: any</SelectItem>
                  {availableYears.map((y) => <SelectItem key={y} value={y}>CY {y}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-helper">to</span>
              <Select value={yearTo} onValueChange={setYearTo}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue placeholder="To CY" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">To: any</SelectItem>
                  {availableYears.map((y) => <SelectItem key={y} value={y}>CY {y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ChartToolbar
              view={txView}
              onView={setTxView}
              onCsv={() => downloadCsv(
                'transactions-by-year.csv',
                ['Calendar Year', 'Transactions'],
                filteredYearData.map((d) => [`CY ${d.year}`, d.count])
              )}
            />
          </div>
          <div className="flex-1 min-h-0">
            {txView === 'table' ? (
              <div className="h-full overflow-auto rounded-md border">
                <table className="w-full text-body">
                  <thead className="bg-surface-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Calendar Year</th>
                      <th className="px-4 py-2 text-right font-medium">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredYearData.map((d) => (
                      <tr key={d.year} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-2">CY {d.year}</td>
                        <td className="px-4 py-2 text-right">{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredYearData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(y: any) => `CY ${y}`}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<CalendarYearTooltip />} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </ExpandableChartCard>
    </div>
  )
}
