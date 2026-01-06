"use client";

import React, { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { DomesticBudgetData } from "@/types/domestic-budget";
import { calculateExecutionRate } from "@/types/domestic-budget";

// Single color for treemap
const TREEMAP_COLOR = '#7b95a7';  // Cool Steel (lighter gray)

interface DomesticBudgetTreemapProps {
  data: DomesticBudgetData[];
  valueKey: "budget" | "expenditure";
}

interface TreemapDataItem {
  name: string;
  code: string;
  value: number;
  budgetAmount: number;
  expenditureAmount: number;
  executionRate: number;
  currency: string;
  classificationType: string;
}

// Custom content renderer for treemap rectangles
const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, value, currency } = props;

  // Guard against undefined values
  if (typeof x === 'undefined' || typeof y === 'undefined' || 
      typeof width === 'undefined' || typeof height === 'undefined') {
    return null;
  }

  const displayValue = typeof value === 'number' ? value : 0;
  const displayCurrency = currency || 'USD';
  const displayName = name || 'Unknown';

  // Don't render text if rectangle is too small
  if (width < 60 || height < 40) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: TREEMAP_COLOR,
            stroke: "#fff",
            strokeWidth: 2,
            strokeOpacity: 1,
          }}
          rx={4}
          ry={4}
        />
      </g>
    );
  }

  // Format value for display
  const formatValue = (val: number) => {
    if (val >= 1000000000) {
      return `${(val / 1000000000).toFixed(1)}B`;
    } else if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(0);
  };

  // Truncate name if too long for the rectangle
  const maxChars = Math.floor(width / 8);
  const truncatedName = displayName.length > maxChars ? displayName.substring(0, maxChars - 2) + "..." : displayName;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: TREEMAP_COLOR,
          stroke: "#fff",
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
        rx={4}
        ry={4}
      />
      {height > 50 && (
        <>
          <text
            x={x + 8}
            y={y + 20}
            fill="#fff"
            fontSize={12}
            fontWeight={600}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {truncatedName}
          </text>
          <text
            x={x + 8}
            y={y + 38}
            fill="#fff"
            fontSize={11}
            opacity={0.9}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {displayCurrency} {formatValue(displayValue)}
          </text>
        </>
      )}
    </g>
  );
};

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as TreemapDataItem;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-lg border"
      style={{ backgroundColor: "#f1f4f8", borderColor: "#cfd0d5" }}
    >
      <div className="font-semibold text-sm mb-2" style={{ color: "#4c5568" }}>
        {data.code} - {data.name}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Budget:</span>
          <span className="font-medium">{formatCurrency(data.budgetAmount, data.currency)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Expenditure:</span>
          <span className="font-medium">{formatCurrency(data.expenditureAmount, data.currency)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: "#cfd0d5" }}>
          <span className="text-gray-600">Execution Rate:</span>
          <span
            className="font-medium"
            style={{ color: data.executionRate > 100 ? "#dc2625" : "#4c5568" }}
          >
            {data.executionRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export function DomesticBudgetTreemap({ data, valueKey }: DomesticBudgetTreemapProps) {
  // Transform budget data into treemap format
  const treemapData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .filter((item) => {
        const value = valueKey === "budget" ? item.budgetAmount : item.expenditureAmount;
        return value > 0;
      })
      .map((item): TreemapDataItem => ({
        name: item.budgetClassification?.name || "Unknown",
        code: item.budgetClassification?.code || "-",
        value: valueKey === "budget" ? item.budgetAmount : item.expenditureAmount,
        budgetAmount: item.budgetAmount,
        expenditureAmount: item.expenditureAmount,
        executionRate: calculateExecutionRate(item.budgetAmount, item.expenditureAmount),
        currency: item.currency,
        classificationType: item.budgetClassification?.classificationType || "other",
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, valueKey]);

  if (treemapData.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-[400px] rounded-lg border-2 border-dashed"
        style={{ borderColor: "#cfd0d5", backgroundColor: "#f1f4f8" }}
      >
        <div className="text-center">
          <p className="text-lg font-medium" style={{ color: "#4c5568" }}>
            No data to visualize
          </p>
          <p className="text-sm mt-1" style={{ color: "#7b95a7" }}>
            {valueKey === "budget"
              ? "Add budget entries with budget amounts to see the treemap"
              : "Add budget entries with expenditure amounts to see the treemap"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={<CustomizedContent />}
          isAnimationActive={false}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
