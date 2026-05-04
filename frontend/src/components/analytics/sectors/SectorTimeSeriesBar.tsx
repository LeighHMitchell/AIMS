import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { CardContent } from '@/components/ui/card';
import { ChartDataPoint, formatTooltipCurrency, getYearTotal } from './sectorTimeSeriesQueries';
import { formatAxisCurrency } from '@/lib/format';
import { generateSectorColorMap } from './sectorColorMap';
import { TimeSeriesDataType } from '@/types/sector-analytics';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';

interface SectorTimeSeriesBarProps {
  data: ChartDataPoint[];
  sectorNames: string[];
  sectorCodes?: Record<string, string>;
  dataType: TimeSeriesDataType;
  stacked?: boolean;
}

export function SectorTimeSeriesBar({ data, sectorNames, sectorCodes = {}, dataType, stacked = false }: SectorTimeSeriesBarProps) {
  // Generate consistent colors for sectors
  const colorMap = useMemo(() => generateSectorColorMap(sectorNames), [sectorNames])
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const yearTotal = getYearTotal(payload[0].payload, sectorNames);
      const filteredPayload = payload
        .filter((entry: any) => entry.value && entry.value > 0)
        .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

      if (filteredPayload.length === 0) return null;

      const subtitle = (
        <span>
          Total {dataType === 'planned' ? 'Planned' : 'Actual'}:{' '}
          <span className="font-bold text-foreground">{formatTooltipCurrency(yearTotal)}</span>
        </span>
      );
      const rows = filteredPayload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(entry.value),
        color: entry.color,
        code: sectorCodes[entry.name] || undefined,
      }));
      return (
        <ChartTooltipCard
          title={`Year: ${label}`}
          subtitle={subtitle}
          rows={rows}
          maxWidth={460}
        />
      );
    }
    return null;
  };

  return (
    <CardContent className="p-0">
      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={data}
          margin={{
            top: 10, right: 30, left: 20, bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tickFormatter={formatAxisCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{
              value: `Amount (USD)`,
              angle: -90,
              position: 'insideLeft',
              fill: '#64748b',
              fontSize: 12,
              offset: -10
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span className="text-foreground text-body">{value}</span>}
            iconType="square"
          />
          {sectorNames.map((sectorName, index) => (
            <Bar
              key={sectorName}
              dataKey={sectorName}
              stackId={stacked ? "stack" : undefined}
              fill={colorMap[sectorName]}
              name={sectorName}
              radius={stacked ? (index === sectorNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-in-out"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  );
}

