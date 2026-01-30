"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ZoomOut, Download, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

// Direction-based color palette (4 colors for interventions)
const DIRECTION_COLORS: Record<string, string> = {
  "Favorable & Significant": "#52796f",      // Dark Green (Deep Teal)
  "Favorable": "#cce1db",                     // Light Green (Frozen Water)
  "Unfavorable": "#ff9090",                   // Light Red (Grapefruit Pink)
  "Unfavorable & Significant": "#dc2625",    // Dark Red (Primary Scarlet)
};

const DIRECTION_LEVELS = ["Favorable & Significant", "Favorable", "Unfavorable", "Unfavorable & Significant"];
const VIOLENCE_TYPES = ["Sexual Violence", "Physical Violence"];
const INTERVENTION_TYPES = ["Multi-Level", "Multi-Component", "Curriculum-Based"];

// Parent tier colors (grays) - lighter overall so interventions pop
const LEVEL_1_COLOR = "#94a3b8";  // Medium slate for Sexual Violence / Physical Violence
const LEVEL_2_COLOR = "#cbd5e1";  // Lighter slate for Multi-Level / Multi-Component / Curriculum-Based
const BORDER_COLOR = "#f1f4f8";   // Platinum for borders

// Font family for consistent export
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Animation duration in milliseconds
const TRANSITION_DURATION = 500;

// Interface for flat table data
interface InterventionRow {
  id: string;
  violenceType: string;
  interventionType: string;
  name: string;
  sampleSize: number;
  direction: string;
  description: string;
}

// Generate initial mock data as flat rows
function generateInitialData(): InterventionRow[] {
  const interventionNames = [
    "Safe Schools Initiative",
    "Gender Equity Curriculum",
    "Teacher Training on GBV Response",
    "Student Peer Educator Program",
    "School Counseling Services",
    "Bystander Intervention Training",
    "Respectful Relationships Education",
    "Anti-Bullying & Harassment Policy",
    "Girls' Empowerment Clubs",
    "Boys' Positive Masculinity Program",
    "School Safety Audits",
    "Reporting & Referral Systems",
  ];

  const descriptions = [
    "A whole-school approach creating safe learning environments through policy, training, and student engagement.",
    "Curriculum integrating gender equality concepts across subjects, challenging stereotypes.",
    "Comprehensive training for educators on recognizing signs of abuse and responding appropriately.",
    "Training selected students as peer educators to facilitate discussions on consent and healthy relationships.",
    "Professional counseling services within schools providing support for at-risk students.",
    "Teaching students and staff to safely intervene when witnessing harassment or violence.",
    "Age-appropriate lessons on building healthy relationships and understanding consent.",
    "Clear policies prohibiting harassment and violence with defined consequences.",
    "After-school clubs providing safe spaces for girls to build confidence and leadership skills.",
    "Programs engaging boys in discussions about healthy masculinity and respect.",
    "Systematic assessments of school facilities to identify and address safety risks.",
    "Establishing clear, confidential pathways for students to report incidents.",
  ];

  const rows: InterventionRow[] = [];
  let id = 1;

  VIOLENCE_TYPES.forEach((violenceType) => {
    INTERVENTION_TYPES.forEach((interventionType) => {
      // Add 2-3 interventions per combination
      const numInterventions = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numInterventions; i++) {
        const idx = (id - 1) % interventionNames.length;
        rows.push({
          id: String(id++),
          violenceType,
          interventionType,
          name: interventionNames[idx],
          sampleSize: Math.floor(Math.random() * 400) + 100,
          direction: DIRECTION_LEVELS[Math.floor(Math.random() * DIRECTION_LEVELS.length)],
          description: descriptions[idx],
        });
      }
    });
  });

  return rows;
}

