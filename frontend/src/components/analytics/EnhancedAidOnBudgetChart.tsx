"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { AlertCircle, RefreshCw, TrendingUp, Wallet, PiggyBank, CircleDollarSign, HandCoins, HelpCircle, PieChart, Table2, ChevronDown, ChevronRight, Download, CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
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
import { apiFetch } from '@/lib/api-fetch';

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
  partnerAcronym: string | null;
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
    classificationType: string;
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

  // Year range selection
  const currentYear = new Date().getFullYear();
  const minYear = 2010;
  const maxYear = currentYear + 5;
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);

  // Generate year options for the selector grid
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y);
    }
    return years;
  }, [minYear, maxYear]);

  // Get formatted year label
  const getYearDisplayLabel = useCallback((year: number) => {
    return `CY${year}`;
  }, []);

  // Check if a year is between start and end (for highlighting)
  const isYearInRange = useCallback((year: number) => {
    if (!startYear || !endYear) return false;
    return year > Math.min(startYear, endYear) && year < Math.max(startYear, endYear);
  }, [startYear, endYear]);

  // Handle year click for range selection
  const handleYearClick = useCallback((year: number) => {
    if (!startYear && !endYear) {
      // No selection yet - set as start
      setStartYear(year);
      setEndYear(year);
    } else if (startYear && endYear && startYear === endYear) {
      // Single year selected - extend range
      if (year < startYear) {
        setStartYear(year);
      } else if (year > endYear) {
        setEndYear(year);
      } else {
        // Same year clicked - reset
        setStartYear(year);
        setEndYear(year);
      }
    } else if (startYear && endYear) {
      // Range selected - start new selection
      setStartYear(year);
      setEndYear(year);
    }
  }, [startYear, endYear]);

  // Select all years
  const selectAllYears = useCallback(() => {
    setStartYear(null);
    setEndYear(null);
  }, []);

  // Select only years with actual data (default to recent 8 years)
  const selectDataRange = useCallback(() => {
    setStartYear(currentYear - 7);
    setEndYear(currentYear);
  }, [currentYear]);

  // Filters
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
  const [expandedStatusGroups, setExpandedStatusGroups] = useState<Set<string>>(new Set());
  const [expandedClassifications, setExpandedClassifications] = useState<Set<string>>(new Set());

  // Chart dimensions (constants for zoom calculations)
  const chartWidth = 1200;
  const chartHeight = 700;

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

  // Export table data to CSV
  const exportToCSV = () => {
    if (!data?.chartData) return;

    const rows: string[][] = [];
    
    // Header row
    rows.push([
      "Classification Code",
      "Classification Name", 
      "Domestic Expenditure (USD)",
      "On-Budget Aid (USD)",
      "Off-Budget Aid (USD)",
      "On-Budget Total (USD)",
      "Grand Total (USD)",
      "Aid Share %"
    ]);

    // Data rows
    data.chartData.forEach((sector) => {
      const onBudgetTotal = sector.domesticExpenditure + sector.onBudgetAid;
      const grandTotal = sector.domesticExpenditure + sector.onBudgetAid + sector.offBudgetAid;
      const aidSharePct = grandTotal > 0 ? (((sector.onBudgetAid + sector.offBudgetAid) / grandTotal) * 100).toFixed(1) : "0";
      rows.push([
        sector.code,
        sector.name,
        sector.domesticExpenditure.toString(),
        sector.onBudgetAid.toString(),
        sector.offBudgetAid.toString(),
        onBudgetTotal.toString(),
        grandTotal.toString(),
        aidSharePct
      ]);
    });

    // Convert to CSV string
    const csvContent = rows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `aid-on-budget-${classificationType}-${selectedCustomYearId || "all"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startYear) {
        params.set("startYear", startYear.toString());
      }
      if (endYear) {
        params.set("endYear", endYear.toString());
      }
      params.set("classificationType", classificationType);

      const response = await apiFetch(`/api/analytics/aid-on-budget-enhanced?${params.toString()}`
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
  }, [startYear, endYear, classificationType]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Fetch activities data for table view
  const fetchActivitiesData = useCallback(async () => {
    try {
      setActivitiesLoading(true);

      const params = new URLSearchParams();
      if (startYear) {
        params.set("startYear", startYear.toString());
      }
      if (endYear) {
        params.set("endYear", endYear.toString());
      }
      if (budgetStatusFilter !== "all") {
        params.set("budgetStatus", budgetStatusFilter);
      }

      const response = await apiFetch(`/api/analytics/aid-on-budget-activities?${params.toString()}`
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
  }, [startYear, endYear, budgetStatusFilter]);

  // Fetch activities when switching to table view
  useEffect(() => {
    if (viewMode === "table") {
      fetchActivitiesData();
    }
  }, [viewMode, fetchActivitiesData]);

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

  // Toggle status group expansion
  const toggleStatusGroup = (status: string) => {
    setExpandedStatusGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  // Toggle classification expansion
  const toggleClassification = (code: string) => {
    setExpandedClassifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  // Get activities for a specific classification code
  // Filter by both code AND classification type to ensure correct matching across views
  const getActivitiesForClassification = (classificationCode: string, hasOnBudgetAid: boolean, hasOffBudgetAid: boolean): ActivityDetail[] => {
    if (!activitiesData?.activities) return [];
    
    // Find activities with budget classification mapping matching both code AND type
    const mappedActivities = activitiesData.activities.filter(activity =>
      activity.budgetClassifications.some(bc => 
        bc.code === classificationCode && bc.classificationType === classificationType
      )
    );
    
    // If we have mapped activities for this classification type, return them
    if (mappedActivities.length > 0) {
      return mappedActivities;
    }
    
    // Fallback: try matching just by code (for backwards compatibility)
    const codeOnlyMatch = activitiesData.activities.filter(activity =>
      activity.budgetClassifications.some(bc => bc.code === classificationCode)
    );
    
    if (codeOnlyMatch.length > 0) {
      return codeOnlyMatch;
    }
    
    // No matches found
    return [];
  };
  
  // Get status text (plain text instead of badge)
  const getStatusText = (status: BudgetStatusType, isBudgetSupport: boolean): string => {
    if (isBudgetSupport) return "Budget Support";
    switch (status) {
      case "on_budget": return "On Budget";
      case "off_budget": return "Off Budget";
      case "partial": return "Partial";
      default: return "Unknown";
    }
  };

  // Format partner display with name and acronym
  const formatPartner = (name: string, acronym: string | null): string => {
    if (acronym) {
      return `${name} (${acronym})`;
    }
    return name;
  };

  // Group activities by budget status
  const getActivitiesByStatus = () => {
    if (!activitiesData?.activities) return {};
    
    const groups: Record<string, ActivityDetail[]> = {
      on_budget: [],
      off_budget: [],
      partial: [],
      unknown: [],
      budget_support: [],
    };

    activitiesData.activities.forEach(activity => {
      if (activity.isBudgetSupport) {
        groups.budget_support.push(activity);
      } else {
        groups[activity.budgetStatus]?.push(activity);
      }
    });

    return groups;
  };

  // Get display name and color for status
  const getStatusDisplay = (status: string): { name: string; color: string; badgeClass: string } => {
    switch (status) {
      case 'on_budget':
        return { name: 'On Budget', color: '#7b95a7', badgeClass: 'bg-green-50 text-green-700 border-green-300' };
      case 'off_budget':
        return { name: 'Off Budget', color: '#dc2625', badgeClass: 'bg-red-50 text-red-700 border-red-300' };
      case 'partial':
        return { name: 'Partial', color: '#eab308', badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-300' };
      case 'unknown':
        return { name: 'Unknown', color: '#6b7280', badgeClass: 'bg-gray-50 text-gray-700 border-gray-300' };
      case 'budget_support':
        return { name: 'Budget Support', color: '#cfd0d5', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300' };
      default:
        return { name: status, color: '#6b7280', badgeClass: 'bg-gray-50 text-gray-700 border-gray-300' };
    }
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
    // Always show orbit if there's at least one sector with data - brought closer to center for better visibility
    const orbitRadius = sectorData.length >= 1 ? 400 : 0;

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
    const centerRadius = 120;
    const centerThickness = 45;

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
              { label: "Total", value: formatAbbreviated(totalValue) },
              ...centerData.map(item => ({
                label: item.type,
                value: formatAbbreviated(item.value),
                color: item.color
              })),
              { label: "Share", value: `${percentage}%` },
            ],
          });
        })
        .on("mousemove", function(event: MouseEvent, d) {
          const percentage = totalValue > 0 ? ((d.data.value / totalValue) * 100).toFixed(1) : "0";
          showTooltip(event, {
            title: d.data.type,
            values: [
              { label: "Total", value: formatAbbreviated(totalValue) },
              ...centerData.map(item => ({
                label: item.type,
                value: formatAbbreviated(item.value),
                color: item.color
              })),
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
      // Adjusted satellite sizes for closer orbit - prevents overlapping
      const rScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range([55, 95]);

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
                { label: "Total", value: formatAbbreviated(sectorTotal) },
                { label: "Domestic", value: formatAbbreviated(sector.domesticExpenditure), color: palette.blueSlate },
                { label: "On-Budget Aid", value: formatAbbreviated(sector.onBudgetAid), color: palette.coolSteel },
                { label: "Off-Budget Aid", value: formatAbbreviated(sector.offBudgetAid), color: palette.primaryScarlet },
                { label: "Share", value: `${pct}%` },
              ],
            });
          })
          .on("mousemove", function(event: MouseEvent) {
            const pct = totalValue > 0 ? ((sectorTotal / totalValue) * 100).toFixed(1) : '0.0';
            showTooltip(event, {
              title: `${sector.code} - ${sector.name}`,
              values: [
                { label: "Total", value: formatAbbreviated(sectorTotal) },
                { label: "Domestic", value: formatAbbreviated(sector.domesticExpenditure), color: palette.blueSlate },
                { label: "On-Budget Aid", value: formatAbbreviated(sector.onBudgetAid), color: palette.coolSteel },
                { label: "Off-Budget Aid", value: formatAbbreviated(sector.offBudgetAid), color: palette.primaryScarlet },
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
        const nameFontSize = r > 60 ? "12px" : r > 50 ? "11px" : "10px";
        const maxCharsPerLine = Math.floor(r / 2.5); // More chars allowed in larger circles

        if (words.length > 1 && sector.name.length > maxCharsPerLine) {
          // Split into multiple lines for long names
          const midpoint = Math.ceil(words.length / 2);
          const line1 = words.slice(0, midpoint).join(" ");
          const line2 = words.slice(midpoint).join(" ");

          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.9em")
            .attr("font-size", nameFontSize)
            .attr("fill", palette.blueSlate)
            .text(line1.length > maxCharsPerLine ? line1.slice(0, maxCharsPerLine) + "..." : line1);

          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "2.0em")
            .attr("font-size", nameFontSize)
            .attr("fill", palette.blueSlate)
            .text(line2.length > maxCharsPerLine ? line2.slice(0, maxCharsPerLine) + "..." : line2);
        } else {
          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.0em")
            .attr("font-size", nameFontSize)
            .attr("fill", palette.blueSlate)
            .text(sector.name.length > maxCharsPerLine ? sector.name.slice(0, maxCharsPerLine) + "..." : sector.name);
        }
      });
    }

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
        <CardContent className="pt-6">
          <Skeleton className="h-[700px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="pt-6">
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
        <div className="flex items-end justify-end gap-3">
          {/* Year Range Selector */}
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                  <CalendarIcon className="h-4 w-4" />
                  {!startYear && !endYear
                    ? "All Years"
                    : startYear === endYear
                      ? getYearDisplayLabel(startYear!)
                      : `${getYearDisplayLabel(startYear!)} – ${getYearDisplayLabel(endYear!)}`
                  }
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-3 w-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700">Select Year Range</span>
                  <div className="flex gap-1">
                    <button
                      onClick={selectAllYears}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                    >
                      All
                    </button>
                    <button
                      onClick={selectDataRange}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                    >
                      Data
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {yearOptions.map((year) => {
                    const isAllSelected = startYear === null && endYear === null;
                    const hasSelection = startYear !== null || endYear !== null;
                    const isStartOrEnd = hasSelection && (year === startYear || year === endYear);
                    const inRange = isYearInRange(year);

                    return (
                      <button
                        key={year}
                        onClick={() => handleYearClick(year)}
                        className={`
                          px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap
                          ${isAllSelected
                            ? "bg-primary/20 text-primary"
                            : isStartOrEnd
                              ? "bg-primary text-primary-foreground"
                              : inRange
                                ? "bg-primary/20 text-primary"
                                : "text-slate-600 hover:bg-slate-100"
                          }
                        `}
                        title="Click to select start, then click another to select end"
                      >
                        {getYearDisplayLabel(year)}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Click start year, then click end year
                </p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="type-select" className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={classificationType}
              onValueChange={(v) => setClassificationType(v as ClassificationType)}
            >
              <SelectTrigger id="type-select" className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional</SelectItem>
                <SelectItem value="administrative">Line Ministries</SelectItem>
                <SelectItem value="economic">Economic</SelectItem>
                <SelectItem value="programme">Programme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setZoomTarget(null);
              panOffsetRef.current = { x: 0, y: 0 };
              if (mainGroupRef.current) {
                mainGroupRef.current
                  .transition()
                  .duration(500)
                  .attr("transform", `translate(${chartWidth / 2}, ${chartHeight / 2})`);
              }
            }}
            variant="outline"
            size="sm"
            title="Reset View"
          >
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
              <PieChart className="h-4 w-4" />
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
          <Button onClick={exportToCSV} variant="outline" size="sm" title="Export to CSV">
            <Download className="h-4 w-4" />
          </Button>
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
                {formatAbbreviated(summary.totalDomesticExpenditure)}
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
                {formatAbbreviated(summary.totalOnBudgetAid + summary.totalPartialAid)}
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
                {formatAbbreviated(summary.totalOffBudgetAid + summary.totalUnknownAid)}
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
                {formatAbbreviated(summary.totalBudgetSupport)}
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
                      {tooltip.content.values.map((item, i) => {
                        const lowerLabel = item.label.toLowerCase();
                        const isIndented = lowerLabel.includes("domestic") || lowerLabel.includes("on-budget") || lowerLabel.includes("on budget") || lowerLabel.includes("off-budget") || lowerLabel.includes("off budget") || lowerLabel.includes("budget support");
                        return (
                          <tr key={i} className="border-b last:border-b-0" style={{ borderColor: '#e5e7eb' }}>
                            <td className="px-3 py-1.5 text-left" style={{ color: '#6b7280', paddingLeft: isIndented ? '1.5rem' : '0.75rem' }}>
                              {item.label}
                            </td>
                            <td
                              className="px-3 py-1.5 text-right font-medium"
                              style={{ color: item.color || '#4c5568' }}
                            >
                              {item.value}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </>
        )}

        {/* Table View - Single collapsible table by classification */}
        {viewMode === "table" && (
          <div className="space-y-4">
            {activitiesLoading && !data?.chartData?.sectorData ? (
              <TableSkeleton rows={8} columns={8} />
            ) : data?.chartData?.sectorData ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="font-semibold">Classification</TableHead>
                      <TableHead className="font-semibold text-right">Domestic Spending</TableHead>
                      <TableHead className="font-semibold text-right">Aid on Budget</TableHead>
                      <TableHead className="font-semibold text-right">Aid off Budget</TableHead>
                      <TableHead className="font-semibold text-right">On-Budget Total</TableHead>
                      <TableHead className="font-semibold text-right">Grand Total</TableHead>
                      <TableHead className="font-semibold text-right">Aid Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.chartData.sectorData
                      .filter(s => s.domesticExpenditure > 0 || s.onBudgetAid > 0 || s.offBudgetAid > 0)
                      .map((sector) => {
                        const onBudgetTotal = sector.domesticExpenditure + sector.onBudgetAid;
                        const grandTotal = sector.domesticExpenditure + sector.onBudgetAid + sector.offBudgetAid;
                        const hasAidData = sector.onBudgetAid > 0 || sector.offBudgetAid > 0;
                        const isExpanded = expandedClassifications.has(sector.code);
                        // Show chevron immediately if there's any aid data (don't wait for activities to load)
                        const showChevron = hasAidData;
                        const classificationActivities = isExpanded 
                          ? getActivitiesForClassification(sector.code, sector.onBudgetAid > 0, sector.offBudgetAid > 0)
                          : [];

                        return (
                          <React.Fragment key={sector.code}>
                            {/* Classification Header Row */}
                            <TableRow
                              className={`bg-slate-50/70 ${showChevron ? "cursor-pointer hover:bg-slate-100/70" : ""}`}
                              onClick={() => showChevron && toggleClassification(sector.code)}
                            >
                              <TableCell className="w-8">
                                {showChevron && (
                                  isExpanded
                                    ? <ChevronDown className="h-4 w-4 text-gray-600" />
                                    : <ChevronRight className="h-4 w-4 text-gray-600" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {sector.code && (
                                  <code className="mr-2 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">
                                    {sector.code}
                                  </code>
                                )}
                                {sector.name}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(sector.domesticExpenditure)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(sector.onBudgetAid)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(sector.offBudgetAid)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(onBudgetTotal)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(grandTotal)}
                              </TableCell>
                              <TableCell className="text-right">
                                {grandTotal > 0 ? (((sector.onBudgetAid + sector.offBudgetAid) / grandTotal) * 100).toFixed(1) : 0}%
                              </TableCell>
                            </TableRow>

                            {/* Expanded Activities for this Classification */}
                            {isExpanded && classificationActivities.map((activity) => (
                              <TableRow
                                key={`${sector.code}-${activity.id}`}
                                className="bg-slate-50/50 hover:bg-slate-100/50"
                              >
                                <TableCell className="w-8 pl-6"></TableCell>
                                <TableCell className="pl-6">
                                  <Link 
                                    href={`/activities/${activity.id}`}
                                    className="font-medium text-sm hover:text-gray-600 cursor-pointer"
                                    title={activity.title}
                                  >
                                    {activity.title}
                                  </Link>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    {activity.iatiIdentifier && (
                                      <span className="font-mono bg-muted text-gray-600 px-1.5 py-0.5 rounded">
                                        {activity.iatiIdentifier}
                                      </span>
                                    )}
                                    <span>{formatPartner(activity.partnerName, activity.partnerAcronym)}</span>
                                  </div>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right text-sm">
                                  {formatCurrency(activity.onBudgetAmount)}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {formatCurrency(activity.offBudgetAmount)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {formatCurrency(activity.onBudgetAmount)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {formatCurrency(activity.totalDisbursements)}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    {/* Totals Row - COFOG 01-10 only, excludes Unclassified (99) */}
                    {summary && (() => {
                      // Calculate COFOG-only totals (exclude code 99)
                      const cofogData = data.chartData.sectorData.filter(s => 
                        s.code !== "99" && (s.domesticExpenditure > 0 || s.onBudgetAid > 0 || s.offBudgetAid > 0)
                      );
                      const cofogDomestic = cofogData.reduce((sum, s) => sum + s.domesticExpenditure, 0);
                      const cofogOnBudget = cofogData.reduce((sum, s) => sum + s.onBudgetAid, 0);
                      const cofogOffBudget = cofogData.reduce((sum, s) => sum + s.offBudgetAid, 0);
                      const cofogOnBudgetTotal = cofogDomestic + cofogOnBudget;
                      const cofogGrandTotal = cofogDomestic + cofogOnBudget + cofogOffBudget;
                      const cofogAidShare = cofogGrandTotal > 0 
                        ? ((cofogOnBudget + cofogOffBudget) / cofogGrandTotal) * 100 
                        : 0;

                      return (
                        <TableRow className="bg-slate-100 font-semibold">
                          <TableCell></TableCell>
                          <TableCell>Total (COFOG 01–10 only)</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cofogDomestic)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cofogOnBudget)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cofogOffBudget)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cofogOnBudgetTotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cofogGrandTotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {cofogAidShare.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
                <div className="p-3 bg-slate-50 border-t text-xs text-gray-600 space-y-2">
                  <p><span className="font-medium">Click on any classification row with activities to expand and see individual activities.</span></p>
                  {data.chartData.sectorData.some(s => s.code === "99") && (
                    <p className="text-gray-500 italic">
                      Note: Spending classified as &apos;Unclassified / Budget Support&apos; reflects centralised resources and external assistance that cannot be reliably allocated to COFOG functions. These amounts are shown separately to preserve the integrity of functional expenditure analysis.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 border rounded-lg">
                <p>No budget data available for this period.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
