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
  PieChart,
  Pie,
  CartesianGrid,
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

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ViewMode = "bar" | "pie" | "table";

interface SectorData {
  id: string;
  name: string;
  code: string;
  value: number;
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
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000).toFixed(1)}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

function formatCurrencyWithSymbol(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B USD`;
  } else if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M USD`;
  } else if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K USD`;
  }
  return `${sign}${absValue.toFixed(0)} USD`;
}

function formatCurrencyFull(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${absValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface TopSectorsChartProps {
  refreshKey?: number;
  compact?: boolean;
}

type OpenFilter = 'metric' | 'timeRange' | null;

export function TopSectorsChart({ refreshKey = 0, compact = false }: TopSectorsChartProps) {
  const isExpanded = useChartExpansion();
  const [data, setData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("budgets");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [timeRange, setTimeRange] = useState<TimeRangeType>("all");
  const [grandTotal, setGrandTotal] = useState(0);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const filterOpenHandler = (key: Exclude<OpenFilter, null>) => (open: boolean) => {
    setOpenFilter(prev => open ? key : (prev === key ? null : prev));
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

      const response = await apiFetch(`/api/analytics/top-sectors?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
      setGrandTotal(result.grandTotal || 0);
    } catch (error: any) {
      console.error("[TopSectorsChart] Error:", error);
      toast.error("Failed to load sectors data");
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
      "Sector": d.name,
      "Code": d.code,
      "Value (USD)": d.value,
      "Activities": d.activityCount,
    }));
    exportChartToCSV(exportData, `top-sectors-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as SectorData & { fill: string; barFill?: string; sectorCode: string; sectorName: string };
      const title = (
        <span>
          {item.sectorCode && (
            <code className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs mr-1.5">
              {item.sectorCode}
            </code>
          )}
          {item.sectorName}
        </span>
      );
      const rows: any[] = [{
        label: 'Amount',
        value: formatTooltipCurrency(item.value, isExpanded),
        color: item.barFill || item.fill,
      }];
      if (item.activityCount > 0) {
        rows.push({ label: 'Activities', value: item.activityCount });
      }
      return <ChartTooltipCard title={title} rows={rows} />;
    }
    return null;
  };

  // Prepare chart data with colors
  // `fill` drives the pie chart (distinct slice colours). `barFill` drives
  // the bar chart (single Blue Slate so all bars share one colour, with
  // OTHERS distinct for contrast).
  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.id === "others" ? OTHERS_COLOR : CHART_RANKED_PALETTE[index % CHART_RANKED_PALETTE.length],
    barFill: item.id === "others" ? OTHERS_COLOR : '#4c5568',
    // Extract just the sector name without the code prefix for display
    sectorCode: item.code === "others" ? "" : item.code,
    sectorName: item.id === "others" ? "OTHERS" : (item.name.includes(" - ") ? item.name.split(" - ")[1] : item.name),
    shortName: item.name.length > 12 ? `${item.name.slice(0, 10)}...` : item.name,
  }));

  // Custom X-axis tick with code badge and wrapped name
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const item = chartData.find(d => d.shortName === payload.value);
    if (!item) return null;

    const isOthers = item.id === "others";
    const code = item.sectorCode;
    const name = item.sectorName;

    // Wrap text to show full name across multiple lines
    const maxCharsPerLine = 10;
    const wrapText = (text: string): string[] => {
      if (text.length <= maxCharsPerLine) return [text];
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines; // Show all lines - no truncation
    };

    const nameLines = isOthers ? ["OTHERS"] : wrapText(name);

  return (
      <g transform={`translate(${x},${y})`}>
        {/* Code badge with gray background */}
        {!isOthers && code && (
          <>
            <rect
              x={-18}
              y={4}
              width={36}
              height={16}
              rx={3}
              fill="#e5e7eb"
            />
            <text
              x={0}
              y={16}
              textAnchor="middle"
              fill="#374151"
              fontSize={10}
              fontFamily="monospace"
              fontWeight={500}
            >
              {code}
            </text>
          </>
        )}
        {/* Sector name below - fully wrapped */}
        {nameLines.map((line, idx) => (
          <text
            key={idx}
            x={0}
            y={isOthers ? 16 + idx * 10 : 32 + idx * 10}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={8}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
        margin={{ top: 25, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
          dataKey="shortName"
          stroke={CHART_STRUCTURE_COLORS.axis}
            fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={<CustomXAxisTick />}
          height={85}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.barFill} />
            ))}
          </Bar>
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
          nameKey="shortName"
          label={({ shortName, percent }) => `${shortName} ${(percent * 100).toFixed(0)}%`}
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
    <div className="overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow className="sticky top-0 bg-white z-10 [&>th]:align-bottom">
            <TableHead>Sector</TableHead>
            <TableHead className="text-right whitespace-normal">Value (USD)</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sector) => (
            <TableRow key={sector.id}>
              <TableCell>
                <div className="font-medium">{sector.name}</div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(sector.value)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal > 0 ? ((sector.value / grandTotal) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.fill }}
          />
          {item.id !== "others" && item.sectorCode && (
            <span className="text-xs font-mono bg-muted px-1 rounded text-foreground">{item.sectorCode}</span>
          )}
          <span className="text-helper text-muted-foreground">
            {item.sectorName}
          </span>
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
        {!compact && renderLegend()}
        <div className="flex-1 min-h-0">
          {viewMode === "bar" && renderBarChart()}
          {viewMode === "pie" && renderPieChart()}
          {viewMode === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t flex-shrink-0">
      <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)} open={openFilter === 'metric'} onOpenChange={filterOpenHandler('metric')}>
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
      <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRangeType)} open={openFilter === 'timeRange'} onOpenChange={filterOpenHandler('timeRange')}>
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
          This chart shows the top 5 DAC sectors by financial allocation, with remaining sectors aggregated into an &quot;Others&quot; category. Use the metric selector to switch between budgets, planned disbursements, commitments, and disbursements to see different views of sector-level funding.
        </p>
      )}
    </div>
  );
}
