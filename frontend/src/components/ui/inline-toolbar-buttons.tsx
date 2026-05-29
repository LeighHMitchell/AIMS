"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Table as TableIcon, BarChart3, Download } from 'lucide-react'
import { useChartCardToolbar } from '@/components/ui/compact-chart-card'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'

/**
 * Segmented Chart | Table view switch for an `inlineToolbar` CompactChartCard,
 * driven by the card's toolbar context. Renders nothing in the collapsed card
 * (the toolbar context only exists in the expanded dialog). Per the dashboard
 * layout it belongs on the LEFT, with the chart's other filters/toggles.
 */
export function InlineViewToggle() {
  const toolbar = useChartCardToolbar()
  if (!toolbar || !toolbar.hasTableView) return null
  return (
    <ChartViewToggle
      ariaLabel="Chart or table view"
      variant="icon"
      value={toolbar.viewMode}
      onValueChange={(v) => toolbar.setViewMode(v as 'chart' | 'table')}
      options={[
        { value: 'chart', label: 'Chart view', icon: BarChart3 },
        { value: 'table', label: 'Table view', icon: TableIcon },
      ]}
    />
  )
}

/**
 * The Download-CSV button for an `inlineToolbar` CompactChartCard. Renders
 * nothing in the collapsed card. Per the dashboard layout it sits on the RIGHT
 * of the controls row, on its own.
 */
export function InlineCsvButton() {
  const toolbar = useChartCardToolbar()
  if (!toolbar || !toolbar.hasExportData) return null
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toolbar.handleExport}
      className="h-9 w-9"
      title="Download CSV"
      aria-label="Download CSV"
    >
      <Download className="h-4 w-4" />
    </Button>
  )
}

/** The view toggle + CSV button together (left + right). Convenience for charts
 *  that lay out their own controls row; prefer the split pieces where the CSV
 *  needs to be right-aligned separately from the toggle. */
export function InlineToolbarButtons() {
  return (
    <>
      <InlineViewToggle />
      <InlineCsvButton />
    </>
  )
}

/**
 * Standard expanded-only controls row for `inlineToolbar` charts that have no
 * controls of their own. Dashboard layout: dropdowns/filters on the LEFT; the
 * chart/table view toggle and the Download-CSV button on the RIGHT (CSV
 * furthest right). Renders nothing in the collapsed card.
 */
export function ChartCardToolbarRow({ filters }: { filters?: React.ReactNode }) {
  const toolbar = useChartCardToolbar()
  if (!toolbar) return null
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
      <div className="flex items-center gap-2 flex-wrap">
        {filters}
      </div>
      <div className="flex items-center gap-2">
        <InlineViewToggle />
        <InlineCsvButton />
      </div>
    </div>
  )
}

/** True when an `inlineToolbar` card is currently in table view — charts use
 *  this to hide their plot body so only the controls row + generic table show. */
export function useChartCardTableMode(): boolean {
  return useChartCardToolbar()?.viewMode === 'table'
}
