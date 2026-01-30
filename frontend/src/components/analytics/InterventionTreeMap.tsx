"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { ZoomOut, Download } from "lucide-react";

// Effectiveness-based color palette (4 colors for interventions)
const EFFECTIVENESS_COLORS: Record<string, string> = {
  "Always Works": "#52796f",      // Dark Green (Deep Teal)
  "Mostly Works": "#cce1db",      // Light Green (Frozen Water)
  "Sometimes Works": "#ff9090",   // Light Red (Grapefruit Pink)
  "Never Works": "#dc2625",       // Dark Red (Primary Scarlet)
};

const EFFECTIVENESS_LEVELS = ["Always Works", "Mostly Works", "Sometimes Works", "Never Works"];

// Parent tier colors (grays) - lighter overall so interventions pop
const LEVEL_1_COLOR = "#94a3b8";  // Medium slate for Sexual Violence / Physical Violence
const LEVEL_2_COLOR = "#cbd5e1";  // Lighter slate for Multi-Level / Multi-Component / Curriculum-Based
const BORDER_COLOR = "#f1f4f8";   // Platinum for borders

// Font family for consistent export
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Animation duration in milliseconds
const TRANSITION_DURATION = 500;

// School-based VAWG intervention names
const MOCK_INTERVENTIONS = [
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
  "Parent-School Partnership Program",
  "Digital Safety & Cyberbullying Prevention",
  "Comprehensive Sexuality Education",
  "Conflict Resolution Training",
  "Safe Spaces for Girls",
  "School-Based Health Services",
  "Arts-Based Prevention Program",
  "Sports for Gender Equality",
  "Student Rights Awareness Campaign",
  "Teacher Code of Conduct Training",
];

const MOCK_COUNTRIES = [
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Ethiopia",
  "Nigeria",
  "Ghana",
  "South Africa",
  "Zambia",
  "Malawi",
];

// School-based VAWG intervention descriptions
const MOCK_DESCRIPTIONS = [
  "A whole-school approach creating safe learning environments through policy, training, and student engagement to prevent violence against girls.",
  "Curriculum integrating gender equality concepts across subjects, challenging stereotypes and promoting respectful relationships from early grades.",
  "Comprehensive training for educators on recognizing signs of abuse, responding appropriately, and supporting affected students.",
  "Training selected students as peer educators to facilitate discussions on consent, healthy relationships, and reporting mechanisms.",
  "Professional counseling services within schools providing support for students experiencing or at risk of gender-based violence.",
  "Teaching students and staff to safely intervene when witnessing harassment, bullying, or violent behavior in school settings.",
  "Age-appropriate lessons on building healthy relationships, understanding consent, and recognizing abusive behaviors.",
  "Development and implementation of clear policies prohibiting harassment and violence with defined consequences and reporting procedures.",
  "After-school clubs providing safe spaces for girls to build confidence, leadership skills, and support networks.",
  "Programs engaging boys in discussions about healthy masculinity, respect, and their role in preventing violence.",
  "Systematic assessments of school facilities and practices to identify and address safety risks for girls and vulnerable students.",
  "Establishing clear, confidential pathways for students to report incidents and access appropriate support services.",
  "Engaging parents and caregivers in prevention efforts through workshops, communication, and home-school collaboration.",
  "Education on online safety, recognizing cyber harassment, and responsible digital citizenship to prevent technology-facilitated abuse.",
  "Evidence-based sexuality education covering consent, relationships, gender identity, and protection from exploitation.",
  "Teaching students non-violent communication and conflict resolution skills to reduce aggression and bullying.",
  "Designated safe areas within schools where girls can seek support, study, and connect with mentors.",
  "School-based health services providing reproductive health information, support for survivors, and referrals.",
  "Using drama, visual arts, and creative expression to explore themes of respect, consent, and healthy relationships.",
  "Sports programs promoting gender equality, teamwork, and respect while providing safe recreational activities for all students.",
  "Campaigns educating students about their rights to safety and education free from violence and discrimination.",
  "Training teachers on professional boundaries, appropriate conduct, and their responsibilities in protecting students.",
];

// Generate mock hierarchical data
function generateMockData() {
  const approaches = ["Multi-Level", "Multi-Component", "Curriculum-Based"];
  const violenceTypes = ["Sexual Violence", "Physical Violence"];

  // Shuffle and distribute interventions
  const shuffledInterventions = [...MOCK_INTERVENTIONS].sort(() => Math.random() - 0.5);
  let interventionIndex = 0;

  const data = {
    name: "Interventions",
    children: violenceTypes.map((violenceType) => ({
      name: violenceType,
      children: approaches.map((approach) => {
        const numInterventions = Math.floor(Math.random() * 4) + 3; // 3-6 interventions
        const interventions = [];
        for (let i = 0; i < numInterventions; i++) {
          const idx = interventionIndex % shuffledInterventions.length;
          const effectiveness = EFFECTIVENESS_LEVELS[Math.floor(Math.random() * EFFECTIVENESS_LEVELS.length)];
          interventions.push({
            name: shuffledInterventions[idx],
            value: Math.floor(Math.random() * 900) + 100,
            color: EFFECTIVENESS_COLORS[effectiveness],
            country: MOCK_COUNTRIES[Math.floor(Math.random() * MOCK_COUNTRIES.length)],
            effectiveness: effectiveness,
            description: MOCK_DESCRIPTIONS[idx % MOCK_DESCRIPTIONS.length],
          });
          interventionIndex++;
        }
        return {
          name: approach,
          children: interventions,
        };
      }),
    })),
  };

  return data;
}

