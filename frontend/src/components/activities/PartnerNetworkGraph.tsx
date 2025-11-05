"use client"

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Node {
  id: string
  type: 'organization' | 'activity'
  name: string
  group: number
  activityId?: string
  organizationId?: string
}

interface Link {
  source: string | Node
  target: string | Node
  type: 'participates' | 'related' | 'collaborates'
}

interface NetworkGraphData {
  nodes: Node[]
  links: Link[]
}

interface PartnerNetworkGraphProps {
  data: NetworkGraphData | null
  loading?: boolean
}

export default function PartnerNetworkGraph({ data, loading }: PartnerNetworkGraphProps) {
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

    // Specify the color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10)

    // The force simulation mutates links and nodes, so create a copy
    // Filter out any invalid links/nodes
    const links = (data.links || []).map(d => ({
      source: d.source || '',
      target: d.target || '',
      type: d.type || 'collaborates',
      ...d
    })).filter(d => d.source && d.target)
    
    const nodes = (data.nodes || []).map(d => ({
      id: d.id || '',
      type: d.type || 'organization',
      name: d.name || 'Unknown',
      group: d.group ?? 0,
      ...d
    })).filter(d => d.id)

    // Create a map of link types before D3 mutates the links
    const linkTypeMap = new Map<string, string>()
    links.forEach(l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as any)?.id
      const targetId = typeof l.target === 'string' ? l.target : (l.target as any)?.id
      if (sourceId && targetId) {
        linkTypeMap.set(`${sourceId}-${targetId}`, l.type || 'collaborates')
      }
    })

    // Create a simulation with several forces
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    simulationRef.current = simulation

    // Add a line for each link
    const link = svg.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d: any) => {
        const sourceId = typeof d.source === 'string' ? d.source : (d.source as any)?.id
        const targetId = typeof d.target === 'string' ? d.target : (d.target as any)?.id
        const linkType = (sourceId && targetId) ? (linkTypeMap.get(`${sourceId}-${targetId}`) || 'collaborates') : 'collaborates'
        if (linkType === 'related') return 3
        if (linkType === 'participates') return 2
        return 1
      })

    // Add a circle for each node
    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => (d?.type === 'activity' ? 10 : 5))
      .attr('fill', d => color(String(d?.group ?? 0)))

    // Add labels for nodes
    const labels = svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d?.name || 'Unknown')
      .attr('font-size', '10px')
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('fill', '#333')
      .style('pointer-events', 'none')

    // Add tooltips
    node.append('title')
      .text(d => `${d?.type === 'activity' ? 'Activity' : 'Organization'}: ${d?.name || 'Unknown'}`)

    // Add drag behavior
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
        .attr('x', d => d.x ?? 0)
        .attr('y', d => d.y ?? 0)
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
  }, [data, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-slate-500">Loading network graph...</div>
      </div>
    )
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-slate-400">
        <div className="text-center">
          <p className="font-medium">No network data available</p>
          <p className="text-xs mt-2">Add participating organizations or related activities to see the network graph</p>
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

