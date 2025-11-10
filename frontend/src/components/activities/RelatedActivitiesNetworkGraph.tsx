"use client"

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Node {
  id: string
  type: 'activity' | 'current'
  name: string
  acronym?: string
  iatiIdentifier?: string
  organizationName?: string
  organizationAcronym?: string
  relationshipType?: string
  source?: string
  status?: string
  group: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface Link {
  source: string | Node
  target: string | Node
  relationshipType: string
  direction: 'incoming' | 'outgoing'
}

interface NetworkGraphData {
  nodes: Node[]
  links: Link[]
}

interface RelatedActivitiesNetworkGraphProps {
  data: NetworkGraphData | null
  loading?: boolean
  currentActivityName: string
}

export default function RelatedActivitiesNetworkGraph({
  data,
  loading,
  currentActivityName
}: RelatedActivitiesNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null)

  useEffect(() => {
    if (!data || !svgRef.current || loading) {
      return
    }

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove()

    if (!data.nodes || data.nodes.length === 0) {
      return
    }

    // Ensure links array exists
    if (!data.links) {
      data.links = []
    }

    const width = 928
    const height = 600

    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;')

    // Specify the color scale - using d3.schemeCategory10 like PartnerNetworkGraph
    const color = d3.scaleOrdinal(d3.schemeCategory10)

    // The force simulation mutates links and nodes, so create a copy
    // Filter out any invalid links/nodes
    const links = (data.links || []).map(d => ({
      source: d.source || '',
      target: d.target || '',
      relationshipType: d.relationshipType || 'Related',
      direction: d.direction || 'outgoing',
      ...d
    })).filter(d => d.source && d.target)

    const nodes = (data.nodes || []).map(d => ({
      id: d.id || '',
      type: d.type || 'activity',
      name: d.name || 'Unknown',
      acronym: d.acronym,
      iatiIdentifier: d.iatiIdentifier,
      organizationName: d.organizationName,
      organizationAcronym: d.organizationAcronym,
      relationshipType: d.relationshipType,
      source: d.source,
      status: d.status,
      group: d.group ?? 0,
      ...d
    })).filter(d => d.id)

    // Create a map of link types before D3 mutates the links
    const linkTypeMap = new Map<string, { type: string, direction: string }>()
    links.forEach(l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as any)?.id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as any)?.id
      if (sourceId && targetId) {
        linkTypeMap.set(`${sourceId}-${targetId}`, {
          type: l.relationshipType || 'Related',
          direction: l.direction || 'outgoing'
        })
      }
    })

    // Create a simulation with several forces - same as PartnerNetworkGraph
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    simulationRef.current = simulation

    // Add a line for each link - same styling as PartnerNetworkGraph
    const link = svg.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d: any) => {
        const sourceId = typeof d.source === 'string' ? d.source : (d.source as any)?.id
        const targetId = typeof d.target === 'string' ? d.target : (d.target as any)?.id
        const linkData = (sourceId && targetId) ? (linkTypeMap.get(`${sourceId}-${targetId}`)) : null

        // Vary stroke width based on relationship type
        const relType = linkData?.type || 'Related'
        if (relType.toLowerCase().includes('parent') || relType.toLowerCase().includes('child')) return 3
        if (relType.toLowerCase().includes('sibling') || relType.toLowerCase().includes('co-funded')) return 2
        return 1
      })

    // Add a circle for each node - same as PartnerNetworkGraph
    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => (d?.type === 'current' ? 10 : 5))
      .attr('fill', d => color(String(d?.group ?? 0)))

    // Add labels for nodes with detailed information using foreignObject
    const labels = svg.append('g')
      .attr('class', 'labels')
      .selectAll('foreignObject')
      .data(nodes)
      .join('foreignObject')
      .attr('width', 220)
      .attr('height', 120)
      .attr('x', 12)
      .attr('y', -10)
      .style('pointer-events', 'none')
      .style('overflow', 'visible')
      .html(d => {
        const titleText = d?.acronym ? `${d.name} (${d.acronym})` : (d?.name || 'Unknown')
        const iatiId = d?.iatiIdentifier || ''
        const orgText = d?.organizationAcronym
          ? `${d.organizationName || ''} (${d.organizationAcronym})`
          : (d?.organizationName || '')
        const relType = d?.relationshipType || ''

        return `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 10px; line-height: 1.4; color: #333;">
            ${relType ? `
              <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${relType}
              </div>
            ` : ''}
            <div style="font-weight: 600; margin-bottom: 3px; max-width: 200px; word-wrap: break-word;">
              ${titleText}
            </div>
            ${iatiId ? `
              <div style="background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 9px; margin-bottom: 3px; display: inline-block; color: #1e293b;">
                ${iatiId}
              </div>
            ` : ''}
            ${orgText ? `
              <div style="font-size: 9px; color: #64748b; font-style: italic;">
                ${orgText}
              </div>
            ` : ''}
          </div>
        `
      })

    // Add tooltips with detailed information
    node.append('title')
      .text(d => {
        const statusLabel = getStatusLabel(d?.status)
        const typeLabel = d?.type === 'current' ? 'Current Activity' : 'Related Activity'
        const parts = [
          `${typeLabel}: ${d?.name || 'Unknown'}${d?.acronym ? ` (${d.acronym})` : ''}`,
          d?.iatiIdentifier ? `IATI ID: ${d.iatiIdentifier}` : '',
          d?.organizationAcronym || d?.organizationName ? `Organization: ${d.organizationAcronym || d.organizationName}` : '',
          d?.relationshipType ? `Relationship: ${d.relationshipType}` : '',
          d?.source ? `Source: ${d.source}` : '',
          `Status: ${statusLabel}`
        ]
        return parts.filter(p => p).join('\n')
      })

    // Add legend in top-left corner - horizontal layout
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', 'translate(20, 20)')

    // Legend items - horizontal layout
    const legendItems = [
      { color: '#1f77b4', label: 'Current Activity', x: 0 },
      { color: '#ff7f0e', label: 'Related (Group 1)', x: 130 },
      { color: '#2ca02c', label: 'Related (Group 2)', x: 280 },
      { color: '#d62728', label: 'Related (Group 3)', x: 430 },
      { color: '#9467bd', label: 'Related (Group 4+)', x: 580 }
    ]

    legendItems.forEach(item => {
      // Color circle
      legend.append('circle')
        .attr('cx', item.x + 5)
        .attr('cy', 5)
        .attr('r', 5)
        .attr('fill', item.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)

      // Label text
      legend.append('text')
        .attr('x', item.x + 18)
        .attr('y', 9)
        .attr('font-size', '10px')
        .attr('fill', '#475569')
        .text(item.label)
    })

    // Relationship link indicator
    legend.append('line')
      .attr('x1', 730)
      .attr('y1', 5)
      .attr('x2', 744)
      .attr('y2', 5)
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)

    legend.append('text')
      .attr('x', 748)
      .attr('y', 9)
      .attr('font-size', '10px')
      .attr('fill', '#475569')
      .text('Relationship Link')

    // Add drag behavior - same as PartnerNetworkGraph
    const drag = d3.drag<SVGCircleElement, Node>()
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
        .attr('x', d => (d.x ?? 0) + 12)
        .attr('y', d => (d.y ?? 0) - 10)
    }

    simulation.on('tick', ticked)

    // Reheat the simulation when drag starts, and fix the subject position
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      if (!event.active && simulation) {
        simulation.alphaTarget(0.3).restart()
      }
      const subject = event.subject as Node
      subject.fx = subject.x
      subject.fy = subject.y
    }

    // Update the subject (dragged node) position during drag
    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      const subject = event.subject as Node
      subject.fx = event.x
      subject.fy = event.y
    }

    // Restore the target alpha so the simulation cools after dragging ends
    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      if (!event.active && simulation) {
        simulation.alphaTarget(0)
      }
      const subject = event.subject as Node
      subject.fx = null
      subject.fy = null
    }

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [data, loading, currentActivityName])

  function getStatusLabel(status?: string) {
    if (!status) return 'Unknown'

    const statusMap: { [key: string]: string } = {
      '1': 'Pipeline',
      '2': 'Active',
      '3': 'Completed',
      '4': 'Suspended',
      '5': 'Cancelled',
      '6': 'Post-Completion'
    }

    return statusMap[status] || 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-slate-500">Loading network graph...</div>
      </div>
    )
  }

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-slate-400">
        <div className="text-center">
          <p className="font-medium">No network data available</p>
          <p className="text-xs mt-2">Add related activities to see the network graph</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
