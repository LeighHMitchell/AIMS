"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, RefreshCw, AlertCircle } from "lucide-react"
import { getSortIcon, sortableHeaderClasses } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-fetch"
import { renderMoney, formatClinicDate } from "./formatters"
import { toast } from "sonner"

type ColType = 'text' | 'code' | 'date' | 'money' | 'percent'
interface Column {
  key: string
  label: string
  type?: ColType
  gap?: boolean
  currencyKey?: string
}
type Row = Record<string, any>

function isMissing(col: Column, value: any): boolean {
  if (col.type === 'money' || col.type === 'percent') {
    return value == null || value === '' || Number(value) === 0 || Number.isNaN(Number(value))
  }
  return value == null || value === ''
}

const missingBadge = (
  <Badge variant="outline" className="text-helper border border-red-500 text-red-600 bg-transparent">
    <AlertCircle className="h-3 w-3 mr-1" />
    Missing
  </Badge>
)

function renderCell(col: Column, row: Row) {
  const value = row[col.key]
  if (isMissing(col, value)) {
    return col.gap ? missingBadge : <span className="text-muted-foreground">–</span>
  }
  switch (col.type) {
    case 'code':
      return (
        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
          {String(value)}
        </span>
      )
    case 'date':
      return <span className="text-body whitespace-nowrap">{formatClinicDate(String(value))}</span>
    case 'money':
      return (
        <span className="text-body font-medium">
          {renderMoney(Number(value), col.currencyKey ? row[col.currencyKey] : undefined)}
        </span>
      )
    case 'percent':
      return <span className="text-body whitespace-nowrap">{Number(value)}%</span>
    default:
      return <span className="text-body break-words">{String(value)}</span>
  }
}

export function DataClinicEntity({ entity }: { entity: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<string>("_activity")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/api/data-clinic/entity/${entity}`)
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      const data = await res.json()
      setColumns(data.columns || [])
      setRows(data.rows || [])
    } catch (err) {
      console.error(`[DataClinicEntity:${entity}]`, err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredSorted = useMemo(() => {
    let list = rows
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((r) => String(r._activity || '').toLowerCase().includes(q))
    }
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a[sortField], bv = b[sortField]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, searchQuery, sortField, sortDirection])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const colCount = columns.length + 1
  // ~160px per dynamic column + 240px for Activity, used as a min-width so the
  // table scrolls horizontally instead of crushing columns.
  const minWidth = 240 + columns.length * 160

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth }}>
              <thead className="border-b bg-surface-muted">
                <tr>
                  <th
                    className={`px-4 py-3 text-left align-top text-body font-medium min-w-[240px] ${sortableHeaderClasses}`}
                    onClick={() => handleSort('_activity')}
                  >
                    <div className="flex items-center gap-1 whitespace-nowrap">Activity {getSortIcon('_activity', sortField, sortDirection)}</div>
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left align-top text-body font-medium min-w-[140px] ${sortableHeaderClasses}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">{col.label} {getSortIcon(col.key, sortField, sortDirection)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <td colSpan={colCount} className="p-8 text-center text-muted-foreground">{error}</td>
                  </tr>
                ) : filteredSorted.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="p-8 text-center text-muted-foreground">
                      No records found with data gaps
                    </td>
                  </tr>
                ) : (
                  filteredSorted.map((row) => (
                    <tr key={row._id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium break-words">{row._activity}</p>
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 align-top">
                          {renderCell(col, row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
