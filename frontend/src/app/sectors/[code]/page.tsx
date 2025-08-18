"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Building2, 
  Activity,
  DollarSign,
  TrendingUp,
  BarChart3,
  ExternalLink
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getSectorLabel, getSectorDescription } from '@/components/forms/SectorSelect'
import dacSectorsData from '@/data/dac-sectors.json'
import sectorGroupData from '@/data/SectorGroup.json'

interface SectorInfo {
  code: string
  name: string
  description: string
  category: string
  level: 'group' | 'category' | 'sector' | 'subsector'
  activities: Activity[]
  totalBudget: number
  totalActivities: number
  topDonors: Array<{ name: string; amount: number }>
  relatedSectors?: SectorInfo[]
}

interface Activity {
  id: string
  title: string
  description: string
  status: string
  budget: number
  currency: string
  organization: string
  startDate: string
  endDate: string
  sectorPercentage?: number
}

export default function SectorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sectorCode = params?.code as string
  
  const [sectorInfo, setSectorInfo] = useState<SectorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine sector level based on code length
  const getSectorLevel = (code: string): 'group' | 'category' | 'sector' | 'subsector' => {
    if (code.length === 3) {
      return code.endsWith('0') ? 'group' : 'category'
    }
    return code.length === 5 ? 'subsector' : 'sector'
  }

  // Get sector information from static data
  const getSectorInfo = (code: string) => {
    const level = getSectorLevel(code)
    
    // For 5-digit codes, search in SectorGroup.json
    if (level === 'subsector') {
      const sector = sectorGroupData.data.find((s: any) => s.code === code && s.status === 'active')
      if (sector) {
        return {
          code: sector.code,
          name: sector.name,
          description: sector.name, // SectorGroup doesn't have detailed descriptions
          category: sector['codeforiati:category-name'] || 'Unknown Category',
          level: 'subsector' as const
        }
      }
    }
    
    // For 3-4 digit codes, search in DAC sectors data
    for (const [categoryName, sectors] of Object.entries(dacSectorsData)) {
      for (const sector of sectors as any[]) {
        if (sector.code === code) {
          return {
            code: sector.code,
            name: sector.name,
            description: sector.description,
            category: categoryName,
            level: getSectorLevel(code)
          }
        }
      }
    }
    
    return null
  }

  // Fetch sector activities and statistics
  const fetchSectorData = async (code: string) => {
    try {
      setLoading(true)
      
      // Get static sector information first
      const staticInfo = getSectorInfo(code)
      if (!staticInfo) {
        throw new Error('Sector not found')
      }
      
      // Try to fetch activities that use this sector
      let activities = []
      let totalBudget = 0
      
      try {
        const activitiesResponse = await fetch(`/api/sectors/${code}/activities`)
        if (activitiesResponse.ok) {
          const data = await activitiesResponse.json()
          activities = data.activities || []
          totalBudget = data.totalBudget || 0
        } else {
          console.warn('Failed to fetch activities for sector, using empty data')
        }
      } catch (apiError) {
        console.warn('API error fetching activities, using empty data:', apiError)
      }
      
      // Calculate statistics
      const donorMap = new Map<string, number>()
      activities.forEach((activity: Activity) => {
        const amount = donorMap.get(activity.organization) || 0
        donorMap.set(activity.organization, amount + activity.budget)
      })
      
      const topDonors = Array.from(donorMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
      
      setSectorInfo({
        ...staticInfo,
        activities,
        totalBudget,
        totalActivities: activities.length,
        topDonors
      })
      
    } catch (err) {
      console.error('Error fetching sector data:', err)
      setError('Failed to load sector information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sectorCode) {
      fetchSectorData(sectorCode)
    }
  }, [sectorCode])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-96" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    )
  }

  if (error || !sectorInfo) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Sector Not Found</h1>
          <p className="text-gray-600">The sector code "{sectorCode}" was not found.</p>
          <Button onClick={() => router.push('/sectors')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sectors
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => router.push('/sectors')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {sectorInfo.code} – {sectorInfo.name}
                </h1>
                <Badge variant="secondary" className="capitalize">
                  {sectorInfo.level}
                </Badge>
              </div>
              <p className="text-gray-600 mt-1">{sectorInfo.category}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {sectorInfo.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{sectorInfo.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(sectorInfo.totalBudget)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sectorInfo.totalActivities}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Donors</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sectorInfo.topDonors.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sector Code</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{sectorInfo.code}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="activities" className="space-y-6">
          <TabsList>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="donors">Top Donors</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Activities in This Sector</CardTitle>
                <CardDescription>
                  All activities that have been allocated to this sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sectorInfo.activities.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No activities found for this sector</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sectorInfo.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => router.push(`/activities/${activity.id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">
                              {activity.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Status: {activity.status}</span>
                              <span>Organization: {activity.organization}</span>
                              {activity.startDate && activity.endDate && (
                                <span>
                                  {new Date(activity.startDate).getFullYear()} - {new Date(activity.endDate).getFullYear()}
                                </span>
                              )}
                              {activity.sectorPercentage && (
                                <span>Allocation: {activity.sectorPercentage}%</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(activity.budget)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {activity.currency}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donors">
            <Card>
              <CardHeader>
                <CardTitle>Top Donors</CardTitle>
                <CardDescription>
                  Organizations with the highest funding in this sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sectorInfo.topDonors.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No donor data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sectorInfo.topDonors.map((donor, index) => (
                      <div key={donor.name} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-800">
                              {index + 1}
                            </span>
                          </div>
                          <span className="font-medium">{donor.name}</span>
                        </div>
                        <div className="font-medium">
                          {formatCurrency(donor.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Sector Analytics</CardTitle>
                <CardDescription>
                  Detailed analytics and trends for this sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Analytics coming soon</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This section will include funding trends, activity timelines, and comparative analysis.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
