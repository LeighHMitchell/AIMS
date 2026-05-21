"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useChartExpansion } from "@/lib/chart-expansion-context";
import { formatTooltipCurrency } from "@/lib/format";
import type {
  CoordinationView,
  CoordinationHierarchy,
  CoordinationMeasure,
  CoordinationTopDonor,
} from "@/types/coordination";

// Slate-only palette aligned with the rest of the analytics dashboard.
const COORDINATION_COLORS = [
  "#1e293b",
  "#334155",
  "#4c5568",
  "#475569",
  "#5d6b7a",
  "#7b95a7",
  "#94a3b8",
  "#cfd0d5",
];

interface CoordinationCirclePackProps {
  data: CoordinationHierarchy | null;
  /** New mode: which measure the bubble size represents. Used to format the
   *  value in tooltips and decide between currency and count display. */
  measure?: CoordinationMeasure;
  measureLabel?: string;
  /** Period the data covers, e.g. "2024" or "2020 – 2024". Optional — shown
   *  inline with the measure value in the tooltip when present. */
  periodLabel?: string;
  /** Legacy prop retained so the compact dashboard card keeps compiling. The
   *  new design has no second-level (donor) bubbles, so the value is now
   *  ignored at runtime — bubbles are always drawn at the sector level. */
  view?: CoordinationView;
  width?: number;
  height?: number;
  compact?: boolean;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  content: {
    code?: string;
    name: string;
    valueDisplay: string;
    valueSubLabel: string;
    activityCount: number;
    donorCount: number;
    topDonors: CoordinationTopDonor[];
  } | null;
}

interface HierarchyDatum {
  name: string;
  id?: string;
  code?: string;
  /** Value handed to d3.hierarchy().sum() for packing. May be inflated for
   *  small contributors so they remain visible inside a dominant funder. */
  value?: number;
  /** True value used in tooltips and labels — never floored. */
  actualValue?: number;
  activityCount?: number;
  donorCount?: number;
  topDonors?: CoordinationTopDonor[];
  children?: HierarchyDatum[];
}

const COUNT_MEASURES = new Set<CoordinationMeasure>(['activities', 'donors']);

