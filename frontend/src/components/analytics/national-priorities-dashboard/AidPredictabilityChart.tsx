"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { useYearRangeDefault } from "@/hooks/useYearRangeDefault";
import { YearRangeChip } from "@/components/ui/year-range-chip";
import { useChartExpansion } from "@/lib/chart-expansion-context";
import { formatTooltipCurrency, formatAxisCurrency, formatCurrencyPrecise } from "@/lib/format";
import { ChartTooltipCard } from "@/components/ui/chart-tooltip";
import { ChartDataTable } from "@/components/ui/chart-data-table";

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

  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Default the year picker to the full span of years that actually have data
  // (min → max), rather than an empty selection / rolling window.
  const dataYears = useMemo(
    () => data.map((d) => d.year).filter((y): y is number => Number.isFinite(y)),
    [data]
  );
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears);

  // Filter the fetched series to the picked year range (from YearRangeChip).
  // An empty selection means "all years".
  const displayData = useMemo(() => {
    if (selectedYears.length === 0) return data;
    const min = Math.min(...selectedYears);
    const max = Math.max(...selectedYears);
    return data.filter((d) => d.year >= min && d.year <= max);
  }, [data, selectedYears]);

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

  // Wait until the custom-year selection is resolved before fetching, so the
  // first request uses the chosen calendar id (not a null → system-default
  // fallback that races the resolved fetch and leaves the X-axis labelled by a
  // different calendar than the dropdown shows).
  useEffect(() => {
    if (customYearsLoading) return;
    fetchData();
  }, [fetchData, customYearsLoading]);

  const handleExport = () => {
    if (!displayData || displayData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvContent = [
      ["Year", "Year Label", "Planned Disbursements (USD)", "Actual Disbursements (USD)"],
      ...displayData.map((d) => [d.year, d.yearLabel, d.plannedDisbursements, d.actualDisbursements]),
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
        data={displayData}
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
        data={displayData}
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
        data={displayData}
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

  const renderTable = () => {
    const rows = displayData.map((d) => ({
      ...d,
      variance: d.actualDisbursements - d.plannedDisbursements,
    }));
    return (
      <ChartDataTable
        rows={rows}
        columns={[
          { key: 'yearLabel', label: 'Year', numeric: false },
          { key: 'plannedDisbursements', label: 'Planned Disbursements', numeric: true, currency: 'USD', color: CHART_COLORS.planned },
          { key: 'actualDisbursements', label: 'Actual Disbursements', numeric: true, currency: 'USD', color: CHART_COLORS.actual },
          {
            key: 'variance',
            label: 'Variance',
            numeric: true,
            format: (v) => {
              const n = Number(v) || 0;
              return (
                <span className={cn('font-medium', n > 0 ? 'text-green-600' : n < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {n > 0 ? '+' : ''}{formatCurrencyPrecise(n)}
                </span>
              );
            },
          },
        ]}
        currency="USD"
        maxHeight="100%"
      />
    );
  };

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

    if (!displayData || displayData.length === 0) {
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
    <div className="space-y-3">
      {/* Calendar + year selector on its own row at the top (expanded only) */}
      {!compact && (
        <div className="flex items-start gap-2">
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            actualDataRange={actualDataRange}
            customYears={customYears}
            calendarType={selectedCustomYearId ?? undefined}
            onCalendarTypeChange={setSelectedCustomYearId}
          />
        </div>
      )}

      {/* Controls row — no dropdowns here, so the button groups + CSV are all
          right-aligned. */}
      <div className={cn("flex items-center justify-end gap-2 flex-wrap", !compact && "mb-3")}>
        {/* Chart-style + table view toggle in ONE group, so a chart type or
            table is a single click. Bar/line/area also switch back to chart
            view; table switches to table view. */}
        {!compact && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === "chart" && chartType === "bar" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => { setChartType("bar"); setViewMode("chart") }}
              title="Bar Chart"
              aria-label="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === "chart" && chartType === "line" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => { setChartType("line"); setViewMode("chart") }}
              title="Line Chart"
              aria-label="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === "chart" && chartType === "area" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => { setChartType("area"); setViewMode("chart") }}
              title="Area Chart"
              aria-label="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
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
        {/* Export button - only in expanded view, right-aligned alone */}
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
      {!compact && renderControls()}
      <div className={compact ? "flex-1 min-h-0" : "h-[480px]"}>
        {renderContent()}
      </div>
      {!compact && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart compares planned disbursements against actual disbursements over time to measure aid predictability. A close match between planned and actual amounts indicates reliable and predictable aid flows. Planned disbursements that span multiple years are broken up proportionally across each year based on the number of days in each period.
        </p>
      )}
    </div>
  );
}
