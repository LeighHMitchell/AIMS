"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { Download, ArrowLeftRight, Activity, Info } from 'lucide-react'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { format, subMonths, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import EnhancedAidFlowGraph from './EnhancedAidFlowGraph'
import type { GraphData } from './EnhancedAidFlowGraph'
import { AidFlowOrgCombobox, type AidFlowOrgOption } from './AidFlowOrgCombobox'

interface DateRange {
  from: Date
  to: Date
}

type ViewMode = 'transaction' | 'activity'

// Actual IATI transaction types (v2.03). Planned Disbursements are added
// separately below a divider — they aren't a transaction type in IATI,
// they live in their own table.
const ACTUAL_TRANSACTION_TYPE_OPTIONS = [
  { label: 'Incoming Funds', value: '1' },
  { label: 'Outgoing Commitment', value: '2' },
  { label: 'Disbursement', value: '3' },
  { label: 'Expenditure', value: '4' },
  { label: 'Interest Payment', value: '5' },
  { label: 'Loan Repayment', value: '6' },
  { label: 'Reimbursement', value: '7' },
  { label: 'Purchase of Equity', value: '8' },
  { label: 'Sale of Equity', value: '9' },
  { label: 'Credit Guarantee', value: '10' },
  { label: 'Incoming Commitment', value: '11' },
  { label: 'Outgoing Pledge', value: '12' },
  { label: 'Incoming Pledge', value: '13' },
]

const PLANNED_TRANSACTION_TYPE_OPTION = { label: 'Planned Disbursement', value: 'PD' }

const TRANSACTION_TYPE_OPTIONS = [
  ...ACTUAL_TRANSACTION_TYPE_OPTIONS,
  PLANNED_TRANSACTION_TYPE_OPTION,
]

interface AidFlowMapProps {
  className?: string
  height?: number
  initialDateRange?: DateRange
}

