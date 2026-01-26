"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Maximize2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChartSkeleton } from "@/components/ui/skeleton-loader";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { RankedItem } from "@/types/national-priorities";
import { CHART_COLOR_PALETTE, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { apiFetch } from '@/lib/api-fetch';

type ViewMode = "bar" | "pie";
type MetricType = "budgets" | "plannedDisbursements" | "commitments" | "disbursements";
type SortField = "name" | "value" | "percentage" | "activityCount";
type SortDirection = "asc" | "desc";

interface SubnationalAllocationsChartProps {
  refreshKey?: number;
  organizationId?: string;
}

const METRIC_OPTIONS = [
  { value: "budgets", label: "Total Budgets" },
  { value: "plannedDisbursements", label: "Planned Disbursements" },
  { value: "commitments", label: "Commitments" },
  { value: "disbursements", label: "Disbursements" },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${Math.round(value / 1_000_000_000)}B`;
  } else if (value >= 1_000_000) {
    return `$${Math.round(value / 1_000_000)}M`;
  } else if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }
  return `$${Math.round(value)}`;
}

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SubnationalAllocationsChart({ refreshKey = 0, organizationId }: SubnationalAllocationsChartProps) {
  const [data, setData] = useState<RankedItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("disbursements");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ measure: metric });
      if (organizationId) {
        params.set('organizationId', organizationId);
      }
      const response = await apiFetch(`/api/analytics/dashboard?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data?.topDistricts || []);
      setGrandTotal(result.data?.grandTotal || 0);
    } catch (error: any) {
      console.error("[SubnationalAllocationsChart] Error:", error);
      toast.error("Failed to load subnational allocation data");
    } finally {
      setLoading(false);
    }
  }, [metric, organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const chartData = data.map((item, index) => ({
    ...item,
    color: item.id === "others" ? "#9CA3AF" : CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
  }));

  // Sorting logic for table
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedTableData = [...chartData].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "value":
        comparison = a.value - b.value;
        break;
      case "percentage":
        comparison = a.percentage - b.percentage;
        break;
      case "activityCount":
        comparison = a.activityCount - b.activityCount;
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      "State/Region": d.name,
      "Value (USD)": d.value,
      "Percentage": grandTotal > 0 ? ((d.value / grandTotal) * 100).toFixed(1) + "%" : "0%",
      Activities: d.activityCount,
    }));
    exportChartToCSV(exportData, `subnational-allocations-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : "0";
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{item.name}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">Value</span>
              <span className="text-sm font-medium text-slate-900">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">Percentage</span>
              <span className="text-sm font-medium text-slate-900">
                {percentage}%
              </span>
            </div>
            {item.activityCount > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">Activities</span>
                <span className="text-sm font-medium text-slate-900">
                  {item.activityCount}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-2 flex-shrink-0">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600 truncate max-w-[100px]" title={item.name}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );

  // Custom X-axis tick with text wrapping
  const WrappedAxisTick = ({ x, y, payload }: any) => {
    const text = payload.value;
    const maxWidth = 60;
    const lineHeight = 12;
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach((word: string) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length * 5.5 > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line, index) => (
          <text
            key={index}
            x={0}
            y={index * lineHeight + 8}
            textAnchor="middle"
            fill={CHART_STRUCTURE_COLORS.axis}
            fontSize={10}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="name"
          stroke={CHART_STRUCTURE_COLORS.axis}
          tickLine={false}
          axisLine={false}
          height={50}
          tick={<WrappedAxisTick />}
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatCurrency(value)}
            style={{ fontSize: 10, fontWeight: 500, fill: "#374151" }}
          />
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  // Custom pie label that wraps text
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    // Split name into words for wrapping
    const words = name.split(' ');
    const percentText = `${(percent * 100).toFixed(0)}%`;

    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{ fontSize: 10, fill: '#374151' }}
      >
        {words.map((word: string, index: number) => (
          <tspan
            key={index}
            x={x}
            dy={index === 0 ? 0 : 12}
          >
            {word}
          </tspan>
        ))}
        <tspan x={x} dy={12} style={{ fontWeight: 500 }}>
          {percentText}
        </tspan>
      </text>
    );
  };

  const renderPieChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          dataKey="value"
          nameKey="name"
          label={renderPieLabel}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                className="flex items-center hover:text-slate-900 transition-colors"
                onClick={() => handleSort("name")}
              >
                State/Region
                <SortIcon field="name" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                className="flex items-center justify-end w-full hover:text-slate-900 transition-colors"
                onClick={() => handleSort("value")}
              >
                Value (USD)
                <SortIcon field="value" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                className="flex items-center justify-end w-full hover:text-slate-900 transition-colors"
                onClick={() => handleSort("percentage")}
              >
                %
                <SortIcon field="percentage" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                className="flex items-center justify-end w-full hover:text-slate-900 transition-colors"
                onClick={() => handleSort("activityCount")}
              >
                Activities
                <SortIcon field="activityCount" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTableData.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(item.value)}
              </TableCell>
              <TableCell className="text-right">
                {item.percentage.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                {item.activityCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 400 : "100%";

    if (loading) {
      return <BarChartSkeleton height="100%" bars={5} showLegend={false} />;
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No subnational allocation data available
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {expanded && renderLegend()}
        <div className={expanded ? "h-[400px] mb-4" : "flex-1 min-h-0"}>
          {viewMode === "bar" && renderBarChart(chartHeight)}
          {viewMode === "pie" && renderPieChart(chartHeight)}
        </div>
      </div>
    );
  };

  const renderControls = (expanded: boolean = false) => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t flex-shrink-0">
      <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METRIC_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        {/* View mode toggles */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "bar" ? "default" : "ghost"}
            size="sm"
            className={cn("h-8 w-8 p-0", viewMode === "bar" && "bg-primary text-primary-foreground")}
            onClick={() => setViewMode("bar")}
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "pie" ? "default" : "ghost"}
            size="sm"
            className={cn("h-8 w-8 p-0", viewMode === "pie" && "bg-primary text-primary-foreground")}
            onClick={() => setViewMode("pie")}
            title="Pie Chart"
          >
            <PieChartIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Expand button - only in compact view */}
        {!expanded && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(true)}
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}

        {/* Export button - only in expanded view */}
        {expanded && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleExport}
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[700px] gap-4">
      {/* Chart Card - takes remaining space */}
      <Card className="bg-white border-slate-200 flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Subnational Allocations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsExpanded(true)}
              title="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3 flex-1 flex flex-col min-h-0">
          {renderContent(false)}
        </CardContent>
      </Card>

      {/* Table Card Below - fixed height */}
      {!loading && data && data.length > 0 && (
        <Card className="bg-white border-slate-200 h-[240px] flex-shrink-0 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                Allocation Details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsTableExpanded(true)}
                title="Expand"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3 flex-1 overflow-hidden">
            {renderTable()}
          </CardContent>
        </Card>
      )}

      {/* Expanded Chart Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Subnational Allocations
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Myanmar States & Regions by {METRIC_OPTIONS.find((o) => o.value === metric)?.label.toLowerCase()}.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleExport}
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Filter and view controls above chart */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "bar" ? "default" : "ghost"}
                size="sm"
                className={cn("h-8 w-8 p-0", viewMode === "bar" && "bg-primary text-primary-foreground")}
                onClick={() => setViewMode("bar")}
                title="Bar Chart"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "pie" ? "default" : "ghost"}
                size="sm"
                className={cn("h-8 w-8 p-0", viewMode === "pie" && "bg-primary text-primary-foreground")}
                onClick={() => setViewMode("pie")}
                title="Pie Chart"
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
            </div>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chart */}
          <div className="mt-4">{renderContent(true)}</div>

          {/* Description below chart */}
          <p className="text-sm text-slate-600 mt-4">
            This chart visualizes how development assistance is distributed across Myanmar's states and regions.
            Understanding subnational allocation patterns helps identify geographic priorities, reveals potential
            gaps in coverage, and supports more equitable distribution of aid resources. Use the metric selector
            to compare budgets, planned disbursements, commitments, or actual disbursements across regions.
          </p>
        </DialogContent>
      </Dialog>

      {/* Expanded Table Dialog View */}
      <Dialog open={isTableExpanded} onOpenChange={setIsTableExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Allocation Details
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Detailed breakdown by State/Region
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleExport}
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <p className="text-sm text-slate-600 mt-2">
            This table provides precise figures for aid allocations across Myanmar's states and regions.
            The data shows the exact USD value, percentage share, and number of activities for each location.
            Use this detailed breakdown to analyze funding concentration, compare regional investments,
            and identify areas that may be underserved relative to their needs.
          </p>

          <div className="mt-4 max-h-[60vh] overflow-auto">
            {renderTable()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
