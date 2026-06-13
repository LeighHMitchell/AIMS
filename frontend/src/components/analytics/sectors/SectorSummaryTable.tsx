"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getSortIcon } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectorMetrics, SectorSortField, SortDirection } from '@/types/sector-analytics'
import { Search, Download, ChevronDown, ChevronRight } from 'lucide-react'
import { getBroadCategoryForCode } from '@/lib/sector-hierarchy'
import { formatCurrencyCompact } from '@/lib/format'

interface SectorSummaryTableProps {
  data: SectorMetrics[]
}

export function SectorSummaryTable({ data }: SectorSummaryTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SectorSortField>('actual')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [collapsedBroad, setCollapsedBroad] = useState<Set<string>>(new Set())

  const toggleBroad = (code: string) => {
    setCollapsedBroad(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

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

  // Group the (already-sorted) rows under their OECD broad category, with
  // per-group subtotals. Groups are ordered by the active sort field so the
  // grouping respects the user's chosen sort; rows within a group keep the
  // sorted order from filteredAndSortedData.
  const broadGroups = useMemo(() => {
    const map = new Map<string, { code: string; name: string; rows: SectorMetrics[] }>()
    for (const item of filteredAndSortedData) {
      const broad = getBroadCategoryForCode(item.sectorCode || item.categoryCode || item.groupCode)
      if (!map.has(broad.code)) map.set(broad.code, { code: broad.code, name: broad.name, rows: [] })
      map.get(broad.code)!.rows.push(item)
    }

    const groups = Array.from(map.values()).map(g => ({
      ...g,
      sub: {
        planned: g.rows.reduce((s, r) => s + r.plannedDisbursements, 0),
        actual: g.rows.reduce((s, r) => s + r.actualDisbursements, 0),
        commitments: g.rows.reduce((s, r) => s + r.outgoingCommitments, 0),
        budgets: g.rows.reduce((s, r) => s + r.budgets, 0),
        projects: g.rows.reduce((s, r) => s + r.projectCount, 0),
      },
    }))

    const sortVal = (g: typeof groups[number]): string | number => {
      switch (sortField) {
        case 'name': return g.name
        case 'planned': return g.sub.planned
        case 'actual': return g.sub.actual
        case 'commitments': return g.sub.commitments
        case 'budgets': return g.sub.budgets
        case 'projects': return g.sub.projects
        case 'partners': return g.sub.actual
        default: return g.sub.actual
      }
    }

    groups.sort((a, b) => {
      const av = sortVal(a)
      const bv = sortVal(b)
      if (typeof av === 'string') {
        return sortDirection === 'asc'
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av)
      }
      return sortDirection === 'asc' ? av - (bv as number) : (bv as number) - av
    })

    return groups
  }, [filteredAndSortedData, sortField, sortDirection])

  // Only group when it actually adds structure (i.e. at least one broad
  // category holds more than one row). At 1-digit grouping each row already IS
  // a broad category, so we fall back to the flat list.
  const showGroups = broadGroups.length > 0 && broadGroups.length < filteredAndSortedData.length

  const handleSort = (field: SectorSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Canonical compact currency from the shared lib.
  const formatCompactCurrency = formatCurrencyCompact

  const handleExportCSV = () => {
    const headers = [
      'Broad Category Code',
      'Broad Category Name',
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

    const rows = filteredAndSortedData.map(item => {
      const broad = getBroadCategoryForCode(item.sectorCode || item.categoryCode || item.groupCode)
      return [
      broad.code,
      `"${broad.name.replace(/"/g, '""')}"`,
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
      ]
    })

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
      className="h-8 px-2 font-medium hover:bg-muted/80"
      onClick={() => handleSort(field)}
    >
      <span>{label}</span>
      <span className="ml-1">{getSortIcon(field, sortField, sortDirection)}</span>
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

  const renderDataRow = (item: SectorMetrics, key: React.Key) => (
    <TableRow key={key} className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div className={showGroups ? 'pl-6' : ''}>
          <div className="font-semibold text-foreground">{item.sectorName}</div>
          <div className="text-helper text-muted-foreground">{item.sectorCode}</div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div>
          <div className="font-medium">{formatCompactCurrency(item.plannedDisbursements)}</div>
          <div className="text-helper text-muted-foreground">{item.plannedPercentage.toFixed(1)}%</div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div>
          <div className="font-semibold text-green-700">{formatCompactCurrency(item.actualDisbursements)}</div>
          <div className="text-helper text-muted-foreground">{item.actualPercentage.toFixed(1)}%</div>
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
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle>
              Sector Summary Table
            </CardTitle>
            <CardDescription>
              Detailed breakdown of financial metrics by sector
            </CardDescription>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-helper">
                {filteredAndSortedData.length} of {data.length} sectors
              </Badge>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handleExportCSV}
                title="Export CSV"
                aria-label="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className="min-w-[200px]">
                  <SortButton field="name" label="Sector" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="planned" label="Planned" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="actual" label="Actual" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="commitments" label="Commitments" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="budgets" label="Budgets" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="projects" label="Projects" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="partners" label="Partners" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No sectors found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {showGroups ? (
                    broadGroups.map(group => {
                      const collapsed = collapsedBroad.has(group.code)
                      return (
                        <React.Fragment key={group.code}>
                          {/* Broad-category group header (OECD top tier) */}
                          <TableRow
                            className="bg-muted/60 hover:bg-muted cursor-pointer border-t-2"
                            onClick={() => toggleBroad(group.code)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {collapsed ? (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <code className="text-xs font-mono text-muted-foreground bg-background rounded px-1.5 py-0.5">{group.code}</code>
                                <span className="font-bold text-foreground">{group.name}</span>
                                <Badge variant="secondary" className="text-helper ml-1">
                                  {group.rows.length}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCompactCurrency(group.sub.planned)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-700">
                              {formatCompactCurrency(group.sub.actual)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCompactCurrency(group.sub.commitments)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCompactCurrency(group.sub.budgets)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {group.sub.projects.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-muted-foreground">
                              —
                            </TableCell>
                          </TableRow>
                          {!collapsed && group.rows.map((item, index) => renderDataRow(item, `${group.code}-${index}`))}
                        </React.Fragment>
                      )
                    })
                  ) : (
                    filteredAndSortedData.map((item, index) => renderDataRow(item, index))
                  )}
                  {/* Totals Row */}
                  <TableRow className="bg-muted font-semibold sticky bottom-0">
                    <TableCell>
                      <div className="font-bold text-foreground">Total</div>
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
                    <TableCell className="text-right font-bold text-muted-foreground">
                      —
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


