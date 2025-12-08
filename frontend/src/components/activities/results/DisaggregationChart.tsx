'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Dimension, IndicatorPeriod, IndicatorBaseline, MeasureType } from '@/types/results';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DisaggregationChartProps {
  baseline?: IndicatorBaseline;
  periods?: IndicatorPeriod[];
  measure?: MeasureType;
  className?: string;
}

interface DimensionData {
  name: string;
  value: string;
  target?: number;
  actual?: number;
}

// Color palette for different dimension values
const DIMENSION_COLORS = [
  '#6b9080', // sage green
  '#8b7eae', // purple
  '#6b8cae', // blue
  '#ae7e8b', // rose
  '#c4a35a', // gold
  '#7eae8b', // mint
  '#ae8b6b', // tan
  '#8bae7e', // lime
];

// Format value based on measure type
const formatValue = (value: number | undefined, measure?: MeasureType): string => {
  if (value === undefined) return '—';
  switch (measure) {
    case 'percentage':
      return `${value}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    default:
      return value.toLocaleString();
  }
};

export function DisaggregationChart({ 
  baseline, 
  periods = [], 
  measure,
  className 
}: DisaggregationChartProps) {
  const [selectedDimension, setSelectedDimension] = useState<string>('');

  // Collect all unique dimension names from baseline and periods
  const { availableDimensions, dimensionData } = useMemo(() => {
    const dimensionMap = new Map<string, Map<string, DimensionData>>();
    
    // Process baseline dimensions
    if (baseline?.dimensions) {
      baseline.dimensions.forEach((dim: Dimension) => {
        if (!dimensionMap.has(dim.name)) {
          dimensionMap.set(dim.name, new Map());
        }
        const valueMap = dimensionMap.get(dim.name)!;
        if (!valueMap.has(dim.value)) {
          valueMap.set(dim.value, {
            name: dim.name,
            value: dim.value,
            target: undefined,
            actual: undefined
          });
        }
      });
    }

    // Process period dimensions (aggregate across all periods)
    periods.forEach(period => {
      // Target dimensions
      if (period.target_dimensions) {
        period.target_dimensions.forEach((dim: Dimension) => {
          if (!dimensionMap.has(dim.name)) {
            dimensionMap.set(dim.name, new Map());
          }
          const valueMap = dimensionMap.get(dim.name)!;
          const existing = valueMap.get(dim.value) || {
            name: dim.name,
            value: dim.value,
            target: 0,
            actual: 0
          };
          // Sum targets across periods (this is simplified - real logic might differ)
          valueMap.set(dim.value, {
            ...existing,
            target: (existing.target || 0) + (period.target_value || 0)
          });
        });
      }

      // Actual dimensions
      if (period.actual_dimensions) {
        period.actual_dimensions.forEach((dim: Dimension) => {
          if (!dimensionMap.has(dim.name)) {
            dimensionMap.set(dim.name, new Map());
          }
          const valueMap = dimensionMap.get(dim.name)!;
          const existing = valueMap.get(dim.value) || {
            name: dim.name,
            value: dim.value,
            target: 0,
            actual: 0
          };
          // Sum actuals across periods
          valueMap.set(dim.value, {
            ...existing,
            actual: (existing.actual || 0) + (period.actual_value || 0)
          });
        });
      }
    });

    const available = Array.from(dimensionMap.keys());
    
    // Build data structure for chart
    const data: Record<string, DimensionData[]> = {};
    dimensionMap.forEach((valueMap, dimName) => {
      data[dimName] = Array.from(valueMap.values());
    });

    return {
      availableDimensions: available,
      dimensionData: data
    };
  }, [baseline, periods]);

  // Set default selection
  React.useEffect(() => {
    if (availableDimensions.length > 0 && !selectedDimension) {
      setSelectedDimension(availableDimensions[0]);
    }
  }, [availableDimensions, selectedDimension]);

  // No data state
  if (availableDimensions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-slate-400 py-8", className)}>
        No disaggregation data available
      </div>
    );
  }

  const chartData = dimensionData[selectedDimension] || [];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dimension selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Disaggregate by:</span>
        <Select value={selectedDimension} onValueChange={setSelectedDimension}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select dimension" />
          </SelectTrigger>
          <SelectContent>
            {availableDimensions.map(dim => (
              <SelectItem key={dim} value={dim}>
                {dim.charAt(0).toUpperCase() + dim.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" tickFormatter={(v) => formatValue(v, measure)} />
              <YAxis 
                type="category" 
                dataKey="value" 
                width={70}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [formatValue(value, measure), '']}
                labelFormatter={(label) => `${selectedDimension}: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="target" 
                name="Target" 
                fill="#94a3b8"
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={`target-${index}`} fill="#cbd5e1" />
                ))}
              </Bar>
              <Bar 
                dataKey="actual" 
                name="Actual" 
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={`actual-${index}`} fill={DIMENSION_COLORS[index % DIMENSION_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-slate-400">
          No data for selected dimension
        </div>
      )}

      {/* Summary table */}
      {chartData.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-slate-700">
                  {selectedDimension.charAt(0).toUpperCase() + selectedDimension.slice(1)}
                </th>
                <th className="text-right py-2 px-3 font-medium text-slate-700">Target</th>
                <th className="text-right py-2 px-3 font-medium text-slate-700">Actual</th>
                <th className="text-right py-2 px-3 font-medium text-slate-700">%</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, index) => {
                const pct = row.target && row.actual 
                  ? Math.round((row.actual / row.target) * 100) 
                  : null;
                return (
                  <tr key={row.value} className="border-t border-slate-100">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: DIMENSION_COLORS[index % DIMENSION_COLORS.length] }}
                        />
                        {row.value}
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 text-slate-600">
                      {formatValue(row.target, measure)}
                    </td>
                    <td className="text-right py-2 px-3 font-medium">
                      {formatValue(row.actual, measure)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {pct !== null ? (
                        <span className={cn(
                          "font-medium",
                          pct >= 80 && "text-[#4a6a5a]",
                          pct >= 40 && pct < 80 && "text-[#806830]",
                          pct < 40 && "text-[#904848]"
                        )}>
                          {pct}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DisaggregationChart;





