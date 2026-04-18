"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilterBar } from "@/components/ui/filter-bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Download, Map as MapIcon, List, LayoutGrid, Inbox, MapPin } from "lucide-react"
import { FullPagination } from "@/components/ui/full-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { apiFetch } from "@/lib/api-fetch"
import { useUser } from "@/hooks/useUser"
import {
  PARCEL_STATUS_LABELS,
  STATES_REGIONS,
  TITLE_STATUS_OPTIONS,
  TITLE_STATUS_LABELS,
  formatHectares,
} from "@/lib/land-bank-utils"
import { TitleStatusBadge } from "@/components/land-bank/TitleStatusBadge"
import { ParcelStatusBadge } from "@/components/land-bank/ParcelStatusBadge"
import { ParcelMapView } from "@/components/land-bank/ParcelMapView"
import { ParcelActionMenu } from "@/components/land-bank/ParcelActionMenu"
import { ParcelCardModern } from "@/components/land-bank/ParcelCardModern"
import type { LandParcel, ParcelStatus } from "@/types/land-bank"

export default function ParcelsListPage() {
  const router = useRouter()
  const { permissions } = useUser()
  const [parcels, setParcels] = useState<LandParcel[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"list" | "card" | "map">("list")

  // Filters
  const [statusFilter, setStatusFilter] = useState("all")
  const [regionFilter, setRegionFilter] = useState("all")
  const [classificationFilter, setClassificationFilter] = useState("all")
  const [ministryFilter, setMinistryFilter] = useState("all")
  const [assetTypeFilter, setAssetTypeFilter] = useState("all")
  const [titleStatusFilter, setTitleStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [minSize, setMinSize] = useState("")
  const [maxSize, setMaxSize] = useState("")

  // Pagination/sort
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortField, setSortField] = useState("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Lookups
  const [classifications, setClassifications] = useState<string[]>([])
  const [assetTypes, setAssetTypes] = useState<string[]>([])
  const [ministries, setMinistries] = useState<{ id: string; name: string; code: string }[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [parcelsRes, classRes, assetRes, ministryRes] = await Promise.all([
          apiFetch("/api/land-bank"),
          apiFetch("/api/land-bank/classifications"),
          apiFetch("/api/land-bank/asset-types"),
          apiFetch("/api/line-ministries"),
        ])
        if (parcelsRes.ok) setParcels(await parcelsRes.json())
        if (classRes.ok) {
          const classes = await classRes.json()
          setClassifications(classes.map((c: any) => c.name))
        }
        if (assetRes.ok) {
          const types = await assetRes.json()
          setAssetTypes(types.map((a: any) => a.name))
        }
        if (ministryRes.ok) {
          setMinistries(await ministryRes.json())
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: parcels.length }
    parcels.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })
    return counts
  }, [parcels])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = parcels

    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter)
    if (regionFilter !== "all") list = list.filter(p => p.state_region === regionFilter)
    if (classificationFilter !== "all") list = list.filter(p => p.classification === classificationFilter)
    if (ministryFilter !== "all") list = list.filter(p => p.controlling_ministry_id === ministryFilter)
    if (assetTypeFilter !== "all") list = list.filter(p => p.asset_type === assetTypeFilter)
    if (titleStatusFilter !== "all") list = list.filter(p => p.title_status === titleStatusFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.parcel_code.toLowerCase().includes(q) ||
        (p.township || "").toLowerCase().includes(q)
      )
    }
    if (minSize) list = list.filter(p => (p.size_hectares || 0) >= parseFloat(minSize))
    if (maxSize) list = list.filter(p => (p.size_hectares || 0) <= parseFloat(maxSize))

    // Sort
    list = [...list].sort((a, b) => {
      const aVal = (a as any)[sortField]
      const bVal = (b as any)[sortField]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal) : aVal - bVal
      return sortDir === "asc" ? cmp : -cmp
    })

    return list
  }, [parcels, statusFilter, regionFilter, classificationFilter, ministryFilter, assetTypeFilter, titleStatusFilter, searchQuery, minSize, maxSize, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (regionFilter !== "all") params.set("region", regionFilter)
    window.open(`/api/land-bank/export?${params.toString()}`, "_blank")
  }

  const SortHeader = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => (
    <th
      className={`h-12 px-4 text-left align-middle text-body font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors ${className || ""}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  )

  return (
    <MainLayout>
      <div className="w-full">
        {/* Title + actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Parcels</h1>
              <p className="text-muted-foreground mt-1">Browse and manage all registered land parcels</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none h-9"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="rounded-none h-9"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className="rounded-l-none h-9"
              >
                <MapIcon className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>

            {permissions.canCreateParcels && (
              <Button onClick={() => router.push("/land-bank/new")} className="gap-2">
                <Plus className="h-4 w-4" /> Register Parcel
              </Button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar className="flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
            <Label className="text-helper text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parcels..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({statusCounts.all || 0})</SelectItem>
                {(Object.keys(PARCEL_STATUS_LABELS) as ParcelStatus[]).map(s => (
                  <SelectItem key={s} value={s}>
                    {PARCEL_STATUS_LABELS[s]} ({statusCounts[s] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Region</Label>
            <Select value={regionFilter} onValueChange={v => { setRegionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {STATES_REGIONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Classification</Label>
            <Select value={classificationFilter} onValueChange={v => { setClassificationFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {classifications.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Ministry</Label>
            <Select value={ministryFilter} onValueChange={v => { setMinistryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ministries</SelectItem>
                {ministries.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Asset Type</Label>
            <Select value={assetTypeFilter} onValueChange={v => { setAssetTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {assetTypes.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Title Status</Label>
            <Select value={titleStatusFilter} onValueChange={v => { setTitleStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {TITLE_STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{TITLE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Size (ha)</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Min"
                value={minSize}
                onChange={e => { setMinSize(e.target.value); setPage(1) }}
                className="w-20 h-9"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxSize}
                onChange={e => { setMaxSize(e.target.value); setPage(1) }}
                className="w-20 h-9"
              />
            </div>
          </div>
        </FilterBar>

        {/* Map view */}
        {viewMode === "map" ? (
          <ParcelMapView
            parcels={filtered}
            onParcelClick={(p) => router.push(`/land-bank/${p.id}`)}
          />
        ) : viewMode === "card" ? (
          <>
            {/* Grid/Cards view */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
                title="No parcels found"
                message="Try adjusting your search or filters."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginated.map(parcel => (
                  <ParcelCardModern
                    key={parcel.id}
                    parcel={parcel}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <FullPagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemLabel="parcels"
              />
            )}
          </>
        ) : (
          <>
            {/* Table view */}
            <div className="bg-card rounded-md ring-1 ring-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-surface-muted border-b border-border">
                    <tr>
                      <SortHeader field="name">Name</SortHeader>
                      <SortHeader field="state_region">Region</SortHeader>
                      <th className="h-12 px-4 text-left align-middle text-body font-medium text-muted-foreground">Township</th>
                      <SortHeader field="size_hectares">Size</SortHeader>
                      <SortHeader field="classification">Classification</SortHeader>
                      <SortHeader field="asset_type">Asset Type</SortHeader>
                      <SortHeader field="title_status">Title</SortHeader>
                      <SortHeader field="status">Status</SortHeader>
                      <SortHeader field="created_at">Created</SortHeader>
                      <th className="h-12 px-4 text-right align-middle text-body font-medium text-muted-foreground w-[60px]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 10 }).map((_, j) => (
                            <td key={j} className="px-4 py-2">
                              <div className="h-4 bg-muted animate-pulse rounded w-16" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <EmptyState
                            icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
                            title="No parcels found"
                            message="Try adjusting your search or filters."
                          />
                        </td>
                      </tr>
                    ) : (
                      paginated.map(parcel => (
                        <tr
                          key={parcel.id}
                          className="group hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => router.push(`/land-bank/${parcel.id}`)}
                        >
                          <td className="px-4 py-2.5 max-w-[240px]">
                            <div className="font-medium truncate">{parcel.name}</div>
                            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{parcel.parcel_code}</span>
                          </td>
                          <td className="px-4 py-2.5">{parcel.state_region}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{parcel.township || "—"}</td>
                          <td className="px-4 py-2.5 tabular-nums">{formatHectares(parcel.size_hectares)}</td>
                          <td className="px-4 py-2.5">{parcel.classification || "—"}</td>
                          <td className="px-4 py-2.5">{parcel.asset_type || "—"}</td>
                          <td className="px-4 py-2.5">
                            <TitleStatusBadge status={parcel.title_status} />
                          </td>
                          <td className="px-4 py-2.5">
                            <ParcelStatusBadge status={parcel.status} />
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-helper">
                            {new Date(parcel.created_at).toLocaleDateString()}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right"
                            onClick={e => e.stopPropagation()}
                          >
                            <ParcelActionMenu
                              parcel={parcel}
                              canEdit={permissions.canManageParcels}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <FullPagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemLabel="parcels"
              />
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
