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

type MetricType = "commitments" | "disbursements";
type ViewMode = "bar" | "pie" | "table";

interface AgencyData {
  id: string;
  name: string;
  acronym: string;
  value: number;
  activityCount: number;
}

const METRIC_OPTIONS = [
  { value: "commitments", label: "Commitments" },
  { value: "disbursements", label: "Disbursements" },
];

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

interface ImplementingAgenciesChartProps {
  refreshKey?: number;
  compact?: boolean;
}

export function ImplementingAgenciesChart({ refreshKey = 0, compact = false }: ImplementingAgenciesChartProps) {
  const isExpanded = useChartExpansion();
  const [data, setData] = useState<AgencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("disbursements");
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [grandTotal, setGrandTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ measure: metric });
      const response = await apiFetch(`/api/analytics/dashboard?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      // Transform data to include acronym field
      const agencies = (result.data?.implementingAgencies || []).map((item: any) => ({
        id: item.id,
        name: item.name || 'Unknown',
        acronym: item.name?.length > 15 ? item.name.slice(0, 12) + '...' : item.name || 'Unknown',
        value: item.value || 0,
        activityCount: item.activityCount || 0,
      }));

      setData(agencies);
      setGrandTotal(result.data?.grandTotal || 0);
    } catch (error: any) {
      console.error("[ImplementingAgenciesChart] Error:", error);
      toast.error("Failed to load implementing agencies data");
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      Organization: d.name,
      Value: d.value,
      Activities: d.activityCount,
    }));
    exportChartToCSV(exportData, `implementing-agencies-${metric}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as AgencyData & { fill?: string; barFill?: string };
      const rows: any[] = [{
        label: 'Value',
        value: formatTooltipCurrency(item.value, isExpanded),
        color: item.barFill || item.fill,
      }];
      if (item.activityCount > 0) {
        rows.push({ label: 'Activities', value: item.activityCount });
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
  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.id === "others" ? OTHERS_COLOR : CHART_RANKED_PALETTE[index % CHART_RANKED_PALETTE.length],
    barFill: item.id === "others" ? OTHERS_COLOR : '#4c5568',
  }));

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 25, right: 5, left: 5, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="name"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={0}
          textAnchor="middle"
          height={30}
          tick={(props) => {
            const { x, y, payload } = props;
            const text = payload.value || '';
            const words = text.split(' ');
            const maxCharsPerLine = 10;
            const lines: string[] = [];
            let currentLine = '';

            words.forEach((word: string) => {
              // If word itself is longer than max, break it up
              if (word.length > maxCharsPerLine) {
                if (currentLine) {
                  lines.push(currentLine);
                  currentLine = '';
                }
                // Break long word into chunks
                for (let i = 0; i < word.length; i += maxCharsPerLine) {
                  lines.push(word.slice(i, i + maxCharsPerLine));
                }
              } else if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
                currentLine += (currentLine ? ' ' : '') + word;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            });
            if (currentLine) lines.push(currentLine);

            return (
              <g transform={`translate(${x},${y})`}>
                {lines.map((line, i) => (
                  <text
                    key={i}
                    x={0}
                    y={0}
                    dy={i * 12 + 5}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize={11}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          }}
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

  const renderTable = () => (
    <div className="overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow className="sticky top-0 bg-white z-10 [&>th]:align-bottom">
            <TableHead>Organization</TableHead>
            <TableHead className="text-right whitespace-normal">Value (USD)</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((agency) => (
            <TableRow key={agency.id}>
              <TableCell>
                <div className="font-medium">{agency.name}</div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(agency.value)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal > 0 ? ((agency.value / grandTotal) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-2 flex-shrink-0">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.fill }}
          />
          <span className="text-helper text-muted-foreground truncate max-w-[80px]" title={item.name}>
            {item.acronym}
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
      <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
        <SelectTrigger className="min-w-[280px]">
          <span className="flex items-center gap-2 truncate">
            {metric === 'commitments' && <DollarSign className="h-4 w-4 flex-shrink-0" />}
            {metric === 'disbursements' && <DollarSign className="h-4 w-4 flex-shrink-0" />}
            <span className="truncate">
              {metric === 'commitments' && 'Total Commitments'}
              {metric === 'disbursements' && 'Total Disbursements'}
            </span>
          </span>
        </SelectTrigger>
        <SelectContent>
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

  return (
    <div className="h-full flex flex-col">
      {renderContent()}
      {!compact && renderControls()}
      {!compact && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart shows implementing agencies -- organizations responsible for the physical delivery of assistance on the ground. Compare their relative financial shares to understand which organizations carry out the most implementation work.
        </p>
      )}
    </div>
  );
}
