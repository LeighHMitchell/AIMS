"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarClock, AlertTriangle, CheckCircle, Search, BarChart3 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { MONITORING_STATUS_LABELS, COMPLIANCE_STATUS_LABELS } from "@/lib/project-bank-utils"

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
        <h1 className="text-2xl font-bold mb-6">Monitoring Dashboard</h1>

        {/* Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Total Monitored</div>
                  <div className="text-2xl font-bold">{stats.totalMonitored}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-8 w-8 text-amber-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Due This Month</div>
                  <div className="text-2xl font-bold">{stats.dueThisMonth}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                  <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Compliance Rate</div>
                  <div className="text-2xl font-bold">{stats.complianceRate}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1 max-w-sm">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sector</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Next Due</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Interval</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded w-48" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No monitored projects found</td></tr>
                ) : (
                  filtered.map((s: any) => {
                    const proj = s.project_bank_projects;
                    const today = new Date().toISOString().split('T')[0];
                    const isOverdue = s.next_due_date && s.next_due_date < today;
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => router.push(`/project-bank/${s.project_id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{proj?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{proj?.project_code}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{proj?.sector || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {s.next_due_date || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">Every {s.interval_months}mo</td>
                        <td className="px-4 py-3">
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
