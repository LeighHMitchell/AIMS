"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { DistributionChart, type DistHistogramBin, type DistPoint, type DistChartType } from './DistributionChart'
import { ExpandedOnly, useChartExpansion } from '@/lib/chart-expansion-context'
import { InlineViewToggle, InlineCsvButton, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { formatCurrencyCompact } from '@/lib/format'

/**
 * Self-fetching wrapper around DistributionChart for the Outliers tab.
 *
 * In the expanded dialog it renders, top-to-bottom: a left-aligned toolbar
 * (chart/table toggle + CSV + the fence-method controls), the histogram, a
 * plain-language explanation, and a summary strip. The flagged-records TABLE is
 * supplied by the parent card (via `tableView`, using the shared ChartDataTable)
 * and shown when the user toggles to table view — at which point this component
 * hides its own plot so only the controls row remains above the table.
 *
 * Designed to live inside a <CompactChartCard inlineToolbar> which injects the
 * `compact` prop and supplies title / description / ƒ tooltip.
 */

type Metric =
  | 'transaction_value'
  | 'activity_size'
  | 'budget_spend_ratio'
  | 'org_totals'
  | 'sector_totals'

interface OutlierRecord {
  id: string
  label: string
  sublabel?: string
  value: number
  kind: 'high' | 'low' | 'over' | 'under'
  href?: string
}

interface OutliersResponse {
  metric: Metric
  unit: 'usd' | 'ratio'
  scale: 'linear' | 'log10'
  summary: { count: number; min: number; max: number; median: number; mean: number; p25: number; p75: number }
  fences: { lower: number | null; upper: number | null; method: string }
  nonPositiveCount?: number
  bins: DistHistogramBin[]
  points: DistPoint[]
  outliers: OutlierRecord[]
  outlierCount: number
}

interface OutlierChartProps {
  metric: Metric
  /** y-axis + tooltip noun, e.g. "Transactions", "Activities", "Organisations", "Sectors" */
  countLabel: string
  /** statistical method + threshold (defaults: mad, 3.5) */
  method?: 'mad' | 'iqr'
  z?: number
  refreshKey?: number
  onDataChange?: (rows: any[]) => void
  compact?: boolean
}

const KIND_TEXT: Record<OutlierRecord['kind'], string> = {
  high: 'Unusually high',
  low: 'Unusually low',
  over: 'Overspend',
  under: 'Nothing spent',
}

/**
 * Plain-language explanation shown under each chart in the expanded view —
 * what it says, why it's useful, and the jargon (log scale, ratio, fence,
 * DAC sector) translated into everyday terms.
 */
const EXPLANATIONS: Record<Metric, string> = {
  transaction_value:
    "This chart shows the size of every individual payment in the portfolio, sorted into bands from smallest to largest. Aid payments range from a few dollars to tens of millions, so the scale is logarithmic — each step to the right is roughly ten times larger, which keeps the whole range readable at once. Most payments sit in the central cluster; the bars highlighted in red lie far from it. A payment far larger than the rest is often a typo — a missing decimal point or the wrong currency — while one far smaller can be a placeholder. Switch to the table to see each flagged payment and open the activity to check or correct the figure.",
  budget_spend_ratio:
    "This compares how much each activity has actually spent against the budget it set. A value of 1.0× means it spent exactly its budget, 0.5× means half, and 1.5× means 50% over. The bar at 0 is activities that have a budget but no recorded spending yet — either genuinely not started, or missing their transaction data. Anything past 1.2× (more than 120% of budget) is flagged as an overspend or a data-entry error. Use it to find activities that are off-track financially or whose figures need a second look.",
  activity_size:
    "This shows the total amount disbursed by each activity, smallest to largest, on a logarithmic scale (each step right ≈ ten times bigger). It answers 'how big are our activities, really?'. The long tail on the right is your handful of large flagship activities. The note about excluded activities counts the 'empty shells' — activities that are published but have recorded no disbursements at all, which may need attention. Use it to see how concentrated the portfolio is and to find both the giants and the dormant activities.",
  org_totals:
    "This shows the total value committed and disbursed by each funding organisation, smallest to largest, on a logarithmic scale. It answers 'how concentrated is our funding among partners?'. Organisations in the highlighted tail give far more — or far less — than the typical partner. That is useful for spotting dominant donors, or a single mis-attributed payment that has inflated one organisation's total. Switch to the table to see which partners stand out.",
  sector_totals:
    "This shows how disbursements are spread across DAC sectors — the standard international categories for what aid is spent on, such as Health, Education or Agriculture. Each activity's spending is divided among its declared sectors using the percentages set on the activity, then totalled per sector, on a logarithmic scale. Sectors in the highlighted tail absorb far more — or far less — funding than the rest. Use it to see which themes dominate spending and which are comparatively under-funded.",
}

export function OutlierChart({
  metric,
  countLabel,
  method: methodProp = 'mad',
  z: zProp = 3.5,
  refreshKey = 0,
  onDataChange,
  compact = false,
}: OutlierChartProps) {
  const [data, setData] = useState<OutliersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isExpanded = useChartExpansion()
  const tableMode = useChartCardTableMode()
  // Steward-tunable fence settings (initialised from props, overridable in the
  // expanded view). The ratio metric uses a fixed domain rule, so its controls
  // are hidden and these values are ignored server-side.
  const [method, setMethod] = useState<'mad' | 'iqr'>(methodProp)
  const [z, setZ] = useState<number>(zProp)
  const [chartType, setChartType] = useState<DistChartType>('histogram')
  const tunable = metric !== 'budget_spend_ratio'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ metric, method, z: String(z) })
    fetch(`/api/analytics/outliers?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then((json: OutliersResponse) => {
        if (cancelled) return
        setData(json)
        const valueKey = json.unit === 'usd' ? 'Value (USD)' : 'Spend ÷ Budget'
        onDataChange?.(
          json.outliers.map((o) => ({
            Activity: o.label,
            Detail: o.sublabel ?? '',
            Flag: KIND_TEXT[o.kind],
            [valueKey]: json.unit === 'usd' ? Math.round(o.value) : Number(o.value.toFixed(3)),
            'Activity URL': o.href ? new URL(o.href, window.location.origin).toString() : '',
          }))
        )
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // onDataChange intentionally omitted — parent setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, method, z, refreshKey])

  const summaryLine = useMemo(() => {
    if (!data) return ''
    const s = data.summary
    const u = data.unit
    const f = (v: number) => (u === 'ratio' ? `${v.toFixed(2)}×` : formatCurrencyCompact(v))
    const fence = data.fences.upper != null ? ` · flagged beyond ${f(data.fences.upper)}` : ''
    return `n=${s.count.toLocaleString()} · median ${f(s.median)} · max ${f(s.max)}${fence}`
  }, [data])

  const chartBody = loading ? (
    <div className="flex items-center justify-center h-full text-muted-foreground text-body">Loading…</div>
  ) : error ? (
    <div className="flex items-center justify-center h-full text-destructive text-body">{error}</div>
  ) : !data || data.bins.length === 0 ? (
    <div className="flex items-center justify-center h-full text-muted-foreground text-body">No data available</div>
  ) : (
    <DistributionChart
      chartType={chartType}
      bins={data.bins}
      points={data.points}
      summary={data.summary}
      unit={data.unit}
      scale={data.scale}
      fenceUpper={data.fences.upper}
      fenceLower={data.fences.lower}
      countLabel={countLabel}
      compact={compact}
      height={isExpanded ? 360 : undefined}
    />
  )

  const segBtn = (active: boolean) =>
    `px-2.5 py-1 transition-colors ${active ? 'bg-foreground text-background' : 'bg-white text-muted-foreground hover:bg-muted'}`

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — expanded only. Fence-method controls on the LEFT (hidden for
          the fixed-rule ratio metric / table view); chart-table toggle + CSV on
          the RIGHT, matching the rest of the dashboard. */}
      <ExpandedOnly>
        <div className="mb-3 flex items-center justify-between flex-wrap gap-x-4 gap-y-2 text-helper">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {!tableMode && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">View</span>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                {(['histogram', 'box', 'strip'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartType(t)}
                    className={segBtn(chartType === t)}
                    title={t === 'histogram' ? 'Histogram' : t === 'box' ? 'Box plot' : 'Strip / dot plot'}
                  >
                    {t === 'histogram' ? 'Histogram' : t === 'box' ? 'Box' : 'Strip'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tunable && !tableMode && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Method</span>
                <div className="inline-flex rounded-md border border-border overflow-hidden">
                  {(['mad', 'iqr'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={segBtn(method === m)}
                      title={m === 'mad' ? 'Modified z-score (robust)' : 'Tukey IQR fences (1.5×)'}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {method === 'mad' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Threshold |z|</span>
                  <div className="inline-flex rounded-md border border-border overflow-hidden">
                    {[3.0, 3.5, 4.0].map((opt) => (
                      <button key={opt} type="button" onClick={() => setZ(opt)} className={segBtn(z === opt)}
                        title={opt < 3.5 ? 'More sensitive' : opt > 3.5 ? 'Stricter' : 'Standard'}>
                        {opt.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <span className="text-muted-foreground italic">
                {method === 'iqr' ? 'Tukey IQR (1.5×) in log space' : 'Modified z-score (MAD) in log space'}
              </span>
            </>
          )}
          </div>
          <div className="flex items-center gap-2">
            <InlineViewToggle />
            <InlineCsvButton />
          </div>
        </div>
      </ExpandedOnly>

      {/* Histogram — hidden in table mode so only the toolbar sits above the
          card's table. Always shown in the collapsed card and in chart view. */}
      {!tableMode && <div className="flex-1 min-h-0">{chartBody}</div>}

      {/* Summary stats strip */}
      {!tableMode && (
        <div className="mt-1 text-helper text-muted-foreground truncate">
          {summaryLine}
          {data?.nonPositiveCount ? ` · ${data.nonPositiveCount.toLocaleString()} zero/negative excluded` : ''}
        </div>
      )}

      {/* Plain-language explanation — expanded chart view only */}
      {!tableMode && (
        <ExpandedOnly>
          <p className="mt-4 w-full text-body text-muted-foreground leading-relaxed">
            {EXPLANATIONS[metric]}
          </p>
        </ExpandedOnly>
      )}
    </div>
  )
}
