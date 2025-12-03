"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Download,
  Globe,
  Activity,
  Building2,
  DollarSign,
  MapPin,
  TrendingUp,
  PieChart,
  BarChart3,
  ExternalLink,
  AlertCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend } from 'recharts'
import Image from 'next/image'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

interface SDGData {
  sdg: {
    id: number
    name: string
    description: string
    color: string
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
    activityCount: number
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
    value: number
  }>
}

export default function SDGProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [sdgData, setSdgData] = useState<SDGData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const fetchSDGData = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      setLoading(true)
      setError(null)
      
      try {
        const sdgId = params.id
        if (!sdgId || isNaN(Number(sdgId))) {
          throw new Error('Invalid SDG ID')
        }

        const response = await fetch(`/api/sdgs/${sdgId}`, {
          signal: abortControllerRef.current.signal
        })
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('SDG goal not found')
          }
          throw new Error('Failed to fetch SDG data')
        }
        
        const data = await response.json()
        setSdgData(data)
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return
        }
        console.error('[SDG Profile] Error fetching data:', err)
        setError(err.message || 'Failed to load SDG profile')
      } finally {
        setLoading(false)
      }
    }

    fetchSDGData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [params.id])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-10 w-32" />
            </div>
            <Card className="mb-6">
              <CardContent className="p-8">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error || !sdgData) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading SDG Profile</h2>
                <p className="text-slate-600 mb-4">{error || 'Failed to load SDG profile data'}</p>
                <Button onClick={() => router.push('/activities')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Activities
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const { sdg, metrics, activities, organizations, transactionsByYear, transactionsByType, geographicDistribution } = sdgData

  // Chart colors
  const chartColors = [
    '#1e40af', // blue-800
    '#3b82f6', // blue-500
    '#0f172a', // slate-900
    '#475569', // slate-600
    '#64748b', // slate-500
    '#334155', // slate-700
  ]

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/activities')}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activities
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
                <Download className="h-4 w-4 mr-2" />
                Export Profile
              </Button>
            </div>
          </div>

          {/* SDG Header Card */}
          <Card className="mb-6 border-0 shadow-sm overflow-hidden">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* SDG Icon and Info - Columns 1-3 */}
                <div className="lg:col-span-3">
                  <div className="flex items-start gap-4">
                    {/* SDG Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 relative overflow-hidden rounded-lg shadow-md border-2 border-slate-200">
                        <img
                          src={`/images/sdg/E_SDG_Icons-${sdg.id.toString().padStart(2, '0')}.jpg`}
                          alt={`SDG ${sdg.id}: ${sdg.name}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>

                    {/* SDG Info */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Goal {sdg.id}: {sdg.name}
                      </h1>
                      
                      <p className="text-slate-600 leading-relaxed mb-4">
                        {sdg.description}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge 
                          style={{ backgroundColor: sdg.color, color: 'white' }}
                          className="text-sm px-3 py-1"
                        >
                          SDG {sdg.id}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats - Column 4 */}
                <div className="lg:col-span-1">
                  <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Activities</p>
                      <p className="text-2xl font-bold text-slate-900">{formatNumber(metrics.totalActivities)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Organizations</p>
                      <p className="text-2xl font-bold text-slate-900">{formatNumber(metrics.totalOrganizations)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Total Value</p>
                      <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.totalValue)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNumber(metrics.totalTransactions)}</p>
                  </div>
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Value</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalValue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Commitments</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.commitments)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Disbursements</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.disbursements)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="geography">Geography</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Aligned Activities</p>
                      <p className="text-3xl font-bold text-slate-900">{formatNumber(metrics.totalActivities)}</p>
                      <p className="text-xs text-slate-500 mt-1">activities contributing to this goal</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Organizations Involved</p>
                      <p className="text-3xl font-bold text-slate-900">{formatNumber(metrics.totalOrganizations)}</p>
                      <p className="text-xs text-slate-500 mt-1">organizations working on this goal</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Total Financial Value</p>
                      <p className="text-3xl font-bold text-slate-900">{formatCurrency(metrics.totalValue)}</p>
                      <p className="text-xs text-slate-500 mt-1">across all transactions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {activities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activities.slice(0, 5).map((activity) => (
                        <Link
                          key={activity.id}
                          href={`/activities/${activity.id}`}
                          className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">
                              {activity.title_narrative || 'Untitled Activity'}
                            </h3>
                            {activity.iati_identifier && (
                              <code className="text-xs text-slate-500">{activity.iati_identifier}</code>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-slate-900">{formatCurrency(activity.totalValue)}</p>
                            <p className="text-xs text-slate-500">{formatNumber(activity.transactionCount)} transactions</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactionsByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={transactionsByType}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {transactionsByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-500 text-center py-8">No transaction data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Financial Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactionsByYear.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={transactionsByYear}>
                          <XAxis dataKey="year" />
                          <YAxis />
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="commitments" stackId="a" fill={chartColors[0]} name="Commitments" />
                          <Bar dataKey="disbursements" stackId="a" fill={chartColors[1]} name="Disbursements" />
                          <Bar dataKey="expenditures" stackId="a" fill={chartColors[2]} name="Expenditures" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-500 text-center py-8">No time-series data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Commitments</p>
                      <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.commitments)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Disbursements</p>
                      <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.disbursements)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Expenditures</p>
                      <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.expenditures)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Inflows</p>
                      <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.inflows)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aligned Activities ({activities.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <Link
                          key={activity.id}
                          href={`/activities/${activity.id}`}
                          className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">
                              {activity.title_narrative || 'Untitled Activity'}
                            </h3>
                            {activity.iati_identifier && (
                              <code className="text-xs text-slate-500">{activity.iati_identifier}</code>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-slate-900">{formatCurrency(activity.totalValue)}</p>
                            <p className="text-xs text-slate-500">
                              {formatCurrency(activity.commitments)} committed, {formatCurrency(activity.disbursements)} disbursed
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No activities aligned to this SDG</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Participating Organizations ({organizations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {organizations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {organizations.map((org) => (
                        <Link
                          key={org.id}
                          href={`/organizations/${org.id}`}
                          className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          {org.logo && (
                            <img
                              src={org.logo}
                              alt={org.name}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {org.name}
                            </h3>
                            {org.acronym && (
                              <p className="text-xs text-slate-500">{org.acronym}</p>
                            )}
                            <p className="text-sm font-medium text-slate-900 mt-2">
                              {formatCurrency(org.totalValue)}
                            </p>
                            <p className="text-xs text-slate-500">{org.activityCount} activities</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No organizations found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Geography Tab */}
            <TabsContent value="geography" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {geographicDistribution.length > 0 ? (
                    <div className="space-y-3">
                      {geographicDistribution.map((item) => (
                        <div
                          key={item.countryCode}
                          className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-slate-400" />
                            <span className="font-medium text-slate-900">{item.countryCode}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No geographic data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}
