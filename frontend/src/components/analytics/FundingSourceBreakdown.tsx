"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, BarChart3, Table as TableIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useChartExpansion, ExpandedOnly } from '@/lib/chart-expansion-context'
import { ChartToolbarRow } from '@/components/ui/chart-toolbar-row'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChartDataTable } from '@/components/ui/chart-data-table'
import { getSectorColor, CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { MetricsMultiSelect } from '@/components/analytics/MetricsMultiSelect'
import { type Metric, METRIC_LABEL, metricColor } from '@/lib/financial-metrics'
import { useYearRangeDefault } from '@/hooks/useYearRangeDefault'

// A "funding source" is the provider organisation. Transactions and planned
// disbursements carry a real provider_org; budgets do not, so a budget's funding
// source is taken to be the activity's reporting organisation (a proxy — the org
// that published/owns the activity). The dropdown offers all three families.
const FUNDING_METRIC_KEYS: Metric[] = ['budgets', 'planned', 'tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_11', 'tx_12', 'tx_13']
const METRIC_TO_TXTYPE: Partial<Record<Metric, string>> = {
  tx_1: '1', tx_2: '2', tx_3: '3', tx_4: '4', tx_11: '11', tx_12: '12', tx_13: '13',
}

interface FundingSourceBreakdownProps {
  dateRange?: { from: Date; to: Date }
  filters?: { country?: string; donor?: string; sector?: string }
  refreshKey?: number
  onDataChange?: (data: Array<{ "Funding Source": string; "Amount (USD)": number; "Share (%)": number }>) => void
}

interface ProviderRow {
  name: string
  acronym: string
  total: number
  perMetric: Record<string, number>
}

// Provider slice colors — shared categorical palette.
const COLORS = Array.from({ length: 8 }, (_, i) => getSectorColor(i))

export function FundingSourceBreakdown({
  dateRange,
  filters,
  refreshKey,
  onDataChange,
}: FundingSourceBreakdownProps) {
  const isExpanded = useChartExpansion()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ProviderRow[]>([])
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  // Default: Disbursements. Users can add Commitments, Incoming Funds, etc.
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3'])
  // Internal calendar/year selection (expanded view). When years are picked it
  // overrides the full-span fetch window used by default.
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [dateWindow, setDateWindow] = useState<{ from: Date; to: Date } | null>(null)
  // Gregorian years present in the loaded data — drives the picker's default.
  const [dataYears, setDataYears] = useState<number[]>([])
  // Fetch the full available span so the year picker reflects all years that have data.
  const fullSpan = useMemo(
    () => ({ from: new Date(2010, 0, 1), to: new Date(new Date().getFullYear() + 10, 11, 31) }),
    [],
  )
  // When the user picks a year range it narrows the fetch; otherwise the full span is used.
  const effectiveDateRange = dateWindow ?? fullSpan
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears)

  // Selected metrics resolved to { label, color } in selection order.
  const metricCols = useMemo(
    () => selectedMetrics.map(m => ({ key: METRIC_LABEL[m], color: metricColor(m) })),
    [selectedMetrics],
  )

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const txTypes = selectedMetrics.map(m => METRIC_TO_TXTYPE[m]).filter(Boolean) as string[]
        const wantsPlanned = selectedMetrics.includes('planned')
        const wantsBudgets = selectedMetrics.includes('budgets')
        if (txTypes.length === 0 && !wantsPlanned && !wantsBudgets) {
          setRows([])
          setLoading(false)
          return
        }
        const typeToLabel: Record<string, string> = {}
        selectedMetrics.forEach(m => {
          const t = METRIC_TO_TXTYPE[m]
          if (t) typeToLabel[t] = METRIC_LABEL[m]
        })

        // One provider map across all three families, keyed by organisation id.
        const map = new Map<string, ProviderRow>()
        // Track the Gregorian years present across all sources so the year
        // picker can default to the full span of years that have data.
        const yearSet = new Set<number>()
        const noteYear = (raw: string | null | undefined) => {
          if (!raw) return
          const y = new Date(raw).getFullYear()
          if (Number.isFinite(y)) yearSet.add(y)
        }
        const addToProvider = (orgId: string | null, name: string, acronym: string, label: string, value: number) => {
          if (!orgId || !value || !isFinite(value)) return
          if (!map.has(orgId)) map.set(orgId, { name: name || 'Unknown Organisation', acronym: acronym || '', total: 0, perMetric: {} })
          const entry = map.get(orgId)!
          entry.total += value
          entry.perMetric[label] = (entry.perMetric[label] || 0) + value
        }

        // 1) Transaction types — real provider_org on each transaction.
        if (txTypes.length > 0) {
          let q = supabase
            .from('transactions')
            .select(`value, value_usd, currency, transaction_type, transaction_date, provider_org_id, organizations:provider_org_id ( id, name, acronym )`)
            .in('transaction_type', txTypes)
            .eq('status', 'actual')
            .not('provider_org_id', 'is', null)
          if (effectiveDateRange) {
            q = q
              .gte('transaction_date', effectiveDateRange.from.toISOString())
              .lte('transaction_date', effectiveDateRange.to.toISOString())
          }
          const { data: transactions, error: txErr } = await q
          if (txErr) {
            console.error('[FundingSourceBreakdown] Error fetching transactions:', txErr)
            setError('Failed to fetch funding source data')
            return
          }
          transactions?.forEach((t: any) => {
            const usd = parseFloat(t.value_usd) || (t.currency === 'USD' ? parseFloat(t.value) || 0 : 0)
            const value = Math.abs(usd)
            const label = typeToLabel[String(t.transaction_type)]
            if (!label) return
            noteYear(t.transaction_date)
            addToProvider(t.provider_org_id, t.organizations?.name, t.organizations?.acronym, label, value)
          })
        }

        // 2) Planned disbursements — real provider_org on each row.
        if (wantsPlanned) {
          let pq = supabase
            .from('planned_disbursements')
            .select(`provider_org_id, provider_org_name, provider_org_acronym, usd_amount, amount, currency, period_start`)
            .not('provider_org_id', 'is', null)
          if (effectiveDateRange) {
            pq = pq
              .gte('period_start', effectiveDateRange.from.toISOString())
              .lte('period_start', effectiveDateRange.to.toISOString())
          }
          const { data: planned, error: pdErr } = await pq
          if (pdErr) {
            console.error('[FundingSourceBreakdown] Error fetching planned disbursements:', pdErr)
          } else {
            const label = METRIC_LABEL['planned']
            planned?.forEach((pd: any) => {
              const usd = (pd.usd_amount != null && isFinite(Number(pd.usd_amount)))
                ? Number(pd.usd_amount)
                : ((pd.currency ?? '').toString().toUpperCase() === 'USD' ? Number(pd.amount) || 0 : 0)
              noteYear(pd.period_start)
              addToProvider(pd.provider_org_id, pd.provider_org_name, pd.provider_org_acronym, label, Math.abs(usd))
            })
          }
        }

        // 3) Budgets — no provider; attribute to the activity's reporting org.
        if (wantsBudgets) {
          let bq = supabase
            .from('activity_budgets')
            .select(`activity_id, value, usd_value, currency, period_start`)
            .not('value', 'is', null)
          if (effectiveDateRange) {
            bq = bq
              .gte('period_start', effectiveDateRange.from.toISOString())
              .lte('period_start', effectiveDateRange.to.toISOString())
          }
          const { data: budgets, error: bErr } = await bq
          if (bErr) {
            console.error('[FundingSourceBreakdown] Error fetching budgets:', bErr)
          } else if (budgets && budgets.length > 0) {
            // budget.activity_id → reporting_org_id → organisation name/acronym
            const activityIds = [...new Set(budgets.map((b: any) => b.activity_id).filter(Boolean))]
            const actToOrg = new Map<string, string>()
            if (activityIds.length > 0) {
              const { data: acts } = await supabase
                .from('activities')
                .select('id, reporting_org_id')
                .in('id', activityIds)
              acts?.forEach((a: any) => { if (a.reporting_org_id) actToOrg.set(a.id, a.reporting_org_id) })
            }
            const orgIds = [...new Set(Array.from(actToOrg.values()))]
            const orgInfo = new Map<string, { name: string; acronym: string }>()
            if (orgIds.length > 0) {
              const { data: orgs } = await supabase
                .from('organizations')
                .select('id, name, acronym')
                .in('id', orgIds)
              orgs?.forEach((o: any) => orgInfo.set(o.id, { name: o.name, acronym: o.acronym || '' }))
            }
            const label = METRIC_LABEL['budgets']
            budgets.forEach((b: any) => {
              const orgId = actToOrg.get(b.activity_id)
              if (!orgId) return
              const info = orgInfo.get(orgId)
              const usd = (b.usd_value != null && isFinite(Number(b.usd_value)))
                ? Number(b.usd_value)
                : ((b.currency ?? '').toString().toUpperCase() === 'USD' ? Number(b.value) || 0 : 0)
              noteYear(b.period_start)
              addToProvider(orgId, info?.name || 'Unknown Organisation', info?.acronym || '', label, Math.abs(usd))
            })
          }
        }

        let sorted = Array.from(map.values()).filter(s => s.total > 0).sort((a, b) => b.total - a.total)
        if (sorted.length > 8) {
          const top7 = sorted.slice(0, 7)
          const rest = sorted.slice(7)
          const others: ProviderRow = { name: 'Others', acronym: '', total: 0, perMetric: {} }
          rest.forEach(s => {
            others.total += s.total
            for (const k in s.perMetric) others.perMetric[k] = (others.perMetric[k] || 0) + s.perMetric[k]
          })
          sorted = [...top7, others]
        }

        setRows(sorted)
        setDataYears(Array.from(yearSet))
        const total = sorted.reduce((sum, s) => sum + s.total, 0)
        onDataChange?.(
          sorted.map(s => ({
            "Funding Source": s.name,
            "Amount (USD)": Math.round(s.total),
            "Share (%)": total > 0 ? Number(((s.total / total) * 100).toFixed(1)) : 0,
          })),
        )
      } catch (err) {
        console.error('[FundingSourceBreakdown] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [effectiveDateRange, filters, refreshKey, selectedMetrics])

  const totalValue = rows.reduce((sum, s) => sum + s.total, 0)

  // Flatten perMetric into top-level keys for recharts (one key per metric label).
  // `label` is the Y-axis text — the acronym when we have one, else the full name.
  const chartData = useMemo(
    () =>
      rows.map((s, idx) => {
        const row: Record<string, any> = {
          name: s.name,
          acronym: s.acronym,
          label: s.acronym && s.acronym !== s.name ? s.acronym : s.name,
          total: s.total,
          fill: COLORS[idx % COLORS.length],
        }
        metricCols.forEach(c => { row[c.key] = s.perMetric[c.key] || 0 })
        return row
      }),
    [rows, metricCols],
  )

  // Header text — full name with the acronym in parentheses (same font/weight as
  // the name, since it's all the tooltip title).
  const headerLabel = (datum: any) =>
    datum?.acronym && datum.acronym !== datum.name ? `${datum.name} (${datum.acronym})` : datum?.name

  // Donut tooltip — provider total plus the per-metric split.
  const DonutTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const entry = payload[0]
    const datum = entry.payload
    const rowsOut = metricCols.map(c => ({
      label: c.key,
      value: formatTooltipCurrency(datum[c.key] || 0, isExpanded),
      color: c.color,
    }))
    if (metricCols.length > 1) {
      rowsOut.push({ label: 'Total', value: formatTooltipCurrency(datum.total || 0, isExpanded), color: datum.fill })
    }
    return <ChartTooltipCard title={headerLabel(datum)} rows={rowsOut} />
  }

  // Grouped-bar tooltip — value per selected metric for the hovered provider.
  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const datum = payload[0]?.payload
    return (
      <ChartTooltipCard
        title={headerLabel(datum)}
        rows={payload.map((e: any) => ({
          label: e.name,
          value: formatTooltipCurrency(Number(e.value) || 0, isExpanded),
          color: e.color || e.fill,
        }))}
      />
    )
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No funding source data available</p>
          <p className="text-helper mt-2">Select at least one metric, or add data with a provider/reporting organisation.</p>
        </div>
      </div>
    )
  }

  // Export rows: provider + one column per selected metric + total.
  const exportRows = rows.map(s => {
    const row: Record<string, unknown> = { "Funding Source": s.name }
    metricCols.forEach(c => { row[c.key] = Math.round(s.perMetric[c.key] || 0) })
    row["Total (USD)"] = Math.round(s.total)
    return row
  })

  // Expanded grouped bar — one bar per selected metric, per provider, so each
  // metric is shown separately. Height grows with provider count.
  const barHeight = Math.max(320, chartData.length * 52)

  return (
    <div className="w-full h-full">
      {/* Calendar + year selector — own row at the top, left-aligned (expanded only). */}
      <ExpandedOnly>
        <div className="mb-4">
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            onDateRangeChange={setDateWindow}
            actualDataRange={actualDataRange}
          />
        </div>
      </ExpandedOnly>

      <ChartToolbarRow
        filters={
          <MetricsMultiSelect
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            availableKeys={FUNDING_METRIC_KEYS}
            triggerClassName="h-8 justify-between min-w-[240px]"
          />
        }
        csv={{ rows: exportRows, title: 'Funding Source Breakdown' }}
      >
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode('chart')}
            title="Chart View"
            aria-label="Chart View"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode('table')}
            title="Table View"
            aria-label="Table View"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </ChartToolbarRow>

      {/* Collapsed: donut of each provider's total (sum of selected metrics),
          filling the card. Expanded: grouped bar disaggregated by metric, or a
          per-metric table. */}
      {!isExpanded ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="total"
              labelLine={false}
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      ) : viewMode === 'chart' ? (
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={formatAxisCurrency} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Legend />
            {metricCols.map(c => (
              <Bar key={c.key} dataKey={c.key} name={c.key} fill={c.color} radius={[0, 3, 3, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartDataTable
          rows={chartData.map(r => ({ ...r, share: totalValue > 0 ? (r.total / totalValue) * 100 : 0 }))}
          columns={[
            {
              key: 'name',
              label: 'Funding Source',
              numeric: false,
              format: (_v, row) => (
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: (row as any).fill }} />
                  <span>{(row as any).name}</span>
                </span>
              ),
            },
            ...metricCols.map(c => ({ key: c.key, label: c.key, numeric: true, currency: 'USD', color: c.color })),
            { key: 'total', label: 'Total', numeric: true, currency: 'USD' },
            { key: 'share', label: 'Share (%)', numeric: true, includeInTotal: false, format: (v: any) => `${(Number(v) || 0).toFixed(1)}%` },
          ]}
          currency="USD"
        />
      )}

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart shows funding by source organisation, disaggregated by the metrics you select (use the metrics
          control). Each source&apos;s bars show the chosen series side by side, e.g. how much a partner has committed
          versus actually disbursed. Transactions and planned disbursements use the reported provider organisation;
          budgets have no provider, so they are attributed to the activity&apos;s reporting organisation. Sources beyond
          the top seven are grouped as Others.
        </p>
      )}
    </div>
  )
}
