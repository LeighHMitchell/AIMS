"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Maximize2,
  Download,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { useCustomYears } from "@/hooks/useCustomYears";
import { CustomYearSelector } from "@/components/ui/custom-year-selector";
import { apiFetch } from '@/lib/api-fetch';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ChartType = "bar" | "line" | "area" | "table";
type StackMode = "stacked" | "grouped";

interface YearlyCapitalSpend {
  year: number;
  capitalSpend: number;
  nonCapitalSpend: number;
  total: number;
}

// Custom palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
const CAPITAL_COLORS = {
  capital: "#dc2626",     // Primary Scarlet - Capital spend
  nonCapital: "#cfd0d5",  // Pale Slate - Non-capital
  accent1: "#4c5568",     // Blue Slate
  accent2: "#7b95a7",     // Cool Steel
  background: "#f1f4f8",  // Platinum
};

// Animation duration in milliseconds
const ANIMATION_DURATION = 500;

const METRIC_OPTIONS = [
  { value: "budgets", label: "Total Budgets" },
  { value: "planned", label: "Planned Disbursements" },
  { value: "commitments", label: "Commitments" },
  { value: "disbursements", label: "Disbursements" },
];

const TIME_RANGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
];

type TimeRangeType = "all" | "3y" | "5y" | "10y";

