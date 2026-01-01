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
  LabelList,
} from "recharts";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RankedItem } from "@/types/national-priorities";

interface RecipientGovBodiesChartProps {
  data: RankedItem[];
  grandTotal: number;
}

type ViewMode = "bar" | "pie" | "table";

// Custom palette: Primary Scarlet, Blue Slate, Cool Steel, darker variants
const COLORS = [
  "#dc2625", // Primary Scarlet
  "#4c5568", // Blue Slate
  "#7b95a7", // Cool Steel
  "#9b4d4c", // Muted scarlet variant
  "#5d6b7d", // Darker steel
  "#8a9dad", // Lighter steel
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

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function RecipientGovBodiesChart({
  data,
  grandTotal,
}: RecipientGovBodiesChartProps) {
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
    fill: COLORS[index % COLORS.length],
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
    acronym: item.name.length > 12 ? item.name.slice(0, 10) + '...' : item.name,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
          <div className="border-t mt-2 pt-2 space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(item.value)}
            </p>
            <p className="text-xs text-gray-500">
              {formatPercent(item.value, grandTotal)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderBarChart = (height: number = 256) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
      >
        <XAxis
          dataKey="acronym"
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 10 }}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
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

  const renderPieChart = (height: number = 256) => (
    <ResponsiveContainer width="100%" height={height}>
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
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="overflow-auto max-h-[300px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Value (USD)</TableHead>
            <TableHead className="text-right">%</TableHead>
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
                {formatPercent(item.value, grandTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderLegend = () => (
    <div className="mt-4 space-y-1">
      {chartData.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate max-w-[150px]">{item.name}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{formatCurrency(item.value)}</span>
            <span className="w-12 text-right">
              {formatPercent(item.value, grandTotal)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderControls = (expanded: boolean = false) => (
    <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t">
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
    </div>
  );

  return (
    <>
      <div className="flex flex-col">
        <div className="h-64">
          {viewMode === "bar" && renderBarChart()}
          {viewMode === "pie" && renderPieChart()}
          {viewMode === "table" && renderTable()}
        </div>
        {renderControls(false)}
      </div>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-3xl w-[80vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              RECIPIENT GOVERNMENT BODIES
            </DialogTitle>
            <DialogDescription>
              Government bodies receiving disbursements
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="h-[400px]">
              {viewMode === "bar" && renderBarChart(400)}
              {viewMode === "pie" && renderPieChart(400)}
              {viewMode === "table" && renderTable()}
            </div>
            {renderLegend()}
          </div>
          
          {renderControls(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
