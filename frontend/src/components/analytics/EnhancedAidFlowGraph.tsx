"use client"

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Info, Maximize2, Minimize2, Network, X, Search, DollarSign, Calendar, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

export interface GraphNode {
  id: string
  name: string
  type?: 'donor' | 'recipient' | 'implementer' | 'sector'
  sector?: string
  totalIn?: number
  totalOut?: number
  inflow?: number
  outflow?: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  value: number
  flowType?: 'commitment' | 'disbursement' | 'expenditure'
  aidType?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface Transaction {
  id: string
  activityTitle: string
  activityRef?: string
  transactionType: string
  date: string
  value: number
  currency: string
  status: string
  description?: string
  isIncoming: boolean
  partnerOrg: {
    id?: string
    name?: string
    ref?: string
  }
  flowType?: string
  financeType?: string
  aidType?: string
}

interface EnhancedAidFlowGraphProps {
  graphData: GraphData
  dateRange?: { from: Date; to: Date }
  height?: number
  onNodeClick?: (nodeId: string) => void
}

// Transaction type labels
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Commitment',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Repayment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Funds',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge'
}

export default function EnhancedAidFlowGraph({
  graphData,
  dateRange,
  height = 600,
  onNodeClick
}: EnhancedAidFlowGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarTransactions, setSidebarTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [orgSummary, setOrgSummary] = useState<any>(null)

  // Search functionality
  useEffect(() => {
    if (searchQuery) {
      const match = graphData.nodes.find(n => 
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (match) {
        setHighlightedNodeId(match.id)
      } else {
        setHighlightedNodeId(null)
      }
    } else {
      setHighlightedNodeId(null)
    }
  }, [searchQuery, graphData.nodes])

  // Fetch organization transactions
  const fetchOrgTransactions = async (orgId: string) => {
    setLoadingTransactions(true)
    try {
      const params = new URLSearchParams()
      if (dateRange) {
        params.append('start', format(dateRange.from, 'yyyy-MM-dd'))
        params.append('end', format(dateRange.to, 'yyyy-MM-dd'))
      }
      
      const response = await fetch(`/api/aid-flows/org-transactions/${orgId}?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSidebarTransactions(data.transactions || [])
        setOrgSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch organization transactions:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  // D3 Force Graph
  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return

    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const actualHeight = fullscreen ? window.innerHeight - 100 : height

    // Clear previous content
    svg.selectAll('*').remove()

    // Setup SVG
    svg.attr('width', width).attr('height', actualHeight)

    // Color scales
    const maxValue = d3.max(graphData.links, d => d.value) || 1
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxValue])
    
    // Size scales
    const maxFlow = d3.max(graphData.nodes, d => 
      (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
    ) || 1
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxFlow])
      .range([8, 40])
    
    // Link width scale
    const linkWidthScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([1, 10])

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    svg.call(zoom)

    // Create main group
    const g = svg.append('g')

    // Create arrow markers
    const defs = svg.append('defs')
    
    // Create gradient for each link
    graphData.links.forEach((link, i) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colorScale(link.value * 0.3))
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorScale(link.value))
    })

    // Arrow markers
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748b')

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(150)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, actualHeight / 2))
      .force('collision', d3.forceCollide().radius((d: GraphNode) => radiusScale(
        (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
      ) + 10))

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter().append('line')
      .attr('stroke', (d, i) => `url(#gradient-${i})`)
      .attr('stroke-width', d => linkWidthScale(d.value))
      .attr('stroke-opacity', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source
        const targetId = typeof d.target === 'object' ? d.target.id : d.target
        if (highlightedNodeId && (sourceId === highlightedNodeId || targetId === highlightedNodeId)) {
          return 1
        }
        return 0.6
      })
      .attr('marker-end', 'url(#arrow)')

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => radiusScale(
        (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
      ))
      .attr('fill', d => {
        if (d.id === highlightedNodeId) return '#f97316'
        if (d.type === 'donor') return '#3b82f6'
        if (d.type === 'recipient') return '#10b981'
        if (d.type === 'implementer') return '#f59e0b'
        if (d.type === 'sector') return '#8b5cf6'
        return '#64748b'
      })
      .attr('stroke', d => d.id === highlightedNodeId ? '#ea580c' : '#fff')
      .attr('stroke-width', d => d.id === highlightedNodeId ? 3 : 2)
      .attr('opacity', d => {
        if (highlightedNodeId && d.id !== highlightedNodeId) {
          const isConnected = graphData.links.some(l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source
            const targetId = typeof l.target === 'object' ? l.target.id : l.target
            return (sourceId === highlightedNodeId && targetId === d.id) || 
                   (targetId === highlightedNodeId && sourceId === d.id)
          })
          return isConnected ? 0.8 : 0.3
        }
        return 1
      })

    // Add labels that move with nodes
    const labels = node.append('text')
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => radiusScale(
        (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
      ) + 15)
      .attr('font-size', '12px')
      .attr('fill', '#334155')
      .attr('font-weight', d => d.id === highlightedNodeId ? 'bold' : 'normal')

    // Add hover interactions
    node.on('mouseenter', function(event, d) {
      setHoveredNode(d)
      
      // Highlight connected links
      link.attr('stroke-opacity', l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source
        const targetId = typeof l.target === 'object' ? l.target.id : l.target
        return sourceId === d.id || targetId === d.id ? 1 : 0.2
      })
      
      // Dim unconnected nodes
      node.attr('opacity', n => {
        const isConnected = graphData.links.some(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source
          const targetId = typeof l.target === 'object' ? l.target.id : l.target
          return (sourceId === d.id && targetId === n.id) || 
                 (targetId === d.id && sourceId === n.id) ||
                 n.id === d.id
        })
        return isConnected ? 1 : 0.3
      })
    })
    .on('mouseleave', function() {
      setHoveredNode(null)
      link.attr('stroke-opacity', 0.6)
      node.attr('opacity', 1)
    })
    .on('click', function(event, d) {
      event.stopPropagation()
      setSelectedNode(d)
      setSidebarOpen(true)
      fetchOrgTransactions(d.id)
      if (onNodeClick) onNodeClick(d.id)
    })

    // Add tooltip
    const tooltip = node.append('title')
      .text(d => {
        const inflow = d.totalIn || d.inflow || 0
        const outflow = d.totalOut || d.outflow || 0
        return `${d.name}\nInflow: ${formatCurrency(inflow)}\nOutflow: ${formatCurrency(outflow)}`
      })

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    // Auto-focus on highlighted node
    if (highlightedNodeId) {
      const highlightedNode = graphData.nodes.find(n => n.id === highlightedNodeId)
      if (highlightedNode) {
        setTimeout(() => {
          const scale = 2
          const x = width / 2 - (highlightedNode.x || 0) * scale
          const y = actualHeight / 2 - (highlightedNode.y || 0) * scale
          svg.transition()
            .duration(750)
            .call(zoom.transform as any, d3.zoomIdentity.translate(x, y).scale(scale))
        }, 500)
      }
    }

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [graphData, fullscreen, height, highlightedNodeId, onNodeClick, dateRange])

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen)
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
    <div className="relative">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-20 w-80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/90 backdrop-blur"
          />
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative ${fullscreen ? 'fixed inset-0 z-50 bg-white p-4' : 'w-full'}`}
        style={{ height: fullscreen ? '100vh' : height }}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="bg-white/90 backdrop-blur"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur p-3 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Network className="h-4 w-4" />
            <span className="text-sm font-medium">Organization Types</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs">Donor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs">Recipient</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs">Implementer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs">Sector</span>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredNode && (
          <div className="absolute z-20 bg-slate-900 text-white p-3 rounded-lg shadow-lg pointer-events-none"
            style={{
              left: '50%',
              bottom: '80px',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-semibold">{hoveredNode.name}</div>
            <div className="text-xs text-slate-300 capitalize">{hoveredNode.type || 'organization'}</div>
            {((hoveredNode.totalIn || hoveredNode.inflow) || (hoveredNode.totalOut || hoveredNode.outflow)) && (
              <div className="mt-2 space-y-1">
                {(hoveredNode.totalIn || hoveredNode.inflow) ? (
                  <div className="text-xs">
                    Inflow: {formatCurrency(hoveredNode.totalIn || hoveredNode.inflow || 0)}
                  </div>
                ) : null}
                {(hoveredNode.totalOut || hoveredNode.outflow) ? (
                  <div className="text-xs">
                    Outflow: {formatCurrency(hoveredNode.totalOut || hoveredNode.outflow || 0)}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* SVG Container */}
        <svg ref={svgRef} className="w-full h-full"></svg>

        {/* Help Text */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-slate-500">
          <Info className="h-3 w-3" />
          <span>Drag to pan • Scroll to zoom • Click nodes for details</span>
        </div>
      </div>

      {/* Transaction Sidebar */}
      {sidebarOpen && selectedNode && (
        <div className="fixed right-0 top-0 w-96 h-full bg-white shadow-2xl z-50 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold">{selectedNode.name}</h2>
                <p className="text-sm text-slate-500 capitalize">{selectedNode.type || 'Organization'}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {orgSummary && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-xs text-green-600">Total Inflow</div>
                  <div className="font-semibold text-green-700">
                    {formatCurrency(orgSummary.totalInflow)}
                  </div>
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <div className="text-xs text-red-600">Total Outflow</div>
                  <div className="font-semibold text-red-700">
                    {formatCurrency(orgSummary.totalOutflow)}
                  </div>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-xs text-blue-600">Transactions</div>
                  <div className="font-semibold text-blue-700">
                    {orgSummary.transactionCount}
                  </div>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-xs text-purple-600">Partners</div>
                  <div className="font-semibold text-purple-700">
                    {orgSummary.uniquePartners}
                  </div>
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            {loadingTransactions ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {sidebarTransactions.map((tx) => (
                  <Card key={tx.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{tx.activityTitle}</div>
                        {tx.activityRef && (
                          <div className="text-xs text-slate-500">{tx.activityRef}</div>
                        )}
                      </div>
                      <div className={`text-sm font-semibold ${tx.isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.isIncoming ? '+' : '-'}{formatCurrency(tx.value)}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-600">
                          {tx.isIncoming ? 'From' : 'To'}: {tx.partnerOrg.name || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-600">
                          {format(new Date(tx.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-600">
                          {TRANSACTION_TYPE_LABELS[tx.transactionType] || tx.transactionType}
                        </span>
                      </div>
                      
                      {tx.description && (
                        <div className="mt-2 p-2 bg-slate-50 rounded text-slate-700">
                          {tx.description}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                
                {sidebarTransactions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No transactions found for this organization
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
} 