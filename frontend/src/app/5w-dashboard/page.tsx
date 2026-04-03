"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import {
  Activity,
  Building2,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Target,
  RefreshCw,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'

// ─── Types ───
interface DashboardData {
  summary: {
    totalActivities: number
    totalOrganizations: number
    totalSectors: number
    totalRegions: number
    totalBudget: number
  }
  byOrganization: Array<{
    id: string
    name: string
    acronym: string
    type: string
    activityCount: number
    totalBudget: number
  }>
  bySector: Array<{
    code: string
    name: string
    activityCount: number
    percentage: number
  }>
  byRegion: Array<{
    name: string
    pcode: string
    activityCount: number
    percentage: number
  }>
  byStatus: Array<{
    status: string
    statusCode: string
    count: number
  }>
  byYear: Array<{
    year: number
    count: number
    budget: number
  }>
  crossTab: Array<{
    orgName: string
    sectorName: string
    regionName: string
    activityCount: number
  }>
  filterOptions: {
    organizations: Array<{ id: string; name: string }>
    sectors: Array<{ code: string; name: string }>
    regions: Array<{ pcode: string; name: string }>
    statuses: Array<{ code: string; label: string }>
  }
}

// ─── Chart Colors ───
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
]

const STATUS_COLORS: Record<string, string> = {
  'Pipeline/Identification': '#94a3b8',
  'Implementation': '#3b82f6',
  'Completion': '#10b981',
  'Post-completion': '#6366f1',
  'Cancelled': '#ef4444',
  'Suspended': '#f59e0b',
}

// ─── Utility: format currency ───
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

