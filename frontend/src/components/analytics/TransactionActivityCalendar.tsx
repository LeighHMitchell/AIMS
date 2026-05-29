"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { TransactionCalendarHeatmap } from '@/components/activities/TransactionCalendarHeatmap'
import { supabase } from '@/lib/supabase'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, Download, Grid3x3, List, Table as TableIcon, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { toast } from 'sonner'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { MetricsMultiSelect } from '@/components/analytics/MetricsMultiSelect'
import { PartnersFilterDropdown, type PartnerOption } from '@/components/analytics/PartnersFilterDropdown'
import { type Metric } from '@/lib/financial-metrics'
import { exportChartToCSV } from '@/lib/chart-export'

interface TransactionActivityCalendarProps {
  dateRange?: { from: Date; to: Date }
  filters?: { country?: string; donor?: string; sector?: string }
  refreshKey?: number
}

// One calendar event = one record on one day (a transaction, a planned
// disbursement, or a budget). The heatmap colours each day by how many.
interface CalEvent {
  transaction_date: string
  transaction_type: string
  value: number
  value_usd: number
  /** Development partner that reported it (provider org, or reporting org for budgets). */
  provider: string
  /** Org id for the development-partner link, and activity id/name for the activity link. */
  providerId?: string
  activityId?: string
  activityName?: string
}

// Metrics offered in the calendar filter — budgets, planned disbursements, and
// the common transaction types. (Same shared model as the other charts.)
const CAL_METRIC_KEYS: Metric[] = ['budgets', 'planned', 'tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_11', 'tx_12', 'tx_13']
const METRIC_TO_TXTYPE: Partial<Record<Metric, string>> = {
  tx_1: '1', tx_2: '2', tx_3: '3', tx_4: '4', tx_11: '11', tx_12: '12', tx_13: '13',
}

