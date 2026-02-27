"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarClock, AlertTriangle, CheckCircle, Search, BarChart3 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"

interface DashboardData {
  schedules: any[];
  reports: any[];
  stats: {
    totalMonitored: number;
    dueThisMonth: number;
    overdue: number;
    complianceRate: number;
  };
}

export default function MonitoringDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiFetch("/api/project-bank/monitoring")
        if (res.ok) setData(await res.json())
      } catch {} finally { setLoading(false) }
    }
    fetch()
  }, [])

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.schedules;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s: any) =>
        s.project_bank_projects?.name?.toLowerCase().includes(q) ||
        s.project_bank_projects?.project_code?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  const stats = data?.stats || { totalMonitored: 0, dueThisMonth: 0, overdue: 0, complianceRate: 0 };

  return (
    <MainLayout>
      <div className="w-full">
        {/* Header with icon + subtitle */}
        <div className="flex items-center gap-3 mb-6">
          <CalendarClock className="h-7 w-7 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Project monitoring schedules and compliance tracking
            </p>
          </div>
        </div>

        {/* Hero Cards — monochrome icons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Total Monitored</span>
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stats.totalMonitored}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Due This Month</span>
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stats.dueThisMonth}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Overdue</span>
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stats.overdue}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Compliance Rate</span>
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Search — styled like Project List filter bar */}
        <div className="flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-gray-200 mb-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Project</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Sector</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Next Due</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Interval</th>
                  <th className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-2"><div className="h-4 bg-muted animate-pulse rounded w-16" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No monitored projects found</td></tr>
                ) : (
                  filtered.map((s: any) => {
                    const proj = s.project_bank_projects;
                    const today = new Date().toISOString().split('T')[0];
                    const isOverdue = s.next_due_date && s.next_due_date < today;
                    return (
                      <tr
                        key={s.id}
                        className="group hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => router.push(`/project-bank/${s.project_id}`)}
                      >
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-foreground leading-tight">{proj?.name || '—'}</div>
                          <div className="mt-1">
                            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{proj?.project_code}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground">{proj?.sector || '—'}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-foreground'}>
                            {s.next_due_date || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground">Every {s.interval_months}mo</td>
                        <td className="px-4 py-2">
                          <Badge variant={s.is_active ? 'success' : 'gray'}>
                            {s.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
