"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/api-fetch"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { showUndoToast, useFlushDeletesOnUnmount } from "@/lib/toast-manager"
import { Search, DollarSign, Users, Layers, TrendingUp, ChevronsUpDown, Wallet, MoreVertical, Pencil, Download, Trash2, Copy, Calendar, LayoutGrid, TableIcon, ChevronRight } from "lucide-react"
import {
  Table,
  TableContainer,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  getSortIcon,
  sortableHeaderClasses,
} from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { useLoadingBar } from "@/hooks/useLoadingBar"
import { useUser } from "@/hooks/useUser"
// Lazy-load export utils — pulls in jspdf, jspdf-autotable, xlsx (~1MB) only when a user exports
const loadActivityExport = () => import("@/lib/activity-export")
const FundFlowSankey = dynamic(
  () => import("@/components/charts/FundFlowSankey").then(mod => mod.FundFlowSankey),
  { ssr: false, loading: () => <div className="h-[150px] w-full" /> }
)
import { OrganizationLogo } from "@/components/ui/organization-logo"
import { MountWhenVisible } from "@/components/ui/mount-when-visible"
import { getActivityStatusDisplay } from "@/lib/activity-status-utils"
import { formatActivityDate } from "@/lib/date-utils"

interface FundSummary {
  id: string
  title: string
  acronym: string | null
  identifier: string
  status: string
  banner: string | null
  fundManager: { name: string; acronym: string | null; logo: string | null } | null
  dateRange: { start: string | null; end: string | null }
  totalContributions: number
  totalDisbursements: number
  balance: number
  childCount: number
  childActivities: { id: string; title: string; acronym: string | null; identifier: string }[]
  topDonors: { name: string; acronym: string | null; total: number }[]
  topSectors: { name: string; total: number }[]
  childFlows: { id: string; name: string; total: number }[]
  sparkline: { quarter: string; amount: number }[]
}

type TableSortField = 'title' | 'fundManager' | 'status' | 'contributions' | 'disbursed' | 'balance' | 'utilised' | 'children'

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

