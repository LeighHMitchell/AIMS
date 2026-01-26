"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Building2, 
  Activity,
  Download,
  Filter,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api-fetch';

// Types
interface SectorTimeSeriesData {
  year: number
  sectors: {
    [sectorName: string]: number
  }
  total: number
}

interface SectorSummaryStats {
  total_funding: number
  top_sector_name: string
  top_sector_value: number
  top_donor_name: string
  top_donor_value: number
  active_projects: number
  sectors_count: number
  year_over_year_change: number
}

interface FilterOptions {
  implementationStatus: string
  donor: string | null
  donorGroup: string | null
  donorType: string | null
  partnerClassification: string | null
}

// Hero Stat Card Component
const HeroStatCard: React.FC<{
  label: string
  value: string | number
  icon: React.ElementType
  trend?: number
  loading?: boolean
}> = ({ label, value, icon: Icon, trend, loading = false }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20 mt-1" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {trend > 0 ? (
              <>
                <ArrowUpRight className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-600">+{trend}%</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="h-3 w-3 mr-1 text-red-600" />
                <span className="text-red-600">{trend}%</span>
              </>
            )}
            <span className="ml-1">from last year</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Filter Panel Component
const FilterPanel: React.FC<{
  filters: FilterOptions
  onChange: (filters: FilterOptions) => void
  options: {
    donors: Array<{ id: string; name: string }>
    donorGroups: Array<{ id: string; name: string }>
    donorTypes: Array<{ id: string; name: string }>
    partnerClassifications: Array<{ id: string; name: string }>
  }
}> = ({ filters, onChange, options }) => {
  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    onChange({
      ...filters,
      [key]: value === 'all' ? null : value
    })
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4" />
        <h3 className="font-semibold">Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Select
          value={filters.implementationStatus}
          onValueChange={(value) => handleFilterChange('implementationStatus', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Implementation Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="implementation">Implementation</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
            <SelectItem value="completion">Completion</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.donor || 'all'}
          onValueChange={(value) => handleFilterChange('donor', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Donor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Donors</SelectItem>
            {options.donors.map((donor) => (
              <SelectItem key={donor.id} value={donor.id}>
                {donor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.donorGroup || 'all'}
          onValueChange={(value) => handleFilterChange('donorGroup', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Donor Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {options.donorGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.donorType || 'all'}
          onValueChange={(value) => handleFilterChange('donorType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Donor Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {options.donorTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.partnerClassification || 'all'}
          onValueChange={(value) => handleFilterChange('partnerClassification', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Partner Classification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classifications</SelectItem>
            {options.partnerClassifications.map((classification) => (
              <SelectItem key={classification.id} value={classification.id}>
                {classification.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  )
}

// Main Sectors Dashboard Component
export default function SectorsDashboard() {
  const [filters, setFilters] = useState<FilterOptions>({
    implementationStatus: 'all',
    donor: null,
    donorGroup: null,
    donorType: null,
    partnerClassification: null,
  })

  const [timeSeriesData, setTimeSeriesData] = useState<SectorTimeSeriesData[]>([])
  const [summaryStats, setSummaryStats] = useState<SectorSummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    donors: Array<{ id: string; name: string }>
    donorGroups: Array<{ id: string; name: string }>
    donorTypes: Array<{ id: string; name: string }>
    partnerClassifications: Array<{ id: string; name: string }>
  }>({
    donors: [],
    donorGroups: [],
    donorTypes: [],
    partnerClassifications: []
  })

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData()
  }, [filters])

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const fetchFilterOptions = async () => {
    try {
      // Fetch filter options from various endpoints
      const [donorsRes, orgsRes, typesRes] = await Promise.all([
        apiFetch('/api/organizations'),
        apiFetch('/api/organization-groups'),
        apiFetch('/api/organization-types')
      ])

      if (donorsRes.ok && orgsRes.ok && typesRes.ok) {
        const donors = await donorsRes.json()
        const groups = await orgsRes.json()
        const types = await typesRes.json()

        setFilterOptions({
          donors: donors.map((d: any) => ({ id: d.id, name: d.name })),
          donorGroups: groups,
          donorTypes: types.map((t: any) => ({ id: t.code, name: t.label })),
          partnerClassifications: [
            { id: 'bilateral', name: 'Bilateral' },
            { id: 'multilateral', name: 'Multilateral' },
            { id: 'ngo', name: 'NGO' },
            { id: 'private', name: 'Private Sector' },
            { id: 'government', name: 'Government' }
          ]
        })
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      if (filters.implementationStatus && filters.implementationStatus !== 'all') {
        params.append('status', filters.implementationStatus)
      }
      if (filters.donor) params.append('donor', filters.donor)
      if (filters.donorGroup) params.append('donorGroup', filters.donorGroup)
      if (filters.donorType) params.append('donorType', filters.donorType)
      if (filters.partnerClassification) params.append('partnerClass', filters.partnerClassification)

      // Fetch time series and summary data
      const [timeSeriesRes, summaryRes] = await Promise.all([
        apiFetch(`/api/sectors/by-year?${params}`),
        apiFetch(`/api/sectors/summary?${params}`)
      ])

      if (timeSeriesRes.ok && summaryRes.ok) {
        const timeSeriesData = await timeSeriesRes.json()
        const summaryData = await summaryRes.json()
        
        setTimeSeriesData(timeSeriesData)
        setSummaryStats(summaryData)
      } else {
        // Use sample data if API returns error
        setSampleData()
      }
    } catch (error) {
      console.error('Error fetching sector data:', error)
      // Use sample data for now
      setSampleData()
    } finally {
      setLoading(false)
    }
  }

  const setSampleData = () => {
    // Sample time series data
    const sampleTimeSeries: SectorTimeSeriesData[] = [
      {
        year: 2020,
        sectors: {
          'Health': 1500000,
          'Education': 2000000,
          'Agriculture': 1200000,
          'Infrastructure': 1800000,
          'Governance': 800000
        },
        total: 7300000
      },
      {
        year: 2021,
        sectors: {
          'Health': 1800000,
          'Education': 2200000,
          'Agriculture': 1100000,
          'Infrastructure': 2100000,
          'Governance': 900000
        },
        total: 8100000
      },
      {
        year: 2022,
        sectors: {
          'Health': 2000000,
          'Education': 2500000,
          'Agriculture': 1300000,
          'Infrastructure': 2300000,
          'Governance': 1000000
        },
        total: 9100000
      },
      {
        year: 2023,
        sectors: {
          'Health': 2200000,
          'Education': 2800000,
          'Agriculture': 1400000,
          'Infrastructure': 2500000,
          'Governance': 1100000
        },
        total: 10000000
      },
      {
        year: 2024,
        sectors: {
          'Health': 2500000,
          'Education': 3200000,
          'Agriculture': 1600000,
          'Infrastructure': 2800000,
          'Governance': 1200000
        },
        total: 11300000
      }
    ]

    setTimeSeriesData(sampleTimeSeries)
    setSummaryStats({
      total_funding: 45800000,
      top_sector_name: 'Education',
      top_sector_value: 12700000,
      top_donor_name: 'World Bank',
      top_donor_value: 8500000,
      active_projects: 142,
      sectors_count: 5,
      year_over_year_change: 13
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value > 1000000 ? 'compact' : 'standard'
    }).format(value)
  }

  // Transform data for Recharts
  const chartData = timeSeriesData.map(item => {
    const dataPoint: any = { year: item.year }
    Object.entries(item.sectors).forEach(([sector, value]) => {
      dataPoint[sector] = value
    })
    return dataPoint
  })

  // Get all unique sectors for the chart
  const allSectors = Array.from(
    new Set(timeSeriesData.flatMap(item => Object.keys(item.sectors)))
  )

  // Define colors for sectors
  const sectorColors: { [key: string]: string } = {
    'Health': '#ef4444',
    'Education': '#3b82f6',
    'Agriculture': '#10b981',
    'Infrastructure': '#f59e0b',
    'Governance': '#8b5cf6',
    'Water & Sanitation': '#06b6d4',
    'Energy': '#ec4899',
    'Social Protection': '#6366f1'
  }

  const downloadCSV = () => {
    // Prepare CSV data
    const headers = ['Year', ...allSectors, 'Total']
    const rows = timeSeriesData.map(item => {
      const row = [item.year]
      allSectors.forEach(sector => {
        row.push(item.sectors[sector] || 0)
      })
      row.push(item.total)
      return row
    })

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sector-funding-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sector Overview</h1>
            <p className="text-gray-600 mt-1">Analyze funding distribution across different sectors</p>
          </div>
          
          <Button
            variant="outline"
            onClick={downloadCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Hero Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <HeroStatCard
            label="Total Funding"
            value={formatCurrency(summaryStats?.total_funding || 0)}
            icon={DollarSign}
            trend={summaryStats?.year_over_year_change}
            loading={loading}
          />
          <HeroStatCard
            label="Top Sector"
            value={summaryStats?.top_sector_name || '-'}
            icon={Activity}
            loading={loading}
          />
          <HeroStatCard
            label="Top Donor"
            value={summaryStats?.top_donor_name || '-'}
            icon={Building2}
            loading={loading}
          />
          <HeroStatCard
            label="Active Sectors"
            value={summaryStats?.sectors_count || 0}
            icon={PieChart}
            loading={loading}
          />
        </div>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          options={filterOptions}
        />

        {/* Stacked Sector Trend Chart */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Annual Funding by Sector
            </h2>
            
            {/* Chart Type Toggle */}
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'area' | 'bar')}>
              <TabsList>
                <TabsTrigger value="area">Area</TabsTrigger>
                <TabsTrigger value="bar">Bar</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {loading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    {allSectors.map((sector) => (
                      <linearGradient key={sector} id={`color${sector.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={sectorColors[sector] || '#94a3b8'} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={sectorColors[sector] || '#94a3b8'} stopOpacity={0.1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                  />
                  <Legend />
                  {allSectors.map((sector) => (
                    <Area
                      key={sector}
                      type="monotone"
                      dataKey={sector}
                      stackId="1"
                      stroke={sectorColors[sector] || '#94a3b8'}
                      fillOpacity={1}
                      fill={`url(#color${sector.replace(/\s+/g, '')})`}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                  />
                  <Legend />
                  {allSectors.map((sector) => (
                    <Bar
                      key={sector}
                      dataKey={sector}
                      stackId="a"
                      fill={sectorColors[sector] || '#94a3b8'}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </MainLayout>
  )
} 