"use client"

import React from 'react'
import { ExpandedOnly } from '@/lib/chart-expansion-context'
import { CsvExportButton } from '@/components/ui/csv-export-button'

interface ChartToolbarRowProps {
  /** Left-aligned chart-specific filters / dropdowns. */
  filters?: React.ReactNode
  /** Right-aligned controls placed before the CSV button (e.g. a chart/table view toggle). */
  children?: React.ReactNode
  /** CSV export config; omit to render no CSV button. Pass `rows`+`title`, or `onExport` for bespoke CSV. */
  csv?: { rows?: any[]; title?: string; filename?: string; onExport?: () => void }
  className?: string
}

/**
 * The standard expanded-view controls line for analytics charts: dropdowns/
 * filters on the LEFT, and a right-aligned group holding the chart/table view
 * toggle (`children`) then the Download-CSV button furthest right. Renders
 * nothing in the collapsed card, so collapsed views stay clean (just the card's
 * ƒ + expand). With no `filters` it produces the thin CSV-only line used by
 * charts that have no other controls.
 *
 * Must be rendered inside a chart card (descendant of its ChartExpansionProvider).
 */
export function ChartToolbarRow({ filters, children, csv, className = '' }: ChartToolbarRowProps) {
  return (
    <ExpandedOnly>
      <div className={`flex items-center justify-between gap-2 flex-wrap mb-4 ${className}`.trim()}>
        <div className="flex items-center gap-2 flex-wrap">
          {filters}
        </div>
        <div className="flex items-center gap-2">
          {children}
          {csv && <CsvExportButton {...csv} />}
        </div>
      </div>
    </ExpandedOnly>
  )
}
