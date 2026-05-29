"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportChartToCSV } from '@/lib/chart-export'
import { toast } from 'sonner'

interface CsvExportButtonProps {
  /** Rows to export (array of flat objects). Ignored when `onExport` is provided. */
  rows?: any[]
  /** Human title — slugified into the download filename. */
  title?: string
  filename?: string
  /** Escape hatch for charts with bespoke CSV logic; called instead of the default export. */
  onExport?: () => void
  /** Icon-only (default) vs a labelled "Download CSV" button. */
  iconOnly?: boolean
  disabled?: boolean
  className?: string
}

/**
 * The single Download-CSV button used across the analytics dashboard. Wraps the
 * shared `exportChartToCSV` util with the same empty/success toast feedback the
 * chart cards used to duplicate. Pass `rows` for the default export, or
 * `onExport` for charts that build their CSV themselves.
 */
export function CsvExportButton({
  rows,
  title = 'chart',
  filename,
  onExport,
  iconOnly = true,
  disabled,
  className = '',
}: CsvExportButtonProps) {
  const handle = () => {
    if (onExport) {
      onExport()
      return
    }
    if (!rows || rows.length === 0) {
      toast.error('No data available to export')
      return
    }
    exportChartToCSV(rows, filename || title)
    toast.success('Chart data exported successfully')
  }

  return (
    <Button
      variant="outline"
      size={iconOnly ? 'icon' : 'sm'}
      onClick={handle}
      disabled={disabled}
      className={`${iconOnly ? 'h-9 w-9' : 'h-9'} ${className}`.trim()}
      title="Download CSV"
      aria-label="Download CSV"
    >
      <Download className="h-4 w-4" />
      {!iconOnly && <span className="ml-2">Download CSV</span>}
    </Button>
  )
}
