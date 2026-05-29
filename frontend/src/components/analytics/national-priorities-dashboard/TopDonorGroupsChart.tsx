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
import { Input } from "@/components/ui/input";
import { LoadingText, ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { CHART_RANKED_PALETTE, OTHERS_COLOR, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { formatTooltipCurrency } from "@/lib/format";
import { ChartTooltipCard } from "@/components/ui/chart-tooltip";
import { useChartExpansion } from "@/lib/chart-expansion-context";
import { ChartDataTable, CodeChip } from "@/components/ui/chart-data-table";
import { YearRangeChip } from "@/components/ui/year-range-chip";
import { MetricsMultiSelect } from "@/components/analytics/MetricsMultiSelect";
import { type Metric, METRIC_LABEL, metricColor } from "@/lib/financial-metrics";
import { CustomYear, getCustomYearRange, pickDefaultCalendarYearId } from "@/types/custom-years";
import { apiFetch } from "@/lib/api-fetch";

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ViewMode = "bar" | "pie" | "table";

// Full span of years the picker can offer (2010 → current + 10), used to default
// the selection to the entire available range rather than a rolling window.
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
);

interface DonorGroupData {
  id: string;
  name: string;
  value: number;
  byMetric?: Record<string, number>;
  activityCount: number;
  orgCount: number;
}

function WrapXAxisTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const text = payload.value || "";
  const maxChars = 14;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxChars) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <text x={x} y={y + 8} textAnchor="middle" fontSize={11} fill="#6b7280">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
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

