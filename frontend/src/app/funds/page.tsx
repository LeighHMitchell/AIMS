"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
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
import { Search, DollarSign, Users, Layers, TrendingUp, ArrowUpDown, Wallet, MoreVertical, Pencil, Download, Trash2, Copy } from "lucide-react"
import { useLoadingBar } from "@/hooks/useLoadingBar"
import { useUser } from "@/hooks/useUser"
import { exportActivityToPDF } from "@/lib/activity-export"
import { FundFlowSankey } from "@/components/charts/FundFlowSankey"
import { OrganizationLogo } from "@/components/ui/organization-logo"
import { getActivityStatusDisplay } from "@/lib/activity-status-utils"

interface FundSummary {
  id: string
  title: string
  acronym: string | null
  identifier: string
  status: string
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

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

// getActivityStatusDisplay imported from @/lib/activity-status-utils

export default function FundsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [funds, setFunds] = useState<FundSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("title")
  const [statusFilter, setStatusFilter] = useState("all")
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

  const copyToClipboard = useCallback((text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error('Failed to copy')
    )
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
    setIsDeleting(true)
    const fund = funds.find(f => f.id === id)
    const fundTitle = fund?.title || "Pooled fund"
    try {
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
      toast.success(`"${fundTitle}" was deleted successfully`)
      setFunds(prev => prev.filter(f => f.id !== id))
    } catch (e: any) {
      toast.error(e.message || "Failed to delete activity")
    } finally {
      setIsDeleting(false)
    }
  }, [funds, user])

  const handleExportPDF = useCallback(async (fundId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toast.loading("Generating PDF...", { id: "fund-export-pdf" })
    try {
      await exportActivityToPDF(fundId)
      toast.success("PDF exported successfully", { id: "fund-export-pdf" })
    } catch (err) {
      toast.error("Export failed", { id: "fund-export-pdf" })
    }
  }, [])

  const filteredFunds = searchQuery
    ? funds.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : funds

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="h-8 w-8 text-[#dc2625]" />
            Pooled Funds
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of all pooled and trust fund activities with contribution and disbursement summaries.
          </p>
        </header>

        {/* Filters - shaded card like activity list */}
        <div className="flex flex-wrap items-end gap-3 py-3 px-4 bg-surface-muted rounded-lg border border-gray-200">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-md">
            <Label className="text-xs text-muted-foreground">Search</Label>
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
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pipeline/identification">Pipeline</SelectItem>
                <SelectItem value="Implementation">Implementation</SelectItem>
                <SelectItem value="Completion">Completion</SelectItem>
                <SelectItem value="Post-completion">Post-completion</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-9">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
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
        </div>

        {/* Fund Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground"><p>{error}</p></div>
        ) : filteredFunds.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3" />
            <p className="text-lg font-medium">No pooled funds found</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Mark an activity as a pooled fund to see it here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFunds.map(fund => {
              const balanceColor = fund.balance > 0 ? 'text-green-600' : fund.balance < 0 ? 'text-red-600' : 'text-muted-foreground'
              const utilisation = fund.totalContributions > 0
                ? ((fund.totalDisbursements / fund.totalContributions) * 100).toFixed(0)
                : '0'

              return (
                <Card
                  key={fund.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border border-border relative"
                  onClick={() => router.push(`/activities/${fund.id}?section=fund-overview`)}
                >
                  <CardContent className="pt-5 pb-5">
                    {/* Title, status, and action menu */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-baseline gap-1.5 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="group/title font-semibold text-foreground text-base leading-tight line-clamp-2">
                            <Link
                              href={`/activities/${fund.id}?section=fund-overview`}
                              onClick={e => e.stopPropagation()}
                              className="focus:outline-none no-underline hover:no-underline"
                            >
                              {fund.title}
                            </Link>
                            {fund.acronym && (
                              <>
                                {' '}
                                <span className="font-semibold text-foreground">({fund.acronym})</span>
                                <button
                                  type="button"
                                  onClick={e => copyToClipboard(fund.acronym!, 'Acronym', e)}
                                  className="inline-flex p-0.5 rounded hover:bg-muted opacity-0 group-hover/title:opacity-100 focus:opacity-100 focus:outline-none transition-opacity align-middle"
                                  title="Copy acronym"
                                  aria-label="Copy acronym"
                                >
                                  <Copy className="w-3 h-3 text-muted-foreground" />
                                </button>
                              </>
                            )}
                          </h3>
                          <span className="group/id inline-flex items-center gap-0.5 mt-0.5">
                            <code className="inline-block shrink-0 text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                              {fund.identifier}
                            </code>
                            <button
                              type="button"
                              onClick={e => copyToClipboard(fund.identifier, 'Activity ID', e)}
                              className="inline-flex p-0.5 rounded hover:bg-muted opacity-0 group-hover/id:opacity-100 focus:opacity-100 focus:outline-none transition-opacity"
                              aria-label="Copy activity ID"
                            >
                              <Copy className="w-3 h-3 text-muted-foreground" />
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
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="bg-card/90 hover:bg-card"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={5} className="min-w-[160px] shadow-xl">
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation()
                                router.push(`/activities/new?id=${fund.id}`)
                              }}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={e => handleExportPDF(fund.id, e)}
                              className="cursor-pointer"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation()
                                setDeleteFundId(fund.id)
                              }}
                              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Fund Manager (pooled fund) – below activity ID; logo, name, acronym */}
                    {fund.fundManager && (
                      <div className="mb-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground mb-1 cursor-help">Fund Manager</p>
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
                            <span className="text-xs text-foreground font-medium truncate block">
                              {fund.fundManager.name}
                              {fund.fundManager.acronym && (
                                <span className="text-xs text-foreground font-medium ml-0.5">({fund.fundManager.acronym})</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Contributions</p>
                        <p className="text-sm font-semibold">{formatUSD(fund.totalContributions)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Disbursed</p>
                        <p className="text-sm font-semibold">{formatUSD(fund.totalDisbursements)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={`text-sm font-semibold ${balanceColor}`}>{formatUSD(fund.balance)}</p>
                      </div>
                    </div>

                    {/* Utilisation bar: track Pale Slate, progress Blue Slate */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{utilisation}% utilised</span>
                        <span>{fund.childCount} child activit{fund.childCount !== 1 ? 'ies' : 'y'}</span>
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
                      <div className="mb-3" onClick={e => e.stopPropagation()}>
                        <p className="text-xs text-muted-foreground mb-1">Child Activities</p>
                        <ul className="space-y-0.5">
                          {fund.childActivities.slice(0, 3).map(child => (
                            <li key={child.id}>
                              <Link
                                href={`/activities/${child.id}`}
                                className="text-xs text-foreground flex flex-wrap items-baseline gap-1 gap-y-0.5"
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
                                    className="text-xs text-primary font-medium"
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
                                  <p className="text-xs font-semibold text-foreground pb-2">All child activities</p>
                                  <ul className="space-y-1">
                                    {fund.childActivities.map(child => (
                                      <li key={child.id}>
                                        <Link
                                          href={`/activities/${child.id}`}
                                          className="text-xs text-foreground flex flex-wrap items-baseline gap-1"
                                          onClick={() => setOpenMoreChildFundId(null)}
                                        >
                                          <span className="break-words min-w-0">
                                            {child.title}
                                            {child.acronym && (
                                              <span className="text-muted-foreground ml-0.5">({child.acronym})</span>
                                            )}
                                          </span>
                                          <span className="shrink-0 font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded text-[11px]">
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
                    <div className="mb-3" onClick={e => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground mb-1">Fund Flow</p>
                      <FundFlowSankey
                        fundTitle={fund.title}
                        topDonors={fund.topDonors}
                        topChildFlows={fund.childFlows}
                        height={120}
                        className="w-full"
                      />
                    </div>

                    {/* Date range */}
                    {(fund.dateRange.start || fund.dateRange.end) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {fund.dateRange.start && new Date(fund.dateRange.start).toLocaleDateString()}
                        {fund.dateRange.start && fund.dateRange.end && ' — '}
                        {fund.dateRange.end && new Date(fund.dateRange.end).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
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
