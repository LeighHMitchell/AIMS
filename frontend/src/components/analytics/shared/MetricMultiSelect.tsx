"use client"

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, ChevronDown, DollarSign, Search, Wallet, X } from 'lucide-react'
import { METRIC_DEFS, METRIC_LABEL, metricColor, type Metric } from './metric-options'

interface MetricMultiSelectProps {
  selected: Metric[]
  onChange: (next: Metric[]) => void
  /** Optional controlled open state. Omit to use uncontrolled. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Width override for the trigger; defaults match the AllDonors chart. */
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
  /**
   * Optional whitelist of metric keys to expose. When provided, only these
   * options render and Select-all / Clear operate on this subset. Omit to show
   * all 15 metrics (default).
   */
  allowedMetrics?: Metric[]
}

// Multi-select metric dropdown shared by the External Development Partners
// Financial Overview chart and the Sector Disbursements Over Time chart.
// Renders the 15 IATI-aligned metrics with search, select-all and clear.
export function MetricMultiSelect({
  selected,
  onChange,
  open,
  onOpenChange,
  triggerClassName,
  align = 'end',
  allowedMetrics,
}: MetricMultiSelectProps) {
  const [search, setSearch] = useState('')

  // Restrict the option list (and Select-all / Clear scope) to the whitelist
  // when one is supplied; otherwise expose all metrics.
  const baseDefs = useMemo(
    () => (allowedMetrics ? METRIC_DEFS.filter(m => allowedMetrics.includes(m.key)) : METRIC_DEFS),
    [allowedMetrics]
  )
  const selectableKeys = useMemo(() => baseDefs.map(m => m.key), [baseDefs])

  const filteredDefs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return baseDefs
    return baseDefs.filter(m =>
      m.label.toLowerCase().includes(q) || (m.code ?? '').toLowerCase().includes(q)
    )
  }, [search, baseDefs])

  const primary: Metric | null = selected[0] ?? null
  const label = selected.length === 0
    ? 'No metric selected'
    : selected.length === 1
      ? METRIC_LABEL[selected[0]]
      : `${selected.length} metrics selected`

  const toggle = (m: Metric) => {
    onChange(selected.includes(m) ? selected.filter(x => x !== m) : [...selected, m])
  }
  const clear = () => onChange([])
  const selectAll = () => onChange([...selectableKeys])

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={triggerClassName ?? 'min-w-[280px] h-9 justify-between'}
        >
          <span className="flex items-center gap-2 truncate text-body">
            {selected.length === 1 && primary === 'budgets' && (
              <Wallet className="h-4 w-4 flex-shrink-0" />
            )}
            {selected.length === 1 && primary === 'planned' && (
              <Calendar className="h-4 w-4 flex-shrink-0" />
            )}
            {selected.length === 1 && primary && primary.startsWith('tx_') && (
              <DollarSign className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-[320px] max-h-[400px] overflow-y-auto p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border mb-1">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <span className="text-helper font-semibold text-foreground">Metrics</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={selectAll}
                disabled={selected.length === selectableKeys.length}
                className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Select all
              </button>
              <span className="text-muted-foreground/40">·</span>
              <button
                type="button"
                onClick={clear}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            {search && (
              <X
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                onClick={() => setSearch('')}
              />
            )}
          </div>
        </div>
        {filteredDefs.length === 0 && (
          <div className="px-3 py-4 text-helper text-muted-foreground text-center">
            No matching metrics.
          </div>
        )}
        {filteredDefs.map((def, idx) => {
          const checked = selected.includes(def.key)
          // Separator between the last non-tx metric and the first tx metric
          // in the filtered list, so search results still get the divider.
          const prev = idx > 0 ? filteredDefs[idx - 1] : null
          const showSeparator = !!prev && !prev.key.startsWith('tx_') && def.key.startsWith('tx_')
          return (
            <React.Fragment key={def.key}>
              {showSeparator && <div className="my-1 border-t border-border" />}
              <button
                type="button"
                onClick={() => toggle(def.key)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
              >
                <Checkbox checked={checked} className="pointer-events-none flex-shrink-0" />
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: metricColor(def.key) }}
                />
                {def.code && (
                  <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">
                    {def.code}
                  </code>
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