function formatCurrencyWithSymbol(value: number): string {
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

// Short uppercase code for a parent group (e.g. "World Bank Group" → "WBG",
// "United Nations" → "UN"). Acronym from significant words; single words use
// their first three letters.
function groupCode(name: string): string {
  const stop = new Set(['of', 'the', 'and', 'for', 'de', 'la']);
  const words = name.split(/\s+/).filter((w) => w && !stop.has(w.toLowerCase()));
  if (words.length === 0) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
}

interface TopDonorGroupsChartProps {
  refreshKey?: number;
  compact?: boolean;
}

type OpenFilter = 'metric' | 'timeRange' | null;

export function TopDonorGroupsChart({ refreshKey = 0, compact = false }: TopDonorGroupsChartProps) {
  const isExpanded = useChartExpansion();
  const [data, setData] = useState<DonorGroupData[]>([]);
  const [loading, setLoading] = useState(true);
  // Groups chart historically defaulted to "Disbursements" — the shared metric
  // model keys that as the IATI transaction type tx_3.
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3']);
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
  // Group drill-down: null = groups overview; otherwise show the member orgs of
  // the selected parent group. `availableGroups` is the full parent-group list
  // returned by the API (kept even while drilled in).
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
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

  // Group dropdown: filter the available parent-group names by the search box.
  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return availableGroups;
    return availableGroups.filter(g => g.toLowerCase().includes(q));
  }, [availableGroups, groupSearch]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ metrics: selectedMetrics.join(','), topN: String(topN) });
      if (groupFilter) {
        params.set("group", groupFilter);
      }
      if (dateRange?.from) {
        params.set("dateFrom", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.set("dateTo", dateRange.to.toISOString());
      }

      const response = await fetch(`/api/analytics/top-donor-groups?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
      setGrandTotal(result.grandTotal || 0);
      // Keep the full parent-group list (API returns it regardless of drill state).
      setAvailableGroups(result.groups || []);
    } catch (error: any) {
      console.error("[TopDonorGroupsChart] Error:", error);
      toast.error("Failed to load development partner groups data");
    } finally {
      setLoading(false);
    }
  }, [selectedMetrics, dateRange, topN, groupFilter]);

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
      "Development Partner Group": d.name,
      "Value (USD)": d.value,
      Activities: d.activityCount,
      Organizations: d.orgCount,
    }));
    exportChartToCSV(exportData, `top-donor-groups`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as DonorGroupData & { fill: string; barFill?: string };
      const isMetricBars = typeof payload[0]?.dataKey === 'string' && payload[0].dataKey.startsWith('m_');
      const rows: any[] = isMetricBars
        ? payload.map((entry: any) => ({
            label: entry.name,
            value: formatTooltipCurrency(entry.value, isExpanded),
            color: entry.color || entry.fill,
          }))
        : [{
            label: 'Amount',
            value: formatTooltipCurrency(item.value, isExpanded),
            color: item.barFill || item.fill,
          }];
      if (item.activityCount > 0) {
        rows.push({ label: 'Activities', value: item.activityCount });
      }
      if (item.orgCount > 0) {
        rows.push({ label: 'Organisations', value: item.orgCount });
      }
      return <ChartTooltipCard title={item.name} rows={rows} />;
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
      shortName: item.name.length > 12 ? `${item.name.slice(0, 10)}...` : item.name,
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
        margin={{ top: 25, right: 5, left: 5, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
          dataKey="name"
          stroke={CHART_STRUCTURE_COLORS.axis}
            fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={(props: Record<string, unknown>) => <WrapXAxisTick {...props as { x: number; y: number; payload: { value: string } }} />}
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

  const renderPieChart = () => {
    const outerR = isExpanded ? 130 : 75;
    const innerR = isExpanded ? 72 : 40;
    // Custom label: full group/org name wrapped onto multiple lines (no
    // truncation) with the percentage beneath, positioned just outside the arc.
    const renderLabel = (props: any) => {
      const { cx, cy, midAngle, outerRadius, percent, name } = props;
      if (!percent || percent < 0.02) return null;
      const RADIAN = Math.PI / 180;
      const r = outerRadius + 22;
      const x = cx + r * Math.cos(-midAngle * RADIAN);
      const y = cy + r * Math.sin(-midAngle * RADIAN);
      const anchor = x >= cx ? 'start' : 'end';
      const words = String(name || '').split(' ');
      const lines: string[] = [];
      let cur = '';
      words.forEach((w) => {
        if (!cur) cur = w;
        else if ((cur + ' ' + w).length <= 16) cur += ' ' + w;
        else { lines.push(cur); cur = w; }
      });
      if (cur) lines.push(cur);
      return (
        <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={11} fill="#475569">
          {lines.map((ln, i) => (
            <tspan key={i} x={x} dy={i === 0 ? 0 : 13}>{ln}</tspan>
          ))}
          <tspan x={x} dy={13} fontWeight={600}>{(percent * 100).toFixed(0)}%</tspan>
        </text>
      );
    };
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerR}
            outerRadius={outerR}
            dataKey="value"
            nameKey="name"
            label={renderLabel}
            labelLine={true}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

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
            label: 'Development Partner Group',
            numeric: false,
            format: (_v, row) => (
              <span className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: (row as any).fill }}
                />
                <span>{row.name}</span>
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
          <span className="text-helper text-muted-foreground">{item.name}</span>
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

  // Searchable single-select dropdown for drilling into a parent group. Mirrors
  // MetricsMultiSelect's structure (trigger Button + sticky search Input +
  // scrollable filtered list) but selects exactly one group (or "All groups").
  const renderGroupDropdown = () => (
    <DropdownMenu open={groupMenuOpen} onOpenChange={setGroupMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 justify-between min-w-[200px]">
          <span className="truncate text-body">{groupFilter ?? 'All groups'}</span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        collisionPadding={12}
        className="w-[280px] max-h-[400px] overflow-y-auto p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border mb-1">
          <div className="flex items-center px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              placeholder="Search groups..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            {groupSearch && (
              <X
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                onClick={() => setGroupSearch('')}
              />
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setGroupFilter(null); setGroupMenuOpen(false); }}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body",
            groupFilter === null && "bg-muted font-medium"
          )}
        >
          <span className="text-foreground truncate">All groups</span>
        </button>
        {filteredGroups.length === 0 && (
          <div className="px-3 py-4 text-helper text-muted-foreground text-center">
            No matching groups.
          </div>
        )}
        {filteredGroups.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => { setGroupFilter(g); setGroupMenuOpen(false); }}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body",
              groupFilter === g && "bg-muted font-medium"
            )}
          >
            <CodeChip className="flex-shrink-0">{groupCode(g)}</CodeChip>
            <span className="text-foreground truncate">{g}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderControls = () => (
    <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
        {/* Filters + toggles (left) — shared metrics multi-select (Budgets,
            Planned Disbursements, and the 13 IATI transaction types; summed),
            plus the group drill-down dropdown. */}
        <div className="flex items-center gap-2 flex-wrap">
          <MetricsMultiSelect
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            triggerClassName="h-8 justify-between min-w-[240px]"
          />
          {renderGroupDropdown()}
        </div>
        {/* Button groups + CSV, right-aligned. */}
        <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {/* Top N quick picker — same set used in the sibling agencies chart. */}
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
              title={n === 'all' ? 'Show all development partner groups' : `Show top ${n} development partner groups`}
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
          This chart shows the top 5 donor groups ranked by financial contribution, with remaining groups aggregated. Donors are grouped by their country of origin or multilateral institution to provide a consolidated view of funding sources.
        </p>
      )}
    </div>
  );
}
