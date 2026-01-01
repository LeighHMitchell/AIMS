"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Maximize2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";

interface LocationItem {
  id: string;
  name: string;
  value: number;
  activityCount: number;
}

type MetricType = 'budgets' | 'disbursements' | 'commitments';
type ViewMode = "bar" | "pie" | "table";

const COLORS = [
  "#dc2625", // Primary Scarlet
  "#4c5568", // Blue Slate
  "#7b95a7", // Cool Steel
  "#9b4d4c", // Muted scarlet variant
  "#5d6b7d", // Darker steel
  "#8a9dad", // Lighter steel
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
];

const CHART_STRUCTURE_COLORS = {
  grid: "#cfd0d5",
  axis: "#4c5568",
};

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

const METRIC_LABELS: Record<MetricType, string> = {
  budgets: 'Total Budgets',
  disbursements: 'Disbursements',
  commitments: 'Commitments',
};

export function TopLocationsChart() {
  const [metric, setMetric] = useState<MetricType>('disbursements');
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<LocationItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({ metric, topN: '10' });
      const response = await fetch(`/api/analytics/top-locations?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch location data');
      }

      setData(result.data || []);
      setGrandTotal(result.grandTotal || 0);
    } catch (err: any) {
      console.error('Error fetching top locations:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
  }));

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      Location: d.name,
      "Value (USD)": d.value,
      Activities: d.activityCount,
    }));
    exportChartToCSV(exportData, `subnational-allocations-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">{METRIC_LABELS[metric]}</span>
              <span className="text-sm font-medium text-slate-900">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">Percentage</span>
              <span className="text-sm font-medium text-slate-900">
                {item.percentage.toFixed(1)}%
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

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="name"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={0}
          textAnchor="middle"
          height={40}
          tickFormatter={(v) => (v.length > 8 ? `${v.slice(0, 8)}...` : v)}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatCurrency(value)}
            style={{ fontSize: 11, fontWeight: 500, fill: "#374151" }}
          />
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
          nameKey="name"
          label={({ name, percent }) => `${name.length > 8 ? name.slice(0, 8) + '...' : name} ${(percent * 100).toFixed(0)}%`}
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
    <div className="overflow-auto max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Value (USD)</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((location) => (
            <TableRow key={location.id}>
              <TableCell>
                <div className="font-medium">{location.name}</div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(location.value)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal > 0 ? ((location.value / grandTotal) * 100).toFixed(1) : 0}%
              </TableCell>
              <TableCell className="text-right">
                {location.activityCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 400 : 280;

    if (loading) {
      return <Skeleton className="w-full h-[280px]" />;
    }

    if (error) {
      return (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          {error}
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          No location data available
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
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t flex-shrink-0">
      <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="budgets">Total Budgets</SelectItem>
          <SelectItem value="disbursements">Disbursements</SelectItem>
          <SelectItem value="commitments">Commitments</SelectItem>
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
    <>
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Subnational Allocations
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Myanmar States & Regions</p>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3 flex-1 flex flex-col">
          {renderContent(false)}
          {renderControls(false)}
        </CardContent>
      </Card>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-wide">
              Subnational Allocations
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              Myanmar States & Regions by {METRIC_LABELS[metric].toLowerCase()}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">{renderContent(true)}</div>
          {renderControls(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
