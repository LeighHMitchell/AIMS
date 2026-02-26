"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrendingDown, Plus, Search, Building, ArrowRight } from "lucide-react"
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
            <TrendingDown className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold">SEE Transfers</h1>
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
          {[
            { label: "Total Transfers", value: stats.total, icon: Building },
            { label: "In Progress", value: stats.inProgress, icon: ArrowRight },
            { label: "Transferred", value: stats.transferred, icon: TrendingDown },
            { label: "Total Valuation", value: formatCurrency(stats.totalValuation), icon: Building },
          ].map(card => {
            const Icon = card.icon
            return (
              <Card key={card.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or ministry..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
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
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No transfers found</td></tr>
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
