"use client"

import React, { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XlsxWorkbookBuilder } from '@/lib/exports'
import { toast } from "sonner"
import type { ReportHeader } from "./ReportCard"

export interface WorkbookSheet {
  /** API endpoint returning `{ data: Row[] }`. */
  endpoint: string
  /** Excel tab name. */
  sheetName: string
  /** Column headers ({ key, label }) — reused from the matching CSV report. */
  headers: ReportHeader[]
}

export interface WorkbookReportCardProps {
  title: string
  description: string
  filename: string
  sheets: WorkbookSheet[]
}

/**
 * A report card that downloads a single multi-sheet .xlsx workbook — one tab
 * per endpoint — instead of a single CSV. Reuses the same `{ data }` endpoints
 * and `{ key, label }` headers as the CSV report cards.
 */
export function WorkbookReportCard({ title, description, filename, sheets }: WorkbookReportCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const wb = new XlsxWorkbookBuilder()
      let total = 0

      for (const sheet of sheets) {
        const response = await fetch(sheet.endpoint)
        const result = await response.json()
        if (!response.ok || result.error) {
          throw new Error(result.error || `Failed to fetch ${sheet.sheetName}`)
        }
        const data = (result.data || []) as Record<string, unknown>[]
        total += data.length
        const columns = sheet.headers.map(h => ({ header: h.label, accessor: h.key }))
        wb.addSheet(sheet.sheetName, columns, data)
      }

      if (total === 0) {
        toast.warning('No data available', {
          description: 'This report has no data to export.',
        })
        return
      }

      const date = new Date().toISOString().split('T')[0]
      wb.download(`${filename}_${date}`)

      toast.success('Report downloaded', {
        description: `${title} has been exported to Excel.`,
      })
    } catch (error) {
      console.error('Error downloading workbook:', error)
      toast.error('Download failed', {
        description: error instanceof Error ? error.message : 'An error occurred while generating the report.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-full hover:shadow-card-hover transition-shadow">
      <CardHeader className="pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="mt-1 text-body line-clamp-2">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0 mt-auto flex justify-end">
        <Button
          onClick={handleDownload}
          disabled={isLoading}
          variant="outline"
          size="icon"
          className="h-9 w-9"
          title="Download Excel (.xlsx)"
          aria-label="Download Excel workbook"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
