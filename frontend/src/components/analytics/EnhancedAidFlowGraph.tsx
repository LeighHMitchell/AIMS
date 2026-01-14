"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { Button } from '@/components/ui/button'
import { Info, Maximize2, Minimize2, X, ArrowRight, Shrink, Expand } from 'lucide-react'

export interface GraphNode {
  id: string
  name: string
  type?: 'donor' | 'recipient' | 'implementer' | 'sector'
  sector?: string
  totalIn?: number
  totalOut?: number
  inflow?: number
  outflow?: number
  logo?: string | null
  acronym?: string
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
  transactionType?: string // IATI transaction type code (1-13)
  aidType?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface EnhancedAidFlowGraphProps {
  graphData: GraphData
  dateRange?: { from: Date; to: Date }
  height?: number
  onNodeClick?: (nodeId: string) => void
  searchQuery?: string
}

// Transaction type labels (IATI Standard v2.03)
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
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

export default function EnhancedAidFlowGraph({
  graphData,
  dateRange,
  height = 300,
  onNodeClick,
  searchQuery = ''
}: EnhancedAidFlowGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedNodePosition, setSelectedNodePosition] = useState<{ x: number; y: number } | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [clusterLevel, setClusterLevel] = useState<'normal' | 'clustered' | 'spread'>('normal')
  const [nestedPopup, setNestedPopup] = useState<{
    type: 'partners' | 'transactions' | 'incoming' | 'outgoing'
    data: any[]
  } | null>(null)

