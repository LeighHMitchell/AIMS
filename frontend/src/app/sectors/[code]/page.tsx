"use client"

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Download, AlertCircle, LayoutGrid, Table as TableIcon, ExternalLink, MapPin,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell, PieChart as RechartsPieChart, Pie, Legend, AreaChart, Area,
} from 'recharts'
import { apiFetch } from '@/lib/api-fetch'
import { formatCurrency, TOOLTIP_CLASSES } from '@/lib/chart-utils'
import { exportChartToCSV } from '@/lib/chart-export'
import { getSectorColor, sectorPalette } from '@/lib/sector-colors'
import { SectorHierarchyBreadcrumb } from '@/components/sectors/SectorHierarchyBreadcrumb'
import { SubSectorBreakdown } from '@/components/sectors/SubSectorBreakdown'
import { SDGDonorRankings } from '@/components/sdgs/SDGDonorRankings'
import { SDGMetricCards } from '@/components/sdgs/SDGMetricCards'
import Flag from 'react-world-flags'

const SDGGeographyMap = dynamic(
  () => import('@/components/sdgs/SDGGeographyMap').then(mod => ({ default: mod.SDGGeographyMap })),
  { ssr: false }
)

// ---- Types ----
interface SectorData {
  sector: { code: string; name: string; level: string; groupCode: string; groupName: string; categoryCode?: string; categoryName?: string }
  hierarchy: { group?: { code: string; name: string }; category?: { code: string; name: string }; sector?: { code: string; name: string } }
  metrics: {
    totalActivities: number; totalOrganizations: number; totalTransactions: number; totalValue: number;
    commitments: number; disbursements: number; expenditures: number; inflows: number;
    activeActivities: number; pipelineActivities: number; closedActivities: number;
  }
  activities: Array<{
    id: string; title_narrative: string; iati_identifier?: string; activity_status?: string;
    sectorPercentage: number; totalValue: number; commitments: number; disbursements: number; transactionCount: number;
  }>
  organizations: Array<{
    id: string; name: string; acronym?: string; logo?: string; totalValue: number;
    totalCommitted: number; totalDisbursed: number; activityCount: number; contributionTypes: string[];
  }>
  transactionsByYear: Array<{ year: number; commitments: number; disbursements: number; expenditures: number; inflows: number; total: number }>
  transactionsByType: Array<{ type: string; value: number; label: string }>
  geographicDistribution: Array<{ countryCode: string; countryName: string; lat: number | null; lng: number | null; value: number; commitments: number; disbursements: number; activityCount: number }>
  subSectorBreakdown: Array<{ code: string; name: string; level: string; activityCount: number; commitments: number; disbursements: number; totalValue: number }>
  yoyStats: { currentYearCommitments: number; currentYearDisbursements: number; currentYearExpenditures: number; previousYearCommitments: number; previousYearDisbursements: number; previousYearExpenditures: number; commitmentChange: number; disbursementChange: number; expenditureChange: number }
  donorRankings: Array<{ id: string; name: string; acronym: string | null; logo: string | null; orgType: string | null; totalCommitted: number; totalDisbursed: number; activityCount: number }>
  activityStatusBreakdown: Array<{ status: string; statusLabel: string; count: number; totalValue: number }>
}

// ---- Helpers ----
function formatCurrencyShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

function formatNumber(value: number): string { return new Intl.NumberFormat('en-US').format(value) }

function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = { '1': 'Pipeline', '2': 'Implementation', '3': 'Completion', '4': 'Closed', '5': 'Cancelled', '6': 'Suspended' }
  return labels[status || ''] || 'Unknown'
}

function getStatusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === '2') return 'default'; if (status === '4') return 'secondary'; if (status === '5') return 'destructive'; return 'outline'
}

function getLevelLabel(level: string): string {
  return level === 'group' ? 'Sector Group' : level === 'category' ? 'Sector Category' : 'Sector'
}

