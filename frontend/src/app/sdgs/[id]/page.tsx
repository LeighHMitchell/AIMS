"use client"

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Tabs removed — all content shown on single page
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Download,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  ExternalLink,
  MapPin,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell, PieChart as RechartsPieChart, Pie, AreaChart, Area,
} from 'recharts'
import { apiFetch } from '@/lib/api-fetch'
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { formatCurrency, TOOLTIP_CLASSES } from '@/lib/chart-utils'
import { formatCurrencyShort } from '@/lib/format'
import { exportChartToCSV } from '@/lib/chart-export'
import { getTargetsForGoal } from '@/data/sdg-targets'
import { MiniChartCard } from '@/components/profiles/MiniChartCard'
import { SDGHeroBanner } from '@/components/sdgs/SDGHeroBanner'
import { SDGMetricCards } from '@/components/sdgs/SDGMetricCards'
import { SDGTargetBreakdown } from '@/components/sdgs/SDGTargetBreakdown'
import { SDGDonorRankings } from '@/components/sdgs/SDGDonorRankings'
import Flag from 'react-world-flags'

const SDGGeographyMap = dynamic(
  () => import('@/components/sdgs/SDGGeographyMap').then(mod => ({ default: mod.SDGGeographyMap })),
  { ssr: false }
)

// ---- Types ----

interface SDGData {
  sdg: {
    id: number
    name: string
    description: string
    color: string
    targetCount: number
  }
  metrics: {
    totalActivities: number
    totalOrganizations: number
    totalTransactions: number
    totalValue: number
    commitments: number
    disbursements: number
    expenditures: number
    inflows: number
    activeActivities: number
    pipelineActivities: number
    closedActivities: number
  }
  activities: Array<{
    id: string
    title_narrative: string
    iati_identifier?: string
    activity_status?: string
    totalValue: number
    commitments: number
    disbursements: number
    transactionCount: number
  }>
  organizations: Array<{
    id: string
    name: string
    acronym?: string
    logo?: string
    totalValue: number
    totalCommitted: number
    totalDisbursed: number
    activityCount: number
    contributionTypes: string[]
  }>
  transactionsByYear: Array<{
    year: number
    commitments: number
    disbursements: number
    expenditures: number
    inflows: number
    total: number
  }>
  transactionsByType: Array<{
    type: string
    value: number
    label: string
  }>
  geographicDistribution: Array<{
    countryCode: string
    countryName: string
    lat: number | null
    lng: number | null
    value: number
    commitments: number
    disbursements: number
    activityCount: number
  }>
  targetBreakdown: Array<{
    targetId: string
    targetText: string
    activityCount: number
    commitments: number
    disbursements: number
    totalValue: number
  }>
  yoyStats: {
    currentYearCommitments: number
    currentYearDisbursements: number
    currentYearExpenditures: number
    previousYearCommitments: number
    previousYearDisbursements: number
    previousYearExpenditures: number
    commitmentChange: number
    disbursementChange: number
    expenditureChange: number
  }
  donorRankings: Array<{
    id: string
    name: string
    acronym: string | null
    logo: string | null
    orgType: string | null
    totalCommitted: number
    totalDisbursed: number
    activityCount: number
  }>
  activityStatusBreakdown: Array<{
    status: string
    statusLabel: string
    count: number
    totalValue: number
  }>
}

// ---- Helpers ----

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    '1': 'Pipeline',
    '2': 'Implementation',
    '3': 'Completion',
    '4': 'Closed',
    '5': 'Cancelled',
    '6': 'Suspended',
  }
  return labels[status || ''] || 'Unknown'
}

function getStatusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === '2') return 'default'
  if (status === '4') return 'secondary'
  if (status === '5') return 'destructive'
  return 'outline'
}

import { CHART_COLOR_PALETTE, DATA_COLORS } from '@/lib/chart-colors'

// ---- Component ----

