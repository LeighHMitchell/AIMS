"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { BarChart3, Maximize2, Table2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { OrganizationTransactionsTab } from "@/components/organizations/OrganizationTransactionsTab"
import { OrganizationBudgetsTab } from "@/components/organizations/OrganizationBudgetsTab"
import { OrganizationPlannedDisbursementsTab } from "@/components/organizations/OrganizationPlannedDisbursementsTab"
import { OrganizationSpendTrajectoryChart } from "@/components/organizations/OrganizationSpendTrajectoryChart"
import { FinancialTotalsBarChart } from "@/components/analytics/FinancialTotalsBarChart"
import { ChartFullscreen, ChartExpandIconButton } from "@/components/charts/ChartFullscreen"
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import { ChartTooltipCard } from "@/components/ui/chart-tooltip"
import { ChartExpansionProvider, useChartExpansion } from "@/lib/chart-expansion-context"
import { createContext, useContext } from "react"
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_LABELS_PLURAL } from "@/types/transaction"
import { formatAxisCurrency } from "@/lib/format"
import { YearRangeChip } from "@/components/ui/year-range-chip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TYPE_COLORS: Record<string, string> = {
  "1": "#4c5568",
  "2": "#7b95a7",
  "3": "#dc2625",
  "4": "#f59e0b",
  "5": "#22c55e",
  "6": "#0891b2",
  "7": "#a855f7",
  "8": "#ec4899",
  "9": "#14b8a6",
  "10": "#f43f5e",
  "11": "#0ea5e9",
  "12": "#8b5cf6",
  "13": "#06b6d4",
}

// IATI Finance Type buckets (rolled up to grant / loan / equity / guarantee /
// other for the "Grants vs Loans" chart). Codes are taken from the IATI
// FinanceType codelist.
function bucketFinanceType(code: string | null | undefined): string {
  if (!code) return "Unspecified"
  const c = String(code)
  if (c.startsWith("11") || c === "110" || c === "111") return "Grants"
  if (c.startsWith("4") || ["410", "411", "412", "413", "414", "421", "422", "423", "424"].includes(c)) return "Loans"
  if (c.startsWith("5") || ["510", "511", "512", "513", "520"].includes(c)) return "Equity"
  if (c.startsWith("6") || ["610", "611", "612", "613", "620", "630"].includes(c)) return "Guarantees / Insurance"
  return "Other"
}

function compactUsd(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}b`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

// Year filter — shared across every chart on this pane so the selector lives
// inside each chart's expanded modal (rather than once at the top), but
// changing the year range from any chart applies portfolio-wide.
interface OrgYearFilterValue {
  selectedYears: number[]
  onYearsChange: (years: number[]) => void
  yearBounds: { minYear: number; maxYear: number } | null
}
const OrgYearFilterContext = createContext<OrgYearFilterValue | null>(null)

/** Renders the year-range chip top-left of a chart's body — but only when
 *  the chart is in its expanded modal. Inline cards stay clean. */
function ExpandedYearChip() {
  const isExpanded = useChartExpansion()
  const ctx = useContext(OrgYearFilterContext)
  if (!isExpanded || !ctx) return null
  return (
    <div className="flex items-center justify-start mb-3 shrink-0">
      <YearRangeChip
        selectedYears={ctx.selectedYears}
        onYearsChange={ctx.onYearsChange}
        actualDataRange={ctx.yearBounds}
      />
    </div>
  )
}

// Wraps a chart with a header (title + explanatory paragraph) and an expand
// button in the top-right corner. Expand opens a full-screen Dialog with the
// same content.
function ChartCard({
  title,
  description,
  interpretation,
  children,
  className,
}: {
  title: string
  description: string
  /** Longer paragraph shown beneath the chart explaining what it shows,
   *  how to interpret it, and how it informs understanding of the org. */
  interpretation?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card className={`border-border bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col space-y-1.5 min-w-0">
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-body text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setOpen(true)}
          title="Expand chart"
          aria-label="Expand chart"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-w-0">
        <ChartExpansionProvider isExpanded={false}>
          {children}
        </ChartExpansionProvider>
      </div>
      {/* Interpretation is intentionally not shown in the collapsed card —
          it would crowd the grid. It only renders in the expanded dialog
          footer below the chart. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[1400px] w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Override DialogHeader's default `-mx-6 -mt-6` (which assumes
              the parent uses p-6). Our DialogContent uses p-0, so the
              negative margins would shove the header outside the dialog
              bounds. mx-0 mt-0 reset that. */}
          <DialogHeader className="bg-surface-muted border-b border-border px-6 py-4 mx-0 mt-0">
            <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
          {/* Children fill the rest of the dialog — flex-1 + min-h-0 + relative
              gives Recharts an explicit pixel-sized box; absolute inset-0
              inside the chart components ensures the SVG hits 100% height. */}
          <div className="flex-1 min-h-0 px-6 pt-4 pb-6 flex flex-col">
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0">
                <ChartExpansionProvider isExpanded={true}>
                  {children}
                </ChartExpansionProvider>
              </div>
            </div>
          </div>
          <div className="text-body text-muted-foreground leading-relaxed px-6 py-3 border-t border-border bg-surface-muted/40">
            {interpretation || description}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Pull a calendar year from any transaction-shaped record so the year-range
