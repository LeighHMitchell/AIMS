"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle } from "lucide-react"

export interface ImportRow {
  parcel_code?: string
  name?: string
  state_region?: string
  township?: string
  size_hectares?: number
  classification?: string
  geometry?: any
  errors: string[]
  isValid: boolean
}

interface BulkImportPreviewProps {
  rows: ImportRow[]
}

export function BulkImportPreview({ rows }: BulkImportPreviewProps) {
  const validCount = rows.filter(r => r.isValid).length
  const errorCount = rows.length - validCount

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="text-sm text-muted-foreground">
          {rows.length} parcels found
        </span>
        <Badge variant="success">{validCount} valid</Badge>
        {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface-muted">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Region</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Township</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Size (ha)</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Classification</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Geometry</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, i) => (
                <tr key={i} className={row.isValid ? "" : "bg-red-50"}>
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    {row.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-red-600">{row.errors.join("; ")}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.parcel_code || "—"}</td>
                  <td className="px-3 py-2">{row.name || "—"}</td>
                  <td className="px-3 py-2">{row.state_region || "—"}</td>
                  <td className="px-3 py-2">{row.township || "—"}</td>
                  <td className="px-3 py-2">{row.size_hectares ?? "—"}</td>
                  <td className="px-3 py-2">{row.classification || "—"}</td>
                  <td className="px-3 py-2">
                    {row.geometry ? (
                      <Badge variant="success" className="text-[10px]">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
