"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { RankedItem } from "@/types/national-priorities";
import { CHART_COLOR_PALETTE, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";

interface RankedBarChartProps {
  data: RankedItem[];
  grandTotal: number;
  valueLabel?: string;
  height?: number;
  showPercentage?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, grandTotal }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as RankedItem;
    const percentage = grandTotal > 0 ? ((data.value / grandTotal) * 100).toFixed(1) : "0";
    
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
        {data.code && (
          <p className="text-xs text-gray-500 mb-1">Code: {data.code}</p>
        )}
        {data.country && (
          <p className="text-xs text-gray-500 mb-1">Country: {data.country}</p>
        )}
        <div className="border-t mt-2 pt-2 space-y-1">
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-gray-600">
            {percentage}% of total
          </p>
          {data.activityCount > 0 && (
            <p className="text-xs text-gray-500">
              {data.activityCount} {data.activityCount === 1 ? "activity" : "activities"}
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function RankedBarChart({
  data,
  grandTotal,
  valueLabel = "Value",
  height = 300,
  showPercentage = true,
}: RankedBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  // Prepare data with truncated names for display
  const chartData = data.map((item, index) => ({
    ...item,
    displayName: item.name.length > 25 ? `${item.name.substring(0, 22)}...` : item.name,
    percentage: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
    fill: item.id === "others" ? "#9CA3AF" : CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_STRUCTURE_COLORS.grid}
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          tickFormatter={formatCurrency}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          stroke={CHART_STRUCTURE_COLORS.axis}
          fontSize={11}
          width={95}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip grandTotal={grandTotal} />}
          cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

