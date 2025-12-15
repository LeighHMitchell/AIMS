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
import { AlertCircle, RefreshCw, TrendingUp, Wallet, PiggyBank } from "lucide-react";
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

    // Check if there's any data to show
    if (summary.totalAid === 0 && summary.totalDomesticExpenditure === 0) {
      const svg = d3.select(svgRef.current).attr("viewBox", `0 0 600 400`);

      svg
        .append("text")
        .attr("x", 300)
        .attr("y", 180)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#64748b")
        .text("No budget data available for this period.");

      svg
        .append("text")
        .attr("x", 300)
        .attr("y", 210)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#94a3b8")
        .text("Add domestic budget data and activity budget status to see analytics.");

      return;
    }

    // Setup
    const width = 600;
    const height = 400;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);

    const centerX = width / 2;
    const centerY = height / 2;

    // Donut chart dimensions
    const outerRadius = 140;
    const innerRadius = 80;

    const g = svg.append("g").attr("transform", `translate(${centerX}, ${centerY})`);

    // Prepare data for donut chart
    const pieData = chartData.centerData.breakdown.filter((d) => d.value > 0);

    if (pieData.length === 0) {
      // No data to show in pie
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#64748b")
        .text("No spending data");
      return;
    }

    // Create pie generator
    const pie = d3
      .pie<{ type: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3
      .arc<d3.PieArcDatum<{ type: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .padAngle(0.02)
      .cornerRadius(4);

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

    // Draw arcs
    const arcs = g
      .selectAll(".arc")
      .data(pie(pieData))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 0.8);
        const total = chartData.centerData.total;
        const percentage = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : "0";
        showTooltip(event, {
          title: d.data.type,
          values: [
            { label: "Amount", value: formatCurrency(d.data.value), color: d.data.color },
            { label: "Share", value: `${percentage}%` },
          ],
        });
      })
      .on("mousemove", function (event, d) {
        const total = chartData.centerData.total;
        const percentage = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : "0";
        showTooltip(event, {
          title: d.data.type,
          values: [
            { label: "Amount", value: formatCurrency(d.data.value), color: d.data.color },
            { label: "Share", value: `${percentage}%` },
          ],
        });
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 1);
        hideTooltip();
      });

    // Center text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .attr("font-size", "12px")
      .attr("fill", "#64748b")
      .text("Total Spending");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b")
      .text(formatAbbreviated(chartData.centerData.total));

    // Legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - 180}, 30)`);

    const legendItems = legend
      .selectAll(".legend-item")
      .data(pieData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems
      .append("rect")
      .attr("width", 16)
      .attr("height", 16)
      .attr("rx", 3)
      .attr("fill", (d) => d.color);

    legendItems
      .append("text")
      .attr("x", 24)
      .attr("y", 12)
      .attr("font-size", "12px")
      .attr("fill", "#475569")
      .text((d) => `${d.type}: ${formatAbbreviated(d.value)}`);
  }, [data]);

  if (loading) {
    return (
      <Card>
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
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aid on Budget Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-red-600">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Error: {error}</p>
            <Button onClick={fetchData} variant="outline" className="mt-4">
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
    <Card>
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
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                <Wallet className="h-4 w-4" />
                Domestic Spending
              </div>
              <div className="text-xl font-bold text-blue-900">
                {formatCurrency(summary.totalDomesticExpenditure)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {summary.domesticExecutionRate.toFixed(1)}% execution rate
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                <PiggyBank className="h-4 w-4" />
                On-Budget Aid
              </div>
              <div className="text-xl font-bold text-green-900">
                {formatCurrency(summary.totalOnBudgetAid + summary.totalPartialAid)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {summary.onBudgetActivityCount + summary.partialActivityCount} activities
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
                <AlertCircle className="h-4 w-4" />
                Off-Budget Aid
              </div>
              <div className="text-xl font-bold text-red-900">
                {formatCurrency(summary.totalOffBudgetAid)}
              </div>
              <div className="text-xs text-red-600 mt-1">
                {summary.offBudgetActivityCount} activities
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                Aid Share of Budget
              </div>
              <div className="text-xl font-bold text-gray-900">
                {summary.aidShareOfBudget.toFixed(1)}%
              </div>
              <Progress value={summary.aidShareOfBudget} className="mt-2 h-2" />
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="relative">
          <svg ref={svgRef} className="w-full h-auto" />

          {/* Tooltip */}
          {tooltip.show && tooltip.content && (
            <div
              className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none z-50"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <div className="font-semibold text-gray-900 mb-2">
                {tooltip.content.title}
              </div>
              {tooltip.content.values.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">{item.label}:</span>
                  <span
                    className="font-medium"
                    style={{ color: item.color || "#1e293b" }}
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
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Activity Budget Status Distribution
            </h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                On Budget: {summary.onBudgetActivityCount}
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Partial: {summary.partialActivityCount}
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Off Budget: {summary.offBudgetActivityCount}
              </Badge>
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                Unknown: {summary.unknownActivityCount}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {summary.activityCount} activities |{" "}
              {summary.onBudgetPercentage.toFixed(1)}% of aid is on budget
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