// filter can scope the chart data. Tries transaction_date first, then value_date.
function txYear(t: any): number | null {
  const date = t?.transaction_date || t?.value_date
  if (!date) return null
  const y = new Date(date).getUTCFullYear()
  return Number.isFinite(y) ? y : null
}

export function OrganizationFinancesPane({ organizationId }: { organizationId: string }) {
  // Default to Charts so the user lands on the visual summary; they can
  // toggle to Tables to see the underlying transactions / disbursements.
  const [view, setView] = useState<"tables" | "charts">("charts")

  // Charts share these data fetches so we don't fan out to the same endpoints
  // from each chart card. Lifting them here also lets the dialog (full-screen)
  // render off the same data without remounting the underlying chart.
  const [transactions, setTransactions] = useState<any[] | null>(null)
  const [activities, setActivities] = useState<any[] | null>(null)
  const [envelopes, setEnvelopes] = useState<any[] | null>(null)
  // Year-range selection for the chart filter chip. Empty = no filter (show
  // everything). The chip mutates this on user change.
  const [selectedYears, setSelectedYears] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiFetch(`/api/organizations/${organizationId}/transactions`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      apiFetch(`/api/activities?organization_id=${organizationId}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      apiFetch(`/api/organizations/${organizationId}/funding-envelopes`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([txns, acts, envs]) => {
      if (cancelled) return
      setTransactions(Array.isArray(txns) ? txns : txns?.transactions || [])
      setActivities(Array.isArray(acts) ? acts : acts?.activities || [])
      setEnvelopes(Array.isArray(envs) ? envs : envs?.envelopes || [])
    })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  // Compute the actual data range for the chip's "Data" quick-action, plus
  // pre-filter the data passed to charts. When selectedYears is empty (no
  // filter) we pass the full dataset through.
  const yearBounds = useMemo(() => {
    let minY = Infinity
    let maxY = -Infinity
    transactions?.forEach((t) => {
      const y = txYear(t)
      if (y == null) return
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    })
    envelopes?.forEach((e) => {
      const ys = Number(e?.year_start)
      const ye = Number(e?.year_end ?? ys)
      if (Number.isFinite(ys) && ys < minY) minY = ys
      if (Number.isFinite(ye) && ye > maxY) maxY = ye
    })
    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return null
    return { minYear: minY, maxYear: maxY }
  }, [transactions, envelopes])

  const yearWindow = useMemo(() => {
    if (!selectedYears || selectedYears.length === 0) return null
    const a = selectedYears[0]
    const b = selectedYears[1] ?? a
    return { from: Math.min(a, b), to: Math.max(a, b) }
  }, [selectedYears])

  const filteredTransactions = useMemo(() => {
    if (!transactions || !yearWindow) return transactions
    return transactions.filter((t) => {
      const y = txYear(t)
      return y != null && y >= yearWindow.from && y <= yearWindow.to
    })
  }, [transactions, yearWindow])

  const filteredEnvelopes = useMemo(() => {
    if (!envelopes || !yearWindow) return envelopes
    return envelopes.filter((e) => {
      const ys = Number(e?.year_start)
      const ye = Number(e?.year_end ?? ys)
      // Include envelopes whose span overlaps the selected window.
      return Number.isFinite(ys) && Number.isFinite(ye)
        && ye >= yearWindow.from && ys <= yearWindow.to
    })
  }, [envelopes, yearWindow])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SegmentedControl
          ariaLabel="Switch between tables and charts"
          variant="icon"
          value={view}
          onValueChange={setView}
          options={[
            { value: "tables", label: "Tables", icon: Table2 },
            { value: "charts", label: "Charts", icon: BarChart3 },
          ]}
        />
      </div>

      {/* Tables and Charts are both kept mounted so each child's useEffect
          fires immediately and the tab switch is instant — no skeleton on
          second click. Inactive panel is hidden via CSS, not unmounted. */}
      <div className={view === "tables" ? "m-0 space-y-6" : "hidden"}>
        <Card className="border-border bg-card p-6">
          <div className="mb-4 flex flex-col space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">Transactions</h2>
            <p className="text-body text-muted-foreground">
              Incoming and outgoing financial transactions where this organisation is involved
            </p>
          </div>
          <OrganizationTransactionsTab organizationId={organizationId} />
        </Card>

        <Card className="border-border bg-card p-6">
          <div className="mb-4 flex flex-col space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">Planned Disbursements</h2>
            <p className="text-body text-muted-foreground">
              Scheduled future disbursements across this organisation's portfolio
            </p>
          </div>
          <OrganizationPlannedDisbursementsTab organizationId={organizationId} />
        </Card>

        <Card className="border-border bg-card p-6">
          <div className="mb-4 flex flex-col space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">Budgets</h2>
            <p className="text-body text-muted-foreground">
              Activity budget allocations across this organisation's portfolio
            </p>
          </div>
          <OrganizationBudgetsTab organizationId={organizationId} />
        </Card>
      </div>

      <div className={view === "charts" ? "m-0 space-y-4" : "hidden"}>
        {/* Year-range filter is per-chart now — the selector renders inside
            each chart's expanded modal via <ExpandedYearChip>, not at the
            top of the panel. Charts share state via OrgYearFilterContext so
            picking a range from any one chart still applies portfolio-wide
            to every chart's filtered data. */}
        <OrgYearFilterContext.Provider
          value={{
            selectedYears,
            onYearsChange: setSelectedYears,
            yearBounds,
          }}
        >
        {/* Single 2-column grid for everything. Financial Totals spans both
            columns (it's the headline view + has lots of horizontal data);
            every other chart sits in a single column cell. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Totals — analytics-dashboard chart scoped to this org
              (provider, receiver, or reporting org). Inline view is bare
              chart + expand button; controls only show in the modal. */}
          <ChartFullscreen className="lg:col-span-2">
            {({ isFullscreen, toggle }) => (
              <Card className={cn("border-border bg-card", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
                <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Financial Totals
                      </CardTitle>
                      <CardDescription>
                        Yearly budget, planned, and actual flows
                      </CardDescription>
                    </div>
                    {!isFullscreen && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className={cn(isFullscreen && "flex-1 min-h-0 flex flex-col pt-4")}>
                  {isFullscreen ? (
                    <FinancialTotalsBarChart organizationId={organizationId} fillHeight />
                  ) : (
                    <div className="h-72">
                      <FinancialTotalsBarChart organizationId={organizationId} compact />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </ChartFullscreen>

          <ChartCard
            title="Spend Trajectory"
            description="Cumulative spend trajectory"
            interpretation={
              <>
                <strong>What it shows.</strong> Cumulative actual disbursements over time, plotted against an even-spend baseline that assumes the budget is paid out at a constant rate across the activity life-cycle.
                {" "}<strong>How to read it.</strong> Where the red line sits below the dashed baseline, this organisation is spending more slowly than planned — a flat or shallow line means delivery has stalled. A line that climbs faster than the baseline indicates accelerated execution.
                {" "}<strong>How to apply it.</strong> Use this to gauge delivery health. Persistent under-spend can flag absorption problems, procurement bottlenecks, or context disruption; a sudden jump usually marks a single large disbursement rather than steady-state delivery.
              </>
            }
          >
            {/* compact strips the inner Card + duplicate "Portfolio Spend
                Trajectory" title so the chart can fill the outer ChartCard
                without nested padding eating into the plot area. The
                wrapper renders the year-range chip top-left when this
                chart is expanded — same UI as every other chart on this
                pane. (The chip is purely visual on this chart for now;
                trajectory data is fetched per-org and not filtered.) */}
            <SpendTrajectoryFrame organizationId={organizationId} />
          </ChartCard>
          <FundingOverTimeChart envelopes={filteredEnvelopes} />
          <CommitmentsVsPlannedChart transactions={filteredTransactions} />
          <AllTransactionTypesChart transactions={filteredTransactions} />
          <TransactionTypeByYearChart transactions={filteredTransactions} />
          <GrantsVsLoansChart transactions={filteredTransactions} />
          <LargestActivitiesChart activities={activities} transactions={filteredTransactions} />
        </div>
        </OrgYearFilterContext.Provider>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart components — each receives pre-fetched data. Loading/empty states are
// handled inline so the cards remain visible while data arrives.
// ---------------------------------------------------------------------------

// ChartFrame must live UNDER the ChartExpansionProvider so it reads the
// correct context value at render time. If the conditional were applied in
// the parent chart component (above ChartCard), the JSX would be computed
// before the provider was in scope and isExpanded would always be false.
function ChartFrame({ children }: { children: React.ReactNode }) {
  const isExpanded = useChartExpansion()
  if (!isExpanded) {
    return <div className="h-72 w-full">{children}</div>
  }
  // Expanded: flex column with the year-range chip (only renders when an
  // OrgYearFilterContext is in scope, i.e. on the org-finance pane) sitting
  // top-left, and the chart filling the remaining vertical space.
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <ExpandedYearChip />
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  )
}

/** Same layout as ChartFrame but renders the OrganizationSpendTrajectoryChart
 *  directly. The trajectory chart manages its own data fetch internally so
 *  we just wrap it in the expand-aware shell. */
function SpendTrajectoryFrame({ organizationId }: { organizationId: string }) {
  const isExpanded = useChartExpansion()
  if (!isExpanded) {
    return <OrganizationSpendTrajectoryChart organizationId={organizationId} compact />
  }
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <ExpandedYearChip />
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <OrganizationSpendTrajectoryChart organizationId={organizationId} compact />
        </div>
      </div>
    </div>
  )
}

function ChartLoading({ height = 320 }: { height?: number }) {
  return <div style={{ height }} className="bg-muted/40 rounded animate-pulse" />
}

function ChartEmpty({ message, height = 320 }: { message: string; height?: number }) {
  return (
    <div
      style={{ height }}
      className="rounded border border-dashed border-border flex items-center justify-center text-helper text-muted-foreground"
    >
      {message}
    </div>
  )
}

function FundingOverTimeChart({ envelopes }: { envelopes: any[] | null }) {
  // Aggregate envelope amounts (USD) into a year-by-year bar chart, grouped
  // by status (actual / current / indicative). Multi-year envelopes are split
  // evenly across their span — same approach as the editor's data-view tab.
  const data = useMemo(() => {
    if (!envelopes) return null
    const byYear = new Map<number, { year: string; actual: number; current: number; indicative: number }>()
    for (const env of envelopes) {
      const yStart = Number(env.year_start)
      if (!Number.isFinite(yStart)) continue
      const yEnd = Number(env.year_end ?? yStart)
      const span = Math.max(1, (Number.isFinite(yEnd) ? yEnd : yStart) - yStart + 1)
      const usdTotal = Number(env.amount_usd ?? (env.currency === "USD" ? env.amount : 0))
      if (!Number.isFinite(usdTotal) || usdTotal === 0) continue
      const perYear = usdTotal / span
      for (let y = yStart; y < yStart + span; y++) {
        const row = byYear.get(y) ?? { year: String(y), actual: 0, current: 0, indicative: 0 }
        if (env.status === "actual") row.actual += perYear
        else if (env.status === "current") row.current += perYear
        else row.indicative += perYear
        byYear.set(y, row)
      }
    }
    return Array.from(byYear.values()).sort((a, b) => Number(a.year) - Number(b.year))
  }, [envelopes])

  return (
    <ChartCard
      title="Funding Over Time"
      description="Annual envelopes by status"
      interpretation={
        <>
          <strong>What it shows.</strong> Year-by-year funding envelopes declared by this organisation, stacked into three statuses — actual (past), current (this year) and indicative (forward).
          {" "}<strong>How to read it.</strong> Heights compare absolute scale across years. Tall red (actual) blocks signal a strong delivery track-record; tall grey (indicative) blocks at the right of the chart flag a forward pipeline that hasn't yet been confirmed.
          {" "}<strong>How to apply it.</strong> Use this to size the organisation's commitment to country and to spot signal-vs-noise in their forward plans. A pipeline that's mostly indicative deserves more cautious assumptions than one anchored in current-year actuals.
        </>
      }
    >
      <FundingOverTimeBody data={data} />
    </ChartCard>
  )
}

// Sub-component lives UNDER the ChartExpansionProvider, so useChartExpansion
// returns the right value (false in the in-grid card, true inside the dialog).
function FundingOverTimeBody({ data }: { data: any[] | null }) {
  const isExpanded = useChartExpansion()
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No funding envelope data recorded for this organisation." />
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null
              return (
                <ChartTooltipCard
                  title={`Year ${label}`}
                  rows={payload.map((p: any) => ({
                    label: p.name,
                    value: compactUsd(Number(p.value) || 0),
                    color: p.color,
                  }))}
                />
              )
            }}
          />
          {isExpanded && <Legend />}
          <Bar dataKey="actual" name="Actual" stackId="env" fill="#dc2625" />
          <Bar dataKey="current" name="Current" stackId="env" fill="#7b95a7" />
          <Bar dataKey="indicative" name="Indicative" stackId="env" fill="#cbd5e1" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

function CommitmentsVsPlannedChart({ transactions }: { transactions: any[] | null }) {
  const data = useMemo(() => {
    if (!transactions) return null
    const byYear = new Map<number, { year: string; commitments: number; planned: number }>()
    for (const t of transactions) {
      const date = t.transaction_date || t.value_date
      if (!date) continue
      const year = new Date(date).getUTCFullYear()
      if (!Number.isFinite(year)) continue
      const usd = t.value_usd != null ? Number(t.value_usd) : (t.currency === "USD" ? Number(t.value) : 0)
      if (!Number.isFinite(usd)) continue
      const row = byYear.get(year) ?? { year: String(year), commitments: 0, planned: 0 }
      // 2 = Outgoing Commitment. Planned disbursements live in their own table
      // and the orgs/transactions endpoint returns them via a transaction proxy
      // — there isn't a dedicated planned type code, so we approximate with
      // type 11 (Incoming Commitment) when the org is on the receiving side.
      // For cleaner semantics we only report what the org has *committed* and
      // pair it with planned disbursements when those are surfaced as a type.
      if (String(t.transaction_type) === "2") row.commitments += usd
      if (String(t.transaction_type) === "11") row.planned += usd
      byYear.set(year, row)
    }
    return Array.from(byYear.values()).sort((a, b) => Number(a.year) - Number(b.year))
  }, [transactions])

  return (
    <ChartCard
      title="Commitments vs Planned Disbursements"
      description="Outgoing commitments vs incoming pipeline"
      interpretation={
        <>
          <strong>What it shows.</strong> Annual outgoing commitments this organisation has made to others (paying out), set alongside incoming commitments that fund its work (the pipeline coming in).
          {" "}<strong>How to read it.</strong> A wide gap between outgoing and incoming in the same year indicates a structural mismatch — either spending ahead of new funding, or sitting on undeployed pipeline.
          {" "}<strong>How to apply it.</strong> Use this to assess the org's funding momentum. Healthy patterns show outgoing tracking close to incoming with a sustainable lag; volatile years suggest concentration risk in a few large agreements.
        </>
      }
    >
      <CommitmentsVsPlannedBody data={data} />
    </ChartCard>
  )
}

function CommitmentsVsPlannedBody({ data }: { data: any[] | null }) {
  const isExpanded = useChartExpansion()
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No commitment or planned disbursement data." />
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null
              return (
                <ChartTooltipCard
                  title={`Year ${label}`}
                  rows={payload.map((p: any) => ({
                    label: p.name,
                    value: compactUsd(Number(p.value) || 0),
                    color: p.color,
                  }))}
                />
              )
            }}
          />
          {isExpanded && <Legend />}
          <Bar dataKey="commitments" name="Outgoing Commitments" fill="#4c5568" />
          <Bar dataKey="planned" name="Incoming Commitments / Pipeline" fill="#7b95a7" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

function AllTransactionTypesChart({ transactions }: { transactions: any[] | null }) {
  const data = useMemo(() => {
    if (!transactions) return null
    const totals: Record<string, number> = {}
    for (const t of transactions) {
      const type = String(t.transaction_type ?? "")
      if (!type) continue
      const usd = t.value_usd != null ? Number(t.value_usd) : (t.currency === "USD" ? Number(t.value) : 0)
      if (!Number.isFinite(usd)) continue
      totals[type] = (totals[type] ?? 0) + usd
    }
    return Object.entries(totals)
      .map(([type, total]) => ({
        name: TRANSACTION_TYPE_LABELS_PLURAL[type as keyof typeof TRANSACTION_TYPE_LABELS_PLURAL] ?? type,
        type,
        value: total,
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  return (
    <ChartCard
      title="All Transaction Types"
      description="USD totals by transaction type"
      interpretation={
        <>
          <strong>What it shows.</strong> Total USD value broken down by every IATI transaction type the organisation has reported — incoming funds, commitments, disbursements, expenditures, pledges and beyond.
          {" "}<strong>How to read it.</strong> Length compares dollar weight across types. A long Disbursements bar with a short Commitments bar means most reported activity is delivery, while the inverse signals an org that promises more than it pays.
          {" "}<strong>How to apply it.</strong> Use this to characterise the organisation's reporting style and financial role — whether it primarily funds others, receives funds, or operates as both donor and channel.
        </>
      }
    >
      <AllTransactionTypesBody data={data} />
    </ChartCard>
  )
}

function AllTransactionTypesBody({ data }: { data: any[] | null }) {
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No transactions to summarise." />
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload
              return (
                <ChartTooltipCard
                  title={row.name}
                  rows={[{ label: 'Total', value: compactUsd(Number(row.value) || 0), color: TYPE_COLORS[row.type] ?? '#94a3b8' }]}
                />
              )
            }}
          />
          <Bar dataKey="value">
            {data.map((d) => (
              <Cell key={d.type} fill={TYPE_COLORS[d.type] ?? "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

function TransactionTypeByYearChart({ transactions }: { transactions: any[] | null }) {
  const { data, types } = useMemo(() => {
    if (!transactions) return { data: null as any[] | null, types: [] as string[] }
    const focusTypes = ["1", "2", "3", "4"]
    const byYear = new Map<number, Record<string, number>>()
    for (const t of transactions) {
      const date = t.transaction_date || t.value_date
      if (!date) continue
      const year = new Date(date).getUTCFullYear()
      if (!Number.isFinite(year)) continue
      const type = String(t.transaction_type ?? "")
      if (!focusTypes.includes(type)) continue
      const usd = t.value_usd != null ? Number(t.value_usd) : (t.currency === "USD" ? Number(t.value) : 0)
      if (!Number.isFinite(usd)) continue
      const row = byYear.get(year) ?? Object.fromEntries(focusTypes.map((tp) => [tp, 0]))
      row[type] = (row[type] ?? 0) + usd
      byYear.set(year, row)
    }
    const sorted = Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, vals]) => ({ year: String(year), ...vals }))
    return { data: sorted, types: focusTypes }
  }, [transactions])

  return (
    <ChartCard
      title="Transactions by Year"
      description="Yearly breakdown by transaction type"
      interpretation={
        <>
          <strong>What it shows.</strong> Annual breakdown of incoming funds, outgoing commitments, disbursements and expenditures — the four IATI types that drive most financial reporting.
          {" "}<strong>How to read it.</strong> Look for trends across years. Rising disbursements indicate accelerating delivery; a peak in commitments without matching disbursements signals an upcoming pipeline that hasn't yet flowed.
          {" "}<strong>How to apply it.</strong> Use this to compare delivery rhythm year-on-year. Big swings can reflect a shifting portfolio (new programmes starting, old ones closing) or external shocks affecting absorption capacity.
        </>
      }
    >
      <TransactionTypeByYearBody data={data} types={types} />
    </ChartCard>
  )
}

function TransactionTypeByYearBody({ data, types }: { data: any[] | null; types: string[] }) {
  const isExpanded = useChartExpansion()
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No transactions recorded for this organisation." />
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null
              return (
                <ChartTooltipCard
                  title={`Year ${label}`}
                  rows={payload.map((p: any) => ({
                    label: p.name,
                    value: compactUsd(Number(p.value) || 0),
                    color: p.color,
                  }))}
                />
              )
            }}
          />
          {isExpanded && <Legend />}
          {types.map((tp) => (
            <Bar
              key={tp}
              dataKey={tp}
              name={TRANSACTION_TYPE_LABELS_PLURAL[tp as keyof typeof TRANSACTION_TYPE_LABELS_PLURAL] ?? tp}
              fill={TYPE_COLORS[tp] ?? "#94a3b8"}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

function GrantsVsLoansChart({ transactions }: { transactions: any[] | null }) {
  const data = useMemo(() => {
    if (!transactions) return null
    const totals: Record<string, number> = {}
    for (const t of transactions) {
      // Only outgoing money: disbursements (3), commitments (2), expenditures (4).
      const type = String(t.transaction_type ?? "")
      if (!["2", "3", "4"].includes(type)) continue
      const usd = t.value_usd != null ? Number(t.value_usd) : (t.currency === "USD" ? Number(t.value) : 0)
      if (!Number.isFinite(usd) || usd === 0) continue
      const bucket = bucketFinanceType(t.finance_type)
      totals[bucket] = (totals[bucket] ?? 0) + usd
    }
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  return (
    <ChartCard
      title="Grants vs Loans"
      description="Outgoing finance by instrument"
      interpretation={
        <>
          <strong>What it shows.</strong> Outgoing finance grouped by IATI finance-type buckets — grants, loans, equity, guarantees / insurance, and other.
          {" "}<strong>How to read it.</strong> Slice size compares dollar share of each instrument. A grant-heavy mix indicates concessional support; a loan-heavy mix signals market or near-market financing terms.
          {" "}<strong>How to apply it.</strong> Use this to understand the financial concessionality of the organisation's support — recipients of grants face no repayment burden, while loan recipients carry future debt-service obligations that change project economics.
        </>
      }
    >
      <GrantsVsLoansBody data={data} />
    </ChartCard>
  )
}

function GrantsVsLoansBody({ data }: { data: { name: string; value: number }[] | null }) {
  const isExpanded = useChartExpansion()
  // Brand palette — matches the activity profile's Aid Modality Mix.
  const colors: Record<string, string> = {
    Grants: "#dc2625",
    Loans: "#4c5568",
    Equity: "#7b95a7",
    "Guarantees / Insurance": "#cfd0d5",
    Other: "#94a3b8",
    Unspecified: "#e2e8f0",
  }
  const total = (data ?? []).reduce((sum, d) => sum + d.value, 0)
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No outgoing transactions with finance types recorded." />
  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={isExpanded ? "75%" : 100}
            innerRadius={isExpanded ? "45%" : 55}
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={colors[d.name] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null
              const entry = payload[0]
              const value = Number(entry.value) || 0
              const pct = total > 0 ? (value / total) * 100 : 0
              return (
                <ChartTooltipCard
                  title={entry.name}
                  rows={[{
                    label: 'Total',
                    value: compactUsd(value),
                    color: entry.payload?.fill || colors[entry.name],
                    extra: `${pct.toFixed(1)}%`,
                  }]}
                />
              )
            }}
          />
          {isExpanded && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

// Mode = which financial value the bars represent. Each option pins the
// chart to a single explicit data source so users never confuse a budget
// total with a disbursement total. "outgoing" sums commitments +
// disbursements + expenditures (the previous default behaviour, but now
// labelled). "budget" reads from the activity row's pre-computed budget
// total — never silently substituted in as a fallback.
type LargestActivitiesMode =
  | "budget"
  | "plannedDisbursement"
  | "disbursement"
  | "commitment"
  | "expenditure"
  | "outgoing"

const LARGEST_ACTIVITIES_MODES: { value: LargestActivitiesMode; label: string; description: string; code: string }[] = [
  // Forward-looking measures first — these answer "what was the activity
  // sized for", which is the most natural starting point on a portfolio
  // ranking. Realised flows follow underneath.
  { value: "budget", label: "Total Budget", description: "Activity total budget (separate from any transactions)", code: "B" },
  { value: "plannedDisbursement", label: "Total Planned Disbursements", description: "Sum of planned disbursement amounts on the activity", code: "P" },
  { value: "disbursement", label: "Disbursements", description: "Sum of disbursement transactions (type 3)", code: "3" },
  { value: "commitment", label: "Commitments", description: "Sum of outgoing commitment transactions (type 2)", code: "2" },
  { value: "expenditure", label: "Expenditures", description: "Sum of expenditure transactions (type 4)", code: "4" },
  { value: "outgoing", label: "Total Outgoing", description: "Commitments + disbursements + expenditures combined", code: "Σ" },
]

function LargestActivitiesChart({
  activities,
  transactions,
}: {
  activities: any[] | null
  transactions: any[] | null
}) {
  const [mode, setMode] = useState<LargestActivitiesMode>("disbursement")

  const data = useMemo(() => {
    if (!activities) return null

    // Build an activity-id → display label map. Prefer an acronym when
    // available (shorter / easier to read on horizontal bars); fall back to
    // the full title or IATI identifier when no acronym is set.
    const labelByActivityId = new Map<string, { label: string; full: string }>()
    activities.forEach((a) => {
      const id = a.id || a.activity_id
      const acronym = a.acronym || a.acronym_name || a.short_name
      const full = a.title_narrative || a.title || a.iati_identifier || 'Untitled'
      if (id) {
        labelByActivityId.set(String(id), {
          label: (acronym && String(acronym).trim()) ? String(acronym).trim() : full,
          full,
        })
      }
    })

    // Pick which transaction types contribute, based on the mode. The
    // "budget" and "plannedDisbursement" modes bypass transactions
    // entirely and read from the activity row's pre-computed totals
    // (`totalPlannedBudgetUSD` / `totalPlannedDisbursementsUSD`).
    const allowedTypes: string[] | null =
      mode === "disbursement" ? ["3"]
      : mode === "commitment" ? ["2"]
      : mode === "expenditure" ? ["4"]
      : mode === "outgoing" ? ["2", "3", "4"]
      : null // budget / plannedDisbursement — no transaction filter

    const totalByActivityId = new Map<string, number>()
    if (allowedTypes) {
      transactions?.forEach((t: any) => {
        const id = t.activity_id ? String(t.activity_id) : null
        if (!id) return
        const type = String(t.transaction_type ?? '')
        if (!allowedTypes.includes(type)) return
        const usd = t.value_usd != null ? Number(t.value_usd)
          : (t.currency === 'USD' && t.value != null ? Number(t.value) : 0)
        if (!Number.isFinite(usd) || usd <= 0) return
        totalByActivityId.set(id, (totalByActivityId.get(id) || 0) + usd)
      })
    }

    const rows = activities
      .map((a) => {
        const id = String(a.id || a.activity_id || '')
        // No silent fallback: each mode reads from exactly one source. The
        // activities endpoint surfaces budget totals as `totalPlannedBudgetUSD`
        // (see /api/activities GET), so prefer that and fall through to a few
        // historical aliases for safety.
        let value = 0
        if (mode === "budget") {
          value = Number(
            a.totalPlannedBudgetUSD
              ?? a.totalBudget
              ?? a.total_budget
              ?? a.total_planned_budget_usd
              ?? 0,
          )
        } else if (mode === "plannedDisbursement") {
          value = Number(
            a.totalPlannedDisbursementsUSD
              ?? a.totalPlannedDisbursements
              ?? a.total_planned_disbursements_usd
              ?? 0,
          )
        } else {
          value = totalByActivityId.get(id) || 0
        }
        const stored = labelByActivityId.get(id)
        const label = stored?.label
          || (a.acronym && String(a.acronym).trim()) || a.title_narrative || a.title || 'Untitled'
        const full = stored?.full || a.title_narrative || a.title || a.iati_identifier || 'Untitled'
        return { label, full, value }
      })
      .filter((r) => Number.isFinite(r.value) && r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    return rows
  }, [activities, transactions, mode])

  const modeLabel = LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)?.label ?? mode

  return (
    <ChartCard
      title="Largest Activities"
      description={`Top 10 activities by ${modeLabel.toLowerCase()}`}
      interpretation={
        <>
          <strong>What it shows.</strong> The ten activities with the highest value for the selected basis. Use the dropdown to switch between disbursements (actual money out), commitments (money pledged), expenditures, total outgoing (a sum of those three), or total budget. Each mode reads from a single explicit data source — no silent substitution.
          {" "}<strong>How to read it.</strong> Bars are sorted longest-to-shortest, so the top-ranked activity dominates the portfolio under the chosen basis. A long-tail distribution (one or two large bars then a steep drop) signals concentration risk.
          {" "}<strong>How to apply it.</strong> Compare modes to spot mismatches: an activity with high commitments but low disbursements may be slow to deliver; a high budget but low transactions could indicate a recently-started or paused programme.
        </>
      }
    >
      <LargestActivitiesBody data={data} mode={mode} setMode={setMode} />
    </ChartCard>
  )
}

function LargestActivitiesBody({
  data,
  mode,
  setMode,
}: {
  data: any[] | null
  mode: LargestActivitiesMode
  setMode: (m: LargestActivitiesMode) => void
}) {
  const isExpanded = useChartExpansion()
  const currentMode = LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)
  return (
    <div className={cn(isExpanded ? "h-full flex flex-col gap-3 min-h-0" : "space-y-3")}>
      {/* Year-range chip on the left, mode picker on the right — both only
          render in the expanded modal. Inline cards stay chart-only. */}
      {isExpanded && (
        <div className="flex items-center gap-2 shrink-0">
          <ExpandedYearChip />
          <div className="ml-auto">
          <Select value={mode} onValueChange={(v) => setMode(v as LargestActivitiesMode)}>
            <SelectTrigger className="h-8 w-auto min-w-[260px] text-body">
              <SelectValue>
                {currentMode && (
                  <span className="flex items-center gap-2">
                    <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono min-w-[24px] text-center">
                      {currentMode.code}
                    </code>
                    <span className="text-foreground">{currentMode.label}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LARGEST_ACTIVITIES_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono min-w-[24px] text-center">
                      {m.code}
                    </code>
                    <span className="font-medium">{m.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      )}
      {data === null ? (
        <ChartLoading />
      ) : data.length === 0 ? (
        <ChartEmpty message={`No ${LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)?.label.toLowerCase()} data found.`} />
      ) : (
        <div className={cn(isExpanded ? "flex-1 min-h-0 relative" : "h-80 w-full")}>
          <div className={isExpanded ? "absolute inset-0" : "h-full w-full"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={180}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => (v && v.length > 28 ? `${v.slice(0, 28)}…` : v)}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload
                  const label = LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)?.label ?? "Total"
                  return (
                    <ChartTooltipCard
                      title={row.full || row.label}
                      rows={[{ label, value: compactUsd(Number(row.value) || 0), color: '#dc2625' }]}
                    />
                  )
                }}
              />
              <Bar dataKey="value" fill="#dc2625" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}


// Re-export labels in case future charts need them locally.
export { TRANSACTION_TYPE_LABELS }
