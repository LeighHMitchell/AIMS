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
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingText } from "@/components/ui/loading-text";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { RankedItem } from "@/types/national-priorities";
import { CHART_COLOR_PALETTE, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { apiFetch } from '@/lib/api-fetch';

type ViewMode = "bar" | "pie" | "table";
type MetricType = "budgets" | "plannedDisbursements" | "commitments" | "disbursements";

interface RecipientGovBodiesChartProps {
  refreshKey?: number;
}

const METRIC_OPTIONS = [
  { value: "budgets", label: "Total Budgets" },
  { value: "plannedDisbursements", label: "Planned Disbursements" },
  { value: "commitments", label: "Commitments" },
  { value: "disbursements", label: "Disbursements" },
];

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

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function RecipientGovBodiesChart({ refreshKey = 0 }: RecipientGovBodiesChartProps) {
  const [data, setData] = useState<RankedItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("disbursements");
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("bar");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ measure: metric });
      const response = await apiFetch(`/api/analytics/dashboard?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data?.recipientGovBodies || []);
      setGrandTotal(result.data?.grandTotal || 0);
    } catch (error: any) {
      console.error("[RecipientGovBodiesChart] Error:", error);
      toast.error("Failed to load recipient government bodies data");
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const chartData = data.map((item, index) => ({
    ...item,
    color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
    fill: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
    acronym: item.name.length > 12 ? item.name.slice(0, 10) + '...' : item.name,
  }));

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      Organization: d.name,
      "Value (USD)": d.value,
      "Percentage": formatPercent(d.value, grandTotal),
      Activities: d.activityCount,
    }));
    exportChartToCSV(exportData, `recipient-gov-bodies-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
          <div className="border-t mt-2 pt-2 space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(item.value)}
            </p>
            <p className="text-xs text-gray-500">
              {formatPercent(item.value, grandTotal)}
            </p>
            {item.activityCount > 0 && (
              <p className="text-xs text-gray-500">
                {item.activityCount} activities
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="acronym"
          stroke={CHART_STRUCTURE_COLORS.axis}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11 }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
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
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-auto max-h-[300px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Value (USD)</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(item.value)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(item.value, grandTotal)}
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

  const renderLegend = () => (
    <div className="mt-4 space-y-1">
      {chartData.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate max-w-[150px]">{item.name}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{formatCurrency(item.value)}</span>
            <span className="w-12 text-right">
              {formatPercent(item.value, grandTotal)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
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

    const chartHeight = expanded ? 400 : "100%";

    return (
      <div className="h-[280px]">
        {viewMode === "bar" && renderBarChart(chartHeight)}
        {viewMode === "pie" && renderPieChart(chartHeight)}
        {viewMode === "table" && renderTable()}
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

  return (
    <>
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium text-slate-700 truncate">
                Recipient Government Bodies
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Government bodies receiving funds
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
        <DialogContent className="max-w-3xl w-[80vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-slate-800">
                  Recipient Government Bodies
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Government bodies receiving {METRIC_OPTIONS.find((o) => o.value === metric)?.label.toLowerCase()}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4">
            <div className="h-[400px]">
              {viewMode === "bar" && renderBarChart(400)}
              {viewMode === "pie" && renderPieChart(400)}
              {viewMode === "table" && renderTable()}
            </div>
            {renderLegend()}
          </div>
          
          {renderControls(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
