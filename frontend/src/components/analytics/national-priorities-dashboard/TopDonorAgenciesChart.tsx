"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { LoadingText, ChartLoadingPlaceholder } from "@/components/ui/loading-text";
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
  PieChart as PieChartIcon,
  Table as TableIcon,
  Download,
  Wallet,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { CHART_RANKED_PALETTE, OTHERS_COLOR, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { apiFetch } from '@/lib/api-fetch';
import { formatTooltipCurrency } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { useChartExpansion } from '@/lib/chart-expansion-context';
import { ChartDataTable } from '@/components/ui/chart-data-table';
import { YearRangeChip } from '@/components/ui/year-range-chip';
import { MetricsMultiSelect } from '@/components/analytics/MetricsMultiSelect';
import { type Metric, METRIC_LABEL, metricColor } from '@/lib/financial-metrics';
import { CustomYear, getCustomYearRange, pickDefaultCalendarYearId } from '@/types/custom-years';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ViewMode = "bar" | "pie" | "table";

// Full span of years the picker can offer (2010 → current + 10), used to default
// the selection to the entire available range rather than a rolling window.
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
);

interface DonorData {
  id: string;
  name: string;
  acronym: string;
  value: number;
  byMetric?: Record<string, number>;
  activityCount: number;
}

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
  compact?: boolean;
}

type OpenFilter = 'metric' | 'timeRange' | null;

