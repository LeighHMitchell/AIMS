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
import { Button } from "@/components/ui/button";
import { LoadingText, ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { ChartTooltipCard, ChartTooltipRow } from "@/components/ui/chart-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Download,
  TrendingUp,
  Activity,
  Wallet,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { useCustomYears } from "@/hooks/useCustomYears";
import { CustomYearSelector } from "@/components/ui/custom-year-selector";
import { apiFetch } from '@/lib/api-fetch';
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format';
import { useChartExpansion } from '@/lib/chart-expansion-context';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ChartType = "bar" | "line" | "area" | "table";
type StackMode = "stacked" | "grouped";

interface YearlyCapitalSpend {
  year: number;
  capitalSpend: number;
  nonCapitalSpend: number;
  total: number;
}

// Slate-only palette aligned with the rest of the analytics dashboard.
const CAPITAL_COLORS = {
  capital: "#334155",     // slate-700 - Capital spend
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
  compact?: boolean;
}

export function CapitalSpendOverTimeChart({ refreshKey = 0, compact = false }: CapitalSpendOverTimeChartProps) {
  const isExpanded = useChartExpansion();
  const [data, setData] = useState<YearlyCapitalSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("budgets");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [stackMode, setStackMode] = useState<StackMode>("stacked");
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
    if (!active || !payload || !payload.length) return null

    const capitalItem = payload.find((p: any) => p.dataKey === "capitalSpend");
    const nonCapitalItem = payload.find((p: any) => p.dataKey === "nonCapitalSpend");
    const capitalValue = capitalItem?.value || 0;
    const nonCapitalValue = nonCapitalItem?.value || 0;
    const total = capitalValue + nonCapitalValue;
    const capitalPct = total > 0 ? ((capitalValue / total) * 100).toFixed(1) : "0";
    const nonCapitalPct = total > 0 ? ((nonCapitalValue / total) * 100).toFixed(1) : "0";
    const nonCapitalColor = chartType === "bar" ? CAPITAL_COLORS.nonCapital : CAPITAL_COLORS.accent1;

    const rows: ChartTooltipRow[] = [
      {
        label: 'Capital',
        value: formatTooltipCurrency(capitalValue, isExpanded),
        color: CAPITAL_COLORS.capital,
        extra: `${capitalPct}%`,
      },
      {
        label: 'Non-Capital',
        value: formatTooltipCurrency(nonCapitalValue, isExpanded),
        color: nonCapitalColor,
        extra: `${nonCapitalPct}%`,
        bordered: true,
      },
      {
        label: 'Total',
        value: formatTooltipCurrency(total, isExpanded),
        extra: '',
      },
    ];

    return <ChartTooltipCard title={label} rows={rows} />;
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%" key={`bar-${animationKey}`}>
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
          tickFormatter={formatAxisCurrency}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span className="text-muted-foreground">
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

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height="100%">
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
          tickFormatter={formatAxisCurrency}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span className="text-muted-foreground">
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

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height="100%">
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
          tickFormatter={formatAxisCurrency}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span className="text-muted-foreground">
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
    <div className="overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow className="sticky top-0 bg-white z-10 [&>th]:align-bottom">
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Capital</TableHead>
            <TableHead className="text-right whitespace-normal">Non-Capital</TableHead>
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
          <span className="text-helper text-muted-foreground">Capital ({formatCurrencyUSD(totals.capitalSpend)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: nonCapitalColor }}
          />
          <span className="text-helper text-muted-foreground">Non-Capital ({formatCurrencyUSD(totals.nonCapitalSpend)})</span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <ChartLoadingPlaceholder />;
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {!compact && renderLegend()}
        <div className="flex-1 min-h-0">
          {chartType === "bar" && renderBarChart()}
          {chartType === "line" && renderLineChart()}
          {chartType === "area" && renderAreaChart()}
          {chartType === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t flex-shrink-0">
      {/* Left side controls */}
      <div className="flex items-center gap-2">
        <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
          <SelectTrigger className="min-w-[280px]">
            <span className="flex items-center gap-2 truncate">
              {metric === 'budgets' && <Wallet className="h-4 w-4 flex-shrink-0" />}
              {metric === 'planned' && <Calendar className="h-4 w-4 flex-shrink-0" />}
              {metric === 'commitments' && <DollarSign className="h-4 w-4 flex-shrink-0" />}
              {metric === 'disbursements' && <DollarSign className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">
                {metric === 'budgets' && 'Total Budgets'}
                {metric === 'planned' && 'Total Planned Disbursements'}
                {metric === 'commitments' && 'Total Commitments'}
                {metric === 'disbursements' && 'Total Disbursements'}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="budgets">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>Total Budgets</span>
              </div>
            </SelectItem>
            <SelectItem value="planned">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Total Planned Disbursements</span>
              </div>
            </SelectItem>
            <SelectItem value="commitments">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Total Commitments</span>
              </div>
            </SelectItem>
            <SelectItem value="disbursements">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Total Disbursements</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

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
      </div>

      <div className="flex items-center gap-1">
        {/* Stack mode toggles - only show when in bar view */}
        {chartType === "bar" && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card mr-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", stackMode === "stacked" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => handleStackModeChange("stacked")}
              title="Stacked"
              aria-label="Stacked"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", stackMode === "grouped" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => handleStackModeChange("grouped")}
              title="Grouped"
              aria-label="Grouped"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Chart type toggles */}
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
            <TrendingUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", chartType === "area" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setChartType("area")}
            title="Area Chart"
            aria-label="Area Chart"
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", chartType === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setChartType("table")}
            title="Table View"
            aria-label="Table View"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>

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

  const renderTimeRangeFilter = () => (
    <div className="mb-4">
      <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRangeType)}>
        <SelectTrigger className="w-[140px] h-8 text-helper">
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
    <div className="h-full flex flex-col">
      {!compact && renderTimeRangeFilter()}
      {renderContent()}
      {!compact && renderControls()}
      {!compact && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart tracks capital vs non-capital spending over time. Capital spend refers to expenditure on physical assets like infrastructure and equipment, while non-capital covers operational and programmatic costs. Use the stacked and grouped views to compare proportions and absolute values.
        </p>
      )}
    </div>
  );
}