function getDateRangeFromTimeRange(timeRange: TimeRangeType): { from: Date | undefined; to: Date | undefined } {
  if (timeRange === "all") {
    return { from: undefined, to: undefined };
  }
  
  const now = new Date();
  const from = new Date();
  
  switch (timeRange) {
    case "3y":
      from.setFullYear(now.getFullYear() - 3);
      break;
    case "5y":
      from.setFullYear(now.getFullYear() - 5);
      break;
    case "10y":
      from.setFullYear(now.getFullYear() - 10);
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

interface CapitalSpendOverTimeChartProps {
  refreshKey?: number;
}

export function CapitalSpendOverTimeChart({ refreshKey = 0 }: CapitalSpendOverTimeChartProps) {
  const [data, setData] = useState<YearlyCapitalSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("budgets");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [stackMode, setStackMode] = useState<StackMode>("stacked");
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeType>("5y");
  const [totals, setTotals] = useState({ capitalSpend: 0, nonCapitalSpend: 0 });
  // Animation key to trigger re-render with animation
  const [animationKey, setAnimationKey] = useState(0);

  // Custom year selection
  const {
    customYears,
    selectedId: selectedCustomYearId,
    setSelectedId: setSelectedCustomYearId,
    loading: customYearsLoading,
  } = useCustomYears();

  // Trigger animation when stack mode changes
  const handleStackModeChange = (newMode: StackMode) => {
    setStackMode(newMode);
    setAnimationKey((prev) => prev + 1);
  };

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

      const response = await apiFetch(`/api/analytics/capital-spend-over-time?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
      setTotals(result.totals || { capitalSpend: 0, nonCapitalSpend: 0 });
    } catch (error: any) {
      console.error("[CapitalSpendOverTimeChart] Error:", error);
      toast.error("Failed to load capital spend time series data");
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
      Year: d.year,
      "Capital Spend (USD)": d.capitalSpend,
      "Non-Capital Spend (USD)": d.nonCapitalSpend,
      "Total (USD)": d.total,
    }));
    exportChartToCSV(exportData, `capital-spend-over-time-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const capitalItem = payload.find((p: any) => p.dataKey === "capitalSpend");
      const nonCapitalItem = payload.find((p: any) => p.dataKey === "nonCapitalSpend");
      const capitalValue = capitalItem?.value || 0;
      const nonCapitalValue = nonCapitalItem?.value || 0;
      const total = capitalValue + nonCapitalValue;
      const capitalPct = total > 0 ? ((capitalValue / total) * 100).toFixed(1) : "0";
      const nonCapitalPct = total > 0 ? ((nonCapitalValue / total) * 100).toFixed(1) : "0";
      // Line and area charts use accent1 for non-capital
      const nonCapitalColor = chartType === "bar" ? CAPITAL_COLORS.nonCapital : CAPITAL_COLORS.accent1;

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-surface-muted px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{label}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CAPITAL_COLORS.capital }} />
                      <span className="text-slate-700 font-medium">Capital</span>
                    </div>
                  </td>
                  <td className="py-1 text-right font-semibold text-slate-900">{formatCurrency(capitalValue)}</td>
                  <td className="py-1 text-right text-xs text-slate-500 pl-2">{capitalPct}%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: nonCapitalColor }} />
                      <span className="text-slate-700 font-medium">Non-Capital</span>
                    </div>
                  </td>
                  <td className="py-1 text-right font-semibold text-slate-900">{formatCurrency(nonCapitalValue)}</td>
                  <td className="py-1 text-right text-xs text-slate-500 pl-2">{nonCapitalPct}%</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3 text-slate-700 font-medium">Total</td>
                  <td className="py-1 text-right font-bold text-slate-900">{formatCurrency(total)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height} key={`bar-${animationKey}`}>
      <BarChart
        data={data}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="year"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickFormatter={(value) => formatCurrency(value)}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span className="text-gray-600">
              {value === "capitalSpend" ? "Capital" : "Non-Capital"}
            </span>
          )}
        />
        <Bar
          dataKey="capitalSpend"
          stackId={stackMode === "stacked" ? "a" : undefined}
          fill={CAPITAL_COLORS.capital}
          name="capitalSpend"
          radius={stackMode === "grouped" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          maxBarSize={stackMode === "grouped" ? 30 : 60}
          isAnimationActive={true}
          animationDuration={ANIMATION_DURATION}
          animationEasing="ease-in-out"
        />
        <Bar
          dataKey="nonCapitalSpend"
          stackId={stackMode === "stacked" ? "a" : undefined}
          fill={CAPITAL_COLORS.nonCapital}
          name="nonCapitalSpend"
          radius={[4, 4, 0, 0]}
          maxBarSize={stackMode === "grouped" ? 30 : 60}
          isAnimationActive={true}
          animationDuration={ANIMATION_DURATION}
          animationEasing="ease-in-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="year"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickFormatter={(value) => formatCurrency(value)}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span className="text-gray-600">
              {value === "capitalSpend" ? "Capital" : "Non-Capital"}
            </span>
          )}
        />
        <Line
          type="monotone"
          dataKey="capitalSpend"
          stroke={CAPITAL_COLORS.capital}
          strokeWidth={2.5}
          name="capitalSpend"
          dot={{ r: 4, fill: CAPITAL_COLORS.capital }}
          activeDot={{ r: 6 }}
          isAnimationActive={true}
          animationDuration={ANIMATION_DURATION}
          animationEasing="ease-in-out"
        />
        <Line
          type="monotone"
          dataKey="nonCapitalSpend"
          stroke={CAPITAL_COLORS.accent1}
          strokeWidth={2.5}
          name="nonCapitalSpend"
          dot={{ r: 4, fill: CAPITAL_COLORS.accent1 }}
          activeDot={{ r: 6 }}
          isAnimationActive={true}
          animationDuration={ANIMATION_DURATION}
          animationEasing="ease-in-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderAreaChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
      >
        <defs>
          <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CAPITAL_COLORS.capital} stopOpacity={0.8} />
            <stop offset="95%" stopColor={CAPITAL_COLORS.capital} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="nonCapitalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CAPITAL_COLORS.accent1} stopOpacity={0.8} />
            <stop offset="95%" stopColor={CAPITAL_COLORS.accent1} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="year"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickFormatter={(value) => formatCurrency(value)}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span className="text-gray-600">
              {value === "capitalSpend" ? "Capital" : "Non-Capital"}
            </span>
          )}
        />
        <Area
          type="monotone"
          dataKey="nonCapitalSpend"
          stackId="1"
          stroke={CAPITAL_COLORS.accent1}
          fill="url(#nonCapitalGradient)"
          name="nonCapitalSpend"
          isAnimationActive={true}
          animationDuration={ANIMATION_DURATION}
          animationEasing="ease-in-out"
        />
        <Area
          type="monotone"
          dataKey="capitalSpend"
          stackId="1"
          stroke={CAPITAL_COLORS.capital}
          fill="url(#capitalGradient)"
          name="capitalSpend"
          isAnimationActive={true}
          animationDuration={ANIMATION_DURATION}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-auto max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Capital</TableHead>
            <TableHead className="text-right">Non-Capital</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Capital %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.year}>
              <TableCell className="font-medium">{row.year}</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(row.capitalSpend)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(row.nonCapitalSpend)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(row.total)}
              </TableCell>
              <TableCell className="text-right">
                {row.total > 0 ? ((row.capitalSpend / row.total) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderLegend = () => {
    // Line and area charts use accent1 for non-capital
    const nonCapitalColor = chartType === "bar" ? CAPITAL_COLORS.nonCapital : CAPITAL_COLORS.accent1;
    
    return (
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: CAPITAL_COLORS.capital }}
          />
          <span className="text-xs text-gray-600">Capital ({formatCurrencyUSD(totals.capitalSpend)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: nonCapitalColor }}
          />
          <span className="text-xs text-gray-600">Non-Capital ({formatCurrencyUSD(totals.nonCapitalSpend)})</span>
        </div>
      </div>
    );
  };

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 350 : "100%";

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
        <div className={expanded ? "h-[400px] mb-4" : "h-[280px]"}>
          {chartType === "bar" && renderBarChart(chartHeight)}
          {chartType === "line" && renderLineChart(chartHeight)}
          {chartType === "area" && renderAreaChart(chartHeight)}
          {chartType === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = (expanded: boolean = false) => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t">
      {/* Left side controls */}
      <div className="flex items-center gap-2">
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
      </div>

      <div className="flex items-center gap-1">
        {/* Stack mode toggles - only show when in bar view */}
        {chartType === "bar" && (
          <div className="flex items-center border rounded-md mr-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", stackMode === "stacked" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
              onClick={() => handleStackModeChange("stacked")}
              title="Stacked"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", stackMode === "grouped" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
              onClick={() => handleStackModeChange("grouped")}
              title="Grouped"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Chart type toggles */}
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
            <TrendingUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", chartType === "area" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
            onClick={() => setChartType("area")}
            title="Area Chart"
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", chartType === "table" ? "bg-slate-200 text-slate-900" : "text-slate-400")}
            onClick={() => setChartType("table")}
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

  const grandTotal = totals.capitalSpend + totals.nonCapitalSpend;

  return (
    <>
      {/* Compact Card View */}
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium text-slate-700 truncate">
                Capital vs Non-Capital Spend
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Yearly breakdown of spending types
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
                  Capital vs Non-Capital Spend Over Time
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Yearly breakdown by {METRIC_OPTIONS.find((o) => o.value === metric)?.label.toLowerCase()}
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
