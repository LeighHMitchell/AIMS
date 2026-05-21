"use client"

import React, { useMemo } from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import { getSectorColor } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import type { HierarchyRow } from './types'

interface SankeyViewProps {
  rows: HierarchyRow[]
  height: number
}

interface SankeyNode {
  id: string
  label: string
  code: string
  nodeColor: string
}

function TitleWithCode({ code, name }: { code: string; name: string }) {
  if (!code) return <>{name}</>
  return (
    <>
      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground mr-2 align-middle">
        {code}
      </code>
      <span className="align-middle">{name}</span>
    </>
  )
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export function SankeyView({ rows, height }: SankeyViewProps) {
  const isExpanded = useChartExpansion()

  const { nodes, links } = useMemo(() => {
    // Build three node columns: Group → Category → Sub-Sector.
    // Node ids are prefixed to avoid collisions when a group code happens to
    // match a category code, etc.
    const nodeMap = new Map<string, SankeyNode>()
    const linkMap = new Map<string, SankeyLink>()

    const groupOrder: string[] = []

    for (const r of rows) {
      if (r.value <= 0) continue

      const groupId = `g:${r.groupCode}`
      const catId = `c:${r.categoryCode}`
      const secId = `s:${r.sectorCode}`

      if (!nodeMap.has(groupId)) {
        groupOrder.push(r.groupCode)
        nodeMap.set(groupId, {
          id: groupId,
          label: truncate(r.groupName || r.groupCode, 36),
          code: r.groupCode,
          // Stable per-group color; categories/sectors inherit a lighter shade
          // via Nivo's nodeColor + linkColor settings.
          nodeColor: getSectorColor(groupOrder.indexOf(r.groupCode)),
        })
      }
      const groupColor = nodeMap.get(groupId)!.nodeColor

      if (!nodeMap.has(catId)) {
        nodeMap.set(catId, {
          id: catId,
          label: truncate(r.categoryName || r.categoryCode, 36),
          code: r.categoryCode,
          nodeColor: groupColor,
        })
      }
      if (!nodeMap.has(secId)) {
        nodeMap.set(secId, {
          id: secId,
          label: truncate(r.sectorName || r.sectorCode, 40),
          code: r.sectorCode,
          nodeColor: groupColor,
        })
      }

      const gcKey = `${groupId}->${catId}`
      const csKey = `${catId}->${secId}`
      const gcLink = linkMap.get(gcKey)
      if (gcLink) gcLink.value += r.value
      else linkMap.set(gcKey, { source: groupId, target: catId, value: r.value })
      const csLink = linkMap.get(csKey)
      if (csLink) csLink.value += r.value
      else linkMap.set(csKey, { source: catId, target: secId, value: r.value })
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()).filter(l => l.value > 0),
    }
  }, [rows])

  if (nodes.length === 0 || links.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    )
  }

  return (
    <div
      // [&_svg]:max-w-none unsets the global svg max-width:100% in globals.css.
      className="w-full [&_svg]:max-w-none"
      style={{ height, width: '100%' }}
    >
      <ResponsiveSankey
        data={{ nodes: nodes as any, links: links as any }}
        margin={{ top: 12, right: 220, bottom: 12, left: 220 }}
        align="justify"
        // Nivo Sankey defaults to `id` for node labels; we redirect to the
        // human `label`, prefixed with the DAC code so each node reads e.g.
        // "11220  Primary education" — matches the code-then-name format used
        // in the tooltip and the bar chart Y-axis.
        label={(node: any) =>
          node.code ? `${node.code}  ${node.label}` : (node.label ?? node.id)
        }
        colors={(node: any) => node.nodeColor || '#94a3b8'}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={14}
        nodeSpacing={10}
        nodeBorderWidth={0}
        nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
        linkOpacity={0.45}
        linkHoverOthersOpacity={0.1}
        linkContract={2}
        enableLinkGradient
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={8}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        animate={false}
        nodeTooltip={({ node }: any) => (
          <ChartTooltipCard
            title={<TitleWithCode code={node.code ?? ''} name={node.label} />}
            rows={[
              {
                label: 'Disbursements',
                value: formatTooltipCurrency(node.value, isExpanded),
                color: node.color,
              },
            ]}
          />
        )}
        linkTooltip={({ link }: any) => (
          <ChartTooltipCard
            title={
              <span className="inline-flex items-center gap-1">
                <TitleWithCode code={link.source.code ?? ''} name={link.source.label} />
                <span className="mx-1 text-muted-foreground">→</span>
                <TitleWithCode code={link.target.code ?? ''} name={link.target.label} />
              </span>
            }
            rows={[
              {
                label: 'Disbursements',
                value: formatTooltipCurrency(link.value, isExpanded),
                color: link.source.color,
              },
            ]}
          />
        )}
      />
    </div>
  )
}
