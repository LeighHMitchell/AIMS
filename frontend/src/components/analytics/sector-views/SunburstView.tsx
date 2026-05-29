"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { ResponsiveSunburst } from '@nivo/sunburst'
import { getSectorColor } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatCurrencyCompact } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import type { HierarchyRow } from './types'

interface SunburstViewProps {
  rows: HierarchyRow[]
  height: number
  // Label for the metric the arcs represent (e.g. "Disbursements"). Drives the
  // tooltip value row and the center total's sub-label.
  valueLabel?: string
}

// Total value and count of funded leaf sectors (sub-sectors with value > 0)
// beneath a node — used for the center summary, which reflects the current
// drill-down focus.
function sumLeaves(node: SunburstNode): { total: number; count: number } {
  if (!node.children || node.children.length === 0) {
    const v = node.value ?? 0
    return { total: v, count: v > 0 ? 1 : 0 }
  }
  return node.children.reduce(
    (acc, c) => {
      const r = sumLeaves(c)
      return { total: acc.total + r.total, count: acc.count + r.count }
    },
    { total: 0, count: 0 },
  )
}

// Sub-label under the center total, e.g. "total disbursements". When the metric
// label already starts with "Total" (the multi-metric case) it's used as-is.
function metricTotalPhrase(valueLabel?: string): string {
  if (!valueLabel || valueLabel === 'Value') return 'total'
  return /^total/i.test(valueLabel) ? valueLabel.toLowerCase() : `total ${valueLabel.toLowerCase()}`
}

interface SunburstNode {
  id: string
  name: string
  code: string
  color?: string
  value?: number
  children?: SunburstNode[]
}

// Depth-first lookup of a node by id, used to re-root the sunburst when the
// user drills into a group or category.
function findNode(node: SunburstNode, id: string): SunburstNode | null {
  if (node.id === id) return node
  for (const c of node.children ?? []) {
    const found = findNode(c, id)
    if (found) return found
  }
  return null
}