export default function SDGProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [sdgData, setSdgData] = useState<SDGData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Activities tab state
  const [activityView, setActivityView] = useState<'card' | 'table'>('table')
  const [activityStatusFilter, setActivityStatusFilter] = useState<string>('all')
  const [activitySort, setActivitySort] = useState<string>('value')
  const [activityPage, setActivityPage] = useState(1)

  // Organizations tab state
  const [orgRoleFilter, setOrgRoleFilter] = useState<string>('all')
  const [orgSort, setOrgSort] = useState<string>('value')

  useEffect(() => {
    const sdgId = params?.id
    if (!sdgId) return

    if (isNaN(Number(sdgId))) {
      setError('Invalid SDG ID')
      setLoading(false)
      return
    }

    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)

    const fetchSDGData = async () => {
      try {
        const response = await apiFetch(`/api/sdgs/${sdgId}`, {
          signal: abortControllerRef.current!.signal
        })
        if (!response.ok) {
          if (response.status === 404) throw new Error('SDG goal not found')
          throw new Error('Failed to fetch SDG data')
        }
        const data = await response.json()
        setSdgData(data)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('[SDG Profile] Error:', err)
        setError(err.message || 'Failed to load SDG profile')
      } finally {
        setLoading(false)
      }
    }

    fetchSDGData()
    return () => { abortControllerRef.current?.abort() }
  }, [params?.id])

  // Reset pagination when filter changes
  useEffect(() => { setActivityPage(1) }, [activityStatusFilter, activitySort])

  // ---- Derived data ----
  const palette = CHART_COLOR_PALETTE

  const filteredActivities = useMemo(() => {
    if (!sdgData) return []
    let activities = [...sdgData.activities]
    if (activityStatusFilter !== 'all') {
      activities = activities.filter(a => a.activity_status === activityStatusFilter)
    }
    if (activitySort === 'value') activities.sort((a, b) => b.totalValue - a.totalValue)
    else if (activitySort === 'committed') activities.sort((a, b) => b.commitments - a.commitments)
    else if (activitySort === 'disbursed') activities.sort((a, b) => b.disbursements - a.disbursements)
    else if (activitySort === 'title') activities.sort((a, b) => (a.title_narrative || '').localeCompare(b.title_narrative || ''))
    return activities
  }, [sdgData, activityStatusFilter, activitySort])

  const filteredOrgs = useMemo(() => {
    if (!sdgData) return []
    let orgs = [...sdgData.organizations]
    if (orgRoleFilter !== 'all') {
      orgs = orgs.filter(o => o.contributionTypes.includes(orgRoleFilter))
    }
    if (orgSort === 'value') orgs.sort((a, b) => b.totalValue - a.totalValue)
    else if (orgSort === 'activities') orgs.sort((a, b) => b.activityCount - a.activityCount)
    else if (orgSort === 'name') orgs.sort((a, b) => a.name.localeCompare(b.name))
    return orgs
  }, [sdgData, orgRoleFilter, orgSort])

  const CARDS_PER_PAGE = 12
  const ROWS_PER_PAGE = 20
  const itemsPerPage = activityView === 'card' ? CARDS_PER_PAGE : ROWS_PER_PAGE
  const paginatedActivities = filteredActivities.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)

  // ---- Loading state ----
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Skeleton className="h-10 w-32 mb-4" />
            <Skeleton className="h-32 w-full rounded-xl mb-6" />
            <div className="flex gap-4 mb-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="flex-1 h-24 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-56 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  // ---- Error state ----
  if (error || !sdgData) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading SDG Profile</h2>
                <p className="text-muted-foreground mb-4">{error || 'Failed to load SDG profile data'}</p>
                <Button onClick={() => router.push('/sdgs')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to SDGs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const { sdg, metrics, activities, organizations, transactionsByYear, transactionsByType, geographicDistribution, targetBreakdown, yoyStats, donorRankings } = sdgData

  // ---- Render ----
  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          <Breadcrumbs items={[
            { label: "SDGs", href: "/sdgs" },
            { label: `SDG ${params?.id}` },
          ]} />

          {/* Hero Banner */}
          <SDGHeroBanner sdg={sdg} />

          {/* Metric Cards */}
          <SDGMetricCards
            metrics={metrics}
            yoyStats={yoyStats}
            donorCount={donorRankings.length}
            sdgColor={sdg.color}
          />

          {/* Chart Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Funding Trends */}
            <MiniChartCard title="Funding Trends">
                {transactionsByYear.length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transactionsByYear} margin={{ top: 0, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id={`sdgGrad-${sdg.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4c5568" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4c5568" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={TOOLTIP_CLASSES}>
                                  <p className="font-medium text-helper text-foreground mb-1">{payload[0]?.payload?.year}</p>
                                  {payload.map((entry: any, i: number) => (
                                    <p key={i} className="text-helper text-muted-foreground">
                                      {entry.name}: {formatCurrencyShort(entry.value)}
                                    </p>
                                  ))}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area type="monotone" dataKey="commitments" stackId="1" stroke="#4c5568" strokeWidth={2} fill={`url(#sdgGrad-${sdg.id})`} name="Commitments" />
                        <Area type="monotone" dataKey="disbursements" stackId="1" stroke="#7b95a7" strokeWidth={1.5} fill="#7b95a733" name="Disbursements" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-helper">No data</div>
                )}
            </MiniChartCard>

            {/* Target Coverage */}
            <MiniChartCard title="Target Coverage">
                {targetBreakdown.filter(t => t.totalValue > 0).length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={targetBreakdown.filter(t => t.totalValue > 0).slice(0, 8)}
                        layout="vertical"
                        margin={{ top: 0, right: 5, left: 25, bottom: 0 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="targetId" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={25} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={TOOLTIP_CLASSES}>
                                  <p className="font-medium text-helper text-foreground">{payload[0]?.payload?.targetId}: {payload[0]?.payload?.targetText}</p>
                                  <p className="text-helper text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="totalValue" fill="#4c5568" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-helper">No target data</div>
                )}
            </MiniChartCard>

            {/* Top Donors */}
            <MiniChartCard title="Top Donors">
                {donorRankings.length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={donorRankings.slice(0, 5).map(d => ({
                          name: d.acronym || d.name.substring(0, 12),
                          value: d.totalDisbursed,
                          fullName: d.name,
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 5, left: 0, bottom: 0 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={65} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={TOOLTIP_CLASSES}>
                                  <p className="font-medium text-helper text-foreground">{payload[0]?.payload?.fullName}</p>
                                  <p className="text-helper text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)} disbursed</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="value" fill="#4c5568" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-helper">No donor data</div>
                )}
            </MiniChartCard>

            {/* Geographic Spread */}
            <MiniChartCard title="Geographic Spread">
                {geographicDistribution.length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={geographicDistribution.slice(0, 5).map(g => ({
                          name: g.countryCode,
                          value: g.value,
                          fullName: g.countryName,
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 5, left: 0, bottom: 0 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={30} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={TOOLTIP_CLASSES}>
                                  <p className="font-medium text-helper text-foreground">{payload[0]?.payload?.fullName}</p>
                                  <p className="text-helper text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="value" fill="#4c5568" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-helper">No geo data</div>
                )}
            </MiniChartCard>
          </div>

          {/* ============ SECTIONS ============ */}
          <div className="space-y-8">

            {/* ======== Target Coverage ======== */}
            <Card>
              <CardHeader><CardTitle className="text-body font-medium">Target Coverage</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {targetBreakdown.filter(t => t.targetId !== 'general').map(target => (
                    <span
                      key={target.targetId}
                      className="text-helper font-medium px-2 py-1 rounded"
                      style={target.totalValue > 0 ? {
                        backgroundColor: `${sdg.color}20`,
                        color: sdg.color,
                        border: `1px solid ${sdg.color}40`,
                      } : {
                        backgroundColor: '#f1f5f9',
                        color: '#94a3b8',
                      }}
                      title={`${target.targetText}${target.totalValue > 0 ? ` — ${formatCurrencyShort(target.totalValue)}` : ' — No funding'}`}
                    >
                      {target.targetId}
                    </span>
                  ))}
                </div>
                <p className="text-helper text-muted-foreground mb-6">
                  {targetBreakdown.filter(t => t.totalValue > 0 && t.targetId !== 'general').length} of {targetBreakdown.filter(t => t.targetId !== 'general').length} targets funded
                </p>
                <SDGTargetBreakdown targets={targetBreakdown} sdgColor={sdg.color} />
              </CardContent>
            </Card>

            {/* ======== Financials ======== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-body font-medium">Financial Trends</CardTitle></CardHeader>
                <CardContent>
                  {transactionsByYear.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={transactionsByYear} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id={`finGrad-c-${sdg.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4c5568" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#4c5568" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id={`finGrad-d-${sdg.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7b95a7" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#7b95a7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className={TOOLTIP_CLASSES}>
                                    <p className="font-medium text-helper text-foreground mb-1">{payload[0]?.payload?.year}</p>
                                    {payload.map((entry: any, i: number) => (
                                      <p key={i} className="text-helper text-muted-foreground">
                                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: entry.stroke || entry.fill }} />
                                        {entry.name}: {formatCurrencyShort(entry.value)}
                                      </p>
                                    ))}
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Area type="monotone" dataKey="commitments" name="Commitments" stroke="#4c5568" strokeWidth={2} fill={`url(#finGrad-c-${sdg.id})`} />
                          <Area type="monotone" dataKey="disbursements" name="Disbursements" stroke="#7b95a7" strokeWidth={2} fill={`url(#finGrad-d-${sdg.id})`} />
                          <Area type="monotone" dataKey="expenditures" name="Expenditures" stroke="#dc2625" strokeWidth={1.5} fill="none" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-muted-foreground text-body">No time-series data available</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-body font-medium">Transaction Type Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {transactionsByType.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie data={transactionsByType} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}>
                            {transactionsByType.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => formatCurrencyShort(value)} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-muted-foreground text-body">No transaction data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ======== Donors ======== */}
            <Card>
              <CardHeader><CardTitle className="text-body font-medium">Donor Landscape</CardTitle></CardHeader>
              <CardContent>
                <SDGDonorRankings donors={donorRankings} sdgColor={sdg.color} />
              </CardContent>
            </Card>

            {/* ======== Activities ======== */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-body font-medium">Activities</CardTitle>
                  <div className="flex items-center gap-2">
                    {[
                      { key: 'all', label: 'All', count: activities.length },
                      { key: '1', label: 'Pipeline', count: activities.filter(a => a.activity_status === '1').length },
                      { key: '2', label: 'Active', count: activities.filter(a => a.activity_status === '2').length },
                      { key: '4', label: 'Closed', count: activities.filter(a => a.activity_status === '4' || a.activity_status === '3').length },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setActivityStatusFilter(f.key)}
                        className={`text-helper px-2.5 py-1 rounded-md transition-colors ${
                          activityStatusFilter === f.key
                            ? 'text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted'
                        }`}
                        style={activityStatusFilter === f.key ? { backgroundColor: '#4c5568' } : undefined}
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                    <select
                      value={activitySort}
                      onChange={e => setActivitySort(e.target.value)}
                      className="text-helper border border-border rounded-md px-2 py-1 text-muted-foreground"
                    >
                      <option value="value">Sort by Value</option>
                      <option value="committed">Sort by Committed</option>
                      <option value="disbursed">Sort by Disbursed</option>
                      <option value="title">Sort by Title</option>
                    </select>
                    <div className="flex border border-border rounded-md">
                      <Button variant="ghost" size="sm" onClick={() => setActivityView('card')} className={`rounded-r-none h-7 px-2 ${activityView === 'card' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}><LayoutGrid className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setActivityView('table')} className={`rounded-l-none h-7 px-2 ${activityView === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}><TableIcon className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-helper text-muted-foreground mb-3">{filteredActivities.length} activit{filteredActivities.length === 1 ? 'y' : 'ies'}</p>

                {activityView === 'card' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedActivities.map(activity => (
                      <Link key={activity.id} href={`/activities/${activity.id}`}>
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={getStatusVariant(activity.activity_status)} className="text-[10px] px-1.5 py-0">{getStatusLabel(activity.activity_status)}</Badge>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="flex items-start gap-1.5 mb-1">
                              <h3 className="font-medium text-body text-foreground line-clamp-2 flex-1 min-w-0">{activity.title_narrative || 'Untitled Activity'}</h3>
                              {activity.iati_identifier && <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded flex-shrink-0">{activity.iati_identifier}</code>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                              <div><p className="text-helper text-muted-foreground font-normal">Committed</p><p className="text-helper font-semibold text-foreground">{formatCurrencyShort(activity.commitments)}</p></div>
                              <div><p className="text-helper text-muted-foreground font-normal">Disbursed</p><p className="text-helper font-semibold text-foreground">{formatCurrencyShort(activity.disbursements)}</p></div>
                            </div>
                            {activity.commitments > 0 && (
                              <div className="w-full bg-muted rounded-full h-1 mt-2">
                                <div className="h-1 rounded-full" style={{ width: `${Math.min((activity.disbursements / activity.commitments) * 100, 100)}%`, backgroundColor: '#4c5568' }} />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-helper">
                      <thead className="bg-surface-muted">
                        <tr className="border-b border-border bg-muted">
                          <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Activity</th>
                          <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Status</th>
                          <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Committed</th>
                          <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Disbursed</th>
                          <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">% Disbursed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedActivities.map(activity => {
                          const pct = activity.commitments > 0 ? ((activity.disbursements / activity.commitments) * 100).toFixed(1) : '—'
                          const fmtNum = (v: number) => {
                            const abs = Math.abs(v)
                            const sign = v < 0 ? '-' : ''
                            if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
                            if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
                            if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`
                            return `${sign}${abs.toFixed(0)}`
                          }
                          return (
                            <tr key={activity.id} className="border-b border-border hover:bg-muted/50">
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <Link href={`/activities/${activity.id}`} className="font-medium text-foreground hover:underline">{(activity.title_narrative || 'Untitled').substring(0, 60)}</Link>
                                  {activity.iati_identifier && (
                                    <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded flex-shrink-0">{activity.iati_identifier}</code>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">{getStatusLabel(activity.activity_status)}</td>
                              <td className="py-2 px-3 text-right text-foreground">{fmtNum(activity.commitments)} <span className="text-helper text-muted-foreground font-normal">USD</span></td>
                              <td className="py-2 px-3 text-right text-foreground">{fmtNum(activity.disbursements)} <span className="text-helper text-muted-foreground font-normal">USD</span></td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{pct}{pct !== '—' ? '%' : ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" disabled={activityPage <= 1} onClick={() => setActivityPage(p => p - 1)} className="text-helper h-7">Previous</Button>
                    <span className="text-helper text-muted-foreground">Page {activityPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={activityPage >= totalPages} onClick={() => setActivityPage(p => p + 1)} className="text-helper h-7">Next</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ======== Organizations ======== */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-body font-medium">Organizations</CardTitle>
                  <div className="flex items-center gap-2">
                    {['all', 'funding', 'implementing', 'accountable'].map(role => (
                      <button key={role} onClick={() => setOrgRoleFilter(role)} className={`text-helper px-2.5 py-1 rounded-md transition-colors capitalize ${orgRoleFilter === role ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted'}`} style={orgRoleFilter === role ? { backgroundColor: '#4c5568' } : undefined}>
                        {role === 'all' ? 'All' : role}
                      </button>
                    ))}
                    <select value={orgSort} onChange={e => setOrgSort(e.target.value)} className="text-helper border border-border rounded-md px-2 py-1 text-muted-foreground">
                      <option value="value">Sort by Value</option>
                      <option value="activities">Sort by Activities</option>
                      <option value="name">Sort by Name</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-helper text-muted-foreground mb-3">{filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''}</p>
                {filteredOrgs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrgs.map(org => (
                      <Link key={org.id} href={`/organizations/${org.id}`}>
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-3">
                              {org.logo ? (
                                <img src={org.logo} alt={org.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded flex items-center justify-center text-white text-helper font-bold flex-shrink-0" style={{ backgroundColor: '#4c5568' }}>
                                  {(org.acronym || org.name).substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-body text-foreground truncate">{org.name}</h3>
                                {org.acronym && <p className="text-helper text-muted-foreground font-normal">{org.acronym}</p>}
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-helper font-semibold text-foreground">{formatCurrencyShort(org.totalValue)}</span>
                                  <span className="text-helper text-muted-foreground font-normal">{org.activityCount} activit{org.activityCount === 1 ? 'y' : 'ies'}</span>
                                </div>
                                {org.contributionTypes.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {org.contributionTypes.map(ct => (
                                      <span key={ct} className="text-[9px] px-1 py-0.5 rounded capitalize" style={{ backgroundColor: '#4c556815', color: '#4c5568' }}>{ct}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-body text-center py-8">No organizations found</p>
                )}
              </CardContent>
            </Card>

            {/* ======== Geography ======== */}
            <Card>
              <CardHeader><CardTitle className="text-body font-medium">Activity Locations</CardTitle></CardHeader>
              <CardContent>
                <SDGGeographyMap locations={geographicDistribution} sdgColor={sdg.color} />
              </CardContent>
            </Card>

            {geographicDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-body font-medium">Country Rankings</CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Export CSV" aria-label="Export CSV" onClick={() => {
                      const exportData = geographicDistribution.map((g, i) => ({ Rank: i + 1, Country: g.countryName, Code: g.countryCode, Activities: g.activityCount, Committed: g.commitments, Disbursed: g.disbursements, Total: g.value }))
                      exportChartToCSV(exportData, `SDG ${sdg.id} Countries`)
                    }}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={geographicDistribution.slice(0, 10).map(g => ({ name: g.countryCode, value: g.value, fullName: g.countryName }))} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={35} />
                        <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                          <div className={TOOLTIP_CLASSES}><p className="font-medium text-helper text-foreground">{payload[0]?.payload?.fullName}</p><p className="text-helper text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)}</p></div>
                        ) : null} />
                        <Bar dataKey="value" fill="#4c5568" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-helper">
                      <thead className="bg-surface-muted">
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
                          <th className="text-left py-2 px-2 text-muted-foreground font-medium">Country</th>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium">Committed</th>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium">Disbursed</th>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium">Activities</th>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geographicDistribution.map((geo, i) => {
                          const totalGeoValue = geographicDistribution.reduce((s, g) => s + g.value, 0)
                          const pctOfTotal = totalGeoValue > 0 ? ((geo.value / totalGeoValue) * 100).toFixed(1) : '0.0'
                          return (
                            <tr key={geo.countryCode} className="border-b border-border hover:bg-muted/50">
                              <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-2">
                                  <Flag code={geo.countryCode} style={{ width: 18, height: 13, objectFit: 'cover' }} fallback={<span className="text-[10px]">{geo.countryCode}</span>} />
                                  <span className="font-medium text-foreground">{geo.countryName}</span>
                                  <span className="text-muted-foreground">{geo.countryCode}</span>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right text-muted-foreground">{formatCurrencyShort(geo.commitments)}</td>
                              <td className="py-2 px-2 text-right font-medium text-foreground">{formatCurrencyShort(geo.disbursements)}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground">{geo.activityCount}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground">{pctOfTotal}%</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </MainLayout>
  )
}
