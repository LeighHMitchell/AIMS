"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RefreshCw, Download, Network, ArrowLeftRight, Activity, Search } from 'lucide-react'
import { format, subMonths, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import EnhancedAidFlowGraph from './EnhancedAidFlowGraph'
import type { GraphData } from './EnhancedAidFlowGraph'

interface DateRange {
  from: Date
  to: Date
}

type ViewMode = 'transaction' | 'activity'

// Transaction type labels for the filter
const TRANSACTION_TYPE_OPTIONS = [
  { value: 'all', label: 'All Transactions' },
  { value: '1', label: 'Incoming Commitment' },
  { value: '2', label: 'Outgoing Commitment' },
  { value: '3', label: 'Disbursement' },
  { value: '4', label: 'Expenditure' },
  { value: '5', label: 'Interest Repayment' },
  { value: '6', label: 'Loan Repayment' },
  { value: '7', label: 'Reimbursement' },
  { value: '8', label: 'Purchase of Equity' },
  { value: '9', label: 'Sale of Equity' },
  { value: '10', label: 'Credit Guarantee' },
  { value: '11', label: 'Incoming Funds' },
  { value: '12', label: 'Outgoing Pledge' },
  { value: '13', label: 'Incoming Pledge' }
]

interface AidFlowMapProps {
  className?: string
  height?: number
  initialDateRange?: DateRange
}

export function AidFlowMap({ className, height = 600, initialDateRange }: AidFlowMapProps) {
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
  const [statusFilter, setStatusFilter] = useState<'actual' | 'draft' | 'both'>('both')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('transaction')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('all')
  
  // Quick date range presets
  const datePresets = [
    { label: 'Last 3 months', value: '3m' },
    { label: 'Last 6 months', value: '6m' },
    { label: 'Last 12 months', value: '12m' },
    { label: 'This year', value: 'thisYear' },
    { label: 'Last year', value: 'lastYear' },
    { label: 'All time', value: 'all' }
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
        params.append('status', statusFilter)
        params.append('transactionType', transactionTypeFilter)
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
        console.log('[AidFlowMap] API Debug Info:', data.metadata.debug)
      }
      
      // Transform data to include both totalIn/totalOut and inflow/outflow
      const transformedNodes = data.nodes.map((node: any) => ({
        ...node,
        inflow: node.totalIn || node.inflow || 0,
        outflow: node.totalOut || node.outflow || 0
      }))
      
      console.log('[AidFlowMap] Transformed nodes:', transformedNodes.length, 'Links:', data.links?.length)
      
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
  }, [dateRange, statusFilter, transactionTypeFilter, viewMode])
  
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
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network
            </CardTitle>
            <CardDescription>
              {viewMode === 'transaction' 
                ? 'Visualize financial flows between organizations'
                : 'Visualize relationships between linked activities'
              }
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchAidFlowData}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              disabled={!graphData || loading}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm font-medium text-slate-600">View by:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            <button
              onClick={() => setViewMode('transaction')}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                viewMode === 'transaction'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transactions
            </button>
            <button
              onClick={() => setViewMode('activity')}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                viewMode === 'activity'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Activity className="h-4 w-4" />
              Activities
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 p-4 bg-slate-50 rounded-lg border">
          {/* Search */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Search Organization</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white"
              />
            </div>
          </div>
          
          {/* Time Period */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Time Period</label>
            <Select value={selectedTimePeriod} onValueChange={handlePresetSelect}>
              <SelectTrigger className="w-full h-10 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Transaction Type - only show in transaction view */}
          {viewMode === 'transaction' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Transaction Type</label>
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger className="w-full h-10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Relationship Types</label>
              <div className="w-full h-10 px-3 flex items-center text-sm text-slate-500 bg-white border rounded-md">
                All relationship types
              </div>
            </div>
          )}
          
          {/* Transaction Status - only show in transaction view */}
          {viewMode === 'transaction' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Transaction Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full h-10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">All Statuses</SelectItem>
                  <SelectItem value="actual">Actual Only</SelectItem>
                  <SelectItem value="draft">Draft Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Activity Status</label>
              <div className="w-full h-10 px-3 flex items-center text-sm text-slate-500 bg-white border rounded-md">
                All statuses
              </div>
            </div>
          )}
        </div>
        
        {/* Metadata display */}
        {metadata && !loading && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {viewMode === 'transaction' ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <span>{metadata.transactionCount || 0}</span>
                  <span className="text-blue-500">transactions</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                  <span>{metadata.organizationCount || 0}</span>
                  <span className="text-emerald-500">organizations</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                  <span>{metadata.flowCount || 0}</span>
                  <span className="text-purple-500">flows</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                  <span>Total:</span>
                  <span>{formatCurrency(metadata.totalValue || 0)}</span>
                </div>
                {statusFilter !== 'both' && (
                  <div className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                    Showing {statusFilter} transactions only
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                  <span>{metadata.activityCount || 0}</span>
                  <span className="text-indigo-500">activities</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-sm font-medium">
                  <span>{metadata.relationshipCount || 0}</span>
                  <span className="text-rose-500">relationships</span>
                </div>
                {metadata.totalValue > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                    <span>Combined Value:</span>
                    <span>{formatCurrency(metadata.totalValue)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <p className="text-red-500 mb-2">{error}</p>
              <Button variant="outline" onClick={fetchAidFlowData}>
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {!loading && !error && graphData && (
          <EnhancedAidFlowGraph
            graphData={graphData}
            dateRange={dateRange}
            height={height}
            searchQuery={searchQuery}
          />
        )}
        
        {!loading && !error && !graphData && (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-slate-500">No data available for the selected date range</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 