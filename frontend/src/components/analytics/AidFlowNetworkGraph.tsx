"use client"

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Button } from '@/components/ui/button'
import { Info, Maximize2, Minimize2, Network, ArrowRight, X } from 'lucide-react'

export interface GraphNode {
  id: string
  name: string
  type: 'donor' | 'recipient' | 'implementer' | 'sector'
  sector?: string
  totalIn?: number
  totalOut?: number
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
  transactionType?: string
  aidType?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface TooltipData {
  type: 'node' | 'link'
  node?: GraphNode
  link?: GraphLink
  sourceNode?: GraphNode
  targetNode?: GraphNode
  x: number
  y: number
}

interface AidFlowNetworkGraphProps {
  graphData: GraphData
  initialFocusId?: string
  onNodeClick?: (nodeId: string) => void
  height?: number
  showMiniSankey?: boolean
}

export default function AidFlowNetworkGraph({
  graphData,
  initialFocusId,
  onNodeClick,
  height = 600,
  showMiniSankey = false
}: AidFlowNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedNodePosition, setSelectedNodePosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

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

    // Create zoom behavior with filter to allow page scrolling
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .filter((event) => {
        // Allow pinch-to-zoom (ctrlKey is true for pinch gestures on trackpad)
        // Block regular wheel scrolling so page can scroll normally
        if (event.type === 'wheel') {
          return event.ctrlKey
        }
        return true
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    svg.call(zoom)

    // Create main group
    const g = svg.append('g')

    // Create arrow markers for directed edges
    const defs = svg.append('defs')
    
    defs.append('marker')
      .attr('id', 'arrow-commitment')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8')

    defs.append('marker')
      .attr('id', 'arrow-disbursement')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#10b981')

    defs.append('marker')
      .attr('id', 'arrow-expenditure')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#f59e0b')

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(d => Math.min(200, 50 + Math.sqrt(d.value / 1000000)))
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, actualHeight / 2))
      .force('collision', d3.forceCollide().radius(30))

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter().append('line')
      .attr('stroke', d => {
        if (d.flowType === 'commitment') return '#94a3b8'
        if (d.flowType === 'disbursement') return '#10b981'
        if (d.flowType === 'expenditure') return '#f59e0b'
        return '#e2e8f0'
      })
      .attr('stroke-width', d => Math.max(2, Math.sqrt(d.value / 5000000)))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.flowType || 'commitment'})`)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        const sourceNode = typeof d.source === 'object' ? d.source : graphData.nodes.find(n => n.id === d.source)
        const targetNode = typeof d.target === 'object' ? d.target : graphData.nodes.find(n => n.id === d.target)
        
        // Get position relative to container
        const containerRect = container.getBoundingClientRect()
        const x = event.clientX - containerRect.left
        const y = event.clientY - containerRect.top
        
        setTooltip({
          type: 'link',
          link: d,
          sourceNode: sourceNode || undefined,
          targetNode: targetNode || undefined,
          x,
          y
        })
        
        // Highlight this link
        d3.select(this)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', Math.max(4, Math.sqrt(d.value / 5000000) * 1.5))
      })
      .on('mousemove', function(event) {
        const containerRect = container.getBoundingClientRect()
        const x = event.clientX - containerRect.left
        const y = event.clientY - containerRect.top
        setTooltip(prev => prev ? { ...prev, x, y } : null)
      })
      .on('mouseleave', function(event, d) {
        setTooltip(null)
        d3.select(this)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', Math.max(2, Math.sqrt(d.value / 5000000)))
      })

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
      .attr('r', d => {
        const totalFlow = (d.totalIn || 0) + (d.totalOut || 0)
        return Math.max(10, Math.min(40, Math.sqrt(totalFlow / 1000000)))
      })
      .attr('fill', d => {
        if (d.type === 'donor') return '#3b82f6'
        if (d.type === 'recipient') return '#10b981'
        if (d.type === 'implementer') return '#f59e0b'
        if (d.type === 'sector') return '#8b5cf6'
        return '#64748b'
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    // Add labels
    node.append('text')
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
      .attr('x', 0)
      .attr('y', d => {
        const totalFlow = (d.totalIn || 0) + (d.totalOut || 0)
        const radius = Math.max(10, Math.min(40, Math.sqrt(totalFlow / 1000000)))
        return radius + 15
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#334155')

    // Add hover interactions
    node.on('mouseenter', function(event, d) {
      setHoveredNode(d)
      
      // Get position relative to container
      const containerRect = container.getBoundingClientRect()
      const x = event.clientX - containerRect.left
      const y = event.clientY - containerRect.top
      
      setTooltip({
        type: 'node',
        node: d,
        x,
        y
      })
      
      // Highlight connected links
      link.attr('stroke-opacity', l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source
        const targetId = typeof l.target === 'object' ? l.target.id : l.target
        return sourceId === d.id || targetId === d.id ? 1 : 0.2
      })
      
      // Highlight connected nodes
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
    .on('mousemove', function(event) {
      const containerRect = container.getBoundingClientRect()
      const x = event.clientX - containerRect.left
      const y = event.clientY - containerRect.top
      setTooltip(prev => prev ? { ...prev, x, y } : null)
    })
    .on('mouseleave', function() {
      setHoveredNode(null)
      setTooltip(null)
      link.attr('stroke-opacity', 0.6)
      node.attr('opacity', 1)
    })
    .on('click', function(event, d) {
      // Get position relative to container for the popup
      const containerRect = container.getBoundingClientRect()
      const x = event.clientX - containerRect.left
      const y = event.clientY - containerRect.top
      
      setSelectedNode(d)
      setSelectedNodePosition({ x, y })
      if (onNodeClick) onNodeClick(d.id)
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

    // Focus on initial node if provided
    if (initialFocusId) {
      const focusNode = graphData.nodes.find(n => n.id === initialFocusId)
      if (focusNode) {
        setTimeout(() => {
          const scale = 2
          const x = width / 2 - (focusNode.x || 0) * scale
          const y = actualHeight / 2 - (focusNode.y || 0) * scale
          svg.transition()
            .duration(750)
            .call(zoom.transform as any, d3.zoomIdentity.translate(x, y).scale(scale))
        }, 1000)
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
  }, [graphData, fullscreen, height, initialFocusId, onNodeClick])

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

  const getTransactionTypeName = (type: string): string => {
    const types: Record<string, string> = {
      '1': 'Incoming Funds',
      '2': 'Outgoing Commitment',
      '3': 'Disbursement',
      '4': 'Expenditure',
      '5': 'Interest Payment',
      '6': 'Loan Repayment',
      '7': 'Reimbursement',
      '8': 'Purchase of Equity',
      '9': 'Sale of Equity',
      '10': 'Credit Guarantee',
      '11': 'Incoming Commitment',
      '12': 'Outgoing Pledge',
      '13': 'Incoming Pledge'
    }
    return types[type] || `Type ${type}`
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${fullscreen ? 'fixed inset-0 z-50 bg-white p-4' : 'w-full'}`}
      style={{ height: fullscreen ? '100vh' : height }}
    >
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
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
      <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur p-3 rounded-lg border">
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
        
        <div className="mt-3 pt-3 border-t">
          <span className="text-sm font-medium">Flow Types</span>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-slate-400"></div>
              <span className="text-xs">Commitment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span className="text-xs">Disbursement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-amber-500"></div>
              <span className="text-xs">Expenditure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Tooltip - follows mouse */}
      {tooltip && (
        <div 
          className="absolute z-20 bg-slate-900 text-white p-3 rounded-lg shadow-xl pointer-events-none max-w-xs"
          style={{
            left: Math.min(tooltip.x + 15, (containerRef.current?.clientWidth || 400) - 280),
            top: tooltip.y + 15,
            transform: tooltip.y > (height - 150) ? 'translateY(-100%)' : undefined
          }}
        >
          {tooltip.type === 'node' && tooltip.node && (
            <>
              <div className="font-semibold text-sm">{tooltip.node.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ 
                    backgroundColor: tooltip.node.type === 'donor' ? '#3b82f6' : 
                                    tooltip.node.type === 'recipient' ? '#10b981' : 
                                    tooltip.node.type === 'implementer' ? '#f59e0b' : '#8b5cf6' 
                  }}
                />
                <span className="text-xs text-slate-300 capitalize">{tooltip.node.type}</span>
              </div>
              {tooltip.node.sector && (
                <div className="text-xs text-slate-400 mt-1">Sector: {tooltip.node.sector}</div>
              )}
              <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                {tooltip.node.totalIn !== undefined && tooltip.node.totalIn > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">↓ Inflow:</span>
                    <span className="font-medium">{formatCurrency(tooltip.node.totalIn)}</span>
                  </div>
                )}
                {tooltip.node.totalOut !== undefined && tooltip.node.totalOut > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-400">↑ Outflow:</span>
                    <span className="font-medium">{formatCurrency(tooltip.node.totalOut)}</span>
                  </div>
                )}
                {(tooltip.node.totalIn || 0) > 0 && (tooltip.node.totalOut || 0) > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-700">
                    <span className="text-slate-400">Net Flow:</span>
                    <span className={`font-medium ${((tooltip.node.totalIn || 0) - (tooltip.node.totalOut || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency((tooltip.node.totalIn || 0) - (tooltip.node.totalOut || 0))}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          
          {tooltip.type === 'link' && tooltip.link && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate max-w-[100px]">
                  {tooltip.sourceNode?.name || 'Unknown'}
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                <span className="font-medium truncate max-w-[100px]">
                  {tooltip.targetNode?.name || 'Unknown'}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Amount:</span>
                  <span className="font-semibold text-white">{formatCurrency(tooltip.link.value)}</span>
                </div>
                {tooltip.link.flowType && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Flow Type:</span>
                    <span 
                      className="capitalize font-medium"
                      style={{
                        color: tooltip.link.flowType === 'commitment' ? '#94a3b8' :
                               tooltip.link.flowType === 'disbursement' ? '#10b981' : '#f59e0b'
                      }}
                    >
                      {tooltip.link.flowType}
                    </span>
                  </div>
                )}
                {tooltip.link.transactionType && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Transaction Type:</span>
                    <span className="text-slate-300">{getTransactionTypeName(tooltip.link.transactionType)}</span>
                  </div>
                )}
                {tooltip.link.aidType && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Aid Type:</span>
                    <span className="text-slate-300">{tooltip.link.aidType}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Selected Node Popup - appears near clicked node */}
      {selectedNode && selectedNodePosition && (
        <div 
          className="absolute z-20 bg-slate-900 text-white p-3 rounded-lg shadow-xl max-w-xs"
          style={{
            left: Math.min(selectedNodePosition.x + 15, (containerRef.current?.clientWidth || 400) - 280),
            top: selectedNodePosition.y + 15,
            transform: selectedNodePosition.y > (height - 200) ? 'translateY(-100%)' : undefined
          }}
        >
          {/* Close button */}
          <button
            onClick={() => {
              setSelectedNode(null)
              setSelectedNodePosition(null)
            }}
            className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="font-semibold text-sm pr-6">{selectedNode.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ 
                backgroundColor: selectedNode.type === 'donor' ? '#3b82f6' : 
                                selectedNode.type === 'recipient' ? '#10b981' : 
                                selectedNode.type === 'implementer' ? '#f59e0b' : '#8b5cf6' 
              }}
            />
            <span className="text-xs text-slate-300 capitalize">{selectedNode.type}</span>
          </div>
          {selectedNode.sector && (
            <div className="text-xs text-slate-400 mt-1">Sector: {selectedNode.sector}</div>
          )}
          <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
            {selectedNode.totalIn !== undefined && selectedNode.totalIn > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-green-400">Total Inflow:</span>
                <span className="font-medium">{formatCurrency(selectedNode.totalIn)}</span>
              </div>
            )}
            {selectedNode.totalOut !== undefined && selectedNode.totalOut > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-blue-400">Total Outflow:</span>
                <span className="font-medium">{formatCurrency(selectedNode.totalOut)}</span>
              </div>
            )}
            {(selectedNode.totalIn || 0) > 0 && (selectedNode.totalOut || 0) > 0 && (
              <div className="flex justify-between text-xs pt-1 border-t border-slate-700">
                <span className="text-slate-400">Net Flow:</span>
                <span className={`font-medium ${((selectedNode.totalIn || 0) - (selectedNode.totalOut || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency((selectedNode.totalIn || 0) - (selectedNode.totalOut || 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Container */}
      <svg ref={svgRef} className="w-full h-full"></svg>

      {/* Help Text */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-slate-500">
        <Info className="h-3 w-3" />
        <span>Drag to pan • Pinch to zoom • Click nodes for details</span>
      </div>
    </div>
  )
}
