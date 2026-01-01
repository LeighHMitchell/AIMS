"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { RankedItem } from "@/types/national-priorities";

interface TopSectorsChartProps {
  data: RankedItem[];
  grandTotal: number;
}

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#6b7280"];

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

export function TopSectorsChart({
  data,
  grandTotal,
}: TopSectorsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    displayName: item.code ? `${item.code}: ${item.name}` : item.name,
    color: COLORS[index % COLORS.length],
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v)}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            width={75}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 12)}...` : v)}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), "Value"]}
            labelFormatter={(label) => {
              const item = chartData.find((d) => d.displayName === label);
              return item?.name || label;
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 space-y-1">
        {chartData.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-mono text-[10px] text-muted-foreground mr-1">
                {item.code}
              </span>
              <span className="truncate max-w-[120px]">{item.name}</span>
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
    </div>
  );
}

