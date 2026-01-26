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
  Legend,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart3, LineChart as LineChartIcon, TrendingUp, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AidPredictabilityPoint } from "@/types/national-priorities";
import { CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiFetch } from '@/lib/api-fetch';

type ChartType = "bar" | "line" | "area";

// Color palette for Aid Predictability chart
const CHART_COLORS = {
  planned: "#4c5568",    // Blue Slate - darker for planned
  actual: "#7b95a7",     // Cool Steel - lighter for actual
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

export function AidPredictabilityChart() {
  const [data, setData] = useState<AidPredictabilityPoint[]>([]);
  const [summary, setSummary] = useState<{
    totalPlanned: number;
    totalActual: number;
    predictabilityRatio: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch("/api/analytics/aid-predictability");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data || []);
      setSummary(result.summary || null);
    } catch (err: any) {
      console.error("Error fetching aid predictability data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <Skeleton className="h-80 w-full" />;
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
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        No predictability data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="px-3 py-1">
            Total Planned: {formatCurrency(summary.totalPlanned)}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            Total Actual: {formatCurrency(summary.totalActual)}
          </Badge>
          <Badge
            variant={
              summary.predictabilityRatio >= 90
                ? "default"
                : summary.predictabilityRatio >= 70
                ? "secondary"
                : "destructive"
            }
            className="px-3 py-1"
          >
            Predictability: {summary.predictabilityRatio.toFixed(1)}%
          </Badge>
        </div>
      )}

      {/* Chart Type Toggle */}
      <div className="flex items-center justify-end mb-2 gap-2">
        <div className="flex items-center border rounded-md">
          <Button
            variant={chartType === "bar" ? "default" : "ghost"}
            size="sm"
            className={cn("h-8 w-8 p-0", chartType === "bar" && "bg-primary text-primary-foreground")}
            onClick={() => setChartType("bar")}
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === "line" ? "default" : "ghost"}
            size="sm"
            className={cn("h-8 w-8 p-0", chartType === "line" && "bg-primary text-primary-foreground")}
            onClick={() => setChartType("line")}
            title="Line Chart"
          >
            <LineChartIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === "area" ? "default" : "ghost"}
            size="sm"
            className={cn("h-8 w-8 p-0", chartType === "area" && "bg-primary text-primary-foreground")}
            onClick={() => setChartType("area")}
            title="Area Chart"
          >
            <TrendingUp className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsExpanded(true)}
          title="Expand"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Chart */}
      <div className="h-72">
        {chartType === "bar" && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "plannedDisbursements"
                  ? "Planned"
                  : "Actual",
              ]}
              labelFormatter={(label) => `Year ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            {isExpanded && (
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) =>
                  value === "plannedDisbursements"
                    ? "Planned Disbursements"
                    : "Actual Disbursements"
                }
              />
            )}
            <Bar
              dataKey="plannedDisbursements"
              fill={CHART_COLORS.planned}
              name="plannedDisbursements"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="actualDisbursements"
              fill={CHART_COLORS.actual}
              name="actualDisbursements"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        )}
        {chartType === "line" && (
        <ResponsiveContainer width="100%" height="100%">
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
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "plannedDisbursements"
                  ? "Planned"
                  : "Actual",
              ]}
              labelFormatter={(label) => `Year ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            {isExpanded && (
              <Legend
                verticalAlign="top"
                iconType="square"
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) =>
                  value === "plannedDisbursements"
                    ? "Planned Disbursements"
                    : "Actual Disbursements"
                }
              />
            )}
            <Line
              type="monotone"
              dataKey="plannedDisbursements"
              stroke={CHART_COLORS.planned}
              strokeWidth={2}
              name="plannedDisbursements"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actualDisbursements"
              stroke={CHART_COLORS.actual}
              strokeWidth={2}
              name="actualDisbursements"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        )}
        {chartType === "area" && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.planned} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_COLORS.planned} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.actual} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_COLORS.actual} stopOpacity={0.1} />
              </linearGradient>
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
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "plannedDisbursements"
                  ? "Planned"
                  : "Actual",
              ]}
              labelFormatter={(label) => `Year ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            {isExpanded && (
              <Legend
                verticalAlign="top"
                iconType="square"
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) =>
                  value === "plannedDisbursements"
                    ? "Planned Disbursements"
                    : "Actual Disbursements"
                }
              />
            )}
            <Area
              type="monotone"
              dataKey="plannedDisbursements"
              stroke={CHART_COLORS.planned}
              fill="url(#colorPlanned)"
              name="plannedDisbursements"
            />
            <Area
              type="monotone"
              dataKey="actualDisbursements"
              stroke={CHART_COLORS.actual}
              fill="url(#colorActual)"
              name="actualDisbursements"
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* Legend explanation */}
      <div className="text-xs text-muted-foreground text-center">
        Comparing planned disbursements against actual disbursements to measure aid predictability
      </div>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-wide">
              Aid Predictability
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              Comparing planned disbursements against actual disbursements
            </DialogDescription>
          </DialogHeader>

          {/* Summary badges in expanded view */}
          {summary && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="outline" className="px-3 py-1">
                Total Planned: {formatCurrency(summary.totalPlanned)}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                Total Actual: {formatCurrency(summary.totalActual)}
              </Badge>
              <Badge
                variant={
                  summary.predictabilityRatio >= 90
                    ? "default"
                    : summary.predictabilityRatio >= 70
                    ? "secondary"
                    : "destructive"
                }
                className="px-3 py-1"
              >
                Predictability: {summary.predictabilityRatio.toFixed(1)}%
              </Badge>
            </div>
          )}

          {/* Legend - only in expanded view */}
          <div className="flex flex-wrap items-center gap-4 mt-4 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS.planned }} />
              <span className="text-sm text-gray-600">Planned Disbursements</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS.actual }} />
              <span className="text-sm text-gray-600">Actual Disbursements</span>
            </div>
          </div>

          {/* Chart in expanded view */}
          <div className="h-[400px] mt-4">
            {chartType === "bar" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "plannedDisbursements" ? "Planned" : "Actual",
                    ]}
                    labelFormatter={(label) => `Year ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="plannedDisbursements"
                    fill={CHART_COLORS.planned}
                    name="plannedDisbursements"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="actualDisbursements"
                    fill={CHART_COLORS.actual}
                    name="actualDisbursements"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartType === "line" && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "plannedDisbursements" ? "Planned" : "Actual",
                    ]}
                    labelFormatter={(label) => `Year ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="plannedDisbursements"
                    stroke={CHART_COLORS.planned}
                    strokeWidth={2}
                    name="plannedDisbursements"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualDisbursements"
                    stroke={CHART_COLORS.actual}
                    strokeWidth={2}
                    name="actualDisbursements"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {chartType === "area" && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPlannedExpanded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.planned} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={CHART_COLORS.planned} stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorActualExpanded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.actual} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={CHART_COLORS.actual} stopOpacity={0.1} />
                    </linearGradient>
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
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "plannedDisbursements" ? "Planned" : "Actual",
                    ]}
                    labelFormatter={(label) => `Year ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="plannedDisbursements"
                    stroke={CHART_COLORS.planned}
                    fill="url(#colorPlannedExpanded)"
                    name="plannedDisbursements"
                  />
                  <Area
                    type="monotone"
                    dataKey="actualDisbursements"
                    stroke={CHART_COLORS.actual}
                    fill="url(#colorActualExpanded)"
                    name="actualDisbursements"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

