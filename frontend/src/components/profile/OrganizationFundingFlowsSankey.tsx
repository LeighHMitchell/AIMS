"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import * as d3Sankey from "d3-sankey"
import { TRANSACTION_TYPE_LABELS } from "@/types/transaction"

const INCOMING_TYPES = ["1", "11", "13"] as const
const OUTGOING_TYPES = ["2", "3", "4", "12"] as const

// One colour per IATI transaction type. Incoming codes lean green / sky,
// outgoing codes lean scarlet / amber — so a quick glance tells the user
// whether a flow is money in or money out without reading the legend.
export const FUNDING_FLOW_TYPE_COLOR: Record<string, string> = {
  "1": "#16a34a",
  "11": "#65a30d",
  "13": "#0ea5e9",
  "2": "#7b95a7",
  "3": "#dc2625",
  "4": "#f59e0b",
  "12": "#8b5cf6",
}

export const FUNDING_FLOW_ALL_TYPES: string[] = [
  ...INCOMING_TYPES,
  ...OUTGOING_TYPES,
]

export function isIncomingType(t: string): boolean {
  return (INCOMING_TYPES as readonly string[]).includes(t)
}

export function isOutgoingType(t: string): boolean {
  return (OUTGOING_TYPES as readonly string[]).includes(t)
}

function safeUsd(t: any): number {
  if (t == null) return 0
  if (t.value_usd != null && Number.isFinite(Number(t.value_usd))) return Number(t.value_usd)
  if (((t.currency ?? "") + "").toUpperCase() === "USD") {
    const v = Number(t.value)
    if (Number.isFinite(v)) return v
  }
  return 0
}

