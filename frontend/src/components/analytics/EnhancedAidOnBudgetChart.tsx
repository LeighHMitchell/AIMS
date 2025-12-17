"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, RefreshCw, TrendingUp, Wallet, PiggyBank, CircleDollarSign, HandCoins, HelpCircle, BarChart3, Table2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BudgetStatusType, getBudgetStatusLabel } from "@/types/activity-budget-status";
import Link from "next/link";
import {
  EnhancedAidOnBudgetSummary,
  EnhancedChartDataPoint,
  EnhancedAidOnBudgetChartData,
  ENHANCED_CHART_COLORS,
  ClassificationType,
} from "@/types/aid-on-budget";
import { getFiscalYearOptions } from "@/types/domestic-budget";

interface EnhancedAidOnBudgetChartProps {
  refreshKey?: number;
}

interface TooltipContent {
  title: string;
  values: { label: string; value: string; color?: string }[];
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  content: TooltipContent | null;
}

interface ApiResponse {
  success: boolean;
  summary: EnhancedAidOnBudgetSummary;
  chartData: EnhancedAidOnBudgetChartData;
  data: EnhancedChartDataPoint[];
  filters: {
    fiscalYear: number;
    classificationType: string;
  };
}

interface ActivityDetail {
  id: string;
  title: string;
  iatiIdentifier: string;
  partnerName: string;
  budgetStatus: BudgetStatusType;
  onBudgetPercentage: number | null;
  defaultAidType: string | null;
  isBudgetSupport: boolean;
  totalDisbursements: number;
  onBudgetAmount: number;
  offBudgetAmount: number;
  budgetClassifications: Array<{
    code: string;
    name: string;
    percentage: number;
  }>;
}

interface ActivitiesApiResponse {
  success: boolean;
  activities: ActivityDetail[];
  totals: {
    activities: number;
    totalDisbursements: number;
    onBudgetTotal: number;
    offBudgetTotal: number;
    onBudgetCount: number;
    offBudgetCount: number;
    partialCount: number;
    unknownCount: number;
    budgetSupportCount: number;
  };
}

type ViewMode = "chart" | "table";
type TableMode = "aggregate" | "activities";

