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
import { CHART_STRUCTURE_COLORS, CHART_RANKED_PALETTE } from "@/lib/chart-colors";
import { useChartExpansion } from "@/lib/chart-expansion-context";
import { formatTooltipCurrency, formatAxisCurrency } from "@/lib/format";

interface TopDonorAgenciesChartProps {
  data: RankedItem[];
  grandTotal: number;
}

// Shared monochromatic slate ramp — keeps ranked Top N charts visually
// consistent across the dashboard. Darker shades = higher rank.
const COLORS = CHART_RANKED_PALETTE;

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

export function TopDonorAgenciesChart({
  data,
  grandTotal,
}: TopDonorAgenciesChartProps) {
  const isExpanded = useChartExpansion();
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
            tickFormatter={formatAxisCurrency}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={75}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 12)}...` : v)}
          />
          <Tooltip
            formatter={(value: number) => [formatTooltipCurrency(value, isExpanded), "Value"]}
            labelFormatter={(label) => {
              const item = chartData.find((d) => d.name === label);
              return `${label}${item?.country ? ` (${item.country})` : ""}`;
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
            className="flex items-center justify-between text-helper"
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
      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed">
        This chart ranks the top individual donor agencies by funding value. Each bar represents a specific development partner organization, showing their relative contribution to the overall aid portfolio. Hover over bars to see the full organization name and country.
      </p>
    </div>
  );
}