function compactUsd(v: number): string {
  const a = Math.abs(v)
  if (a >= 1_000_000_000) return `$${(v / 1e9).toFixed(1)}B`
  if (a >= 1_000_000) return `$${(v / 1e6).toFixed(1)}M`
  if (a >= 1_000) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

interface Props {
  organizationId: string
  organizationName: string
  /** Acronym for the centre (self) node so it reads "Full Name (ACRONYM)" like the counterparties. */
  organizationAcronym?: string
  transactions: any[] | null
  selectedTypes: string[]
  /** Larger labels + more nodes per side when the chart is expanded. */
  expanded?: boolean
}

export function OrganizationFundingFlowsSankey({
  organizationId,
  organizationName,
  organizationAcronym,
  transactions,
  selectedTypes,
  expanded = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 600, h: 300 })
  const [hovered, setHovered] = useState<{ kind: "link" | "node"; idx: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: Math.round(rect.width), h: Math.round(rect.height) })
      }
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) })
    }
    return () => ro.disconnect()
  }, [])

  const aggregated = useMemo(() => {
    if (!transactions) return null
    // Aggregate by (counterparty, transaction_type) so the chart shows one
    // band per partner+type pair. Same partner with two types becomes two
    // separate bands; colouring works per-band.
    const incoming = new Map<string, { name: string; acronym: string; total: number; type: string }>()
    const outgoing = new Map<string, { name: string; acronym: string; total: number; type: string }>()

    transactions.forEach((t: any) => {
      const type = String(t.transaction_type ?? "")
      if (!selectedTypes.includes(type)) return

      const val = safeUsd(t)
      if (val <= 0) return

      const incomingFlow = isIncomingType(type)
        && (t.receiver_org_id === organizationId || t.receiver_org_name === organizationName)
      const outgoingFlow = isOutgoingType(type)
        && (t.provider_org_id === organizationId || t.provider_org_name === organizationName)

      if (incomingFlow) {
        const id = t.provider_org_id || t.provider_org_name || "unknown-source"
        // Prefer the joined organisation's full name; the transaction's own
        // provider_org_name free-text field often just holds the acronym.
        const name = t.provider_organization?.name || t.provider_org_name || t.provider_org_acronym || "Unknown source"
        const rawAcronym = t.provider_organization?.acronym || t.provider_org_acronym || ""
        const acronym = rawAcronym && rawAcronym !== name ? rawAcronym : ""
        const key = `${id}::${type}`
        const prev = incoming.get(key)
        incoming.set(key, prev
          ? { ...prev, total: prev.total + val }
          : { name, acronym, total: val, type })
      } else if (outgoingFlow) {
        const id = t.receiver_org_id || t.receiver_org_name || "unknown-recipient"
        const name = t.receiver_organization?.name || t.receiver_org_name || t.receiver_org_acronym || "Unknown recipient"
        const rawAcronym = t.receiver_organization?.acronym || t.receiver_org_acronym || ""
        const acronym = rawAcronym && rawAcronym !== name ? rawAcronym : ""
        const key = `${id}::${type}`
        const prev = outgoing.get(key)
        outgoing.set(key, prev
          ? { ...prev, total: prev.total + val }
          : { name, acronym, total: val, type })
      }
    })

    return {
      incoming: Array.from(incoming.values()).sort((a, b) => b.total - a.total),
      outgoing: Array.from(outgoing.values()).sort((a, b) => b.total - a.total),
    }
  }, [transactions, selectedTypes, organizationId, organizationName])

  const layout = useMemo(() => {
    if (!aggregated || size.w < 120 || size.h < 80) return null
    if (aggregated.incoming.length === 0 && aggregated.outgoing.length === 0) return null

    const maxPerSide = expanded ? 18 : 6
    const inBands = aggregated.incoming.slice(0, maxPerSide)
    const outBands = aggregated.outgoing.slice(0, maxPerSide)

    type N = { id: string; name: string; acronym: string; kind: "incoming" | "self" | "outgoing"; type?: string }
    type L = { source: number; target: number; value: number; type: string }
    const nodes: N[] = []
    const links: L[] = []

    let idx = 0
    const inIdx: number[] = []
    inBands.forEach((b, i) => {
      nodes.push({ id: `in-${i}`, name: b.name, acronym: b.acronym, kind: "incoming", type: b.type })
      inIdx.push(idx++)
    })
    const selfIdx = idx++
    const selfAcronym = organizationAcronym && organizationAcronym !== organizationName ? organizationAcronym : ""
    nodes.push({ id: "self", name: organizationName, acronym: selfAcronym, kind: "self" })
    const outIdx: number[] = []
    outBands.forEach((b, i) => {
      nodes.push({ id: `out-${i}`, name: b.name, acronym: b.acronym, kind: "outgoing", type: b.type })
      outIdx.push(idx++)
    })

    inBands.forEach((b, i) => {
      links.push({ source: inIdx[i], target: selfIdx, value: Math.max(b.total, 1), type: b.type })
    })
    outBands.forEach((b, i) => {
      links.push({ source: selfIdx, target: outIdx[i], value: Math.max(b.total, 1), type: b.type })
    })

    if (links.length === 0) return null

    // Reserve label gutters: bigger when expanded so long names don't clip.
    const labelW = expanded ? 160 : 110
    const margin = { top: 8, right: labelW, bottom: 8, left: labelW }

    try {
      // Pre-number each node by its array index so links can reference them
      // by `_idx`. d3-sankey's nodeId callback receives one argument (the
      // node) — older code passed (d, i) but newer @types/d3-sankey types
      // narrow it to a single-arg signature.
      const indexedNodes = nodes.map((n, i) => ({ ...n, _idx: i }))
      const sankey = d3Sankey
        .sankey<any, any>()
        .nodeWidth(expanded ? 12 : 8)
        .nodePadding(expanded ? 14 : 8)
        .nodeId((d: any) => d._idx)
        .nodeAlign(d3Sankey.sankeyJustify)
        .extent([
          [margin.left, margin.top],
          [Math.max(margin.left + 40, size.w - margin.right), Math.max(margin.top + 40, size.h - margin.bottom)],
        ])

      const graph = sankey({
        nodes: indexedNodes.map((n) => ({ ...n })),
        links: links.map((l) => ({ ...l })),
      })
      return graph as any
    } catch {
      return null
    }
  }, [aggregated, size, expanded, organizationName, organizationAcronym])

  useEffect(() => {
    if (!svgRef.current || !layout) return
    const svg = svgRef.current
    // Clear previous frame's children — safe DOM API, no parsing.
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    const linkPath = d3Sankey.sankeyLinkHorizontal()

    layout.links.forEach((link: any, i: number) => {
      const color = FUNDING_FLOW_TYPE_COLOR[link.type as string] || "#94a3b8"
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
      path.setAttribute("d", linkPath(link) || "")
      path.setAttribute("fill", "none")
      path.setAttribute("stroke", color)
      path.setAttribute("stroke-opacity", "0.35")
      const w = Math.max(1, link.width || 1)
      path.setAttribute("stroke-width", String(w))
      path.style.cursor = "pointer"

      path.addEventListener("mouseenter", (e: MouseEvent) => {
        path.setAttribute("stroke-opacity", "0.7")
        setHovered({ kind: "link", idx: i, x: e.clientX, y: e.clientY })
      })
      path.addEventListener("mousemove", (e: MouseEvent) => {
        setHovered({ kind: "link", idx: i, x: e.clientX, y: e.clientY })
      })
      path.addEventListener("mouseleave", () => {
        path.setAttribute("stroke-opacity", "0.35")
        setHovered(null)
      })

      svg.appendChild(path)
    })

    layout.nodes.forEach((node: any) => {
      const isSelf = node.kind === "self"
      const isLeft = node.kind === "incoming"
      const fill = isSelf ? "#0f172a" : (isLeft ? "#16a34a" : "#dc2625")

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      rect.setAttribute("x", String(node.x0))
      rect.setAttribute("y", String(node.y0))
      rect.setAttribute("width", String(Math.max(1, node.x1 - node.x0)))
      rect.setAttribute("height", String(Math.max(1, node.y1 - node.y0)))
      rect.setAttribute("fill", fill)
      rect.setAttribute("rx", "2")
      svg.appendChild(rect)

      const nodeHeight = Math.max(1, node.y1 - node.y0)
      const labelW = expanded ? 150 : 100
      const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")
      const div = document.createElement("div")
      div.style.fontSize = expanded ? "11px" : "10px"
      div.style.lineHeight = "1.25"
      div.style.color = "currentColor"
      div.style.overflow = "hidden"
      div.style.display = "-webkit-box"
      div.style.setProperty("-webkit-line-clamp", "3")
      div.style.setProperty("-webkit-box-orient", "vertical")
      div.className = "text-foreground"
      // Show the full organisation name plus its acronym in the node label.
      div.textContent = node.acronym ? `${node.name} (${node.acronym})` : node.name

      if (isSelf) {
        div.style.fontWeight = "600"
        fo.setAttribute("width", String(labelW))
        fo.setAttribute("height", String(Math.max(nodeHeight, 48)))
        fo.setAttribute("x", String(node.x1 + 6))
        fo.setAttribute("y", String((node.y0 + node.y1) / 2 - 24))
      } else if (isLeft) {
        // Label sits to the LEFT of the incoming node so the band's right
        // edge meets the next column without overlapping any text.
        fo.setAttribute("width", String(labelW))
        fo.setAttribute("height", String(Math.max(nodeHeight + 18, 46)))
        fo.setAttribute("x", String(Math.max(0, node.x0 - labelW - 6)))
        fo.setAttribute("y", String(node.y0 - 6))
        div.style.textAlign = "right"
      } else {
        fo.setAttribute("width", String(labelW))
        fo.setAttribute("height", String(Math.max(nodeHeight + 18, 46)))
        fo.setAttribute("x", String(node.x1 + 6))
        fo.setAttribute("y", String(node.y0 - 6))
        div.style.textAlign = "left"
      }

      fo.appendChild(div)
      svg.appendChild(fo)
    })
  }, [layout, expanded])

  if (!transactions) {
    return <div ref={containerRef} className="h-full w-full bg-muted/40 rounded animate-pulse" />
  }

  if (!aggregated || !layout) {
    return (
      <div
        ref={containerRef}
        className="h-full w-full flex items-center justify-center text-helper text-muted-foreground"
      >
        No transaction flows for the selected types
      </div>
    )
  }

  const formatNodeLabel = (n: any): string => {
    if (!n) return ""
    return n.acronym ? `${n.name} (${n.acronym})` : n.name
  }
  const tooltipLink = hovered && hovered.kind === "link" ? layout.links[hovered.idx] : null
  const tooltipSource = tooltipLink ? formatNodeLabel(typeof tooltipLink.source === "object" ? tooltipLink.source : layout.nodes[tooltipLink.source]) : ""
  const tooltipTarget = tooltipLink ? formatNodeLabel(typeof tooltipLink.target === "object" ? tooltipLink.target : layout.nodes[tooltipLink.target]) : ""

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        style={{ overflow: "visible", display: "block" }}
      />
      {tooltipLink && hovered && (
        <div
          className="pointer-events-none fixed z-[10005] max-w-[340px] rounded-lg border border-border bg-card text-card-foreground shadow-lg overflow-hidden"
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
          {/* Shaded header — matches the analytics-dashboard tooltips. */}
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground text-helper leading-snug">
              {tooltipSource} → {tooltipTarget}
            </p>
          </div>
          <table className="text-helper">
            <tbody>
              <tr className="border-b border-border/60">
                <th className="text-left font-medium text-muted-foreground align-top px-3 py-1.5 whitespace-nowrap">Type</th>
                <td className="text-foreground px-3 py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: FUNDING_FLOW_TYPE_COLOR[tooltipLink.type as string] || "#94a3b8" }}
                    />
                    {TRANSACTION_TYPE_LABELS[tooltipLink.type as keyof typeof TRANSACTION_TYPE_LABELS] || "Transaction"}
                  </span>
                </td>
              </tr>
              <tr>
                <th className="text-left font-medium text-muted-foreground align-top px-3 py-1.5 whitespace-nowrap">Amount (USD)</th>
                <td className="text-foreground font-medium tabular-nums px-3 py-1.5 whitespace-nowrap">
                  ${Math.round(tooltipLink.value).toLocaleString("en-US")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
