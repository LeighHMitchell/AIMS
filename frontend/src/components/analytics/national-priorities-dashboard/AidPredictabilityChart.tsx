"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingText } from "@/components/ui/loading-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  AlertCircle,
  BarChart3,
  Table as TableIcon,
  Maximize2,
  Download,
  LineChart as LineChartIcon,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AidPredictabilityPoint } from "@/types/national-priorities";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { toast } from "sonner";
import { useCustomYears } from "@/hooks/useCustomYears";
import { CustomYearSelector } from "@/components/ui/custom-year-selector";

type ChartType = "bar" | "line" | "area";
type ViewMode = "chart" | "table";

// Color palette for Aid Predictability chart
const CHART_COLORS = {
  planned: "#4c5568",    // Blue Slate - darker for planned
  actual: "#7b95a7",     // Cool Steel - lighter for actual
};

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

interface AidPredictabilityChartProps {
  organizationId?: string;
}

export function AidPredictabilityChart({ organizationId }: AidPredictabilityChartProps) {
  const [data, setData] = useState<AidPredictabilityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [isExpanded, setIsExpanded] = useState(false);

  // Custom year selection
  const {
    customYears,
    selectedId: selectedCustomYearId,
    setSelectedId: setSelectedCustomYearId,
    loading: customYearsLoading,
  } = useCustomYears();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (selectedCustomYearId) {
        params.set("customYearId", selectedCustomYearId);
      }
      if (organizationId) {
        params.set("organizationId", organizationId);
      }

      const url = `/api/analytics/aid-predictability${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
    } catch (err: any) {
      console.error("Error fetching aid predictability data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedCustomYearId, organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvContent = [
      ["Year", "Year Label", "Planned Disbursements (USD)", "Actual Disbursements (USD)"],
      ...data.map((d) => [d.year, d.yearLabel, d.plannedDisbursements, d.actualDisbursements]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "aid_predictability.csv";
    link.click();
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Get the yearLabel from the payload's data point
      const yearLabel = payload[0]?.payload?.yearLabel || label;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{yearLabel}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {`${entry.name === "plannedDisbursements" ? "Planned Disbursements" : "Actual Disbursements"}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderBarChart = (expanded: boolean = false) => (
    <div className={expanded ? "h-[500px]" : "h-[320px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
            dataKey="yearLabel"
            tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
            stroke={CHART_STRUCTURE_COLORS.axis}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
            stroke={CHART_STRUCTURE_COLORS.axis}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
          {expanded && (
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value) =>
                value === "plannedDisbursements"
                  ? "Planned Disbursements"
                  : "Actual Disbursements"
              }
            />
          )}
          <Bar
            dataKey="plannedDisbursements"
            fill={CHART_COLORS.planned}
            name="plannedDisbursements"
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
          <Bar
            dataKey="actualDisbursements"
            fill={CHART_COLORS.actual}
            name="actualDisbursements"
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderLineChart = (expanded: boolean = false) => (
    <div className={expanded ? "h-[500px]" : "h-[320px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
            dataKey="yearLabel"
            tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
            stroke={CHART_STRUCTURE_COLORS.axis}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
            stroke={CHART_STRUCTURE_COLORS.axis}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          {expanded && (
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value) =>
                value === "plannedDisbursements"
                  ? "Planned Disbursements"
                  : "Actual Disbursements"
              }
            />
          )}
          <Line
            type="monotone"
            dataKey="plannedDisbursements"
            stroke={CHART_COLORS.planned}
            strokeWidth={2}
            name="plannedDisbursements"
            dot={{ r: 4 }}
            animationDuration={300}
          />
          <Line
            type="monotone"
            dataKey="actualDisbursements"
            stroke={CHART_COLORS.actual}
            strokeWidth={2}
            name="actualDisbursements"
            dot={{ r: 4 }}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderAreaChart = (expanded: boolean = false) => (
    <div className={expanded ? "h-[500px]" : "h-[320px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.planned} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.planned} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.actual} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.actual} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
            dataKey="yearLabel"
            tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
            stroke={CHART_STRUCTURE_COLORS.axis}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
            stroke={CHART_STRUCTURE_COLORS.axis}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          {expanded && (
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value) =>
                value === "plannedDisbursements"
                  ? "Planned Disbursements"
                  : "Actual Disbursements"
              }
            />
          )}
          <Area
            type="monotone"
            dataKey="plannedDisbursements"
            stroke={CHART_COLORS.planned}
            fill="url(#colorPlanned)"
            name="plannedDisbursements"
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="actualDisbursements"
            stroke={CHART_COLORS.actual}
            fill="url(#colorActual)"
            name="actualDisbursements"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderTable = (expanded: boolean = false) => (
    <div className={cn("overflow-auto", expanded ? "max-h-[500px]" : "max-h-[320px]")}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-semibold">Year</TableHead>
            <TableHead className="text-xs font-semibold text-right">Planned Disbursements</TableHead>
            <TableHead className="text-xs font-semibold text-right">Actual Disbursements</TableHead>
            <TableHead className="text-xs font-semibold text-right">Variance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const variance = row.actualDisbursements - row.plannedDisbursements;
            return (
              <TableRow key={row.year}>
                <TableCell className="text-sm font-medium">{row.yearLabel}</TableCell>
                <TableCell className="text-sm text-right">{formatCurrency(row.plannedDisbursements)}</TableCell>
                <TableCell className="text-sm text-right">{formatCurrency(row.actualDisbursements)}</TableCell>
                <TableCell className={cn(
                  "text-sm text-right font-medium",
                  variance > 0 ? "text-green-600" : variance < 0 ? "text-red-600" : "text-slate-500"
                )}>
                  {variance > 0 ? "+" : ""}{formatCurrency(variance)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    if (loading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>;
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className={cn("flex items-center justify-center text-muted-foreground", expanded ? "h-[500px]" : "h-[320px]")}>
          No predictability data available
        </div>
      );
    }

    if (viewMode === "table") {
      return renderTable(expanded);
    }

    switch (chartType) {
      case "line":
        return renderLineChart(expanded);
      case "area":
        return renderAreaChart(expanded);
      case "bar":
      default:
        return renderBarChart(expanded);
    }
  };

  const renderControls = (expanded: boolean = false) => (
    <div className={cn("flex items-center justify-end gap-2", expanded && "mt-2 pt-2 border-t")}>
      {/* Custom Year Selector (only in expanded view) */}
      {expanded && (
        <CustomYearSelector
          customYears={customYears}
          selectedId={selectedCustomYearId}
          onSelect={setSelectedCustomYearId}
          loading={customYearsLoading}
          placeholder="Year type"
        />
      )}

      {/* Chart controls */}
      <div className="flex items-center gap-1">
        {/* Chart type toggles - only show in expanded view when in chart mode */}
        {expanded && viewMode === "chart" && (
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === "bar" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
              onClick={() => setChartType("bar")}
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === "line" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
              onClick={() => setChartType("line")}
              title="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === "area" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
              onClick={() => setChartType("area")}
              title="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* View mode toggles - only in expanded view */}
        {expanded && (
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", viewMode === "chart" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
              onClick={() => setViewMode("chart")}
              title="Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", viewMode === "table" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
              onClick={() => setViewMode("table")}
              title="Table"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
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
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium text-slate-700 truncate">
                Aid Predictability
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Planned vs actual disbursements by year
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
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl font-semibold text-slate-800">
              Aid Predictability
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Comparing planned disbursements against actual disbursements by year
            </DialogDescription>
          </DialogHeader>

          {/* Chart/Table content */}
          <div className="mt-4 flex-1 min-h-0 flex flex-col">{renderContent(true)}</div>

          {/* Controls */}
          <div className="flex-shrink-0">{renderControls(true)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
