"use client"

import React, { useMemo, useState } from 'react'
import { Wallet, Calendar, DollarSign, ChevronDown, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type Metric,
  METRIC_DEFS,
  METRIC_LABEL,
} from '@/lib/financial-metrics'

interface MetricsMultiSelectProps {
  selected: Metric[]
  onChange: (next: Metric[]) => void
  /**
   * Optional whitelist of metric keys to offer. When provided, only these
   * metrics appear in the list and "Select all" selects only these. Used by
   * Financial Totals to hide metrics that have no data in the current view.
   */
  availableKeys?: Metric[]
  /** Controlled open state (for one-dropdown-at-a-time coordination). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  triggerClassName?: string
}

/**
 * Reusable Metrics multiselect — the dropdown originally inline in
 * AllDonorsHorizontalBarChart. Lets the user pick any combination of Budgets,
 * Planned Disbursements, and the 13 IATI transaction types. Search, Select
 * all / Clear, code badges, and the planning↔transaction separator all match
 * the External Development Partners chart.
 */
export function MetricsMultiSelect({
  selected,
  onChange,
  availableKeys,
  open,
  onOpenChange,
  triggerClassName = 'min-w-[280px] h-9 justify-between',
}: MetricsMultiSelectProps) {
  const [metricSearch, setMetricSearch] = useState('')

  // Restrict to the available metrics (if a whitelist was given), preserving
  // METRIC_DEFS order.
  const offeredDefs = useMemo(() => {
    if (!availableKeys) return METRIC_DEFS
    const allow = new Set(availableKeys)
    return METRIC_DEFS.filter(d => allow.has(d.key))
  }, [availableKeys])

  const filteredMetricDefs = useMemo(() => {
    const q = metricSearch.trim().toLowerCase()
    if (!q) return offeredDefs
    return offeredDefs.filter(d =>
      (d.code ?? '').toLowerCase().includes(q) || d.label.toLowerCase().includes(q)
    )
  }, [offeredDefs, metricSearch])

  const offeredKeys = useMemo(() => offeredDefs.map(d => d.key), [offeredDefs])

  const toggleMetric = (m: Metric) =>
    onChange(selected.includes(m) ? selected.filter(x => x !== m) : [...selected, m])
  const clearMetrics = () => onChange([])
  const selectAllMetrics = () => onChange([...offeredKeys])

  const primaryMetric: Metric | null = selected[0] ?? null
  const metricsLabel =
    selected.length === 0
      ? 'No metric selected'
      : selected.length === 1
        ? METRIC_LABEL[selected[0]]
        : `${selected.length} metrics selected`

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <span className="flex items-center gap-2 truncate text-body">
            {selected.length === 1 && primaryMetric === 'budgets' && (
              <Wallet className="h-4 w-4 flex-shrink-0" />
            )}
            {selected.length === 1 && primaryMetric === 'planned' && (
              <Calendar className="h-4 w-4 flex-shrink-0" />
            )}
            {selected.length === 1 && primaryMetric && primaryMetric.startsWith('tx_') && (
              <DollarSign className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="truncate">{metricsLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        collisionPadding={12}
        className="w-[320px] max-h-[400px] overflow-y-auto p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border mb-1">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <span className="text-helper font-semibold text-foreground">Metrics</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={selectAllMetrics}
                disabled={selected.length === offeredKeys.length}
                className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Select all
              </button>
              <span className="text-muted-foreground/40">·</span>
              <button
                type="button"
                onClick={clearMetrics}
                disabled={selected.length === 0}
                className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex items-center px-3 py-2 border-t border-border">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              placeholder="Search metrics..."
              value={metricSearch}
              onChange={(e) => setMetricSearch(e.target.value)}
              className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            {metricSearch && (
              <X
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                onClick={() => setMetricSearch('')}
              />
            )}
          </div>
        </div>
        {filteredMetricDefs.length === 0 && (
          <div className="px-3 py-4 text-helper text-muted-foreground text-center">
            No matching metrics.
          </div>
        )}
        {filteredMetricDefs.map((def, idx) => {
          const checked = selected.includes(def.key)
          // Separator between the last non-transaction metric and the first
          // transaction-type entry — computed against the currently visible
          // (filtered) list so search results still get the divider when both
          // kinds of metrics match.
          const prev = idx > 0 ? filteredMetricDefs[idx - 1] : null
          const showSeparator = !!prev && !prev.key.startsWith('tx_') && def.key.startsWith('tx_')
          return (
            <React.Fragment key={def.key}>
              {showSeparator && <div className="my-1 border-t border-border" />}
              <button
                type="button"
                onClick={() => toggleMetric(def.key)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
              >
                <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
                {def.code && (
                  <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">{def.code}</code>
                )}
                <span className="text-foreground truncate">{def.label}</span>
              </button>
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
