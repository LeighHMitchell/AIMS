"use client"

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Grid3x3 } from 'lucide-react'
import { formatCurrencyPrecise } from '@/lib/format'
import { getSortIcon, sortableHeaderClasses } from '@/components/ui/table'
import { getColorScaleBackground } from '@/lib/chart-colors'

/**
 * ChartDataTable — the SINGLE source of truth for every "table view" on the
 * analytics dashboard (and anywhere a chart toggles to a table). Consolidates
 * the styling that used to be duplicated in FinancialTotalsBarChart's inline
 * table and CompactChartCard.renderTableView, so all tables read the same way:
 *
 *   - sticky `bg-surface-muted` header, hover rows, right-aligned currency,
 *     tabular-nums, footer column totals + (optional) grand total
 *   - click-to-sort headers with a chevron (reuses getSortIcon /
 *     sortableHeaderClasses from ui/table)
 *   - colored series squares in header cells (FinancialTotals parity)
 *   - optional per-row Total column (FinancialTotals / All Donors)
 *   - horizontal + vertical scroll (overflow-auto + maxHeight)
 *
 * Presentational only — no data fetching. Callers either pass a plain
 * `rows` array of objects (headers derived from the keys, matching the old
 * generic renderer) or an explicit `columns` spec for full control.
 */

export type ChartTableValue = string | number | null | undefined

export interface ChartTableColumn {
  /** Key into each row object. */
  key: string
  /** Display label; defaults to a Title-Cased version of `key`. May be a node
   *  (e.g. a CodeChip + text) for headers that show a gray-monospace code. */
  label?: React.ReactNode
  /** Force numeric treatment (right-align, tabular-nums, summable). Defaults to auto: any row value is a number. */
  numeric?: boolean
  /** Cell/header alignment. Defaults to numeric→right, else left. */
  align?: 'left' | 'right'
  /** ISO currency code for this column; falls back to the table `currency`. */
  currency?: string
  /** Format as a plain number (thousands-separated, no currency) — for counts. */
  plainNumber?: boolean
  /** Hex color for the header square; overrides `colorMap[key]`. */
  color?: string
  /** Custom cell renderer (e.g. composite label, percentage, plain count). */
  format?: (value: ChartTableValue, row: Record<string, ChartTableValue>) => React.ReactNode
  /** Whether this column is clickable to sort; defaults to the table `sortable`. */
  sortable?: boolean
  /** Whether this numeric column contributes to row/footer totals. Defaults to `numeric` (so a % column can opt out). */
  includeInTotal?: boolean
}

export interface ChartDataTableProps {
  rows: Array<Record<string, any>>
  /** Explicit column order/spec. Omitted → derived from Object.keys(rows[0]). */
  columns?: ChartTableColumn[]
  /** key → hex; renders a colored square in the matching header cell. */
  colorMap?: Record<string, string>
  /** Table-wide default currency. */
  currency?: string
  /** Enable click-to-sort headers. Default true. */
  sortable?: boolean
  /** Show the footer totals row. Default: true when any numeric column exists. */
  totalsRow?: boolean
  /** Append a per-row Total column (sum of includeInTotal columns). Default false. */
  totalsColumn?: boolean
  totalsColumnLabel?: string
  /** Label for the footer's first cell. Default 'Total'. */
  totalLabel?: string
  /** Max height before vertical scroll. Default 500 (px). */
  maxHeight?: number | string
  /** Parse a trailing "(EUR)" from header keys → currency, strip from label. Default true. */
  stripCurrencySuffix?: boolean
  /** Override number formatting (value, currency) → string. Default formatCurrencyPrecise. */
  formatNumber?: (value: number, currency: string) => string
  className?: string
  emptyMessage?: string
  /**
   * Excel-style color scale: tint each numeric column's cells light→dark by
   * magnitude (per-column min→max). When omitted, the table manages it itself
   * and shows a built-in on/off toggle above the table. Pass a boolean to
   * control it externally (the built-in toggle is then hidden).
   */
  colorScale?: boolean
  /** Hide the built-in color-scale toggle button (e.g. a caller renders its own). */
  hideColorScaleToggle?: boolean
}

const CURRENCY_SUFFIX = /\(([A-Z]{3})\)\s*$/
const CURRENCY_SUFFIX_STRIP = /\s*\([A-Z]{3}\)\s*$/

/**
 * Gray monospace code chip — shared so IATI / sector / transaction codes look
 * identical everywhere (table headers, merged cells, dropdowns). Mirrors the
 * `bg-muted text-muted-foreground font-mono` chip used across the dashboard.
 */
export function CodeChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn("px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs", className)}>
      {children}
    </code>
  )
}

