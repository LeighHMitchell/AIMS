"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { AlertTriangle, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FullPagination } from "@/components/ui/full-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/api-fetch"
import { STATUS_LABELS } from "@/lib/project-bank-utils"
import type { ProjectBankProject, ProjectStatus } from "@/types/project-bank"

/** Status → colour-palette badge styles (consistent with Project List) */
const STATUS_BADGE_STYLES: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  nominated:      { bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },
  screening:      { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  appraisal:      { bg: '#7b95a7', text: '#ffffff', border: '#4c5568' },
  approved:       { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  implementation: { bg: '#dc2625', text: '#ffffff', border: '#dc2625' },
  completed:      { bg: '#f1f4f8', text: '#7b95a7', border: '#cfd0d5' },
  rejected:       { bg: '#dc2625', text: '#ffffff', border: '#dc2625' },
}

/** Format cost as "USD 100m" / "USD 1.2b" style */
function formatCostUSD(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}b`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return value.toLocaleString()
}

export default function FundingGapsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectBankProject[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortField, setSortField] = useState<string>("funding_gap")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await apiFetch("/api/project-bank?funding_gaps=true")
        if (res.ok) setProjects(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetchProjects()
  }, [])

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      let aVal: any, bVal: any
      if (sortField === 'secured') {
        aVal = (a.estimated_cost || 0) - (a.funding_gap || 0)
        bVal = (b.estimated_cost || 0) - (b.funding_gap || 0)
      } else if (sortField === 'progress') {
        aVal = a.estimated_cost ? ((a.estimated_cost - (a.funding_gap || 0)) / a.estimated_cost) : 0
        bVal = b.estimated_cost ? ((b.estimated_cost - (b.funding_gap || 0)) / b.estimated_cost) : 0
      } else {
        aVal = (a as any)[sortField]
        bVal = (b as any)[sortField]
      }
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [projects, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const paginated = sorted.slice((page - 1) * perPage, page * perPage)
  const startIndex = (page - 1) * perPage

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" />
  }

  const SortHeader = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => {
    const isRight = className?.includes('text-right')
    return (
      <th
        className={`h-10 px-4 align-middle text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors select-none whitespace-nowrap ${className || 'text-left'}`}
        onClick={() => handleSort(field)}
      >
        <span className={`flex items-center gap-1 ${isRight ? 'justify-end' : ''}`}>
          {children}
          <SortIcon field={field} />
        </span>
      </th>
    )
  }

  const colCount = 8

  return (
    <MainLayout>
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Funding Gaps</h1>
            <p className="text-muted-foreground mt-1">
              Projects in the pipeline that have not yet secured full financing commitments
            </p>
          </div>
        </div>

        <div className="bg-card rounded-md ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <SortHeader field="name">Project Title</SortHeader>
                  <SortHeader field="sector">Sector</SortHeader>
                  <SortHeader field="estimated_cost" className="text-right">Total Cost</SortHeader>
                  <SortHeader field="secured" className="text-right">Secured</SortHeader>
                  <SortHeader field="funding_gap" className="text-right">Gap</SortHeader>
                  <SortHeader field="progress">Progress</SortHeader>
                  <SortHeader field="status">Status</SortHeader>
                  <th className="h-10 px-2 text-center align-middle text-xs font-medium text-muted-foreground w-[44px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: colCount }).map((_, j) => (
                        <td key={j} className="px-4 py-2"><div className="h-4 bg-muted animate-pulse rounded w-16" /></td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={colCount} className="p-0"><EmptyState icon={<Inbox className="h-10 w-10 text-muted-foreground" />} title="No funding gaps found" message="Try adjusting your search or filters." /></td></tr>
                ) : (
                  paginated.map(p => {
                    const secured = (p.estimated_cost || 0) - (p.funding_gap || 0)
                    const pct = p.estimated_cost ? Math.round((secured / p.estimated_cost) * 100) : 0
                    const badgeStyle = STATUS_BADGE_STYLES[p.status] || STATUS_BADGE_STYLES.nominated
                    return (
                      <tr
                        key={p.id}
                        className="group hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/project-bank/${p.id}`)}
                      >
                        {/* Project Code + Name merged — single line like Project List */}
                        <td className="px-4 py-2 min-w-[200px]">
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          {p.project_code && (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-2">{p.project_code}</span>
                          )}
                        </td>
                        {/* Sector — normal text */}
                        <td className="px-4 py-2">
                          <div className="text-sm text-foreground leading-tight">{p.sector}</div>
                          {p.sub_sector && (
                            <div className="text-xs text-muted-foreground mt-0.5">{p.sub_sector}</div>
                          )}
                        </td>
                        {/* Total Cost — USD styled */}
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap font-medium">
                          {p.estimated_cost != null ? (
                            <span><span className="text-muted-foreground font-normal">USD</span> {formatCostUSD(p.estimated_cost)}</span>
                          ) : '—'}
                        </td>
                        {/* Secured — USD styled */}
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap font-medium">
                          <span><span className="text-muted-foreground font-normal">USD</span> {formatCostUSD(secured)}</span>
                        </td>
                        {/* Gap — USD styled, red */}
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap font-semibold" style={{ color: '#dc2625' }}>
                          <span><span className="text-muted-foreground font-normal">USD</span> {formatCostUSD(p.funding_gap)}</span>
                        </td>
                        {/* Progress bar — palette colours */}
                        <td className="px-4 py-2">
                          <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#cfd0d5' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#7b95a7' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        </td>
                        {/* Status — colour palette badge */}
                        <td className="px-4 py-2">
                          <span
                            className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: badgeStyle.bg,
                              color: badgeStyle.text,
                              border: `1px solid ${badgeStyle.border}`,
                            }}
                          >
                            {STATUS_LABELS[p.status]}
                          </span>
                        </td>
                        {/* Kebab menu */}
                        <td className="px-2 py-2 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/project-bank/${p.id}`)
                              }}>
                                View Project
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/project-bank/${p.id}?edit=true`)
                              }}>
                                Edit Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {projects.length > 0 && (
          <FullPagination
            page={page}
            totalPages={totalPages}
            totalItems={projects.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemLabel="projects"
          />
        )}
      </div>
    </MainLayout>
  )
}
