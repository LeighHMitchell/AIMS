"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization';
import SectorSankeyVisualization from '@/components/charts/SectorSankeyVisualization';
import { PieChart, BarChart3, GitBranch } from 'lucide-react';
import { formatAxisCurrency } from '@/lib/format';
import { getTransactionTypeColor } from '@/lib/chart-colors';

interface SectorData {
  code: string;
  name: string;
  projectCount: number;
  commitments: number;
  disbursements: number;
  percentage: number;
}

interface TopSectorsChartProps {
  data: SectorData[];
  currency?: string;
}

export function TopSectorsChart({ data, currency = 'USD' }: TopSectorsChartProps) {
  const [activeTab, setActiveTab] = useState('bar');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Sort and take top 10 sectors
  const topSectors = [...data]
    .sort((a, b) => b.commitments - a.commitments)
    .slice(0, 10);

  const barChartData = topSectors.map(sector => ({
    name: sector.name.length > 25 ? sector.name.substring(0, 25) + '...' : sector.name,
    fullName: sector.name,
    'Projects': sector.projectCount,
    'Commitments': sector.commitments,
    'Disbursements': sector.disbursements,
  }));

  // Transform data for sunburst/sankey visualizations
  const sectorAllocations = data.map(sector => ({
    code: sector.code,
    name: sector.name,
    percentage: sector.percentage
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sector = topSectors.find(s =>
        (s.name.length > 25 ? s.name.substring(0, 25) + '...' : s.name) === label
      );

      return (
        <div className="bg-slate-900 text-white p-4 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold mb-2 text-body">{sector?.name || label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 text-helper">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">
                {entry.name === 'Projects' ? entry.value : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Sector Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            <p>No sector data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Sector Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-6">
          <SegmentedControl
            ariaLabel="Sector visualization type"
            variant="icon"
            value={activeTab}
            onValueChange={setActiveTab}
            options={[
              { value: 'bar', label: 'Bar chart', icon: BarChart3 },
              { value: 'donut', label: 'Sunburst', icon: PieChart },
              { value: 'sankey', label: 'Sankey', icon: GitBranch },
            ]}
          />
        </div>

        {activeTab === 'bar' && (
          <div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={barChartData}
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
                  yAxisId="left"
                  tickFormatter={formatAxisCurrency}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  label={{ value: 'Amount (USD)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  label={{ value: 'Projects', angle: 90, position: 'insideRight', style: { fill: '#64748b' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="right" dataKey="Projects" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="Commitments" fill={getTransactionTypeColor('2')} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="Disbursements" fill={getTransactionTypeColor('3')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'donut' && (
          <div>
            <div className="h-[500px]">
              {sectorAllocations.length > 0 ? (
                <SectorSunburstVisualization
                  allocations={sectorAllocations}
                  className="w-full h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No sector allocation data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sankey' && (
          <div>
            <div className="h-[500px]">
              {sectorAllocations.length > 0 ? (
                <SectorSankeyVisualization
                  allocations={sectorAllocations}
                  className="w-full h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No sector flow data available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

