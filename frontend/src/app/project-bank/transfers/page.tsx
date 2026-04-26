"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilterBar } from "@/components/ui/filter-bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrendingDown, Plus, Search, Building, ArrowRight, Inbox } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { apiFetch } from "@/lib/api-fetch"
import { SEE_STATUS_LABELS, SEE_TRANSFER_MODE_LABELS, formatCurrency } from "@/lib/project-bank-utils"
import type { SEETransfer, SEETransferStatus } from "@/types/project-bank"

const STATUS_BADGE_VARIANT: Record<SEETransferStatus, string> = {
  draft: 'gray',
  assessment: 'blue',
  valuation: 'amber',
  restructuring: 'purple',
  tender: 'teal',
  transferred: 'success',
  cancelled: 'destructive',
}

export default function TransfersListPage() {
  const router = useRouter()
  const [transfers, setTransfers] = useState<SEETransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchTransfers() {
      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (search) params.set('search', search)

        const res = await apiFetch(`/api/see-transfers?${params.toString()}`)
        if (res.ok) {
          setTransfers(await res.json())
        }
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchTransfers()
  }, [statusFilter, search])

  const stats = {
    total: transfers.length,
    inProgress: transfers.filter(t => !['transferred', 'cancelled', 'draft'].includes(t.status)).length,
    transferred: transfers.filter(t => t.status === 'transferred').length,
    totalValuation: transfers.reduce((sum, t) => sum + (t.valuation_amount || 0), 0),
  }

  return (
    <MainLayout>
      <div className="w-full">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">SEE Transfers</h1>
              <p className="text-muted-foreground mt-1">State Economic Enterprise equitization pipeline</p>
            </div>
          </div>
          <Button onClick={() => router.push('/project-bank/transfers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>

        {/* Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Transfers" value={stats.total} icon={Building} />
          <StatCard label="In Progress" value={stats.inProgress} icon={ArrowRight} />
          <StatCard label="Transferred" value={stats.transferred} icon={TrendingDown} />
          <StatCard label="Total Valuation" value={formatCurrency(stats.totalValuation)} icon={Building} />
        </div>

        {/* Filters — styled like Project List */}
        <FilterBar>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
            <Label className="text-helper text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or ministry..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(SEE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilterBar>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead className="bg-surface-muted">
                  <tr className="border-b bg-surface-muted">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">SEE Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sector</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ministry</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Mode</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Valuation</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : transfers.length === 0 ? (
                    <tr><td colSpan={7} className="p-0"><EmptyState icon={<Inbox className="h-10 w-10 text-muted-foreground" />} title="No transfers found" message="Try adjusting your search or filters." /></td></tr>
                  ) : transfers.map(transfer => (
                    <tr
                      key={transfer.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/project-bank/transfers/${transfer.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{transfer.transfer_code}</td>
                      <td className="px-4 py-2.5 font-medium">{transfer.see_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{transfer.see_sector || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{transfer.see_ministry || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {transfer.transfer_mode ? SEE_TRANSFER_MODE_LABELS[transfer.transfer_mode] || transfer.transfer_mode : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(transfer.valuation_amount)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_BADGE_VARIANT[transfer.status] as any} className="text-[10px]">
                          {SEE_STATUS_LABELS[transfer.status] || transfer.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
