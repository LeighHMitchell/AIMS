"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { Button } from '@/components/ui/button'
import { Info, Maximize2, Minimize2, Network, X, ArrowRight, Shrink, Expand } from 'lucide-react'
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
  searchQuery?: string
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
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [sidebarTransactions, setSidebarTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [orgSummary, setOrgSummary] = useState<any>(null)
  const [clusterLevel, setClusterLevel] = useState<'normal' | 'clustered' | 'spread'>('normal')

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
    if (!simulationRef.current || !svgRef.current || !containerRef.current) return
    
    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth
    const actualHeight = fullscreen ? window.innerHeight - 100 : height
    
    // Update simulation forces to cluster nodes together
    simulationRef.current
      .force('charge', d3.forceManyBody<GraphNode>().strength(-100)) // Less repulsion
      .force('center', d3.forceCenter(width / 2, actualHeight / 2).strength(0.3)) // Stronger center pull
      .alpha(0.8)
      .restart()
    
    setClusterLevel('clustered')
    
    // Zoom to fit all nodes in view after a short delay
    setTimeout(() => {
      if (zoomRef.current && svgRef.current) {
        svg.transition()
          .duration(750)
          .call(zoomRef.current.transform as any, d3.zoomIdentity.translate(width / 4, actualHeight / 4).scale(0.5))
      }
    }, 500)
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

    // Create a set of valid node IDs for quick lookup
    const validNodeIds = new Set(graphData.nodes.map(n => n.id))
    
    // Filter out any links that reference non-existent nodes
    const validLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId)
    })

    // Transaction type colors - distinct colors for each type
    const transactionTypeColors: Record<string, string> = {
      '1': '#22c55e',  // Incoming Commitment - Green
      '2': '#3b82f6',  // Outgoing Commitment - Blue
      '3': '#8b5cf6',  // Disbursement - Purple
      '4': '#f59e0b',  // Expenditure - Amber
      '5': '#ef4444',  // Interest Repayment - Red
      '6': '#ec4899',  // Loan Repayment - Pink
      '7': '#14b8a6',  // Reimbursement - Teal
      '8': '#6366f1',  // Purchase of Equity - Indigo
      '9': '#84cc16',  // Sale of Equity - Lime
      '10': '#f97316', // Credit Guarantee - Orange
      '11': '#06b6d4', // Incoming Funds - Cyan
      '12': '#a855f7', // Outgoing Pledge - Violet
      '13': '#10b981', // Incoming Pledge - Emerald
      'unknown': '#64748b' // Unknown - Slate
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
    const getNodeColor = (d: GraphNode) => {
      if (d.id === highlightedNodeId) return '#f97316'
      if (d.type === 'donor') return '#3b82f6'
      if (d.type === 'recipient') return '#10b981'
      if (d.type === 'implementer') return '#f59e0b'
      if (d.type === 'sector') return '#8b5cf6'
      return '#64748b'
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
      .attr('stroke', d => d.id === highlightedNodeId ? '#ea580c' : (d.logo ? '#e2e8f0' : '#fff'))
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
      setHoveredNode(null)
      link.attr('stroke-opacity', 0.6)
      node.attr('opacity', 1)
    })
    .on('click', function(event, d) {
      event.stopPropagation()
      // Get position relative to container for the popup
      const containerRect = container.getBoundingClientRect()
      const x = event.clientX - containerRect.left
      const y = event.clientY - containerRect.top
      
      setSelectedNode(d)
      setSelectedNodePosition({ x, y })
      setPopupOpen(true)
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

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className={`relative ${fullscreen ? 'fixed inset-0 z-50 bg-white p-4' : 'w-full'}`}
        style={{ height: fullscreen ? '100vh' : height }}
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

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-2">
          {/* Organization Types Legend */}
          <div className="bg-white/90 backdrop-blur p-3 rounded-lg border">
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
          
          {/* Transaction Types Legend */}
          <div className="bg-white/90 backdrop-blur p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4" />
              <span className="text-sm font-medium">Transaction Types</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span className="text-xs">Incoming Commit.</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span className="text-xs">Outgoing Commit.</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-purple-500"></div>
                <span className="text-xs">Disbursement</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-amber-500"></div>
                <span className="text-xs">Expenditure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-cyan-500"></div>
                <span className="text-xs">Incoming Funds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-slate-500"></div>
                <span className="text-xs">Other</span>
              </div>
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
          <span>Drag to pan • Pinch to zoom • Click nodes for details</span>
        </div>
      </div>

      {/* Selected Node Popup - appears near clicked node */}
      {popupOpen && selectedNode && selectedNodePosition && (
        <div 
          className="absolute z-20 bg-slate-900 text-white p-4 rounded-lg shadow-xl max-w-sm"
          style={{
            left: Math.min(selectedNodePosition.x + 15, (containerRef.current?.clientWidth || 400) - 320),
            top: selectedNodePosition.y + 15,
            transform: selectedNodePosition.y > (height - 250) ? 'translateY(-100%)' : undefined
          }}
        >
          {/* Close button */}
          <button
            onClick={() => {
              setPopupOpen(false)
              setSelectedNode(null)
              setSelectedNodePosition(null)
            }}
            className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="font-semibold text-sm pr-6">{selectedNode.name}</div>
          <div className="text-xs text-slate-300 capitalize mt-1">{selectedNode.type || 'Organization'}</div>
          
          {/* Summary Stats */}
          {orgSummary && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-xs text-green-400">Total Inflow</div>
                <div className="font-semibold text-green-300 text-sm">
                  {formatCurrency(orgSummary.totalInflow)}
                </div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-xs text-red-400">Total Outflow</div>
                <div className="font-semibold text-red-300 text-sm">
                  {formatCurrency(orgSummary.totalOutflow)}
                </div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-xs text-blue-400">Transactions</div>
                <div className="font-semibold text-blue-300 text-sm">
                  {orgSummary.transactionCount}
                </div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-xs text-purple-400">Partners</div>
                <div className="font-semibold text-purple-300 text-sm">
                  {orgSummary.uniquePartners}
                </div>
              </div>
            </div>
          )}
          
          {/* Loading state */}
          {loadingTransactions && (
            <div className="flex items-center justify-center py-4 mt-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
          
          {/* Flow summary from node data */}
          {!orgSummary && !loadingTransactions && (
            <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
              {(selectedNode.totalIn || selectedNode.inflow) ? (
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">Total Inflow:</span>
                  <span className="font-medium">{formatCurrency(selectedNode.totalIn || selectedNode.inflow || 0)}</span>
                </div>
              ) : null}
              {(selectedNode.totalOut || selectedNode.outflow) ? (
                <div className="flex justify-between text-xs">
                  <span className="text-blue-400">Total Outflow:</span>
                  <span className="font-medium">{formatCurrency(selectedNode.totalOut || selectedNode.outflow || 0)}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 