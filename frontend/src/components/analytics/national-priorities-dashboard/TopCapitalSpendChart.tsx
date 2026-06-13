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
  Table as TableIcon,
  Download,
  Wallet,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { apiFetch } from '@/lib/api-fetch';
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { useChartExpansion } from '@/lib/chart-expansion-context';
import { ChartDataTable } from '@/components/ui/chart-data-table';
import { YearRangeChip } from '@/components/ui/year-range-chip';
import { MetricsMultiSelect } from '@/components/analytics/MetricsMultiSelect';
import { type Metric } from '@/lib/financial-metrics';

// The capital APIs support these four sources; map the shared Metric keys to the
// API's metric tokens (tx_2 = commitments, tx_3 = disbursements).
const CAPITAL_METRIC_KEYS: Metric[] = ['budgets', 'planned', 'tx_2', 'tx_3'];
const METRIC_TO_API: Partial<Record<Metric, string>> = {
  budgets: 'budgets',
  planned: 'planned',
  tx_2: 'commitments',
  tx_3: 'disbursements',
};

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ViewMode = "bar" | "table";

// Full span of years the picker can offer (2010 → current + 10), used to default
// the selection to the entire available range rather than a rolling window.
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
);

interface ActivityCapitalSpend {
  id: string;
  title: string;
  acronym: string;
  iatiIdentifier: string;
  capitalSpendPercentage: number;
  baseValue: number;
  capitalSpendValue: number;
}

// Capital portion in Blue Slate; the rest of the activity's value in Pale Slate
// so the full bar reads as the activity's total value (stacked).
const BAR_COLOR = '#4c5568';
const NON_CAPITAL_COLOR = '#cfd0d5';

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

interface TopCapitalSpendChartProps {
  refreshKey?: number;
  compact?: boolean;
}

type OpenFilter = 'metric' | 'timeRange' | null;

