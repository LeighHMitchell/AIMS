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
  CartesianGrid,
  LabelList,
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
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Maximize2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportChartToCSV } from "@/lib/chart-export";
import { RankedItem } from "@/types/national-priorities";
import { CHART_COLOR_PALETTE, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";

type ViewMode = "bar" | "pie" | "table";

interface SubnationalAllocationsChartProps {
  data: RankedItem[];
  grandTotal: number;
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

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SubnationalAllocationsChart({ data, grandTotal }: SubnationalAllocationsChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [isExpanded, setIsExpanded] = useState(false);

  const chartData = data.map((item, index) => ({
    ...item,
    color: item.id === "others" ? "#9CA3AF" : CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
  }));

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
    exportChartToCSV(exportData, `subnational-allocations`);
    toast.success("Data exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : "0";
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{item.name}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">Value</span>
              <span className="text-sm font-medium text-slate-900">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">Percentage</span>
              <span className="text-sm font-medium text-slate-900">
                {percentage}%
              </span>
            </div>
            {item.activityCount > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">Activities</span>
                <span className="text-sm font-medium text-slate-900">
                  {item.activityCount}
                </span>
              </div>
            )}
          </div>
        </div>
      );
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
          <span className="text-xs text-gray-600 truncate max-w-[100px]" title={item.name}>
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

  const renderBarChart = (height: number = 280) => (
    <ResponsiveContainer width="100%" height={height}>
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
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11, fill: CHART_STRUCTURE_COLORS.axis }}
          stroke={CHART_STRUCTURE_COLORS.axis}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatCurrency(value)}
            style={{ fontSize: 10, fontWeight: 500, fill: "#374151" }}
          />
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = (height: number = 280) => (
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
          label={({ name, percent }) => `${name.length > 8 ? name.slice(0, 8) + '...' : name} ${(percent * 100).toFixed(0)}%`}
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
            <TableHead>State/Region</TableHead>
            <TableHead className="text-right">Value (USD)</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyFull(item.value)}
              </TableCell>
              <TableCell className="text-right">
                {grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : 0}%
              </TableCell>
              <TableCell className="text-right">
                {item.activityCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = (expanded: boolean = false) => {
    const chartHeight = expanded ? 400 : 280;

    if (!data || data.length === 0) {
      return (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          No subnational allocation data available
        </div>
      );
    }

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
    <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t flex-shrink-0">
      {/* View mode toggles */}
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
  );

  return (
    <>
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Subnational Allocations
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Myanmar States & Regions</p>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3 flex-1 flex flex-col">
          {renderContent(false)}
          {renderControls(false)}
        </CardContent>
      </Card>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-wide">
              Subnational Allocations
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              Myanmar States & Regions breakdown
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">{renderContent(true)}</div>
          {renderControls(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
