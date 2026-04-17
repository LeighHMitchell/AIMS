"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { getSortIcon, sortableHeaderClasses } from "@/components/ui/table"
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

  type SortField = 'status' | 'code' | 'name' | 'region' | 'township' | 'size' | 'classification';
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'status':
          cmp = Number(a.isValid) - Number(b.isValid);
          break;
        case 'code':
          cmp = (a.parcel_code || '').localeCompare(b.parcel_code || '');
          break;
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'region':
          cmp = (a.state_region || '').localeCompare(b.state_region || '');
          break;
        case 'township':
          cmp = (a.township || '').localeCompare(b.township || '');
          break;
        case 'size':
          cmp = (a.size_hectares || 0) - (b.size_hectares || 0);
          break;
        case 'classification':
          cmp = (a.classification || '').localeCompare(b.classification || '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortField, sortDirection]);

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
            <thead className="bg-surface-muted">
              <tr className="border-b bg-surface-muted">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                <th className={`text-left px-3 py-2 font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('status')}>
                  <span className="flex items-center gap-1">Status {getSortIcon('status', sortField, sortDirection)}</span>
                </th>
                <th className={`text-left px-3 py-2 font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('code')}>
                  <span className="flex items-center gap-1">Code {getSortIcon('code', sortField, sortDirection)}</span>
                </th>
                <th className={`text-left px-3 py-2 font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">Name {getSortIcon('name', sortField, sortDirection)}</span>
                </th>
                <th className={`text-left px-3 py-2 font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('region')}>
                  <span className="flex items-center gap-1">Region {getSortIcon('region', sortField, sortDirection)}</span>
                </th>
                <th className={`text-left px-3 py-2 font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('township')}>
                  <span className="flex items-center gap-1">Township {getSortIcon('township', sortField, sortDirection)}</span>
                </th>
                <th className={`text-left px-3 py-2 font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('size')}>
                  <span className="flex items-center gap-1">Size (ha) {getSortIcon('size', sortField, sortDirection)}</span>
                </th>
                <th className={`text-left px-3 py-2 font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('classification')}>
                  <span className="flex items-center gap-1">Classification {getSortIcon('classification', sortField, sortDirection)}</span>
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Geometry</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRows.map((row, i) => (
                <tr key={i} className={row.isValid ? "" : "bg-destructive/10"}>
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    {row.isValid ? (
                      <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-destructive">{row.errors.join("; ")}</span>
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