function isCountMeasure(measure: CoordinationMeasure | undefined): boolean {
  return !!measure && COUNT_MEASURES.has(measure);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function CoordinationCirclePack({
  data,
  measure = 'tx_3',
  measureLabel = 'Disbursements',
  periodLabel,
  view: _view,
  width = 900,
  height = 700,
  compact = false,
}: CoordinationCirclePackProps) {
  const isExpanded = useChartExpansion();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, x: 0, y: 0, content: null });
  const [dimensions, setDimensions] = useState({ width, height });

  // ── Format ────────────────────────────────────────────────────────────────
  const formatValueDisplay = (raw: number): string => {
    if (isCountMeasure(measure)) return formatCount(raw);
    return formatTooltipCurrency(raw, isExpanded);
  };

  // ── Hierarchy ─────────────────────────────────────────────────────────────
  // d3.hierarchy ignores nodes with zero value. To keep small contributors
  // visible inside a dominant funder we apply a per-sector minimum: any
  // partner under MIN_SHARE of the parent's true value is inflated to that
  // floor for d3 packing — the floored amount is taken back from the largest
  // partner so the parent's pack area stays roughly proportional to its real
  // total. `actualValue` carries the unfloored amount for the tooltip.
  const MIN_SHARE = 0.06; // each visible partner gets ≥ 6% of the parent
  const hierarchyData = useMemo<HierarchyDatum | null>(() => {
    if (!data) return null;
    return {
      name: data.name,
      children: data.children.map((node) => {
        const parentValue = node.value || 0;
        const rawChildren: Array<{
          name: string;
          id: string;
          value: number;
          actualValue: number;
          activityCount?: number;
          donorCount?: number;
        }> = (node.children || []).map((c) => ({
          name: c.name,
          id: c.id,
          value: c.value || 0,
          actualValue: c.value || 0,
          activityCount: c.activityCount,
          donorCount: c.donorCount,
        }));
        const sumRaw = rawChildren.reduce((s, c) => s + c.value, 0);
        // Pad with an anonymous remainder so the outer circle reflects the
        // sector total even if funder attribution is partial (sumRaw may be
        // less than parentValue in role-mixed activities).
        if (sumRaw < parentValue) {
          rawChildren.push({
            name: '',
            id: `__remainder__${node.id}`,
            value: parentValue - sumRaw,
            actualValue: parentValue - sumRaw,
          });
        }
        // Apply the visibility floor only to real partner bubbles, then take
        // the inflation back from the largest bubble so the parent's area is
        // unchanged.
        const total = rawChildren.reduce((s, c) => s + c.value, 0);
        const floor = total * MIN_SHARE;
        let inflation = 0;
        rawChildren.forEach((c) => {
          if (c.id?.startsWith('__remainder__')) return;
          if (c.value > 0 && c.value < floor) {
            inflation += floor - c.value;
            c.value = floor;
          }
        });
        if (inflation > 0) {
          // Subtract the inflation from the largest non-floored partner. If
          // that would make it smaller than the floor, fall back to the
          // remainder slice.
          const largest = rawChildren
            .filter((c) => !c.id?.startsWith('__remainder__'))
            .sort((a, b) => b.value - a.value)[0];
          if (largest && largest.value - inflation >= floor) {
            largest.value -= inflation;
          } else {
            const remainder = rawChildren.find((c) => c.id?.startsWith('__remainder__'));
            if (remainder) remainder.value = Math.max(0, remainder.value - inflation);
          }
        }
        // Drop zero-value entries so they don't disrupt d3.pack layout.
        const innerChildren = rawChildren.filter((c) => c.value > 0);

        return {
          name: node.name,
          id: node.id,
          code: node.code,
          actualValue: parentValue,
          activityCount: node.activityCount,
          donorCount: node.donorCount,
          topDonors: node.topDonors,
          children:
            innerChildren.length > 0
              ? innerChildren
              : [{ name: '', id: `__placeholder__${node.id}`, value: parentValue || 1, actualValue: parentValue || 0 }],
        };
      }),
    };
  }, [data]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        setDimensions({
          width: Math.max(cw - 40, 400),
          height: Math.max(600, Math.min(800, cw * 0.7)),
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Draw ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width: w, height: h } = dimensions;
    const margin = 20;

    const root = d3
      .hierarchy<HierarchyDatum>(hierarchyData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const pack = d3.pack<HierarchyDatum>().size([w - margin * 2, h - margin * 2]).padding(8);
    const packedRoot = pack(root);

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain((data?.children || []).map((d) => d.id))
      .range(COORDINATION_COLORS);

    const g = svg.append('g').attr('transform', `translate(${margin}, ${margin})`);

    const sectorNodes = packedRoot.descendants().filter((d) => d.depth === 1);
    // Inner partner bubbles. Skip the synthesised "remainder" / "placeholder"
    // nodes — they only exist to size the outer sector ring correctly.
    const partnerNodes = packedRoot.descendants().filter((d) => {
      if (d.depth !== 2) return false;
      const id = d.data.id || '';
      return !id.startsWith('__remainder__') && !id.startsWith('__placeholder__');
    });

    // Lighter outer rings so inner partner bubbles can sit on top with the
    // sector's accent colour while still reading as a group.
    g.selectAll('.sector-circle')
      .data(sectorNodes)
      .join('circle')
      .attr('class', 'sector-circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.r)
      .attr('fill', (d) => {
        const c = colorScale(d.data.id || d.data.name);
        return d3.color(c)?.brighter(1.8)?.toString() || '#f1f5f9';
      })
      .attr('fill-opacity', 0.9)
      .attr('stroke', (d) => colorScale(d.data.id || d.data.name))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2.5);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const period = periodLabel ? ` ${periodLabel}` : '';
          setTooltip({
            show: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            content: {
              code: d.data.code,
              name: d.data.name,
              valueDisplay: formatValueDisplay(d.data.actualValue ?? d.value ?? 0),
              valueSubLabel: `${measureLabel}${period}`.trim(),
              activityCount: d.data.activityCount || 0,
              donorCount: d.data.donorCount || 0,
              topDonors: d.data.topDonors || [],
            },
          });
        }
      })
      .on('mousemove', function (event) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip((prev) => ({ ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }));
        }
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill-opacity', 0.9).attr('stroke-width', 1.5);
        setTooltip({ show: false, x: 0, y: 0, content: null });
      });

    // Inner partner bubbles. Coloured with the parent sector's accent so the
    // grouping reads at a glance. Each bubble has its own hover state that
    // shows the org name, acronym, and value attributed to this sector.
    g.selectAll('.partner-circle')
      .data(partnerNodes)
      .join('circle')
      .attr('class', 'partner-circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.r)
      .attr('fill', (d) => colorScale(d.parent?.data.id || d.parent?.data.name || ''))
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const period = periodLabel ? ` ${periodLabel}` : '';
          setTooltip({
            show: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            content: {
              code: undefined,
              name: d.data.name || 'Unknown',
              valueDisplay: formatValueDisplay(d.data.actualValue ?? d.value ?? 0),
              valueSubLabel: `${measureLabel}${period} · in ${d.parent?.data.name ?? ''}`.trim(),
              activityCount: d.data.activityCount || 0,
              donorCount: 0,
              topDonors: [],
            },
          });
        }
      })
      .on('mousemove', function (event) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip((prev) => ({ ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }));
        }
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill-opacity', 0.9).attr('stroke-width', 1);
        setTooltip({ show: false, x: 0, y: 0, content: null });
      });

    // Label partner bubbles with the acronym whenever one exists; only
    // fall back to the truncated full name when the org has no acronym.
    g.selectAll('.partner-label')
      .data(partnerNodes.filter((d) => d.r > 18))
      .join('text')
      .attr('class', 'partner-label')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => Math.min(12, d.r / 3))
      .attr('font-weight', 600)
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d) => {
        const name = d.data.name || '';
        const acronymMatch = name.match(/\(([^)]+)\)\s*$/);
        if (acronymMatch) return acronymMatch[1];
        const maxLen = Math.floor(d.r / 3);
        return name.length > maxLen ? name.substring(0, maxLen) + '…' : name;
      });

    // Sector code badge (grey monospace) inside larger bubbles.
    g.selectAll('.sector-code-badge')
      .data(sectorNodes.filter((d) => d.r > 38 && d.data.code))
      .join('g')
      .attr('class', 'sector-code-badge')
      .attr('transform', (d) => `translate(${d.x}, ${d.y - d.r + 18})`)
      .each(function (d) {
        const code = d.data.code!;
        const fontSize = Math.min(11, d.r / 5);
        const padX = 4;
        const padY = 2;
        const textWidth = code.length * fontSize * 0.65;
        const boxW = textWidth + padX * 2;
        const boxH = fontSize + padY * 2;
        const node = d3.select(this);
        node
          .append('rect')
          .attr('x', -boxW / 2)
          .attr('y', -boxH / 2)
          .attr('width', boxW)
          .attr('height', boxH)
          .attr('rx', 3)
          .attr('fill', '#e2e8f0')
          .attr('fill-opacity', 0.9);
        node
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
          .attr('font-size', fontSize)
          .attr('font-weight', 600)
          .attr('fill', '#334155')
          .text(code);
      });

    // Sector name beside the code badge for bubbles big enough to fit it.
    // Inner partner bubbles take the centre, so the sector name lives at the
    // top edge of the outer ring rather than competing for centre space.
    g.selectAll('.sector-name')
      .data(sectorNodes.filter((d) => d.r > 60))
      .join('text')
      .attr('class', 'sector-name')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y - d.r + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => Math.min(12, d.r / 6))
      .attr('font-weight', 600)
      .attr('fill', (d) => {
        const c = colorScale(d.data.id || d.data.name);
        return d3.color(c)?.darker(1.2)?.toString() || '#334155';
      })
      .attr('pointer-events', 'none')
      .text((d) => {
        const maxLen = Math.floor(d.r / 4);
        return d.data.name.length > maxLen ? d.data.name.substring(0, maxLen) + '…' : d.data.name;
      });
  }, [hierarchyData, dimensions, data, isExpanded, measure, measureLabel, periodLabel]);

  if (!data || data.children.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No aid distribution data for the current filters
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="mx-auto" />

      {/* Tooltip — wider, and titles + donor names wrap rather than truncate. */}
      {tooltip.show && tooltip.content && (
        <div
          className="absolute pointer-events-none z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden text-body w-[320px]"
          style={{
            left: Math.min(tooltip.x + 10, dimensions.width - 320),
            top: tooltip.y - 10,
            transform: tooltip.y < 100 ? 'translateY(20px)' : 'translateY(-100%)',
          }}
        >
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <div className="flex items-start gap-2">
              {tooltip.content.code && (
                <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs flex-shrink-0 mt-0.5">
                  {tooltip.content.code}
                </code>
              )}
              <p className="font-semibold text-foreground break-words leading-snug">{tooltip.content.name}</p>
            </div>
          </div>
          <div className="px-3 py-2 space-y-1">
            <div>
              <div className="font-semibold text-foreground">{tooltip.content.valueDisplay}</div>
              <div className="text-helper text-muted-foreground">{tooltip.content.valueSubLabel}</div>
            </div>
            <div className="text-helper text-muted-foreground">
              {tooltip.content.activityCount}{' '}
              {tooltip.content.activityCount === 1 ? 'activity' : 'activities'} ·{' '}
              {tooltip.content.donorCount}{' '}
              {tooltip.content.donorCount === 1 ? 'donor' : 'donors'}
            </div>
            {tooltip.content.topDonors.length > 0 && (
              <div className="pt-1 border-t border-border">
                <div className="text-helper font-medium text-foreground mb-0.5">Top donors</div>
                {tooltip.content.topDonors.map((d) => (
                  <div key={d.id} className="text-helper text-muted-foreground flex items-start justify-between gap-2">
                    <span className="break-words leading-snug">
                      {d.name}
                      {d.acronym ? ` (${d.acronym})` : ''}
                    </span>
                    <span className="font-medium text-foreground flex-shrink-0 whitespace-nowrap">
                      {isCountMeasure(measure) ? '' : formatCurrencyCompact(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isExpanded && !compact && (
        <p className="text-body text-muted-foreground leading-relaxed">
          Each bubble represents a {data.children[0]?.code && data.children[0].code.length === 5 ? 'sub-sector' : data.children[0]?.code && data.children[0].code.length === 3 ? 'sector' : 'sector category'}, sized by the selected measure. Hover for code, value, activity and donor counts, and the leading funders.
        </p>
      )}
    </div>
  );
}
