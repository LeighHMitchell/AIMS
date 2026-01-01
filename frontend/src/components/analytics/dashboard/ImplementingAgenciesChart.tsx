"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
  LabelList,
} from "recharts";
import { RankedItem } from "@/types/national-priorities";
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
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Maximize2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";

interface ImplementingAgenciesChartProps {
  data: RankedItem[];
  grandTotal: number;
}

type ViewMode = "bar" | "pie" | "table";

const COLORS = [
  "#dc2625", // Primary Scarlet
  "#4c5568", // Blue Slate
  "#7b95a7", // Cool Steel
  "#9b4d4c", // Muted scarlet variant
  "#5d6b7d", // Darker steel
  "#8a9dad", // Lighter steel
];

const CHART_STRUCTURE_COLORS = {
  grid: "#cfd0d5",
  axis: "#4c5568",
};

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

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function ImplementingAgenciesChart({
  data,
  grandTotal,
}: ImplementingAgenciesChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("bar");

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">Value</span>
              <span className="text-sm font-medium text-slate-900">
                {formatCurrency(data.value)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">Percentage</span>
              <span className="text-sm font-medium text-slate-900">
                {formatPercent(data.value, grandTotal)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
    exportChartToCSV(exportData, `implementing-agencies`);
    toast.success("Data exported successfully");
  };

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-2 flex-shrink-0">
      {chartData.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600 truncate max-w-[80px]" title={item.name}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );

  const renderBarChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
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
          height={40}
          tickFormatter={(v) => (v.length > 8 ? `${v.slice(0, 8)}...` : v)}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatCurrency(value)}
            style={{ fontSize: 11, fontWeight: 500, fill: "#374151" }}
          />
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = (height: number | string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={75}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
    <div className="overflow-auto max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Value (USD)</TableHead>
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

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 400 : 280;

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {expanded && renderLegend()}
        <div className="h-[280px]">
          {viewMode === "bar" && renderBarChart(chartHeight)}
          {viewMode === "pie" && renderPieChart(chartHeight)}
          {viewMode === "table" && renderTable()}
        </div>
      </div>
    );
  };

  const renderControls = (expanded: boolean = false) => (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t flex-shrink-0">
      <div className="flex items-center border rounded-md">
        <Button
          variant={viewMode === "bar" ? "default" : "ghost"}
          size="sm"
          className={cn("h-8 w-8 p-0", viewMode === "bar" && "bg-primary text-primary-foreground")}
          onClick={() => setViewMode("bar")}
          title="Bar Chart"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "pie" ? "default" : "ghost"}
          size="sm"
          className={cn("h-8 w-8 p-0", viewMode === "pie" && "bg-primary text-primary-foreground")}
          onClick={() => setViewMode("pie")}
          title="Pie Chart"
        >
          <PieChartIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "table" ? "default" : "ghost"}
          size="sm"
          className={cn("h-8 w-8 p-0", viewMode === "table" && "bg-primary text-primary-foreground")}
          onClick={() => setViewMode("table")}
          title="Table"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
      </div>

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
  );

  return (
    <>
      <div className="h-64">
        {renderContent(false)}
        {renderControls(false)}
      </div>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-wide">
              IMPLEMENTING AGENCIES
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              Organizations with implementing role
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">{renderContent(true)}</div>
          {renderControls(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
