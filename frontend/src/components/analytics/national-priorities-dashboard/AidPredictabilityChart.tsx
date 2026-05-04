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
import { Button } from "@/components/ui/button";
import { LoadingText, ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useChartExpansion } from "@/lib/chart-expansion-context";
import { formatTooltipCurrency, formatAxisCurrency } from "@/lib/format";
import { ChartTooltipCard } from "@/components/ui/chart-tooltip";

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
  compact?: boolean;
}

export function AidPredictabilityChart({ organizationId, compact = false }: AidPredictabilityChartProps) {
  const [data, setData] = useState<AidPredictabilityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  // Custom year selection
  const {
    customYears,
    selectedId: selectedCustomYearId,
    setSelectedId: setSelectedCustomYearId,
    selectedYear: selectedCustomYear,
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
    const isExpanded = useChartExpansion();
    if (active && payload && payload.length) {
      const yearLabel = payload[0]?.payload?.yearLabel || label;
      const rows = payload.map((entry: any) => ({
        label: entry.name === "plannedDisbursements" ? "Planned Disbursements" : "Actual Disbursements",
        value: formatTooltipCurrency(entry.value, isExpanded),
        color: entry.color || entry.fill || entry.stroke,
      }));
      return <ChartTooltipCard title={yearLabel} subtitle={selectedCustomYear?.name} rows={rows} />;
    }
    return null;
  };

  const renderBarChart = () => (
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
          tickFormatter={formatAxisCurrency}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        {!compact && (
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
  );

  const renderLineChart = () => (
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
          tickFormatter={formatAxisCurrency}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        {!compact && (
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
  );

  const renderAreaChart = () => (
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
          tickFormatter={formatAxisCurrency}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        {!compact && (
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
  );

  const renderTable = () => (
    <div className="overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow className="sticky top-0 bg-white z-10 [&>th]:align-bottom">
            <TableHead className="text-helper font-medium">Year</TableHead>
            <TableHead className="text-helper font-medium text-right whitespace-normal">Planned Disbursements</TableHead>
            <TableHead className="text-helper font-medium text-right whitespace-normal">Actual Disbursements</TableHead>
            <TableHead className="text-helper font-medium text-right">Variance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const variance = row.actualDisbursements - row.plannedDisbursements;
            return (
              <TableRow key={row.year}>
                <TableCell className="text-body font-medium">{row.yearLabel}</TableCell>
                <TableCell className="text-body text-right">{formatCurrency(row.plannedDisbursements)}</TableCell>
                <TableCell className="text-body text-right">{formatCurrency(row.actualDisbursements)}</TableCell>
                <TableCell className={cn(
                  "text-body text-right font-medium",
                  variance > 0 ? "text-green-600" : variance < 0 ? "text-destructive" : "text-muted-foreground"
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

  const renderContent = () => {
    if (loading) {
      return <ChartLoadingPlaceholder />;
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No predictability data available
        </div>
      );
    }

    if (viewMode === "table") {
      return renderTable();
    }

    switch (chartType) {
      case "line":
        return renderLineChart();
      case "area":
        return renderAreaChart();
      case "bar":
      default:
        return renderBarChart();
    }
  };

  const renderControls = () => (
    <div className={cn("flex items-center justify-end gap-2", !compact && "mt-2 pt-2 border-t")}>
      {/* Custom Year Selector (only in expanded view) */}
      {!compact && (
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
        {!compact && viewMode === "chart" && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartType === "bar" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartType("bar")}
              title="Bar Chart"
              aria-label="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartType === "line" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartType("line")}
              title="Line Chart"
              aria-label="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartType === "area" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartType("area")}
              title="Area Chart"
              aria-label="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* View mode toggles - only in expanded view */}
        {!compact && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === "chart" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode("chart")}
              title="Chart"
              aria-label="Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode("table")}
              title="Table View"
              aria-label="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Export button - only in expanded view */}
        {!compact && (
          <div className="flex items-center rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        {renderContent()}
      </div>
      {!compact && renderControls()}
      {!compact && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart compares planned disbursements against actual disbursements over time to measure aid predictability. A close match between planned and actual amounts indicates reliable and predictable aid flows. Planned disbursements that span multiple years are broken up proportionally across each year based on the number of days in each period.
        </p>
      )}
    </div>
  );
}
