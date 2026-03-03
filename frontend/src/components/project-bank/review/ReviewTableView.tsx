"use client"

import type { ReactNode } from "react"
import { Inbox } from "lucide-react"

export interface ReviewTableColumn {
  key: string
  label: string
  render?: (project: any) => ReactNode
}

interface ReviewTableViewProps {
  projects: any[]
  columns: ReviewTableColumn[]
  onRowClick: (project: any) => void
  emptyMessage?: string
}

export function ReviewTableView({ projects, columns, onRowClick, emptyMessage }: ReviewTableViewProps) {
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
              <th key={col.key} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project: any) => (
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
