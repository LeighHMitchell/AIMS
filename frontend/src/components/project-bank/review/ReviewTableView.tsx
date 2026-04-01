"use client"

import { useState, useMemo, type ReactNode } from "react"
import { Inbox } from "lucide-react"
import { getSortIcon, sortableHeaderClasses } from "@/components/ui/table"

export interface ReviewTableColumn {
  key: string
  label: string
  sortable?: boolean
  render?: (project: any) => ReactNode
}

interface ReviewTableViewProps {
  projects: any[]
  columns: ReviewTableColumn[]
  onRowClick: (project: any) => void
  emptyMessage?: string
}

export function ReviewTableView({ projects, columns, onRowClick, emptyMessage }: ReviewTableViewProps) {
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(key)
      setSortDirection('asc')
    }
  }

  const sortedProjects = useMemo(() => {
    if (!sortField) return projects
    return [...projects].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      const valA = a[sortField]
      const valB = b[sortField]
      if (valA == null && valB == null) return 0
      if (valA == null) return dir
      if (valB == null) return -dir
      if (typeof valA === 'number' && typeof valB === 'number') {
        return dir * (valA - valB)
      }
      return dir * String(valA).localeCompare(String(valB))
    })
  }, [projects, sortField, sortDirection])

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Inbox className="h-8 w-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">{emptyMessage || "No projects found"}</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted border-b border-border">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${col.sortable !== false ? sortableHeaderClasses : ''}`}
                onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable !== false && sortField && getSortIcon(col.key, sortField, sortDirection)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedProjects.map((project: any) => (
            <tr
              key={project.id}
              onClick={() => onRowClick(project)}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(project) : (project[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
