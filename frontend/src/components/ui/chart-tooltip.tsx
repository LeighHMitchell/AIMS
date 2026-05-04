"use client"

import React from 'react'

export interface ChartTooltipRow {
  label: React.ReactNode
  value: React.ReactNode
  color?: string
  code?: string
  bordered?: boolean
  /** Optional third column (e.g. percent, badge). Renders right of the value. */
  extra?: React.ReactNode
  /** Render this row as a section header — label spans, no value or swatch. */
  isGroupHeader?: boolean
}

interface ChartTooltipCardProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  rows: ChartTooltipRow[]
  minWidth?: number | string
  maxWidth?: number | string
  /** When true, body becomes vertically scrollable. */
  scrollable?: boolean
  /** Max body height when scrollable (default 300px). */
  maxBodyHeight?: number | string
  /** Optional content rendered after the rows (e.g. footnote / source attribution). */
  footer?: React.ReactNode
}

export function ChartTooltipCard({
  title,
  subtitle,
  rows,
  minWidth = 200,
  maxWidth,
  scrollable = false,
  maxBodyHeight = 300,
  footer,
}: ChartTooltipCardProps) {
  const hasExtraColumn = rows.some((r) => r.extra !== undefined)
  return (
    <div
      className="bg-card border border-border rounded-lg shadow-lg overflow-hidden"
      style={{ minWidth, maxWidth }}
    >
      <div className="bg-surface-muted px-3 py-2 border-b border-border">
        <p className="font-semibold text-foreground">{title}</p>
        {subtitle && (
          <div className="text-helper text-muted-foreground mt-0.5">{subtitle}</div>
        )}
      </div>
      <div
        className={scrollable ? 'overflow-y-auto' : ''}
        style={scrollable ? { maxHeight: maxBodyHeight } : undefined}
      >
        <div className="p-3">
          <table className="w-full text-body">
            <tbody>
              {rows.map((row, i) => {
                if (row.isGroupHeader) {
                  return (
                    <tr key={i}>
                      <td
                        colSpan={hasExtraColumn ? 3 : 2}
                        className="pt-2 pb-1 text-helper font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {row.label}
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr
                    key={i}
                    className={row.bordered ? 'border-b border-border last:border-b-0' : ''}
                  >
                    <td className="py-1 pr-3">
                      <div className="flex items-center gap-2">
                        {row.color && (
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: row.color }}
                          />
                        )}
                        {row.code && (
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground">
                            {row.code}
                          </code>
                        )}
                        <span className="text-foreground">{row.label}</span>
                      </div>
                    </td>
                    <td className="py-1 text-right font-semibold text-foreground whitespace-nowrap">
                      {row.value}
                    </td>
                    {hasExtraColumn && (
                      <td className="py-1 pl-3 text-right text-muted-foreground whitespace-nowrap">
                        {row.extra}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {footer && (
        <div className="px-3 py-2 border-t border-border bg-surface-muted text-helper text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  )
}
