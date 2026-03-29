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
import { Input } from '@/components/ui/input'
import {
  ArrowLeft, AlertCircle, LayoutGrid, Table as TableIcon, MapPin, Search,
  ChevronUp, ChevronDown, Building2, TrendingUp, Map as MapIcon,
  BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, AreaChart, Area,
  LineChart, Line,
} from 'recharts'
import { apiFetch } from '@/lib/api-fetch'
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { formatCurrency, TOOLTIP_CLASSES } from '@/lib/chart-utils'
import { SDGMetricCards } from '@/components/sdgs/SDGMetricCards'
// Map thumbnail used as banner instead of uploaded images
import { MiniChartCard } from '@/components/profiles/MiniChartCard'
import type { EmbeddedLocation } from '@/components/maps-v2/EmbeddedAtlasMap'

const EmbeddedAtlasMap = dynamic(
  () => import('@/components/maps-v2/EmbeddedAtlasMap'),
  { ssr: false, loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" /> }
)

// ---- Types ----

interface LocationProfileData {
  region: {
    name: string
    type: string
    st_pcode: string
    flag: string
    townshipCount: number
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
    reportingOrgName?: string | null
    reportingOrgAcronym?: string | null
    reportingOrgType?: string | null
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
    orgType?: string
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
  townshipBreakdown: Array<{
    ts_pcode: string
    name: string
    activityCount: number
    commitments: number
    disbursements: number
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
    contributionTypes: string[]
  }>
  activityStatusBreakdown: Array<{
    status: string
    statusLabel: string
    count: number
    totalValue: number
  }>
  mapLocations: Array<{
    id: string
    latitude: number
    longitude: number
    name?: string
    activity?: {
      id: string
      title: string
      status?: string
      organization_name?: string
    }
  }>
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

function formatAmountShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`
  return `${sign}${abs.toFixed(0)}`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    '1': 'Pipeline', '2': 'Implementation', '3': 'Completion',
    '4': 'Closed', '5': 'Cancelled', '6': 'Suspended',
  }
  return labels[status || ''] || 'Unknown'
}

function getStatusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === '2') return 'default'
  if (status === '4') return 'secondary'
  if (status === '5') return 'destructive'
  return 'outline'
}

function getOrgTypeLabel(type?: string | null): string {
  if (!type) return ''
  const labels: Record<string, string> = {
    '10': 'Government', '15': 'Other Public Sector', '21': 'International NGO',
    '22': 'National NGO', '23': 'Regional NGO', '30': 'Public Private Partnership',
    '40': 'Multilateral', '60': 'Foundation', '70': 'Private Sector',
    '80': 'Academic/Research', '90': 'Other',
  }
  return labels[type] || type
}

import { CHART_COLOR_PALETTE } from '@/lib/chart-colors'
const PROFILE_CHART_COLORS = [...CHART_COLOR_PALETTE]
const LOCATION_COLOR = '#4c5568'

// ---- Component ----

export default function LocationProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<LocationProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Activities tab state
  const [activityView, setActivityView] = useState<'card' | 'table'>('card')
  const [activityStatusFilter, setActivityStatusFilter] = useState<string>('all')
  const [activitySort, setActivitySort] = useState<string>('value')
  const [activityPage, setActivityPage] = useState(1)

  // Township search
  const [townshipSearch, setTownshipSearch] = useState('')

  // Map filter
  const [mapStatusFilter, setMapStatusFilter] = useState<string>('all')

  // Financial chart type
  const [finChartType, setFinChartType] = useState<'area' | 'bar' | 'line'>('area')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      abortControllerRef.current = new AbortController()
      setLoading(true)
      setError(null)

      try {
        const pcode = params?.pcode
        if (!pcode) throw new Error('Invalid location code')

        const response = await apiFetch(`/api/location-profiles/${pcode}`, {
          signal: abortControllerRef.current.signal,
        })
        if (!response.ok) {
          if (response.status === 404) throw new Error('Location not found')
          throw new Error('Failed to fetch location profile')
        }
        const result = await response.json()
        setData(result)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('[Location Profile] Error:', err)
        setError(err.message || 'Failed to load location profile')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    return () => { abortControllerRef.current?.abort() }
  }, [params?.pcode])

  useEffect(() => { setActivityPage(1) }, [activityStatusFilter, activitySort])

  // ---- Derived data ----
  const filteredActivities = useMemo(() => {
    if (!data) return []
    let activities = [...data.activities]
    if (activityStatusFilter !== 'all') {
      activities = activities.filter(a => a.activity_status === activityStatusFilter)
    }
    if (activitySort === 'value') activities.sort((a, b) => b.totalValue - a.totalValue)
    else if (activitySort === 'committed') activities.sort((a, b) => b.commitments - a.commitments)
    else if (activitySort === 'disbursed') activities.sort((a, b) => b.disbursements - a.disbursements)
    else if (activitySort === 'title') activities.sort((a, b) => (a.title_narrative || '').localeCompare(b.title_narrative || ''))
    return activities
  }, [data, activityStatusFilter, activitySort])

  const filteredMapLocations = useMemo((): EmbeddedLocation[] => {
    if (!data) return []
    let locs = data.mapLocations
    if (mapStatusFilter !== 'all') {
      locs = locs.filter(l => l.activity?.status === mapStatusFilter)
    }
    return locs.map(l => ({
      id: l.id,
      latitude: l.latitude,
      longitude: l.longitude,
      name: l.name,
      activity: l.activity ? {
        id: l.activity.id,
        title: l.activity.title,
        status: l.activity.status,
        organization_name: l.activity.organization_name,
      } : undefined,
    }))
  }, [data, mapStatusFilter])

  const filteredTownships = useMemo(() => {
    if (!data) return []
    if (!townshipSearch) return data.townshipBreakdown
    const q = townshipSearch.toLowerCase()
    return data.townshipBreakdown.filter(t => t.name.toLowerCase().includes(q))
  }, [data, townshipSearch])

  const CARDS_PER_PAGE = 12
  const ROWS_PER_PAGE = 20
  const itemsPerPage = activityView === 'card' ? CARDS_PER_PAGE : ROWS_PER_PAGE
  const paginatedActivities = filteredActivities.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)

  // ---- Loading ----
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
          </div>
        </div>
      </MainLayout>
    )
  }

  // ---- Error ----
  if (error || !data) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Location Profile</h2>
                <p className="text-muted-foreground mb-4">{error || 'Failed to load profile data'}</p>
                <Button onClick={() => router.push('/location-profiles')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Location Profiles
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const { region, metrics, activities, organizations, transactionsByYear, transactionsByType, townshipBreakdown, yoyStats, donorRankings, activityStatusBreakdown, mapLocations } = data

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          <Breadcrumbs items={[
            { label: "Location Profiles", href: "/location-profiles" },
            { label: region.name },
          ]} />

          {/* Hero Banner with Map Tiles */}
          {(() => {
            // Center coordinates for each Myanmar state/region (lat, lng)
            const regionCoords: Record<string, [number, number]> = {
              'MMR001': [25.4, 97.4],  // Kachin - Myitkyina area
              'MMR002': [19.7, 97.2],  // Kayah - Loikaw
              'MMR003': [16.9, 97.7],  // Kayin - Hpa-An
              'MMR004': [21.3, 93.6],  // Chin - Hakha
              'MMR005': [22.1, 95.1],  // Sagaing - Monywa
              'MMR006': [12.1, 98.6],  // Tanintharyi - Dawei
              'MMR007': [17.3, 96.5],  // Bago
              'MMR008': [20.1, 94.9],  // Magway
              'MMR009': [21.9, 96.1],  // Mandalay
              'MMR010': [16.5, 97.6],  // Mon - Mawlamyine
              'MMR011': [20.1, 93.0],  // Rakhine - Sittwe
              'MMR012': [16.8, 96.2],  // Yangon
              'MMR013': [20.8, 97.0],  // Shan South - Taunggyi
              'MMR014': [21.2, 97.8],  // Shan East - Kengtung
              'MMR015': [23.0, 97.5],  // Shan North - Lashio
              'MMR016': [16.8, 94.8],  // Ayeyarwady - Pathein
              'MMR017': [19.8, 96.1],  // Naypyidaw
              'MMR018': [12.0, 99.0],  // Tanintharyi (alt)
            }
            const [lat, lng] = regionCoords[region.st_pcode] || [20.0, 96.0]
            // Generate a grid of OSM tiles at zoom 7 — wider view, 8 cols x 2 rows
            const zoom = 7
            const n = Math.pow(2, zoom)
            const centerX = Math.floor(((lng + 180) / 360) * n)
            const latRad = lat * Math.PI / 180
            const centerY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
            const cols = 8
            const rows = 2
            const tiles: Array<{ x: number; y: number }> = []
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                tiles.push({ x: centerX - Math.floor(cols / 2) + col, y: centerY - Math.floor(rows / 2) + row })
              }
            }

            return (
              <div className="rounded-xl mb-6 border border-border relative overflow-hidden" style={{ height: 180 }}>
                <div className="absolute inset-0 grid grid-rows-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, filter: 'saturate(0.4) brightness(0.9)' }}>
                  {tiles.map((t, i) => (
                    <img
                      key={i}
                      src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent z-10" />
                <div className="absolute inset-0 flex items-center px-6 z-20">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-[#3C6255] flex items-center justify-center shadow-lg">
                      <MapPin className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold text-foreground drop-shadow-sm">{region.name}</h1>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Metric Cards - reuse SDGMetricCards */}
          <SDGMetricCards
            metrics={metrics}
            yoyStats={yoyStats}
            donorCount={donorRankings.length}
            sdgColor={LOCATION_COLOR}
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
                          <linearGradient id="locGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={LOCATION_COLOR} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={LOCATION_COLOR} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={TOOLTIP_CLASSES}>
                                  <p className="font-medium text-xs text-foreground mb-1">{payload[0]?.payload?.year}</p>
                                  {payload.map((entry: any, i: number) => (
                                    <p key={i} className="text-xs text-muted-foreground">
                                      {entry.name}: {formatCurrencyShort(entry.value)}
                                    </p>
                                  ))}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area type="monotone" dataKey="commitments" stackId="1" stroke={LOCATION_COLOR} strokeWidth={2} fill="url(#locGrad)" name="Commitments" />
                        <Area type="monotone" dataKey="disbursements" stackId="1" stroke="#7b95a7" strokeWidth={1.5} fill="#7b95a733" name="Disbursements" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No data</div>
                )}
            </MiniChartCard>

            {/* Transaction Breakdown */}
            <MiniChartCard title="Transaction Types">
                {transactionsByType.length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={transactionsByType} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={2}>
                          {transactionsByType.map((_, i) => (
                            <Cell key={i} fill={PROFILE_CHART_COLORS[i % PROFILE_CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={TOOLTIP_CLASSES}>
                                  <p className="font-medium text-xs text-foreground">{payload[0]?.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No data</div>
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
                                  <p className="font-medium text-xs text-foreground">{payload[0]?.payload?.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{formatCurrencyShort(payload[0]?.value as number)} disbursed</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="value" fill={LOCATION_COLOR} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No donor data</div>
                )}
            </MiniChartCard>

            {/* Top Townships */}
            <MiniChartCard title="Top Townships">
                {townshipBreakdown.length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={townshipBreakdown.slice(0, 5).map(t => ({
                          name: t.name.substring(0, 12),
                          value: t.activityCount,
                          fullName: t.name,
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 5, left: 0, bottom: 0 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} width={65} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={TOOLTIP_CLASSES}>
                                  <p className="font-medium text-xs text-foreground">{payload[0]?.payload?.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{payload[0]?.value} activities</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="value" fill="#4C5568" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">No township data</div>
                )}
            </MiniChartCard>
          </div>

          {/* ============ ALL SECTIONS ============ */}
          <div className="space-y-8">

            {/* ======== Map ======== */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Activity Locations in {region.name}
                  </CardTitle>
                  <select
                    value={mapStatusFilter}
                    onChange={e => setMapStatusFilter(e.target.value)}
                    className="text-xs border rounded px-2 py-1 bg-background text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    <option value="1">Pipeline</option>
                    <option value="2">Implementation</option>
                    <option value="3">Completion</option>
                    <option value="4">Closed</option>
                    <option value="5">Cancelled</option>
                    <option value="6">Suspended</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <EmbeddedAtlasMap
                  locations={filteredMapLocations}
                  height="550px"
                  showControls={true}
                />
              </CardContent>
            </Card>

            {/* ======== Townships ======== */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Townships in {region.name}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search townships..."
                      value={townshipSearch}
                      onChange={e => setTownshipSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTownships.length > 0 ? (
                  <div className="space-y-1">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                      <div className="col-span-5">Township</div>
                      <div className="col-span-2 text-right">Activities</div>
                      <div className="col-span-2 text-right">Committed</div>
                      <div className="col-span-3 text-right">Disbursed</div>
                    </div>
                    {filteredTownships.map(township => (
                      <div
                        key={township.ts_pcode}
                        className="grid grid-cols-12 gap-4 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="col-span-5 flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{township.name}</span>
                          <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded">{township.ts_pcode}</code>
                        </div>
                        <div className="col-span-2 text-right text-sm text-foreground">
                          {township.activityCount}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-[10px] text-muted-foreground">USD </span>
                          <span className="text-sm text-foreground">{formatAmountShort(township.commitments)}</span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="text-[10px] text-muted-foreground">USD </span>
                          <span className="text-sm text-foreground">{formatAmountShort(township.disbursements)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {townshipSearch ? 'No townships match your search' : 'No township-level data available'}
                    </p>
                    <p className="text-xs mt-1">Township data comes from activity location assignments and subnational breakdowns</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ======== Financials ======== */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Financial Trends by Year</CardTitle>
                  <div className="flex items-center border border-border rounded-md">
                    {([
                      { key: 'area' as const, icon: AreaChartIcon, title: 'Area chart' },
                      { key: 'bar' as const, icon: BarChart3, title: 'Bar chart' },
                      { key: 'line' as const, icon: LineChartIcon, title: 'Line chart' },
                    ]).map(({ key, icon: Icon, title }) => (
                      <button key={key} onClick={() => setFinChartType(key)} title={title} className={`p-1.5 ${finChartType === key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'} ${key === 'area' ? 'rounded-l-md' : key === 'line' ? 'rounded-r-md' : ''}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {transactionsByYear.length > 0 ? (
                  <div className="h-72">
                    {(() => {
                      const series = [
                        { key: 'commitments', name: 'Commitments', color: '#4c5568' },
                        { key: 'disbursements', name: 'Disbursements', color: '#7b95a7' },
                        { key: 'expenditures', name: 'Expenditures', color: '#dc2625' },
                      ]
                      const visibleSeries = series.filter(s => !hiddenSeries.has(s.key))
                      const toggleSeries = (key: string) => {
                        setHiddenSeries(prev => {
                          const next = new Set(prev)
                          if (next.has(key)) next.delete(key); else next.add(key)
                          return next
                        })
                      }
                      const commonProps = { data: transactionsByYear, margin: { top: 10, right: 30, left: 10, bottom: 5 } }
                      const xAxisProps = { dataKey: 'year' as const, tick: { fontSize: 11, fill: '#64748b' }, axisLine: { stroke: '#e5e7eb' }, tickLine: false }
                      const yAxisProps = { tick: { fontSize: 11, fill: '#64748b' }, axisLine: { stroke: '#e5e7eb' }, tickLine: false, tickFormatter: (v: number) => formatCurrency(v) }
                      const tooltipContent = ({ active, payload }: any) => {
                        if (active && payload?.length) {
                          return (
                            <div className={TOOLTIP_CLASSES}>
                              <p className="font-medium text-xs text-foreground mb-1">{payload[0]?.payload?.year}</p>
                              {payload.map((entry: any, i: number) => (
                                <p key={i} className="text-xs text-muted-foreground">{entry.name}: {formatCurrencyShort(entry.value)}</p>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }
                      const legend = (
                        <div className="flex items-center justify-center gap-4 mt-2">
                          {series.map(s => (
                            <button key={s.key} onClick={() => toggleSeries(s.key)} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: hiddenSeries.has(s.key) ? 0.35 : 1 }}>
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                              <span className="text-muted-foreground">{s.name}</span>
                            </button>
                          ))}
                        </div>
                      )
                      return (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            {finChartType === 'bar' ? (
                              <BarChart {...commonProps}>
                                <XAxis {...xAxisProps} />
                                <YAxis {...yAxisProps} />
                                <RechartsTooltip content={tooltipContent} />
                                {visibleSeries.map(s => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} />)}
                              </BarChart>
                            ) : finChartType === 'line' ? (
                              <LineChart {...commonProps}>
                                <XAxis {...xAxisProps} />
                                <YAxis {...yAxisProps} />
                                <RechartsTooltip content={tooltipContent} />
                                {visibleSeries.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />)}
                              </LineChart>
                            ) : (
                              <AreaChart {...commonProps}>
                                <defs>
                                  <linearGradient id="locGradLg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4c5568" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4c5568" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="disbGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7b95a7" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7b95a7" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis {...xAxisProps} />
                                <YAxis {...yAxisProps} />
                                <RechartsTooltip content={tooltipContent} />
                                {visibleSeries.map(s => <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={s.key === 'commitments' ? 'url(#locGradLg)' : s.key === 'disbursements' ? 'url(#disbGrad)' : 'transparent'} />)}
                              </AreaChart>
                            )}
                          </ResponsiveContainer>
                          {legend}
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mr-2 opacity-50" />
                    <p className="text-sm">No financial trend data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ======== Activities ======== */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm">Activities ({filteredActivities.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <select value={activityStatusFilter} onChange={e => setActivityStatusFilter(e.target.value)} className="text-xs border rounded px-2 py-1 bg-background text-foreground">
                      <option value="all">All Statuses</option>
                      <option value="1">Pipeline</option>
                      <option value="2">Implementation</option>
                      <option value="3">Completion</option>
                      <option value="4">Closed</option>
                      <option value="5">Cancelled</option>
                    </select>
                    <select value={activitySort} onChange={e => setActivitySort(e.target.value)} className="text-xs border rounded px-2 py-1 bg-background text-foreground">
                      <option value="value">Sort: Total Value</option>
                      <option value="committed">Sort: Committed</option>
                      <option value="disbursed">Sort: Disbursed</option>
                      <option value="title">Sort: Title</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Activity</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Reporting Org</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Committed</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Disbursed</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedActivities.map(activity => (
                        <tr key={activity.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-2 px-3">
                            <Link href={`/activities/${activity.id}`} className="hover:underline">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-foreground truncate max-w-xs">{activity.title_narrative || 'Untitled'}</p>
                                {activity.iati_identifier && (
                                  <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded flex-shrink-0">{activity.iati_identifier}</code>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="py-2 px-3 text-xs text-foreground">
                            {getStatusLabel(activity.activity_status)}
                          </td>
                          <td className="py-2 px-3">
                            {activity.reportingOrgName ? (
                              <div>
                                <p className="text-xs text-foreground truncate max-w-[150px]">{activity.reportingOrgAcronym || activity.reportingOrgName}</p>
                                {activity.reportingOrgType && (
                                  <p className="text-[10px] text-muted-foreground">{getOrgTypeLabel(activity.reportingOrgType)}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right"><span className="text-[10px] text-muted-foreground">USD </span><span className="text-foreground">{formatAmountShort(activity.commitments)}</span></td>
                          <td className="py-2 px-3 text-right"><span className="text-[10px] text-muted-foreground">USD </span><span className="text-foreground">{formatAmountShort(activity.disbursements)}</span></td>
                          <td className="py-2 px-3 text-right font-medium"><span className="text-[10px] text-muted-foreground">USD </span><span className="text-foreground">{formatAmountShort(activity.totalValue)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Showing {((activityPage - 1) * itemsPerPage) + 1}-{Math.min(activityPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled={activityPage === 1} onClick={() => setActivityPage(p => p - 1)}>Prev</Button>
                      <span className="text-xs text-muted-foreground px-2">{activityPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={activityPage === totalPages} onClick={() => setActivityPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ======== Organizations ======== */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Organizations ({organizations.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {organizations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Organization</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Role</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Activities</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Committed</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Disbursed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizations.map(org => (
                          <tr key={org.id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate max-w-xs">{org.name}</p>
                                {org.acronym && <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded">{org.acronym}</code>}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex gap-1 flex-wrap">
                                {org.contributionTypes.map(role => (
                                  <Badge key={role} variant="outline" className="text-[10px] px-1 py-0">
                                    {role === '1' ? 'Funding' : role === '2' ? 'Accountable' : role === '3' ? 'Extending' : role === '4' ? 'Implementing' : role}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right text-foreground">{org.activityCount}</td>
                            <td className="py-2 px-3 text-right"><span className="text-[10px] text-muted-foreground">USD </span><span className="text-foreground">{formatAmountShort(org.totalCommitted)}</span></td>
                            <td className="py-2 px-3 text-right"><span className="text-[10px] text-muted-foreground">USD </span><span className="text-foreground">{formatAmountShort(org.totalDisbursed)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No organization data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </MainLayout>
  )
}
