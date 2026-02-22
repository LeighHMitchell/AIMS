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
  CartesianGrid,
} from "recharts";
import { RankedItem } from "@/types/national-priorities";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";

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
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
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