  // Helper to get connection stats for a node
  const getNodeConnectionStats = (nodeId: string) => {
    const incomingLinks = graphData.links.filter(l => {
      const targetId = typeof l.target === 'object' ? l.target.id : l.target
      return targetId === nodeId
    })
    const outgoingLinks = graphData.links.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source
      return sourceId === nodeId
    })
    
    // Get unique partners with their details
    const partnersMap = new Map<string, { id: string; name: string; logo?: string | null; type?: string; direction: 'incoming' | 'outgoing' | 'both' }>()
    
    incomingLinks.forEach(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source
      const sourceNode = graphData.nodes.find(n => n.id === sourceId)
      if (sourceNode) {
        const existing = partnersMap.get(sourceId)
        partnersMap.set(sourceId, {
          id: sourceId,
          name: sourceNode.name,
          logo: sourceNode.logo,
          type: sourceNode.type,
          direction: existing?.direction === 'outgoing' ? 'both' : 'incoming'
        })
      }
    })
    
    outgoingLinks.forEach(l => {
      const targetId = typeof l.target === 'object' ? l.target.id : l.target
      const targetNode = graphData.nodes.find(n => n.id === targetId)
      if (targetNode) {
        const existing = partnersMap.get(targetId)
        partnersMap.set(targetId, {
          id: targetId,
          name: targetNode.name,
          logo: targetNode.logo,
          type: targetNode.type,
          direction: existing?.direction === 'incoming' ? 'both' : 'outgoing'
        })
      }
    })
    
    // Get transaction details
    const incomingTransactions = incomingLinks.map(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source
      const sourceNode = graphData.nodes.find(n => n.id === sourceId)
      return {
        partnerId: sourceId,
        partnerName: sourceNode?.name || 'Unknown',
        partnerLogo: sourceNode?.logo,
        value: l.value,
        type: l.transactionType,
        typeName: TRANSACTION_TYPE_LABELS[l.transactionType || ''] || 'Unknown',
        flowType: l.flowType,
        direction: 'incoming' as const
      }
    })
    
    const outgoingTransactions = outgoingLinks.map(l => {
      const targetId = typeof l.target === 'object' ? l.target.id : l.target
      const targetNode = graphData.nodes.find(n => n.id === targetId)
      return {
        partnerId: targetId,
        partnerName: targetNode?.name || 'Unknown',
        partnerLogo: targetNode?.logo,
        value: l.value,
        type: l.transactionType,
        typeName: TRANSACTION_TYPE_LABELS[l.transactionType || ''] || 'Unknown',
        flowType: l.flowType,
        direction: 'outgoing' as const
      }
    })
    
    return {
      incomingCount: incomingLinks.length,
      outgoingCount: outgoingLinks.length,
      totalConnections: incomingLinks.length + outgoingLinks.length,
      partnerCount: partnersMap.size,
      partners: Array.from(partnersMap.values()),
      incomingTransactions,
      outgoingTransactions,
      allTransactions: [...incomingTransactions, ...outgoingTransactions]
    }
  }

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

  // Handle clustering - bring nodes together in the center
  const handleCluster = useCallback(() => {
    if (!simulationRef.current || !containerRef.current) return
    
    const container = containerRef.current
    const width = container.clientWidth
    const actualHeight = fullscreen ? window.innerHeight - 100 : height
    
    // Update simulation forces to cluster nodes together (no zoom change)
    simulationRef.current
      .force('charge', d3.forceManyBody<GraphNode>().strength(-20)) // Much less repulsion
      .force('center', d3.forceCenter(width / 2, actualHeight / 2).strength(0.8)) // Much stronger center pull
      .alpha(0.8)
      .restart()
    
    setClusterLevel('clustered')
  }, [fullscreen, height])
  
  // Handle spreading - separate nodes apart
  const handleSpread = useCallback(() => {
    if (!simulationRef.current || !svgRef.current || !containerRef.current) return
    
    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth
    const actualHeight = fullscreen ? window.innerHeight - 100 : height
    
    // Update simulation forces to spread nodes apart
    simulationRef.current
      .force('charge', d3.forceManyBody<GraphNode>().strength(-800)) // More repulsion
      .force('center', d3.forceCenter(width / 2, actualHeight / 2).strength(0.05)) // Weaker center pull
      .alpha(0.8)
      .restart()
    
    setClusterLevel('spread')
    
    // Reset zoom to default view
    setTimeout(() => {
      if (zoomRef.current && svgRef.current) {
        svg.transition()
          .duration(750)
          .call(zoomRef.current.transform as any, d3.zoomIdentity)
      }
    }, 500)
  }, [fullscreen, height])
  
  // Reset to normal layout
  const handleResetLayout = useCallback(() => {
    if (!simulationRef.current || !svgRef.current || !containerRef.current) return
    
    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth
    const actualHeight = fullscreen ? window.innerHeight - 100 : height
    
    // Reset to default simulation forces
    simulationRef.current
      .force('charge', d3.forceManyBody<GraphNode>().strength(-500))
      .force('center', d3.forceCenter(width / 2, actualHeight / 2))
      .alpha(0.8)
      .restart()
    
    setClusterLevel('normal')
    
    // Reset zoom
    setTimeout(() => {
      if (zoomRef.current && svgRef.current) {
        svg.transition()
          .duration(750)
          .call(zoomRef.current.transform as any, d3.zoomIdentity)
      }
    }, 500)
  }, [fullscreen, height])

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

    // Create a set of valid node IDs for quick lookup
    const validNodeIds = new Set(graphData.nodes.map(n => n.id))
    
    // Filter out any links that reference non-existent nodes
    const validLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId)
    })

    // Transaction type colors - based on custom palette
    // Palette: Primary Scarlet #dc2625, Pale Slate #cfd0d5, Blue Slate #4c5568, Cool Steel #7b95a7, Platinum #f1f4f8
    const transactionTypeColors: Record<string, string> = {
      '1': '#7b95a7',  // Incoming Funds - Cool Steel
      '2': '#4c5568',  // Outgoing Commitment - Blue Slate
      '3': '#dc2625',  // Disbursement - Primary Scarlet
      '4': '#4c5568',  // Expenditure - Blue Slate
      '5': '#cfd0d5',  // Interest Payment - Pale Slate
      '6': '#cfd0d5',  // Loan Repayment - Pale Slate
      '7': '#7b95a7',  // Reimbursement - Cool Steel
      '8': '#4c5568',  // Purchase of Equity - Blue Slate
      '9': '#7b95a7',  // Sale of Equity - Cool Steel
      '10': '#cfd0d5', // Credit Guarantee - Pale Slate
      '11': '#dc2625', // Incoming Funds - Primary Scarlet
      '12': '#4c5568', // Outgoing Pledge - Blue Slate
      '13': '#7b95a7', // Incoming Pledge - Cool Steel
      'unknown': '#cfd0d5' // Unknown - Pale Slate
    }

    // Get color for a link based on transaction type
    const getLinkColor = (link: GraphLink) => {
      const txType = link.transactionType || 'unknown'
      return transactionTypeColors[txType] || transactionTypeColors['unknown']
    }

    // Color scales (keep for backward compatibility)
    const maxValue = d3.max(validLinks, d => d.value) || 1
    
    // Size scales
    const maxFlow = d3.max(graphData.nodes, d => 
      (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
    ) || 1
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxFlow])
      .range([8, 40])
    
    // Link width scale - minimum width of 2px for visibility
    const linkWidthScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([2, 12])

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
    zoomRef.current = zoom

    // Create main group
    const g = svg.append('g')

    // Create arrow markers
    const defs = svg.append('defs')
    
    // Create gradient for each link based on transaction type
    validLinks.forEach((link, i) => {
      const color = getLinkColor(link)
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
      
      // Lighter version at start, full color at end
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.4)
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.9)
    })

    // Create arrow markers for each transaction type
    Object.entries(transactionTypeColors).forEach(([txType, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${txType}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
    })

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(validLinks)
        .id(d => d.id)
        .distance(150)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, actualHeight / 2))
      .force('collision', d3.forceCollide().radius((d) => {
        const node = d as GraphNode;
        return radiusScale(
          (node.totalIn || node.inflow || 0) + (node.totalOut || node.outflow || 0)
        ) + 10;
      }))
    
    // Store simulation reference for external control
    simulationRef.current = simulation

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(validLinks)
      .enter().append('line')
      .attr('stroke', (d, i) => `url(#gradient-${i})`)
      .attr('stroke-width', d => linkWidthScale(d.value || 1) || 2) // Default width for links without value (e.g., activity relationships)
      .attr('stroke-opacity', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source
        const targetId = typeof d.target === 'object' ? d.target.id : d.target
        if (highlightedNodeId && (sourceId === highlightedNodeId || targetId === highlightedNodeId)) {
          return 1
        }
        return 0.7
      })
      .attr('marker-end', d => `url(#arrow-${d.transactionType || 'unknown'})`)
      .style('pointer-events', 'all') // Make links interactive
    
    // Log link count for debugging
    console.log('[EnhancedAidFlowGraph] Rendering links:', validLinks.length, 'nodes:', graphData.nodes.length)

    // Create clipPath definitions for circular logo images
    graphData.nodes.forEach((d, i) => {
      if (d.logo) {
        const r = radiusScale((d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0))
        defs.append('clipPath')
          .attr('id', `clip-${i}`)
          .append('circle')
          .attr('r', r)
          .attr('cx', 0)
          .attr('cy', 0)
      }
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

    // Helper function to get node color
    // Palette: Primary Scarlet #dc2625, Pale Slate #cfd0d5, Blue Slate #4c5568, Cool Steel #7b95a7, Platinum #f1f4f8
    const getNodeColor = (d: GraphNode) => {
      if (d.id === highlightedNodeId) return '#dc2625' // Primary Scarlet for highlighted
      if (d.type === 'donor') return '#4c5568'        // Blue Slate
      if (d.type === 'recipient') return '#7b95a7'    // Cool Steel
      if (d.type === 'implementer') return '#dc2625'  // Primary Scarlet
      if (d.type === 'sector') return '#cfd0d5'       // Pale Slate
      return '#4c5568' // Blue Slate default
    }

    // Helper function to get initials for nodes without logos
    const getInitials = (d: GraphNode) => {
      if (d.acronym) return d.acronym.substring(0, 3)
      const words = d.name.split(' ').filter(w => w.length > 0)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return d.name.substring(0, 2).toUpperCase()
    }

    // Add background circle (white for logos, colored for non-logos)
    node.append('circle')
      .attr('r', d => radiusScale(
        (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
      ))
      .attr('fill', d => d.logo ? '#ffffff' : getNodeColor(d))
      .attr('stroke', d => d.id === highlightedNodeId ? '#dc2625' : (d.logo ? '#e2e8f0' : '#fff'))
      .attr('stroke-width', d => d.id === highlightedNodeId ? 3 : 2)
      .attr('opacity', d => {
        if (highlightedNodeId && d.id !== highlightedNodeId) {
          const isConnected = validLinks.some(l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source
            const targetId = typeof l.target === 'object' ? l.target.id : l.target
            return (sourceId === highlightedNodeId && targetId === d.id) || 
                   (targetId === highlightedNodeId && sourceId === d.id)
          })
          return isConnected ? 0.8 : 0.3
        }
        return 1
      })

    // Add logo images for nodes that have them
    node.filter(d => !!d.logo)
      .append('image')
      .attr('xlink:href', d => d.logo!)
      .attr('x', d => -radiusScale((d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)))
      .attr('y', d => -radiusScale((d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)))
      .attr('width', d => radiusScale((d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)) * 2)
      .attr('height', d => radiusScale((d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)) * 2)
      .attr('clip-path', (d, i) => `url(#clip-${graphData.nodes.indexOf(d)})`)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .on('error', function() {
        // If image fails to load, hide it (fallback circle is already there)
        d3.select(this).style('display', 'none')
      })

    // Add initials/acronym text for nodes WITHOUT logos
    node.filter(d => !d.logo)
      .append('text')
      .text(d => getInitials(d))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => Math.min(radiusScale((d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)) * 0.8, 14))
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('pointer-events', 'none')

    // Add labels below nodes
    const labels = node.append('text')
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => radiusScale(
        (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
      ) + 15)
      .attr('font-size', '12px')
      .attr('fill', '#334155')
      .attr('font-weight', d => d.id === highlightedNodeId ? 'bold' : 'normal')

    // Add hover interactions (highlight only, no tooltip)
    node.on('mouseenter', function(event, d) {
      // Highlight connected links
      link.attr('stroke-opacity', l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source
        const targetId = typeof l.target === 'object' ? l.target.id : l.target
        return sourceId === d.id || targetId === d.id ? 1 : 0.2
      })
      
      // Dim unconnected nodes
      node.attr('opacity', n => {
        const isConnected = validLinks.some(l => {
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
      link.attr('stroke-opacity', 0.6)
      node.attr('opacity', 1)
    })
    .on('click', function(event, d) {
      event.stopPropagation()
      // Get position relative to container for the tooltip
      const containerRect = container.getBoundingClientRect()
      const x = event.clientX - containerRect.left
      const y = event.clientY - containerRect.top
      
      // Toggle tooltip - if clicking same node, close it; otherwise show for new node
      if (selectedNode?.id === d.id) {
        setSelectedNode(null)
        setSelectedNodePosition(null)
        setNestedPopup(null)
      } else {
        setSelectedNode(d)
        setSelectedNodePosition({ x, y })
        setNestedPopup(null)
      }
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

    // Reset cluster level when graph data changes
    setClusterLevel('normal')
    
    // Cleanup
    return () => {
      simulation.stop()
      simulationRef.current = null
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

  // Close popup when clicking outside
  const handleContainerClick = useCallback(() => {
    if (selectedNode) {
      setSelectedNode(null)
      setSelectedNodePosition(null)
      setNestedPopup(null)
    }
  }, [selectedNode])

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className={`relative ${fullscreen ? 'fixed inset-0 z-50 bg-white p-4' : 'w-full'}`}
        style={{ height: fullscreen ? '100vh' : height }}
        onClick={handleContainerClick}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {/* Cluster/Spread Controls */}
          <div className="flex gap-1 bg-white/90 backdrop-blur rounded-lg border p-1">
            <Button
              variant={clusterLevel === 'clustered' ? 'default' : 'ghost'}
              size="sm"
              onClick={handleCluster}
              className="h-8 px-3"
              title="Bring nodes together"
            >
              <Shrink className="h-4 w-4 mr-1" />
              <span className="text-xs">Cluster</span>
            </Button>
            <Button
              variant={clusterLevel === 'spread' ? 'default' : 'ghost'}
              size="sm"
              onClick={handleSpread}
              className="h-8 px-3"
              title="Spread nodes apart"
            >
              <Expand className="h-4 w-4 mr-1" />
              <span className="text-xs">Spread</span>
            </Button>
            {clusterLevel !== 'normal' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetLayout}
                className="h-8 px-2"
                title="Reset to normal layout"
              >
                <span className="text-xs">Reset</span>
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="bg-white/90 backdrop-blur"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Legend - Transaction Types Only */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4" />
              <span className="text-sm font-medium">Transaction Types</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#7b95a7' }}></div>
                <span className="text-xs">Incoming Commit.</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#4c5568' }}></div>
                <span className="text-xs">Outgoing Commit.</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#dc2625' }}></div>
                <span className="text-xs">Disbursement</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#4c5568' }}></div>
                <span className="text-xs">Expenditure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#dc2625' }}></div>
                <span className="text-xs">Incoming Funds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#cfd0d5' }}></div>
                <span className="text-xs">Other</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tooltip - appears on click */}
        {selectedNode && selectedNodePosition && (() => {
          const inflow = selectedNode.totalIn || selectedNode.inflow || 0
          const outflow = selectedNode.totalOut || selectedNode.outflow || 0
          const netFlow = inflow - outflow
          const totalFlow = inflow + outflow
          const connectionStats = getNodeConnectionStats(selectedNode.id)
          const nodeTypeColor = selectedNode.type === 'donor' ? '#4c5568' : 
                               selectedNode.type === 'recipient' ? '#7b95a7' : 
                               selectedNode.type === 'implementer' ? '#dc2625' : '#cfd0d5'
          
          // Determine role based on flow direction
          const flowRole = inflow > 0 && outflow > 0 ? 'Intermediary' :
                          inflow > outflow ? 'Net Receiver' : 
                          outflow > inflow ? 'Net Provider' : 'Organization'
          
          return (
            <div 
              className="absolute z-20 bg-white text-slate-900 p-4 rounded-xl shadow-xl border border-slate-200 min-w-[280px] max-w-[320px]"
              style={{
                left: Math.min(selectedNodePosition.x + 15, (containerRef.current?.clientWidth || 400) - 340),
                top: selectedNodePosition.y + 15
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setSelectedNode(null)
                  setSelectedNodePosition(null)
                  setNestedPopup(null)
                }}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Header */}
              <div className="flex items-start gap-3 pr-6">
                {selectedNode.logo ? (
                  <img 
                    src={selectedNode.logo} 
                    alt={`${selectedNode.name} logo`}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${selectedNode.logo ? 'hidden' : ''}`}
                  style={{ backgroundColor: nodeTypeColor }}
                >
                  {selectedNode.acronym?.substring(0, 2) || selectedNode.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 leading-tight">{selectedNode.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${nodeTypeColor}20`, color: nodeTypeColor }}
                    >
                      {selectedNode.type || 'Organization'}
                    </span>
                    {flowRole !== 'Organization' && (
                      <span className="text-xs text-slate-500">{flowRole}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Financial Summary */}
              {(inflow > 0 || outflow > 0) && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-2">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Financial Summary</div>
                  
                  {inflow > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Inflow
                      </span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(inflow)}</span>
                    </div>
                  )}
                  {outflow > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Outflow
                      </span>
                      <span className="font-semibold text-blue-600">{formatCurrency(outflow)}</span>
                    </div>
                  )}
                  {inflow > 0 && outflow > 0 && (
                    <>
                      <div className="border-t border-slate-200 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700">Net Flow</span>
                          <span className={`font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  {totalFlow > 0 && (
                    <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                      <span>Total Volume</span>
                      <span>{formatCurrency(totalFlow)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Connection Stats - Clickable */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button 
                  className="bg-slate-50 hover:bg-slate-100 rounded-lg p-3 text-center transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setNestedPopup({ type: 'partners', data: connectionStats.partners })
                  }}
                >
                  <div className="text-2xl font-bold text-slate-900">{connectionStats.partnerCount}</div>
                  <div className="text-xs text-slate-500">Partners</div>
                </button>
                <button 
                  className="bg-slate-50 hover:bg-slate-100 rounded-lg p-3 text-center transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setNestedPopup({ type: 'transactions', data: connectionStats.allTransactions })
                  }}
                >
                  <div className="text-2xl font-bold text-slate-900">{connectionStats.totalConnections}</div>
                  <div className="text-xs text-slate-500">Transactions</div>
                </button>
              </div>
              
              {/* Flow Direction Breakdown - Clickable */}
              {(connectionStats.incomingCount > 0 || connectionStats.outgoingCount > 0) && (
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
                  {connectionStats.incomingCount > 0 && (
                    <button 
                      className="flex items-center gap-1 hover:text-emerald-600 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNestedPopup({ type: 'incoming', data: connectionStats.incomingTransactions })
                      }}
                    >
                      <span className="text-emerald-500">↓</span> {connectionStats.incomingCount} incoming
                    </button>
                  )}
                  {connectionStats.outgoingCount > 0 && (
                    <button 
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNestedPopup({ type: 'outgoing', data: connectionStats.outgoingTransactions })
                      }}
                    >
                      <span className="text-blue-500">↑</span> {connectionStats.outgoingCount} outgoing
                    </button>
                  )}
                </div>
              )}
              
              {/* Nested Popup for Partners/Transactions */}
              {nestedPopup && (
                <div className="mt-3 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {nestedPopup.type === 'partners' ? 'Partners' : 
                       nestedPopup.type === 'incoming' ? 'Incoming Transactions' :
                       nestedPopup.type === 'outgoing' ? 'Outgoing Transactions' : 'All Transactions'}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setNestedPopup(null)
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {nestedPopup.type === 'partners' ? (
                    <div className="divide-y divide-slate-100">
                      {nestedPopup.data.map((partner: any, idx: number) => (
                        <div key={idx} className="px-3 py-2 flex items-center gap-2">
                          {partner.logo ? (
                            <img 
                              src={partner.logo} 
                              alt={partner.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                              {partner.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-900 truncate">{partner.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <span className="capitalize">{partner.type || 'Organization'}</span>
                              <span>•</span>
                              <span className={partner.direction === 'incoming' ? 'text-emerald-500' : partner.direction === 'outgoing' ? 'text-blue-500' : 'text-purple-500'}>
                                {partner.direction === 'both' ? '↓↑' : partner.direction === 'incoming' ? '↓' : '↑'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {nestedPopup.data.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-slate-500">No partners</div>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {nestedPopup.data.map((tx: any, idx: number) => (
                        <div key={idx} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {tx.partnerLogo ? (
                              <img 
                                src={tx.partnerLogo} 
                                alt={tx.partnerName}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                {tx.partnerName.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-900 truncate">{tx.partnerName}</div>
                              <div className="text-xs text-slate-500">{tx.typeName}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${tx.direction === 'incoming' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                {tx.direction === 'incoming' ? '+' : '-'}{formatCurrency(tx.value)}
                              </div>
                              <div className="text-xs text-slate-400">
                                {tx.direction === 'incoming' ? '↓ In' : '↑ Out'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {nestedPopup.data.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-slate-500">No transactions</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* SVG Container */}
        <svg ref={svgRef} className="w-full h-full"></svg>

        {/* Help Text */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-slate-500">
          <Info className="h-3 w-3" />
          <span>Drag to pan • Pinch to zoom • Click nodes for details</span>
        </div>
      </div>
    </div>
  )
} 