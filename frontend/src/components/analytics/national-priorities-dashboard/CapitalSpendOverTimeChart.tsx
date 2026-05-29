"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { useYearRangeDefault } from "@/hooks/useYearRangeDefault";
import { YearRangeChip } from "@/components/ui/year-range-chip";
import { getCustomYearLabel } from "@/types/custom-years";
import { MetricsMultiSelect } from "@/components/analytics/MetricsMultiSelect";
import { type Metric } from "@/lib/financial-metrics";

// Capital APIs support these four sources; map shared Metric keys → API tokens.
const CAPITAL_METRIC_KEYS: Metric[] = ['budgets', 'planned', 'tx_2', 'tx_3'];
const METRIC_TO_API: Partial<Record<Metric, string>> = {
  budgets: 'budgets',
  planned: 'planned',
  tx_2: 'commitments',
  tx_3: 'disbursements',
};
import { apiFetch } from '@/lib/api-fetch';
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format';
import { useChartExpansion } from '@/lib/chart-expansion-context';
import { ChartDataTable } from '@/components/ui/chart-data-table';

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
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['budgets']);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [stackMode, setStackMode] = useState<StackMode>("stacked");
  // Standard calendar + year-range selection (replaces the old "Last 5Y" filter).
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [dateWindow, setDateWindow] = useState<{ from: Date; to: Date } | null>(null);
  const [totals, setTotals] = useState({ capitalSpend: 0, nonCapitalSpend: 0 });

  // Default the year picker to the full span of years that actually have data
  // (min → max), rather than an empty selection / rolling window.
  const dataYears = useMemo(
    () => data.map((d) => d.year).filter((y): y is number => Number.isFinite(y)),
    [data]
  );
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears);
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

      const apiMetrics = selectedMetrics.map(m => METRIC_TO_API[m]).filter(Boolean) as string[];
      const params = new URLSearchParams({ metrics: apiMetrics.join(',') || 'budgets' });
      if (selectedCustomYearId) params.set("customYearId", selectedCustomYearId);
      if (dateWindow?.from) params.set("dateFrom", dateWindow.from.toISOString());
      if (dateWindow?.to) params.set("dateTo", dateWindow.to.toISOString());

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
  }, [selectedMetrics, dateWindow, selectedCustomYearId]);

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
    exportChartToCSV(exportData, `capital-spend-over-time`);
    toast.success("Data exported successfully");
  };

  // Label each year in the selected calendar (e.g. CY2024 / FY24-25). The API
  // already buckets by the calendar's fiscal year when customYearId is sent.
  const selectedYear = customYears.find(cy => cy.id === selectedCustomYearId)
  const chartData = data.map(d => ({
    ...d,
    periodLabel: selectedYear ? getCustomYearLabel(selectedYear, d.year) : String(d.year),
  }))

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
    <ResponsiveContainer width="100%" height={isExpanded ? 440 : "100%"} key={`bar-${animationKey}`}>
      <BarChart
        data={chartData}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="periodLabel"
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
    <ResponsiveContainer width="100%" height={isExpanded ? 440 : "100%"}>
      <LineChart
        data={chartData}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="periodLabel"
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
    <ResponsiveContainer width="100%" height={isExpanded ? 440 : "100%"}>
      <AreaChart
        data={chartData}
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
          dataKey="periodLabel"
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

  const renderTable = () => {
    const tableData = chartData.map((row) => ({
      ...row,
      capitalPercentage: row.total > 0 ? (row.capitalSpend / row.total) * 100 : 0,
    }));
    return (
      <ChartDataTable
        rows={tableData}
        columns={[
          { key: 'periodLabel', label: 'Year', numeric: false },
          { key: 'capitalSpend', label: 'Capital', numeric: true, currency: 'USD', color: CAPITAL_COLORS.capital },
          { key: 'nonCapitalSpend', label: 'Non-Capital', numeric: true, currency: 'USD', color: CAPITAL_COLORS.nonCapital },
          { key: 'total', label: 'Total', numeric: true, currency: 'USD', color: CAPITAL_COLORS.accent1 },
          {
            key: 'capitalPercentage',
            label: 'Capital %',
            numeric: true,
            includeInTotal: false,
            format: (v) => `${(Number(v) || 0).toFixed(1)}%`,
          },
        ]}
        maxHeight="100%"
      />
    );
  };

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
        {/* The recharts <Legend> inside each chart already labels Capital /
            Non-Capital, so the separate totals legend above was redundant. */}
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
    <div className="space-y-3">
      {/* Calendar + year-range selector on its own row at the top (expanded
          only) — standard control used across the dashboard. */}
      {!compact && (
        <YearRangeChip
          selectedYears={selectedYears}
          onYearsChange={setSelectedYears}
          actualDataRange={actualDataRange}
          customYears={customYears}
          calendarType={selectedCustomYearId ?? ''}
          onCalendarTypeChange={setSelectedCustomYearId}
          onDateRangeChange={setDateWindow}
        />
      )}
      {/* Controls row — filters + toggles left, CSV right. */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
        {/* Filters (left) — shared metrics multi-select. */}
        <div className="flex items-center gap-2 flex-wrap">
          <MetricsMultiSelect
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            availableKeys={CAPITAL_METRIC_KEYS}
            triggerClassName="h-8 justify-between min-w-[240px]"
          />
        </div>
        {/* Button groups + CSV, right-aligned. */}
        <div className="flex items-center gap-2 flex-wrap">
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

        </div>
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
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {!compact && renderControls()}
      {renderContent()}
      {!compact && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart tracks capital vs non-capital spending over time. Capital spend refers to expenditure on physical assets like infrastructure and equipment, while non-capital covers operational and programmatic costs. Use the stacked and grouped views to compare proportions and absolute values.
        </p>
      )}
    </div>
  );
}
