"use client"

import React, { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Maximize2, Download } from 'lucide-react'

export interface CsvExport {
  headers: string[]
  rows: (string | number | null | undefined)[][]
  filename?: string
}

interface ChartExpandButtonProps {
  title: string
  description?: string
  /** Short paragraph rendered below the expanded chart explaining what it shows and how to use it. */
  interpretation?: ReactNode
  /** Filter / sort controls rendered above the expanded chart. Only visible when the dialog is open. */
  controls?: ReactNode
  /**
   * Render the chart at a given pixel height. Called when the dialog opens so the
   * expanded view can fill the dialog's available space.
   */
  render: (height: number) => ReactNode
  /** Function returning the CSV data for the export button. Called on click. */
  csv?: () => CsvExport
}

function downloadCsv({ headers, rows, filename = 'chart-export.csv' }: CsvExport) {
  const escape = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ChartExpandButton({ title, description, interpretation, controls, render, csv }: ChartExpandButtonProps) {
  const [open, setOpen] = useState(false)

  const chartHeight = typeof window === 'undefined'
    ? 600
    : Math.max(
        360,
        Math.floor(window.innerHeight * 0.85)
          - 140
          - (interpretation ? 80 : 0)
          - ((controls || csv) ? 50 : 0)
      )

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={() => setOpen(true)}
        title="Expand chart"
        aria-label="Expand chart"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {(controls || csv) && (
            <div className="flex-shrink-0 mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">{controls}</div>
              {csv && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => downloadCsv(csv())}
                  title="Export CSV"
                  aria-label="Export CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <div className="flex-1 mt-4 min-h-0 overflow-auto">
            {open && render(chartHeight)}
          </div>
          {interpretation && (
            <p className="flex-shrink-0 mt-4 text-body text-muted-foreground leading-relaxed">
              {interpretation}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
