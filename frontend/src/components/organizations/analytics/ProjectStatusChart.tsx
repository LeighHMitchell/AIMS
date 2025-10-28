"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

interface ProjectStatusChartProps {
  data: StatusData[];
}

const STATUS_COLORS: { [key: string]: string } = {
  '2': '#10b981', // Active - green
  'active': '#10b981',
  '1': '#3b82f6', // Pipeline - blue
  'pipeline': '#3b82f6',
  '3': '#6b7280', // Completed - gray
  'completed': '#6b7280',
  '4': '#ef4444', // Post-completion - gray
  '5': '#ef4444', // Cancelled - red
  'cancelled': '#ef4444',
  'suspended': '#f59e0b', // orange
};

const STATUS_LABELS: { [key: string]: string } = {
  '1': 'Pipeline',
  '2': 'Active',
  '3': 'Completed',
  '4': 'Post-Completion',
  '5': 'Cancelled',
  'pipeline': 'Pipeline',
  'active': 'Active',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'suspended': 'Suspended',
};

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  
  const chartData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    percentage: item.percentage,
    fill: STATUS_COLORS[item.status] || '#9ca3af'
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-sm">
          <p className="font-semibold">{data.name}</p>
          <p className="text-slate-300">Count: {data.value}</p>
          <p className="text-slate-300">Percentage: {data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-600">
              {entry.value}: {entry.payload.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Project Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-slate-500">
            <p>No project status data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Project Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={(entry) => `${entry.percentage.toFixed(1)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