// ─── Custom Tooltip ───
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-sm">
          {entry.name}: {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('budget')
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── Summary Card ───
function SummaryCard({ icon: Icon, title, value, subtitle, color }: {
  icon: React.ElementType
  title: string
  value: string | number
  subtitle?: string
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Loading Skeleton ───
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───
export default function FiveWDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [orgFilter, setOrgFilter] = useState('all')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (orgFilter !== 'all') params.set('organization', orgFilter)
      if (sectorFilter !== 'all') params.set('sector', sectorFilter)
      if (regionFilter !== 'all') params.set('region', regionFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const queryString = params.toString()
      const url = `/api/5w-dashboard${queryString ? `?${queryString}` : ''}`
      const res = await apiFetch(url)

      if (!res.ok) {
        throw new Error(`Failed to fetch data: ${res.status}`)
      }

      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [orgFilter, sectorFilter, regionFilter, statusFilter])

  const resetFilters = () => {
    setOrgFilter('all')
    setSectorFilter('all')
    setRegionFilter('all')
    setStatusFilter('all')
  }

  const hasActiveFilters = orgFilter !== 'all' || sectorFilter !== 'all' || regionFilter !== 'all' || statusFilter !== 'all'

  // Memoized chart data
  const top10Orgs = useMemo(() => data?.byOrganization.slice(0, 10).map(o => ({
    name: o.acronym || o.name.slice(0, 20),
    fullName: o.name,
    activities: o.activityCount,
    budget: o.totalBudget,
  })) || [], [data?.byOrganization])

  const sectorPieData = useMemo(() => data?.bySector.slice(0, 10).map(s => ({
    name: s.name.length > 30 ? s.name.slice(0, 27) + '...' : s.name,
    fullName: s.name,
    value: s.activityCount,
    percentage: s.percentage,
  })) || [], [data?.bySector])

  const regionBarData = useMemo(() => data?.byRegion.slice(0, 15).map(r => ({
    name: r.name.length > 20 ? r.name.slice(0, 17) + '...' : r.name,
    fullName: r.name,
    activities: r.activityCount,
  })) || [], [data?.byRegion])

  const statusBarData = useMemo(() => data?.byStatus.map(s => ({
    name: s.status,
    count: s.count,
    fill: STATUS_COLORS[s.status] || '#94a3b8',
  })) || [], [data?.byStatus])

  const timelineData = useMemo(() => data?.byYear || [], [data?.byYear])

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              5W Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Who does What, Where, When, and for Whom
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Organization Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Who (Organization)
                </label>
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {data?.filterOptions?.organizations
                      ?.sort((a, b) => a.name.localeCompare(b.name))
                      .map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sector Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  What (Sector)
                </label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {data?.filterOptions?.sectors
                      ?.sort((a, b) => a.name.localeCompare(b.name))
                      .map(s => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Where (Region)
                </label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {data?.filterOptions?.regions
                      ?.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map(r => (
                        <SelectItem key={r.pcode || r.name} value={r.pcode || r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  When (Status)
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {data?.filterOptions?.statuses?.map(s => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchData}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <SummaryCard
                icon={Activity}
                title="Total Activities"
                value={data.summary.totalActivities.toLocaleString()}
                color="bg-blue-500"
              />
              <SummaryCard
                icon={Building2}
                title="Organizations"
                value={data.summary.totalOrganizations.toLocaleString()}
                subtitle="Reporting organizations"
                color="bg-emerald-500"
              />
              <SummaryCard
                icon={Target}
                title="Sectors"
                value={data.summary.totalSectors.toLocaleString()}
                subtitle="Unique DAC sectors"
                color="bg-amber-500"
              />
              <SummaryCard
                icon={MapPin}
                title="Regions Covered"
                value={data.summary.totalRegions.toLocaleString()}
                subtitle="Subnational regions"
                color="bg-purple-500"
              />
              <SummaryCard
                icon={DollarSign}
                title="Total Budget"
                value={formatCurrency(data.summary.totalBudget)}
                color="bg-cyan-500"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="organizations">By Organization</TabsTrigger>
                <TabsTrigger value="sectors">By Sector</TabsTrigger>
                <TabsTrigger value="locations">By Location</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              {/* ─── Overview Tab ─── */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top 10 Organizations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Top 10 Organizations by Activity Count
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {top10Orgs.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={top10Orgs} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="activities" name="Activities" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-12">No organization data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sector Distribution Pie */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Sector Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {sectorPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={sectorPieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percentage }) => `${percentage}%`}
                              labelLine={true}
                            >
                              {sectorPieData.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number, name: string) => [value, name]} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-12">No sector data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Activities by Region */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Activities by Region
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {regionBarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={regionBarData} margin={{ left: 10, right: 20, top: 5, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} height={80} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="activities" name="Activities" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-12">No region data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Activities by Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Activities by Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statusBarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={statusBarData} margin={{ left: 10, right: 20, top: 5, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} height={80} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Activities" radius={[4, 4, 0, 0]}>
                              {statusBarData.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-12">No status data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ─── By Organization Tab ─── */}
              <TabsContent value="organizations" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      All Organizations
                      <Badge variant="secondary" className="ml-2">{data.byOrganization.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Acronym</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Activities</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.byOrganization.map((org) => (
                            <tr key={org.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-3 px-4 font-medium">{org.name}</td>
                              <td className="py-3 px-4 text-muted-foreground">{org.acronym || '-'}</td>
                              <td className="py-3 px-4">
                                {org.type ? <Badge variant="outline">{org.type}</Badge> : '-'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">{org.activityCount}</td>
                              <td className="py-3 px-4 text-right font-mono">{formatCurrency(org.totalBudget)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.byOrganization.length === 0 && (
                        <p className="text-muted-foreground text-sm text-center py-8">No organizations found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── By Sector Tab ─── */}
              <TabsContent value="sectors" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sector Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {sectorPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                          <PieChart>
                            <Pie
                              data={sectorPieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={140}
                              innerRadius={60}
                              dataKey="value"
                              nameKey="name"
                              label={({ percentage }) => `${percentage}%`}
                            >
                              {sectorPieData.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number, name: string) => [value, name]} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-12">No sector data</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sector Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-card">
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Sector</th>
                              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Activities</th>
                              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.bySector.map((s, i) => (
                              <tr key={s.code} className="border-b last:border-0 hover:bg-muted/50">
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="truncate">{s.name}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono">{s.activityCount}</td>
                                <td className="py-2 px-3 text-right font-mono">{s.percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ─── By Location Tab ─── */}
              <TabsContent value="locations" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Activities by Region
                      <Badge variant="secondary" className="ml-2">{data.byRegion.length} regions</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.byRegion.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(400, data.byRegion.length * 35)}>
                        <BarChart
                          data={data.byRegion}
                          layout="vertical"
                          margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={160}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="activityCount" name="Activities" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-12">No regional data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Timeline Tab ─── */}
              <TabsContent value="timeline" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Activities by Year
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timelineData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={timelineData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Activities" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-12">No timeline data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Budget by Year
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timelineData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={timelineData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip
                              formatter={(value: number) => [formatCurrency(value), 'Budget']}
                              labelFormatter={(label) => `Year: ${label}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="budget"
                              name="Budget"
                              stroke="#10b981"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-12">No budget timeline data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Cross-tabulation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Cross-tabulation: Who-What-Where
                      <Badge variant="secondary" className="ml-2">Top 50</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Organization</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Sector</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Region</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Activities</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.crossTab.map((row, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 px-3 font-medium">{row.orgName}</td>
                              <td className="py-2 px-3 text-muted-foreground">{row.sectorName}</td>
                              <td className="py-2 px-3 text-muted-foreground">{row.regionName}</td>
                              <td className="py-2 px-3 text-right font-mono">{row.activityCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.crossTab.length === 0 && (
                        <p className="text-muted-foreground text-sm text-center py-8">No cross-tabulation data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </MainLayout>
  )
}
