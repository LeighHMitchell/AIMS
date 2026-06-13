"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  PieChart as PieChartIcon,
  Maximize2,
  Download,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Wallet,
  Calendar,
  DollarSign,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingText, ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { RankedItem } from "@/types/national-priorities";
import { CHART_RANKED_PALETTE, OTHERS_COLOR, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { apiFetch } from '@/lib/api-fetch';
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { useChartExpansion } from '@/lib/chart-expansion-context';
import { ChartDataTable } from '@/components/ui/chart-data-table';

type ViewMode = "bar" | "pie" | "table";
type MetricType = "budgets" | "plannedDisbursements" | "commitments" | "disbursements";
type SortField = "name" | "value" | "percentage" | "activityCount";
type SortDirection = "asc" | "desc";

interface SubnationalAllocationsChartProps {
  refreshKey?: number;
  organizationId?: string;
  compact?: boolean;
}

const METRIC_OPTIONS = [
  { value: "budgets", label: "Total Budgets" },
  { value: "plannedDisbursements", label: "Planned Disbursements" },
  { value: "commitments", label: "Commitments" },
  { value: "disbursements", label: "Disbursements" },
];

export function SubnationalAllocationsChart({ refreshKey = 0, organizationId, compact = false }: SubnationalAllocationsChartProps) {
  const isExpanded = useChartExpansion();
  const [data, setData] = useState<RankedItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("disbursements");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ measure: metric });
      if (organizationId) {
        params.set('organizationId', organizationId);
      }
      const response = await apiFetch(`/api/analytics/dashboard?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data?.topDistricts || []);
      setGrandTotal(result.data?.grandTotal || 0);
    } catch (error: any) {
      console.error("[SubnationalAllocationsChart] Error:", error);
      toast.error("Failed to load subnational allocation data");
    } finally {
      setLoading(false);
    }
  }, [metric, organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // `color` drives the pie chart and legend swatches (distinct slice
  // colours). `barColor` drives the bar chart (single Blue Slate so all
  // bars share one colour, with OTHERS distinct for contrast).
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.id === "others" ? OTHERS_COLOR : CHART_RANKED_PALETTE[index % CHART_RANKED_PALETTE.length],
    barColor: item.id === "others" ? OTHERS_COLOR : '#4c5568',
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
  }));

  // Sorting logic for table
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedTableData = [...chartData].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "value":
        comparison = a.value - b.value;
        break;
      case "percentage":
        comparison = a.percentage - b.percentage;
        break;
      case "activityCount":
        comparison = a.activityCount - b.activityCount;
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      "State/Region": d.name,
      "Value (USD)": d.value,
      "Percentage": grandTotal > 0 ? ((d.value / grandTotal) * 100).toFixed(1) + "%" : "0%",
      Activities: d.activityCount,
    }));
    exportChartToCSV(exportData, `subnational-allocations-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : "0";
      const rows: any[] = [
        { label: 'Value', value: formatTooltipCurrency(item.value, isExpanded), color: item.color },
        { label: 'Percentage', value: `${percentage}%` },
      ];
      if (item.activityCount > 0) {
        rows.push({ label: 'Activities', value: item.activityCount });
      }
      return <ChartTooltipCard title={item.name} rows={rows} />;
    }
    return null;
  };

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-2 flex-shrink-0">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-helper text-muted-foreground truncate max-w-[100px]" title={item.name}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );

  // Custom X-axis tick with text wrapping
  const WrappedAxisTick = ({ x, y, payload }: any) => {
    const text = payload.value;
    const maxWidth = 60;
    const lineHeight = 12;

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word: string) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length * 5.5 > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line, index) => (
          <text
            key={index}
            x={0}
            y={index * lineHeight + 8}
            textAnchor="middle"
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
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="name"
          stroke={CHART_STRUCTURE_COLORS.axis}
          tickLine={false}
          axisLine={false}
          height={50}
          tick={<WrappedAxisTick />}
          interval={0}
        />
        <YAxis
          tickFormatter={formatAxisCurrency}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.barColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  // Custom pie label that wraps text
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    // Split name into words for wrapping
    const words = name.split(' ');
    const percentText = `${(percent * 100).toFixed(0)}%`;

    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{ fontSize: 10, fill: '#374151' }}
      >
        {words.map((word: string, index: number) => (
          <tspan
            key={index}
            x={x}
            dy={index === 0 ? 0 : 12}
          >
            {word}
          </tspan>
        ))}
        <tspan x={x} dy={12} style={{ fontWeight: 500 }}>
          {percentText}
        </tspan>
      </text>
    );
  };

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          dataKey="value"
          nameKey="name"
          label={renderPieLabel}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <ChartDataTable
      rows={chartData}
      columns={[
        {
          key: 'name',
          label: 'State/Region',
          numeric: false,
          format: (_v, row) => (
            <span className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: (row as any).color }}
              />
              <span>{row.name}</span>
            </span>
          ),
        },
        { key: 'value', label: 'Value (USD)', numeric: true, currency: 'USD' },
        {
          key: 'percentage',
          label: '%',
          numeric: true,
          includeInTotal: false,
          format: (v) => `${(Number(v) || 0).toFixed(1)}%`,
        },
        {
          key: 'activityCount',
          label: 'Activities',
          numeric: true,
          includeInTotal: false,
          format: (v) => Number(v).toLocaleString(),
        },
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
          No subnational allocation data available
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {!compact && viewMode !== "table" && renderLegend()}
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
        {/* Filters + toggles (left) */}
        <div className="flex items-center gap-2 flex-wrap">
      <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
        <SelectTrigger className="min-w-[280px]">
          <span className="flex items-center gap-2 truncate">
            {metric === 'budgets' && <Wallet className="h-4 w-4 flex-shrink-0" />}
            {metric === 'plannedDisbursements' && <Calendar className="h-4 w-4 flex-shrink-0" />}
            {metric === 'commitments' && <DollarSign className="h-4 w-4 flex-shrink-0" />}
            {metric === 'disbursements' && <DollarSign className="h-4 w-4 flex-shrink-0" />}
            <span className="truncate">
              {metric === 'budgets' && 'Total Budgets'}
              {metric === 'plannedDisbursements' && 'Total Planned Disbursements'}
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
          <SelectItem value="plannedDisbursements">
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

  return (
    <div className="h-full flex flex-col">
      {!compact && renderControls()}
      {renderContent()}

      {!compact && (
        <>
          {/* Allocation Details Table - only shown in expanded view */}
          {!loading && data && data.length > 0 && (
            <Card className="bg-white mt-4 flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Allocation Details
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsTableExpanded(true)}
                    title="Expand"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3 flex-1 overflow-hidden max-h-[300px]">
                {renderTable()}
              </CardContent>
            </Card>
          )}

          <p className="text-body text-muted-foreground leading-relaxed mt-4">
            This chart shows how development funding is distributed across subnational states and regions. Use the metric selector to compare budgets, planned disbursements, commitments, or actual disbursements, and switch between bar and pie chart views.
          </p>

          {/* Expanded Table Dialog View */}
          <Dialog open={isTableExpanded} onOpenChange={setIsTableExpanded}>
            <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold">
                      Allocation Details
                    </DialogTitle>
                    <DialogDescription className="text-base mt-1">
                      Detailed breakdown by State/Region
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleExport}
                    title="Export CSV"
                    aria-label="Export CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <p className="text-body text-muted-foreground mt-2">
                This table provides precise figures for aid allocations across Myanmar&apos;s states and regions.
                The data shows the exact USD value, percentage share, and number of activities for each location.
                Use this detailed breakdown to analyse funding concentration, compare regional investments,
                and identify areas that may be underserved relative to their needs.
              </p>

              <div className="mt-4 max-h-[60vh] overflow-auto">
                {renderTable()}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