// ---- Component ----
export default function SectorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<SectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const abortControllerRef = useRef<AbortController | null>(null)

  const [activityView, setActivityView] = useState<'card' | 'table'>('card')
  const [activityStatusFilter, setActivityStatusFilter] = useState<string>('all')
  const [activitySort, setActivitySort] = useState<string>('value')
  const [activityPage, setActivityPage] = useState(1)
  const [orgRoleFilter, setOrgRoleFilter] = useState<string>('all')
  const [orgSort, setOrgSort] = useState<string>('value')

  useEffect(() => {
    const fetchData = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      abortControllerRef.current = new AbortController()
      setLoading(true); setError(null)
      try {
        const code = params?.code
        if (!code) throw new Error('Invalid sector code')
        const response = await apiFetch(`/api/sectors/${code}`, { signal: abortControllerRef.current.signal })
        if (!response.ok) {
          if (response.status === 404) throw new Error('Sector not found')
          throw new Error('Failed to fetch sector data')
        }
        setData(await response.json())
        setLoading(false)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to load sector profile')
        setLoading(false)
      }
    }
    fetchData()
    return () => { abortControllerRef.current?.abort() }
  }, [params?.code])

  useEffect(() => { setActivityPage(1) }, [activityStatusFilter, activitySort])

  const themeColor = useMemo(() => data ? getSectorColor(data.sector.code) : '#6B7280', [data])
  const palette = useMemo(() => sectorPalette(themeColor), [themeColor])

  const filteredActivities = useMemo(() => {
    if (!data) return []
    let acts = [...data.activities]
    if (activityStatusFilter !== 'all') acts = acts.filter(a => a.activity_status === activityStatusFilter)
    if (activitySort === 'value') acts.sort((a, b) => b.totalValue - a.totalValue)
    else if (activitySort === 'committed') acts.sort((a, b) => b.commitments - a.commitments)
    else if (activitySort === 'disbursed') acts.sort((a, b) => b.disbursements - a.disbursements)
    else if (activitySort === 'title') acts.sort((a, b) => (a.title_narrative || '').localeCompare(b.title_narrative || ''))
    else if (activitySort === 'allocation') acts.sort((a, b) => b.sectorPercentage - a.sectorPercentage)
    return acts
  }, [data, activityStatusFilter, activitySort])

  const filteredOrgs = useMemo(() => {
    if (!data) return []
    let orgs = [...data.organizations]
    if (orgRoleFilter !== 'all') orgs = orgs.filter(o => o.contributionTypes.includes(orgRoleFilter))
    if (orgSort === 'value') orgs.sort((a, b) => b.totalValue - a.totalValue)
    else if (orgSort === 'activities') orgs.sort((a, b) => b.activityCount - a.activityCount)
    else if (orgSort === 'name') orgs.sort((a, b) => a.name.localeCompare(b.name))
    return orgs
  }, [data, orgRoleFilter, orgSort])

  const CARDS_PER_PAGE = 12; const ROWS_PER_PAGE = 20
  const itemsPerPage = activityView === 'card' ? CARDS_PER_PAGE : ROWS_PER_PAGE
  const paginatedActivities = filteredActivities.slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage)
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen"><div className="w-full p-6">
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="h-32 w-full rounded-xl mb-6" />
          <div className="flex gap-4 mb-8">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="flex-1 h-24 rounded-lg" />)}</div>
          <div className="grid grid-cols-4 gap-4 mb-8">{[1,2,3,4].map(i => <Skeleton key={i} className="h-56 rounded-lg" />)}</div>
        </div></div>
      </MainLayout>
    )
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="min-h-screen"><div className="w-full p-6">
          <Card><CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Sector</h2>
            <p className="text-muted-foreground mb-4">{error || 'Failed to load'}</p>
            <Button onClick={() => router.push('/sectors')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Sectors</Button>
          </CardContent></Card>
        </div></div>
      </MainLayout>
    )
  }

  const { sector, hierarchy, metrics, activities, organizations, transactionsByYear, transactionsByType, geographicDistribution, subSectorBreakdown, yoyStats, donorRankings } = data

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Back button */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/sectors')} className="text-muted-foreground hover:text-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-1.5" />Sectors
            </Button>
          </div>

          {/* Breadcrumb */}
          <SectorHierarchyBreadcrumb hierarchy={hierarchy} />

          {/* Hero Banner */}
          <Card className="mb-6 border-0 shadow-sm overflow-hidden" style={{ borderTop: `4px solid ${themeColor}` }}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center shadow-md flex-shrink-0 text-white font-bold text-lg" style={{ backgroundColor: themeColor }}>
                  {sector.code}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-foreground mb-1">{sector.name}</h1>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="outline" className="border-border text-foreground">{getLevelLabel(sector.level)}</Badge>
                    <Badge variant="outline" className="border-border text-foreground">DAC CRS</Badge>
                    {sector.groupName && sector.level !== 'group' && (
                      <Badge style={{ backgroundColor: `${themeColor}15`, color: themeColor, border: `1px solid ${themeColor}40` }}>{sector.groupName}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <SDGMetricCards metrics={metrics} yoyStats={yoyStats} donorCount={donorRankings.length} sdgColor={themeColor} />

          {/* Mini Chart Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Funding Trends */}
            <Card className="border-border">
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground">Funding Trends</CardTitle></CardHeader>
              <CardContent className="px-1 pb-2">
                {transactionsByYear.length > 0 ? (
                  <div className="h-36 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transactionsByYear} margin={{ top: 0, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                        <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                          <div className={TOOLTIP_CLASSES}>
                            <p className="font-medium text-xs text-foreground mb-1">{payload[0]?.payload?.year}</p>
                            {payload.map((e: any, i: number) => <p key={i} className="text-xs text-muted-foreground">{e.name}: {formatCurrencyShort(e.value)}</p>)}
                          </div>
                        ) : null} />
                        <Area type="monotone" dataKey="commitments" stackId="1" stroke={themeColor} strokeWidth={2} fill="url(#secGrad)" name="Commitments" />
                        <Area type="monotone" dataKey="disbursements" stackId="1" stroke={`${themeColor}99`} strokeWidth={1.5} fill={`${themeColor}33`} name="Disbursements" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No data</div>}
              </CardContent>
            </Card>

            {/* Sub-sector Coverage mini */}
            <Card className="border-border">
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground">Sub-sector Coverage</CardTitle></CardHeader>
              <CardContent className="px-1 pb-2">
                <SubSectorBreakdown subSectors={subSectorBreakdown} themeColor={themeColor} compact />
              </CardContent>
            </Card>

            {/* Top Donors mini */}
            <Card className="border-border">
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground">Top Donors</CardTitle></CardHeader>
              <CardContent className="px-1 pb-2">
                {donorRankings.length > 0 ? (
                  <div className="h-36 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={donorRankings.slice(0, 5).map(d => ({ name: d.acronym || d.name.substring(0, 12), value: d.totalDisbursed, fullName: d.name }))} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={65} />
                        <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                          <div className={TOOLTIP_CLASSES}><p className="font-medium text-xs text-foreground">{payload[0]?.payload?.fullName}</p><p className="text-xs text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)} disbursed</p></div>
                        ) : null} />
                        <Bar dataKey="value" fill={themeColor} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No donor data</div>}
              </CardContent>
            </Card>

            {/* Geographic Spread mini */}
            <Card className="border-border">
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground">Geographic Spread</CardTitle></CardHeader>
              <CardContent className="px-1 pb-2">
                {geographicDistribution.length > 0 ? (
                  <div className="h-36 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={geographicDistribution.slice(0, 5).map(g => ({ name: g.countryCode, value: g.value, fullName: g.countryName }))} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={30} />
                        <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                          <div className={TOOLTIP_CLASSES}><p className="font-medium text-xs text-foreground">{payload[0]?.payload?.fullName}</p><p className="text-xs text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)}</p></div>
                        ) : null} />
                        <Bar dataKey="value" fill={themeColor} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No geo data</div>}
              </CardContent>
            </Card>
          </div>

          {/* ============ TABS ============ */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sub-sectors">Sub-Sectors</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="donors">Donors</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="geography">Geography</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <Card><CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">Aligned Activities</p><p className="text-3xl font-bold text-foreground">{formatNumber(metrics.totalActivities)}</p><p className="text-xs text-muted-foreground mt-0.5">in this sector</p></div>
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">Organizations</p><p className="text-3xl font-bold text-foreground">{formatNumber(metrics.totalOrganizations)}</p><p className="text-xs text-muted-foreground mt-0.5">involved</p></div>
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">Total Financial Value</p><p className="text-3xl font-bold text-foreground">{formatCurrencyShort(metrics.totalValue)}</p><p className="text-xs text-muted-foreground mt-0.5">across all transactions</p></div>
                </div>
              </CardContent></Card>

              {/* Sub-sector coverage summary */}
              {subSectorBreakdown.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm">Sub-sector Coverage</CardTitle></CardHeader><CardContent>
                  <div className="flex flex-wrap gap-2">
                    {subSectorBreakdown.map(sub => (
                      <Link key={sub.code} href={`/sectors/${sub.code}`}>
                        <span className="text-xs font-medium px-2 py-1 rounded cursor-pointer hover:opacity-80" style={sub.totalValue > 0 ? { backgroundColor: `${themeColor}20`, color: themeColor, border: `1px solid ${themeColor}40` } : { backgroundColor: '#f1f5f9', color: '#94a3b8' }} title={`${sub.name} — ${formatCurrencyShort(sub.totalValue)}`}>
                          {sub.code}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{subSectorBreakdown.filter(s => s.totalValue > 0).length} of {subSectorBreakdown.length} sub-sectors funded</p>
                </CardContent></Card>
              )}

              {/* Top 5 Activities */}
              {activities.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm">Top Activities</CardTitle></CardHeader><CardContent>
                  <div className="space-y-2">
                    {activities.slice(0, 5).map(activity => (
                      <Link key={activity.id} href={`/activities/${activity.id}`} className="flex items-start justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground truncate">{activity.title_narrative || 'Untitled Activity'}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {activity.iati_identifier && <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded">{activity.iati_identifier}</code>}
                            <Badge variant={getStatusVariant(activity.activity_status)} className="text-[10px] px-1.5 py-0">{getStatusLabel(activity.activity_status)}</Badge>
                            {activity.sectorPercentage < 100 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{activity.sectorPercentage}% allocation</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-sm font-semibold text-foreground">{formatCurrencyShort(activity.totalValue)}</p>
                          <p className="text-[10px] text-muted-foreground">{activity.transactionCount} tx</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent></Card>
              )}

              {/* Transaction Type Donut */}
              {transactionsByType.length > 0 && (
                <Card><CardHeader><CardTitle className="text-sm">Transaction Types</CardTitle></CardHeader><CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={transactionsByType} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={75} label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}>
                          {transactionsByType.map((_, index) => <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => formatCurrencyShort(value)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent></Card>
              )}
            </TabsContent>

            {/* Sub-Sectors */}
            <TabsContent value="sub-sectors" className="space-y-6">
              <Card><CardHeader><CardTitle className="text-sm">{sector.level === 'sector' ? 'Related Sectors in Same Category' : 'Sub-Sector Breakdown'}</CardTitle></CardHeader><CardContent>
                {subSectorBreakdown.length > 0 ? (
                  <SubSectorBreakdown subSectors={subSectorBreakdown} themeColor={themeColor} />
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">No sub-sector data available</p>
                )}
              </CardContent></Card>
            </TabsContent>

            {/* Financials */}
            <TabsContent value="financials" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="text-sm">Financial Trends</CardTitle></CardHeader><CardContent>
                  {transactionsByYear.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={transactionsByYear} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="secFinGradC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColor} stopOpacity={0.3} /><stop offset="95%" stopColor={themeColor} stopOpacity={0} /></linearGradient>
                            <linearGradient id="secFinGradD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={`${themeColor}99`} stopOpacity={0.3} /><stop offset="95%" stopColor={`${themeColor}99`} stopOpacity={0} /></linearGradient>
                          </defs>
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                          <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                            <div className={TOOLTIP_CLASSES}>
                              <p className="font-medium text-xs text-foreground mb-1">{payload[0]?.payload?.year}</p>
                              {payload.map((e: any, i: number) => <p key={i} className="text-xs text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: e.stroke || e.fill }} />{e.name}: {formatCurrencyShort(e.value)}</p>)}
                            </div>
                          ) : null} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="commitments" name="Commitments" stroke={themeColor} strokeWidth={2} fill="url(#secFinGradC)" />
                          <Area type="monotone" dataKey="disbursements" name="Disbursements" stroke={`${themeColor}99`} strokeWidth={2} fill="url(#secFinGradD)" />
                          <Area type="monotone" dataKey="expenditures" name="Expenditures" stroke={`${themeColor}55`} strokeWidth={1.5} fill="none" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">No time-series data</div>}
                </CardContent></Card>

                <Card><CardHeader><CardTitle className="text-sm">Transaction Type Breakdown</CardTitle></CardHeader><CardContent>
                  {transactionsByType.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie data={transactionsByType} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}>
                            {transactionsByType.map((_, index) => <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />)}
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => formatCurrencyShort(value)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">No transaction data</div>}
                </CardContent></Card>
              </div>

              <Card><CardHeader><CardTitle className="text-sm">Financial Summary</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-muted-foreground mb-1">Commitments</p><p className="text-xl font-bold text-foreground">{formatCurrencyShort(metrics.commitments)}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Disbursements</p><p className="text-xl font-bold text-foreground">{formatCurrencyShort(metrics.disbursements)}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Expenditures</p><p className="text-xl font-bold text-foreground">{formatCurrencyShort(metrics.expenditures)}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Inflows</p><p className="text-xl font-bold text-foreground">{formatCurrencyShort(metrics.inflows)}</p></div>
                </div>
              </CardContent></Card>
            </TabsContent>

            {/* Activities */}
            <TabsContent value="activities" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {[
                    { key: 'all', label: 'All', count: activities.length },
                    { key: '1', label: 'Pipeline', count: activities.filter(a => a.activity_status === '1').length },
                    { key: '2', label: 'Active', count: activities.filter(a => a.activity_status === '2').length },
                    { key: '4', label: 'Closed', count: activities.filter(a => a.activity_status === '4' || a.activity_status === '3').length },
                  ].map(f => (
                    <button key={f.key} onClick={() => setActivityStatusFilter(f.key)} className={`text-xs px-2.5 py-1 rounded-md transition-colors ${activityStatusFilter === f.key ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted'}`} style={activityStatusFilter === f.key ? { backgroundColor: themeColor } : undefined}>
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <select value={activitySort} onChange={e => setActivitySort(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1 text-muted-foreground">
                    <option value="value">Sort by Value</option><option value="committed">Sort by Committed</option><option value="disbursed">Sort by Disbursed</option><option value="allocation">Sort by Allocation %</option><option value="title">Sort by Title</option>
                  </select>
                  <div className="flex border border-border rounded-md">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivityView('table')}
                      className={`rounded-r-none h-7 px-2 ${activityView === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivityView('card')}
                      className={`rounded-l-none h-7 px-2 ${activityView === 'card' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{filteredActivities.length} activit{filteredActivities.length === 1 ? 'y' : 'ies'}</p>

              {activityView === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedActivities.map(activity => (
                    <Link key={activity.id} href={`/activities/${activity.id}`}>
                      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={getStatusVariant(activity.activity_status)} className="text-[10px] px-1.5 py-0">{getStatusLabel(activity.activity_status)}</Badge>
                          {activity.sectorPercentage < 100 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{activity.sectorPercentage}%</Badge>}
                        </div>
                        <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-2">{activity.title_narrative || 'Untitled Activity'}</h3>
                        {activity.iati_identifier && <code className="text-[10px] font-mono text-muted-foreground block mb-2 truncate">{activity.iati_identifier}</code>}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                          <div><p className="text-[10px] text-muted-foreground">Committed</p><p className="text-xs font-semibold text-foreground">{formatCurrencyShort(activity.commitments)}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">Disbursed</p><p className="text-xs font-semibold text-foreground">{formatCurrencyShort(activity.disbursements)}</p></div>
                        </div>
                        {activity.commitments > 0 && (
                          <div className="w-full bg-muted rounded-full h-1 mt-2">
                            <div className="h-1 rounded-full" style={{ width: `${Math.min((activity.disbursements / activity.commitments) * 100, 100)}%`, backgroundColor: themeColor }} />
                          </div>
                        )}
                      </CardContent></Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card><CardContent className="p-0"><div className="overflow-x-auto">
                  <table className="w-full text-xs"><thead><tr className="border-b border-border bg-muted">
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Title</th>
                    <th className="text-center py-2.5 px-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-center py-2.5 px-3 text-muted-foreground font-medium">Alloc %</th>
                    <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Committed</th>
                    <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Disbursed</th>
                  </tr></thead><tbody>
                    {paginatedActivities.map(activity => (
                      <tr key={activity.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2 px-3"><Link href={`/activities/${activity.id}`} className="font-medium text-foreground hover:underline">{(activity.title_narrative || 'Untitled').substring(0, 60)}</Link></td>
                        <td className="py-2 px-3 text-center"><Badge variant={getStatusVariant(activity.activity_status)} className="text-[10px] px-1.5 py-0">{getStatusLabel(activity.activity_status)}</Badge></td>
                        <td className="py-2 px-3 text-center text-muted-foreground">{activity.sectorPercentage}%</td>
                        <td className="py-2 px-3 text-right text-foreground">{formatCurrencyShort(activity.commitments)}</td>
                        <td className="py-2 px-3 text-right text-foreground">{formatCurrencyShort(activity.disbursements)}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div></CardContent></Card>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={activityPage <= 1} onClick={() => setActivityPage(p => p - 1)} className="text-xs h-7">Previous</Button>
                  <span className="text-xs text-muted-foreground">Page {activityPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={activityPage >= totalPages} onClick={() => setActivityPage(p => p + 1)} className="text-xs h-7">Next</Button>
                </div>
              )}
            </TabsContent>

            {/* Donors */}
            <TabsContent value="donors" className="space-y-6">
              <Card><CardHeader><CardTitle className="text-sm">Donor Landscape</CardTitle></CardHeader><CardContent>
                <SDGDonorRankings donors={donorRankings} sdgColor={themeColor} />
              </CardContent></Card>
            </TabsContent>

            {/* Organizations */}
            <TabsContent value="organizations" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  {['all', 'funding', 'implementing', 'accountable'].map(role => (
                    <button key={role} onClick={() => setOrgRoleFilter(role)} className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${orgRoleFilter === role ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted'}`} style={orgRoleFilter === role ? { backgroundColor: themeColor } : undefined}>
                      {role === 'all' ? 'All' : role}
                    </button>
                  ))}
                </div>
                <select value={orgSort} onChange={e => setOrgSort(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1 text-muted-foreground">
                  <option value="value">Sort by Value</option><option value="activities">Sort by Activities</option><option value="name">Sort by Name</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">{filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''}</p>
              {filteredOrgs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrgs.map(org => (
                    <Link key={org.id} href={`/organizations/${org.id}`}>
                      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {org.logo ? <img src={org.logo} alt={org.name} className="w-10 h-10 rounded object-cover flex-shrink-0" /> : (
                            <div className="w-10 h-10 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${themeColor}CC` }}>
                              {(org.acronym || org.name).substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-foreground truncate">{org.name}</h3>
                            {org.acronym && <p className="text-[10px] text-muted-foreground">{org.acronym}</p>}
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs font-semibold text-foreground">{formatCurrencyShort(org.totalValue)}</span>
                              <span className="text-[10px] text-muted-foreground">{org.activityCount} activit{org.activityCount === 1 ? 'y' : 'ies'}</span>
                            </div>
                            {org.contributionTypes.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {org.contributionTypes.map(ct => <span key={ct} className="text-[9px] px-1 py-0.5 rounded capitalize" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>{ct}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent></Card>
                    </Link>
                  ))}
                </div>
              ) : <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground text-sm">No organizations found</p></CardContent></Card>}
            </TabsContent>

            {/* Geography */}
            <TabsContent value="geography" className="space-y-6">
              <Card><CardHeader><CardTitle className="text-sm">Activity Locations</CardTitle></CardHeader><CardContent>
                <SDGGeographyMap locations={geographicDistribution} sdgColor={themeColor} />
              </CardContent></Card>

              {geographicDistribution.length > 0 && (
                <Card><CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Country Rankings</CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {
                      exportChartToCSV(geographicDistribution.map((g, i) => ({ Rank: i + 1, Country: g.countryName, Code: g.countryCode, Activities: g.activityCount, Committed: g.commitments, Disbursed: g.disbursements, Total: g.value })), `Sector ${sector.code} Countries`)
                    }}><Download className="h-3 w-3 mr-1" />CSV</Button>
                  </div>
                </CardHeader><CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border bg-muted">
                        <th className="text-left py-2.5 px-3 text-muted-foreground font-medium w-8">#</th>
                        <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Country</th>
                        <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Activities</th>
                        <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Committed</th>
                        <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Disbursed</th>
                        <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">Total</th>
                      </tr></thead>
                      <tbody>
                        {geographicDistribution.map((g, i) => (
                          <tr key={g.countryCode} className="border-b border-border hover:bg-muted/50">
                            <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 px-3"><div className="flex items-center gap-2"><Flag code={g.countryCode} className="w-5 h-3 object-cover rounded-sm" fallback={<MapPin className="w-3 h-3 text-muted-foreground" />} /><span className="text-foreground">{g.countryName}</span><span className="text-muted-foreground">({g.countryCode})</span></div></td>
                            <td className="py-2 px-3 text-right">{g.activityCount}</td>
                            <td className="py-2 px-3 text-right text-foreground">{formatCurrencyShort(g.commitments)}</td>
                            <td className="py-2 px-3 text-right text-foreground">{formatCurrencyShort(g.disbursements)}</td>
                            <td className="py-2 px-3 text-right font-medium text-foreground">{formatCurrencyShort(g.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent></Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}
