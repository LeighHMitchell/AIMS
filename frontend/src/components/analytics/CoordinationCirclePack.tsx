"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
// Brand color palette
const COORDINATION_COLORS = [
  "#4c5568", // Blue Slate (primary)
  "#7b95a7", // Cool Steel
  "#dc2625", // Primary Scarlet
  "#cfd0d5", // Pale Slate
  "#3d4451", // Darker Blue Slate
  "#5a6b7a", // Mid Steel
  "#8fa3b3", // Light Steel
  "#b54342", // Muted Scarlet
];
import type {
  CoordinationView,
  CoordinationHierarchy,
  CoordinationParentNode,
  CoordinationBubble,
} from "@/types/coordination";

interface CoordinationCirclePackProps {
  view: CoordinationView;
  data: CoordinationHierarchy | null;
  width?: number;
  height?: number;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  content: {
    title: string;
    subtitle?: string;
    value: string;
    activityCount: number;
    isParent: boolean;
    childCount?: number;
  } | null;
}

interface HierarchyDatum {
  name: string;
  id?: string;
  code?: string;
  value?: number;
  totalValue?: number;
  activityCount?: number;
  children?: HierarchyDatum[];
  isParent?: boolean;
}

export function CoordinationCirclePack({
  view,
  data,
  width = 900,
  height = 700,
}: CoordinationCirclePackProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [dimensions, setDimensions] = useState({ width, height });

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatFullCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Transform data for d3.hierarchy
  const hierarchyData = useMemo(() => {
    if (!data) return null;

    const transformedData: HierarchyDatum = {
      name: data.name,
      children: data.children.map((parent, parentIndex) => ({
        name: parent.name,
        id: parent.id,
        code: parent.code,
        totalValue: parent.totalValue,
        isParent: true,
        children: parent.children.map((child) => ({
          name: child.name,
          id: child.id,
          code: child.code,
          value: child.value,
          activityCount: child.activityCount,
          isParent: false,
        })),
      })),
    };

    return transformedData;
  }, [data]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setDimensions({
          width: Math.max(containerWidth - 40, 400),
          height: Math.max(600, Math.min(800, containerWidth * 0.7)),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Draw the circle pack
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width: w, height: h } = dimensions;
    const margin = 20;

    // Create hierarchy
    const root = d3
      .hierarchy<HierarchyDatum>(hierarchyData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create pack layout
    const pack = d3
      .pack<HierarchyDatum>()
      .size([w - margin * 2, h - margin * 2])
      .padding(8);

    const packedRoot = pack(root);

    // Color scale for parent circles
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(data?.children.map((d) => d.id) || [])
      .range(COORDINATION_COLORS);

    // Create main group with margin
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin}, ${margin})`);

    // Draw parent circles (sectors or organizations)
    const parentNodes = packedRoot.descendants().filter((d) => d.depth === 1);

    g.selectAll(".parent-circle")
      .data(parentNodes)
      .join("circle")
      .attr("class", "parent-circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("fill", (d) => {
        const color = colorScale(d.data.id || d.data.name);
        return d3.color(color)?.brighter(1.5)?.toString() || "#f1f5f9";
      })
      .attr("stroke", (d) => colorScale(d.data.id || d.data.name))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("stroke-width", 3).attr("stroke-opacity", 1);

        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            show: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            content: {
              title: d.data.name,
              subtitle: d.data.code ? `Code: ${d.data.code}` : undefined,
              value: formatFullCurrency(d.data.totalValue || d.value || 0),
              activityCount: d.children?.reduce(
                (sum, c) => sum + (c.data.activityCount || 0),
                0
              ) || 0,
              isParent: true,
              childCount: d.children?.length || 0,
            },
          });
        }
      })
      .on("mousemove", function (event) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip((prev) => ({
            ...prev,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          }));
        }
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-width", 2).attr("stroke-opacity", 0.6);
        setTooltip({ show: false, x: 0, y: 0, content: null });
      });

    // Draw child circles (organizations or sectors)
    const childNodes = packedRoot.descendants().filter((d) => d.depth === 2);

    g.selectAll(".child-circle")
      .data(childNodes)
      .join("circle")
      .attr("class", "child-circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("fill", (d) => {
        const parentId = d.parent?.data.id || d.parent?.data.name || "";
        return colorScale(parentId);
      })
      .attr("fill-opacity", 0.85)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("fill-opacity", 1).attr("stroke-width", 2);

        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            show: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            content: {
              title: d.data.name,
              subtitle: d.data.code ? `Code: ${d.data.code}` : undefined,
              value: formatFullCurrency(d.data.value || 0),
              activityCount: d.data.activityCount || 0,
              isParent: false,
            },
          });
        }
      })
      .on("mousemove", function (event) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip((prev) => ({
            ...prev,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          }));
        }
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill-opacity", 0.85).attr("stroke-width", 1);
        setTooltip({ show: false, x: 0, y: 0, content: null });
      });

    // Add labels for parent circles
    g.selectAll(".parent-label")
      .data(parentNodes.filter((d) => d.r > 50))
      .join("text")
      .attr("class", "parent-label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y - d.r + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => Math.min(14, d.r / 4))
      .attr("font-weight", 600)
      .attr("fill", (d) => {
        const color = colorScale(d.data.id || d.data.name);
        return d3.color(color)?.darker(1)?.toString() || "#334155";
      })
      .attr("pointer-events", "none")
      .text((d) => {
        const name = d.data.name;
        const maxLength = Math.floor(d.r / 5);
        return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
      });

    // Add value labels for parent circles
    g.selectAll(".parent-value")
      .data(parentNodes.filter((d) => d.r > 60))
      .join("text")
      .attr("class", "parent-value")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y - d.r + 36)
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => Math.min(11, d.r / 5))
      .attr("fill", "#64748b")
      .attr("pointer-events", "none")
      .text((d) => formatCurrency(d.data.totalValue || d.value || 0));

    // Add labels for larger child circles
    g.selectAll(".child-label")
      .data(childNodes.filter((d) => d.r > 25))
      .join("text")
      .attr("class", "child-label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => Math.min(10, d.r / 3))
      .attr("font-weight", 500)
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .text((d) => {
        const name = d.data.name;
        const maxLength = Math.floor(d.r / 4);
        return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
      });
  }, [hierarchyData, dimensions, data]);

  if (!data || data.children.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        No coordination data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="mx-auto"
      />

      {/* Tooltip */}
      {tooltip.show && tooltip.content && (
        <div
          className="absolute pointer-events-none z-50 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm max-w-xs"
          style={{
            left: Math.min(tooltip.x + 10, dimensions.width - 200),
            top: tooltip.y - 10,
            transform: tooltip.y < 100 ? "translateY(20px)" : "translateY(-100%)",
          }}
        >
          <div className="font-semibold">{tooltip.content.title}</div>
          {tooltip.content.subtitle && (
            <div className="text-slate-400 text-xs">{tooltip.content.subtitle}</div>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-emerald-400">{tooltip.content.value}</span>
          </div>
          <div className="text-slate-400 text-xs mt-1">
            {tooltip.content.activityCount} {tooltip.content.activityCount === 1 ? "activity" : "activities"}
          </div>
          {tooltip.content.isParent && tooltip.content.childCount && (
            <div className="text-slate-400 text-xs">
              {tooltip.content.childCount} {view === "sectors" ? "partners" : "sectors"}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
