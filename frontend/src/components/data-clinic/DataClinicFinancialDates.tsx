"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Calendar, DollarSign, BarChart3, Table as TableIcon, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrganizationTypeName } from "@/data/iati-organization-types"
import { ExpandableChartCard } from "@/components/analytics/ExpandableChartCard"
import { Button } from "@/components/ui/button"
import { YearRangeChip } from "@/components/ui/year-range-chip"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
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

// Shaded-header table hover card matching the rest of the app's chart tooltips.
function CalendarYearTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg overflow-hidden max-w-sm">
      <div className="bg-muted px-3 py-2 border-b border-border">
        <p className="font-semibold text-foreground text-body">CY {d.year}</p>
      </div>
      <div className="p-2">
        <Table className="w-full text-body">
          <TableBody>
            <TableRow>
              <TableCell className="pr-4 text-foreground font-medium">Transactions</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{d.count}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// Portal hover card for the (hand-drawn SVG) organisation-type timeline. The
// SVG has no recharts tooltip, so we render our own at the cursor.
function TimelineTooltip({ d, x, y }: { d: OrgFinancialDateRange; x: number; y: number }) {
  if (typeof document === 'undefined') return null
  const TT_W = 300
  const TT_H = 170
  const PAD = 12
  let left = x + 16
  let top = y + 16
  if (left + TT_W > window.innerWidth - PAD) left = x - TT_W - 16
  if (left < PAD) left = PAD
  if (top + TT_H > window.innerHeight - PAD) top = Math.max(PAD, window.innerHeight - TT_H - PAD)
  return createPortal(
    <div
      style={{ position: 'fixed', left, top, width: TT_W, zIndex: 10010, pointerEvents: 'none' }}
      className="bg-white border border-border rounded-lg shadow-lg overflow-hidden"
    >
      <div className="bg-muted px-3 py-2 border-b border-border">
        <p className="font-semibold text-foreground text-body">
          <span className="text-xs font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded mr-1.5 align-middle">{d.orgType}</span>
          {d.orgTypeName}
        </p>
      </div>
      <div className="p-2">
        <Table className="w-full text-body">
          <TableBody>
            <TableRow className="border-b border-border">
              <TableCell className="pr-4 text-foreground font-medium">First transaction</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{d.earliestYear}</TableCell>
            </TableRow>
            <TableRow className="border-b border-border">
              <TableCell className="pr-4 text-foreground font-medium">Last transaction</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{d.latestYear}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pr-4 text-foreground font-medium">Transactions</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{d.activityCount}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>,
    document.body
  )
}

