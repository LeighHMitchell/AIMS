"use client"

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowUpDown, Search, Download } from 'lucide-react'
import { SectorTimeSeriesData } from '@/types/sector-analytics'
import { formatTooltipCurrency } from './sectorTimeSeriesQueries'

interface SectorTimeSeriesTableProps {
  data: SectorTimeSeriesData[]
  sectorNames: string[]
  years: string[]
  totals: Record<string, number>
  dataType: 'planned' | 'actual'
}

type SortField = 'year' | 'sector' | 'planned' | 'actual' | 'activities' | 'partners'
type SortDirection = 'asc' | 'desc'

interface FlatTableRow {
  year: string
  sector: string
  amount: number
  activityCount: number
  partnerCount: number
}

export function SectorTimeSeriesTable({
  data,
  sectorNames,
  years,
  totals,
  dataType
}: SectorTimeSeriesTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('year')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Flatten data for table display
  const flatData: FlatTableRow[] = useMemo(() => {
    const rows: FlatTableRow[] = []
    
    data.forEach(yearData => {
      Object.entries(yearData.sectors).forEach(([sector, amount]) => {
        rows.push({
          year: yearData.year,
          sector,
          amount: amount || 0,
          activityCount: yearData.activityCount,
          partnerCount: yearData.partnerCount
        })
      })
    })
    
    return rows
  }, [data])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = flatData

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(row =>
        row.year.toLowerCase().includes(query) ||
        row.sector.toLowerCase().includes(query)
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case 'year':
          aVal = a.year
          bVal = b.year
          break
        case 'sector':
          aVal = a.sector
          bVal = b.sector
          break
        case 'planned':
        case 'actual':
          aVal = a.amount
          bVal = b.amount
          break
        case 'activities':
          aVal = a.activityCount
          bVal = b.activityCount
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
  }, [flatData, searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
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
      'Year',
      'Sector',
      dataType === 'planned' ? 'Planned' : 'Actual',
      'No. of Activities',
      'No. of Partners'
    ]

    const rows = filteredAndSortedData.map(row => [
      row.year,
      `"${row.sector.replace(/"/g, '""')}"`,
      row.amount.toFixed(2),
      row.activityCount,
      row.partnerCount
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sector-time-series-${dataType}-${new Date().toISOString().split('T')[0]}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
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

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return filteredAndSortedData.reduce((sum, row) => sum + row.amount, 0)
  }, [filteredAndSortedData])

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
        <p className="text-slate-500">No data available for the selected filters</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Search and Export */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by year or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="h-9"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-white z-10 shadow-sm">
              <TableHead className="bg-white">
                <SortButton field="year" label="Year" />
              </TableHead>
              <TableHead className="bg-white min-w-[200px]">
                <SortButton field="sector" label="Sector" />
              </TableHead>
              <TableHead className="text-right bg-white">
                <SortButton field={dataType} label={dataType === 'planned' ? 'Planned' : 'Actual'} />
              </TableHead>
              <TableHead className="text-right bg-white">
                <SortButton field="activities" label="No. of Activities" />
              </TableHead>
              <TableHead className="text-right bg-white">
                <SortButton field="partners" label="No. of Partners" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  No data found matching your search
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredAndSortedData.map((row, index) => (
                  <TableRow key={`${row.year}-${row.sector}-${index}`} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">
                      {row.year}
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-900">{row.sector}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${dataType === 'actual' ? 'text-green-700' : 'text-blue-700'}`}>
                        {formatCompactCurrency(row.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {row.activityCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {row.partnerCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-slate-100 font-semibold sticky bottom-0">
                  <TableCell colSpan={2}>
                    <span className="font-bold text-slate-900">
                      Total ({filteredAndSortedData.length} rows)
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${dataType === 'actual' ? 'text-green-700' : 'text-blue-700'}`}>
                      {formatCompactCurrency(grandTotal)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-slate-600">-</TableCell>
                  <TableCell className="text-right text-slate-600">-</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}












