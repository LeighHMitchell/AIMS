"use client"

import React from 'react'
import Link from 'next/link'
import { ChartDataTable, type ChartTableColumn } from '@/components/ui/chart-data-table'

/**
 * Table view for the Outliers charts. Thin wrapper over the shared
 * ChartDataTable so it reads identically to every other analytics table
 * (sticky bg-surface-muted header, click-to-sort, hover rows). Rows are the
 * same objects the chart pushes via onDataChange (also used for CSV export):
 *
 *   { Activity, Detail, Flag, 'Value (USD)' | 'Spend ÷ Budget', 'Activity URL' }
 *
 * 'Activity URL' is intentionally NOT shown as a column (it's folded into the
 * Activity link), but it stays on the row so the CSV export carries a clickable
 * URL for each flagged record.
 */

interface OutlierTableProps {
  rows: Array<Record<string, any>>
  unit: 'usd' | 'ratio'
}

const FLAG_CLASS: Record<string, string> = {
  'Unusually high': 'text-red-700',
  Overspend: 'text-red-700',
  'Unusually low': 'text-amber-700',
  'Nothing spent': 'text-amber-700',
}

export function OutlierTable({ rows, unit }: OutlierTableProps) {
  const valueColumn: ChartTableColumn =
    unit === 'ratio'
      ? {
          key: 'Spend ÷ Budget',
          label: 'Spend ÷ Budget',
          numeric: true,
          format: (v) => `${(Number(v) || 0).toFixed(2)}×`,
        }
      : {
          key: 'Value (USD)',
          // "Value" with a small gray "USD" — matches the muted currency
          // suffix used in the app's other financial tables.
          label: (
            <span>
              Value <span className="text-xs font-normal text-muted-foreground">USD</span>
            </span>
          ),
          numeric: true,
          currency: 'USD',
        }

  const columns: ChartTableColumn[] = [
    {
      key: 'Activity',
      label: 'Activity',
      format: (v, row) =>
        row['Activity URL'] ? (
          <Link
            href={String(row['Activity URL'])}
            target="_blank"
            className="text-primary hover:underline"
          >
            {String(v ?? '')}
          </Link>
        ) : (
          String(v ?? '')
        ),
    },
    { key: 'Detail', label: 'Detail' },
    {
      key: 'Flag',
      label: 'Flag',
      // Plain text (no badge), with a subtle colour cue by severity.
      format: (v) => <span className={FLAG_CLASS[String(v)] ?? 'text-muted-foreground'}>{String(v ?? '')}</span>,
    },
    valueColumn,
  ]

  return (
    <ChartDataTable
      rows={rows}
      columns={columns}
      sortable
      totalsRow={false}
      stripCurrencySuffix={false}
      maxHeight={460}
      emptyMessage="No records cross the fence; this distribution looks clean."
    />
  )
}