export function DataClinicFinancialDates() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeData, setRangeData] = useState<OrgFinancialDateRange[]>([])
  const [yearData, setYearData] = useState<{ year: string; count: number }[]>([])
  const [timelineView, setTimelineView] = useState<'chart' | 'table'>('chart')
  const [txView, setTxView] = useState<'chart' | 'table'>('chart')
  // Selected calendar-year range for the "Transactions by Year" chart (matches
  // the analytics dashboard's YearRangeChip). Empty = chip defaults to the full
  // data range on first paint.
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [hoverRow, setHoverRow] = useState<{ d: OrgFinancialDateRange; x: number; y: number } | null>(null)

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

  // Year picker (YearRangeChip): selectable years + actual data range, and the
  // filtered set shown in the bar chart.
  const txYears = yearData.map((d) => Number(d.year)).filter((y) => !Number.isNaN(y))
  const availableYears = Array.from(new Set(txYears)).sort((a, b) => a - b)
  const txDataRange = availableYears.length > 0
    ? { minYear: availableYears[0], maxYear: availableYears[availableYears.length - 1] }
    : null
  const filteredYearData = yearData.filter((d) => {
    if (selectedYears.length === 0) return true
    const y = Number(d.year)
    return y >= Math.min(...selectedYears) && y <= Math.max(...selectedYears)
  })

  const datesFooter = (
    <p className="text-body text-muted-foreground leading-relaxed">
      The timeline plots the span of years over which each type of organisation has reported transactions,
      while the bar chart counts how many transactions fall in each calendar year. A short range or a gap means
      an organisation type (or a whole year) has little or no recorded financial activity, which often
      signals disbursements that are missing, reported late, or not yet entered. Use these views to spot
      reporters and periods with sparse or outdated coverage and follow up to fill the gaps, so the platform
      reflects spending closer to real time and your aid data stays complete and trustworthy.
    </p>
  )

  // ---- Reusable chart / table / filter pieces -------------------------------
  // The timeline is a hand-drawn SVG scaled to fit its container. In the
  // narrow collapsed card we use a smaller viewBox + larger fonts so the
  // labels stay legible; the expanded modal gets the full-width layout.
  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

  const renderTimeline = (compact: boolean) => {
    const chartWidth = compact ? 620 : 1200
    const leftPadding = compact ? 175 : 250
    const rightPadding = compact ? 30 : 50
    const availableWidth = chartWidth - leftPadding - rightPadding
    const pixelsPerYear = availableWidth / yearRange
    const rowHeight = 50
    const chartHeight = rangeData.length * rowHeight + 100
    const labelFont = compact ? 15 : 14
    const yearFont = compact ? 13 : 12
    const barYearFont = compact ? 12 : 11
    const maxLabelChars = compact ? 18 : 31

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        {/* Year axis labels at top */}
        <g>
          {Array.from({ length: yearRange }, (_, i) => {
            const year = minYear + i
            const x = leftPadding + (i * pixelsPerYear)
            return (
              <g key={year}>
                <line x1={x} y1={40} x2={x} y2={chartHeight - 20} stroke="#e2e8f0" strokeDasharray="2,2" />
                <text x={x} y={30} textAnchor="middle" fontSize={yearFont} fill="#64748b">{year}</text>
              </g>
            )
          })}
        </g>
        {/* Organization type rows */}
        {rangeData.map((data, index) => {
          const y = 60 + (index * rowHeight)
          const startX = leftPadding + ((data.earliestYear - minYear) * pixelsPerYear)
          const endX = leftPadding + ((data.latestYear - minYear) * pixelsPerYear)
          const barWidth = Math.max(endX - startX, 3)
          return (
            <g key={data.orgType}>
              {(() => {
                const code = data.orgType
                const padX = 5
                const charW = labelFont * 0.62
                const codeW = code.length * charW + padX * 2
                const nameX = 10 + codeW + 6
                return (
                  <>
                    {/* gray monospace code badge */}
                    <rect x={10} y={y + 5} width={codeW} height={labelFont + 5} rx={3} fill="#e2e8f0" />
                    <text x={10 + padX} y={y + 19} fontSize={labelFont} fill="#64748b" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">{code}</text>
                    <text x={nameX} y={y + 19} fontSize={labelFont} fill="#334155" fontWeight="500">{truncate(data.orgTypeName, maxLabelChars)}</text>
                  </>
                )
              })()}
              <g
                className="hover:opacity-80 transition-opacity cursor-pointer"
                onMouseMove={(e) => setHoverRow({ d: data, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoverRow(null)}
              >
                {/* invisible full-row hit area so the whole band is hoverable */}
                <rect x={leftPadding} y={y} width={availableWidth} height={30} fill="transparent" />
                <rect x={startX} y={y} width={barWidth} height={30} fill="#3b82f6" rx={4} opacity={0.8} />
                <circle cx={startX} cy={y + 15} r={5} fill="#1e40af" />
                <circle cx={endX} cy={y + 15} r={5} fill="#1e40af" />
                {barWidth > 80 && (
                  <>
                    <text x={startX + 10} y={y + 20} fontSize={barYearFont} fill="white" fontWeight="600">{data.earliestYear}</text>
                    <text x={endX - 10} y={y + 20} fontSize={barYearFont} fill="white" fontWeight="600" textAnchor="end">{data.latestYear}</text>
                  </>
                )}
              </g>
            </g>
          )
        })}
      </svg>
    )
  }

  const timelineTable = (
    <div className="h-full overflow-auto rounded-md border">
      <Table className="w-full text-body">
        <TableHeader className="sticky top-0">
          <TableRow>
            <TableHead>Organisation Type</TableHead>
            <TableHead className="text-right">Earliest Year</TableHead>
            <TableHead className="text-right">Latest Year</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rangeData.map((d) => (
            <TableRow key={d.orgType}>
              <TableCell>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-1.5 align-middle">{d.orgType}</span>
                {d.orgTypeName}
              </TableCell>
              <TableCell className="text-right">{d.earliestYear}</TableCell>
              <TableCell className="text-right">{d.latestYear}</TableCell>
              <TableCell className="text-right">{d.activityCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const txChart = (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={filteredYearData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(y: any) => `CY ${y}`} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <RTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<CalendarYearTooltip />} />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )

  const txTable = (
    <div className="h-full overflow-auto rounded-md border">
      <Table className="w-full text-body">
        <TableHeader className="sticky top-0">
          <TableRow>
            <TableHead>Calendar Year</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredYearData.map((d) => (
            <TableRow key={d.year}>
              <TableCell>CY {d.year}</TableCell>
              <TableCell className="text-right">{d.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const yearFilterEl = (
    <YearRangeChip
      selectedYears={selectedYears}
      onYearsChange={setSelectedYears}
      availableYears={availableYears.length > 0 ? availableYears : undefined}
      actualDataRange={txDataRange}
    />
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-stretch">
      {hoverRow && <TimelineTooltip d={hoverRow.d} x={hoverRow.x} y={hoverRow.y} />}
      <ExpandableChartCard
        title="Financial Activity Timeline by Organisation Type"
        description="Range of transaction years for each organisation type"
        height={380}
        expandedFill
        expandedControls={
          <ChartToolbar
            view={timelineView}
            onView={setTimelineView}
            onCsv={() => downloadCsv(
              'financial-activity-timeline.csv',
              ['Organisation Type', 'Earliest Year', 'Latest Year', 'Transactions'],
              rangeData.map((d) => [d.orgTypeName, d.earliestYear, d.latestYear, d.activityCount])
            )}
          />
        }
        expandedChildren={
          <div className="h-full min-h-0">
            {timelineView === 'table' ? timelineTable : renderTimeline(false)}
          </div>
        }
        expandedFooter={datesFooter}
      >
        {renderTimeline(true)}
      </ExpandableChartCard>

      <ExpandableChartCard
        title="Transactions by Year"
        description="Number of transactions recorded in each calendar year"
        height={380}
        expandedFill
        expandedControls={
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {yearFilterEl}
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
        }
        expandedChildren={
          <div className="h-full min-h-0">
            {txView === 'table' ? txTable : txChart}
          </div>
        }
        expandedFooter={datesFooter}
      >
        {txChart}
      </ExpandableChartCard>
    </div>
  )
}
