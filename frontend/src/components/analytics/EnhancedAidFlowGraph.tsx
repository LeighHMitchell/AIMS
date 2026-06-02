"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { Button } from '@/components/ui/button'
import { Info, Maximize2, Minimize2, X, ArrowRight, Shrink, Expand, Plus, Minus, RotateCcw } from 'lucide-react'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency } from '@/lib/format'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getTransactionTypeColor, OTHERS_COLOR, TRANSACTION_TYPE_LABELS as CANONICAL_TRANSACTION_TYPE_LABELS } from '@/lib/chart-colors'

// Plain-language definitions used in the badge hover tooltips. Centralised so
// the same wording appears next to a "Recipient" badge in the popup header
// and a "Recipient" tag in the partner list.
const BADGE_DEFINITIONS: Record<string, string> = {
  donor: 'An organisation that provides funding — typically a bilateral, multilateral, or foundation.',
  recipient: 'An organisation that ultimately benefits from the funding (often a government or community).',
  implementer: 'An organisation that delivers the activity on the ground — often an NGO or contractor.',
  intermediary: 'An organisation that channels funds onward — receiving from one organisation and disbursing to another.',
  'net receiver': 'This organisation has received more funding than it has sent during the selected period.',
  'net provider': 'This organisation has sent more funding than it has received during the selected period.',
  organisation: 'A party in the aid flow (no specific role detected for the selected period).',
  organization: 'A party in the aid flow (no specific role detected for the selected period).',
  sector: 'A thematic grouping of activities by sector (e.g. health, education).',
  activity: 'An individual activity or project — the unit of work being funded or delivered.',
  inflow: 'The total value of funding this organisation received during the selected period.',
  outflow: 'The total value of funding this organisation sent during the selected period.',
  other: 'Transaction types other than the highlighted ones (e.g. reimbursements, interest, equity).',
}