// Activity-list style amount (no leading $, lowercase m/k); pair with a gray "USD" prefix
function formatAmount(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

// Reusable gray "USD" prefix before an amount, matching the activity list
function UsdAmount({ value }: { value: number }) {
  return (
    <>
      <span className="text-helper text-muted-foreground font-normal">USD</span> {formatAmount(value)}
    </>
  )
}

// getActivityStatusDisplay imported from @/lib/activity-status-utils

export default function FundsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [funds, setFunds] = useState<FundSummary[]>([])
  useFlushDeletesOnUnmount("funds-list")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("title")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('funds_viewMode')
      if (saved === 'card' || saved === 'table') return saved
    }
    return 'card'
  })
  const [tableSortField, setTableSortField] = useState<TableSortField>('title')
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expandedChildrenIds, setExpandedChildrenIds] = useState<Set<string>>(new Set())

  const handleSetViewMode = useCallback((mode: 'card' | 'table') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('funds_viewMode', mode) } catch { /* ignore */ }
    }
  }, [])

  const handleTableSort = useCallback((field: TableSortField) => {
    setTableSortField(prev => {
      if (prev === field) {
        setTableSortOrder(order => (order === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setTableSortOrder('asc')
      return field
    })
  }, [])
  const [deleteFundId, setDeleteFundId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [openMoreChildFundId, setOpenMoreChildFundId] = useState<string | null>(null)
  const moreChildCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearMoreChildCloseTimeout = useCallback(() => {
    if (moreChildCloseTimeoutRef.current) {
      clearTimeout(moreChildCloseTimeoutRef.current)
      moreChildCloseTimeoutRef.current = null
    }
  }, [])

  const scheduleMoreChildClose = useCallback(() => {
    clearMoreChildCloseTimeout()
    moreChildCloseTimeoutRef.current = setTimeout(() => setOpenMoreChildFundId(null), 250)
  }, [clearMoreChildCloseTimeout])

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error('Failed to copy')
    )
  }, [])

  const toggleChildren = useCallback((fundId: string) => {
    setExpandedChildrenIds(prev => {
      const next = new Set(prev)
      if (next.has(fundId)) next.delete(fundId)
      else next.add(fundId)
      return next
    })
  }, [])

  useLoadingBar(loading)

  const loadFunds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('sort', sortBy)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await apiFetch(`/api/funds?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to load funds')
        return
      }
      const data = await res.json()
      setFunds(data.funds || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load funds')
    } finally {
      setLoading(false)
    }
  }, [sortBy, statusFilter])

  useEffect(() => {
    loadFunds()
  }, [loadFunds])

  const handleDeleteFund = useCallback(async (id: string) => {
    setDeleteFundId(null)
    const fund = funds.find(f => f.id === id)
    const fundTitle = fund?.title || "Pooled fund"
    const snapshot = funds
    setFunds(prev => prev.filter(f => f.id !== id))

    showUndoToast(`"${fundTitle}" deleted`, {
      id: `delete-fund-${id}`,
      source: "funds-list",
      commit: async () => {
        const res = await apiFetch("/api/activities", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            user: user ? { id: user.id, name: user.name, role: user.role } : undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to delete")
        }
      },
      onUndo: () => setFunds(snapshot),
      onCommitError: (e: any) => {
        console.error('Error deleting fund:', e)
        setFunds(snapshot)
        toast.error(e?.message || "Failed to delete activity")
      },
    })
  }, [funds, user])

  const handleExportPDF = useCallback(async (fundId: string) => {
    toast.loading("Generating PDF...", { id: "fund-export-pdf" })
    try {
      const { exportActivityToPDF } = await loadActivityExport()
      await exportActivityToPDF(fundId)
      toast.success("PDF exported successfully", { id: "fund-export-pdf" })
    } catch (err) {
      toast.error("Export failed", { id: "fund-export-pdf" })
    }
  }, [])

  const filteredFunds = searchQuery
    ? funds.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : funds

  // Client-side sort for the table view (the "Sort by" dropdown drives the card view via the API)
  const tableFunds = React.useMemo(() => {
    const dir = tableSortOrder === 'asc' ? 1 : -1
    const sorted = [...filteredFunds].sort((a, b) => {
      switch (tableSortField) {
        case 'title':
          return a.title.localeCompare(b.title) * dir
        case 'fundManager':
          return (a.fundManager?.name || '').localeCompare(b.fundManager?.name || '') * dir
        case 'status':
          return (a.status || '').localeCompare(b.status || '') * dir
        case 'contributions':
          return (a.totalContributions - b.totalContributions) * dir
        case 'disbursed':
          return (a.totalDisbursements - b.totalDisbursements) * dir
        case 'balance':
          return (a.balance - b.balance) * dir
        case 'utilised': {
          const ua = a.totalContributions > 0 ? a.totalDisbursements / a.totalContributions : 0
          const ub = b.totalContributions > 0 ? b.totalDisbursements / b.totalContributions : 0
          return (ua - ub) * dir
        }
        case 'children':
          return (a.childCount - b.childCount) * dir
        default:
          return 0
      }
    })
    return sorted
  }, [filteredFunds, tableSortField, tableSortOrder])

  const renderFundActions = (fund: FundSummary, triggerClassName = "") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`bg-card/90 hover:bg-card ${triggerClassName}`}
          aria-label="Fund actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={5} className="min-w-[160px] shadow-xl">
        <DropdownMenuItem
          onClick={() => router.push(`/activities/new?id=${fund.id}`)}
          className="cursor-pointer"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExportPDF(fund.id)}
          className="cursor-pointer"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setDeleteFundId(fund.id)}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 dark:focus:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pooled Funds</h1>
            <p className="text-muted-foreground mt-1">
              Overview of all pooled and trust fund activities with contribution and disbursement summaries.
            </p>
          </div>
        </div>

        {/* Filters - shaded card like activity list */}
        <div className="flex flex-wrap items-end gap-3 py-3 px-4 bg-surface-muted rounded-lg ring-1 ring-border">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-md">
            <Label className="text-helper text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search funds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="1">Pipeline</SelectItem>
                <SelectItem value="2">Implementation</SelectItem>
                <SelectItem value="3">Finalisation</SelectItem>
                <SelectItem value="4">Closed</SelectItem>
                <SelectItem value="5">Cancelled</SelectItem>
                <SelectItem value="6">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Sort by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-9">
                <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Name</SelectItem>
                <SelectItem value="contributions">Total Contributions</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
                <SelectItem value="children">Child Activities</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md flex-shrink-0 ml-auto bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetViewMode('table')}
              aria-label="Table view"
              className={`rounded-r-none h-9 ${viewMode === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetViewMode('card')}
              aria-label="Card view"
              className={`rounded-l-none h-9 ${viewMode === 'card' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Fund Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  {/* Banner */}
                  <Skeleton className="h-28 w-full rounded-t-xl rounded-b-none" />
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    {/* Fund manager */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-5 w-20" /></div>
                      <div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-5 w-20" /></div>
                      <div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-5 w-20" /></div>
                    </div>
                    {/* Utilisation bar */}
                    <Skeleton className="h-2 w-full rounded-full" />
                    {/* Date range */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground"><p>{error}</p></div>
        ) : filteredFunds.length === 0 ? (
          <EmptyState
            illustration="/images/empty-loom.webp"
            title="No pooled funds found"
            message={
              searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Mark an activity as a pooled fund to see it here.'
            }
          />
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFunds.map(fund => {
              const balanceColor = fund.balance > 0 ? 'text-[hsl(var(--success-icon))]' : fund.balance < 0 ? 'text-destructive' : 'text-muted-foreground'
              const utilisation = fund.totalContributions > 0
                ? ((fund.totalDisbursements / fund.totalContributions) * 100).toFixed(0)
                : '0'

              return (
                <Card
                  key={fund.id}
                  className="group bg-card hover:border-border hover:shadow-card-hover transition-all duration-300 ease-in-out shadow-sm rounded-lg relative"
                >
                  {fund.banner && (
                    <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                      <img
                        src={fund.banner}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <CardContent className="pt-5 pb-5">
                    {/* Title, status, and action menu */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-baseline gap-1.5 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="group/title font-semibold text-foreground text-base leading-tight line-clamp-2">
                            <Link
                              href={`/activities/${fund.id}?section=fund-overview`}
                              className="focus:outline-none no-underline hover:no-underline"
                            >
                              {fund.title}
                              {fund.acronym && (
                                <span className="font-semibold text-foreground ml-1">({fund.acronym})</span>
                              )}
                            </Link>
                            {fund.acronym && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(fund.acronym!, 'Acronym')}
                                className="inline-flex p-0.5 rounded hover:bg-muted opacity-0 group-hover/title:opacity-100 focus:opacity-100 focus:outline-none transition-opacity align-middle"
                                title="Copy acronym"
                                aria-label="Copy acronym"
                              >
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </h3>
                          <span className="inline-flex mt-0.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fund.identifier, 'Activity ID')}
                              title="Click to copy"
                              aria-label="Copy activity ID"
                              className="inline-block shrink-0 text-xs font-mono bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              {fund.identifier}
                            </button>
                          </span>
                          {fund.status && (() => {
                            const { label, className } = getActivityStatusDisplay(fund.status)
                            return (
                              <span className="mt-1 block">
                                <Badge className={className}>
                                  {label}
                                </Badge>
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {renderFundActions(
                          fund,
                          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                        )}
                      </div>
                    </div>

                    {/* Fund Manager (pooled fund) – below activity ID; logo, name, acronym */}
                    {fund.fundManager && (
                      <div className="mb-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-helper text-muted-foreground mb-1 cursor-help">Fund Manager</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>From this activity&apos;s Reporting Organisation; edit on the activity.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center gap-2">
                          <OrganizationLogo
                            logo={fund.fundManager.logo}
                            name={fund.fundManager.name}
                            size="sm"
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-helper text-foreground font-medium truncate block">
                              {fund.fundManager.name}
                              {fund.fundManager.acronym && (
                                <span className="text-helper text-foreground font-medium ml-0.5">({fund.fundManager.acronym})</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <p className="text-helper text-muted-foreground">Contributions</p>
                        <p className="text-body font-semibold">{formatUSD(fund.totalContributions)}</p>
                      </div>
                      <div>
                        <p className="text-helper text-muted-foreground">Disbursed</p>
                        <p className="text-body font-semibold">{formatUSD(fund.totalDisbursements)}</p>
                      </div>
                      <div>
                        <p className="text-helper text-muted-foreground">Balance</p>
                        <p className={`text-sm font-semibold ${balanceColor}`}>{formatUSD(fund.balance)}</p>
                      </div>
                    </div>

                    {/* Utilisation bar: track Pale Slate, progress Blue Slate */}
                    <div className="mb-3">
                      <div className="flex justify-between text-helper text-muted-foreground mb-1">
                        <span>{utilisation}% utilised</span>
                      </div>
                      <div className="w-full rounded-full h-1.5 bg-[#cfd0d5]">
                        <div
                          className="h-1.5 rounded-full transition-all bg-[#4c5568]"
                          style={{ width: `${Math.min(parseFloat(utilisation), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Child Activities: first 3 + "Show all" with hover/click full list */}
                    {(fund.childActivities?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <p className="text-helper text-muted-foreground mb-1">Child Activities</p>
                        <ul className="space-y-0.5">
                          {fund.childActivities.slice(0, 3).map(child => (
                            <li key={child.id}>
                              <Link
                                href={`/activities/${child.id}`}
                                className="text-helper text-foreground flex flex-wrap items-baseline gap-1 gap-y-0.5"
                              >
                                <span className="break-words min-w-0">
                                  {child.title}
                                  {child.acronym && (
                                    <span className="text-muted-foreground ml-0.5">({child.acronym})</span>
                                  )}
                                </span>
                                <span className="shrink-0 font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[180px]">
                                  {child.identifier}
                                </span>
                              </Link>
                            </li>
                          ))}
                          {fund.childActivities.length > 3 && (
                            <li>
                              <Popover
                                open={openMoreChildFundId === fund.id}
                                onOpenChange={open => setOpenMoreChildFundId(open ? fund.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-helper text-primary font-medium"
                                    onMouseEnter={() => { clearMoreChildCloseTimeout(); setOpenMoreChildFundId(fund.id); }}
                                    onMouseLeave={scheduleMoreChildClose}
                                  >
                                    Show all
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="start"
                                  className="max-h-64 overflow-y-auto w-auto min-w-[220px]"
                                  onMouseEnter={() => { clearMoreChildCloseTimeout(); setOpenMoreChildFundId(fund.id); }}
                                  onMouseLeave={scheduleMoreChildClose}
                                >
                                  <p className="text-helper font-semibold text-foreground pb-2">All child activities</p>
                                  <ul className="space-y-1">
                                    {fund.childActivities.map(child => (
                                      <li key={child.id}>
                                        <Link
                                          href={`/activities/${child.id}`}
                                          className="text-helper text-foreground flex flex-wrap items-baseline gap-1"
                                          onClick={() => setOpenMoreChildFundId(null)}
                                        >
                                          <span className="break-words min-w-0">
                                            {child.title}
                                            {child.acronym && (
                                              <span className="text-muted-foreground ml-0.5">({child.acronym})</span>
                                            )}
                                          </span>
                                          <span className="shrink-0 font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs">
                                            {child.identifier}
                                          </span>
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </PopoverContent>
                              </Popover>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Fund flow Sankey (donors → fund → sectors) */}
                    <div className="mb-3">
                      <p className="text-helper text-muted-foreground mb-1">Fund Flow</p>
                      <MountWhenVisible
                        rootMargin="400px"
                        placeholder={<div className="h-[150px] w-full" />}
                      >
                        <FundFlowSankey
                          fundTitle={fund.acronym ? `${fund.title} (${fund.acronym})` : fund.title}
                          topDonors={fund.topDonors}
                          topChildFlows={fund.childFlows}
                          height={150}
                          className="w-full"
                        />
                      </MountWhenVisible>
                    </div>

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-[#7b95a7]">Start Date</p>
                        <div className="flex items-center gap-2 font-medium text-body text-[#4c5568]">
                          <Calendar className="w-4 h-4 text-[#7b95a7]" />
                          <span>{fund.dateRange.start ? formatActivityDate(fund.dateRange.start) : 'Not set'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-[#7b95a7]">End Date</p>
                        <div className="flex items-center gap-2 font-medium text-body text-[#4c5568]">
                          <Calendar className="w-4 h-4 text-[#7b95a7]" />
                          <span>{fund.dateRange.end ? formatActivityDate(fund.dateRange.end) : 'Not set'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={`min-w-[280px] ${sortableHeaderClasses}`} onClick={() => handleTableSort('title')}>
                    <div className="flex items-center gap-1">Fund {getSortIcon('title', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className={`w-[140px] ${sortableHeaderClasses}`} onClick={() => handleTableSort('fundManager')}>
                    <div className="flex items-center gap-1">Fund Manager {getSortIcon('fundManager', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className={`w-[140px] ${sortableHeaderClasses}`} onClick={() => handleTableSort('status')}>
                    <div className="flex items-center gap-1">Status {getSortIcon('status', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleTableSort('contributions')}>
                    <div className="flex items-center justify-end gap-1">Contributions {getSortIcon('contributions', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleTableSort('disbursed')}>
                    <div className="flex items-center justify-end gap-1">Disbursed {getSortIcon('disbursed', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleTableSort('balance')}>
                    <div className="flex items-center justify-end gap-1">Balance {getSortIcon('balance', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleTableSort('utilised')}>
                    <div className="flex items-center justify-end gap-1">Utilised {getSortIcon('utilised', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleTableSort('children')}>
                    <div className="flex items-center justify-end gap-1">Children {getSortIcon('children', tableSortField, tableSortOrder)}</div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableFunds.map(fund => {
                  const balanceColor = fund.balance > 0 ? 'text-[hsl(var(--success-icon))]' : fund.balance < 0 ? 'text-destructive' : 'text-muted-foreground'
                  const utilisation = fund.totalContributions > 0
                    ? ((fund.totalDisbursements / fund.totalContributions) * 100).toFixed(0)
                    : '0'
                  const status = fund.status ? getActivityStatusDisplay(fund.status) : null
                  const isExpanded = expandedChildrenIds.has(fund.id)
                  const hasChildren = (fund.childActivities?.length ?? 0) > 0

                  return (
                    <React.Fragment key={fund.id}>
                      <TableRow className="group">
                        <TableCell>
                          <div className="flex items-start gap-1.5">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleChildren(fund.id)}
                                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? 'Collapse child activities' : 'Expand child activities'}
                              >
                                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : (
                              <span className="w-4 shrink-0" aria-hidden="true" />
                            )}
                            <h3 className="group/title font-medium text-foreground leading-tight [text-wrap:wrap]" title={fund.title}>
                            {fund.identifier && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(fund.identifier, 'Activity ID')
                                }}
                                title="Click to copy Activity ID"
                                className="mr-1.5 align-middle text-xs font-mono font-normal bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                              >
                                <span>{fund.identifier}</span>
                              </button>
                            )}
                            <Link
                              href={`/activities/${fund.id}?section=fund-overview`}
                              className="text-foreground no-underline hover:underline"
                            >
                              {fund.title}
                              {fund.acronym && (
                                <span className="font-medium text-foreground"> ({fund.acronym})</span>
                              )}
                            </Link>
                            </h3>
                          </div>
                        </TableCell>
                        <TableCell>
                          {fund.fundManager ? (
                            <div className="flex items-center gap-2 min-w-0" title={fund.fundManager.name}>
                              <OrganizationLogo
                                logo={fund.fundManager.logo}
                                name={fund.fundManager.name}
                                size="sm"
                                className="shrink-0"
                              />
                              <span className="text-helper text-foreground truncate">
                                {fund.fundManager.acronym || fund.fundManager.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {status ? (
                            <span className="text-helper text-foreground">{status.label}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap"><UsdAmount value={fund.totalContributions} /></TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap"><UsdAmount value={fund.totalDisbursements} /></TableCell>
                        <TableCell className={`text-right tabular-nums whitespace-nowrap font-medium ${balanceColor}`}><UsdAmount value={fund.balance} /></TableCell>
                        <TableCell className="text-right tabular-nums">{utilisation}%</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={hasChildren ? 'text-foreground' : 'text-muted-foreground'}>{fund.childCount}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {renderFundActions(
                            fund,
                            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && fund.childActivities.map(child => (
                        <TableRow key={child.id} className="bg-surface-muted/30 hover:bg-surface-muted/50">
                          <TableCell colSpan={9} className="py-2">
                            <div className="flex items-center gap-1.5 pl-6 border-l-2 border-border ml-2">
                              <span className="text-helper text-foreground leading-tight whitespace-nowrap" title={child.title}>
                                {child.identifier && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(child.identifier, 'Activity ID')
                                    }}
                                    title="Click to copy Activity ID"
                                    className="mr-1.5 align-middle text-xs font-mono font-normal bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                                  >
                                    <span>{child.identifier}</span>
                                  </button>
                                )}
                                <Link
                                  href={`/activities/${child.id}`}
                                  className="text-foreground no-underline hover:underline"
                                >
                                  {child.title}
                                  {child.acronym && (
                                    <span className="text-muted-foreground ml-0.5">({child.acronym})</span>
                                  )}
                                </Link>
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteFundId} onOpenChange={open => !open && setDeleteFundId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete activity</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this pooled fund activity? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteFundId(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteFundId && handleDeleteFund(deleteFundId)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
