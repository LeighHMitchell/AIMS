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
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table as TableIcon,
  Maximize2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { CHART_STRUCTURE_COLORS, CHART_RANKED_PALETTE } from "@/lib/chart-colors";
import { apiFetch } from '@/lib/api-fetch';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";
type ViewMode = "bar" | "table";

interface ActivityCapitalSpend {
  id: string;
  title: string;
  iatiIdentifier: string;
  capitalSpendPercentage: number;
  baseValue: number;
  capitalSpendValue: number;
}

// Shared monochromatic slate ramp — keeps ranked Top N charts visually
// consistent across the dashboard. Darker shades = higher rank.
const TOP_CAPITAL_PALETTE = CHART_RANKED_PALETTE;

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

interface TopCapitalSpendChartProps {
  refreshKey?: number;
}

type OpenFilter = 'metric' | 'timeRange' | null;

export function TopCapitalSpendChart({ refreshKey = 0 }: TopCapitalSpendChartProps) {
  const [data, setData] = useState<ActivityCapitalSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("disbursements");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [isExpanded, setIsExpanded] = useState(false);
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
      Activity: d.title,
      "IATI Identifier": d.iatiIdentifier,
      "Capital Spend %": d.capitalSpendPercentage,
      "Base Value (USD)": d.baseValue,
      "Capital Spend (USD)": d.capitalSpendValue,
    }));
    exportChartToCSV(exportData, `top-capital-spend-activities-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ActivityCapitalSpend;
      return (
        <div className="bg-white border border-border rounded-lg shadow-lg overflow-hidden max-w-xs">
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground text-body break-words">{item.title}</p>
            {item.iatiIdentifier && (
              <p className="text-xs text-muted-foreground mt-0.5 font-mono bg-muted px-1.5 py-0.5 rounded inline-block">{item.iatiIdentifier}</p>
            )}
          </div>
          <div className="p-2">
            <table className="w-full text-body">
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-1 pr-4 text-foreground font-medium">Capital Spend %</td>
                  <td className="py-1 text-right font-semibold text-foreground">{item.capitalSpendPercentage.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-1 pr-4 text-foreground font-medium">Base Value</td>
                  <td className="py-1 text-right font-semibold text-foreground">{formatCurrency(item.baseValue)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-foreground font-medium">Capital Spend</td>
                  <td className="py-1 text-right font-semibold" style={{ color: TOP_CAPITAL_PALETTE[0] }}>{formatCurrency(item.capitalSpendValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return null;
  };

  // Prepare chart data with just the title (no acronym)
  const chartData = data.map((item, index) => ({
    ...item,
    displayName: item.title,
    fill: TOP_CAPITAL_PALETTE[index % TOP_CAPITAL_PALETTE.length],
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

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
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
          tickFormatter={(value) => formatCurrency(value)}
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
        <Bar dataKey="capitalSpendValue" radius={[0, 4, 4, 0]} maxBarSize={40}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-auto max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead className="text-right">Capital %</TableHead>
            <TableHead className="text-right">Capital Spend (USD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell>
                <div>
                  <div className="font-medium truncate max-w-[200px]" title={activity.title}>
                    {activity.title}
                  </div>
                  {activity.iatiIdentifier && (
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded inline-block">{activity.iatiIdentifier}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {activity.capitalSpendPercentage.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(activity.capitalSpendValue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 350 : "100%";

    if (loading) {
      return <ChartLoadingPlaceholder />;
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
        <div className="h-[280px]">
          {viewMode === "bar" && renderBarChart(chartHeight)}
          {viewMode === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = (expanded: boolean = false) => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t">
      <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)} open={openFilter === 'metric'} onOpenChange={filterOpenHandler('metric')}>
        <SelectTrigger className="w-[160px] h-8 text-helper">
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

      <div className="flex items-center gap-1">
        {/* View mode toggles */}
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", viewMode === "bar" ? "bg-muted text-foreground" : "text-muted-foreground")}
            onClick={() => setViewMode("bar")}
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", viewMode === "table" ? "bg-muted text-foreground" : "text-muted-foreground")}
            onClick={() => setViewMode("table")}
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
    <>
      {/* Compact Card View */}
      <Card className="bg-white border-border h-full flex flex-col">
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium text-foreground truncate">
                Top Activities by Capital Spend
              </CardTitle>
              <CardDescription className="text-helper text-muted-foreground line-clamp-1 mt-0.5">
                Ranked by capital spend value
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-7 w-7 p-0 hover:bg-muted flex-shrink-0 ml-2"
              title="Expand to full screen"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
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
                <DialogTitle className="text-2xl font-semibold text-foreground">
                  Top Activities by Capital Spend
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Activities ranked by capital spend value ({METRIC_OPTIONS.find((o) => o.value === metric)?.label.toLowerCase()})
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

          {/* Explanatory text */}
          <p className="text-body text-muted-foreground leading-relaxed mt-4">
            This chart ranks the top activities by their capital spend value. Each bar shows the absolute capital expenditure amount, calculated by applying the activity's capital spend percentage to its base financial value. Use the metric and time range selectors to adjust the view.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
