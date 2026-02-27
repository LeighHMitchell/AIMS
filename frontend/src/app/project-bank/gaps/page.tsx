"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Check, MoreVertical } from "lucide-react"
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

/** Format for subtitle summary */
function formatSubtitleCurrency(value: number): string {
  if (value >= 1_000_000_000) return `USD ${(value / 1_000_000_000).toFixed(1)}b`
  if (value >= 1_000_000) return `USD ${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `USD ${(value / 1_000).toFixed(0)}k`
  return `USD ${value.toLocaleString()}`
}

export default function FundingGapsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectBankProject[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await apiFetch("/api/project-bank?funding_gaps=true")
        if (res.ok) setProjects(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetchProjects()
  }, [])

  const copyToClipboard = (text: string, projectId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(projectId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const totalGap = projects.reduce((sum, p) => sum + (p.funding_gap || 0), 0)
  const totalPages = Math.max(1, Math.ceil(projects.length / perPage))
  const paginated = projects.slice((page - 1) * perPage, page * perPage)
  const startIndex = (page - 1) * perPage

  const colCount = 9

  return (
    <MainLayout>
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Funding Gaps</h1>
            <p className="text-muted-foreground text-sm">
              Projects with unsecured financing — {projects.length} projects, {formatSubtitleCurrency(totalGap)} gap
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Project</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Sector</th>
                  <th className="h-12 px-4 text-right align-middle text-sm font-medium text-muted-foreground">Total Cost</th>
                  <th className="h-12 px-4 text-right align-middle text-sm font-medium text-muted-foreground">Secured</th>
                  <th className="h-12 px-4 text-right align-middle text-sm font-medium text-muted-foreground">Gap</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Progress</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-2 text-center align-middle text-sm font-medium text-muted-foreground w-[44px]"></th>
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
                  <tr><td colSpan={colCount} className="px-4 py-8 text-center text-sm text-muted-foreground">No funding gaps found</td></tr>
                ) : (
                  paginated.map(p => {
                    const secured = (p.estimated_cost || 0) - (p.funding_gap || 0)
                    const pct = p.estimated_cost ? Math.round((secured / p.estimated_cost) * 100) : 0
                    const badgeStyle = STATUS_BADGE_STYLES[p.status] || STATUS_BADGE_STYLES.nominated
                    return (
                      <tr
                        key={p.id}
                        className="group hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => router.push(`/project-bank/${p.id}`)}
                      >
                        {/* Project Code + Name merged */}
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-foreground leading-tight">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="group/code flex items-center gap-1">
                              <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{p.project_code}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(p.project_code, p.id)
                                }}
                                className="opacity-0 group-hover/code:opacity-100 transition-opacity duration-200 hover:text-gray-700 flex-shrink-0"
                                title="Copy Project Code"
                              >
                                {copiedId === p.id ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
                        {/* Sector — normal text */}
                        <td className="px-4 py-2 text-sm text-foreground">{p.sector}</td>
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
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
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
          <div className="bg-card rounded-lg border border-border shadow-sm p-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(startIndex + 1, projects.length)} to {Math.min(startIndex + perPage, projects.length)} of {projects.length} projects
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" /> First
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) { pageNum = i + 1; }
                    else if (page <= 3) { pageNum = i + 1; }
                    else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                    else { pageNum = page - 2 + i; }
                    return (
                      <Button key={pageNum} variant="outline" size="sm" onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 p-0 ${page === pageNum ? "bg-slate-200 text-slate-900" : ""}`}>
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  Last <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Items per page:</label>
                <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1) }}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
