"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { BarChart3, Maximize2, Table2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown } from "lucide-react"
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
import {
  OrganizationFundingFlowsSankey,
  FUNDING_FLOW_TYPE_COLOR,
  FUNDING_FLOW_ALL_TYPES,
  isIncomingType,
  isOutgoingType,
} from "@/components/profile/OrganizationFundingFlowsSankey"
import { ChartFullscreen, ChartExpandIconButton } from "@/components/charts/ChartFullscreen"
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FormulaTooltip } from "@/components/ui/formula-tooltip"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import { ChartTooltipCard } from "@/components/ui/chart-tooltip"
import { ChartExpansionProvider, useChartExpansion } from "@/lib/chart-expansion-context"
import { createContext, useContext } from "react"
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_LABELS_PLURAL } from "@/types/transaction"
import { formatAxisCurrency } from "@/lib/format"
import { YearRangeChip } from "@/components/ui/year-range-chip"
import { type CustomYear as CustomYearType, getCustomYearLabel as getCustomYearLabelFromCtx, pickDefaultCalendarYearId } from "@/types/custom-years"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TRANSACTION_TYPE_COLORS, getTransactionTypeColor } from "@/lib/chart-colors"
import FINANCE_TYPES_DATA from "@/data/finance-types.json"

// Transaction-type colours delegate to the single source of truth so this
// pane matches every other transaction-type chart in the app.
const TYPE_COLORS: Record<string, string> = { ...TRANSACTION_TYPE_COLORS }

