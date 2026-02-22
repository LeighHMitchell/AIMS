"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getSortIcon } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { LoadingText } from '@/components/ui/loading-text'
import { Download, AlertCircle } from 'lucide-react'
import { SDG_GOALS } from '@/data/sdg-targets'
import { apiFetch } from '@/lib/api-fetch';

interface SDGTableProps {
  organizationId: string
  dateRange: { from: Date; to: Date }
  selectedSdgs: number[]
  metric: 'activities' | 'budget' | 'planned'
  refreshKey: number
}

interface CoverageData {
  sdgGoal: number
  sdgName: string
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

type SortField = 'sdgGoal' | 'activityCount' | 'totalBudget' | 'totalPlannedDisbursements'
type SortDirection = 'asc' | 'desc'

export function SDGTable({
  organizationId,
  dateRange,
  selectedSdgs,
  metric,
  refreshKey
}: SDGTableProps) {
  const [data, setData] = useState<CoverageData[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('sdgGoal')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    fetchData()
  }, [organizationId, dateRange, selectedSdgs, metric, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        organizationId: organizationId || 'all',
        dateFrom: dateRange.from.toISOString().split('T')[0],
        dateTo: dateRange.to.toISOString().split('T')[0],
        selectedSdgs: selectedSdgs.length > 0 ? selectedSdgs.join(',') : 'all',
        metric,
        dataType: 'coverage'
      })

      const response = await apiFetch(`/api/analytics/sdgs?${params}`)
      const result = await response.json()

      if (result.success && result.coverage) {
        setData(result.coverage)
      } else {
        console.error('Error fetching SDG table data:', result.error)
        setData([])
      }
    } catch (error) {
      console.error('Error fetching SDG table data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0.00'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortField) {
      case 'sdgGoal':
        aValue = a.sdgGoal
        bValue = b.sdgGoal
        break
      case 'activityCount':
        aValue = a.activityCount
        bValue = b.activityCount
        break
      case 'totalBudget':
        aValue = a.totalBudget
        bValue = b.totalBudget
        break
      case 'totalPlannedDisbursements':
        aValue = a.totalPlannedDisbursements
        bValue = b.totalPlannedDisbursements
        break
      default:
        return 0
    }

    if (sortDirection === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  const handleExportCSV = () => {
    if (sortedData.length === 0) return

    const headers = [
      'SDG',
      'SDG Name',
      'Number of Activities',
      'Total Activity Budget (USD)',
      'Total Planned Disbursements (USD)'
    ]

    const rows = sortedData.map(item => [
      `SDG ${item.sdgGoal}`,
      item.sdgName,
      item.activityCount.toFixed(1),
      item.totalBudget.toFixed(2),
      item.totalPlannedDisbursements.toFixed(2)
    ])

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sdg-analytics-${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 -ml-3 hover:bg-muted/80"
        onClick={() => handleSort(field)}
      >
        {children}
        <span className="ml-1">{getSortIcon(field, sortField, sortDirection)}</span>
      </Button>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Analytics Table</CardTitle>
          <CardDescription>Detailed view of SDG coverage data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
        </CardContent>
      </Card>
    )
  }

  if (sortedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Analytics Table</CardTitle>
          <CardDescription>Detailed view of SDG coverage data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No SDG data available</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SDG Analytics Table</CardTitle>
            <CardDescription>
              Detailed view of SDG coverage. Values are equally split when activities map to multiple SDGs.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead>
                  <SortButton field="sdgGoal">SDG</SortButton>
                </TableHead>
                <TableHead>SDG Name</TableHead>
                <TableHead className="text-right">
                  <SortButton field="activityCount">Number of Activities</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="totalBudget">Total Activity Budget (USD)</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="totalPlannedDisbursements">Total Planned Disbursements (USD)</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item) => {
                const goal = SDG_GOALS.find(g => g.id === item.sdgGoal)
                return (
                  <TableRow key={item.sdgGoal}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: goal?.color || '#64748b' }}
                        />
                        SDG {item.sdgGoal}
                      </div>
                    </TableCell>
                    <TableCell>{item.sdgName}</TableCell>
                    <TableCell className="text-right">{item.activityCount.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalPlannedDisbursements)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}






