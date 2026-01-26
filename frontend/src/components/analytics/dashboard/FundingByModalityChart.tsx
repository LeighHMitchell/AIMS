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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CustomYearSelector } from "@/components/ui/custom-year-selector";
import { apiFetch } from '@/lib/api-fetch';

// Color palette for modalities (matching project palette)
const MODALITY_COLORS: Record<string, string> = {
  'Grant': '#dc2625',              // Primary Scarlet
  'Loan': '#4c5568',               // Blue Slate
  'Technical Assistance': '#7b95a7', // Cool Steel
  'Reimbursable Grant': '#cfd0d5',   // Pale Slate
  'Investment/Guarantee': '#f1f4f8', // Platinum
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chart');

  // Custom year selection
  const {
    customYears,
    selectedId: selectedCustomYearId,
    setSelectedId: setSelectedCustomYearId,
    loading: customYearsLoading,
  } = useCustomYears();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/analytics/funding-by-modality?type=${transactionType}`);
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
  }, [transactionType]);

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
      
      // Calculate total for this year
      const yearTotal = nonZeroPayload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">Year {label}</p>
          <div className="border-t pt-2 space-y-1">
            {nonZeroPayload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-slate-700">{entry.name}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(yearTotal)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (expanded: boolean = false) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
      {ALL_MODALITIES.map((modality) => (
        <div key={modality} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: MODALITY_COLORS[modality] }}
          />
          <span className={cn("text-xs text-gray-600", expanded ? "" : "truncate max-w-[80px]")} title={modality}>
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
          tickFormatter={(v) => v.toString()}
        />
        <YAxis
          tickFormatter={formatCurrency}
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
            radius={chartMode === 'grouped' ? [4, 4, 0, 0] : undefined}
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
          tickFormatter={(v) => v.toString()}
        />
        <YAxis
          tickFormatter={formatCurrency}
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
          tickFormatter={(v) => v.toString()}
        />
        <YAxis
          tickFormatter={formatCurrency}
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
          <TableRow>
            <TableHead>Year</TableHead>
            {ALL_MODALITIES.map((modality) => (
              <TableHead key={modality} className="text-right">{modality}</TableHead>
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
      return <Skeleton className={expanded ? "h-full w-full flex-1" : "h-[280px] w-full"} />;
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
        {expanded && renderLegend(expanded)}
        <div className={expanded ? "h-[500px]" : "h-[280px]"}>
          {renderChart()}
        </div>
      </div>
    );
  };

  const renderControls = (expanded: boolean = false) => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t">
      {/* Left side controls */}
      <div className="flex items-center gap-2">
        {/* Transaction type dropdown */}
        <Select value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
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

        {/* Custom Year Selector (only in expanded view) */}
        {expanded && (
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
        {/* Chart type toggle - only show when in chart view */}
        {(!expanded || viewMode === 'chart') && (
          <div className="flex items-center border rounded-md">
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === 'bar' && "bg-primary text-primary-foreground")}
              onClick={() => setChartType('bar')}
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === 'line' && "bg-primary text-primary-foreground")}
              onClick={() => setChartType('line')}
              title="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === 'area' && "bg-primary text-primary-foreground")}
              onClick={() => setChartType('area')}
              title="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Chart mode toggle - only show when in bar chart view */}
        {(!expanded || viewMode === 'chart') && chartType === 'bar' && (
          <div className="flex items-center border rounded-md">
            <Button
              variant={chartMode === 'stacked' ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 w-8 p-0", chartMode === 'stacked' && "bg-primary text-primary-foreground")}
              onClick={() => setChartMode('stacked')}
              title="Stacked"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant={chartMode === 'grouped' ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 w-8 p-0", chartMode === 'grouped' && "bg-primary text-primary-foreground")}
              onClick={() => setChartMode('grouped')}
              title="Grouped"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* View mode toggle - only in expanded view */}
        {expanded && (
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 w-8 p-0", viewMode === 'chart' && "bg-primary text-primary-foreground")}
              onClick={() => setViewMode('chart')}
              title="Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-8 w-8 p-0", viewMode === 'table' && "bg-primary text-primary-foreground")}
              onClick={() => setViewMode('table')}
              title="Table"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Expand button - only in compact view */}
        {!expanded && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(true)}
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}

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

  return (
    <>
      {/* Compact Card View */}
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Funding Over Time
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                By Aid Modality Type
              </p>
            </div>
            {summary && (
              <span className="text-lg font-bold text-slate-500">
                {formatCurrencyWithSymbol(summary.total)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3 flex-1 flex flex-col">
          {renderContent(false)}
          {renderControls(false)}
        </CardContent>
      </Card>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold uppercase tracking-wide">
                  Funding Over Time
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {METRIC_OPTIONS.find((o) => o.value === transactionType)?.label} by aid modality type over time
                </DialogDescription>
              </div>
              <span className="text-2xl font-bold text-slate-500">
                {summary ? formatCurrencyWithSymbol(summary.total) : ''}
              </span>
            </div>
          </DialogHeader>

          {/* Chart or Table content based on viewMode */}
          <div className="mt-4 flex-1 min-h-0 flex flex-col">{renderContent(true)}</div>

          {/* Controls */}
          <div className="flex-shrink-0">{renderControls(true)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
