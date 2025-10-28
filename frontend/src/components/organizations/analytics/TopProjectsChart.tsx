"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ProjectData {
  id: string;
  title: string;
  totalBudget: number;
  commitments: number;
  disbursements: number;
  currency: string;
}

interface TopProjectsChartProps {
  projects: ProjectData[];
  currency?: string;
}

export function TopProjectsChart({ projects, currency = 'USD' }: TopProjectsChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const chartData = projects.slice(0, 10).map(project => ({
    name: project.title.length > 30 ? project.title.substring(0, 30) + '...' : project.title,
    fullName: project.title,
    'Total Budgeted': project.totalBudget,
    'Commitments': project.commitments,
    'Disbursements': project.disbursements,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const project = projects.find(p =>
        (p.title.length > 30 ? p.title.substring(0, 30) + '...' : p.title) === label
      );

      return (
        <div className="bg-slate-900 text-white p-4 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold mb-2 text-sm">{project?.title || label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 text-xs">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.value);
          return (
            <div
              key={`legend-${index}`}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80"
              onClick={() => handleLegendClick(entry.value)}
            >
              <div
                className="w-3 h-3 rounded"
                style={{
                  backgroundColor: isHidden ? '#d1d5db' : entry.color,
                  opacity: isHidden ? 0.5 : 1
                }}
              />
              <span className={`text-sm ${isHidden ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (projects.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Top 10 Projects by Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-slate-500">
            <p>No project data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Top 10 Projects by Budget
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ value: 'Amount (USD)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            {!hiddenSeries.has('Total Budgeted') && (
              <Bar dataKey="Total Budgeted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            )}
            {!hiddenSeries.has('Commitments') && (
              <Bar dataKey="Commitments" fill="#10b981" radius={[4, 4, 0, 0]} />
            )}
            {!hiddenSeries.has('Disbursements') && (
              <Bar dataKey="Disbursements" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

