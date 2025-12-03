import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { CardContent } from '@/components/ui/card';
import { ChartDataPoint, formatCurrency, formatTooltipCurrency, getYearTotal } from './sectorTimeSeriesQueries';
import { generateSectorColorMap } from './sectorColorMap';
import { TimeSeriesDataType } from '@/types/sector-analytics';

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
      // Filter out zero/null values and sort by value descending
      const filteredPayload = payload
        .filter((entry: any) => entry.value && entry.value > 0)
        .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
      
      if (filteredPayload.length === 0) return null;
      
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg text-sm max-h-[400px] overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900">Year: {label}</p>
            <p className="text-slate-600">
              Total {dataType === 'planned' ? 'Planned' : 'Actual'}: <span className="font-bold text-slate-900">{formatTooltipCurrency(yearTotal)}</span>
            </p>
          </div>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full">
              <tbody>
                {filteredPayload.map((entry: any, index: number) => {
                  const code = sectorCodes[entry.name] || '';
                  return (
                    <tr key={`item-${index}`} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-slate-700">
                            {code && (
                              <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-xs mr-1.5">
                                {code}
                              </code>
                            )}
                            {entry.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-slate-900 whitespace-nowrap">
                        {formatTooltipCurrency(entry.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tickFormatter={formatCurrency}
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
            formatter={(value) => <span className="text-slate-700 text-sm">{value}</span>}
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