// Convert flat rows to hierarchical tree map data
function convertToHierarchy(rows: InterventionRow[]): TreeMapNode {
  const hierarchy: TreeMapNode = {
    name: "Interventions",
    children: VIOLENCE_TYPES.map((violenceType) => ({
      name: violenceType,
      children: INTERVENTION_TYPES.map((interventionType) => ({
        name: interventionType,
        children: rows
          .filter((r) => r.violenceType === violenceType && r.interventionType === interventionType)
          .map((r) => ({
            id: r.id,
            name: r.name,
            value: r.sampleSize,
            color: DIRECTION_COLORS[r.direction],
            direction: r.direction,
            description: r.description,
          })),
      })).filter((a) => a.children && a.children.length > 0),
    })).filter((v) => v.children && v.children.length > 0),
  };

  return hierarchy;
}

interface TreeMapNode {
  name: string;
  id?: string;
  value?: number;
  color?: string;
  direction?: string;
  description?: string;
  children?: TreeMapNode[];
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  content: {
    name: string;
    direction?: string;
    description?: string;
  } | null;
}

// Expandable Textarea Component
function ExpandableTextarea({
  value,
  onChange,
  placeholder,
  minRows = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const lineHeight = 18;
  const baseHeight = minRows * lineHeight + 12; // padding
  const expandedHeight = Math.max(baseHeight, Math.min(150, (value.split('\n').length + 1) * lineHeight + 12));

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-xs resize-none pr-8 transition-all duration-200"
        style={{
          height: isExpanded ? expandedHeight : baseHeight,
          minHeight: baseHeight,
        }}
      />
      <button
        type="button"
        onClick={toggleExpand}
        className="absolute right-1 top-1 p-1 text-slate-400 hover:text-slate-600 rounded"
        title={isExpanded ? "Collapse" : "Expand"}
      >
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

export function InterventionTreeMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [currentRoot, setCurrentRoot] = useState<d3.HierarchyRectangularNode<TreeMapNode> | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(["Interventions"]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Editable data state
  const [tableData, setTableData] = useState<InterventionRow[]>(() => generateInitialData());

  // Convert table data to hierarchy for tree map
  const treeMapData = useMemo(() => convertToHierarchy(tableData), [tableData]);

  // Handle row updates
  const updateRow = useCallback((id: string, field: keyof InterventionRow, value: string | number) => {
    setTableData((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  }, []);

  // Add new row
  const addRow = useCallback(() => {
    const newId = String(Math.max(...tableData.map((r) => parseInt(r.id))) + 1);
    setTableData((prev) => [
      ...prev,
      {
        id: newId,
        violenceType: VIOLENCE_TYPES[0],
        interventionType: INTERVENTION_TYPES[0],
        name: "New Intervention",
        sampleSize: 100,
        direction: DIRECTION_LEVELS[0],
        description: "Description of the intervention",
      },
    ]);
  }, [tableData]);

  // Delete row
  const deleteRow = useCallback((id: string) => {
    setTableData((prev) => prev.filter((row) => row.id !== id));
  }, []);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setDimensions({
          width: Math.max(containerWidth - 40, 400),
          height: Math.max(500, Math.min(700, containerWidth * 0.6)),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Create hierarchy and treemap layout
  const createTreemap = useCallback(
    (data: TreeMapNode) => {
      const { width, height } = dimensions;

      const hierarchy = d3
        .hierarchy<TreeMapNode>(data)
        .sum((d) => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      const treemap = d3
        .treemap<TreeMapNode>()
        .size([width, height])
        .paddingOuter(6)
        .paddingTop(28)
        .paddingInner((node) => {
          if (node.depth === 0) return 16;
          if (node.depth === 1) return 4;
          return 2;
        })
        .round(true);

      return treemap(hierarchy);
    },
    [dimensions]
  );

  // Export to JPEG
  const handleExportJPG = useCallback(() => {
    if (isExporting) return;

    setIsExporting(true);
    setTooltip({ show: false, x: 0, y: 0, content: null });

    setTimeout(() => {
      try {
        const root = createTreemap(treeMapData);
        const displayRoot = currentRoot || root;
        const nodes = displayRoot.descendants().filter((d) => d.depth > 0);

        const { width, height } = dimensions;
        const legendHeight = 50;
        const padding = 24;
        const scale = 2;

        const canvas = document.createElement("canvas");
        canvas.width = (width + padding * 2) * scale;
        canvas.height = (height + legendHeight + padding * 2) * scale;

        const ctx = canvas.getContext("2d")!;
        ctx.scale(scale, scale);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

        ctx.font = "600 12px Arial, sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText("Direction:", padding, padding + 14);

        let legendX = padding + 70;
        DIRECTION_LEVELS.forEach((level) => {
          ctx.fillStyle = DIRECTION_COLORS[level];
          ctx.fillRect(legendX, padding + 2, 16, 16);
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.strokeRect(legendX, padding + 2, 16, 16);
          ctx.fillStyle = "#475569";
          ctx.font = "500 11px Arial, sans-serif";
          ctx.fillText(level, legendX + 20, padding + 14);
          legendX += ctx.measureText(level).width + 45;
        });

        const offsetY = legendHeight + padding;

        const getNodeColor = (d: d3.HierarchyRectangularNode<TreeMapNode>) => {
          if (d.data.color) return d.data.color;
          if (d.depth === 1) return LEVEL_1_COLOR;
          if (d.depth === 2) return LEVEL_2_COLOR;
          return LEVEL_2_COLOR;
        };

        const getTextColor = (bgColor: string) => {
          const darkColors = ["#dc2625", "#52796f"];
          return darkColors.includes(bgColor) ? "#ffffff" : "#1e293b";
        };

        const sortedNodes = [...nodes].sort((a, b) => a.depth - b.depth);

        sortedNodes.forEach((d) => {
          const x = d.x0 + padding;
          const y = d.y0 + offsetY;
          const w = d.x1 - d.x0;
          const h = d.y1 - d.y0;
          const color = getNodeColor(d);

          ctx.fillStyle = color;
          ctx.beginPath();
          const radius = 4;
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + w - radius, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
          ctx.lineTo(x + w, y + h - radius);
          ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
          ctx.lineTo(x + radius, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = BORDER_COLOR;
          ctx.lineWidth = d.depth === 1 ? 2 : 1;
          ctx.stroke();

          const textColor = getTextColor(color);
          ctx.fillStyle = textColor;

          if (d.children) {
            if (w > 60) {
              ctx.font = d.depth === 1 ? "700 14px Arial, sans-serif" : "600 12px Arial, sans-serif";
              ctx.fillText(d.data.name, x + 6, y + 18);
            }
          } else {
            if (w > 40 && h > 30) {
              ctx.font = "500 11px Arial, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              const text = d.data.name;
              const maxWidth = w - 12;
              const lineHeight = 14;
              const words = text.split(" ");
              const lines: string[] = [];
              let currentLine = "";

              words.forEach((word) => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine) {
                  lines.push(currentLine);
                  currentLine = word;
                } else {
                  currentLine = testLine;
                }
              });
              if (currentLine) lines.push(currentLine);

              const maxLines = Math.floor((h - 8) / lineHeight);
              const displayLines = lines.slice(0, maxLines);
              const totalHeight = displayLines.length * lineHeight;
              const startY = y + (h - totalHeight) / 2 + lineHeight / 2;

              displayLines.forEach((line, i) => {
                ctx.fillText(line, x + w / 2, startY + i * lineHeight);
              });

              ctx.textAlign = "left";
              ctx.textBaseline = "alphabetic";
            }
          }
        });

        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const timestamp = new Date().toISOString().split("T")[0];
            link.href = downloadUrl;
            link.download = `intervention-treemap-${timestamp}.jpg`;
            link.click();
            URL.revokeObjectURL(downloadUrl);
          }
          setIsExporting(false);
        }, "image/jpeg", 0.95);
      } catch (error) {
        console.error("Export failed:", error);
        setIsExporting(false);
      }
    }, 100);
  }, [isExporting, createTreemap, treeMapData, currentRoot, dimensions]);

  // Draw the treemap with animations
  useEffect(() => {
    if (!svgRef.current || !treeMapData) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const root = createTreemap(treeMapData);

    const displayRoot = currentRoot || root;

    const getDisplayNodes = (node: d3.HierarchyRectangularNode<TreeMapNode>) => {
      return node.descendants().filter((d) => d.depth > 0);
    };

    const nodes = getDisplayNodes(displayRoot);

    const getNodeColor = (d: d3.HierarchyRectangularNode<TreeMapNode>) => {
      if (d.data.color) return d.data.color;
      if (d.depth === 1) return LEVEL_1_COLOR;
      if (d.depth === 2) return LEVEL_2_COLOR;
      return LEVEL_2_COLOR;
    };

    const getTextColor = (bgColor: string) => {
      const darkColors = ["#dc2625", "#52796f"];
      return darkColors.includes(bgColor) ? "#ffffff" : "#1e293b";
    };

    let g = svg.select<SVGGElement>("g.main-group");
    if (g.empty()) {
      g = svg.append("g").attr("class", "main-group");
    }

    const cell = g
      .selectAll<SVGGElement, d3.HierarchyRectangularNode<TreeMapNode>>("g.cell")
      .data(nodes, (d) => (d.data.id ? d.data.id : d.data.name + "-" + d.depth));

    cell.exit()
      .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", 0)
      .attr("transform", (d) => `translate(${width / 2},${height / 2})`)
      .remove();

    const cellEnter = cell.enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("opacity", 0);

    cellEnter
      .append("rect")
      .attr("class", "cell-rect")
      .attr("width", 0)
      .attr("height", 0)
      .attr("fill", (d) => getNodeColor(d))
      .attr("fill-opacity", (d) => (d.children ? 0.6 : 0.9))
      .attr("stroke", BORDER_COLOR)
      .attr("stroke-width", (d) => (d.depth === 1 ? 2 : 1))
      .attr("rx", 4)
      .style("cursor", (d) => (d.children ? "pointer" : "default"));

    cellEnter
      .filter((d) => Boolean(d.children))
      .append("foreignObject")
      .attr("class", "parent-label-container")
      .attr("x", 4)
      .attr("y", 2)
      .attr("width", (d) => Math.max(0, d.x1 - d.x0 - 8))
      .attr("height", 24)
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .append("xhtml:div")
      .attr("class", "parent-label")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex")
      .style("align-items", "center")
      .style("font-family", FONT_FAMILY)
      .style("font-size", (d) => (d.depth === 1 ? "14px" : "12px"))
      .style("font-weight", (d) => (d.depth === 1 ? "700" : "600"))
      .style("color", (d) => getTextColor(getNodeColor(d)))
      .style("line-height", "1.2")
      .style("overflow", "hidden")
      .style("text-overflow", "ellipsis")
      .style("white-space", "nowrap")
      .text((d) => d.data.name);

    cellEnter
      .filter((d) => !d.children)
      .append("foreignObject")
      .attr("class", "leaf-label-container")
      .attr("x", 4)
      .attr("y", 4)
      .attr("width", (d) => Math.max(0, d.x1 - d.x0 - 8))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0 - 8))
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .append("xhtml:div")
      .attr("class", "leaf-label-text")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("text-align", "center")
      .style("font-family", FONT_FAMILY)
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("line-height", "1.2")
      .style("overflow", "hidden")
      .style("word-wrap", "break-word")
      .style("padding", "2px");

    const cellMerge = cellEnter.merge(cell);

    cellMerge
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("opacity", 1);

    cellMerge.select<SVGRectElement>("rect.cell-rect")
      .on("click", function (event, d) {
        if (d.children && !isAnimating) {
          event.stopPropagation();
          setIsAnimating(true);
          const newRoot = createTreemap(d.data);
          setCurrentRoot(newRoot);
          setBreadcrumbs((prev) => [...prev, d.data.name]);
          setTimeout(() => setIsAnimating(false), TRANSITION_DURATION);
        }
      })
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill-opacity", d.children ? 0.8 : 1);

        if (!d.children && d.data.direction) {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltip({
              show: true,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              content: {
                name: d.data.name,
                direction: d.data.direction,
                description: d.data.description,
              },
            });
          }
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
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill-opacity", d.children ? 0.6 : 0.9);
        setTooltip({ show: false, x: 0, y: 0, content: null });
      })
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("fill", (d) => getNodeColor(d));

    cellMerge.select<SVGForeignObjectElement>("foreignObject.parent-label-container")
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("width", (d) => Math.max(0, d.x1 - d.x0 - 8))
      .style("opacity", (d) => (d.x1 - d.x0 > 60 ? 1 : 0));

    cellMerge.select<HTMLDivElement>("foreignObject.parent-label-container div.parent-label")
      .style("color", (d) => getTextColor(getNodeColor(d)))
      .text((d) => d.data.name);

    cellMerge.select<SVGForeignObjectElement>("foreignObject.leaf-label-container")
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("width", (d) => Math.max(0, d.x1 - d.x0 - 8))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0 - 8))
      .style("opacity", (d) => ((d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 30 ? 1 : 0));

    cellMerge.select<HTMLDivElement>("foreignObject.leaf-label-container div.leaf-label-text")
      .style("color", (d) => getTextColor(d.data.color || "#f1f4f8"))
      .text((d) => d.data.name);

  }, [treeMapData, dimensions, currentRoot, createTreemap, isAnimating]);

  const handleZoomOut = useCallback(() => {
    if (breadcrumbs.length > 1 && !isAnimating) {
      setIsAnimating(true);
      setBreadcrumbs((prev) => prev.slice(0, -1));
      if (breadcrumbs.length === 2) {
        setCurrentRoot(null);
      } else {
        setCurrentRoot(null);
        setBreadcrumbs(["Interventions"]);
      }
      setTimeout(() => setIsAnimating(false), TRANSITION_DURATION);
    }
  }, [breadcrumbs.length, isAnimating]);

  const handleBreadcrumbClick = useCallback((idx: number) => {
    if (idx < breadcrumbs.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
      if (idx === 0) {
        setCurrentRoot(null);
      }
      setTimeout(() => setIsAnimating(false), TRANSITION_DURATION);
    }
  }, [breadcrumbs, isAnimating]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Breadcrumbs and Zoom Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-400">/</span>}
              <span
                className={
                  idx === breadcrumbs.length - 1
                    ? "font-semibold text-slate-900"
                    : "hover:text-slate-900 cursor-pointer transition-colors"
                }
                onClick={() => handleBreadcrumbClick(idx)}
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {breadcrumbs.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={isAnimating}
              className="flex items-center gap-1"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJPG}
            disabled={isExporting}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export JPEG"}
          </Button>
        </div>
      </div>

      {/* Legend - Direction-based */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <span className="text-slate-600 font-medium">Direction:</span>
        {DIRECTION_LEVELS.map((level) => (
          <div key={level} className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded border border-slate-300"
              style={{ backgroundColor: DIRECTION_COLORS[level] }}
            />
            <span className="text-slate-600">{level}</span>
          </div>
        ))}
      </div>

      {/* SVG Container */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border border-slate-200 rounded-lg bg-slate-50"
      />

      {/* Tooltip */}
      {tooltip.show && tooltip.content && (
        <div
          className="absolute pointer-events-none z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm transition-opacity duration-150"
          style={{
            left: Math.min(tooltip.x + 15, dimensions.width - 280),
            top: Math.max(tooltip.y - 120, 10),
          }}
        >
          <div className="font-semibold text-base mb-2">{tooltip.content.name}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Direction:</span>
              <span
                className={
                  tooltip.content.direction === "Favorable & Significant"
                    ? "text-teal-400"
                    : tooltip.content.direction === "Favorable"
                    ? "text-green-300"
                    : tooltip.content.direction === "Unfavorable"
                    ? "text-orange-300"
                    : "text-red-400"
                }
              >
                {tooltip.content.direction}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700">
              <span className="text-slate-300 text-xs leading-relaxed">
                {tooltip.content.description}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <p className="text-xs text-slate-500 mt-3 text-center">
        Click on a category to zoom in. Use the breadcrumbs or Zoom Out button to navigate back.
      </p>

      {/* Data Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Intervention Data</h3>
          <Button onClick={addRow} size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add Intervention
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[130px] text-left">Violence Type</TableHead>
                  <TableHead className="w-[140px] text-left">Intervention Type</TableHead>
                  <TableHead className="w-[220px] text-left">Intervention Name</TableHead>
                  <TableHead className="w-[90px]">Sample Size</TableHead>
                  <TableHead className="w-[160px]">Direction</TableHead>
                  <TableHead className="min-w-[250px]">Description</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id} className="align-top">
                    {/* Violence Type - Left aligned, two lines */}
                    <TableCell className="align-top">
                      <Select
                        value={row.violenceType}
                        onValueChange={(value) => updateRow(row.id, "violenceType", value)}
                      >
                        <SelectTrigger className="h-auto min-h-[40px] text-xs text-left justify-start">
                          <SelectValue>
                            <span className="whitespace-normal text-left leading-tight">{row.violenceType}</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {VIOLENCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="text-xs">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Intervention Type - Left aligned chip */}
                    <TableCell className="align-top">
                      <Select
                        value={row.interventionType}
                        onValueChange={(value) => updateRow(row.id, "interventionType", value)}
                      >
                        <SelectTrigger className="h-auto min-h-[40px] text-xs text-left justify-start">
                          <SelectValue>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {row.interventionType}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start">
                          {INTERVENTION_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="text-xs">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {type}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Intervention Name - Two lines, expandable */}
                    <TableCell className="align-top">
                      <ExpandableTextarea
                        value={row.name}
                        onChange={(value) => updateRow(row.id, "name", value)}
                        placeholder="Intervention name..."
                        minRows={2}
                      />
                    </TableCell>
                    {/* Sample Size */}
                    <TableCell className="align-top">
                      <Input
                        type="number"
                        value={row.sampleSize}
                        onChange={(e) => updateRow(row.id, "sampleSize", parseInt(e.target.value) || 0)}
                        className="h-10 text-xs w-20"
                        min={1}
                      />
                    </TableCell>
                    {/* Direction */}
                    <TableCell className="align-top">
                      <Select
                        value={row.direction}
                        onValueChange={(value) => updateRow(row.id, "direction", value)}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded flex-shrink-0"
                                style={{ backgroundColor: DIRECTION_COLORS[row.direction] }}
                              />
                              <span className="truncate">{row.direction}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {DIRECTION_LEVELS.map((level) => (
                            <SelectItem key={level} value={level} className="text-xs">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: DIRECTION_COLORS[level] }}
                                />
                                {level}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Description - Two lines, expandable */}
                    <TableCell className="align-top">
                      <ExpandableTextarea
                        value={row.description}
                        onChange={(value) => updateRow(row.id, "description", value)}
                        placeholder="Description..."
                        minRows={2}
                      />
                    </TableCell>
                    {/* Delete */}
                    <TableCell className="align-top">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRow(row.id)}
                        className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Edit the table above to update the tree map visualization. The "Sample Size" column determines the size of each intervention block.
        </p>
      </div>
    </div>
  );
}
