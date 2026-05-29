"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingText, ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { AlertCircle, Layers, LayoutGrid, Maximize2, Download, BarChart3, Table as TableIcon, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { useCustomYears } from "@/hooks/useCustomYears";
import { YearRangeChip } from "@/components/ui/year-range-chip";
import { getCustomYearLabel } from "@/types/custom-years";
import { apiFetch } from '@/lib/api-fetch';
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { useChartExpansion } from '@/lib/chart-expansion-context';

// Color palette for modalities — slate-only for dashboard consistency.
const MODALITY_COLORS: Record<string, string> = {
  'Grant': '#334155',              // slate-700
  'Loan': '#4c5568',               // Blue Slate
  'Technical Assistance': '#7b95a7', // Cool Steel
  'Reimbursable Grant': '#cfd0d5',   // Pale Slate
  'Investment/Guarantee': '#a3b5c2', // light steel
  'Unspecified': '#94a3b8',        // Fallback Slate
};

const ALL_MODALITIES = ['Grant', 'Loan', 'Technical Assistance', 'Reimbursable Grant', 'Investment/Guarantee'];

const METRIC_OPTIONS = [
  { value: "disbursements", label: "Disbursements" },
  { value: "commitments", label: "Commitments" },
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

type ChartMode = 'stacked' | 'grouped';
type ChartType = 'bar' | 'line' | 'area';
type TransactionType = 'commitments' | 'disbursements';
type ViewMode = 'chart' | 'table';

interface FundingByModalitySummary {
  Grant: number;
  Loan: number;
  'Technical Assistance': number;
  'Reimbursable Grant': number;
  'Investment/Guarantee': number;
  Unspecified: number;
  total: number;
}

export function FundingByModalityChart() {
  const [data, setData] = useState<Record<string, number>[]>([]);
  const [summary, setSummary] = useState<FundingByModalitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('stacked');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [transactionType, setTransactionType] = useState<TransactionType>('disbursements');
  const isExpanded = useChartExpansion();
  const [viewMode, setViewMode] = useState<ViewMode>('chart');

  // Custom year selection + calendar/year-range picker
  const {
    customYears,
    selectedId: selectedCustomYearId,
    setSelectedId: setSelectedCustomYearId,
  } = useCustomYears();
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [dateWindow, setDateWindow] = useState<{ from: Date; to: Date } | null>(null);

  // X-axis labels follow the selected calendar (e.g. fiscal-year labels).
  const selectedCustomYear = customYears?.find((c: any) => c.id === selectedCustomYearId);
  const formatYearTick = (v: any) =>
    selectedCustomYear ? getCustomYearLabel(selectedCustomYear, Number(v)) : String(v);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: transactionType });
      if (dateWindow?.from) params.set('dateFrom', dateWindow.from.toISOString());
      if (dateWindow?.to) params.set('dateTo', dateWindow.to.toISOString());
      const response = await apiFetch(`/api/analytics/funding-by-modality?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
      setSummary(result.summary || null);
    } catch (err: any) {
      console.error("Error fetching funding by modality data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [transactionType, dateWindow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const exportData = data.map((d) => ({
      "Year": d.year,
      "Grant (USD)": d.Grant || 0,
      "Loan (USD)": d.Loan || 0,
      "Technical Assistance (USD)": d['Technical Assistance'] || 0,
      "Reimbursable Grant (USD)": d['Reimbursable Grant'] || 0,
      "Investment/Guarantee (USD)": d['Investment/Guarantee'] || 0,
      "Unspecified (USD)": d['Unspecified'] || 0,
    }));
    exportChartToCSV(exportData, `funding-by-modality-${transactionType}`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filter out zero values
      const nonZeroPayload = payload.filter((entry: any) => entry.value > 0);
      if (nonZeroPayload.length === 0) return null;

      const yearTotal = nonZeroPayload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      const rows: any[] = nonZeroPayload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(entry.value, isExpanded),
        color: entry.color,
      }));
      rows[rows.length - 1].bordered = true;
      rows.push({ label: 'Total', value: formatTooltipCurrency(yearTotal, isExpanded) });

      return <ChartTooltipCard title={formatYearTick(label)} rows={rows} />;
    }
    return null;
  };

  const renderLegend = (expanded: boolean = false) => (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3">
      {ALL_MODALITIES.map((modality) => (
        <div key={modality} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: MODALITY_COLORS[modality] }}
          />
          <span className={cn("text-helper text-muted-foreground", expanded ? "" : "truncate max-w-[80px]")} title={modality}>
            {modality}
          </span>
        </div>
      ))}
    </div>
  );

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        key={`chart-${chartMode}`}
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          tickFormatter={formatYearTick}
        />
        <YAxis
          tickFormatter={formatAxisCurrency}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        {ALL_MODALITIES.map((modality, index) => (
          <Bar
            key={modality}
            dataKey={modality}
            stackId={chartMode === 'stacked' ? 'a' : undefined}
            fill={MODALITY_COLORS[modality]}
            name={modality}
            radius={[4, 4, 0, 0]}
            animationDuration={500}
            animationEasing="ease-out"
            animationBegin={index * 50}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          tickFormatter={formatYearTick}
        />
        <YAxis
          tickFormatter={formatAxisCurrency}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        {ALL_MODALITIES.map((modality, index) => (
          <Line
            key={modality}
            type="monotone"
            dataKey={modality}
            stroke={MODALITY_COLORS[modality]}
            strokeWidth={2}
            name={modality}
            dot={{ r: 4 }}
            animationDuration={500}
            animationEasing="ease-out"
            animationBegin={index * 50}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderAreaChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          {ALL_MODALITIES.map((modality) => (
            <linearGradient key={modality} id={`color${modality}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={MODALITY_COLORS[modality]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={MODALITY_COLORS[modality]} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          tickFormatter={formatYearTick}
        />
        <YAxis
          tickFormatter={formatAxisCurrency}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        {ALL_MODALITIES.map((modality, index) => (
          <Area
            key={modality}
            type="monotone"
            dataKey={modality}
            stackId="1"
            stroke={MODALITY_COLORS[modality]}
            fill={`url(#color${modality})`}
            name={modality}
            animationDuration={500}
            animationEasing="ease-out"
            animationBegin={index * 50}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-auto flex-1 min-h-[180px]">
      <Table>
        <TableHeader>
          <TableRow className="sticky top-0 bg-white z-10 [&>th]:align-bottom">
            <TableHead>Year</TableHead>
            {ALL_MODALITIES.map((modality) => (
              <TableHead key={modality} className="text-right whitespace-normal">{modality}</TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const rowTotal = ALL_MODALITIES.reduce((sum, m) => sum + (row[m] || 0), 0);
            return (
              <TableRow key={row.year}>
                <TableCell className="font-medium">{row.year}</TableCell>
                {ALL_MODALITIES.map((modality) => (
                  <TableCell key={modality} className="text-right font-mono">
                    {formatCurrencyFull(row[modality] || 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrencyFull(rowTotal)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? "100%" : "100%";

    if (loading) {
      return <ChartLoadingPlaceholder />;
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className={cn(expanded ? "flex-1" : "h-[280px]", "flex items-center justify-center text-muted-foreground")}>
          No funding data available
        </div>
      );
    }

    // In expanded mode, show either chart or table based on viewMode
    if (expanded && viewMode === 'table') {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          {renderTable()}
        </div>
      );
    }

    const renderChart = () => {
      switch (chartType) {
        case 'line':
          return renderLineChart(chartHeight);
        case 'area':
          return renderAreaChart(chartHeight);
        case 'bar':
        default:
          return renderBarChart(chartHeight);
      }
    };

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className={expanded ? "h-[500px]" : "h-[280px]"}>
          {renderChart()}
        </div>
        {/* Legend below the chart (expanded view). */}
        {expanded && renderLegend(expanded)}
      </div>
    );
  };

  const renderControls = (expanded: boolean = false) => (
    <div className="space-y-3 mb-3">
      {/* Calendar + year-range picker on its own row at the top (expanded only) */}
      {expanded && (
        <div className="flex items-start gap-2">
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            customYears={customYears}
            calendarType={selectedCustomYearId ?? undefined}
            onCalendarTypeChange={setSelectedCustomYearId}
            onDateRangeChange={setDateWindow}
          />
        </div>
      )}
      {/* Controls row — filters + toggles left, CSV right. */}
      <div className="flex items-center justify-between gap-2">
        {/* Filters + toggles (left) */}
        <div className="flex items-center gap-2 flex-wrap">
        {/* Transaction type dropdown */}
        <Select value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
          <SelectTrigger className="min-w-[280px] h-8 text-helper">
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
        </div>
        {/* Button groups + CSV, right-aligned. */}
        <div className="flex items-center gap-2 flex-wrap">
        {/* Chart type toggle - only show when in chart view */}
        {(!expanded || viewMode === 'chart') && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartType === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartType('bar')}
              title="Bar Chart"
              aria-label="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartType === 'line' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartType('line')}
              title="Line Chart"
              aria-label="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartType === 'area' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartType('area')}
              title="Area Chart"
              aria-label="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Chart mode toggle - only show when in bar chart view */}
        {(!expanded || viewMode === 'chart') && chartType === 'bar' && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartMode === 'stacked' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartMode('stacked')}
              title="Stacked"
              aria-label="Stacked"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", chartMode === 'grouped' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setChartMode('grouped')}
              title="Grouped"
              aria-label="Grouped"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* View mode toggle - only in expanded view */}
        {expanded && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode('chart')}
              title="Chart"
              aria-label="Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Export button - only in expanded view, right-aligned alone */}
        {expanded && (
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

  // Bare body — CompactChartCard (in page.tsx) provides the card chrome, ƒ + ×,
  // and the expand affordance. Controls sit above the chart (expanded only),
  // CSV furthest-right; collapsed shows just the chart.
  return (
    <div className="h-full flex flex-col">
      {isExpanded && renderControls(true)}
      {renderContent(isExpanded)}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart breaks down funding over time by aid modality (grant, loan, technical assistance, etc.). Use the stacked view to see total volumes and the grouped view to compare modalities side by side. Switch between bar, line, and area chart types for different perspectives.
        </p>
      )}
    </div>
  );
}
