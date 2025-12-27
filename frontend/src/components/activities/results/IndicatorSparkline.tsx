'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { IndicatorBaseline, IndicatorPeriod } from '@/types/results';

interface IndicatorSparklineProps {
  baseline?: IndicatorBaseline;
  periods?: IndicatorPeriod[];
  width?: number;
  height?: number;
  className?: string;
}

interface SparklineDataPoint {
  x: number;
  value: number;
  label: string;
}

export function IndicatorSparkline({
  baseline,
  periods = [],
  width = 80,
  height = 28,
  className
}: IndicatorSparklineProps) {
  const sparklineData = useMemo(() => {
    const data: SparklineDataPoint[] = [];

    // Add baseline as first point
    if (baseline?.value !== undefined && baseline?.baseline_year) {
      data.push({
        x: baseline.baseline_year,
        value: baseline.value,
        label: `Baseline (${baseline.baseline_year})`
      });
    }

    // Sort periods by end date and add actual values
    const sortedPeriods = [...periods].sort((a, b) => 
      new Date(a.period_end).getTime() - new Date(b.period_end).getTime()
    );

    sortedPeriods.forEach((period, index) => {
      if (period.actual_value !== undefined) {
        const year = new Date(period.period_end).getFullYear();
        data.push({
          x: year + (index * 0.1), // Slight offset to separate same-year periods
          value: period.actual_value,
          label: `${formatPeriodLabel(period.period_start, period.period_end)}`
        });
      }
    });

    return data;
  }, [baseline, periods]);

  // Don't render if no data points
  if (sparklineData.length < 2) {
    return (
      <div 
        className={className}
        style={{ width, height }}
      >
        <div className="h-full flex items-center justify-center text-slate-300 text-xs">
          —
        </div>
      </div>
    );
  }

  // Determine color based on trend (comparing last to first)
  const firstValue = sparklineData[0]?.value || 0;
  const lastValue = sparklineData[sparklineData.length - 1]?.value || 0;
  const isPositive = lastValue >= firstValue;

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={sparklineData}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="0%" 
                stopColor={isPositive ? '#6b9080' : '#b87070'} 
                stopOpacity={0.3} 
              />
              <stop 
                offset="100%" 
                stopColor={isPositive ? '#6b9080' : '#b87070'} 
                stopOpacity={0.05} 
              />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload as SparklineDataPoint;
                return (
                  <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg">
                    <div className="font-medium">{data.label}</div>
                    <div>{data.value.toLocaleString()}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#6b9080' : '#b87070'}
            strokeWidth={1.5}
            fill="url(#sparklineGradient)"
            dot={false}
            activeDot={{ r: 3, fill: isPositive ? '#6b9080' : '#b87070' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Helper to format period date range
function formatPeriodLabel(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const year = endDate.getFullYear();
  
  return `${startMonth}-${endMonth} ${year}`;
}

export default IndicatorSparkline;