// IATI Finance Type codelist lookups (code → name / modality group), used by
// the Aid Modality Mix chart so each slice reads e.g. "110 Standard grant".
const FINANCE_TYPE_NAME: Record<string, string> = Object.fromEntries(
  (FINANCE_TYPES_DATA as Array<{ code: string; name: string }>).map((d) => [String(d.code), d.name]),
)
const FINANCE_TYPE_GROUP: Record<string, string> = Object.fromEntries(
  (FINANCE_TYPES_DATA as Array<{ code: string; group?: string }>).map((d) => [String(d.code), d.group ?? ""]),
)
function financeTypeLabel(code: string): string {
  if (!code) return "Unspecified"
  const name = FINANCE_TYPE_NAME[code]
  return name ? `${code} ${name}` : code
}
// Colour each finance type by its modality group so grants share a hue, loans
// another, etc. — preserving the at-a-glance modality read.
function financeTypeColor(code: string): string {
  const g = FINANCE_TYPE_GROUP[code] || ""
  if (/grant/i.test(g)) return "#dc2625"
  if (/loan|debt/i.test(g)) return "#4c5568"
  if (/equity|investment|securit/i.test(g)) return "#7b95a7"
  if (/guarantee|insurance/i.test(g)) return "#cfd0d5"
  return "#94a3b8"
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
// changing the year range from any chart applies portfolio-wide. Also
// surfaces `calendarType` + `customYears` so the chart axes can render
// year labels in the user's chosen calendar format (e.g. CY2024 / FY24/25).
interface OrgYearFilterValue {
  selectedYears: number[]
  onYearsChange: (years: number[]) => void
  yearBounds: { minYear: number; maxYear: number } | null
  customYears: CustomYearType[]
  calendarType: string
  onCalendarTypeChange: (id: string) => void
}
const OrgYearFilterContext = createContext<OrgYearFilterValue | null>(null)

/** Format a calendar-year number for axis labels using the org-pane's
 *  selected calendar type. Falls back to the bare year when no provider
 *  is in scope (e.g. shared chart used elsewhere). */
function useOrgYearLabel(): (year: number) => string {
  const ctx = useContext(OrgYearFilterContext)
  return (year: number) => {
    if (!ctx) return String(year)
    const cy = ctx.customYears.find((c) => c.id === ctx.calendarType)
    return cy ? getCustomYearLabelFromCtx(cy, year) : String(year)
  }
}

/** Renders the year-range chip top-left of a chart's body — but only when
 *  the chart is in its expanded modal. Inline cards stay clean. Returns
 *  just the chip element so the caller can position it inside a shared
 *  toolbar row alongside other controls (e.g. chart/table toggle). */
function ExpandedYearChip() {
  const isExpanded = useChartExpansion()
  const ctx = useContext(OrgYearFilterContext)
  if (!isExpanded || !ctx) return null
  return (
    <YearRangeChip
      selectedYears={ctx.selectedYears}
      onYearsChange={ctx.onYearsChange}
      actualDataRange={ctx.yearBounds}
      customYears={ctx.customYears}
      calendarType={ctx.calendarType}
      onCalendarTypeChange={ctx.onCalendarTypeChange}
    />
  )
}

/** Shared chart/table view toggle — renders only when the chart is in its
 *  expanded modal. Caller owns the `view` state. */
function ChartTableToggle({
  view,
  setView,
}: {
  view: "chart" | "table"
  setView: (v: "chart" | "table") => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setView("chart")}
        className={cn(
          "h-8 w-8",
          view === "chart"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        title="Chart"
        aria-label="Chart view"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setView("table")}
        className={cn(
          "h-8 w-8",
          view === "table"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        title="Table"
        aria-label="Table view"
      >
        <Table2 className="h-4 w-4" />
      </Button>
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
  mathTooltip,
  children,
  className,
}: {
  title: string
  description: string
  /** Longer paragraph shown beneath the chart explaining what it shows,
   *  how to interpret it, and how it informs understanding of the org. */
  interpretation?: React.ReactNode
  /** Math-only explanation of how the chart's numbers are calculated.
   *  Renders the same ƒ box used on the Analytics Dashboard. */
  mathTooltip?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card className={`bg-card p-6 ${className ?? ""}`}>
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
        <div className="flex items-center gap-1 shrink-0">
          {mathTooltip && <FormulaTooltip content={mathTooltip} size="sm" />}
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
        <DialogContent
          chart
          className="max-w-[1400px] w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
          // Don't auto-focus the first focusable element on open — that lands
          // on the ƒ (formula) button in the header, and Radix tooltips open
          // on focus, so the calculation box would pop open by default.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Override DialogHeader's default `-mx-6 -mt-6` (which assumes
              the parent uses p-6). Our DialogContent uses p-0, so the
              negative margins would shove the header outside the dialog
              bounds. mx-0 mt-0 reset that. */}
          <DialogHeader className="bg-surface-muted border-b border-border px-6 py-4 mx-0 mt-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
                <DialogDescription className="text-body text-muted-foreground">
                  {description}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {mathTooltip && <FormulaTooltip content={mathTooltip} size="md" />}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setOpen(false)}
                  title="Close"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
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

export function OrganizationFinancesPane({
  organizationId,
  organizationName = "This organisation",
  organizationAcronym = "",
}: {
  organizationId: string
  /** Display name used as the centre node of the Funding Flows sankey. Falls
   *  back to a generic label when the caller doesn't provide it. */
  organizationName?: string
  /** Acronym for the centre node so it matches the counterparty labels. */
  organizationAcronym?: string
}) {
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
  // Custom-year (calendar) state lifted to the parent so every chart's
  // year axis can use the same calendar format (e.g. CY2024 / FY24/25)
  // selected via the YearRangeChip in any one chart's expanded modal.
  const [customYears, setCustomYears] = useState<CustomYearType[]>([])
  const [calendarType, setCalendarType] = useState<string>("")

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

  // Fetch the custom-year config once on mount and pick the system default
  // (or the first entry) so the shared calendarType has a sensible value.
  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/custom-years`)
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (cancelled || !result) return
        const years: CustomYearType[] = result.data || []
        setCustomYears(years)
        if (!calendarType) {
          // Default to the Gregorian Calendar Year regardless of the DB default.
          const defaultId = pickDefaultCalendarYearId(years, result.defaultId)
          if (defaultId) setCalendarType(defaultId)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            { value: "charts", label: "Charts", icon: BarChart3 },
            { value: "tables", label: "Tables", icon: Table2 },
          ]}
        />
      </div>

      {/* Tables and Charts are both kept mounted so each child's useEffect
          fires immediately and the tab switch is instant — no skeleton on
          second click. Inactive panel is hidden via CSS, not unmounted. */}
      <div className={view === "tables" ? "m-0 space-y-6" : "hidden"}>
        <Card className="bg-card p-6">
          <div className="mb-4 flex flex-col space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">Transactions</h2>
            <p className="text-body text-muted-foreground">
              Incoming and outgoing financial transactions where this organisation is involved
            </p>
          </div>
          <OrganizationTransactionsTab organizationId={organizationId} />
        </Card>

        <Card className="bg-card p-6">
          <div className="mb-4 flex flex-col space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">Planned Disbursements</h2>
            <p className="text-body text-muted-foreground">
              Scheduled future disbursements across this organisation's portfolio
            </p>
          </div>
          <OrganizationPlannedDisbursementsTab organizationId={organizationId} />
        </Card>

        <Card className="bg-card p-6">
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
            customYears,
            calendarType,
            onCalendarTypeChange: setCalendarType,
          }}
        >
        {/* Single 2-column grid for everything. Financial Totals spans both
            columns (it's the headline view + has lots of horizontal data);
            every other chart sits in a single column cell. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Totals — analytics-dashboard chart scoped to this org
              (provider, receiver, or reporting org). Inline view is bare
              chart + expand button; controls only show in the modal. */}
          <ChartFullscreen>
            {({ isFullscreen, toggle }) => (
              <Card className={cn("bg-card", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <FormulaTooltip
                        content="Sums all actual transactions (Commitments, Disbursements, Expenditures, etc.) by reporting year, alongside published activity budgets and planned disbursements. Multi-year budgets and planned disbursements that span the boundary are split proportionally by overlap days. All values use USD-converted amounts where available."
                        size={isFullscreen ? 'md' : 'sm'}
                      />
                      <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
                    </div>
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

          {/* Funding Flows Sankey — full-width band that visualises money
              moving INTO the org from upstream funders on the left, and OUT
              to downstream partners on the right. Default selection covers
              actual money movement (Incoming Funds + Disbursement); the
              expanded modal exposes a transaction-type multi-select that
              re-colours and re-weights every band. */}
          <FundingFlowsSankeyChart
            organizationId={organizationId}
            organizationName={organizationName}
            organizationAcronym={organizationAcronym}
            transactions={filteredTransactions}
          />

          <ChartCard
            title="Spend Trajectory"
            description="Actual vs perfect cumulative disbursement"
            mathTooltip="Builds an even-spend baseline by spreading the organisation's total budget evenly across its activity life-cycle, then plots it against the actual cumulative disbursement curve over the same horizon. The gap between the two lines is the pace of execution against plan. All amounts are USD-converted."
            interpretation={
              <>
                Cumulative actual disbursements over time, plotted against an even-spend baseline that assumes the budget is paid out at a constant rate across the activity life-cycle. Where the red line sits below the dashed baseline, this organisation is spending more slowly than planned — a flat or shallow line means delivery has stalled, while a line climbing faster than the baseline indicates accelerated execution. The gap is a quick read on delivery health: persistent under-spend can flag absorption problems, procurement bottlenecks, or context disruption, while a sudden jump usually marks a single large disbursement rather than steady-state delivery.
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
function ChartFrame({
  children,
  controls,
  tableMode = false,
}: {
  children: React.ReactNode
  /** Extra toolbar items rendered top-right of the expanded chart (e.g. a
   *  chart/table view toggle). Inline cards never render these. */
  controls?: React.ReactNode
  /** When true the chart slot becomes a normal scrolling block instead of
   *  the absolute-positioned fill — needed for table content because the
   *  rows determine their own height. */
  tableMode?: boolean
}) {
  const isExpanded = useChartExpansion()
  if (!isExpanded) {
    return <div className="h-72 w-full">{children}</div>
  }
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <ExpandedYearChip />
        {controls && <div className="ml-auto">{controls}</div>}
      </div>
      {tableMode ? (
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0">{children}</div>
        </div>
      )}
    </div>
  )
}

/** Same layout as ChartFrame but renders the OrganizationSpendTrajectoryChart
 *  directly. The trajectory chart manages its own data fetch internally so
 *  we just wrap it in the expand-aware shell. */
function SpendTrajectoryFrame({ organizationId }: { organizationId: string }) {
  const isExpanded = useChartExpansion()
  const [view, setView] = useState<"chart" | "table">("chart")
  if (!isExpanded) {
    return <OrganizationSpendTrajectoryChart organizationId={organizationId} compact />
  }
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <ExpandedYearChip />
        <div className="ml-auto">
          <ChartTableToggle view={view} setView={setView} />
        </div>
      </div>
      {view === "table" ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <OrganizationSpendTrajectoryChart
            organizationId={organizationId}
            compact
            viewModeOverride="table"
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0">
            <OrganizationSpendTrajectoryChart
              organizationId={organizationId}
              compact
              viewModeOverride="chart"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Funding Flows — Sankey of money in / money out, with a transaction-type
// multi-select that only appears in the expanded modal.
// ---------------------------------------------------------------------------

// Default to actual-money codes (Incoming Funds + Disbursement) — those are
// the only two flows that represent real cash movement, so the inline card
// stays meaningful even before the user opens the type filter.
const FUNDING_FLOWS_DEFAULT_TYPES = ["1", "3"]

function FundingFlowsSankeyChart({
  organizationId,
  organizationName,
  organizationAcronym,
  transactions,
  className,
}: {
  organizationId: string
  organizationName: string
  organizationAcronym?: string
  transactions: any[] | null
  className?: string
}) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(FUNDING_FLOWS_DEFAULT_TYPES)
  return (
    <ChartCard
      title="Funding Flows"
      description="Money in (from funders) and out (to partners)"
      mathTooltip="Sums USD-converted transaction values for each counterparty paired with this organisation: incoming flows (from upstream funders) sit on the left, outgoing flows (to downstream partners) on the right. Band width is proportional to the total USD for that pair and transaction type. Transactions with no stored USD conversion are excluded rather than counted as USD."
      interpretation={
        <>
          Each band shows a flow of money between this organisation and a counterparty: incoming flows on the left come from upstream funders, outgoing flows on the right go to downstream partners. Band width is proportional to the total US-dollar value of the transactions for that pair, and the colour identifies the IATI transaction type. Use the transaction-type dropdown in the top-right of the expanded view to switch between actual money movement (Incoming Funds + Disbursement), commitments (Outgoing Commitments), or pledges; the same partner can appear with multiple bands if they participate across more than one type. Bands missing a stored USD conversion contribute nothing — non-USD transactions without an exchange rate are excluded rather than counted as USD.
        </>
      }
      className={className}
    >
      <FundingFlowsFrame
        organizationId={organizationId}
        organizationName={organizationName}
        organizationAcronym={organizationAcronym}
        transactions={transactions}
        selectedTypes={selectedTypes}
        onSelectedTypesChange={setSelectedTypes}
      />
    </ChartCard>
  )
}

function FundingFlowsFrame({
  organizationId,
  organizationName,
  organizationAcronym,
  transactions,
  selectedTypes,
  onSelectedTypesChange,
}: {
  organizationId: string
  organizationName: string
  organizationAcronym?: string
  transactions: any[] | null
  selectedTypes: string[]
  onSelectedTypesChange: (next: string[]) => void
}) {
  const isExpanded = useChartExpansion()

  if (!isExpanded) {
    return (
      <div className="h-72 w-full">
        <OrganizationFundingFlowsSankey
          organizationId={organizationId}
          organizationName={organizationName}
          organizationAcronym={organizationAcronym}
          transactions={transactions}
          selectedTypes={selectedTypes}
          expanded={false}
        />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <ExpandedYearChip />
        <div className="ml-auto">
          <FundingFlowsTypeFilter
            selectedTypes={selectedTypes}
            onChange={onSelectedTypesChange}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <OrganizationFundingFlowsSankey
            organizationId={organizationId}
            organizationName={organizationName}
            organizationAcronym={organizationAcronym}
            transactions={transactions}
            selectedTypes={selectedTypes}
            expanded
          />
        </div>
      </div>
    </div>
  )
}

function FundingFlowsTypeFilter({
  selectedTypes,
  onChange,
}: {
  selectedTypes: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (code: string) => {
    if (selectedTypes.includes(code)) {
      // Unchecking the last type is allowed — the empty state is recoverable
      // via the "Select all" action in the dropdown header.
      onChange(selectedTypes.filter((c) => c !== code))
    } else {
      onChange([...selectedTypes, code])
    }
  }

  const total = FUNDING_FLOW_ALL_TYPES.length
  const allSelected = selectedTypes.length === total
  // Trigger label mirrors the app's metric multi-selects ("Finance Types (2/2)").
  const label = allSelected
    ? "All Transaction Types"
    : selectedTypes.length === 1
      ? TRANSACTION_TYPE_LABELS_PLURAL[selectedTypes[0] as keyof typeof TRANSACTION_TYPE_LABELS_PLURAL] || "1 type"
      : "Transaction Types"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 min-w-[220px] justify-between gap-2">
          <span className="truncate text-body">
            {label} ({selectedTypes.length}/{total})
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[300px] max-h-[400px] overflow-y-auto p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border mb-1">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <span className="text-helper font-semibold text-foreground">Transaction Types</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onChange([...FUNDING_FLOW_ALL_TYPES])}
                disabled={allSelected}
                className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Select all
              </button>
              <span className="text-muted-foreground/40">·</span>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={selectedTypes.length === 0}
                className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        <div className="px-2 py-1 text-helper text-muted-foreground font-medium">Incoming</div>
        {FUNDING_FLOW_ALL_TYPES.filter(isIncomingType).map((code) => (
          <FundingFlowsTypeCheckbox
            key={code}
            code={code}
            checked={selectedTypes.includes(code)}
            onToggle={() => toggle(code)}
          />
        ))}
        <div className="my-1 h-px bg-border" />
        <div className="px-2 py-1 text-helper text-muted-foreground font-medium">Outgoing</div>
        {FUNDING_FLOW_ALL_TYPES.filter(isOutgoingType).map((code) => (
          <FundingFlowsTypeCheckbox
            key={code}
            code={code}
            checked={selectedTypes.includes(code)}
            onToggle={() => toggle(code)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FundingFlowsTypeCheckbox({
  code,
  checked,
  onToggle,
}: {
  code: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-2 py-1.5 text-body text-foreground hover:bg-muted rounded-sm"
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className="pointer-events-none flex-shrink-0" aria-label={TRANSACTION_TYPE_LABELS[code as keyof typeof TRANSACTION_TYPE_LABELS]} />
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
        style={{ backgroundColor: FUNDING_FLOW_TYPE_COLOR[code] || "#94a3b8" }}
      />
      <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">{code}</code>
      <span className="flex-1 text-left truncate">{TRANSACTION_TYPE_LABELS[code as keyof typeof TRANSACTION_TYPE_LABELS]}</span>
    </button>
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
      mathTooltip="For each year, sums the organisation's reported funding envelopes split by status — actual, current, and indicative. Multi-year envelopes are spread evenly across the years they cover (per-year amount = total ÷ number of years) before being added to each year's stacked bar. All amounts are USD-converted."
      interpretation={
        <>
          Year-by-year funding envelopes declared by this organisation, stacked into three statuses — actual (past), current (this year) and indicative (forward). Comparing the heights across years places the organisation's commitment to country in absolute terms: tall red blocks signal a strong delivery track-record, while tall grey blocks at the right of the chart flag a forward pipeline that hasn't yet been confirmed. A pipeline that's mostly indicative deserves more cautious assumptions than one anchored in current-year actuals.
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
  const [view, setView] = useState<"chart" | "table">("chart")
  const yearLabel = useOrgYearLabel()
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No funding envelope data recorded for this organisation." />
  const controls = isExpanded ? <ChartTableToggle view={view} setView={setView} /> : null
  if (isExpanded && view === "table") {
    return (
      <ChartFrame controls={controls} tableMode>
        <table className="w-full text-body">
          <thead className="sticky top-0 bg-surface-muted z-10">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Year</th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "#dc2625" }} />
                  Actual
                </div>
              </th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "#7b95a7" }} />
                  Current
                </div>
              </th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "#cbd5e1" }} />
                  Indicative
                </div>
              </th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const total = (row.actual || 0) + (row.current || 0) + (row.indicative || 0)
              return (
                <tr key={row.year} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2.5 px-4 font-medium text-foreground">{yearLabel(Number(row.year))}</td>
                  <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(row.actual || 0)}</td>
                  <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(row.current || 0)}</td>
                  <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(row.indicative || 0)}</td>
                  <td className="text-right py-2.5 px-4 text-foreground font-semibold tabular-nums">{compactUsd(total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ChartFrame>
    )
  }
  return (
    <ChartFrame controls={controls}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} tickFormatter={(v: string) => yearLabel(Number(v))} />
          <YAxis tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null
              return (
                <ChartTooltipCard
                  title={yearLabel(Number(label))}
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
      mathTooltip="For each year, sums USD-converted outgoing commitments (transaction type 2) and planned disbursements (type 11) separately, then plots the two series side-by-side. Transactions are bucketed by their transaction or value date."
      interpretation={
        <>
          Annual outgoing commitments this organisation has made to others (paying out) set alongside the incoming commitments that fund its own work (the pipeline coming in). A wide gap between the two in the same year indicates a structural mismatch — either spending ahead of new funding, or sitting on undeployed pipeline. Healthy patterns show outgoing tracking close to incoming with a sustainable lag; volatile years suggest concentration risk in a few large agreements.
        </>
      }
    >
      <CommitmentsVsPlannedBody data={data} />
    </ChartCard>
  )
}

function CommitmentsVsPlannedBody({ data }: { data: any[] | null }) {
  const isExpanded = useChartExpansion()
  const [view, setView] = useState<"chart" | "table">("chart")
  const yearLabel = useOrgYearLabel()
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No commitment or planned disbursement data." />
  const controls = isExpanded ? <ChartTableToggle view={view} setView={setView} /> : null
  if (isExpanded && view === "table") {
    return (
      <ChartFrame controls={controls} tableMode>
        <table className="w-full text-body">
          <thead className="sticky top-0 bg-surface-muted z-10">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Year</th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: getTransactionTypeColor('2') }} />
                  Outgoing Commitments
                </div>
              </th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: getTransactionTypeColor('11') }} />
                  Incoming Commitments / Pipeline
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} className="border-b border-border hover:bg-muted/50">
                <td className="py-2.5 px-4 font-medium text-foreground">{yearLabel(Number(row.year))}</td>
                <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(row.commitments || 0)}</td>
                <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(row.planned || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartFrame>
    )
  }
  return (
    <ChartFrame controls={controls}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} tickFormatter={(v: string) => yearLabel(Number(v))} />
          <YAxis tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null
              return (
                <ChartTooltipCard
                  title={yearLabel(Number(label))}
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
          <Bar dataKey="commitments" name="Outgoing Commitments" fill={getTransactionTypeColor('2')} />
          <Bar dataKey="planned" name="Incoming Commitments / Pipeline" fill={getTransactionTypeColor('11')} />
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
      mathTooltip="Sums USD-converted value across all of the organisation's transactions, grouped by IATI transaction type (Incoming Funds, Outgoing Commitment, Disbursement, Expenditure, etc.). Each bar is that type's total dollar value; types are ranked descending."
      interpretation={
        <>
          Total USD value broken down by every IATI transaction type the organisation has reported — incoming funds, commitments, disbursements, expenditures, pledges and beyond — with bar length comparing dollar weight across the types. A long Disbursements bar with a short Commitments bar means most reported activity is delivery, while the inverse signals an organisation that promises more than it pays. The mix characterises the organisation's reporting style and financial role — whether it primarily funds others, receives funds, or operates as both donor and channel.
        </>
      }
    >
      <AllTransactionTypesBody data={data} />
    </ChartCard>
  )
}

function AllTransactionTypesBody({ data }: { data: any[] | null }) {
  const isExpanded = useChartExpansion()
  const [view, setView] = useState<"chart" | "table">("chart")
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No transactions to summarise." />
  const controls = isExpanded ? <ChartTableToggle view={view} setView={setView} /> : null
  if (isExpanded && view === "table") {
    const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
    return (
      <ChartFrame controls={controls} tableMode>
        <table className="w-full text-body">
          <thead className="sticky top-0 bg-surface-muted z-10">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap w-16">Code</th>
              <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Transaction Type</th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Total (USD)</th>
              <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">% Share</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const pct = total > 0 ? ((Number(row.value) || 0) / total) * 100 : 0
              return (
                <tr key={row.type} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2.5 px-4 text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">{row.type}</code>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[row.type] ?? "#94a3b8" }} />
                      {row.name}
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(Number(row.value) || 0)}</td>
                  <td className="text-right py-2.5 px-4 text-muted-foreground tabular-nums">{pct.toFixed(1)}%</td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-border bg-muted/50 font-semibold">
              <td className="py-2.5 px-4 text-foreground" colSpan={2}>Total</td>
              <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(total)}</td>
              <td className="text-right py-2.5 px-4 text-foreground tabular-nums">100.0%</td>
            </tr>
          </tbody>
        </table>
      </ChartFrame>
    )
  }
  // Y-axis tick: IATI code in a grey monospace badge, then the type name —
  // matching the code-badge style used elsewhere in the app.
  const renderTypeTick = (props: any) => {
    const { x, y, payload } = props
    const row = data[payload?.index ?? -1]
    const code = String(row?.type ?? "")
    const name = row?.name ?? payload?.value ?? ""
    const padX = 5
    const gap = 6
    const rightPad = 4
    const codeW = Math.max(code.length * 7 + padX * 2, 18)
    // Right-align the label against the axis: the name ends at the axis, the
    // code badge sits just to its left.
    const nameRight = x - rightPad
    const nameW = name.length * 6.5
    const badgeRight = nameRight - nameW - gap
    const badgeLeft = badgeRight - codeW
    return (
      <g>
        <rect x={badgeLeft} y={y - 9} width={codeW} height={18} rx={3} fill="#e2e8f0" />
        <text x={badgeLeft + padX} y={y + 4} fontSize={11} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#64748b">{code}</text>
        <text x={nameRight} y={y + 4} fontSize={12} fill="#334155" textAnchor="end">{name}</text>
      </g>
    )
  }

  // Full, unrounded USD for the hover (expanded view); compact for the small card.
  const fmtHoverUsd = (v: number) =>
    isExpanded
      ? v.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : compactUsd(v)

  return (
    <ChartFrame controls={controls}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={200} tick={renderTypeTick} />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload
              return (
                <ChartTooltipCard
                  title={row.name}
                  rows={[{ label: 'Total', value: fmtHoverUsd(Number(row.value) || 0), color: TYPE_COLORS[row.type] ?? '#94a3b8' }]}
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

// Outgoing transaction types that can contribute to the Grants vs Loans
// breakdown. Same set as the activity profile's Aid Modality Mix chart.
const GVL_OUTGOING_TYPES = ['2', '3', '4'] as const
const GVL_TYPE_LABELS: Record<string, string> = {
  '2': 'Outgoing Commitments',
  '3': 'Disbursements',
  '4': 'Expenditures',
}

function GrantsVsLoansChart({ transactions }: { transactions: any[] | null }) {
  // Multi-select filter — defaults to all three outgoing types. State lives
  // here (parent) so the expanded toolbar can mutate it and the data memo
  // recomputes the slices + per-type breakdowns.
  const [txTypes, setTxTypes] = useState<Set<string>>(() => new Set(GVL_OUTGOING_TYPES))

  const data = useMemo(() => {
    if (!transactions) return null
    // Group by the actual IATI finance-type CODE so each slice reads
    // "110 Standard grant" rather than a broad Grants/Loans bucket.
    const byCode: Record<string, { value: number; byType: Record<string, number>; code: string }> = {}
    for (const t of transactions) {
      const type = String(t.transaction_type ?? "")
      if (!txTypes.has(type)) continue
      const usd = t.value_usd != null ? Number(t.value_usd) : (t.currency === "USD" ? Number(t.value) : 0)
      if (!Number.isFinite(usd) || usd === 0) continue
      const code = String(t.finance_type || "")
      const key = code || "__unspecified__"
      if (!byCode[key]) byCode[key] = { value: 0, byType: {}, code }
      byCode[key].value += usd
      byCode[key].byType[type] = (byCode[key].byType[type] || 0) + usd
    }
    return Object.values(byCode)
      .map(({ value, byType, code }) => ({ name: financeTypeLabel(code), code, value, byType }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, txTypes])

  return (
    <ChartCard
      title="Aid Modality Mix"
      description="Outgoing finance by IATI finance type"
      mathTooltip="Groups the organisation's outgoing finance by IATI finance-type code (e.g. 110 Standard grant, 421 Standard loan) and sums USD-converted value. Each slice is that finance type's share of total outgoing USD, coloured by its modality group (grant / loan / equity / guarantee). The transaction-type filter re-scopes which transactions are counted."
      interpretation={
        <>
          Outgoing finance grouped by IATI finance type — shown with its code and name (e.g. 110 Standard grant) and coloured by modality group (grants, loans, equity, guarantees) — with each slice sized by dollar share. A grant-heavy mix indicates concessional support, while a loan-heavy mix signals market or near-market financing terms. Understanding the mix matters because recipients of grants face no repayment burden, while loan recipients carry future debt-service obligations that change project economics.
        </>
      }
    >
      <GrantsVsLoansBody data={data} txTypes={txTypes} setTxTypes={setTxTypes} />
    </ChartCard>
  )
}

interface GrantsVsLoansSlice {
  name: string
  code: string
  value: number
  byType: Record<string, number>
}

function GrantsVsLoansBody({
  data,
  txTypes,
  setTxTypes,
}: {
  data: GrantsVsLoansSlice[] | null
  txTypes: Set<string>
  setTxTypes: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  const isExpanded = useChartExpansion()
  const [view, setView] = useState<"chart" | "table">("chart")
  const total = (data ?? []).reduce((sum, d) => sum + d.value, 0)
  if (data === null) return <ChartLoading />
  if (data.length === 0) return <ChartEmpty message="No outgoing transactions with finance types recorded." />

  const dataTable = (
    <table className="w-full text-body">
      <thead className="sticky top-0 bg-surface-muted z-10">
        <tr className="border-b border-border">
          <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Finance Type</th>
          <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Total (USD)</th>
          <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">% Share</th>
          {GVL_OUTGOING_TYPES.map((code) => (
            <th key={code} className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
              <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[code] ?? "#94a3b8" }} />
                {GVL_TYPE_LABELS[code]}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const pct = total > 0 ? (row.value / total) * 100 : 0
          return (
            <tr key={row.name} className="border-b border-border hover:bg-muted/50">
              <td className="py-2.5 px-4 font-medium text-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: financeTypeColor(row.code) }} />
                  {row.code ? (
                    <>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono flex-shrink-0">{row.code}</code>
                      <span>{FINANCE_TYPE_NAME[row.code] || row.name}</span>
                    </>
                  ) : (
                    <span>Unspecified</span>
                  )}
                </div>
              </td>
              <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(row.value)}</td>
              <td className="text-right py-2.5 px-4 text-muted-foreground tabular-nums">{pct.toFixed(1)}%</td>
              {GVL_OUTGOING_TYPES.map((code) => (
                <td key={code} className="text-right py-2.5 px-4 text-foreground tabular-nums">
                  {Number(row.byType?.[code]) > 0 ? compactUsd(Number(row.byType[code])) : "—"}
                </td>
              ))}
            </tr>
          )
        })}
        <tr className="border-t-2 border-border bg-muted/50 font-semibold">
          <td className="py-2.5 px-4 text-foreground">Total</td>
          <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{compactUsd(total)}</td>
          <td className="text-right py-2.5 px-4 text-foreground tabular-nums">100.0%</td>
          {GVL_OUTGOING_TYPES.map((code) => {
            const colTotal = data.reduce((s, r) => s + (Number(r.byType?.[code]) || 0), 0)
            return (
              <td key={code} className="text-right py-2.5 px-4 text-foreground tabular-nums">
                {colTotal > 0 ? compactUsd(colTotal) : "—"}
              </td>
            )
          })}
        </tr>
      </tbody>
    </table>
  )

  const pieChart = (
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
            <Cell key={i} fill={financeTypeColor(d.code)} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const entry = payload[0]
            const slice = (entry.payload || {}) as Partial<GrantsVsLoansSlice>
            const value = Number(entry.value) || 0
            const pct = total > 0 ? (value / total) * 100 : 0
            const sliceColor = entry.payload?.fill || financeTypeColor(slice.code || "")
            // Disaggregate by transaction type — same hover pattern as
            // the activity profile's Aid Modality Mix.
            const byType: Record<string, number> = slice.byType || {}
            const breakdown = GVL_OUTGOING_TYPES
              .filter((code) => Number(byType[code]) > 0)
              .map((code) => ({
                label: GVL_TYPE_LABELS[code],
                value: compactUsd(Number(byType[code]) || 0),
              }))
            return (
              <ChartTooltipCard
                title={
                  slice.code ? (
                    <span className="inline-flex items-center gap-1.5">
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{slice.code}</code>
                      {FINANCE_TYPE_NAME[slice.code] || entry.name}
                    </span>
                  ) : entry.name
                }
                rows={[
                  {
                    label: 'Total',
                    value: compactUsd(value),
                    color: sliceColor,
                    extra: `${pct.toFixed(1)}%`,
                    bordered: breakdown.length > 0,
                  },
                  ...breakdown,
                ]}
              />
            )
          }}
        />
        {isExpanded && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  )

  if (!isExpanded) {
    return <div className="h-72 w-full">{pieChart}</div>
  }

  // Expanded layout — year chip top-left, chart/table toggle +
  // transaction-types dropdown top-right, pie OR table filling the rest.
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <ExpandedYearChip />
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Transaction Types ({txTypes.size})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 p-2"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-1">
                {GVL_OUTGOING_TYPES.map((code) => {
                  const checked = txTypes.has(code)
                  const toggle = () => {
                    setTxTypes((prev) => {
                      const next = new Set(prev)
                      if (next.has(code)) next.delete(code)
                      else next.add(code)
                      return next
                    })
                  }
                  return (
                    <div
                      key={code}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                      onClick={toggle}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={toggle}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[code] ?? "#94a3b8" }} />
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono min-w-[24px] text-center">
                        {code}
                      </code>
                      <span className="text-body">{GVL_TYPE_LABELS[code]}</span>
                    </div>
                  )
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChartTableToggle view={view} setView={setView} />
        </div>
      </div>
      {view === "table" ? (
        <div className="flex-1 min-h-0 overflow-auto">{dataTable}</div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0">{pieChart}</div>
        </div>
      )}
    </div>
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

    const allRows = activities
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
        const full = a.title_narrative || a.title || a.iati_identifier || 'Untitled'
        const acronym = (a.acronym && String(a.acronym).trim()) ? String(a.acronym).trim() : ''
        return { full, acronym, value, isOther: false }
      })
      .filter((r) => Number.isFinite(r.value) && r.value > 0)
      .sort((a, b) => b.value - a.value)

    // Top 10 activities, then roll everything else up into a single "Other" bar.
    const top = allRows.slice(0, 10)
    const rest = allRows.slice(10)
    const otherTotal = rest.reduce((s, r) => s + r.value, 0)
    const rows: { full: string; acronym: string; value: number; isOther: boolean; name: string }[] =
      top.map((r, i) => ({ ...r, name: `${i}|${r.full}` }))
    if (otherTotal > 0) {
      rows.push({
        full: `Other (${rest.length} ${rest.length === 1 ? 'activity' : 'activities'})`,
        acronym: '',
        value: otherTotal,
        isOther: true,
        name: '__other__',
      })
    }
    return rows
  }, [activities, transactions, mode])

  const modeLabel = LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)?.label ?? mode

  return (
    <ChartCard
      title="Largest Activities"
      description={`Top 10 activities by ${modeLabel.toLowerCase()}`}
      mathTooltip={`Sums the selected metric (${modeLabel.toLowerCase()}) in USD per activity this organisation participates in, ranks them descending, and shows the top 10. Activities with no value for the chosen metric are excluded.`}
      interpretation={
        <>
          The ten activities with the highest value for the selected basis, sorted longest-to-shortest. The dropdown switches between disbursements (actual money out), commitments (money pledged), expenditures, total outgoing (the sum of those three), or total budget — each mode reads from a single explicit data source, no silent substitution. A long-tail distribution (one or two large bars then a steep drop) signals concentration risk, and comparing across modes can surface mismatches — an activity with high commitments but low disbursements may be slow to deliver, while a high budget paired with low transactions could indicate a recently-started or paused programme.
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
  const [view, setView] = useState<"chart" | "table">("chart")
  const currentMode = LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)

  // Y-axis tick: full activity name + acronym, right-aligned, wrapped to two
  // lines so the whole label is visible rather than truncated.
  const renderActivityTick = (props: any) => {
    const { x, y, payload } = props
    const row = data?.[payload?.index ?? -1]
    const full = row?.full ?? payload?.value ?? ""
    const acronym = row?.acronym ? ` (${row.acronym})` : ""
    const display = `${full}${acronym}`
    const maxChars = 30
    const words = String(display).split(" ")
    const lines: string[] = []
    let cur = ""
    for (const w of words) {
      if (cur && (cur + " " + w).length > maxChars) {
        lines.push(cur)
        cur = w
      } else {
        cur = cur ? `${cur} ${w}` : w
      }
    }
    if (cur) lines.push(cur)
    const shown = lines.slice(0, 2)
    if (lines.length > 2) shown[1] = `${shown[1].slice(0, maxChars - 1)}…`
    const lineH = 12
    const startY = y - ((shown.length - 1) * lineH) / 2
    return (
      <g>
        {shown.map((ln, i) => (
          <text key={i} x={x} y={startY + i * lineH + 4} textAnchor="end" fontSize={11} fill="#334155">
            {ln}
          </text>
        ))}
      </g>
    )
  }

  return (
    <div className={cn(isExpanded ? "h-full flex flex-col gap-3 min-h-0" : "space-y-3")}>
      {/* Year-range chip on the left, chart/table toggle + mode picker on the
          right — all only render in the expanded modal. Inline cards stay
          chart-only. */}
      {isExpanded && (
        <div className="flex items-center gap-2 shrink-0">
          <ExpandedYearChip />
          <div className="ml-auto flex items-center gap-2">
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
          <ChartTableToggle view={view} setView={setView} />
          </div>
        </div>
      )}
      {data === null ? (
        <ChartLoading />
      ) : data.length === 0 ? (
        <ChartEmpty message={`No ${LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)?.label.toLowerCase()} data found.`} />
      ) : isExpanded && view === "table" ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-body">
            <thead className="sticky top-0 bg-surface-muted z-10">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap w-12">#</th>
                <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Activity</th>
                <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
                  {LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)?.label ?? "Value"} (USD)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.name ?? `${row.full}-${i}`} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2.5 px-4 text-muted-foreground tabular-nums">{row.isOther ? "—" : i + 1}</td>
                  <td className="py-2.5 px-4 font-medium text-foreground" title={row.acronym ? `${row.full} (${row.acronym})` : row.full}>
                    {row.full}{row.acronym ? ` (${row.acronym})` : ""}
                  </td>
                  <td className="text-right py-2.5 px-4 text-foreground tabular-nums">
                    {compactUsd(Number(row.value) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={cn(isExpanded ? "flex-1 min-h-0 relative" : "h-80 w-full")}>
          <div className={isExpanded ? "absolute inset-0" : "h-full w-full"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={230}
                tick={renderActivityTick}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload
                  const label = LARGEST_ACTIVITIES_MODES.find((m) => m.value === mode)?.label ?? "Total"
                  return (
                    <ChartTooltipCard
                      title={row.acronym ? `${row.full} (${row.acronym})` : row.full}
                      rows={[{ label, value: compactUsd(Number(row.value) || 0), color: row.isOther ? '#94a3b8' : '#dc2625' }]}
                    />
                  )
                }}
              />
              <Bar dataKey="value">
                {data.map((d: any, i: number) => (
                  <Cell key={i} fill={d.isOther ? '#94a3b8' : '#dc2625'} />
                ))}
              </Bar>
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
