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
  LabelList,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";

type MetricType = "commitments" | "disbursements";
type ViewMode = "bar" | "pie" | "table";

interface AgencyData {
  id: string;
  name: string;
  acronym: string;
  value: number;
  activityCount: number;
}

// Consistent color palette
const AGENCY_COLORS = [
  "#dc2625", // Primary Scarlet
  "#cfd0d5", // Pale Slate
  "#4c5568", // Blue Slate
  "#7b95a7", // Cool Steel
  "#f1f4f8", // Platinum
  "#6b7280", // Gray (OTHERS)
];

const METRIC_OPTIONS = [
  { value: "commitments", label: "Actual Commitments" },
  { value: "disbursements", label: "Actual Disbursements" },
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

interface ExecutingAgenciesChartProps {
  refreshKey?: number;
}

export function ExecutingAgenciesChart({ refreshKey = 0 }: ExecutingAgenciesChartProps) {
  const [data, setData] = useState<AgencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("disbursements");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [isExpanded, setIsExpanded] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ measure: metric });
      const response = await fetch(`/api/analytics/dashboard?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      // Transform data to include acronym field
      const agencies = (result.data?.executingAgencies || []).map((item: any) => ({
        id: item.id,
        name: item.name || 'Unknown',
        acronym: item.name?.length > 15 ? item.name.slice(0, 12) + '...' : item.name || 'Unknown',
        value: item.value || 0,
        activityCount: item.activityCount || 0,
      }));

      setData(agencies);
      setGrandTotal(result.data?.grandTotal || 0);
    } catch (error: any) {
      console.error("[ExecutingAgenciesChart] Error:", error);
      toast.error("Failed to load executing agencies data");
    } finally {
      setLoading(false);
    }
  }, [metric]);

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
      Value: d.value,
      Activities: d.activityCount,
    }));
    exportChartToCSV(exportData, `executing-agencies-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as AgencyData;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
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
                {item.activityCount} activities
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
    fill: item.id === "others" ? AGENCY_COLORS[5] : AGENCY_COLORS[index % 5],
  }));

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 80 }}
      >
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={0}
          textAnchor="middle"
          height={80}
          tick={(props) => {
            const { x, y, payload } = props;
            const text = payload.value || '';
            const words = text.split(' ');
            const maxCharsPerLine = 15;
            const lines: string[] = [];
            let currentLine = '';

            words.forEach((word: string) => {
              // If word itself is longer than max, break it up
              if (word.length > maxCharsPerLine) {
                if (currentLine) {
                  lines.push(currentLine);
                  currentLine = '';
                }
                // Break long word into chunks
                for (let i = 0; i < word.length; i += maxCharsPerLine) {
                  lines.push(word.slice(i, i + maxCharsPerLine));
                }
              } else if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
                currentLine += (currentLine ? ' ' : '') + word;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            });
            if (currentLine) lines.push(currentLine);

            return (
              <g transform={`translate(${x},${y})`}>
                {lines.map((line, i) => (
                  <text
                    key={i}
                    x={0}
                    y={0}
                    dy={i * 12 + 5}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize={11}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          }}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatCurrency(value)}
            style={{ fontSize: 11, fontWeight: 500, fill: "#374151" }}
          />
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
          {data.map((agency) => (
            <TableRow key={agency.id}>
              <TableCell>
                <div className="font-medium">{agency.name}</div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(agency.value)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal > 0 ? ((agency.value / grandTotal) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-2 flex-shrink-0">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.fill }}
          />
          <span className="text-xs text-gray-600 truncate max-w-[80px]" title={item.name}>
            {item.acronym}
          </span>
        </div>
      ))}
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 400 : "100%";

    if (loading) {
      return <Skeleton className="w-full flex-1 min-h-[180px]" />;
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex-1 min-h-[180px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderLegend()}
        <div className="flex-1 min-h-0">
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
      {/* Compact Card View */}
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Building className="h-4 w-4" />
                Executing Agencies
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organizations managing budgets on behalf of funders
              </p>
            </div>
            <span className="text-lg font-bold text-slate-500">
              {formatCurrencyUSD(data.reduce((sum, d) => sum + d.value, 0))}
            </span>
          </div>
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
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
                  <Building className="h-6 w-6" />
                  Executing Agencies
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Top organizations managing budgets on behalf of funders by {METRIC_OPTIONS.find((o) => o.value === metric)?.label.toLowerCase()}.
                </DialogDescription>
              </div>
              <span className="text-2xl font-bold text-slate-500">
                {formatCurrencyUSD(data.reduce((sum, d) => sum + d.value, 0))}
              </span>
            </div>
          </DialogHeader>

          {/* Chart content */}
          <div className="mt-4">{renderContent(true)}</div>

          {/* Controls */}
          {renderControls(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
