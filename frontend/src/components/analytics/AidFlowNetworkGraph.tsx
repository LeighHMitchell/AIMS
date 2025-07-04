"use client"

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Info, Maximize2, Minimize2, Network } from 'lucide-react'

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
  aidType?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
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
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)

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

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
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
      .attr('stroke-width', d => Math.max(1, Math.sqrt(d.value / 5000000)))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.flowType || 'commitment'})`)

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
    .on('mouseleave', function() {
      setHoveredNode(null)
      link.attr('stroke-opacity', 0.6)
      node.attr('opacity', 1)
    })
    .on('click', function(event, d) {
      setSelectedNode(d)
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
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute z-20 bg-slate-900 text-white p-3 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: '50%',
            bottom: '20px',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">{hoveredNode.name}</div>
          <div className="text-xs text-slate-300 capitalize">{hoveredNode.type}</div>
          {(hoveredNode.totalIn || hoveredNode.totalOut) && (
            <div className="mt-2 space-y-1">
              {hoveredNode.totalIn && (
                <div className="text-xs">
                  Inflow: {formatCurrency(hoveredNode.totalIn)}
                </div>
              )}
              {hoveredNode.totalOut && (
                <div className="text-xs">
                  Outflow: {formatCurrency(hoveredNode.totalOut)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Node Details */}
      {selectedNode && (
        <Card className="absolute bottom-4 right-4 z-10 w-64 p-4">
          <h4 className="font-semibold mb-2">{selectedNode.name}</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Type:</span>
              <span className="ml-2 capitalize">{selectedNode.type}</span>
            </div>
            {selectedNode.sector && (
              <div>
                <span className="text-slate-500">Sector:</span>
                <span className="ml-2">{selectedNode.sector}</span>
              </div>
            )}
            {selectedNode.totalIn && (
              <div>
                <span className="text-slate-500">Total Inflow:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedNode.totalIn)}</span>
              </div>
            )}
            {selectedNode.totalOut && (
              <div>
                <span className="text-slate-500">Total Outflow:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedNode.totalOut)}</span>
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 w-full"
            onClick={() => setSelectedNode(null)}
          >
            Close
          </Button>
        </Card>
      )}

      {/* SVG Container */}
      <svg ref={svgRef} className="w-full h-full"></svg>

      {/* Help Text */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-slate-500">
        <Info className="h-3 w-3" />
        <span>Drag to pan • Scroll to zoom • Click nodes for details</span>
      </div>
    </div>
  )
}
