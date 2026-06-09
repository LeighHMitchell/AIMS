"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Search, RefreshCw, AlertCircle, Pencil, X, Unlink, Building2, Check } from "lucide-react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, getSortIcon, sortableHeaderClasses } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-fetch"
import { renderMoney, formatClinicDate } from "./formatters"
import { OrganizationCombobox, Organization as ComboboxOrg } from "@/components/ui/organization-combobox"
import { toast } from "sonner"

type ColType = 'text' | 'code' | 'date' | 'money' | 'percent' | 'org'
interface Column {
  key: string
  label: string
  type?: ColType
  gap?: boolean
  currencyKey?: string
  editable?: boolean
  editOnMissingOnly?: boolean
  editor?: 'select' | 'number' | 'text'
  options?: { value: string; label: string }[]
  orgIdField?: string
  orgNameField?: string
}
type Row = Record<string, any>

function isMissing(col: Column, row: Row): boolean {
  const value = row[col.key]
  if (col.type === 'org') {
    return !row[`${col.key}_id`] && (value == null || value === '')
  }
  if (col.type === 'money' || col.type === 'percent') {
    return value == null || value === '' || Number(value) === 0 || Number.isNaN(Number(value))
  }
  return value == null || value === ''
}

export function DataClinicEntity({ entity }: { entity: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<string>("_activity")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [organizations, setOrganizations] = useState<ComboboxOrg[]>([])
  const [linking, setLinking] = useState<{ id: string; field: string } | null>(null)
  const [grouped, setGrouped] = useState(false)

  const hasOrgColumn = useMemo(() => columns.some((c) => c.type === 'org'), [columns])

  // Lazy-load the org list only when this entity has an org column.
  useEffect(() => {
    if (!hasOrgColumn || organizations.length) return
    (async () => {
      try {
        const res = await apiFetch('/api/organizations?limit=1000')
        if (!res.ok) return
        const data = await res.json()
        const list = (data.organizations || data || []).map((o: any) => ({
          id: o.id,
          name: o.name || o.reporting_org_name || 'Unknown',
          acronym: o.acronym,
          iati_org_id: o.iati_org_id,
          country: o.country_represented,
          organisation_type: o.type,
          logo: o.logo,
        }))
        setOrganizations(list)
      } catch (e) {
        console.error('[DataClinicEntity] org list fetch failed', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOrgColumn])

  const handleLinkOrg = async (row: Row, col: Column, orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (!org) return
    try {
      const res = await apiFetch(`/api/data-clinic/entity/${entity}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row._id, field: col.key, orgId, orgName: org.name }),
      })
      if (!res.ok) throw new Error('Link failed')
      setRows((prev) => prev.map((r) =>
        r._id === row._id ? { ...r, [col.key]: org.name, [`${col.key}_id`]: orgId } : r
      ))
      setLinking(null)
      toast.success('Organisation linked')
    } catch (e) {
      console.error(e)
      toast.error('Failed to link organisation')
    }
  }

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

  const startEdit = (row: Row, col: Column) => {
    setEditing({ id: row._id, field: col.key })
    setEditValue(row[col.key] != null ? String(row[col.key]) : "")
  }

  const saveEdit = async (row: Row, col: Column, value: string) => {
    try {
      const res = await apiFetch(`/api/data-clinic/entity/${entity}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row._id, field: col.key, value }),
      })
      if (!res.ok) throw new Error('Update failed')
      // keep the code+name display in sync for select columns
      const optLabel = col.options?.find((o) => o.value === value)?.label
      setRows((prev) => prev.map((r) =>
        r._id === row._id
          ? { ...r, [col.key]: value, ...(optLabel !== undefined ? { [`${col.key}_name`]: optLabel } : {}) }
          : r
      ))
      setEditing(null)
      toast.success('Updated')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update')
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

  // Rows grouped by their activity (preserving the current sort order of groups)
  const groups = useMemo(() => {
    const map = new Map<string, { activity: string; activityId: string; acronym: string; rows: Row[] }>()
    for (const r of filteredSorted) {
      const key = r._activityId || r._activity
      if (!map.has(key)) {
        map.set(key, { activity: r._activity, activityId: r._activityId, acronym: r._activityAcronym, rows: [] })
      }
      map.get(key)!.rows.push(r)
    }
    return Array.from(map.values())
  }, [filteredSorted])

  const renderEditor = (row: Row, col: Column) => {
    if (col.editor === 'select') {
      return (
        <div className="flex items-center gap-2">
          <Select defaultOpen value={editValue} onValueChange={(v) => saveEdit(row, col, v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {(col.options || []).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">{o.value}</span>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <Input
          type={col.editor === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(row, col, editValue) }}
          className="w-32"
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={() => saveEdit(row, col, editValue)} title="Save"><Check className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)} title="Cancel"><X className="h-4 w-4" /></Button>
      </div>
    )
  }

  const renderOrgCell = (col: Column, row: Row) => {
    const orgId = row[`${col.key}_id`]
    const orgName = row[col.key]
    if (linking && linking.id === row._id && linking.field === col.key) {
      return (
        <div className="flex items-center gap-2 min-w-[260px]">
          <OrganizationCombobox
            organizations={organizations}
            value={orgId || undefined}
            onValueChange={(id) => id && handleLinkOrg(row, col, id)}
            placeholder={orgName ? `Link “${orgName}”…` : 'Select organisation…'}
            contentAlign="end"
            defaultOpen
          />
          <Button size="sm" variant="ghost" onClick={() => setLinking(null)}><X className="h-4 w-4" /></Button>
        </div>
      )
    }
    const linkClick = () => setLinking({ id: row._id, field: col.key })
    if (orgId) {
      // Linked — show the org's logo + acronym (no badge); click to change.
      const org = organizations.find((o) => o.id === orgId)
      const label = org?.acronym || org?.name || orgName || '(linked org)'
      return (
        <button
          type="button"
          onClick={linkClick}
          title="Linked — click to change"
          className="flex items-center gap-2 rounded px-1 py-0.5 -mx-1 hover:bg-muted/60 transition-colors text-left"
        >
          {org?.logo ? (
            <img src={org.logo} alt="" className="h-5 w-5 rounded object-contain flex-shrink-0" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-body font-medium break-words">{label}</span>
        </button>
      )
    }
    if (orgName) {
      return (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-body break-words">{orgName}</span>
          <Badge variant="outline" className="text-helper border border-amber-500 text-amber-600 bg-transparent whitespace-nowrap cursor-pointer hover:bg-amber-50" title="Named but not linked — click to link" onClick={linkClick}>
            <Unlink className="h-3 w-3 mr-1" />Unlinked
          </Badge>
        </div>
      )
    }
    return (
      <Badge variant="outline" className="text-helper border border-red-500 text-red-600 bg-transparent cursor-pointer hover:bg-red-50" title="No organisation — click to link" onClick={linkClick}>
        <AlertCircle className="h-3 w-3 mr-1" />Missing
      </Badge>
    )
  }

  const renderCell = (col: Column, row: Row) => {
    if (col.type === 'org') return renderOrgCell(col, row)
    if (editing && editing.id === row._id && editing.field === col.key) {
      return renderEditor(row, col)
    }
    const value = row[col.key]
    if (isMissing(col, row)) {
      if (!col.gap) return <span className="text-muted-foreground">–</span>
      // Editable gaps are actionable → red & clickable. Non-editable gaps are
      // just informational → gray.
      return (
        <Badge
          variant="outline"
          className={col.editable
            ? 'text-helper border border-red-500 text-red-600 bg-transparent cursor-pointer hover:bg-red-50'
            : 'text-helper border border-gray-300 text-gray-500 bg-transparent'}
          onClick={col.editable ? () => startEdit(row, col) : undefined}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Missing
        </Badge>
      )
    }
    const editPencil = col.editable && !col.editOnMissingOnly ? (
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(row, col)}>
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </Button>
    ) : null

    const name = row[`${col.key}_name`]
    switch (col.type) {
      case 'code':
        // Code badge inline with the wrapping label (stays on the same line,
        // label wraps beside it when the column is narrow).
        return (
          <span className="text-body">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap align-middle mr-1.5">{String(value)}</span>
            {name ? <span className="break-words">{name}</span> : null}
            {editPencil}
          </span>
        )
      case 'date':
        return <span className="text-body whitespace-nowrap">{formatClinicDate(String(value))}{editPencil}</span>
      case 'money':
        return (
          <span className="text-body font-medium">
            {renderMoney(Number(value), col.currencyKey ? row[col.currencyKey] : undefined)}
          </span>
        )
      case 'percent':
        return <span className="text-body whitespace-nowrap">{Number(value)}%</span>
      default:
        return (
          <span className="inline-flex items-center gap-2">
            <span className="text-body break-words">{String(value)}</span>
            {editPencil}
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const colCount = columns.length + 1
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
            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background">
              <Switch id="group-by-activity" checked={grouped} onCheckedChange={setGrouped} />
              <Label htmlFor="group-by-activity" className="text-body cursor-pointer whitespace-nowrap">
                Group by Activity
              </Label>
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
          <Table className="border-0" style={{ minWidth }}>
            <TableHeader>
              <TableRow>
                <TableHead
                  className={`align-top min-w-[240px] ${sortableHeaderClasses}`}
                  onClick={() => handleSort('_activity')}
                >
                  <div className="flex items-center gap-1 whitespace-nowrap">Activity Title {getSortIcon('_activity', sortField, sortDirection)}</div>
                </TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`align-top min-w-[140px] ${sortableHeaderClasses}`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1 whitespace-nowrap">{col.label} {getSortIcon(col.key, sortField, sortDirection)}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="p-8 text-center text-muted-foreground">{error}</TableCell>
                </TableRow>
              ) : filteredSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="p-8 text-center text-muted-foreground">
                    No records found with data gaps
                  </TableCell>
                </TableRow>
              ) : grouped ? (
                groups.map((g) => (
                  <Fragment key={g.activityId || g.activity}>
                    <TableRow className="bg-surface-muted/60">
                      <TableCell colSpan={colCount} className="px-4 py-2">
                        <Link
                          href={`/activities/${g.activityId}`}
                          className="font-medium break-words no-underline hover:opacity-70 transition-opacity"
                        >
                          {g.activity}{g.acronym ? ` (${g.acronym})` : ''}
                        </Link>
                        <span className="ml-2 text-helper text-muted-foreground">({g.rows.length})</span>
                      </TableCell>
                    </TableRow>
                    {g.rows.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell className="align-top" />
                        {columns.map((col) => (
                          <TableCell key={col.key} className="align-top">
                            {renderCell(col, row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              ) : (
                filteredSorted.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="align-top">
                      <Link
                        href={`/activities/${row._activityId}`}
                        className="font-medium break-words no-underline hover:opacity-70 transition-opacity"
                      >
                        {row._activity}
                        {row._activityAcronym ? ` (${row._activityAcronym})` : ''}
                      </Link>
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key} className="align-top">
                        {renderCell(col, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
