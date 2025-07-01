"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Loader2, RefreshCw, Download, Network } from 'lucide-react'
import { format, subMonths, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import EnhancedAidFlowGraph from './EnhancedAidFlowGraph'
import type { GraphData } from './EnhancedAidFlowGraph'

interface DateRange {
  from: Date
  to: Date
}

interface AidFlowMapProps {
  className?: string
  height?: number
  initialDateRange?: DateRange
}

export function AidFlowMap({ className, height = 600, initialDateRange }: AidFlowMapProps) {
  // Initialize with last 12 months as default
  const defaultDateRange = {
    from: initialDateRange?.from || subMonths(new Date(), 12),
    to: initialDateRange?.to || new Date()
  }
  
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<'actual' | 'draft' | 'both'>('both')
  
  // Quick date range presets
  const datePresets = [
    { label: 'Last 3 months', value: '3m' },
    { label: 'Last 6 months', value: '6m' },
    { label: 'Last 12 months', value: '12m' },
    { label: 'This year', value: 'thisYear' },
    { label: 'Last year', value: 'lastYear' },
    { label: 'All time', value: 'all' }
  ]
  
  // Fetch aid flow data
  const fetchAidFlowData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd'),
        status: statusFilter
      })
      
      const response = await fetch(`/api/aid-flows/graph?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch aid flow data')
      }
      
      const data = await response.json()
      
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
      setMetadata(data.metadata)
      
    } catch (err) {
      console.error('[AidFlowMap] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load aid flow data')
      setGraphData(null)
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchAidFlowData()
  }, [dateRange, statusFilter])
  
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
              Aid Flow Map
            </CardTitle>
            <CardDescription>
              Visualize aid flows between organizations over time
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
        
        {/* Date Range Controls */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Select value="" onValueChange={handlePresetSelect}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Quick select..." />
            </SelectTrigger>
            <SelectContent>
              {datePresets.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? format(dateRange.from, "PPP") : "Pick start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-slate-500">to</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? format(dateRange.to, "PPP") : "Pick end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">All Transactions</SelectItem>
              <SelectItem value="actual">Actual Only</SelectItem>
              <SelectItem value="draft">Draft Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Metadata display */}
        {metadata && !loading && (
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
            <span>{metadata.transactionCount} transactions</span>
            <span>•</span>
            <span>{metadata.organizationCount} organizations</span>
            <span>•</span>
            <span>{metadata.flowCount} flows</span>
            <span>•</span>
            <span>Total: {formatCurrency(metadata.totalValue)}</span>
            {statusFilter !== 'both' && (
              <>
                <span>•</span>
                <span className="font-medium text-slate-700">
                  Showing {statusFilter} transactions only
                </span>
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