export function TopDonorAgenciesChart({ refreshKey = 0, compact = false }: TopDonorAgenciesChartProps) {
  const isExpanded = useChartExpansion();
  const [data, setData] = useState<DonorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['budgets']);
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  // Standard calendar + year-range selection (replaces the old time-range filter).
  const [customYears, setCustomYears] = useState<CustomYear[]>([]);
  const [calendarType, setCalendarType] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  // Top N selector — defaults to "all"; the API treats 'all' as no limit.
  const [topN, setTopN] = useState<number | 'all'>('all');
  // When >1 metric is selected, render one bar per metric — grouped (side by
  // side) by default, or stacked into one column when `stacked` is on.
  const [stacked, setStacked] = useState(false);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const filterOpenHandler = (key: Exclude<OpenFilter, null>) => (open: boolean) => {
    setOpenFilter(prev => open ? key : (prev === key ? null : prev));
  };

  // Fetch custom years on mount and set the system default calendar.
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await apiFetch('/api/custom-years');
        if (response.ok) {
          const result = await response.json();
          const years = (result.data || []) as CustomYear[];
          setCustomYears(years);
          // Default to the Gregorian Calendar Year regardless of the DB default.
          const defaultId = pickDefaultCalendarYearId(years, result.defaultId);
          if (defaultId) setCalendarType(defaultId);
        }
      } catch (err) {
        console.error('Failed to fetch custom years:', err);
      }
    };
    fetchCustomYears();
  }, []);

  // Compute the effective date window from the selected years using the chosen
  // custom-year calendar. Empty selection ⇒ no date filter (all time).
  const dateRange = useMemo<{ from: Date; to: Date } | null>(() => {
    if (selectedYears.length === 0) return null;
    const customYear = customYears.find((cy) => cy.id === calendarType);
    if (!customYear) return null;
    const sortedYears = [...selectedYears].sort((a, b) => a - b);
    const firstRange = getCustomYearRange(customYear, sortedYears[0]);
    const lastRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1]);
    return { from: firstRange.start, to: lastRange.end };
  }, [customYears, calendarType, selectedYears]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ metrics: selectedMetrics.join(','), topN: String(topN) });
      if (dateRange?.from) {
        params.set("dateFrom", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.set("dateTo", dateRange.to.toISOString());
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
      toast.error("Failed to load development partner agencies data");
    } finally {
      setLoading(false);
    }
  }, [selectedMetrics, dateRange, topN]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Default the year picker to the full available span (min → max) on first
  // mount; later user selections stick. Aggregated data has no per-year field,
  // so we default to the picker's full range rather than a derived data range.
  useEffect(() => {
    if (selectedYears.length === 0) setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    exportChartToCSV(exportData, `top-donor-agencies`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as DonorData & { fill?: string; barFill?: string };
      const isMetricBars = typeof payload[0]?.dataKey === 'string' && payload[0].dataKey.startsWith('m_');
      const rows: any[] = isMetricBars
        ? payload.map((entry: any) => ({
            label: entry.name,
            value: formatTooltipCurrency(entry.value, isExpanded),
            color: entry.color || entry.fill,
          }))
        : [{
            label: 'Value',
            value: formatTooltipCurrency(item.value, isExpanded),
            color: item.barFill || item.fill,
          }];
      if (item.activityCount > 0) {
        rows.push({
          label: 'Records',
          value: item.activityCount,
        });
      }
      const subtitle = item.acronym !== item.name ? item.acronym : undefined;
      return <ChartTooltipCard title={item.name} subtitle={subtitle} rows={rows} />;
    }
    return null;
  };

  // Prepare chart data with colors
  // `fill` drives the pie chart (distinct slice colours). `barFill` drives
  // the bar chart (single Blue Slate so all bars share one colour, with
  // OTHERS distinct for contrast).
  const chartData = data.map((item, index) => {
    const row: any = {
      ...item,
      fill: item.id === "others" ? OTHERS_COLOR : CHART_RANKED_PALETTE[index % CHART_RANKED_PALETTE.length],
      barFill: item.id === "others" ? OTHERS_COLOR : '#4c5568',
    };
    // One field per selected metric so the bar chart can draw a bar per metric.
    selectedMetrics.forEach((m) => {
      row[`m_${m}`] = item.byMetric?.[m] ?? 0;
    });
    return row;
  });

  // Only transaction-type metrics stack together; Budgets/Planned stay as
  // separate bars even in stacked mode.
  const txMetrics = selectedMetrics.filter((m) => m.startsWith('tx_'));

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
          dataKey="acronym"
          stroke={CHART_STRUCTURE_COLORS.axis}
            fontSize={11}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickFormatter={formatCurrency}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        {selectedMetrics.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {selectedMetrics.map((m) => {
          // Stack only the transaction types (into one column); Budgets/Planned
          // remain separate grouped bars. Round only the top of the tx stack.
          const inStack = stacked && m.startsWith('tx_');
          const isTopOfStack = inStack && txMetrics[txMetrics.length - 1] === m;
          return (
            <Bar
              key={m}
              dataKey={`m_${m}`}
              name={METRIC_LABEL[m]}
              fill={metricColor(m)}
              stackId={inStack ? 'tx' : undefined}
              radius={inStack && !isTopOfStack ? 0 : [4, 4, 0, 0]}
              maxBarSize={selectedMetrics.length > 1 ? 36 : 60}
            >
              {/* Per-cell fill so the metric's series colour wins over each row's
                  `fill` field (which recharts would otherwise use per bar). */}
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={metricColor(m)} />
              ))}
            </Bar>
          );
        })}
        </BarChart>
      </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height="100%">
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

  const renderTable = () => {
    const tableData = chartData.map((d) => ({
      ...d,
      percent: grandTotal > 0 ? (d.value / grandTotal) * 100 : 0,
    }));
    return (
      <ChartDataTable
        rows={tableData}
        columns={[
          {
            key: 'name',
            label: 'Organisation',
            numeric: false,
            format: (_v, row) => (
              <span className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: (row as any).fill }}
                />
                <span>
                  {row.name}
                  {row.acronym !== row.name && (
                    <span className="block font-normal text-helper text-muted-foreground">
                      {row.acronym}
                    </span>
                  )}
                </span>
              </span>
            ),
          },
          { key: 'value', label: 'Value (USD)', numeric: true, currency: 'USD' },
          {
            key: 'percent',
            label: '%',
            numeric: true,
            includeInTotal: false,
            format: (v) => `${(Number(v) || 0).toFixed(1)}%`,
          },
        ]}
        maxHeight="100%"
      />
    );
  };

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-2">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.fill }}
          />
          <span className="text-helper text-muted-foreground">{item.acronym}</span>
        </div>
      ))}
    </div>
  );

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
        <div className="flex-1 min-h-0">
          {viewMode === "bar" && renderBarChart()}
          {viewMode === "pie" && renderPieChart()}
          {viewMode === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
      {/* Filters + toggles (left) — shared metrics multi-select (Budgets,
          Planned Disbursements, and the 13 IATI transaction types; summed). */}
      <div className="flex items-center gap-2 flex-wrap">
          <MetricsMultiSelect
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            triggerClassName="h-8 justify-between min-w-[240px]"
          />
        </div>
        {/* Button groups + CSV, right-aligned. */}
        <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {/* Top N quick picker — same set used in SectorDisbursementOverTime. */}
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
          {([3, 5, 10, 'all'] as const).map(n => (
            <button
              key={n}
              onClick={() => setTopN(n)}
              className={
                topN === n
                  ? 'text-xs font-medium px-2 h-8 rounded bg-muted text-foreground'
                  : 'text-xs px-2 h-8 rounded text-muted-foreground hover:bg-muted'
              }
              title={n === 'all' ? 'Show all development partners' : `Show top ${n} development partners`}
            >
              {n === 'all' ? 'All' : `Top ${n}`}
            </button>
          ))}
        </div>
        {/* Grouped / Stacked toggle — only when >1 metric is charted as bars */}
        {viewMode === 'bar' && txMetrics.length > 1 && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <button
              type="button"
              onClick={() => setStacked(false)}
              className={!stacked ? 'text-xs font-medium px-2 h-8 rounded bg-muted text-foreground' : 'text-xs px-2 h-8 rounded text-muted-foreground hover:bg-muted'}
              title="Grouped bars (side by side)"
            >
              Grouped
            </button>
            <button
              type="button"
              onClick={() => setStacked(true)}
              className={stacked ? 'text-xs font-medium px-2 h-8 rounded bg-muted text-foreground' : 'text-xs px-2 h-8 rounded text-muted-foreground hover:bg-muted'}
              title="Stacked bars"
            >
              Stacked
            </button>
          </div>
        )}
        {/* View mode toggles */}
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === "bar" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode("bar")}
            title="Bar Chart"
            aria-label="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === "pie" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode("pie")}
            title="Pie Chart"
            aria-label="Pie Chart"
          >
            <PieChartIcon className="h-4 w-4" />
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
  );

  // Standard calendar + year-range picker (replaces the old time-range select).
  const renderCalendarYear = () => (
    <div className="mb-3">
      <YearRangeChip
        customYears={customYears}
        calendarType={calendarType}
        onCalendarTypeChange={setCalendarType}
        selectedYears={selectedYears}
        onYearsChange={setSelectedYears}
      />
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: isExpanded ? 500 : '100%' }}>
      {!compact && renderCalendarYear()}
      {!compact && renderControls()}
      {renderContent()}
      {!compact && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart shows the top {topN} individual development partner organizations by financial contribution, with remaining donors aggregated. Use the Top N selector, metric, and calendar/year selectors to analyze funding patterns across different measures and periods.
        </p>
      )}
    </div>
  );
}