interface TreeMapNode {
  name: string;
  value?: number;
  color?: string;
  country?: string;
  effectiveness?: string;
  description?: string;
  children?: TreeMapNode[];
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  content: {
    name: string;
    country?: string;
    effectiveness?: string;
    description?: string;
  } | null;
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
  const [mockData] = useState(() => generateMockData());
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
          // More padding between top-level categories (Sexual Violence / Physical Violence)
          if (node.depth === 0) return 16;
          // Less padding between level 2 items
          if (node.depth === 1) return 4;
          return 2;
        })
        .round(true);

      return treemap(hierarchy);
    },
    [dimensions]
  );

  // Export to JPEG - draw directly on canvas for perfect rendering
  const handleExportJPG = useCallback(() => {
    if (isExporting) return;

    setIsExporting(true);
    setTooltip({ show: false, x: 0, y: 0, content: null });

    setTimeout(() => {
      try {
        // Get current treemap nodes
        const root = createTreemap(mockData);
        const displayRoot = currentRoot || root;
        const nodes = displayRoot.descendants().filter((d) => d.depth > 0);

        const { width, height } = dimensions;

        // Canvas settings
        const legendHeight = 50;
        const padding = 24;
        const scale = 2; // Higher resolution

        const canvas = document.createElement("canvas");
        canvas.width = (width + padding * 2) * scale;
        canvas.height = (height + legendHeight + padding * 2) * scale;

        const ctx = canvas.getContext("2d")!;
        ctx.scale(scale, scale);

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

        // Draw legend
        ctx.font = "600 12px Arial, sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText("Effectiveness:", padding, padding + 14);

        let legendX = padding + 90;
        EFFECTIVENESS_LEVELS.forEach((level) => {
          // Color box
          ctx.fillStyle = EFFECTIVENESS_COLORS[level];
          ctx.fillRect(legendX, padding + 2, 16, 16);
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.strokeRect(legendX, padding + 2, 16, 16);

          // Label
          ctx.fillStyle = "#475569";
          ctx.font = "500 11px Arial, sans-serif";
          ctx.fillText(level, legendX + 20, padding + 14);
          legendX += ctx.measureText(level).width + 45;
        });

        // Draw treemap cells
        const offsetY = legendHeight + padding;

        // Helper to get node color
        const getNodeColor = (d: d3.HierarchyRectangularNode<TreeMapNode>) => {
          if (d.data.color) return d.data.color;
          if (d.depth === 1) return LEVEL_1_COLOR;
          if (d.depth === 2) return LEVEL_2_COLOR;
          return LEVEL_2_COLOR;
        };

        // Helper to get text color
        const getTextColor = (bgColor: string) => {
          const darkColors = ["#dc2625", "#52796f"];
          return darkColors.includes(bgColor) ? "#ffffff" : "#1e293b";
        };

        // Sort nodes so parents are drawn first, then children on top
        const sortedNodes = [...nodes].sort((a, b) => a.depth - b.depth);

        sortedNodes.forEach((d) => {
          const x = d.x0 + padding;
          const y = d.y0 + offsetY;
          const w = d.x1 - d.x0;
          const h = d.y1 - d.y0;
          const color = getNodeColor(d);

          // Draw rectangle with rounded corners
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

          // Draw border
          ctx.strokeStyle = BORDER_COLOR;
          ctx.lineWidth = d.depth === 1 ? 2 : 1;
          ctx.stroke();

          // Draw text
          const textColor = getTextColor(color);
          ctx.fillStyle = textColor;

          if (d.children) {
            // Parent label (top-left)
            if (w > 60) {
              ctx.font = d.depth === 1 ? "700 14px Arial, sans-serif" : "600 12px Arial, sans-serif";
              ctx.fillText(d.data.name, x + 6, y + 18);
            }
          } else {
            // Leaf label (centered, with word wrap)
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

              // Limit lines to fit
              const maxLines = Math.floor((h - 8) / lineHeight);
              const displayLines = lines.slice(0, maxLines);

              // Draw centered lines
              const totalHeight = displayLines.length * lineHeight;
              const startY = y + (h - totalHeight) / 2 + lineHeight / 2;

              displayLines.forEach((line, i) => {
                ctx.fillText(line, x + w / 2, startY + i * lineHeight);
              });

              // Reset alignment
              ctx.textAlign = "left";
              ctx.textBaseline = "alphabetic";
            }
          }
        });

        // Export as JPEG
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
  }, [isExporting, createTreemap, mockData, currentRoot, dimensions]);

  // Draw the treemap with animations
  useEffect(() => {
    if (!svgRef.current || !mockData) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const root = createTreemap(mockData);

    // If we have a current zoomed root, use it; otherwise use the full root
    const displayRoot = currentRoot || root;

    // Get the nodes at the appropriate depth for display
    const getDisplayNodes = (node: d3.HierarchyRectangularNode<TreeMapNode>) => {
      return node.descendants().filter((d) => d.depth > 0);
    };

    const nodes = getDisplayNodes(displayRoot);

    // Create color scale for nodes based on depth and effectiveness
    const getNodeColor = (d: d3.HierarchyRectangularNode<TreeMapNode>) => {
      // Level 3 (interventions) - use effectiveness-based colors
      if (d.data.color) return d.data.color;
      // Level 1 (Sexual Violence / Physical Violence) - slate gray
      if (d.depth === 1) return LEVEL_1_COLOR;
      // Level 2 (Multi-Level / Multi-Component / Curriculum-Based) - lighter slate
      if (d.depth === 2) return LEVEL_2_COLOR;
      return LEVEL_2_COLOR;
    };

    // Get text color based on background
    const getTextColor = (bgColor: string) => {
      // For dark colors, use white text; for light colors, use dark text
      const darkColors = ["#dc2625", "#52796f"];
      return darkColors.includes(bgColor) ? "#ffffff" : "#1e293b";
    };

    // Main group
    let g = svg.select<SVGGElement>("g.main-group");
    if (g.empty()) {
      g = svg.append("g").attr("class", "main-group");
    }

    // DATA JOIN for cells
    const cell = g
      .selectAll<SVGGElement, d3.HierarchyRectangularNode<TreeMapNode>>("g.cell")
      .data(nodes, (d) => d.data.name + "-" + d.depth);

    // EXIT - animate out old cells
    cell.exit()
      .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", 0)
      .attr("transform", (d) => `translate(${width / 2},${height / 2})`)
      .remove();

    // ENTER - create new cells
    const cellEnter = cell.enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("opacity", 0);

    // Add rectangles to new cells
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

    // Add parent labels to new cells
    cellEnter
      .filter((d) => Boolean(d.children))
      .append("text")
      .attr("class", "parent-label")
      .attr("x", 6)
      .attr("y", 18)
      .attr("font-family", FONT_FAMILY)
      .attr("font-size", (d) => (d.depth === 1 ? 14 : 12))
      .attr("font-weight", (d) => (d.depth === 1 ? 700 : 600))
      .attr("fill", (d) => getTextColor(getNodeColor(d)))
      .attr("pointer-events", "none")
      .style("opacity", 0);

    // Add foreignObject for leaf labels (allows text wrapping)
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

    // MERGE - update all cells (existing + new)
    const cellMerge = cellEnter.merge(cell);

    // Animate position
    cellMerge
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("opacity", 1);

    // Animate rectangles
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

        if (!d.children && d.data.country) {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltip({
              show: true,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              content: {
                name: d.data.name,
                country: d.data.country,
                effectiveness: d.data.effectiveness,
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

    // Update parent labels
    cellMerge.select<SVGTextElement>("text.parent-label")
      .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", (d) => (d.x1 - d.x0 > 60 ? 1 : 0))
      .attr("fill", (d) => getTextColor(getNodeColor(d)))
      .text((d) => d.data.name); // Show full category names without truncation

    // Update leaf label containers (foreignObject)
    cellMerge.select<SVGForeignObjectElement>("foreignObject.leaf-label-container")
      .transition()
      .duration(TRANSITION_DURATION)
      .attr("width", (d) => Math.max(0, d.x1 - d.x0 - 8))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0 - 8))
      .style("opacity", (d) => ((d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 30 ? 1 : 0));

    // Update leaf label text content and colors
    cellMerge.select<HTMLDivElement>("foreignObject.leaf-label-container div.leaf-label-text")
      .style("color", (d) => getTextColor(d.data.color || "#f1f4f8"))
      .text((d) => d.data.name);

  }, [mockData, dimensions, currentRoot, createTreemap, isAnimating]);

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

      {/* Legend - Effectiveness-based */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <span className="text-slate-600 font-medium">Effectiveness:</span>
        {EFFECTIVENESS_LEVELS.map((level) => (
          <div key={level} className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded border border-slate-300"
              style={{ backgroundColor: EFFECTIVENESS_COLORS[level] }}
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
              <span className="text-slate-400">Country:</span>
              <span className="text-emerald-400">{tooltip.content.country}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Effectiveness:</span>
              <span
                className={
                  tooltip.content.effectiveness === "Always Works"
                    ? "text-teal-400"
                    : tooltip.content.effectiveness === "Mostly Works"
                    ? "text-green-300"
                    : tooltip.content.effectiveness === "Sometimes Works"
                    ? "text-orange-300"
                    : "text-red-400"
                }
              >
                {tooltip.content.effectiveness}
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
    </div>
  );
}
