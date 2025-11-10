"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TableIcon, AreaChartIcon } from 'lucide-react'

interface YearData {
  year: number;
  planned: number;
  actual: number;
}

interface SectorData {
  sectorCode: string;
  sectorName: string;
  years: YearData[];
}

interface DisbursementsOverTimeChartProps {
  data: {
    sectors: SectorData[];
  };
  loading?: boolean;
}

type ViewMode = 'area' | 'line' | 'table';
type DataMode = 'planned' | 'actual';

export function DisbursementsOverTimeChart({ data, loading = false }: DisbursementsOverTimeChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('area');
  const [dataMode, setDataMode] = useState<DataMode>('actual');

  // Prepare time series data
  const timeSeriesData = useMemo(() => {
    // Get all unique years across all sectors
    const yearsSet = new Set<number>();
    data.sectors.forEach(sector => {
      sector.years.forEach(yearData => {
        yearsSet.add(yearData.year);
      });
    });
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    // Create data points for each year
    return years.map(year => {
      const dataPoint: any = { year };
      
      data.sectors.forEach(sector => {
        const yearData = sector.years.find(y => y.year === year);
        const value = dataMode === 'planned' 
          ? (yearData?.planned || 0)
          : (yearData?.actual || 0);
        dataPoint[sector.sectorCode] = value;
        dataPoint[`${sector.sectorCode}_name`] = sector.sectorName;
      });

      return dataPoint;
    });
  }, [data.sectors, dataMode]);

  // Colors for different sectors
  const sectorColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disbursements Over Time by Sector</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (data.sectors.length === 0 || timeSeriesData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disbursements Over Time by Sector</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-muted-foreground">No disbursement data to display</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Disbursements Over Time by Sector</CardTitle>
            <CardDescription>
              Track {dataMode === 'planned' ? 'planned' : 'actual'} disbursements across sectors over time
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
              <Label htmlFor="data-mode" className="text-sm">
                {dataMode === 'planned' ? 'Planned' : 'Actual'}
              </Label>
              <Switch
                id="data-mode"
                checked={dataMode === 'actual'}
                onCheckedChange={(checked) => setDataMode(checked ? 'actual' : 'planned')}
              />
            </div>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('area')}
              >
                <AreaChartIcon className="h-4 w-4 mr-1" />
                Area
              </Button>
              <Button
                variant={viewMode === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('line')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Line
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'area' ? (
          <ResponsiveContainer width="100%" height={450}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year"
                type="number"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis 
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const sector = data.sectors.find(s => s.sectorCode === name);
                  return [formatCurrency(value), sector?.sectorName || name];
                }}
                labelFormatter={(year) => `Year: ${year}`}
              />
              <Legend 
                formatter={(value) => {
                  const sector = data.sectors.find(s => s.sectorCode === value);
                  return sector?.sectorName || value;
                }}
              />
              {data.sectors.map((sector, idx) => (
                <Area
                  key={sector.sectorCode}
                  type="monotone"
                  dataKey={sector.sectorCode}
                  stackId="1"
                  stroke={sectorColors[idx % sectorColors.length]}
                  fill={sectorColors[idx % sectorColors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : viewMode === 'line' ? (
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year"
                type="number"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis 
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const sector = data.sectors.find(s => s.sectorCode === name);
                  return [formatCurrency(value), sector?.sectorName || name];
                }}
                labelFormatter={(year) => `Year: ${year}`}
              />
              <Legend 
                formatter={(value) => {
                  const sector = data.sectors.find(s => s.sectorCode === value);
                  return sector?.sectorName || value;
                }}
              />
              {data.sectors.map((sector, idx) => (
                <Line
                  key={sector.sectorCode}
                  type="monotone"
                  dataKey={sector.sectorCode}
                  stroke={sectorColors[idx % sectorColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Year</TableHead>
                  {data.sectors.map(sector => (
                    <TableHead key={sector.sectorCode} className="text-right">
                      {sector.sectorName}
                      <div className="text-xs text-muted-foreground font-normal">
                        {sector.sectorCode}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSeriesData.map((yearData) => {
                  const total = data.sectors.reduce((sum, sector) => 
                    sum + (yearData[sector.sectorCode] || 0), 0
                  );

                  return (
                    <TableRow key={yearData.year}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {yearData.year}
                      </TableCell>
                      {data.sectors.map(sector => (
                        <TableCell key={sector.sectorCode} className="text-right">
                          {formatCurrency(yearData[sector.sectorCode] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {timeSeriesData.length > 1 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell className="sticky left-0 bg-muted/50 z-10">
                      Total
                    </TableCell>
                    {data.sectors.map(sector => {
                      const sectorTotal = timeSeriesData.reduce((sum, yearData) => 
                        sum + (yearData[sector.sectorCode] || 0), 0
                      );
                      return (
                        <TableCell key={sector.sectorCode} className="text-right">
                          {formatCurrency(sectorTotal)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      {formatCurrency(
                        timeSeriesData.reduce((sum, yearData) => {
                          return sum + data.sectors.reduce((s, sector) => 
                            s + (yearData[sector.sectorCode] || 0), 0
                          );
                        }, 0)
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

















