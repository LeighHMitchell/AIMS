"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingText } from "@/components/ui/loading-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Maximize2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { CHART_COLOR_PALETTE, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { apiFetch } from '@/lib/api-fetch';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ViewMode = "bar" | "pie" | "table";

interface DonorData {
  id: string;
  name: string;
  acronym: string;
  value: number;
  activityCount: number;
}

const OTHERS_COLOR = "#6b7280";

const METRIC_OPTIONS = [
  { value: "budgets", label: "Total Budgets" },
  { value: "planned", label: "Planned Disbursements" },
  { value: "commitments", label: "Commitments" },
  { value: "disbursements", label: "Disbursements" },
];

const TIME_RANGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
];

type TimeRangeType = "all" | "3m" | "6m" | "1y" | "3y" | "5y";

function getDateRangeFromTimeRange(timeRange: TimeRangeType): { from: Date | undefined; to: Date | undefined } {
  if (timeRange === "all") {
    return { from: undefined, to: undefined };
  }
  
  const now = new Date();
  const from = new Date();
  
  switch (timeRange) {
    case "3m":
      from.setMonth(now.getMonth() - 3);
      break;
    case "6m":
      from.setMonth(now.getMonth() - 6);
      break;
    case "1y":
      from.setFullYear(now.getFullYear() - 1);
      break;
    case "3y":
      from.setFullYear(now.getFullYear() - 3);
      break;
    case "5y":
      from.setFullYear(now.getFullYear() - 5);
      break;
  }
  
  return { from, to: now };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatCurrencyUSD(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B USD`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M USD`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K USD`;
  }
  return `${value.toFixed(0)} USD`;
}

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMetricLabel(metric: MetricType, count: number): string {
  const labels: Record<MetricType, { singular: string; plural: string }> = {
    budgets: { singular: "Budget", plural: "Budgets" },
    planned: { singular: "Planned Disbursement", plural: "Planned Disbursements" },
    commitments: { singular: "Commitment", plural: "Commitments" },
    disbursements: { singular: "Disbursement", plural: "Disbursements" },
  };
  return count === 1 ? labels[metric].singular : labels[metric].plural;
}

interface TopDonorAgenciesChartProps {
  refreshKey?: number;
}

export function TopDonorAgenciesChart({ refreshKey = 0 }: TopDonorAgenciesChartProps) {
  const [data, setData] = useState<DonorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("budgets");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeType>("all");
  const [grandTotal, setGrandTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ metric });
      const { from, to } = getDateRangeFromTimeRange(timeRange);
      if (from) {
        params.set("dateFrom", from.toISOString());
      }
      if (to) {
        params.set("dateTo", to.toISOString());
      }

      const response = await apiFetch(`/api/analytics/top-donor-agencies?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
      setGrandTotal(result.grandTotal || 0);
    } catch (error: any) {
      console.error("[TopDonorAgenciesChart] Error:", error);
      toast.error("Failed to load donor agencies data");
    } finally {
      setLoading(false);
    }
  }, [metric, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleExport = () => {
  if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      Organization: d.name,
      Acronym: d.acronym,
      Value: d.value,
      Records: d.activityCount,
    }));
    exportChartToCSV(exportData, `top-donor-agencies-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as DonorData;
    return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
          {item.acronym !== item.name && (
            <p className="text-xs text-gray-500 mb-1">{item.acronym}</p>
          )}
          <div className="border-t mt-2 pt-2 space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(item.value)}
            </p>
            {item.activityCount > 0 && (
              <p className="text-xs text-gray-500">
                {item.activityCount} {getMetricLabel(metric, item.activityCount)}
              </p>
            )}
          </div>
      </div>
    );
  }
    return null;
  };

  // Prepare chart data with colors
  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.id === "others" ? OTHERS_COLOR : CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
  }));

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
          dataKey="acronym"
          stroke={CHART_STRUCTURE_COLORS.axis}
            fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
  );

  const renderPieChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={75}
          dataKey="value"
          nameKey="acronym"
          label={({ acronym, percent }) => `${acronym} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-auto max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Value (USD)</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((donor) => (
            <TableRow key={donor.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{donor.name}</div>
                  {donor.acronym !== donor.name && (
                    <div className="text-xs text-gray-500">{donor.acronym}</div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(donor.value)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal > 0 ? ((donor.value / grandTotal) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-2">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.fill }}
          />
          <span className="text-xs text-gray-600">{item.acronym}</span>
        </div>
      ))}
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 300 : "100%";

    if (loading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>;
    }

    if (!data || data.length === 0) {
      return (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {expanded && renderLegend()}
        <div className="h-[280px]">
          {viewMode === "bar" && renderBarChart(chartHeight)}
          {viewMode === "pie" && renderPieChart(chartHeight)}
          {viewMode === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = (expanded: boolean = false) => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t">
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
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className={cn("h-8 w-8 p-0", viewMode === "table" && "bg-primary text-primary-foreground")}
            onClick={() => setViewMode("table")}
            title="Table"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
            </div>

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

  const renderTimeRangeFilter = () => (
    <div className="mb-4">
      <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRangeType)}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value === "all" ? "All Time" : `Last ${option.label}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      {/* Compact Card View */}
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium text-slate-700 truncate">
                Funding by Donor
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Top 5 development partners by contribution
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-7 w-7 p-0 hover:bg-slate-100 flex-shrink-0 ml-2"
              title="Expand to full screen"
            >
              <Maximize2 className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3 flex-1 flex flex-col">
          {renderContent(false)}
        </CardContent>
      </Card>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-slate-800">
                  Funding by Donor
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Top 5 development partners ranked by {METRIC_OPTIONS.find((o) => o.value === metric)?.label.toLowerCase()}, with remaining organizations aggregated.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Time range filter - only shown when expanded */}
          {renderTimeRangeFilter()}

          {/* Chart content */}
          <div className="mt-4">{renderContent(true)}</div>

          {/* Controls */}
          {renderControls(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
