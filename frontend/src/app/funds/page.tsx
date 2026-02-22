"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api-fetch"
import { useRouter } from "next/navigation"
import { Search, DollarSign, Users, Layers, TrendingUp, ArrowUpDown, Wallet } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { useLoadingBar } from "@/hooks/useLoadingBar"

interface FundSummary {
  id: string
  title: string
  status: string
  dateRange: { start: string | null; end: string | null }
  totalContributions: number
  totalDisbursements: number
  balance: number
  childCount: number
  topDonors: { name: string; total: number }[]
  topSectors: { name: string; count: number }[]
  sparkline: { quarter: string; amount: number }[]
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

const statusColors: Record<string, string> = {
  'Pipeline/identification': 'bg-muted text-gray-700',
  'Implementation': 'bg-blue-100 text-blue-700',
  'Completion': 'bg-green-100 text-green-700',
  'Post-completion': 'bg-purple-100 text-purple-700',
  'Cancelled': 'bg-red-100 text-red-700',
  'Suspended': 'bg-yellow-100 text-yellow-700',
}

export default function FundsPage() {
  const router = useRouter()
  const [funds, setFunds] = useState<FundSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("title")
  const [statusFilter, setStatusFilter] = useState("all")

  useLoadingBar(loading)

  const loadFunds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('sort', sortBy)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await apiFetch(`/api/funds?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to load funds')
        return
      }
      const data = await res.json()
      setFunds(data.funds || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load funds')
    } finally {
      setLoading(false)
    }
  }, [sortBy, statusFilter])

  useEffect(() => {
    loadFunds()
  }, [loadFunds])

  const filteredFunds = searchQuery
    ? funds.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : funds

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="h-8 w-8 text-[#3C6255]" />
            Pooled Funds
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of all pooled and trust fund activities with contribution and disbursement summaries.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search funds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pipeline/identification">Pipeline</SelectItem>
              <SelectItem value="Implementation">Implementation</SelectItem>
              <SelectItem value="Completion">Completion</SelectItem>
              <SelectItem value="Post-completion">Post-completion</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Name</SelectItem>
              <SelectItem value="contributions">Total Contributions</SelectItem>
              <SelectItem value="balance">Balance</SelectItem>
              <SelectItem value="children">Child Activities</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        {!loading && filteredFunds.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{filteredFunds.length}</p>
              <p className="text-xs text-muted-foreground">Total Funds</p>
            </div>
            <div className="bg-card rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {formatUSD(filteredFunds.reduce((s, f) => s + f.totalContributions, 0))}
              </p>
              <p className="text-xs text-muted-foreground">Total Contributions</p>
            </div>
            <div className="bg-card rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {formatUSD(filteredFunds.reduce((s, f) => s + f.totalDisbursements, 0))}
              </p>
              <p className="text-xs text-muted-foreground">Total Disbursements</p>
            </div>
            <div className="bg-card rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {filteredFunds.reduce((s, f) => s + f.childCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Child Activities</p>
            </div>
          </div>
        )}

        {/* Fund Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground"><p>{error}</p></div>
        ) : filteredFunds.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3" />
            <p className="text-lg font-medium">No pooled funds found</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Mark an activity as a pooled fund to see it here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFunds.map(fund => {
              const balanceColor = fund.balance > 0 ? 'text-green-600' : fund.balance < 0 ? 'text-red-600' : 'text-muted-foreground'
              const utilisation = fund.totalContributions > 0
                ? ((fund.totalDisbursements / fund.totalContributions) * 100).toFixed(0)
                : '0'

              return (
                <Card
                  key={fund.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border border-border"
                  onClick={() => router.push(`/activities/${fund.id}?section=fund-overview`)}
                >
                  <CardContent className="pt-5 pb-5">
                    {/* Title and status */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 flex-1 mr-2">
                        {fund.title}
                      </h3>
                      {fund.status && (
                        <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[fund.status] || ''}`}>
                          {fund.status}
                        </Badge>
                      )}
                    </div>

                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Contributions</p>
                        <p className="text-sm font-semibold">{formatUSD(fund.totalContributions)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Disbursed</p>
                        <p className="text-sm font-semibold">{formatUSD(fund.totalDisbursements)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={`text-sm font-semibold ${balanceColor}`}>{formatUSD(fund.balance)}</p>
                      </div>
                    </div>

                    {/* Utilisation bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{utilisation}% utilised</span>
                        <span>{fund.childCount} child activit{fund.childCount !== 1 ? 'ies' : 'y'}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-[#3C6255] h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(parseFloat(utilisation), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Top donors and sectors */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Top Donors</p>
                        {fund.topDonors.length > 0 ? (
                          fund.topDonors.map((d, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">{d.name}</p>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">-</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Top Sectors</p>
                        {fund.topSectors.length > 0 ? (
                          fund.topSectors.map((s, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">{s.name}</p>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">-</p>
                        )}
                      </div>
                    </div>

                    {/* Sparkline */}
                    {fund.sparkline.length > 1 && (
                      <div className="h-12">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={fund.sparkline}>
                            <Area
                              type="monotone"
                              dataKey="amount"
                              stroke="#3C6255"
                              fill="#3C6255"
                              fillOpacity={0.1}
                              strokeWidth={1.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Date range */}
                    {(fund.dateRange.start || fund.dateRange.end) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {fund.dateRange.start && new Date(fund.dateRange.start).toLocaleDateString()}
                        {fund.dateRange.start && fund.dateRange.end && ' — '}
                        {fund.dateRange.end && new Date(fund.dateRange.end).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