function capitalise(s?: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

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
  const isExpanded = useChartExpansion()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  // Persist the zoom transform across data refreshes so toggling view mode
  // or changing the time period doesn't snap the user back to the default
  // pan/zoom — the visualization refreshes in place.
  const savedZoomRef = useRef<d3.ZoomTransform | null>(null)
  // Persist x/y positions of previously seen nodes so surviving nodes stay
  // where they were across a data refresh; only brand-new nodes need to
  // settle from scratch.
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedNodePosition, setSelectedNodePosition] = useState<{ x: number; y: number } | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [clusterLevel, setClusterLevel] = useState<'normal' | 'clustered' | 'spread'>('normal')
  const [nestedPopup, setNestedPopup] = useState<{
    type: 'partners' | 'transactions' | 'incoming' | 'outgoing'
    data: any[]
  } | null>(null)

  // If the selected node disappears after a data refresh, close the popup.
  // Otherwise keep it open — the same node is still rendered, just with
  // potentially updated stats. This implements "keep popup if node still
  // exists" across the Transactions↔Activities toggle and time changes.
  useEffect(() => {
    if (!selectedNode) return
    const stillExists = graphData.nodes.some(n => n.id === selectedNode.id)
    if (!stillExists) {
      setSelectedNode(null)
      setSelectedNodePosition(null)
      setNestedPopup(null)
    } else {
      // Refresh the bound node object so connection stats reflect new data.
      const fresh = graphData.nodes.find(n => n.id === selectedNode.id)
      if (fresh && fresh !== selectedNode) setSelectedNode(fresh)
    }
  }, [graphData])

  // Legend rows are derived from the transaction types ACTUALLY present in the
  // current graph data, labelled + coloured through the canonical chart-colors
  // source of truth — so every swatch matches its links exactly. Codes are
  // shown in canonical 1→13 order; any link with no/unknown code adds an
  // "Other" row using the neutral fallback colour.
  const legendEntries = useMemo(() => {
    const presentCodes = new Set<string>()
    let hasUnknown = false
    graphData.links.forEach(l => {
      const code = l.transactionType
      if (code && code in CANONICAL_TRANSACTION_TYPE_LABELS) {
        presentCodes.add(String(code))
      } else {
        hasUnknown = true
      }
    })

    const entries = Object.keys(CANONICAL_TRANSACTION_TYPE_LABELS)
      .filter(code => presentCodes.has(code))
      .sort((a, b) => Number(a) - Number(b))
      .map(code => ({
        code,
        label: CANONICAL_TRANSACTION_TYPE_LABELS[code],
        color: getTransactionTypeColor(code),
      }))

    if (hasUnknown) {
      entries.push({ code: 'unknown', label: 'Other', color: OTHERS_COLOR })
    }

    return entries
  }, [graphData.links])

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

    // Link coloring resolves through the canonical 13-code IATI palette in
    // chart-colors.ts (single source of truth), so distinct transaction types
    // never collide and match the legend / every other chart. Unknown/empty
    // codes fall back to the neutral "others" slate.
    const transactionTypeColors: Record<string, string> = {
      '1': getTransactionTypeColor('1'),
      '2': getTransactionTypeColor('2'),
      '3': getTransactionTypeColor('3'),
      '4': getTransactionTypeColor('4'),
      '5': getTransactionTypeColor('5'),
      '6': getTransactionTypeColor('6'),
      '7': getTransactionTypeColor('7'),
      '8': getTransactionTypeColor('8'),
      '9': getTransactionTypeColor('9'),
      '10': getTransactionTypeColor('10'),
      '11': getTransactionTypeColor('11'),
      '12': getTransactionTypeColor('12'),
      '13': getTransactionTypeColor('13'),
      'unknown': OTHERS_COLOR,
    }

    // Get color for a link based on transaction type
    const getLinkColor = (link: GraphLink) => {
      const txType = link.transactionType
      if (!txType || !(txType in transactionTypeColors)) return OTHERS_COLOR
      return getTransactionTypeColor(txType)
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

    // Create zoom behavior. In expanded mode (the chart-card dialog or the
    // standalone fullscreen view) the user has explicit control over the
    // viewport — let the wheel and trackpad pan-scroll zoom directly. In the
    // embedded compact card we still gate wheel events behind ctrlKey so
    // ordinary page scrolling works while the cursor is over the chart.
    const allowFreeWheelZoom = isExpanded || fullscreen
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .filter((event) => {
        if (event.type === 'wheel') {
          return allowFreeWheelZoom || event.ctrlKey
        }
        return true
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
        savedZoomRef.current = event.transform
      })

    svg.call(zoom)
    zoomRef.current = zoom

    // Seed nodes that survived the data refresh with their last known
    // positions, so the simulation perturbs them only gently instead of
    // re-tumbling the whole layout.
    graphData.nodes.forEach(n => {
      const prev = nodePositionsRef.current.get(n.id)
      if (prev) {
        n.x = prev.x
        n.y = prev.y
      }
    })

    // Create main group
    const g = svg.append('g')

    // Restore any previously-saved zoom/pan from before this rebuild so the
    // user doesn't lose their viewport on toggle / time-period change. This
    // must run AFTER `g` is declared, because applying the transform fires
    // the zoom handler which reads from `g`.
    if (savedZoomRef.current) {
      svg.call(zoom.transform as any, savedZoomRef.current)
    }

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

    // Pre-compute parallel-link bundles: when two organisations have more
    // than one link between them (e.g. Disbursement + Expenditure, or A→B
    // alongside B→A) we want to offset each line perpendicular to the
    // source→target axis so they don't overlap into a single muddy stroke.
    // We bundle by an unordered pair key so reverse-direction links bend the
    // opposite way and remain distinguishable.
    const linkBundles = new Map<string, GraphLink[]>()
    validLinks.forEach((l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source
      const tId = typeof l.target === 'object' ? l.target.id : l.target
      const key = sId < tId ? `${sId}__${tId}` : `${tId}__${sId}`
      const bucket = linkBundles.get(key) || []
      bucket.push(l)
      linkBundles.set(key, bucket)
    })
    const linkLayout = new Map<GraphLink, { index: number; count: number; reversed: boolean }>()
    linkBundles.forEach((bucket) => {
      const count = bucket.length
      const canonicalSource =
        (typeof bucket[0].source === 'object' ? bucket[0].source.id : bucket[0].source)
      bucket.forEach((l, i) => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source
        linkLayout.set(l, { index: i, count, reversed: sId !== canonicalSource })
      })
    })

    // Path generator for curved (parallel-offset) links. The control point
    // is offset perpendicular to the chord; offsets are spaced symmetrically
    // around zero so the bundle splays out evenly.
    const linkPath = (d: GraphLink) => {
      const s = d.source as GraphNode
      const t = d.target as GraphNode
      const sx = s.x || 0, sy = s.y || 0
      const tx = t.x || 0, ty = t.y || 0
      const layout = linkLayout.get(d)
      const count = layout?.count ?? 1
      if (count <= 1) {
        return `M${sx},${sy}L${tx},${ty}`
      }
      const dx = tx - sx
      const dy = ty - sy
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      // Perpendicular unit vector
      const nx = -dy / dist
      const ny = dx / dist
      // Distribute offsets symmetrically (e.g. count=3 → -1, 0, +1).
      const idx = (layout!.index) - (count - 1) / 2
      const spread = 18 // pixels between adjacent parallel links
      const offset = idx * spread
      const cx = (sx + tx) / 2 + nx * offset
      const cy = (sy + ty) / 2 + ny * offset
      return `M${sx},${sy}Q${cx},${cy} ${tx},${ty}`
    }

    // Create links as curved paths so parallel links between the same pair
    // of organisations remain visually distinct.
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(validLinks)
      .enter().append('path')
      .attr('fill', 'none')
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

    // Add labels below nodes — wrap onto multiple lines instead of
    // truncating with an ellipsis. We split on word boundaries and start a
    // new tspan whenever the running width would exceed maxCharsPerLine.
    const maxCharsPerLine = 22
    const labels = node.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#334155')
      .attr('font-weight', d => d.id === highlightedNodeId ? 'bold' : 'normal')
      .attr('y', d => radiusScale(
        (d.totalIn || d.inflow || 0) + (d.totalOut || d.outflow || 0)
      ) + 15)

    labels.each(function(d) {
      const text = d3.select(this)
      const words = (d.name || '').split(/\s+/).filter(Boolean)
      const lines: string[] = []
      let current = ''
      for (const w of words) {
        if (!current) {
          current = w
        } else if ((current.length + 1 + w.length) <= maxCharsPerLine) {
          current = `${current} ${w}`
        } else {
          lines.push(current)
          current = w
        }
      }
      if (current) lines.push(current)
      // Single very-long word with no spaces: hard-wrap.
      if (lines.length === 1 && lines[0].length > maxCharsPerLine) {
        const w = lines[0]
        lines.length = 0
        for (let i = 0; i < w.length; i += maxCharsPerLine) {
          lines.push(w.slice(i, i + maxCharsPerLine))
        }
      }
      lines.forEach((line, i) => {
        text.append('tspan')
          .attr('x', 0)
          .attr('dy', i === 0 ? 0 : '1.1em')
          .text(line)
      })
    })

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
      link.attr('d', linkPath)
      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
      // Persist positions for surviving nodes across the next refresh.
      graphData.nodes.forEach(n => {
        if (typeof n.x === 'number' && typeof n.y === 'number') {
          nodePositionsRef.current.set(n.id, { x: n.x, y: n.y })
        }
      })
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
  }, [graphData, fullscreen, height, highlightedNodeId, onNodeClick, dateRange, isExpanded])

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen)
  }

  // Programmatic zoom controls — drive the same d3-zoom behavior that the
  // wheel / pinch gestures use, so the visible transform and savedZoomRef
  // stay in sync.
  const handleZoomIn = useCallback(() => {
    if (!zoomRef.current || !svgRef.current) return
    d3.select(svgRef.current).transition().duration(200)
      .call(zoomRef.current.scaleBy as any, 1.3)
  }, [])
  const handleZoomOut = useCallback(() => {
    if (!zoomRef.current || !svgRef.current) return
    d3.select(svgRef.current).transition().duration(200)
      .call(zoomRef.current.scaleBy as any, 1 / 1.3)
  }, [])
  const handleZoomReset = useCallback(() => {
    if (!zoomRef.current || !svgRef.current) return
    savedZoomRef.current = null
    d3.select(svgRef.current).transition().duration(300)
      .call(zoomRef.current.transform as any, d3.zoomIdentity)
  }, [])

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
          {/* Zoom controls */}
          <div className="flex gap-1 bg-white/90 backdrop-blur rounded-lg border p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomReset}
              className="h-8 w-8 p-0"
              title="Reset zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Cluster/Spread Controls */}
          <div className="flex gap-1 bg-white/90 backdrop-blur rounded-lg border p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCluster}
              className={`h-8 px-3 ${clusterLevel === 'clustered' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Bring nodes together"
            >
              <Shrink className="h-4 w-4 mr-1" />
              <span className="text-helper">Cluster</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSpread}
              className={`h-8 px-3 ${clusterLevel === 'spread' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Spread nodes apart"
            >
              <Expand className="h-4 w-4 mr-1" />
              <span className="text-helper">Spread</span>
            </Button>
            {clusterLevel !== 'normal' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetLayout}
                className="h-8 px-2"
                title="Reset to normal layout"
              >
                <span className="text-helper">Reset</span>
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
              <span className="text-body font-medium">Transaction Types</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {legendEntries.length === 0 ? (
                <span className="text-helper text-muted-foreground col-span-2">No transactions</span>
              ) : (
                legendEntries.map(entry => (
                  <div key={entry.code} className="flex items-center gap-2">
                    <div className="w-4 h-0.5" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-helper">{entry.label}</span>
                  </div>
                ))
              )}
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
          // Use a single monochrome shade for the role-avatar background;
          // the role itself is communicated by the (capitalised) badge text
          // below, not by colour. Keeps the popup chrome consistent with the
          // monochrome treatment of Inflow / Outflow / Other.
          const nodeAvatarColor = '#4c5568' // Blue Slate

          // Determine role based on flow direction
          const flowRole = inflow > 0 && outflow > 0 ? 'Intermediary' :
                          inflow > outflow ? 'Net Receiver' :
                          outflow > inflow ? 'Net Provider' : 'Organisation'

          const POPUP_WIDTH = 320
          const PANEL_WIDTH = 320
          const GAP = 12
          const containerWidth = containerRef.current?.clientWidth || 800
          const containerHeight = containerRef.current?.clientHeight || 600

          // Position the main popup, clamping to the container.
          const popupLeft = Math.min(
            Math.max(selectedNodePosition.x + 15, 8),
            containerWidth - POPUP_WIDTH - 8
          )
          const popupTop = Math.min(selectedNodePosition.y + 15, containerHeight - 200)

          // Side panel anchors to the main popup: incoming goes to its left,
          // everything else (outgoing, partners, transactions) goes to the
          // right. Clamp to container so it never disappears off-screen.
          let panelLeft = popupLeft + POPUP_WIDTH + GAP
          if (nestedPopup?.type === 'incoming') {
            panelLeft = popupLeft - PANEL_WIDTH - GAP
          }
          if (panelLeft < 8) panelLeft = 8
          if (panelLeft + PANEL_WIDTH > containerWidth - 8) {
            panelLeft = containerWidth - PANEL_WIDTH - 8
          }

          // Type and role tooltip lookups (case-insensitive against the
          // BADGE_DEFINITIONS map, which is keyed by lowercase term).
          const typeKey = (selectedNode.type || 'organisation').toLowerCase()
          const roleKey = flowRole.toLowerCase()
          const typeDef = BADGE_DEFINITIONS[typeKey] || BADGE_DEFINITIONS['organisation']
          const roleDef = BADGE_DEFINITIONS[roleKey]

          return (
            <TooltipProvider delayDuration={200}>
            <div
              className="absolute z-20 bg-white text-foreground p-4 rounded-xl shadow-xl border border-border"
              style={{
                left: popupLeft,
                top: popupTop,
                width: POPUP_WIDTH,
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
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-3 pr-6">
                {selectedNode.logo ? (
                  <img
                    src={selectedNode.logo}
                    alt={`${selectedNode.name} logo`}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${selectedNode.logo ? 'hidden' : ''}`}
                  style={{ backgroundColor: nodeAvatarColor }}
                >
                  {selectedNode.acronym?.substring(0, 2) || selectedNode.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Name wraps; do not truncate. Acronym is appended in
                      parentheses in the same weight/size so it reads as part
                      of the name (matches the search combobox). */}
                  <div className="font-semibold text-foreground leading-tight whitespace-normal break-words">
                    {selectedNode.name}
                    {selectedNode.acronym && selectedNode.acronym !== selectedNode.name && (
                      <> ({selectedNode.acronym})</>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground cursor-help"
                        >
                          {capitalise(selectedNode.type || 'Organisation')}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{typeDef}</TooltipContent>
                    </Tooltip>
                    {flowRole !== 'Organisation' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="text-helper text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
                            {flowRole}
                          </span>
                        </TooltipTrigger>
                        {roleDef && <TooltipContent side="top">{roleDef}</TooltipContent>}
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Summary — white background, monochrome shades. */}
              {(inflow > 0 || outflow > 0) && (
                <div className="mt-4 p-3 bg-white border border-border rounded-lg space-y-2">
                  <div className="text-section-label font-medium text-muted-foreground uppercase">Financial Summary</div>

                  {inflow > 0 && (
                    <div className="flex justify-between items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="text-body text-muted-foreground flex items-center gap-1.5 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-gray-900"></span>
                            Inflow
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{BADGE_DEFINITIONS.inflow}</TooltipContent>
                      </Tooltip>
                      <span className="font-semibold text-gray-900">{formatTooltipCurrency(inflow, isExpanded)}</span>
                    </div>
                  )}
                  {outflow > 0 && (
                    <div className="flex justify-between items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="text-body text-muted-foreground flex items-center gap-1.5 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                            Outflow
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{BADGE_DEFINITIONS.outflow}</TooltipContent>
                      </Tooltip>
                      <span className="font-semibold text-gray-700">{formatTooltipCurrency(outflow, isExpanded)}</span>
                    </div>
                  )}
                  {inflow > 0 && outflow > 0 && (
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-body font-medium text-foreground">Net Flow</span>
                        <span className="font-bold text-foreground">
                          {netFlow >= 0 ? '+' : ''}{formatTooltipCurrency(netFlow, isExpanded)}
                        </span>
                      </div>
                    </div>
                  )}
                  {totalFlow > 0 && (
                    <div className="flex justify-between items-center text-helper text-muted-foreground pt-1">
                      <span>Total Volume</span>
                      <span>{formatTooltipCurrency(totalFlow, isExpanded)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Connection Stats - Clickable */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  className="bg-muted hover:bg-muted/70 rounded-lg p-3 text-center transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setNestedPopup({ type: 'partners', data: connectionStats.partners })
                  }}
                >
                  <div className="text-2xl font-bold text-foreground">{connectionStats.partnerCount}</div>
                  <div className="text-helper text-muted-foreground">Partners</div>
                </button>
                <button
                  className="bg-muted hover:bg-muted/70 rounded-lg p-3 text-center transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setNestedPopup({ type: 'transactions', data: connectionStats.allTransactions })
                  }}
                >
                  <div className="text-2xl font-bold text-foreground">{connectionStats.totalConnections}</div>
                  <div className="text-helper text-muted-foreground">Transactions</div>
                </button>
              </div>

              {/* Flow Direction Breakdown - Clickable */}
              {(connectionStats.incomingCount > 0 || connectionStats.outgoingCount > 0) && (
                <div className="mt-3 flex items-center justify-center gap-4 text-helper text-muted-foreground">
                  {connectionStats.incomingCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            setNestedPopup({ type: 'incoming', data: connectionStats.incomingTransactions })
                          }}
                        >
                          <span className="text-gray-900">↓</span> {connectionStats.incomingCount} incoming
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">{BADGE_DEFINITIONS.inflow}</TooltipContent>
                    </Tooltip>
                  )}
                  {connectionStats.outgoingCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            setNestedPopup({ type: 'outgoing', data: connectionStats.outgoingTransactions })
                          }}
                        >
                          <span className="text-gray-600">↑</span> {connectionStats.outgoingCount} outgoing
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">{BADGE_DEFINITIONS.outflow}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>

            {/* Side panel — renders to the left of the main popup for Incoming
                transactions, and to the right for Outgoing / Partners / All
                Transactions. Replaces the old inline "stacked below" layout. */}
            {nestedPopup && (
              <div
                className="absolute z-20 bg-white border border-border rounded-xl shadow-xl overflow-hidden flex flex-col"
                style={{
                  left: panelLeft,
                  top: popupTop,
                  width: PANEL_WIDTH,
                  maxHeight: Math.max(160, containerHeight - popupTop - 24),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-border px-3 py-2 flex items-center justify-between">
                  <span className="text-body font-medium text-foreground">
                    {nestedPopup.type === 'partners' ? 'Partners' :
                     nestedPopup.type === 'incoming' ? 'Incoming Transactions' :
                     nestedPopup.type === 'outgoing' ? 'Outgoing Transactions' : 'All Transactions'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setNestedPopup(null)
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-y-auto">
                {nestedPopup.type === 'partners' ? (
                  <div className="divide-y divide-slate-100">
                    {nestedPopup.data.map((partner: any, idx: number) => {
                      const pTypeKey = (partner.type || 'organisation').toLowerCase()
                      const pTypeDef = BADGE_DEFINITIONS[pTypeKey] || BADGE_DEFINITIONS['organisation']
                      return (
                        <div key={idx} className="px-3 py-2 flex items-start gap-2">
                          {partner.logo ? (
                            <img
                              src={partner.logo}
                              alt={partner.name}
                              className="w-6 h-6 rounded-full object-cover border border-border flex-shrink-0 mt-0.5"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0 mt-0.5">
                              {partner.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {/* Wrap full org name, do not truncate. */}
                            <div className="text-body text-foreground whitespace-normal break-words">{partner.name}</div>
                            <div className="text-helper text-muted-foreground flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-2">
                                    {capitalise(partner.type || 'Organisation')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">{pTypeDef}</TooltipContent>
                              </Tooltip>
                              <span>•</span>
                              <span className="text-muted-foreground">
                                {partner.direction === 'both' ? '↓↑' : partner.direction === 'incoming' ? '↓' : '↑'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {nestedPopup.data.length === 0 && (
                      <div className="px-3 py-4 text-center text-body text-muted-foreground">No partners</div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {nestedPopup.data.map((tx: any, idx: number) => (
                      <div key={idx} className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          {tx.partnerLogo ? (
                            <img
                              src={tx.partnerLogo}
                              alt={tx.partnerName}
                              className="w-6 h-6 rounded-full object-cover border border-border flex-shrink-0 mt-0.5"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0 mt-0.5">
                              {tx.partnerName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {/* Wrap activity / partner name; do not truncate. */}
                            <div className="text-body text-foreground whitespace-normal break-words">{tx.partnerName}</div>
                            <div className="text-helper text-muted-foreground">{tx.typeName}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm font-medium ${tx.direction === 'incoming' ? 'text-gray-900' : 'text-gray-700'}`}>
                              {tx.direction === 'incoming' ? '+' : '-'}{formatTooltipCurrency(tx.value, isExpanded)}
                            </div>
                            <div className="text-helper text-muted-foreground">
                              {tx.direction === 'incoming' ? '↓ In' : '↑ Out'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {nestedPopup.data.length === 0 && (
                      <div className="px-3 py-4 text-center text-body text-muted-foreground">No transactions</div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}
            </TooltipProvider>
          )
        })()}

        {/* SVG Container */}
        <svg ref={svgRef} className="w-full h-full"></svg>

        {/* Help Text */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-helper text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>Drag to pan • Scroll / pinch / +- to zoom • Click nodes for details</span>
        </div>
      </div>
    </div>
  )
} 