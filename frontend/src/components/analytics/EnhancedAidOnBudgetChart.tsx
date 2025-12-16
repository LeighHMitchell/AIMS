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
import { AlertCircle, RefreshCw, TrendingUp, Wallet, PiggyBank, CircleDollarSign, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function EnhancedAidOnBudgetChart({ refreshKey }: EnhancedAidOnBudgetChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [classificationType, setClassificationType] = useState<ClassificationType | "all">("all");

  const fiscalYearOptions = getFiscalYearOptions();

  // Format number to abbreviated form
  const formatAbbreviated = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Format currency
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
      params.set("fiscalYear", selectedYear.toString());
      if (classificationType !== "all") {
        params.set("classificationType", classificationType);
      }

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

  // Render D3 chart when data changes
  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove();

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
    const width = 900;
    const height = 700;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);

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
    const orbitRadius = sectorData.length > 1 ? 260 : 0;

    if (sectorData.length > 1) {
      g.append("circle")
        .attr("r", orbitRadius)
        .attr("fill", "none")
        .attr("stroke", palette.paleSlate)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0.5);
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
        });
    }

    // Center circle with white background
    g.append("circle")
      .attr("r", centerRadius)
      .attr("fill", "#ffffff");

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
      .text("Total Spending");

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
      const rScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range([22, 55]);

      const angleStep = (2 * Math.PI) / sectorData.length;

      // Color scale for sectors - using brand palette
      const sectorColors = [
        palette.blueSlate,
        palette.coolSteel,
        palette.primaryScarlet,
        palette.paleSlate
      ];
      const sectorColorScale = d3.scaleOrdinal(sectorColors);

      sectorData.forEach((sector, i) => {
        const angle = (i * angleStep) - (Math.PI / 2);
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        const sectorTotal = sector.domesticExpenditure + sector.onBudgetAid + sector.offBudgetAid;
        const r = rScale(sectorTotal);

        const planetGroup = g.append("g")
          .attr("transform", `translate(${x}, ${y})`)
          .style("cursor", "pointer");

        // Filled circle for the satellite
        planetGroup.append("circle")
          .attr("r", r)
          .attr("fill", sectorColorScale(i.toString()) as string)
          .attr("opacity", 0.8)
          .attr("stroke", sectorColorScale(i.toString()) as string)
          .attr("stroke-width", 2)
          .on("mouseover", function(event: MouseEvent) {
            d3.select(this)
              .transition()
              .duration(150)
              .attr("opacity", 1)
              .attr("r", r * 1.1);

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
            d3.select(this)
              .transition()
              .duration(150)
              .attr("opacity", 0.8)
              .attr("r", r);
            hideTooltip();
          });

        // Inner circle for text background
        planetGroup.append("circle")
          .attr("r", r * 0.75)
          .attr("fill", "#ffffff");

        // Value text
        planetGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "-0.2em")
          .attr("font-size", r > 35 ? "12px" : "10px")
          .attr("font-weight", "bold")
          .attr("fill", palette.blueSlate)
          .text(formatAbbreviated(sectorTotal));

        // Name text (wrapped if needed)
        const words = sector.name.split(" ");
        if (words.length > 1 && sector.name.length > 8 && r > 35) {
          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .attr("font-size", "8px")
            .attr("fill", palette.blueSlate)
            .text(words.slice(0, Math.ceil(words.length / 2)).join(" "));

          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "2.1em")
            .attr("font-size", "8px")
            .attr("fill", palette.blueSlate)
            .text(words.slice(Math.ceil(words.length / 2)).join(" "));
        } else {
          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .attr("font-size", r > 35 ? "9px" : "7px")
            .attr("fill", palette.blueSlate)
            .text(sector.name.length > 12 ? sector.name.slice(0, 12) + "..." : sector.name);
        }
      });
    }

    // LEGEND - 4 categories using brand palette
    const legendData = [
      { label: "Domestic Spending", color: palette.blueSlate },
      { label: "Aid on Budget", color: palette.coolSteel },
      { label: "Aid off Budget", color: palette.primaryScarlet },
      { label: "Budget Support", color: palette.paleSlate }
    ];

    const legend = svg.append("g")
      .attr("transform", `translate(${width - 170}, 25)`);

    legendData.forEach((d, i) => {
      const row = legend.append("g")
        .attr("transform", `translate(0, ${i * 28})`);

      row.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("rx", 3)
        .attr("fill", d.color);

      row.append("text")
        .attr("x", 26)
        .attr("y", 13)
        .attr("font-size", "12px")
        .attr("fill", palette.blueSlate)
        .text(d.label);
    });

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

  }, [data]);

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
              Comparing domestic spending with donor aid for fiscal year {selectedYear}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="year-select" className="text-sm">
                Year:
              </Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger id="year-select" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards - Monochrome with white background */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: '#4c5568' }}>
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4c5568' }} />
                Domestic Spending
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
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#7b95a7' }} />
                Aid on Budget
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
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#dc2625' }} />
                Aid off Budget
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
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#cfd0d5' }} />
                Budget Support
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

        {/* Orbital Chart */}
        <div className="relative w-full flex items-center justify-center bg-white" style={{ minHeight: '700px' }}>
          <svg ref={svgRef} className="w-full h-full max-w-4xl max-h-[700px]" />

          {/* Tooltip */}
          {tooltip.show && tooltip.content && (
            <div
              className="absolute pointer-events-none z-50 rounded-lg shadow-lg px-3 py-2"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(0, -100%)',
                backgroundColor: '#f1f4f8',
                border: '1px solid #cfd0d5'
              }}
            >
              <div className="font-semibold text-sm" style={{ color: '#4c5568' }}>
                {tooltip.content.title}
              </div>
              {tooltip.content.values.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-sm">
                  <span style={{ color: '#4c5568' }}>{item.label}:</span>
                  <span
                    className="font-medium"
                    style={{ color: item.color || '#4c5568' }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
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
      </CardContent>
    </Card>
  );
}
