"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { Button } from '@/components/ui/button'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction'
import financeTypesData from '@/data/finance-types.json'

// Create finance type labels mapping
const FINANCE_TYPE_LABELS = financeTypesData.reduce((acc, item) => {
  acc[item.code] = item.name;
  return acc;
}, {} as Record<string, string>)

interface FlowNode {
  id: string
  name: string
  type: 'provider' | 'receiver'
  organizationId?: string
  isUnknown?: boolean
}

interface FlowLink {
  source: string | FlowNode
  target: string | FlowNode
  value: number
  type: 'transaction' | 'planned_disbursement'
  count?: number
  transaction_type?: string
  finance_type?: string
  currency?: string
  has_usd_value?: boolean
}

interface FlowData {
  nodes: FlowNode[]
  links: FlowLink[]
}

interface DataQualityMetrics {
  total: number
  processed: number
  skippedNoAmount: number
  skippedNoOrgs: number
  partialData: number
}

interface DataQuality {
  transactions?: DataQualityMetrics
  plannedDisbursements?: DataQualityMetrics
}

interface FundFlowGraphProps {
  transactionsData: FlowData | null
  plannedDisbursementsData: FlowData | null
  loading?: boolean
  dataQuality?: DataQuality | null
}

type ViewMode = 'transactions' | 'planned' | 'both'

