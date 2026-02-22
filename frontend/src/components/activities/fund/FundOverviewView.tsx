"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-fetch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, Users, Layers, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface FundSummary {
  fundName: string
  status: string
  dateRange: { start: string | null; end: string | null }
  totalPledged: number
  totalCommitted: number
  totalReceived: number
  totalContributions: number
  totalDisbursements: number
  balance: number
  donorCount: number
  childCount: number
  topDonors: { name: string; total: number }[]
  topSectors: { name: string; count: number }[]
  sparkline: { quarter: string; amount: number }[]
}

interface FundOverviewViewProps {
  activityId: string
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function FundOverviewView({ activityId }: FundOverviewViewProps) {
  const [data, setData] = useState<FundSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/activities/${activityId}/fund-summary`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Failed to load fund summary')
          return
        }
        setData(await res.json())
      } catch (e: any) {
        setError(e.message || 'Failed to load fund summary')
      } finally {
        setLoading(false)
      }
    }
    if (activityId) load()
  }, [activityId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{error}</p>
      </div>
    )
  }

  if (!data) return null

  const balanceColor = data.balance > 0 ? 'text-green-600' : data.balance < 0 ? 'text-red-600' : 'text-muted-foreground'
  const BalanceIcon = data.balance > 0 ? TrendingUp : data.balance < 0 ? TrendingDown : Minus

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance */}
        <Card className="border-2 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fund Balance</p>
                <p className={`text-2xl font-bold ${balanceColor}`}>
                  {formatUSD(data.balance)}
                </p>
              </div>
              <div className={`p-3 rounded-full bg-muted ${balanceColor}`}>
                <BalanceIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Contributions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contributions</p>
                <p className="text-2xl font-bold text-foreground">{formatUSD(data.totalContributions)}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  {data.totalPledged > 0 && <span>Pledged: {formatUSD(data.totalPledged)}</span>}
                  {data.totalCommitted > 0 && <span>Committed: {formatUSD(data.totalCommitted)}</span>}
                  {data.totalReceived > 0 && <span>Received: {formatUSD(data.totalReceived)}</span>}
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Disbursements */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Disbursements</p>
                <p className="text-2xl font-bold text-foreground">{formatUSD(data.totalDisbursements)}</p>
                {data.totalContributions > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {((data.totalDisbursements / data.totalContributions) * 100).toFixed(0)}% utilised
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted rounded-lg p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{data.donorCount}</p>
          <p className="text-xs text-muted-foreground">Donors</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <Layers className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{data.childCount}</p>
          <p className="text-xs text-muted-foreground">Child Activities</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Top Donors</p>
          {data.topDonors.length > 0 ? (
            <ul className="space-y-1">
              {data.topDonors.map((d, i) => (
                <li key={i} className="text-xs text-foreground truncate">
                  {d.name} <span className="text-muted-foreground">({formatUSD(d.total)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No contributions yet</p>
          )}
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Top Sectors</p>
          {data.topSectors.length > 0 ? (
            <ul className="space-y-1">
              {data.topSectors.map((s, i) => (
                <li key={i} className="text-xs text-foreground truncate">
                  {s.name} <span className="text-muted-foreground">({s.count} activities)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No sectors assigned</p>
          )}
        </div>
      </div>

      {/* Quarterly Sparkline */}
      {data.sparkline.length > 1 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Disbursements Over Time (Quarterly)</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sparkline}>
                <defs>
                  <linearGradient id="fundSparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3C6255" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3C6255" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatUSD(v)} width={60} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Disbursed']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3C6255"
                  fill="url(#fundSparkGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
