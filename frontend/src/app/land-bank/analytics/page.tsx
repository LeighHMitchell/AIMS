"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Layers, CheckCircle, TrendingUp } from "lucide-react"
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
  Legend,
} from "recharts"
import { apiFetch } from "@/lib/api-fetch"
import {
  PARCEL_STATUS_LABELS,
  PARCEL_STATUS_COLORS,
  formatHectares,
} from "@/lib/land-bank-utils"
import { CHART_COLOR_PALETTE, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors"
import type { LandBankStats, ParcelStatus } from "@/types/land-bank"

export default function LandBankAnalyticsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<LandBankStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [drillFilter, setDrillFilter] = useState<{ type: string; value: string } | null>(null)

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground text-sm">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">{payload[0].value}</span> parcels
          </p>
          {payload[0].payload.hectares !== undefined && (
            <p className="text-sm text-muted-foreground">
              {formatHectares(payload[0].payload.hectares)}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const handleDrillDown = (type: string, value: string) => {
    if (drillFilter?.type === type && drillFilter?.value === value) {
      setDrillFilter(null)
    } else {
      setDrillFilter({ type, value })
      // Navigate to list with filter
      const params = new URLSearchParams()
      if (type === "region") params.set("region", value)
      if (type === "classification") params.set("classification", value)
      router.push(`/land-bank/parcels?${params.toString()}`)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="w-full">
          <h1 className="text-2xl font-bold mb-6">Analytics</h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!stats) {
    return (
      <MainLayout>
        <div className="w-full text-center py-12">
          <p className="text-muted-foreground">Failed to load analytics data.</p>
        </div>
      </MainLayout>
    )
  }

  const statusData = (Object.entries(stats.byStatus) as [ParcelStatus, number][])
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: PARCEL_STATUS_LABELS[status],
      count,
      fill: PARCEL_STATUS_COLORS[status],
    }))

  const regionData = stats.byRegion.map((r) => ({
    name: r.region,
    count: r.count,
    hectares: r.hectares,
  }))

  const classData = stats.byClassification.map((c, i) => ({
    name: c.classification,
    count: c.count,
    hectares: c.hectares,
    fill: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
  }))

  const assetTypeData = (stats.byAssetType || []).map((a, i) => ({
    name: a.asset_type,
    count: a.count,
    hectares: a.hectares,
    fill: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
  }))

  const titleStatusData = (stats.byTitleStatus || []).map((t, i) => ({
    name: t.title_status,
    count: t.count,
    fill: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
  }))

  const ministryData = (stats.byMinistry || []).slice(0, 10).map((m, i) => ({
    name: m.ministry.length > 30 ? m.ministry.slice(0, 27) + "..." : m.ministry,
    count: m.count,
    hectares: m.hectares,
    fill: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length],
  }))

  // Hectares by region
  const hectaresRegionData = stats.byRegion
    .filter(r => r.hectares > 0)
    .sort((a, b) => b.hectares - a.hectares)
    .map((r) => ({
      name: r.region,
      hectares: Math.round(r.hectares),
    }))

  return (
    <MainLayout>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Land Bank Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Interactive overview of parcel distribution and allocation metrics
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Parcels", value: stats.totalParcels, icon: MapPin },
            { label: "Total Hectares", value: formatHectares(stats.totalHectares), icon: Layers },
            { label: "Allocated %", value: `${stats.allocatedPercent}%`, icon: CheckCircle },
            { label: "Available", value: stats.availableCount, icon: TrendingUp },
          ].map(card => {
            const Icon = card.icon
            return (
              <Card key={card.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{typeof card.value === "number" ? card.value.toLocaleString() : card.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parcels by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    fontSize={12}
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* By classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parcels by Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={classData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                  <XAxis type="number" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={11} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={CHART_STRUCTURE_COLORS.axis}
                    fontSize={11}
                    width={130}
                    tick={{ cursor: "pointer" }}
                    onClick={(data: any) => handleDrillDown("classification", data.value)}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="count" radius={[0, 2, 2, 0]} barSize={20}>
                    {classData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} cursor="pointer" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Region charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Count by region */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parcel Count by Region</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={10} tickLine={false} angle={-40} textAnchor="end" height={70} />
                  <YAxis stroke={CHART_STRUCTURE_COLORS.axis} fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLOR_PALETTE[1]}
                    radius={[2, 2, 0, 0]}
                    barSize={24}
                    onClick={(data: any) => handleDrillDown("region", data.name)}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hectares by region */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hectares by Region</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={hectaresRegionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={CHART_STRUCTURE_COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v: number) => formatHectares(v)}
                  />
                  <YAxis type="category" dataKey="name" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={11} width={90} />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                            <p className="font-medium text-sm">{payload[0].payload.name}</p>
                            <p className="text-sm text-muted-foreground">{formatHectares(payload[0].value)}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="hectares" fill={CHART_COLOR_PALETTE[2]} radius={[0, 2, 2, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* New charts: Asset Type, Title Status, Ministry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* By Asset Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Asset Type</CardTitle>
            </CardHeader>
            <CardContent>
              {assetTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={assetTypeData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      fontSize={10}
                    >
                      {assetTypeData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">No asset type data</div>
              )}
            </CardContent>
          </Card>

          {/* By Title Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Title Status</CardTitle>
            </CardHeader>
            <CardContent>
              {titleStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={titleStatusData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      fontSize={10}
                    >
                      {titleStatusData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">No title status data</div>
              )}
            </CardContent>
          </Card>

          {/* By Ministry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Ministry</CardTitle>
            </CardHeader>
            <CardContent>
              {ministryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ministryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
                    <XAxis type="number" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={11} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke={CHART_STRUCTURE_COLORS.axis} fontSize={9} width={130} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="count" radius={[0, 2, 2, 0]} barSize={16}>
                      {ministryData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">No ministry data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
