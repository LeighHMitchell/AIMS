"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Layers, CheckCircle, AlertTriangle } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts"
import { apiFetch } from "@/lib/api-fetch"
import { PARCEL_STATUS_LABELS, PARCEL_STATUS_COLORS, formatHectares } from "@/lib/land-bank-utils"
import { ParcelStatusBadge } from "@/components/land-bank/ParcelStatusBadge"
import { CHART_COLOR_PALETTE, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors"
import type { LandBankStats, ParcelStatus } from "@/types/land-bank"

const STATUS_CHART_COLORS: Record<string, string> = {
  available: PARCEL_STATUS_COLORS.available,
  reserved: PARCEL_STATUS_COLORS.reserved,
  allocated: PARCEL_STATUS_COLORS.allocated,
  disputed: PARCEL_STATUS_COLORS.disputed,
}

export default function LandBankDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<LandBankStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await apiFetch("/api/land-bank/stats")
        if (res.ok) setStats(await res.json())
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const heroCards = stats
    ? [
        { label: "Total Parcels", value: stats.totalParcels.toLocaleString(), icon: MapPin },
        { label: "Total Hectares", value: formatHectares(stats.totalHectares), icon: Layers },
        { label: "Allocated", value: `${stats.allocatedPercent}%`, icon: CheckCircle },
        { label: "Available", value: stats.availableCount.toLocaleString(), icon: AlertTriangle },
      ]
    : []

  const statusChartData = stats
    ? (Object.entries(stats.byStatus) as [ParcelStatus, number][])
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: PARCEL_STATUS_LABELS[status] || status,
          count,
          fill: STATUS_CHART_COLORS[status] || CHART_COLOR_PALETTE[2],
        }))
    : []

  const regionChartData = stats
    ? stats.byRegion.slice(0, 10).map((r, i) => ({
        name: r.region,
        count: r.count,
        hectares: r.hectares,
        fill: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
      }))
    : []

  const classChartData = stats
    ? stats.byClassification.map((c, i) => ({
        name: c.classification,
        count: c.count,
        fill: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
      }))
    : []

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground text-sm">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">{payload[0].value}</span> parcels
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <MainLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold">Land Bank</h1>
              <p className="text-muted-foreground mt-1">
                Registry of state-owned parcels for development partner allocation
              </p>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats && (
          <>
            {/* Hero stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {heroCards.map((card) => {
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

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Status breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={statusChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                        <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={12} width={80} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="count" radius={[0, 2, 2, 0]} barSize={20}>
                          {statusChartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* By classification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Classification</CardTitle>
                </CardHeader>
                <CardContent>
                  {classChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={classChartData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          fontSize={11}
                        >
                          {classChartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* By region */}
            {regionChartData.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Parcels by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={regionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} angle={-30} textAnchor="end" height={60} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={28}>
                        {regionChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent parcels table */}
            {stats.recentParcels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recently Added Parcels</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-surface-muted">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Region</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Size</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stats.recentParcels.map((p: any) => (
                          <tr
                            key={p.id}
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/land-bank/${p.id}`)}
                          >
                            <td className="px-4 py-2.5 font-mono text-xs">{p.parcel_code}</td>
                            <td className="px-4 py-2.5">{p.name}</td>
                            <td className="px-4 py-2.5">{p.state_region}</td>
                            <td className="px-4 py-2.5">{formatHectares(p.size_hectares)}</td>
                            <td className="px-4 py-2.5">
                              <ParcelStatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