export function AidFlowMap({ className, height = 300, initialDateRange }: AidFlowMapProps) {
  // Initialize with All Time as default
  const defaultDateRange = {
    from: initialDateRange?.from || new Date(2000, 0, 1),
    to: initialDateRange?.to || new Date()
  }
  
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string[]>(['3']) // Default to Disbursement
  const [stagedTransactionTypes, setStagedTransactionTypes] = useState<string[]>(['3']) // Staged selection for UI
  const [viewMode, setViewMode] = useState<ViewMode>('transaction')
  const isExpanded = useChartExpansion()
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [orgOptions, setOrgOptions] = useState<AidFlowOrgOption[]>([])
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('all')
  // Coordinate filter dropdowns so only one is open at a time.
  type OpenFilter = 'time' | 'txType' | null
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null)
  const filterOpenHandler = (key: Exclude<OpenFilter, null>) => (open: boolean) => {
    setOpenFilter(prev => open ? key : (prev === key ? null : prev))
  }
  
  // Quick date range presets. `code` is the short token shown in the
  // dropdown next to the label, styled like the IATI codes elsewhere.
  const datePresets = [
    { code: '1', label: 'Last 3 months', value: '3m' },
    { code: '2', label: 'Last 6 months', value: '6m' },
    { code: '3', label: 'Last 12 months', value: '12m' },
    { code: '4', label: 'This year', value: 'thisYear' },
    { code: '5', label: 'Last year', value: 'lastYear' },
    { code: '6', label: 'All time', value: 'all' }
  ]
  
  // Fetch aid flow data based on view mode
  const fetchAidFlowData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd')
      })
      
      let endpoint: string

      if (viewMode === 'transaction') {
        // Only show actual flows — no draft transactions. The status query
        // param is intentionally pinned to 'actual' here; the user-facing
        // status filter was removed.
        params.append('status', 'actual')
        if (transactionTypeFilter.length > 0) {
          params.append('transactionTypes', transactionTypeFilter.join(','))
        }
        endpoint = `/api/aid-flows/graph?${params.toString()}`
      } else {
        endpoint = `/api/aid-flows/activity-graph?${params.toString()}`
      }
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch data')
      }
      
      const data = await response.json()
      
      // Log debug info if available
      if (data.metadata?.debug) {
      }
      
      // Transform data to include both totalIn/totalOut and inflow/outflow
      const transformedNodes = data.nodes.map((node: any) => ({
        ...node,
        inflow: node.totalIn || node.inflow || 0,
        outflow: node.totalOut || node.outflow || 0
      }))
      
      
      setGraphData({
        nodes: transformedNodes || [],
        links: data.links || []
      })
      setMetadata({
        ...data.metadata,
        viewMode // Include view mode in metadata for display
      })
      
    } catch (err) {
      console.error('[AidFlowMap] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setGraphData(null)
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchAidFlowData()
  }, [dateRange, transactionTypeFilter, viewMode])

  // Fetch organisation list once for the search combobox. The endpoint is
  // bounded (default 100, max 500); for now we ask for the first 500 by name.
  useEffect(() => {
    let cancelled = false
    fetch('/api/organizations-list?limit=500&sortField=name&sortOrder=asc')
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled || !json) return
        const list = Array.isArray(json) ? json : (json.data || json.organizations || [])
        const opts: AidFlowOrgOption[] = list
          .map((o: any) => ({
            id: o.id,
            name: o.name || '',
            acronym: o.acronym || null,
          }))
          .filter((o: AidFlowOrgOption) => !!o.name)
        setOrgOptions(opts)
      })
      .catch(() => { /* combobox falls back to graph nodes */ })
    return () => { cancelled = true }
  }, [])

  // Resolve the selected org id back to a name the chart can match against
  // its node labels (the chart highlights by name substring).
  const searchQuery = useMemo(() => {
    if (!selectedOrgId) return ''
    const fromList = orgOptions.find(o => o.id === selectedOrgId)?.name
    if (fromList) return fromList
    const fromGraph = graphData?.nodes.find(n => n.id === selectedOrgId)?.name
    return fromGraph || ''
  }, [selectedOrgId, orgOptions, graphData])
  
  // Handle date preset selection
  const handlePresetSelect = (preset: string) => {
    const now = new Date()
    let newDateRange: DateRange
    
    switch (preset) {
      case '3m':
        newDateRange = { from: subMonths(now, 3), to: now }
        break
      case '6m':
        newDateRange = { from: subMonths(now, 6), to: now }
        break
      case '12m':
        newDateRange = { from: subMonths(now, 12), to: now }
        break
      case 'thisYear':
        newDateRange = { from: startOfYear(now), to: now }
        break
      case 'lastYear':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1)
        newDateRange = { from: startOfYear(lastYear), to: endOfYear(lastYear) }
        break
      case 'all':
        newDateRange = { from: new Date(2000, 0, 1), to: now }
        break
      default:
        return
    }
    
    setSelectedTimePeriod(preset)
    setDateRange(newDateRange)
  }
  
  // Export data
  const handleExport = () => {
    if (!graphData) return
    
    const exportData = {
      dateRange: {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      },
      metadata,
      nodes: graphData.nodes,
      links: graphData.links.map(link => ({
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target,
        value: link.value,
        flowType: link.flowType,
        aidType: link.aidType
      }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aid-flow-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-medium text-foreground">Aid Flow Map</CardTitle>
            <CardDescription className="text-helper text-muted-foreground mt-0.5">
              {viewMode === 'transaction'
                ? 'Each node is an organisation; each link is the total value of transactions between them. Larger nodes move more money; thicker links carry more value.'
                : 'Each node is an activity; each link is a defined relationship between two activities (parent, child, sibling, co-funded, or third-party).'
              }
            </CardDescription>
          </div>

          {isExpanded && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              disabled={!graphData || loading}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-1 bg-muted">
            <button
              onClick={() => setViewMode('transaction')}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-md text-body font-medium transition-all",
                viewMode === 'transaction'
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transactions
            </button>
            <button
              onClick={() => setViewMode('activity')}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-md text-body font-medium transition-all",
                viewMode === 'activity'
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Activity className="h-4 w-4" />
              Activities
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-lg border">
          {/* Search Organisation */}
          <div className="space-y-1.5">
            <label className="text-body font-medium text-foreground">Search Organisation</label>
            <AidFlowOrgCombobox
              organizations={orgOptions}
              value={selectedOrgId}
              onValueChange={setSelectedOrgId}
              placeholder="Search organisations..."
            />
          </div>

          {/* Time Period */}
          <div className="space-y-1.5">
            <label className="text-body font-medium text-foreground">Time Period</label>
            <Select
              value={selectedTimePeriod}
              onValueChange={handlePresetSelect}
              open={openFilter === 'time'}
              onOpenChange={filterOpenHandler('time')}
            >
              <SelectTrigger className="w-full h-10 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <span className="flex items-center gap-2">
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground">
                        {preset.code}
                      </code>
                      <span className="text-body">{preset.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Type — only show in transaction view */}
          {viewMode === 'transaction' ? (
            <div className="space-y-1.5">
              <label className="text-body font-medium text-foreground">Transaction Type</label>
              <MultiSelect
                options={TRANSACTION_TYPE_OPTIONS}
                selected={stagedTransactionTypes}
                onChange={setStagedTransactionTypes}
                placeholder="Transaction Types..."
                selectedLabel="types selected"
                onClear={() => {
                  // Reset both staged and applied state to Disbursement
                  setStagedTransactionTypes(['3'])
                  setTransactionTypeFilter(['3'])
                }}
                open={openFilter === 'txType'}
                onOpenChange={(open) => {
                  filterOpenHandler('txType')(open)
                  // When dropdown closes, apply the staged selection
                  if (!open) {
                    setTransactionTypeFilter(stagedTransactionTypes)
                  }
                }}
                renderOption={(option) => (
                  // Top border on the Planned Disbursement row separates it
                  // from the actual IATI transaction types above. PD isn't a
                  // transaction in IATI — it lives in its own table — so the
                  // divider makes the conceptual gap visible in the picker.
                  <span
                    className={cn(
                      "flex items-center gap-2 w-full",
                      option.value === 'PD' && "pt-2 mt-1 border-t border-border"
                    )}
                  >
                    <code className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">
                      {option.value}
                    </code>
                    <span className="text-body">{option.label}</span>
                  </span>
                )}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-body font-medium text-foreground">Relationship Types</label>
              <div className="w-full h-10 px-3 flex items-center text-body text-muted-foreground bg-white border rounded-md">
                All relationship types
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        {loading && (
          <ChartLoadingPlaceholder />
        )}
        
        {error && (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={fetchAidFlowData}>
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {!loading && !error && graphData && (
          <>
            {/* Info message when showing activities without relationships */}
            {viewMode === 'activity' && metadata?.hasRelationships === false && graphData.nodes.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-body text-amber-800 font-medium">No activity relationships defined</p>
                    <p className="text-body text-amber-700 mt-1">
                      Showing all published activities. To see connections between activities, 
                      create relationships in the Activity Profile by linking parent, child, sibling, 
                      co-funded, or third-party activities.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <EnhancedAidFlowGraph
              graphData={graphData}
              dateRange={dateRange}
              height={height}
              searchQuery={searchQuery}
            />
          </>
        )}

        {!loading && !error && !graphData && (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">No data available for the selected date range</p>
          </div>
        )}
      </div>
    </div>
  )
}