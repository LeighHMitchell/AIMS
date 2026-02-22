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
} from "recharts";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";
import { RankedItem } from "@/types/national-priorities";

interface TopDonorGroupsChartProps {
  data: RankedItem[];
  grandTotal: number;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];

function WrapTick({ x, y, payload, width }: { x: number; y: number; payload: { value: string }; width: number }) {
  const maxWidth = width || 75;
  const text = payload.value || "";
  // Split text into lines that fit within the available width (~7px per char at font-size 11)
  const charsPerLine = Math.max(Math.floor(maxWidth / 6.5), 8);
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= charsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  const lineHeight = 13;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  return (
    <text x={x} y={startY} textAnchor="end" fontSize={11} fill="currentColor">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
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

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function TopDonorGroupsChart({
  data,
  grandTotal,
}: TopDonorGroupsChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const renderChart = (height: number = 256) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCurrency(v)}
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={(props: Record<string, unknown>) => <WrapTick {...props as { x: number; y: number; payload: { value: string }; width: number }} width={100} />}
        />
        <Tooltip
          content={({ active, payload }: any) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-surface-muted px-3 py-2 border-b border-slate-200">
                    <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                  </div>
                  <div className="p-2">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 pr-4 text-slate-700 font-medium">Value</td>
                          <td className="py-1 text-right font-semibold text-slate-900">{formatCurrency(item.value)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="absolute top-0 right-0 h-8 w-8 p-0 z-10"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <div className="h-64">
          {renderChart()}
        </div>
      </div>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-3xl w-[80vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Top Donor Groups
            </DialogTitle>
            <DialogDescription>
              Grouped by country
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="h-[400px]">
              {renderChart(400)}
            </div>
            {renderLegend()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