export default function FundFlowGraph({ 
  transactionsData, 
  plannedDisbursementsData, 
  loading,
  dataQuality 
}: FundFlowGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<FlowNode, FlowLink> | null>(null)
  
  const [viewMode, setViewMode] = useState<ViewMode>('transactions')
  
  // Debug logging
  React.useEffect(() => {
    console.log('[FundFlowGraph] Data received:', {
      transactionsData: transactionsData ? {
        nodes: transactionsData.nodes.length,
        links: transactionsData.links.length,
        hasNodes: transactionsData.nodes.length > 0
      } : null,
      plannedDisbursementsData: plannedDisbursementsData ? {
        nodes: plannedDisbursementsData.nodes.length,
        links: plannedDisbursementsData.links.length,
        hasNodes: plannedDisbursementsData.nodes.length > 0
      } : null,
      loading
    })
  }, [transactionsData, plannedDisbursementsData, loading])
  
  // Update view mode when data loads
  React.useEffect(() => {
    if (!loading && viewMode === 'transactions') {
      const hasTransactions = transactionsData && transactionsData.nodes.length > 0
      const hasPlanned = plannedDisbursementsData && plannedDisbursementsData.nodes.length > 0
      console.log('[FundFlowGraph] View mode check:', { hasTransactions, hasPlanned, viewMode })
      if (!hasTransactions && hasPlanned) {
        setViewMode('planned')
      } else if (hasTransactions && hasPlanned) {
        // Keep transactions as default
        setViewMode('transactions')
      }
    }
  }, [transactionsData, plannedDisbursementsData, loading])

  // Combine data based on view mode
  const combinedData = useMemo(() => {
    if (!transactionsData && !plannedDisbursementsData) {
      return { nodes: [], links: [] }
    }

    const nodeMap = new Map<string, FlowNode>()
    const links: FlowLink[] = []

    // Add transactions if needed
    if (viewMode === 'transactions' || viewMode === 'both') {
      transactionsData?.nodes.forEach(node => {
        if (!nodeMap.has(node.id)) {
          nodeMap.set(node.id, { ...node })
        }
      })
      transactionsData?.links.forEach(link => {
        links.push({ ...link })
      })
    }

    // Add planned disbursements if needed
    if (viewMode === 'planned' || viewMode === 'both') {
      plannedDisbursementsData?.nodes.forEach(node => {
        if (!nodeMap.has(node.id)) {
          nodeMap.set(node.id, { ...node })
        } else {
          // Update type if organization appears in both
          const existing = nodeMap.get(node.id)!
          if (existing.type !== node.type) {
            existing.type = 'provider' // Default to provider if mixed
          }
        }
      })
      plannedDisbursementsData?.links.forEach(link => {
        // Check if similar link exists and merge
        const existingLink = links.find(
          l => l.source === link.source && l.target === link.target
        )
        if (existingLink && viewMode === 'both') {
          existingLink.value += link.value
          existingLink.count = (existingLink.count || 0) + (link.count || 1)
        } else {
          links.push({ ...link })
        }
      })
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links
    }
  }, [transactionsData, plannedDisbursementsData, viewMode])

  useEffect(() => {
    if (!combinedData || !svgRef.current || loading) {
      return
    }

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove()

    if (combinedData.nodes.length === 0) {
      return
    }

    const width = 928
    const height = 600

    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;')

    // The force simulation mutates links and nodes, so create a copy
    const links = combinedData.links.map(d => ({ ...d }))
    const nodes = combinedData.nodes.map(d => ({ ...d }))

    // Calculate max value for link thickness
    const maxValue = d3.max(links, d => d.value) || 1

    // Create color scales
    const nodeColor = d3.scaleOrdinal<string>()
      .domain(['provider', 'receiver'])
      .range(['#3B82F6', '#10B981'])

    // Build color scales for transactions based on finance type and transaction type
    const transactionLinks = links.filter(l => l.type === 'transaction')
    const financeTypes = Array.from(new Set(transactionLinks
      .filter(l => l.finance_type)
      .map(l => l.finance_type!)))
    const transactionTypes = Array.from(new Set(transactionLinks
      .filter(l => l.transaction_type)
      .map(l => l.transaction_type!)))
      .sort()

    const financeColorScale = d3.scaleOrdinal<string>()
      .domain(financeTypes)
      .range(d3.schemeCategory10)

    const transactionTypeColorScale = d3.scaleOrdinal<string>()
      .domain(transactionTypes)
      .range(d3.schemeSet3)

    // Enhanced link color: use finance type or transaction type for transactions
    const getLinkColor = (link: FlowLink): string => {
      if (link.type === 'planned_disbursement') {
        return '#F59E0B' // Amber for planned disbursements
      }
      
      // For transactions, use finance type color if available, otherwise transaction type
      if (link.finance_type && financeColorScale.domain().includes(link.finance_type)) {
        return financeColorScale(link.finance_type) || '#64748B'
      }
      
      // Fallback to transaction type color
      if (link.transaction_type && transactionTypeColorScale.domain().includes(link.transaction_type)) {
        return transactionTypeColorScale(link.transaction_type) || '#64748B'
      }
      
      // Default gray for transactions without type info
      return '#64748B'
    }

    // Create a simulation with several forces
    const simulation = d3.forceSimulation<FlowNode>(nodes)
      .force('link', d3.forceLink<FlowNode, FlowLink>(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    simulationRef.current = simulation

    // Add a line for each link
    const link = svg.append('g')
      .attr('stroke-opacity', 0.7)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => getLinkColor(d))
      .attr('stroke-width', d => Math.sqrt(d.value / maxValue) * 8 + 2)

    // Add a circle for each node
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 8)
      .attr('fill', d => d.isUnknown ? '#9CA3AF' : nodeColor(d.type))
      .attr('stroke', d => d.isUnknown ? '#6B7280' : '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.isUnknown ? '3,3' : '0')
      .attr('opacity', d => d.isUnknown ? 0.7 : 1)

    // Add labels for nodes
    const labels = svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', '11px')
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .style('font-weight', '500')

    // Add tooltips
    node.append('title')
      .text(d => {
        const roleLabel = d.type === 'provider' ? 'Provider' : 'Receiver'
        const unknownNote = d.isUnknown ? ' (Unknown - missing organization data)' : ''
        return `${roleLabel}: ${d.name}${unknownNote}`
      })

    link.append('title')
      .text(d => {
        const linkValue = typeof d.value === 'number' ? d.value : 0
        const linkCount = typeof d.count === 'number' ? d.count : 1
        const formattedValue = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: d.has_usd_value ? 'USD' : (d.currency || 'USD'),
          maximumFractionDigits: 0
        }).format(linkValue)
        
        let tooltip = `${d.type === 'transaction' ? 'Transaction' : 'Planned Disbursement'}: ${formattedValue} (${linkCount} ${linkCount === 1 ? 'item' : 'items'})`
        
        if (d.type === 'transaction') {
          if (d.transaction_type) {
            const typeLabel = TRANSACTION_TYPE_LABELS[d.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || d.transaction_type
            tooltip += `\nType: ${d.transaction_type} - ${typeLabel}`
          }
          if (d.finance_type) {
            const financeLabel = FINANCE_TYPE_LABELS[d.finance_type] || d.finance_type
            tooltip += `\nFinance Type: ${d.finance_type} - ${financeLabel}`
          }
          if (!d.has_usd_value && d.currency) {
            tooltip += `\n⚠ Original currency: ${d.currency} (USD conversion unavailable)`
          }
        }
        
        return tooltip
      })

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, FlowNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)

    node.call(drag as any)

    // Set the position attributes of links and nodes each time the simulation ticks
    function ticked() {
      link
        .attr('x1', d => {
          const source = typeof d.source === 'string' ? nodes.find(n => n.id === d.source) : d.source
          return source?.x ?? 0
        })
        .attr('y1', d => {
          const source = typeof d.source === 'string' ? nodes.find(n => n.id === d.source) : d.source
          return source?.y ?? 0
        })
        .attr('x2', d => {
          const target = typeof d.target === 'string' ? nodes.find(n => n.id === d.target) : d.target
          return target?.x ?? 0
        })
        .attr('y2', d => {
          const target = typeof d.target === 'string' ? nodes.find(n => n.id === d.target) : d.target
          return target?.y ?? 0
        })

      node
        .attr('cx', d => d.x ?? 0)
        .attr('cy', d => d.y ?? 0)

      labels
        .attr('x', d => d.x ?? 0)
        .attr('y', d => d.y ?? 0)
    }

    simulation.on('tick', ticked)

    // Reheat the simulation when drag starts
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, FlowNode, FlowNode>) {
      if (!event.active && simulation) {
        simulation.alphaTarget(0.3).restart()
      }
      const subject = event.subject as FlowNode
      subject.fx = subject.x
      subject.fy = subject.y
    }

    // Update the subject position during drag
    function dragged(event: d3.D3DragEvent<SVGCircleElement, FlowNode, FlowNode>) {
      const subject = event.subject as FlowNode
      subject.fx = event.x
      subject.fy = event.y
    }

    // Restore the target alpha after dragging ends
    function dragended(event: d3.D3DragEvent<SVGCircleElement, FlowNode, FlowNode>) {
      if (!event.active && simulation) {
        simulation.alphaTarget(0)
      }
      const subject = event.subject as FlowNode
      subject.fx = null
      subject.fy = null
    }

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [combinedData, loading])

  // Get data quality metrics for current view mode (MUST be before all returns - Rules of Hooks)
  const currentDataQuality = React.useMemo(() => {
    if (!dataQuality) return null
    
    if (viewMode === 'transactions') {
      return dataQuality.transactions
    } else if (viewMode === 'planned') {
      return dataQuality.plannedDisbursements
    } else {
      // For 'both' mode, combine the metrics
      const txQuality = dataQuality.transactions || { total: 0, processed: 0, skippedNoAmount: 0, skippedNoOrgs: 0, partialData: 0 }
      const pdQuality = dataQuality.plannedDisbursements || { total: 0, processed: 0, skippedNoAmount: 0, skippedNoOrgs: 0, partialData: 0 }
      return {
        total: txQuality.total + pdQuality.total,
        processed: txQuality.processed + pdQuality.processed,
        skippedNoAmount: txQuality.skippedNoAmount + pdQuality.skippedNoAmount,
        skippedNoOrgs: txQuality.skippedNoOrgs + pdQuality.skippedNoOrgs,
        partialData: txQuality.partialData + pdQuality.partialData
      }
    }
  }, [dataQuality, viewMode])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-slate-500">Loading fund flow graph...</div>
      </div>
    )
  }

  const hasTransactions = transactionsData && transactionsData.nodes && transactionsData.nodes.length > 0
  const hasPlanned = plannedDisbursementsData && plannedDisbursementsData.nodes && plannedDisbursementsData.nodes.length > 0
  
  console.log('[FundFlowGraph] Render check:', {
    hasTransactions,
    hasPlanned,
    transactionsNodesCount: transactionsData?.nodes?.length || 0,
    plannedNodesCount: plannedDisbursementsData?.nodes?.length || 0
  })

  if (!hasTransactions && !hasPlanned) {
    return (
      <div className="flex items-center justify-center h-[600px] text-slate-400">
        <div className="text-center">
          <p className="font-medium">No fund flow data available</p>
          <p className="text-xs mt-2">Add transactions or planned disbursements with provider and receiver organizations to see the flow graph</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={viewMode === 'transactions' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('transactions')}
          disabled={!hasTransactions}
          className={`h-7 px-3 text-xs ${
            viewMode === 'transactions' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Transactions
        </Button>
        <Button
          variant={viewMode === 'planned' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('planned')}
          disabled={!hasPlanned}
          className={`h-7 px-3 text-xs ${
            viewMode === 'planned' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Planned Disbursements
        </Button>
        <Button
          variant={viewMode === 'both' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('both')}
          disabled={!hasTransactions || !hasPlanned}
          className={`h-7 px-3 text-xs ${
            viewMode === 'both' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Both
        </Button>
      </div>

      {/* Data Quality Indicator */}
      {currentDataQuality && (currentDataQuality.partialData > 0 || currentDataQuality.skippedNoOrgs > 0 || currentDataQuality.skippedNoAmount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-amber-800 mb-1">Data Quality Notice</h4>
              <div className="text-xs text-amber-700 space-y-1">
                <p>
                  Showing <strong>{currentDataQuality.processed}</strong> of <strong>{currentDataQuality.total}</strong> items in the fund flow network.
                </p>
                {currentDataQuality.partialData > 0 && (
                  <p>
                    • <strong>{currentDataQuality.partialData}</strong> items have incomplete organization data (showing as "Unknown Provider" or "Unknown Receiver" with dashed borders)
                  </p>
                )}
                {currentDataQuality.skippedNoOrgs > 0 && (
                  <p>
                    • <strong>{currentDataQuality.skippedNoOrgs}</strong> items excluded (missing both provider and receiver organizations)
                  </p>
                )}
                {currentDataQuality.skippedNoAmount > 0 && (
                  <p>
                    • <strong>{currentDataQuality.skippedNoAmount}</strong> items excluded (missing or zero value)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graph */}
      <div className="w-full">
        <svg ref={svgRef} className="w-full" />
      </div>

      {/* Legend */}
      <div className="space-y-3">
        <div className="flex items-center gap-6 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Provider</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Receiver</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" className="flex-shrink-0">
              <circle cx="8" cy="8" r="7" fill="#9CA3AF" stroke="#6B7280" strokeWidth="2" strokeDasharray="3,3" opacity="0.7" />
            </svg>
            <span>Unknown (incomplete data)</span>
          </div>
          {viewMode === 'transactions' || viewMode === 'both' ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-slate-500"></div>
              <span>Transactions (size = USD value)</span>
            </div>
          ) : null}
          {viewMode === 'planned' || viewMode === 'both' ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-amber-500"></div>
              <span>Planned Disbursements</span>
            </div>
          ) : null}
        </div>
        {viewMode === 'transactions' || viewMode === 'both' ? (
          <div className="text-xs text-slate-500 mt-2">
            <p className="mb-1"><strong>Transaction colors:</strong> Links are colored by Finance Type (if available) or Transaction Type</p>
            <p>Hover over links to see transaction details including type, finance type, and value</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