// CamelCase / single-word → Title Case ("budgetYear" → "Budget Year").
// Strings that already contain spaces are left as-is.
function titleCaseHeader(raw: string): string {
  return raw.includes(' ')
    ? raw
    : raw.charAt(0).toUpperCase() + raw.slice(1).replace(/([A-Z])/g, ' $1')
}

interface ResolvedColumn {
  key: string
  label: React.ReactNode
  numeric: boolean
  align: 'left' | 'right'
  currency: string
  plainNumber: boolean
  color?: string
  format?: (value: ChartTableValue, row: Record<string, ChartTableValue>) => React.ReactNode
  sortable: boolean
  includeInTotal: boolean
}

export function ChartDataTable({
  rows,
  columns,
  colorMap,
  currency = 'USD',
  sortable = true,
  totalsRow,
  totalsColumn = false,
  totalsColumnLabel = 'Total',
  totalLabel = 'Total',
  maxHeight = 500,
  stripCurrencySuffix = true,
  formatNumber,
  className,
  emptyMessage = 'No data available to display in table view',
  colorScale,
  hideColorScaleToggle = false,
}: ChartDataTableProps) {
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  // Uncontrolled by default (with a built-in toggle); a `colorScale` prop makes
  // it controlled and hides the toggle.
  const [internalColorScale, setInternalColorScale] = useState(false)
  const isColorScaleControlled = colorScale !== undefined
  const colorScaleOn = isColorScaleControlled ? (colorScale as boolean) : internalColorScale

  const resolvedColumns: ResolvedColumn[] = useMemo(() => {
    const specs: ChartTableColumn[] = columns && columns.length
      ? columns
      : (rows.length ? Object.keys(rows[0]).map((key) => ({ key })) : [])
    return specs.map((col) => {
      const suffix = stripCurrencySuffix ? col.key.match(CURRENCY_SUFFIX) : null
      const cleanKey = stripCurrencySuffix ? col.key.replace(CURRENCY_SUFFIX_STRIP, '') : col.key
      const numeric = col.numeric ?? rows.some((r) => typeof r[col.key] === 'number')
      return {
        key: col.key,
        label: col.label ?? titleCaseHeader(cleanKey),
        numeric,
        align: col.align ?? (numeric ? 'right' : 'left'),
        currency: col.currency ?? suffix?.[1] ?? currency,
        plainNumber: col.plainNumber ?? false,
        color: col.color ?? colorMap?.[col.key],
        format: col.format,
        sortable: (col.sortable ?? sortable) && rows.length > 1,
        includeInTotal: col.includeInTotal ?? numeric,
      }
    })
  }, [columns, rows, stripCurrencySuffix, currency, colorMap, sortable])

  const displayRows = useMemo(() => {
    if (!sortField) return rows
    const col = resolvedColumns.find((c) => c.key === sortField)
    return rows.slice().sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      let cmp: number
      if (col?.numeric) {
        cmp = (Number(av) || 0) - (Number(bv) || 0)
      } else if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''))
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [rows, sortField, sortOrder, resolvedColumns])

  // Per-column min/max for the color scale. Each numeric column is normalized
  // independently (columns mix units — currency vs counts vs %), so the tint
  // reflects each column's own range, not the whole table's.
  const colorScaleRanges = useMemo(() => {
    if (!colorScaleOn) return null
    const ranges: Record<string, { min: number; max: number }> = {}
    for (const col of resolvedColumns) {
      if (!col.numeric) continue
      let min = Infinity
      let max = -Infinity
      for (const row of rows) {
        const v = Number(row[col.key])
        if (!Number.isFinite(v)) continue
        if (v < min) min = v
        if (v > max) max = v
      }
      if (min !== Infinity && max !== -Infinity) ranges[col.key] = { min, max }
    }
    return ranges
  }, [colorScaleOn, resolvedColumns, rows])

  // Range for the optional per-row Total column (its values are computed, not
  // a row key) so it scales alongside the rest of the table.
  const totalsColumnRange = useMemo(() => {
    if (!colorScaleOn || !totalsColumn) return null
    let min = Infinity
    let max = -Infinity
    for (const row of rows) {
      const v = resolvedColumns.reduce(
        (sum, c) => (c.includeInTotal ? sum + (Number(row[c.key]) || 0) : sum),
        0,
      )
      if (v < min) min = v
      if (v > max) max = v
    }
    return min !== Infinity ? { min, max } : null
  }, [colorScaleOn, totalsColumn, rows, resolvedColumns])

  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
    )
  }

  const fmt = formatNumber ?? formatCurrencyPrecise
  const firstColKey = resolvedColumns[0]?.key
  const anyNumeric = resolvedColumns.some((c) => c.numeric)
  const showTotalsRow = (totalsRow ?? true) && anyNumeric

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(key)
      setSortOrder('asc')
    }
  }

  const columnTotal = (col: ResolvedColumn) =>
    rows.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0)
  const rowTotal = (row: Record<string, any>) =>
    resolvedColumns.reduce((sum, c) => (c.includeInTotal ? sum + (Number(row[c.key]) || 0) : sum), 0)
  const grandTotal = rows.reduce((sum, row) => sum + rowTotal(row), 0)

  const renderCell = (col: ResolvedColumn, row: Record<string, any>): React.ReactNode => {
    const raw = row[col.key]
    if (col.format) return col.format(raw, row)
    if (col.plainNumber) return (Number(raw) || 0).toLocaleString()
    if (col.numeric) return fmt(Number(raw) || 0, col.currency)
    return String(raw ?? '')
  }

  // Color-scale background for one numeric cell, or undefined when the scale is
  // off / value missing / the column has no spread (all values equal).
  const cellBg = (
    range: { min: number; max: number } | null | undefined,
    value: number,
  ): string | undefined => {
    if (!range || !Number.isFinite(value) || range.max <= range.min) return undefined
    return getColorScaleBackground((value - range.min) / (range.max - range.min))
  }

  const showColorScaleToggle = !isColorScaleControlled && !hideColorScaleToggle && anyNumeric

  return (
    <div className="flex flex-col gap-2">
      {showColorScaleToggle && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant={colorScaleOn ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setInternalColorScale((v) => !v)}
            className="h-8 gap-1.5"
            aria-pressed={colorScaleOn}
            title={colorScaleOn ? 'Turn off color scale' : 'Shade cells by value (color scale)'}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Color scale
          </Button>
        </div>
      )}
      <div className={cn("overflow-auto rounded-md border", className)} style={{ maxHeight }}>
      <table className="w-full text-body">
        <thead className="bg-surface-muted sticky top-0 z-10">
          <tr>
            {resolvedColumns.map((col) => (
              <th
                key={col.key}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  sortField === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined
                }
                className={cn(
                  "px-4 py-3 font-medium text-foreground border-b whitespace-nowrap",
                  col.align === 'right' ? "text-right" : "text-left",
                  col.sortable && sortableHeaderClasses,
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2",
                    col.align === 'right' ? "justify-end" : "justify-start",
                  )}
                >
                  {col.color && (
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                  )}
                  <span>{col.label}</span>
                  {col.sortable && getSortIcon(col.key, sortField ?? '', sortOrder)}
                </div>
              </th>
            ))}
            {totalsColumn && (
              <th className="text-right px-4 py-3 font-medium text-foreground border-b whitespace-nowrap">
                {totalsColumnLabel}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => (
            <tr key={idx} className="border-b border-border hover:bg-muted/50">
              {resolvedColumns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-foreground",
                    col.align === 'right' ? "text-right" : "text-left",
                    col.numeric && "tabular-nums",
                    col.key === firstColKey && "font-medium",
                  )}
                  style={
                    colorScaleOn && col.numeric
                      ? { backgroundColor: cellBg(colorScaleRanges?.[col.key], Number(row[col.key])) }
                      : undefined
                  }
                >
                  {renderCell(col, row)}
                </td>
              ))}
              {totalsColumn && (
                <td
                  className="text-right px-4 py-2.5 text-foreground font-semibold tabular-nums"
                  style={
                    colorScaleOn ? { backgroundColor: cellBg(totalsColumnRange, rowTotal(row)) } : undefined
                  }
                >
                  {fmt(rowTotal(row), currency)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {showTotalsRow && (
          <tfoot className="bg-muted">
            <tr>
              {resolvedColumns.map((col, i) => {
                if (!col.numeric) {
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 font-semibold text-foreground border-t-2 border-border",
                        col.align === 'right' ? "text-right" : "text-left",
                      )}
                    >
                      {i === 0 ? totalLabel : ''}
                    </td>
                  )
                }
                return (
                  <td
                    key={col.key}
                    className="text-right px-4 py-3 font-semibold text-foreground border-t-2 border-border tabular-nums"
                  >
                    {col.includeInTotal ? (col.plainNumber ? columnTotal(col).toLocaleString() : fmt(columnTotal(col), col.currency)) : ''}
                  </td>
                )
              })}
              {totalsColumn && (
                <td className="text-right px-4 py-3 font-bold text-foreground border-t-2 border-border tabular-nums">
                  {fmt(grandTotal, currency)}
                </td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
      </div>
    </div>
  )
}