export function TopCapitalSpendChart({ refreshKey = 0, compact = false }: TopCapitalSpendChartProps) {
  const isExpanded = useChartExpansion();
  const [data, setData] = useState<ActivityCapitalSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3']);
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  // Standard calendar + year-range selection (replaces the old time-range filter).
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [dateWindow, setDateWindow] = useState<{ from: Date; to: Date } | null>(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const filterOpenHandler = (key: Exclude<OpenFilter, null>) => (open: boolean) => {
    setOpenFilter(prev => open ? key : (prev === key ? null : prev));
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const apiMetrics = selectedMetrics.map(m => METRIC_TO_API[m]).filter(Boolean) as string[];
      const params = new URLSearchParams({ metrics: apiMetrics.join(',') || 'disbursements' });
      if (dateWindow?.from) params.set("dateFrom", dateWindow.from.toISOString());
      if (dateWindow?.to) params.set("dateTo", dateWindow.to.toISOString());

      const response = await apiFetch(`/api/analytics/top-capital-spend-activities?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
      setGrandTotal(result.grandTotal || 0);
    } catch (error: any) {
      console.error("[TopCapitalSpendChart] Error:", error);
      toast.error("Failed to load capital spend data");
    } finally {
      setLoading(false);
    }
  }, [selectedMetrics, dateWindow]);

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

  // (fetchData is recreated when metric/dateWindow change via useCallback deps.)

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      Activity: d.title,
      "IATI Identifier": d.iatiIdentifier,
      "Capital Spend %": d.capitalSpendPercentage,
      "Base Value (USD)": d.baseValue,
      "Capital Spend (USD)": d.capitalSpendValue,
    }));
    exportChartToCSV(exportData, `top-capital-spend-activities`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ActivityCapitalSpend;
      const subtitle = item.iatiIdentifier ? (
        <code className="font-mono bg-muted px-1.5 py-0.5 rounded inline-block">{item.iatiIdentifier}</code>
      ) : undefined;
      return (
        <ChartTooltipCard
          title={item.acronym ? `${item.title} (${item.acronym})` : item.title}
          subtitle={subtitle}
          maxWidth={320}
          rows={[
            { label: 'Capital Spend %', value: `${item.capitalSpendPercentage.toFixed(1)}%` },
            { label: 'Total Value', value: formatTooltipCurrency(item.baseValue, isExpanded) },
            { label: 'Capital Spend', value: formatTooltipCurrency(item.capitalSpendValue, isExpanded), color: BAR_COLOR },
            { label: 'Non-Capital', value: formatTooltipCurrency(item.baseValue - item.capitalSpendValue, isExpanded), color: NON_CAPITAL_COLOR },
          ]}
        />
      );
    }
    return null;
  };

  // Prepend the acronym to the activity name (when present); the stacked bar
  // shows the capital portion plus the remainder of the activity's total value.
  const chartData = data.map((item) => ({
    ...item,
    displayName: item.acronym ? `${item.acronym}: ${item.title}` : item.title,
    nonCapital: Math.max(0, item.baseValue - item.capitalSpendValue),
  }));

  // Custom Y-axis tick component for wrapping text (max 4 lines)
  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const maxWidth = 200;
    const lineHeight = 12;
    const maxLines = 4;
    const words = payload.value.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Approximate character width for wrapping (roughly 6px per char at fontSize 10)
      if (testLine.length * 6 > maxWidth && currentLine) {
        if (lines.length < maxLines - 1) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // On the last allowed line, truncate if needed
          if (lines.length === maxLines - 1) {
            const truncated = currentLine.length > 20 ? currentLine.substring(0, 17) + "..." : currentLine;
            lines.push(truncated);
            currentLine = "";
          }
          break;
        }
      } else {
        currentLine = testLine;
      }
    }

    // Add the last line if we haven't reached max lines
    if (currentLine && lines.length < maxLines) {
      if (lines.length === maxLines - 1 && currentLine.length > 20) {
        lines.push(currentLine.substring(0, 17) + "...");
      } else {
        lines.push(currentLine);
      }
    }

    // Calculate vertical offset to center the text block
    const totalHeight = lines.length * lineHeight;
    const startY = y - totalHeight / 2 + lineHeight / 2;

    return (
      <g>
        {lines.map((line, index) => (
          <text
            key={index}
            x={x - 5}
            y={startY + index * lineHeight}
            textAnchor="end"
            fill={CHART_STRUCTURE_COLORS.axis}
            fontSize={10}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const renderBarChart = () => (
    // Explicit height when expanded — the dialog body is auto-height, so a
    // height="100%" container would collapse to 0 and the chart wouldn't show.
    <ResponsiveContainer width="100%" height={isExpanded ? 480 : "100%"}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 60, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          type="number"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickFormatter={formatAxisCurrency}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          width={220}
          tickLine={false}
          axisLine={false}
          tick={<CustomYAxisTick />}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span className="text-muted-foreground">{value === 'capitalSpendValue' ? 'Capital spend' : 'Other value'}</span>
          )}
        />
        {/* Stacked: capital portion + the remainder of the activity's total value. */}
        <Bar dataKey="capitalSpendValue" stackId="a" fill={BAR_COLOR} name="capitalSpendValue" maxBarSize={40} radius={[0, 0, 0, 0]} />
        <Bar dataKey="nonCapital" stackId="a" fill={NON_CAPITAL_COLOR} name="nonCapital" maxBarSize={40} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <ChartDataTable
      rows={data}
      columns={[
        {
          key: 'title',
          label: 'Activity',
          numeric: false,
          format: (_v, row) => (
            <span>
              {row.title}
              {(row as any).iatiIdentifier && (
                <span className="block font-normal text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded mt-1 w-fit">
                  {(row as any).iatiIdentifier}
                </span>
              )}
            </span>
          ),
        },
        {
          key: 'capitalSpendPercentage',
          label: 'Capital %',
          numeric: true,
          includeInTotal: false,
          format: (v) => `${(Number(v) || 0).toFixed(1)}%`,
        },
        { key: 'capitalSpendValue', label: 'Capital Spend (USD)', numeric: true, currency: 'USD' },
      ]}
      maxHeight="100%"
    />
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
          {viewMode === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
        {/* Filters + toggles (left) — shared metrics multi-select (Budgets,
            Planned Disbursements, Outgoing Commitments, Disbursements). */}
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
    <div className="mb-4">
      <YearRangeChip
        selectedYears={selectedYears}
        onYearsChange={setSelectedYears}
        onDateRangeChange={setDateWindow}
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {!compact && renderCalendarYear()}
      {!compact && renderControls()}
      {renderContent()}
      {!compact && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart ranks the top activities by capital spend value. Each bar is stacked to show the activity&apos;s total value, with the capital portion highlighted (capital % applied to the selected metric). Use the calendar/year and metric selectors to adjust the view.
        </p>
      )}
    </div>
  );
}