export function EnhancedAidOnBudgetChart({ refreshKey }: EnhancedAidOnBudgetChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mainGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  // Filters - "all" means all years combined
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [classificationType, setClassificationType] = useState<ClassificationType>("functional");

  // Zoom state - null means no zoom, otherwise contains the target info
  const [zoomTarget, setZoomTarget] = useState<{ type: 'center' | 'satellite'; index?: number; x?: number; y?: number } | null>(null);

  // Pan state - tracks manual panning offset (using ref for smooth updates without re-renders)
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [tableMode, setTableMode] = useState<TableMode>("aggregate");
  const [activitiesData, setActivitiesData] = useState<ActivitiesApiResponse | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>("all");
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  // Chart dimensions (constants for zoom calculations)
  const chartWidth = 1200;
  const chartHeight = 700;

  const fiscalYearOptions = getFiscalYearOptions();

  // Format number to abbreviated form
  const formatAbbreviated = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Format currency - always in USD (transactions are converted using value_usd)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedYear !== "all") {
        params.set("fiscalYear", selectedYear.toString());
      }
      // If selectedYear is "all", don't send fiscalYear param - API will aggregate all years
      params.set("classificationType", classificationType);

      const response = await fetch(
        `/api/analytics/aid-on-budget-enhanced?${params.toString()}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result);
    } catch (err: any) {
      console.error("[EnhancedAidOnBudgetChart] Error:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, classificationType]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Fetch activities data for table view
  const fetchActivitiesData = useCallback(async () => {
    try {
      setActivitiesLoading(true);

      const params = new URLSearchParams();
      if (selectedYear !== "all") {
        params.set("fiscalYear", selectedYear.toString());
      }
      if (budgetStatusFilter !== "all") {
        params.set("budgetStatus", budgetStatusFilter);
      }

      const response = await fetch(
        `/api/analytics/aid-on-budget-activities?${params.toString()}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch activities");
      }

      setActivitiesData(result);
    } catch (err: any) {
      console.error("[EnhancedAidOnBudgetChart] Error fetching activities:", err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [selectedYear, budgetStatusFilter]);

  // Fetch activities when switching to table view with activities mode
  useEffect(() => {
    if (viewMode === "table" && tableMode === "activities") {
      fetchActivitiesData();
    }
  }, [viewMode, tableMode, fetchActivitiesData]);

  // Toggle activity expansion
  const toggleActivityExpansion = (activityId: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Get badge variant for budget status
  const getBudgetStatusBadge = (status: BudgetStatusType, isBudgetSupport: boolean) => {
    if (isBudgetSupport) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">Budget Support</Badge>;
    }
    switch (status) {
      case "on_budget":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">On Budget</Badge>;
      case "off_budget":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Off Budget</Badge>;
      case "partial":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Partial</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Unknown</Badge>;
    }
  };

  // Render D3 chart when data changes (NOT when zoom changes)
  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove();
    mainGroupRef.current = null;

    const { summary, chartData } = data;

    // Color palette - brand colors
    const palette = {
      primaryScarlet: '#dc2625',  // Primary Scarlet - for off-budget/alerts
      paleSlate: '#cfd0d5',       // Pale Slate - for borders/subtle elements
      blueSlate: '#4c5568',       // Blue Slate - for text/domestic spending
      coolSteel: '#7b95a7',       // Cool Steel - for on-budget aid
      platinum: '#f1f4f8'         // Platinum - for backgrounds
    };

    // Check if there's any data to show
    if (summary.totalAid === 0 && summary.totalDomesticExpenditure === 0 && summary.totalBudgetSupport === 0) {
      const svg = d3.select(svgRef.current).attr("viewBox", `0 0 900 700`);

      svg
        .append("text")
        .attr("x", 450)
        .attr("y", 320)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", palette.blueSlate)
        .text("No budget data available for this period.");

      svg
        .append("text")
        .attr("x", 450)
        .attr("y", 350)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", palette.coolSteel)
        .text("Add domestic budget data and activity budget status to see analytics.");

      return;
    }

    // SETUP - larger canvas for orbital layout
    const width = chartWidth;
    const height = chartHeight;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);

    // Add invisible background rect for click-outside-to-reset-zoom and panning
    const backgroundRect = svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "grab")
      .on("click", function(event: MouseEvent) {
        // Only reset zoom if this was a click, not end of a drag
        const target = event.target as Element;
        if (!target.classList.contains('dragging')) {
          setZoomTarget(null);
          panOffsetRef.current = { x: 0, y: 0 }; // Also reset pan
        }
      });

    // Start at center, no zoom
    const initialTransform = `translate(${width / 2}, ${height / 2})`;

    const g = svg.append("g")
      .attr("class", "main-group")
      .attr("transform", initialTransform);

    // Store reference for zoom animations
    mainGroupRef.current = g;

    // Set up D3 zoom behavior for panning and pinch-to-zoom
    let isDragging = false;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4]) // Allow zoom from 0.5x to 4x
      .on("start", function(event) {
        if (event.sourceEvent?.type === "mousedown" || event.sourceEvent?.type === "touchstart") {
          isDragging = true;
          d3.select(this).style("cursor", "grabbing");
          backgroundRect.classed("dragging", true);
        }
      })
      .on("zoom", function(event) {
        if (mainGroupRef.current) {
          // Get the full transform from the zoom event (includes scale for pinch-to-zoom)
          const { x, y, k } = event.transform;
          // Apply pan offset relative to center
          const newPanX = x - width / 2;
          const newPanY = y - height / 2;
          panOffsetRef.current = { x: newPanX, y: newPanY };

          // Directly update transform for smooth panning and zooming (no React re-render)
          mainGroupRef.current.attr("transform", `translate(${x}, ${y}) scale(${k})`);
        }
      })
      .on("end", function() {
        isDragging = false;
        d3.select(this).style("cursor", "grab");
        // Delay removing dragging class to prevent click from firing
        setTimeout(() => backgroundRect.classed("dragging", false), 100);
      });

    // Apply zoom behavior to svg
    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2 + panOffsetRef.current.x, height / 2 + panOffsetRef.current.y));

    // Prepare center donut data with 4 categories
    const centerData = chartData.centerData.breakdown.filter((d) => d.value > 0);
    const totalValue = chartData.centerData.total;

    // Tooltip handlers
    const showTooltip = (event: MouseEvent, content: TooltipContent) => {
      if (!svgRef.current) return;
      const svgRect = svgRef.current.getBoundingClientRect();
      setTooltip({
        show: true,
        x: event.clientX - svgRect.left + 10,
        y: event.clientY - svgRect.top - 10,
        content,
      });
    };

    const hideTooltip = () => {
      setTooltip({ show: false, x: 0, y: 0, content: null });
    };

    // ORBIT - for sector satellites
    const sectorData = chartData.sectorData.filter(s =>
      s.domesticBudget > 0 || s.domesticExpenditure > 0 || s.onBudgetAid > 0 || s.offBudgetAid > 0
    );
    // Always show orbit if there's at least one sector with data - larger radius to fit bigger satellites
    const orbitRadius = sectorData.length >= 1 ? 380 : 0;

    if (sectorData.length >= 1) {
      g.append("circle")
        .attr("r", orbitRadius)
        .attr("fill", "none")
        .attr("stroke", palette.paleSlate)
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "8 6")
        .attr("opacity", 0.6);
    }

    // CENTER DONUT - shows the 4 categories
    const centerRadius = 110;
    const centerThickness = 22;

    if (centerData.length > 0) {
      const pieGenerator = d3.pie<{ type: string; value: number; color: string }>()
        .value(d => d.value)
        .sort(null);

      const centerArc = d3.arc<d3.PieArcDatum<{ type: string; value: number; color: string }>>()
        .innerRadius(centerRadius)
        .outerRadius(centerRadius + centerThickness);

      g.selectAll(".center-slice")
        .data(pieGenerator(centerData))
        .enter()
        .append("path")
        .attr("d", centerArc)
        .attr("fill", d => d.data.color)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event: MouseEvent, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("transform", "scale(1.05)");

          const percentage = totalValue > 0 ? ((d.data.value / totalValue) * 100).toFixed(1) : "0";
          showTooltip(event, {
            title: d.data.type,
            values: [
              { label: "Amount", value: formatCurrency(d.data.value), color: d.data.color },
              { label: "Share", value: `${percentage}%` },
            ],
          });
        })
        .on("mousemove", function(event: MouseEvent, d) {
          const percentage = totalValue > 0 ? ((d.data.value / totalValue) * 100).toFixed(1) : "0";
          showTooltip(event, {
            title: d.data.type,
            values: [
              { label: "Amount", value: formatCurrency(d.data.value), color: d.data.color },
              { label: "Share", value: `${percentage}%` },
            ],
          });
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("transform", "scale(1)");
          hideTooltip();
        })
        .on("click", function(event: MouseEvent) {
          event.stopPropagation(); // Prevent background click
          // Toggle zoom on center
          if (zoomTarget?.type === 'center') {
            setZoomTarget(null);
          } else {
            setZoomTarget({ type: 'center' });
          }
        });
    }

    // Center circle with white background - also clickable
    g.append("circle")
      .attr("r", centerRadius)
      .attr("fill", "#ffffff")
      .style("cursor", "pointer")
      .on("click", function(event: MouseEvent) {
        event.stopPropagation(); // Prevent background click
        if (zoomTarget?.type === 'center') {
          setZoomTarget(null);
        } else {
          setZoomTarget({ type: 'center' });
        }
      });

    // Center text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.8em")
      .attr("font-size", "22px")
      .attr("font-weight", "bold")
      .attr("fill", palette.blueSlate)
      .text(formatAbbreviated(totalValue));

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.8em")
      .attr("font-size", "11px")
      .attr("fill", palette.blueSlate)
      .text("Total Spending (USD)");

    // Show on-budget percentage
    const onBudgetTotal = summary.totalOnBudgetAid + summary.totalPartialAid + summary.totalBudgetSupport;
    const onBudgetPct = totalValue > 0 ? ((onBudgetTotal / totalValue) * 100).toFixed(0) : "0";
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "2.2em")
      .attr("font-size", "11px")
      .attr("fill", palette.blueSlate)
      .text(`${onBudgetPct}% Aid On Budget`);

    // SATELLITES (Budget Classifications) - only if there are classifications with data
    if (sectorData.length > 0) {
      const maxValue = d3.max(sectorData, d => d.domesticExpenditure + d.onBudgetAid + d.offBudgetAid) || 1;
      // Larger satellites to show full names without clipping
      const rScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range([40, 75]);

      const angleStep = (2 * Math.PI) / sectorData.length;

      sectorData.forEach((sector, i) => {
        const angle = (i * angleStep) - (Math.PI / 2);
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        const sectorTotal = sector.domesticExpenditure + sector.onBudgetAid + sector.offBudgetAid;
        const r = rScale(sectorTotal);

        const planetGroup = g.append("g")
          .attr("transform", `translate(${x}, ${y})`)
          .style("cursor", "pointer");

        // Build pie data for this satellite - same categories as center donut
        const satellitePieData = [
          { type: "Domestic", value: sector.domesticExpenditure, color: palette.blueSlate },
          { type: "On-Budget Aid", value: sector.onBudgetAid, color: palette.coolSteel },
          { type: "Off-Budget Aid", value: sector.offBudgetAid, color: palette.primaryScarlet },
        ].filter(d => d.value > 0);

        // If no data, show a gray circle
        if (satellitePieData.length === 0) {
          planetGroup.append("circle")
            .attr("r", r)
            .attr("fill", palette.paleSlate)
            .attr("opacity", 0.5);
        } else {
          // Create mini donut for the satellite
          const satellitePie = d3.pie<{ type: string; value: number; color: string }>()
            .value(d => d.value)
            .sort(null);

          const satelliteArc = d3.arc<d3.PieArcDatum<{ type: string; value: number; color: string }>>()
            .innerRadius(r * 0.65)
            .outerRadius(r);

          // Add white background circle
          planetGroup.append("circle")
            .attr("r", r)
            .attr("fill", "#ffffff")
            .attr("stroke", palette.paleSlate)
            .attr("stroke-width", 1);

          // Add pie slices
          planetGroup.selectAll(".satellite-slice")
            .data(satellitePie(satellitePieData))
            .enter()
            .append("path")
            .attr("d", satelliteArc)
            .attr("fill", d => d.data.color)
            .attr("stroke", "white")
            .attr("stroke-width", 1);

          // Add inner white circle
          planetGroup.append("circle")
            .attr("r", r * 0.65)
            .attr("fill", "#ffffff");
        }

        // Invisible overlay circle for hover events
        planetGroup.append("circle")
          .attr("r", r)
          .attr("fill", "transparent")
          .attr("stroke", "transparent")
          .on("mouseover", function(event: MouseEvent) {
            planetGroup.select("circle:first-of-type")
              .transition()
              .duration(150)
              .attr("r", r * 1.1);
            planetGroup.selectAll("path")
              .transition()
              .duration(150)
              .attr("transform", "scale(1.1)");

            const pct = totalValue > 0 ? ((sectorTotal / totalValue) * 100).toFixed(1) : '0.0';
            showTooltip(event, {
              title: `${sector.code} - ${sector.name}`,
              values: [
                { label: "Total", value: formatCurrency(sectorTotal) },
                { label: "Domestic", value: formatCurrency(sector.domesticExpenditure), color: palette.blueSlate },
                { label: "On-Budget Aid", value: formatCurrency(sector.onBudgetAid), color: palette.coolSteel },
                { label: "Off-Budget Aid", value: formatCurrency(sector.offBudgetAid), color: palette.primaryScarlet },
                { label: "Share", value: `${pct}%` },
              ],
            });
          })
          .on("mousemove", function(event: MouseEvent) {
            const pct = totalValue > 0 ? ((sectorTotal / totalValue) * 100).toFixed(1) : '0.0';
            showTooltip(event, {
              title: `${sector.code} - ${sector.name}`,
              values: [
                { label: "Total", value: formatCurrency(sectorTotal) },
                { label: "Domestic", value: formatCurrency(sector.domesticExpenditure), color: palette.blueSlate },
                { label: "On-Budget Aid", value: formatCurrency(sector.onBudgetAid), color: palette.coolSteel },
                { label: "Off-Budget Aid", value: formatCurrency(sector.offBudgetAid), color: palette.primaryScarlet },
                { label: "Share", value: `${pct}%` },
              ],
            });
          })
          .on("mouseout", function() {
            planetGroup.select("circle:first-of-type")
              .transition()
              .duration(150)
              .attr("r", r);
            planetGroup.selectAll("path")
              .transition()
              .duration(150)
              .attr("transform", "scale(1)");
            hideTooltip();
          })
          .on("click", function(event: MouseEvent) {
            event.stopPropagation(); // Prevent background click
            // Toggle zoom on this satellite
            if (zoomTarget?.type === 'satellite' && zoomTarget.index === i) {
              setZoomTarget(null);
            } else {
              setZoomTarget({ type: 'satellite', index: i, x, y });
            }
          });

        // Value text (inside the donut hole) - larger for bigger satellites
        planetGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "-0.1em")
          .attr("font-size", r > 60 ? "16px" : r > 45 ? "14px" : "12px")
          .attr("font-weight", "bold")
          .attr("fill", palette.blueSlate)
          .text(formatAbbreviated(sectorTotal));

        // Name text (wrapped if needed) - improved for larger satellites
        const words = sector.name.split(" ");
        const maxCharsPerLine = Math.floor(r / 4); // More chars allowed in larger circles

        if (words.length > 1 && sector.name.length > maxCharsPerLine) {
          // Split into multiple lines for long names
          const midpoint = Math.ceil(words.length / 2);
          const line1 = words.slice(0, midpoint).join(" ");
          const line2 = words.slice(midpoint).join(" ");

          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.0em")
            .attr("font-size", r > 50 ? "12px" : "11px")
            .attr("fill", palette.blueSlate)
            .text(line1.length > maxCharsPerLine ? line1.slice(0, maxCharsPerLine) + "..." : line1);

          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "2.2em")
            .attr("font-size", r > 50 ? "12px" : "11px")
            .attr("fill", palette.blueSlate)
            .text(line2.length > maxCharsPerLine ? line2.slice(0, maxCharsPerLine) + "..." : line2);
        } else {
          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.1em")
            .attr("font-size", r > 50 ? "12px" : "11px")
            .attr("fill", palette.blueSlate)
            .text(sector.name.length > maxCharsPerLine ? sector.name.slice(0, maxCharsPerLine) + "..." : sector.name);
        }
      });
    }

    // Stats in bottom left
    const stats = svg.append("g")
      .attr("transform", `translate(20, ${height - 80})`);

    stats.append("text")
      .attr("font-size", "12px")
      .attr("fill", palette.blueSlate)
      .text(`Activities: ${summary.activityCount} total`);

    stats.append("text")
      .attr("y", 20)
      .attr("font-size", "12px")
      .attr("fill", palette.blueSlate)
      .text(`On Budget: ${summary.onBudgetActivityCount} | Off Budget: ${summary.offBudgetActivityCount} | Budget Support: ${summary.budgetSupportActivityCount}`);

  }, [data]); // Only re-render when data changes, NOT when zoom changes

  // Separate useEffect for animated zoom transitions
  useEffect(() => {
    if (!mainGroupRef.current) return;

    const width = chartWidth;
    const height = chartHeight;

    // When zooming, reset pan offset and animate to target
    // Calculate target transform based on zoomTarget
    let targetTransform: string;
    if (zoomTarget) {
      // Reset pan when zooming to a target
      panOffsetRef.current = { x: 0, y: 0 };

      const zoomScale = 2.5;
      if (zoomTarget.type === 'center') {
        // Zoom to center - scale up from center
        targetTransform = `translate(${width / 2}, ${height / 2}) scale(${zoomScale})`;
      } else if (zoomTarget.type === 'satellite' && zoomTarget.x !== undefined && zoomTarget.y !== undefined) {
        // Zoom to satellite - translate so satellite is centered, then scale
        const offsetX = -zoomTarget.x * zoomScale;
        const offsetY = -zoomTarget.y * zoomScale;
        targetTransform = `translate(${width / 2 + offsetX}, ${height / 2 + offsetY}) scale(${zoomScale})`;
      } else {
        targetTransform = `translate(${width / 2}, ${height / 2})`;
      }
    } else {
      // No zoom - return to default view (also reset pan)
      panOffsetRef.current = { x: 0, y: 0 };
      targetTransform = `translate(${width / 2}, ${height / 2})`;
    }

    // Animate the transform change using D3 transition
    mainGroupRef.current
      .transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .attr("transform", targetTransform);

  }, [zoomTarget, chartWidth, chartHeight]);

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aid on Budget Analysis
          </CardTitle>
          <CardDescription>
            Comparing domestic spending with donor aid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[700px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aid on Budget Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[700px] text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Error loading data</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Aid on Budget Analysis
            </CardTitle>
            <CardDescription>
              Comparing domestic spending with donor aid {selectedYear === "all" ? "across all years" : `for fiscal year ${selectedYear}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="year-select" className="text-sm">
                Year:
              </Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(v === "all" ? "all" : parseInt(v))}
              >
                <SelectTrigger id="year-select" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {fiscalYearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="type-select" className="text-sm">
                Type:
              </Label>
              <Select
                value={classificationType}
                onValueChange={(v) => setClassificationType(v as ClassificationType)}
              >
                <SelectTrigger id="type-select" className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="economic">Economic</SelectItem>
                  <SelectItem value="programme">Programme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" title="Refresh data">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {/* View Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "chart" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("chart")}
                className="rounded-r-none"
                title="Chart View"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-l-none"
                title="Table View"
              >
                <Table2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards - Monochrome with white background */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: '#4c5568' }}>
                <div className="w-5 h-5 rounded" style={{ backgroundColor: '#4c5568' }} />
                Domestic Spending
                <HelpTextTooltip>
                  <p className="font-semibold mb-1">Domestic Spending</p>
                  <p className="text-xs">Total government expenditure from domestic budget data entered in the system.</p>
                  <p className="text-xs mt-1"><strong>Calculation:</strong> Sum of all expenditure amounts from the Domestic Budget Data table for the selected fiscal year(s).</p>
                </HelpTextTooltip>
              </div>
              <div className="text-xl font-bold" style={{ color: '#4c5568' }}>
                {formatCurrency(summary.totalDomesticExpenditure)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#7b95a7' }}>
                {summary.domesticExecutionRate.toFixed(1)}% execution rate
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: '#4c5568' }}>
                <div className="w-5 h-5 rounded" style={{ backgroundColor: '#7b95a7' }} />
                Aid on Budget
                <HelpTextTooltip>
                  <p className="font-semibold mb-1">Aid on Budget</p>
                  <p className="text-xs">Foreign aid that is recorded in the government&apos;s budget system.</p>
                  <p className="text-xs mt-1"><strong>Calculation:</strong> Sum of disbursements from activities with Budget Status set to &quot;On Budget&quot;, plus the on-budget portion of activities marked as &quot;Partial&quot;.</p>
                </HelpTextTooltip>
              </div>
              <div className="text-xl font-bold" style={{ color: '#4c5568' }}>
                {formatCurrency(summary.totalOnBudgetAid + summary.totalPartialAid)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#7b95a7' }}>
                {summary.onBudgetActivityCount + summary.partialActivityCount} activities
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: '#4c5568' }}>
                <div className="w-5 h-5 rounded" style={{ backgroundColor: '#dc2625' }} />
                Aid off Budget
                <HelpTextTooltip>
                  <p className="font-semibold mb-1">Aid off Budget</p>
                  <p className="text-xs">Foreign aid that is NOT recorded in the government&apos;s budget system.</p>
                  <p className="text-xs mt-1"><strong>Calculation:</strong> Sum of disbursements from activities with Budget Status set to &quot;Off Budget&quot; or &quot;Unknown&quot;, plus the off-budget portion of activities marked as &quot;Partial&quot;.</p>
                </HelpTextTooltip>
              </div>
              <div className="text-xl font-bold" style={{ color: '#4c5568' }}>
                {formatCurrency(summary.totalOffBudgetAid + summary.totalUnknownAid)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#7b95a7' }}>
                {summary.offBudgetActivityCount + summary.unknownActivityCount} activities
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: '#4c5568' }}>
                <div className="w-5 h-5 rounded" style={{ backgroundColor: '#cfd0d5' }} />
                Budget Support
                <HelpTextTooltip>
                  <p className="font-semibold mb-1">Budget Support</p>
                  <p className="text-xs">Direct financial contributions to the government&apos;s general or sector budgets.</p>
                  <p className="text-xs mt-1"><strong>Calculation:</strong> Sum of disbursements from activities with Aid Type code A01 (General Budget Support) or A02 (Sector Budget Support). These are counted separately from regular on/off budget aid.</p>
                </HelpTextTooltip>
              </div>
              <div className="text-xl font-bold" style={{ color: '#4c5568' }}>
                {formatCurrency(summary.totalBudgetSupport)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#7b95a7' }}>
                {summary.budgetSupportActivityCount} activities (A01/A02)
              </div>
            </div>
          </div>
        )}

        {/* Chart View */}
        {viewMode === "chart" && (
          <>
            {/* Orbital Chart */}
            <div className="relative w-full flex items-center justify-center bg-white" style={{ minHeight: '700px' }}>
              {/* Reset Zoom Button */}
              {zoomTarget && (
                <Button
                  onClick={() => setZoomTarget(null)}
                  variant="outline"
                  size="sm"
                  className="absolute top-4 left-4 z-10 bg-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Zoom
                </Button>
              )}
              <svg ref={svgRef} className="w-full h-auto" style={{ maxHeight: '700px' }} />

              {/* Tooltip */}
              {tooltip.show && tooltip.content && (
                <div
                  className="absolute pointer-events-none z-50 rounded-lg shadow-lg"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: 'translate(0, -100%)',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cfd0d5'
                  }}
                >
                  <div
                    className="font-semibold text-sm px-3 py-2 border-b"
                    style={{ color: '#4c5568', backgroundColor: '#f1f4f8' }}
                  >
                    {tooltip.content.title}
                  </div>
                  <table className="text-sm">
                    <tbody>
                      {tooltip.content.values.map((item, i) => (
                        <tr key={i} className="border-b last:border-b-0" style={{ borderColor: '#e5e7eb' }}>
                          <td className="px-3 py-1.5 text-left" style={{ color: '#6b7280' }}>
                            {item.label}
                          </td>
                          <td
                            className="px-3 py-1.5 text-right font-medium"
                            style={{ color: item.color || '#4c5568' }}
                          >
                            {item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Activity Status Breakdown */}
            {summary && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3" style={{ color: '#4c5568' }}>
                  Activity Budget Status Distribution
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-white border-slate-300" style={{ color: '#4c5568' }}>
                    On Budget: {summary.onBudgetActivityCount}
                  </Badge>
                  <Badge variant="outline" className="bg-white border-slate-300" style={{ color: '#4c5568' }}>
                    Partial: {summary.partialActivityCount}
                  </Badge>
                  <Badge variant="outline" className="bg-white border-slate-300" style={{ color: '#4c5568' }}>
                    Off Budget: {summary.offBudgetActivityCount}
                  </Badge>
                  <Badge variant="outline" className="bg-white border-slate-300" style={{ color: '#4c5568' }}>
                    Unknown: {summary.unknownActivityCount}
                  </Badge>
                  <Badge variant="outline" className="bg-white border-slate-300" style={{ color: '#4c5568' }}>
                    Budget Support: {summary.budgetSupportActivityCount}
                  </Badge>
                </div>
                <p className="text-xs mt-2" style={{ color: '#7b95a7' }}>
                  Total: {summary.activityCount} activities |{" "}
                  {summary.onBudgetPercentage.toFixed(1)}% of project aid is on budget |{" "}
                  {summary.aidShareOfBudget.toFixed(1)}% aid share of total spending
                </p>
              </div>
            )}
          </>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="space-y-4">
            {/* Table Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Show:</Label>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={tableMode === "aggregate" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTableMode("aggregate")}
                    className="rounded-r-none text-xs"
                  >
                    Aggregate
                  </Button>
                  <Button
                    variant={tableMode === "activities" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTableMode("activities")}
                    className="rounded-l-none text-xs"
                  >
                    Activities
                  </Button>
                </div>
              </div>
              {tableMode === "activities" && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Filter:</Label>
                  <Select
                    value={budgetStatusFilter}
                    onValueChange={setBudgetStatusFilter}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="on_budget">On Budget</SelectItem>
                      <SelectItem value="off_budget">Off Budget</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="budget_support">Budget Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Aggregate Table */}
            {tableMode === "aggregate" && data?.chartData?.sectorData && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Classification</TableHead>
                      <TableHead className="font-semibold text-right">Domestic Spending</TableHead>
                      <TableHead className="font-semibold text-right">Aid on Budget</TableHead>
                      <TableHead className="font-semibold text-right">Aid off Budget</TableHead>
                      <TableHead className="font-semibold text-right">Total</TableHead>
                      <TableHead className="font-semibold text-right">Aid Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.chartData.sectorData
                      .filter(s => s.domesticExpenditure > 0 || s.onBudgetAid > 0 || s.offBudgetAid > 0)
                      .map((sector) => {
                        const total = sector.domesticExpenditure + sector.onBudgetAid + sector.offBudgetAid;
                        return (
                          <TableRow key={sector.code}>
                            <TableCell className="font-medium">
                              <span className="text-sm text-gray-500 mr-2">{sector.code}</span>
                              {sector.name}
                            </TableCell>
                            <TableCell className="text-right" style={{ color: '#4c5568' }}>
                              {formatCurrency(sector.domesticExpenditure)}
                            </TableCell>
                            <TableCell className="text-right" style={{ color: '#7b95a7' }}>
                              {formatCurrency(sector.onBudgetAid)}
                            </TableCell>
                            <TableCell className="text-right" style={{ color: '#dc2625' }}>
                              {formatCurrency(sector.offBudgetAid)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(total)}
                            </TableCell>
                            <TableCell className="text-right">
                              {total > 0 ? ((sector.onBudgetAid / total) * 100).toFixed(1) : 0}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {/* Totals Row */}
                    {summary && (
                      <TableRow className="bg-slate-50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right" style={{ color: '#4c5568' }}>
                          {formatCurrency(summary.totalDomesticExpenditure)}
                        </TableCell>
                        <TableCell className="text-right" style={{ color: '#7b95a7' }}>
                          {formatCurrency(summary.totalOnBudgetAid + summary.totalPartialAid)}
                        </TableCell>
                        <TableCell className="text-right" style={{ color: '#dc2625' }}>
                          {formatCurrency(summary.totalOffBudgetAid + summary.totalUnknownAid)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(summary.totalSpending)}
                        </TableCell>
                        <TableCell className="text-right">
                          {summary.aidShareOfBudget.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Activities Table */}
            {tableMode === "activities" && (
              <div className="border rounded-lg overflow-hidden">
                {activitiesLoading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Loading activities...</p>
                  </div>
                ) : activitiesData?.activities && activitiesData.activities.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-8"></TableHead>
                          <TableHead className="font-semibold">Activity</TableHead>
                          <TableHead className="font-semibold">Partner</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-right">Total Disbursements</TableHead>
                          <TableHead className="font-semibold text-right">On Budget</TableHead>
                          <TableHead className="font-semibold text-right">Off Budget</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activitiesData.activities.map((activity) => (
                          <React.Fragment key={activity.id}>
                            <TableRow
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => toggleActivityExpansion(activity.id)}
                            >
                              <TableCell className="w-8">
                                {activity.budgetClassifications.length > 0 && (
                                  expandedActivities.has(activity.id)
                                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                    : <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium truncate max-w-[300px]" title={activity.title}>
                                  {activity.title}
                                </div>
                                {activity.iatiIdentifier && (
                                  <div className="text-xs text-gray-500">{activity.iatiIdentifier}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{activity.partnerName}</TableCell>
                              <TableCell>
                                {getBudgetStatusBadge(activity.budgetStatus, activity.isBudgetSupport)}
                                {activity.budgetStatus === "partial" && activity.onBudgetPercentage && (
                                  <span className="ml-1 text-xs text-gray-500">
                                    ({activity.onBudgetPercentage}%)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(activity.totalDisbursements)}
                              </TableCell>
                              <TableCell className="text-right" style={{ color: '#7b95a7' }}>
                                {formatCurrency(activity.onBudgetAmount)}
                              </TableCell>
                              <TableCell className="text-right" style={{ color: '#dc2625' }}>
                                {formatCurrency(activity.offBudgetAmount)}
                              </TableCell>
                              <TableCell className="w-10">
                                <Link href={`/activities/${activity.id}`} onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" title="View Activity">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                            {/* Expanded Row - Budget Classifications */}
                            {expandedActivities.has(activity.id) && activity.budgetClassifications.length > 0 && (
                              <TableRow className="bg-slate-50/50">
                                <TableCell colSpan={8} className="py-2 px-8">
                                  <div className="text-xs text-gray-600 mb-1 font-medium">Budget Classifications:</div>
                                  <div className="flex flex-wrap gap-2">
                                    {activity.budgetClassifications.map((bc, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {bc.code} - {bc.name} ({bc.percentage}%)
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                        {/* Totals Row */}
                        {activitiesData.totals && (
                          <TableRow className="bg-slate-100 font-semibold">
                            <TableCell></TableCell>
                            <TableCell>Total ({activitiesData.totals.activities} activities)</TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(activitiesData.totals.totalDisbursements)}
                            </TableCell>
                            <TableCell className="text-right" style={{ color: '#7b95a7' }}>
                              {formatCurrency(activitiesData.totals.onBudgetTotal)}
                            </TableCell>
                            <TableCell className="text-right" style={{ color: '#dc2625' }}>
                              {formatCurrency(activitiesData.totals.offBudgetTotal)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {/* Status Summary */}
                    <div className="p-3 bg-slate-50 border-t text-xs text-gray-600">
                      <span className="font-medium">Status breakdown: </span>
                      On Budget: {activitiesData.totals.onBudgetCount} |
                      Off Budget: {activitiesData.totals.offBudgetCount} |
                      Partial: {activitiesData.totals.partialCount} |
                      Unknown: {activitiesData.totals.unknownCount} |
                      Budget Support: {activitiesData.totals.budgetSupportCount}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No activities with disbursements found for the selected filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
