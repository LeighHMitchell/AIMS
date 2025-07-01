"use client"

import React, { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BudgetVsSpendingChart } from "@/components/charts/BudgetVsSpendingChart"
import { 
  BarChart3, 
  Calendar, 
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"

type TimePeriodType = 'year' | 'quarter'

interface AnalyticsFilters {
  donor: string
  aidType: string
  financeType: string
  flowType: string
  timePeriod: TimePeriodType
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    donor: 'all',
    aidType: 'all',
    financeType: 'all',
    flowType: 'all',
    timePeriod: 'year'
  })
  
  const [loading, setLoading] = useState(false)
  const [donors, setDonors] = useState<Array<{id: string, name: string}>>([])
  const [aidTypes, setAidTypes] = useState<Array<{code: string, name: string}>>([])
  const [financeTypes, setFinanceTypes] = useState<Array<{code: string, name: string}>>([])
  const [flowTypes, setFlowTypes] = useState<Array<{code: string, name: string}>>([])

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      setLoading(true)
      
      // Load donors, aid types, finance types, and flow types
      const [donorsRes, aidTypesRes, financeTypesRes, flowTypesRes] = await Promise.all([
        fetch('/api/analytics/donors'),
        fetch('/api/analytics/aid-types'),
        fetch('/api/analytics/finance-types'),
        fetch('/api/analytics/flow-types')
      ])

      if (donorsRes.ok) {
        const donorsData = await donorsRes.json()
        setDonors(donorsData)
      }

      if (aidTypesRes.ok) {
        const aidTypesData = await aidTypesRes.json()
        setAidTypes(aidTypesData)
      }

      if (financeTypesRes.ok) {
        const financeTypesData = await financeTypesRes.json()
        setFinanceTypes(financeTypesData)
      }

      if (flowTypesRes.ok) {
        const flowTypesData = await flowTypesRes.json()
        setFlowTypes(flowTypesData)
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
      toast.error('Failed to load filter options')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof AnalyticsFilters, value: string | TimePeriodType) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const exportData = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        ...filters,
        export: 'true'
      })
      
      const response = await fetch(`/api/analytics/budget-vs-spending?${queryParams}`)
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `budget-vs-spending-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  Analytics
                </h1>
                <p className="text-muted-foreground mt-2">
                  Comprehensive insights into aid activities, budgets, and spending patterns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={exportData}
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button 
                  variant="outline" 
                  onClick={loadFilterOptions}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>
                  Filter the data by donor, aid type, finance type, flow type, and time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Donor Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Donor</label>
                    <Select value={filters.donor} onValueChange={(value) => handleFilterChange('donor', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select donor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Donors</SelectItem>
                        {donors.map((donor) => (
                          <SelectItem key={donor.id} value={donor.id}>
                            {donor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Aid Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Aid Type</label>
                    <Select value={filters.aidType} onValueChange={(value) => handleFilterChange('aidType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select aid type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Aid Types</SelectItem>
                        {aidTypes.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.code} - {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Finance Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Finance Type</label>
                    <Select value={filters.financeType} onValueChange={(value) => handleFilterChange('financeType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select finance type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Finance Types</SelectItem>
                        {financeTypes.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.code} - {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Flow Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Flow Type</label>
                    <Select value={filters.flowType} onValueChange={(value) => handleFilterChange('flowType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select flow type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Flow Types</SelectItem>
                        {flowTypes.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.code} - {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Period Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Period</label>
                    <Select value={filters.timePeriod} onValueChange={(value) => handleFilterChange('timePeriod', value as TimePeriodType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Calendar Year</SelectItem>
                        <SelectItem value="quarter">Financial Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Active Filters Display */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(filters).map(([key, value]) => {
                    if (value !== 'all' && value !== 'year') {
                      return (
                        <Badge key={key} variant="secondary" className="flex items-center gap-1">
                          {key}: {value}
                          <button
                            onClick={() => handleFilterChange(key as keyof AnalyticsFilters, key === 'timePeriod' ? 'year' : 'all')}
                            className="ml-1 hover:bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    }
                    return null
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Main Chart */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Budget vs. Spending Analysis
                </CardTitle>
                <CardDescription>
                  Compare total budget allocations with actual spending (disbursements + expenditures) over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetVsSpendingChart filters={filters} />
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Loading...</div>
                  <p className="text-xs text-muted-foreground">Across all activities</p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Loading...</div>
                  <p className="text-xs text-muted-foreground">Disbursements + Expenditures</p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Execution Rate</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Loading...</div>
                  <p className="text-xs text-muted-foreground">Spending / Budget ratio</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}