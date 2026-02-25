"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { formatCurrency, STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/lib/project-bank-utils"
import type { ProjectBankProject } from "@/types/project-bank"

export default function FundingGapsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectBankProject[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await apiFetch("/api/project-bank?funding_gaps=true")
        if (res.ok) setProjects(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetchProjects()
  }, [])

  const totalGap = projects.reduce((sum, p) => sum + (p.funding_gap || 0), 0)
  const totalPages = Math.max(1, Math.ceil(projects.length / perPage))
  const paginated = projects.slice((page - 1) * perPage, page * perPage)
  const startIndex = (page - 1) * perPage

  return (
    <MainLayout>
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-7 w-7 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold">Funding Gaps</h1>
            <p className="text-muted-foreground text-sm">
              Projects with unsecured financing — {projects.length} projects, {formatCurrency(totalGap)} gap
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Code</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Project</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Sector</th>
                  <th className="h-12 px-4 text-right align-middle text-sm font-medium text-muted-foreground">Total Cost</th>
                  <th className="h-12 px-4 text-right align-middle text-sm font-medium text-muted-foreground">Secured</th>
                  <th className="h-12 px-4 text-right align-middle text-sm font-medium text-muted-foreground">Gap</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Progress</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-2"><div className="h-4 bg-muted animate-pulse rounded w-16" /></td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No funding gaps found</td></tr>
                ) : (
                  paginated.map(p => {
                    const secured = (p.estimated_cost || 0) - (p.funding_gap || 0)
                    const pct = p.estimated_cost ? Math.round((secured / p.estimated_cost) * 100) : 0
                    return (
                      <tr
                        key={p.id}
                        className="group hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => router.push(`/project-bank/${p.id}`)}
                      >
                        <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{p.project_code}</td>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.nominating_ministry}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{p.sector}</td>
                        <td className="px-4 py-2 text-sm font-mono text-right">{formatCurrency(p.estimated_cost)}</td>
                        <td className="px-4 py-2 text-sm font-mono text-right text-green-600">{formatCurrency(secured)}</td>
                        <td className="px-4 py-2 text-sm font-mono text-right text-red-600 font-semibold">{formatCurrency(p.funding_gap)}</td>
                        <td className="px-4 py-2">
                          <div className="w-20 h-2 bg-red-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={STATUS_BADGE_VARIANT[p.status] as any}>{STATUS_LABELS[p.status]}</Badge>
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
