"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { SectorMetricsCards } from '@/components/analytics/sectors/SectorMetricsCards'
import { SectorFilters } from '@/components/analytics/sectors/SectorFilters'
import { SectorBarChart } from '@/components/analytics/sectors/SectorBarChart'
import { SectorSummaryTable } from '@/components/analytics/sectors/SectorSummaryTable'
import { SectorTimeSeriesPanel } from '@/components/analytics/sectors/SectorTimeSeriesPanel'
import { SectorMetrics, SectorAnalyticsFilters, SectorAnalyticsResponse } from '@/types/sector-analytics'
import { toast } from 'sonner'
import { AlertCircle, RefreshCw, Download, PieChart } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch';

export default function SectorAnalyticsPage() {
  const [data, setData] = useState<SectorMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [filters, setFilters] = useState<SectorAnalyticsFilters>({
    year: 'all',
    organizationId: 'all',
    vocabulary: 'DAC-5',
    groupByLevel: '5'
  })

  const [totalMetrics, setTotalMetrics] = useState({
    totalPlanned: 0,
    totalActual: 0,
    totalCommitments: 0,
    totalBudgets: 0,
    totalProjects: 0,
    totalPartners: 0
  })

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchData()
  }, [filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.year && filters.year !== 'all') {
        params.append('year', filters.year)
      }
      if (filters.organizationId && filters.organizationId !== 'all') {
        params.append('organizationId', filters.organizationId)
      }
      params.append('groupByLevel', filters.groupByLevel)

      const response = await apiFetch(`/api/analytics/sectors-analytics?${params}`)
      const result: SectorAnalyticsResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sector analytics')
      }

      setData(result.data || [])
      setTotalMetrics({
        totalPlanned: result.totalPlanned || 0,
        totalActual: result.totalActual || 0,
        totalCommitments: result.totalCommitments || 0,
        totalBudgets: result.totalBudgets || 0,
        totalProjects: result.totalProjects || 0,
        totalPartners: result.totalPartners || 0
      })

    } catch (error) {
      console.error('[SectorAnalytics] Error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load sector analytics')
      toast.error('Failed to load sector analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleExportAll = () => {
    if (data.length === 0) return

    const headers = [
      'Sector Code',
      'Sector Name',
      'Category Code',
      'Category Name',
      'Group Code',
      'Group Name',
      'Planned Disbursements',
      'Actual Disbursements',
      'Commitments',
      'Budgets',
      'Projects',
      'Partners',
      'Planned %',
      'Actual %',
      'Commitment %',
      'Budget %'
    ]

    const rows = data.map(item => [
      item.sectorCode,
      `"${item.sectorName.replace(/"/g, '""')}"`,
      item.categoryCode,
      `"${item.categoryName.replace(/"/g, '""')}"`,
      item.groupCode,
      `"${item.groupName.replace(/"/g, '""')}"`,
      item.plannedDisbursements.toFixed(2),
      item.actualDisbursements.toFixed(2),
      item.outgoingCommitments.toFixed(2),
      item.budgets.toFixed(2),
      item.projectCount,
      item.partnerCount,
      item.plannedPercentage.toFixed(2) + '%',
      item.actualPercentage.toFixed(2) + '%',
      item.commitmentPercentage.toFixed(2) + '%',
      item.budgetPercentage.toFixed(2) + '%'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sector-analytics-full-export-${new Date().toISOString().split('T')[0]}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Export completed successfully')
  }

  // Loading state
  if (loading && data.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-card">
          <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
            <div className="mx-auto px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PieChart className="h-6 w-6 text-foreground" />
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">Sector Analytics</h1>
                    <p className="text-sm text-muted-foreground">Loading sector data...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="container mx-auto p-6 space-y-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error && data.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-card">
          <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
            <div className="mx-auto px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PieChart className="h-6 w-6 text-foreground" />
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">Sector Analytics</h1>
                    <p className="text-sm text-muted-foreground">Error loading data</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
          <div className="container mx-auto p-6">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Failed to load sector analytics</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-card">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PieChart className="h-6 w-6 text-foreground" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Sector Analytics</h1>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive analysis of aid flows by DAC sector categories
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="h-9"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAll}
                  disabled={data.length === 0}
                  className="h-9"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto p-6 space-y-6">
          {/* Filters */}
          <SectorFilters
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Metrics Cards */}
          <SectorMetricsCards
            totalPlanned={totalMetrics.totalPlanned}
            totalActual={totalMetrics.totalActual}
            totalCommitments={totalMetrics.totalCommitments}
            totalBudgets={totalMetrics.totalBudgets}
            totalProjects={totalMetrics.totalProjects}
            totalPartners={totalMetrics.totalPartners}
          />

          {/* Charts and Table */}
          <div className="space-y-6">
            <SectorBarChart data={data} filters={filters} />
            
            {/* Time Series Visualization */}
            <SectorTimeSeriesPanel />
            
            {/* Summary Table */}
            <SectorSummaryTable data={data} />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}


