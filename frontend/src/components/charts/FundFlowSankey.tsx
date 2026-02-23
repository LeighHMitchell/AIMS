'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import * as d3Sankey from 'd3-sankey'

export interface FundFlowSankeyDonor {
  name: string
  acronym: string | null
  total: number
}

export interface FundFlowSankeySector {
  name: string
  total: number
}

export interface FundFlowSankeyChildFlow {
  id: string
  name: string
  total: number
}

interface FundFlowSankeyProps {
  fundTitle: string
  topDonors: FundFlowSankeyDonor[]
  /** Flows from fund to child activities (disbursements). Replaces sectors. */
  topChildFlows: FundFlowSankeyChildFlow[]
  /** If not set, the chart fills its container width (use with className="w-full") */
  width?: number
  height?: number
  className?: string
}

const COLORS = ['#3C6255', '#5f7f7a', '#8BA89E', '#B5CFC6', '#D4E8E0', '#2D4A44']

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function FundFlowSankey({
  fundTitle,
  topDonors,
  topChildFlows,
  width: widthProp,
  height = 120,
  className = '',
}: FundFlowSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(280)

  useEffect(() => {
    const el = containerRef.current
    if (!el || widthProp !== undefined) return
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setContainerWidth(w)
    })
    ro.observe(el)
    const w = el.getBoundingClientRect().width
    if (w > 0) setContainerWidth(w)
    return () => ro.disconnect()
  }, [widthProp])

  const width = widthProp ?? containerWidth

  const layout = useMemo(() => {
    const hasDonors = topDonors.length > 0
    const hasChildren = topChildFlows.length > 0
    if (!hasDonors && !hasChildren) return null

    const nodes: { id: string; name: string }[] = []
    const links: { source: number; target: number; value: number }[] = []

    let nodeIndex = 0
    const donorIndices: number[] = []
    topDonors.forEach((d, i) => {
      nodes.push({ id: `donor-${i}`, name: d.acronym || d.name || 'Donor' })
      donorIndices.push(nodeIndex++)
    })

    const fundIndex = nodeIndex++
    nodes.push({ id: 'fund', name: fundTitle.length > 20 ? fundTitle.slice(0, 17) + '…' : fundTitle })

    const childIndices: number[] = []
    topChildFlows.forEach((c, i) => {
      nodes.push({ id: `child-${c.id}`, name: c.name })
      childIndices.push(nodeIndex++)
    })

    topDonors.forEach((d, i) => {
      links.push({ source: donorIndices[i], target: fundIndex, value: Math.max(d.total, 1) })
    })
    topChildFlows.forEach((c, i) => {
      links.push({ source: fundIndex, target: childIndices[i], value: Math.max(c.total, 1) })
    })

    if (links.length === 0) return null

    const margin = { top: 4, right: 4, bottom: 4, left: 4 }
    try {
      const sankey = d3Sankey.sankey<any, any>()
        .nodeWidth(8)
        .nodePadding(6)
        .nodeId((d: any, i: number) => i)
        .nodeAlign(d3Sankey.sankeyLeft)
        .extent([
          [margin.left, margin.top],
          [width - margin.right, height - margin.bottom],
        ])

      const graph = sankey({
        nodes: nodes.map((n) => ({ ...n })),
        links: links.map((l) => ({ ...l })),
      })

      return { ...graph, nodes: graph.nodes, links: graph.links }
    } catch {
      return null
    }
  }, [fundTitle, topDonors, topChildFlows, width, height])

  useEffect(() => {
    if (!svgRef.current || !layout) return

    const svg = svgRef.current
    svg.innerHTML = ''

    const linkPath = d3Sankey.sankeyLinkHorizontal()

    layout.links.forEach((link: any, i: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', linkPath(link) || '')
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', COLORS[i % COLORS.length])
      path.setAttribute('stroke-opacity', '0.4')
      path.setAttribute('stroke-width', Math.max(1, link.width || 1))
      svg.appendChild(path)
    })

    layout.nodes.forEach((node: any, i: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', node.x0)
      rect.setAttribute('y', node.y0)
      rect.setAttribute('width', Math.max(1, node.x1 - node.x0))
      rect.setAttribute('height', Math.max(1, node.y1 - node.y0))
      rect.setAttribute('fill', i < topDonors.length ? COLORS[i % COLORS.length] : '#3C6255')
      rect.setAttribute('rx', 2)
      svg.appendChild(rect)

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      const midX = (node.x0 + node.x1) / 2
      const isLeft = midX < width / 2
      label.setAttribute('x', isLeft ? node.x1 + 4 : node.x0 - 4)
      label.setAttribute('y', (node.y0 + node.y1) / 2)
      label.setAttribute('dy', '0.35em')
      label.setAttribute('text-anchor', isLeft ? 'start' : 'end')
      label.setAttribute('font-size', '9')
      label.setAttribute('fill', 'currentColor')
      label.setAttribute('class', 'fill-foreground')
      label.textContent = node.name
      svg.appendChild(label)
    })
  }, [layout, width, topDonors.length])

  if (!layout) {
    return (
      <div ref={containerRef} className={className} style={{ width: '100%' }}>
        <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ width, height }}>
          No flow data
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className} style={{ width: '100%' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
      />
    </div>
  )
}
