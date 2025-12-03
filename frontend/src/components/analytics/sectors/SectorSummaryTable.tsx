"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectorMetrics, SectorSortField, SortDirection } from '@/types/sector-analytics'
import { Search, ArrowUpDown, Download, Table as TableIcon } from 'lucide-react'

interface SectorSummaryTableProps {
  data: SectorMetrics[]
}

export function SectorSummaryTable({ data }: SectorSummaryTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SectorSortField>('actual')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredAndSortedData = useMemo(() => {
    let filtered = data

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.sectorName.toLowerCase().includes(query) ||
        item.sectorCode.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query)
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case 'name':
          aVal = a.sectorName
          bVal = b.sectorName
          break
        case 'planned':
          aVal = a.plannedDisbursements
          bVal = b.plannedDisbursements
          break
        case 'actual':
          aVal = a.actualDisbursements
          bVal = b.actualDisbursements
          break
        case 'commitments':
          aVal = a.outgoingCommitments
          bVal = b.outgoingCommitments
          break
        case 'budgets':
          aVal = a.budgets
          bVal = b.budgets
          break
        case 'projects':
          aVal = a.projectCount
          bVal = b.projectCount
          break
        case 'partners':
          aVal = a.partnerCount
          bVal = b.partnerCount
          break
        default:
          return 0
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
    })

    return sorted
  }, [data, searchQuery, sortField, sortDirection])

  const handleSort = (field: SectorSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
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

  const formatCompactCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const handleExportCSV = () => {
    const headers = [
      'Sector Code',
      'Sector Name',
      'Category Code',
      'Category Name',
      'Planned Disbursements',
      'Actual Disbursements',
      'Commitments',
      'Budgets',
      'Projects',
      'Partners',
      'Planned %',
      'Actual %'
    ]

    const rows = filteredAndSortedData.map(item => [
      item.sectorCode,
      `"${item.sectorName.replace(/"/g, '""')}"`,
      item.categoryCode,
      `"${item.categoryName.replace(/"/g, '""')}"`,
      item.plannedDisbursements.toFixed(2),
      item.actualDisbursements.toFixed(2),
      item.outgoingCommitments.toFixed(2),
      item.budgets.toFixed(2),
      item.projectCount,
      item.partnerCount,
      item.plannedPercentage.toFixed(2) + '%',
      item.actualPercentage.toFixed(2) + '%'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sector-summary-${new Date().getTime()}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const SortButton = ({ field, label }: { field: SectorSortField, label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 px-2 font-medium ${sortField === field ? 'text-slate-900' : 'text-slate-600'}`}
      onClick={() => handleSort(field)}
    >
      <span>{label}</span>
      <ArrowUpDown className={`ml-1.5 h-3 w-3 ${sortField === field ? 'opacity-100' : 'opacity-50'}`} />
    </Button>
  )

  // Calculate totals for footer
  const totals = useMemo(() => ({
    planned: filteredAndSortedData.reduce((sum, item) => sum + item.plannedDisbursements, 0),
    actual: filteredAndSortedData.reduce((sum, item) => sum + item.actualDisbursements, 0),
    commitments: filteredAndSortedData.reduce((sum, item) => sum + item.outgoingCommitments, 0),
    budgets: filteredAndSortedData.reduce((sum, item) => sum + item.budgets, 0),
    projects: filteredAndSortedData.reduce((sum, item) => sum + item.projectCount, 0),
    partners: new Set(filteredAndSortedData.flatMap(item => Array(item.partnerCount).fill(0))).size
  }), [filteredAndSortedData])

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              Sector Summary Table
            </CardTitle>
            <CardDescription>
              Detailed breakdown of financial metrics by sector
            </CardDescription>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search sectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filteredAndSortedData.length} of {data.length} sectors
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 bg-white z-10 shadow-sm">
                <TableHead className="bg-white min-w-[200px]">
                  <SortButton field="name" label="Sector" />
                </TableHead>
                <TableHead className="text-right bg-white">
                  <SortButton field="planned" label="Planned" />
                </TableHead>
                <TableHead className="text-right bg-white">
                  <SortButton field="actual" label="Actual" />
                </TableHead>
                <TableHead className="text-right bg-white">
                  <SortButton field="commitments" label="Commitments" />
                </TableHead>
                <TableHead className="text-right bg-white">
                  <SortButton field="budgets" label="Budgets" />
                </TableHead>
                <TableHead className="text-right bg-white">
                  <SortButton field="projects" label="Projects" />
                </TableHead>
                <TableHead className="text-right bg-white">
                  <SortButton field="partners" label="Partners" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    No sectors found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredAndSortedData.map((item, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold text-slate-900">{item.sectorName}</div>
                          <div className="text-xs text-slate-500">{item.sectorCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <div className="font-medium">{formatCompactCurrency(item.plannedDisbursements)}</div>
                          <div className="text-xs text-slate-500">{item.plannedPercentage.toFixed(1)}%</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <div className="font-semibold text-green-700">{formatCompactCurrency(item.actualDisbursements)}</div>
                          <div className="text-xs text-slate-500">{item.actualPercentage.toFixed(1)}%</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCompactCurrency(item.outgoingCommitments)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCompactCurrency(item.budgets)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.projectCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.partnerCount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-slate-100 font-semibold sticky bottom-0">
                    <TableCell>
                      <div className="font-bold text-slate-900">Total</div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCompactCurrency(totals.planned)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {formatCompactCurrency(totals.actual)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCompactCurrency(totals.commitments)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCompactCurrency(totals.budgets)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {totals.projects.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      -
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}