// Pick dark/white label text for best contrast against a slice colour. Handles
// #rgb, #rrggbb and rgb()/rgba() (Nivo emits brightened children as rgb).
function contrastText(color?: string): string {
  let r = 100, g = 116, b = 139
  if (color?.startsWith('#')) {
    const h = color.slice(1)
    const hex = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  } else {
    const m = color?.match(/\d+(\.\d+)?/g)
    if (m && m.length >= 3) { r = +m[0]; g = +m[1]; b = +m[2] }
  }
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1e293b' : '#ffffff'
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

export function SunburstView({ rows, height, valueLabel = 'Disbursements' }: SunburstViewProps) {
  const isExpanded = useChartExpansion()
  // Drill-down stack of node ids — clicking a group/category arc zooms into it.
  const [zoomStack, setZoomStack] = useState<string[]>([])

  // Sunburst always shows the full Group → Category → Sub-Sector hierarchy
  // regardless of the level toggle on the container — the inner rings ARE
  // the level toggle, visually.
  const data = useMemo<SunburstNode>(() => {
    const groups = new Map<string, {
      name: string
      categories: Map<string, {
        name: string
        sectors: Map<string, { name: string; value: number }>
      }>
    }>()

    for (const r of rows) {
      if (r.value <= 0) continue
      let g = groups.get(r.groupCode)
      if (!g) {
        g = { name: r.groupName || r.groupCode, categories: new Map() }
        groups.set(r.groupCode, g)
      }
      let c = g.categories.get(r.categoryCode)
      if (!c) {
        c = { name: r.categoryName || r.categoryCode, sectors: new Map() }
        g.categories.set(r.categoryCode, c)
      }
      const s = c.sectors.get(r.sectorCode)
      if (s) {
        s.value += r.value
      } else {
        c.sectors.set(r.sectorCode, { name: r.sectorName || r.sectorCode, value: r.value })
      }
    }

    // Totals per node, used to order arcs largest → smallest at every ring.
    const catTotal = (c: { sectors: Map<string, { value: number }> }) =>
      Array.from(c.sectors.values()).reduce((sum, s) => sum + s.value, 0)
    const groupTotal = (g: { categories: Map<string, { sectors: Map<string, { value: number }> }> }) =>
      Array.from(g.categories.values()).reduce((sum, c) => sum + catTotal(c), 0)

    // Order groups by value (largest first); colours follow that rank so they
    // match the pie/bar palette ordering.
    const groupOrder = Array.from(groups.keys()).sort(
      (a, b) => groupTotal(groups.get(b)!) - groupTotal(groups.get(a)!)
    )

    const tree: SunburstNode = {
      id: 'root',
      name: 'All Sectors',
      code: '',
      children: groupOrder.map((gCode, gi) => {
        const g = groups.get(gCode)!
        const groupColor = getSectorColor(gi)
        return {
          id: `group:${gCode}`,
          name: g.name,
          code: gCode,
          color: groupColor,
          children: Array.from(g.categories.entries())
            .sort(([, a], [, b]) => catTotal(b) - catTotal(a))
            .map(([cCode, c]) => ({
            id: `cat:${cCode}`,
            name: c.name,
            code: cCode,
            color: groupColor,
            children: Array.from(c.sectors.entries())
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([sCode, s]) => ({
              id: `sec:${sCode}`,
              name: s.name,
              code: sCode,
              color: groupColor,
              value: s.value,
            })),
          })),
        }
      }),
    }
    return tree
  }, [rows])

  // Reset the drill-down whenever the underlying data changes.
  useEffect(() => { setZoomStack([]) }, [data])

  const currentId = zoomStack[zoomStack.length - 1] ?? 'root'
  const displayData = useMemo(() => findNode(data, currentId) ?? data, [data, currentId])

  // Center summary reflects the current focus (root, or the drilled group/category).
  const { total: centerTotal, count: sectorCount } = useMemo(() => sumLeaves(displayData), [displayData])
  const metricPhrase = metricTotalPhrase(valueLabel)

  const isEmpty = !data.children || data.children.length === 0
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    )
  }

  return (
    <div
      // [&_svg]:max-w-none unsets the global svg max-width:100% in globals.css.
      className="relative w-full [&_svg]:max-w-none"
      style={{ height, width: '100%' }}
    >
      {zoomStack.length > 0 && (
        <button
          type="button"
          onClick={() => setZoomStack((s) => s.slice(0, -1))}
          className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted"
        >
          ← Back
        </button>
      )}
      <ResponsiveSunburst
      data={displayData as any}
      id="id"
      value="value"
      cornerRadius={1}
      borderWidth={1}
      borderColor="#ffffff"
      colors={(node: any) => (node.data?.color as string) || '#94a3b8'}
      childColor={{ from: 'color', modifiers: [['brighter', 0.25]] }}
      enableArcLabels
      arcLabel={(node: any) => (node.value > 0 ? `${Math.round((node.percentage ?? 0))}%` : '')}
      arcLabelsSkipAngle={12}
      arcLabelsTextColor={(node: any) => contrastText(node?.color ?? node?.data?.color)}
      tooltip={(node: any) => (
        <ChartTooltipCard
          title={
            <TitleWithCode
              code={node.data?.code ?? ''}
              name={node.data?.name ?? node.id}
            />
          }
          rows={[
            {
              label: valueLabel,
              value: formatTooltipCurrency(node.value, isExpanded),
              color: node.color,
            },
            {
              label: 'Share of total',
              value: `${(node.percentage ?? 0).toFixed(1)}%`,
            },
          ]}
        />
      )}
        animate={false}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        onClick={(node: any) => {
          const id = String(node?.id ?? '')
          // Drill into groups/categories (which have children); sub-sectors are
          // leaves, and re-clicking the current focus does nothing.
          if (id && !id.startsWith('sec:') && id !== currentId) {
            setZoomStack((s) => [...s, id])
          }
        }}
      />
      {/* Grand total over the center; reflects the current drill-down focus.
          A rounded chip keeps it readable over the innermost arcs (the sunburst
          has no real hole). pointer-events-none so arc hover/click pass through. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/90 px-3 py-1.5 text-center shadow-sm backdrop-blur-[1px]">
          <span className={`font-bold leading-none text-foreground ${isExpanded ? 'text-2xl' : 'text-sm'}`}>
            {formatCurrencyCompact(centerTotal)}
          </span>
          {isExpanded && (
            <>
              <span className="mt-0.5 text-xs leading-tight text-muted-foreground">
                {metricPhrase}
              </span>
              <span className="mt-1 text-xs leading-tight text-muted-foreground">
                {sectorCount} {sectorCount === 1 ? 'sector' : 'sectors'} funded
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