export function TransactionActivityCalendar({
  dateRange,
  filters,
  refreshKey,
}: TransactionActivityCalendarProps) {
  const isExpanded = useChartExpansion()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalTransactions: 0, totalValue: 0, activeDays: 0, avgPerDay: 0 })

  // Filters. All metrics selected by default — the calendar shows every kind of
  // reported activity until the user narrows it.
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(CAL_METRIC_KEYS)
  // null = all development partners (the default).
  const [selectedDPs, setSelectedDPs] = useState<string[] | null>(null)
  // Raw org rows (id, name, acronym, iati_org_id) — drive both the filter
  // options and the id/ref → label resolution for provider names.
  const [orgRows, setOrgRows] = useState<Array<{ id: string; name: string | null; acronym: string | null; iati_org_id: string | null }>>([])
  const dpOptions = useMemo<PartnerOption[]>(
    () => orgRows.map(o => ({ key: o.id, name: o.name || 'Unknown', acronym: o.acronym })),
    [orgRows],
  )
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [dateWindow, setDateWindow] = useState<{ from: Date; to: Date } | null>(null)
  const [viewMode, setViewMode] = useState<'heatmap' | 'timeline' | 'table'>('heatmap')

  const fromIso = dateRange?.from?.toISOString()
  const toIso = dateRange?.to?.toISOString()

  // Organisations — fetched once; used for the DP filter and name resolution.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const { data } = await supabase.from('organizations').select('id, name, acronym, iati_org_id').order('name')
      if (cancelled) return
      setOrgRows((data || []) as any)
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Fetch calendar events for the selected metrics + development partners.
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const txTypes = selectedMetrics.map(m => METRIC_TO_TXTYPE[m]).filter(Boolean) as string[]
        const wantsPlanned = selectedMetrics.includes('planned')
        const wantsBudgets = selectedMetrics.includes('budgets')
        // Resolve the development-partner filter. null = all (honour a global
        // donor filter if present); a full selection also means "all"; otherwise
        // restrict to the chosen provider ids (an empty array → no rows).
        let dpSet: string[] | null
        if (selectedDPs === null) {
          dpSet = filters?.donor ? [filters.donor] : null
        } else if (dpOptions.length > 0 && selectedDPs.length === dpOptions.length) {
          dpSet = null
        } else {
          dpSet = selectedDPs
        }

        const out: CalEvent[] = []
        // Resolve a development partner by org id OR by IATI ref (provider_org_ref
        // → organizations.iati_org_id), matching how the activity transaction
        // list names providers. Many transactions carry only a ref.
        const orgLabel = new Map<string, string>()
        const orgByRef = new Map<string, { id: string; label: string }>()
        orgRows.forEach(o => {
          const label = o.acronym ? `${o.name || 'Unknown'} (${o.acronym})` : (o.name || 'Unknown')
          orgLabel.set(o.id, label)
          if (o.iati_org_id) orgByRef.set(o.iati_org_id, { id: o.id, label })
        })
        const labelFor = (id?: string | null, fallback = 'Unknown partner') =>
          (id && orgLabel.get(id)) || fallback

        // 1) Transactions — provider_org is the development partner.
        if (txTypes.length > 0) {
          let q = supabase
            .from('transactions')
            .select('transaction_date, transaction_type, value, value_usd, currency, provider_org_id, provider_org_name, provider_org_ref, activity_id')
            .in('transaction_type', txTypes)
            .eq('status', 'actual')
            .not('transaction_date', 'is', null)
          if (fromIso) q = q.gte('transaction_date', fromIso)
          if (toIso) q = q.lte('transaction_date', toIso)
          if (dpSet) q = q.in('provider_org_id', dpSet)
          const { data, error: txErr } = await q
          if (txErr) throw txErr
          data?.forEach((t: any) => {
            const usd = parseFloat(t.value_usd) || (t.currency === 'USD' ? parseFloat(t.value) || 0 : 0)
            // Resolve the provider: linked org id → IATI ref → text name. Many
            // IATI transactions name the provider only by ref (e.g. USAID).
            const refMatch = t.provider_org_ref ? orgByRef.get(t.provider_org_ref) : undefined
            const provider = (t.provider_org_id && orgLabel.get(t.provider_org_id)) || refMatch?.label || t.provider_org_name || 'Unknown partner'
            out.push({ transaction_date: t.transaction_date, transaction_type: String(t.transaction_type), value: Math.abs(usd), value_usd: Math.abs(usd), provider, providerId: t.provider_org_id || refMatch?.id || undefined, activityId: t.activity_id || undefined })
          })
        }

        // 2) Planned disbursements — provider_org is the development partner.
        if (wantsPlanned) {
          let pq = supabase
            .from('planned_disbursements')
            .select('period_start, provider_org_id, provider_org_name, provider_org_acronym, provider_org_ref, amount, usd_amount, currency, activity_id')
            .not('period_start', 'is', null)
          if (fromIso) pq = pq.gte('period_start', fromIso)
          if (toIso) pq = pq.lte('period_start', toIso)
          if (dpSet) pq = pq.in('provider_org_id', dpSet)
          const { data } = await pq
          data?.forEach((p: any) => {
            const usd = (p.usd_amount != null && isFinite(Number(p.usd_amount)))
              ? Number(p.usd_amount)
              : ((p.currency ?? '').toString().toUpperCase() === 'USD' ? Number(p.amount) || 0 : 0)
            const refMatch = p.provider_org_ref ? orgByRef.get(p.provider_org_ref) : undefined
            const provider = orgLabel.get(p.provider_org_id)
              || refMatch?.label
              || (p.provider_org_name ? (p.provider_org_acronym ? `${p.provider_org_name} (${p.provider_org_acronym})` : p.provider_org_name) : 'Unknown partner')
            out.push({ transaction_date: p.period_start, transaction_type: 'planned', value: Math.abs(usd), value_usd: Math.abs(usd), provider, providerId: p.provider_org_id || refMatch?.id || undefined, activityId: p.activity_id || undefined })
          })
        }

        // 3) Budgets — no provider; the development partner is the activity's
        //    reporting organisation (also used for the DP filter).
        if (wantsBudgets) {
          let bq = supabase
            .from('activity_budgets')
            .select('period_start, value, usd_value, currency, activity_id')
            .not('period_start', 'is', null)
          if (fromIso) bq = bq.gte('period_start', fromIso)
          if (toIso) bq = bq.lte('period_start', toIso)
          const { data: budgets } = await bq
          const rows = budgets || []
          // Resolve each budget's reporting org (for both the DP filter and label).
          const actToOrg = new Map<string, string>()
          if (rows.length > 0) {
            const actIds = Array.from(new Set(rows.map((b: any) => b.activity_id).filter(Boolean)))
            if (actIds.length > 0) {
              const { data: acts } = await supabase.from('activities').select('id, reporting_org_id').in('id', actIds)
              acts?.forEach((a: any) => { if (a.reporting_org_id) actToOrg.set(a.id, a.reporting_org_id) })
            }
          }
          rows.forEach((b: any) => {
            const orgId = actToOrg.get(b.activity_id)
            if (dpSet && (!orgId || !dpSet.includes(orgId))) return
            const usd = (b.usd_value != null && isFinite(Number(b.usd_value)))
              ? Number(b.usd_value)
              : ((b.currency ?? '').toString().toUpperCase() === 'USD' ? Number(b.value) || 0 : 0)
            out.push({ transaction_date: b.period_start, transaction_type: 'budget', value: Math.abs(usd), value_usd: Math.abs(usd), provider: labelFor(orgId, 'Unknown reporting org'), providerId: orgId || undefined, activityId: b.activity_id || undefined })
          })
        }

        // Resolve activity names (one query) so the click-detail popup can show
        // and link the activity title, not just an id.
        const eventActIds = Array.from(new Set(out.map(e => e.activityId).filter(Boolean))) as string[]
        if (eventActIds.length > 0) {
          const { data: acts } = await supabase
            .from('activities')
            .select('id, title_narrative, acronym, reporting_org_id')
            .in('id', eventActIds)
          const titleMap = new Map<string, string>()
          const repOrgMap = new Map<string, string>()
          acts?.forEach((a: any) => {
            const title = a.title_narrative || 'Untitled activity'
            titleMap.set(a.id, a.acronym ? `${title} (${a.acronym})` : title)
            if (a.reporting_org_id) repOrgMap.set(a.id, a.reporting_org_id)
          })
          out.forEach(e => {
            if (!e.activityId) return
            e.activityName = titleMap.get(e.activityId)
            // IATI: a transaction with no provider org is provided by the
            // activity's reporting organisation — use it rather than "Unknown".
            if (e.provider === 'Unknown partner') {
              const repId = repOrgMap.get(e.activityId)
              if (repId) {
                e.providerId = repId
                e.provider = orgLabel.get(repId) || e.provider
              }
            }
          })
        }

        setEvents(out)
        const uniqueDays = new Set(out.map(t => t.transaction_date?.split('T')[0])).size
        setStats({
          totalTransactions: out.length,
          totalValue: out.reduce((sum, t) => sum + t.value, 0),
          activeDays: uniqueDays,
          avgPerDay: uniqueDays > 0 ? out.length / uniqueDays : 0,
        })
      } catch (err) {
        console.error('[TransactionActivityCalendar] Unexpected error:', err)
        setError('Failed to fetch calendar data')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [selectedMetrics, selectedDPs, fromIso, toIso, filters?.donor, refreshKey, orgRows])

  // Years present in the data — drives the picker default (most recent year).
  const dataYears = useMemo(() => {
    const ys = new Set<number>()
    events.forEach(e => {
      const y = new Date(e.transaction_date).getFullYear()
      if (Number.isFinite(y)) ys.add(y)
    })
    return Array.from(ys).sort((a, b) => b - a)
  }, [events])

  const actualDataRange = useMemo(
    () => (dataYears.length ? { minYear: dataYears[dataYears.length - 1], maxYear: dataYears[0] } : null),
    [dataYears],
  )

  // Default the picker to the most recent year with data (a single Jan–Dec view).
  useEffect(() => {
    if (dataYears.length > 0 && selectedYears.length === 0) {
      setSelectedYears([dataYears[0]])
    }
  }, [dataYears, selectedYears])

  const handleExport = () => {
    if (!events.length) {
      toast.error('No data available to export')
      return
    }
    // Aggregate to the visible window (selected year) by day.
    const inWindow = dateWindow
      ? events.filter(e => {
          const d = new Date(e.transaction_date)
          return d >= dateWindow.from && d <= dateWindow.to
        })
      : events
    const byDay = new Map<string, { count: number; value: number }>()
    inWindow.forEach(e => {
      const d = e.transaction_date.split('T')[0]
      const m = byDay.get(d) || { count: 0, value: 0 }
      m.count += 1
      m.value += e.value
      byDay.set(d, m)
    })
    const rows = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, m]) => ({ Date: date, Transactions: m.count, 'Value (USD)': Math.round(m.value) }))
    exportChartToCSV(rows, 'transaction-activity-calendar')
    toast.success('Data exported successfully')
  }

  // Year stepping (< / >) within the available data range.
  const currentYear = selectedYears[0] ?? dataYears[0] ?? new Date().getFullYear()
  const minYear = dataYears.length ? dataYears[dataYears.length - 1] : currentYear
  const maxYear = dataYears.length ? dataYears[0] : currentYear
  const stepYear = (delta: number) => {
    const next = currentYear + delta
    if (next < minYear || next > maxYear) return
    setSelectedYears([next])
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Expanded controls — filters on the LEFT; view-mode toggle + CSV grouped
          together on the RIGHT (one line). */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Year stepper: < previous / > next year (within the data range). */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => stepYear(-1)}
              disabled={currentYear <= minYear}
              title="Previous year"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <YearRangeChip
              selectedYears={selectedYears}
              onYearsChange={setSelectedYears}
              onDateRangeChange={setDateWindow}
              actualDataRange={actualDataRange}
              singleYear
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => stepYear(1)}
              disabled={currentYear >= maxYear}
              title="Next year"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <MetricsMultiSelect
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            availableKeys={CAL_METRIC_KEYS}
            triggerClassName="h-8 justify-between min-w-[220px]"
          />
          <PartnersFilterDropdown
            options={dpOptions}
            selected={selectedDPs}
            onChange={setSelectedDPs}
          />
          <div className="ml-auto flex items-center gap-2">
            <ChartViewToggle
              ariaLabel="Calendar view"
              variant="icon"
              value={viewMode}
              onValueChange={(v) => setViewMode(v as 'heatmap' | 'timeline' | 'table')}
              options={[
                { value: 'heatmap', label: 'Heatmap', icon: Grid3x3 },
                { value: 'timeline', label: 'Timeline', icon: List },
                { value: 'table', label: 'Table', icon: TableIcon },
              ]}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              className="h-9 w-9"
              title="Download CSV"
              aria-label="Download CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Collapsed: label the year on show (expanded has the year picker). */}
      {!isExpanded && dataYears.length > 0 && (
        <div className="flex items-center gap-1.5 text-helper text-muted-foreground mb-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>Calendar Year {dataYears[0]}</span>
        </div>
      )}

      <TransactionCalendarHeatmap
        transactions={events}
        stats={stats}
        showControls={false}
        dateRange={dateWindow}
        hideYearPicker
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This calendar heatmap shows daily activity density — each cell is one day, shaded by the number of
          records that day (darker = busier). Use the metrics control to choose what counts (transactions,
          planned disbursements, budgets), the development-partner filter to focus on specific providers, and the
          calendar/year picker to pick the year. Hover a day for the per-type breakdown, or export the daily
          totals as CSV.
        </p>
      )}
    </>
  )
}
