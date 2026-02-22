"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { FundingByType } from "@/types/national-priorities";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";

interface FundingTypeTimeSeriesChartProps {
  data: FundingByType[];
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // yellow
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
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

export function FundingTypeTimeSeriesChart({
  data,
}: FundingTypeTimeSeriesChartProps) {
  // Transform data to have years as rows and finance types as columns
  const { chartData, financeTypes } = useMemo(() => {
    const years = new Map<number, Record<string, number>>();
    const types = new Set<string>();

    data.forEach((d) => {
      types.add(d.financeTypeName);
      if (!years.has(d.year)) {
        years.set(d.year, { year: d.year });
      }
      years.get(d.year)![d.financeTypeName] = d.value;
    });

    const sortedYears = Array.from(years.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, data]) => data);

    return {
      chartData: sortedYears,
      financeTypes: Array.from(types),
    };
  }, [data]);

  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => v.toString()}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11 }}
            width={70}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name,
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(value) =>
              value.length > 20 ? `${value.slice(0, 20)}...` : value
            }
          />
          {financeTypes.slice(0, 8).map((type, index) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

