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

// Sankey: different shades of red (Primary Scarlet and variants)
const COLORS = ['#dc2625', '#b91c1c', '#991b1b', '#ef4444', '#f87171', '#fca5a5']

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export type LinkTooltipInfo =
  | { type: 'donor-to-fund'; sourceName: string; targetName: string; value: number }
  | { type: 'fund-to-child'; sourceName: string; targetName: string; value: number }

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
  const [hoveredLink, setHoveredLink] = useState<{ index: number; x: number; y: number } | null>(null)

  const linkTooltips = useMemo((): LinkTooltipInfo[] => {
    const list: LinkTooltipInfo[] = []
    topDonors.forEach((d) => {
      list.push({
        type: 'donor-to-fund',
        sourceName: d.acronym || d.name || 'Donor',
        targetName: fundTitle,
        value: d.total,
      })
    })
    topChildFlows.forEach((c) => {
      list.push({
        type: 'fund-to-child',
        sourceName: fundTitle,
        targetName: c.name,
        value: c.total,
      })
    })
    return list
  }, [fundTitle, topDonors, topChildFlows])

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

    // Only add third tier (child activities) when there are flows with dollar values
    const childIndices: number[] = []
    if (hasChildren) {
      topChildFlows.forEach((c) => {
        nodes.push({ id: `child-${c.id}`, name: c.name })
        childIndices.push(nodeIndex++)
      })
    }

    topDonors.forEach((d, i) => {
      links.push({ source: donorIndices[i], target: fundIndex, value: Math.max(d.total, 1) })
    })
    if (hasChildren) {
      topChildFlows.forEach((c, i) => {
        links.push({ source: fundIndex, target: childIndices[i], value: Math.max(c.total, 1) })
      })
    }

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
      const strokeW = Math.max(1, link.width || 1)
      path.setAttribute('stroke-width', String(strokeW))
      path.style.cursor = 'pointer'
      path.setAttribute('data-link-index', String(i))
      path.addEventListener('mouseenter', (e: MouseEvent) => {
        setHoveredLink({ index: i, x: e.clientX, y: e.clientY })
      })
      path.addEventListener('mouseleave', () => setHoveredLink(null))
      svg.appendChild(path)

      // Invisible wider path for easier hover
      const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      hitPath.setAttribute('d', linkPath(link) || '')
      hitPath.setAttribute('fill', 'none')
      hitPath.setAttribute('stroke', 'transparent')
      hitPath.setAttribute('stroke-width', String(Math.max(strokeW + 8, 12)))
      hitPath.style.cursor = 'pointer'
      hitPath.addEventListener('mouseenter', (e: MouseEvent) => {
        setHoveredLink({ index: i, x: e.clientX, y: e.clientY })
      })
      hitPath.addEventListener('mouseleave', () => setHoveredLink(null))
      svg.appendChild(hitPath)
    })

    layout.nodes.forEach((node: any, i: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', node.x0)
      rect.setAttribute('y', node.y0)
      rect.setAttribute('width', Math.max(1, node.x1 - node.x0))
      rect.setAttribute('height', Math.max(1, node.y1 - node.y0))
      rect.setAttribute('fill', COLORS[i % COLORS.length])
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

  const tooltipInfo = hoveredLink !== null ? linkTooltips[hoveredLink.index] : null

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ width: '100%' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
      />
      {hoveredLink !== null && tooltipInfo && (
        <div
          className="pointer-events-none fixed z-50 max-w-[240px] rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
          style={{
            left: hoveredLink.x + 10,
            top: hoveredLink.y + 10,
          }}
        >
          <p className="text-xs font-medium text-foreground">
            {tooltipInfo.sourceName} → {tooltipInfo.targetName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tooltipInfo.type === 'donor-to-fund' ? 'Contribution' : 'Disbursement'}: {formatUSD(tooltipInfo.value)}
          </p>
        </div>
      )}
    </div>
  )
}
