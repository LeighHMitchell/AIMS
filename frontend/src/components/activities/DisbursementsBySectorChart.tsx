"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { BarChart3, TableIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { LoadingText } from '@/components/ui/loading-text'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

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

interface DisbursementsBySectorChartProps {
  data: {
    sectors: SectorData[];
  };
  loading?: boolean;
}

export function DisbursementsBySectorChart({ data, loading = false }: DisbursementsBySectorChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);

  // Extract all available years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    data.sectors.forEach(sector => {
      sector.years.forEach(yearData => {
        yearsSet.add(yearData.year);
      });
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [data.sectors]);

  const [selectedYears, setSelectedYears] = useState<number[]>(
    availableYears.length > 0 ? [availableYears[availableYears.length - 1]] : []
  );

  // Update selected years when available years change
  React.useEffect(() => {
    if (availableYears.length > 0 && selectedYears.length === 0) {
      setSelectedYears([availableYears[availableYears.length - 1]]);
    }
  }, [availableYears, selectedYears.length]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => a - b)
    );
  };

  const toggleAllYears = () => {
    if (selectedYears.length === availableYears.length) {
      setSelectedYears(availableYears.length > 0 ? [availableYears[availableYears.length - 1]] : []);
    } else {
      setSelectedYears(availableYears);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return data.sectors.map(sector => {
      const result: any = {
        sectorName: sector.sectorName,
        sectorCode: sector.sectorCode,
      };

      selectedYears.forEach(year => {
        const yearData = sector.years.find(y => y.year === year);
        result[`planned_${year}`] = yearData?.planned || 0;
        result[`actual_${year}`] = yearData?.actual || 0;
      });

      return result;
    });
  }, [data.sectors, selectedYears]);

  // Colors for different years
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const plannedColors = colors.map(c => c + 'CC'); // Add transparency
  const actualColors = colors;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disbursements by Sector</CardTitle>
          <CardDescription><LoadingText>Loading data...</LoadingText></CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <LoadingText>Loading sector data...</LoadingText>
        </CardContent>
      </Card>
    );
  }

  if (data.sectors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disbursements by Sector</CardTitle>
          <CardDescription>No sector data available</CardDescription>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Planned and Actual Disbursements by Sector</CardTitle>
            <CardDescription>
              Compare planned vs actual disbursements across sectors
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Chart
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Table
            </Button>
          </div>
        </div>
        
        {/* Year Selector */}
        <Collapsible open={isYearSelectorOpen} onOpenChange={setIsYearSelectorOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <span className="font-medium">Selected Years:</span>
                {selectedYears.length === 0 ? (
                  <Badge variant="secondary">None</Badge>
                ) : selectedYears.length === availableYears.length ? (
                  <Badge variant="secondary">All Years</Badge>
                ) : (
                  <div className="flex gap-1">
                    {selectedYears.map(year => (
                      <Badge key={year} variant="secondary">{year}</Badge>
                    ))}
                  </div>
                )}
              </span>
              {isYearSelectorOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Select years to display</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllYears}
              >
                {selectedYears.length === availableYears.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {availableYears.map(year => (
                <div key={year} className="flex items-center space-x-2">
                  <Checkbox
                    id={`year-${year}`}
                    checked={selectedYears.includes(year)}
                    onCheckedChange={() => toggleYear(year)}
                  />
                  <Label
                    htmlFor={`year-${year}`}
                    className="text-sm cursor-pointer"
                  >
                    {year}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
      
      <CardContent>
        {selectedYears.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Please select at least one year to display</p>
            </div>
          </div>
        ) : viewMode === 'chart' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="sectorName" 
                angle={-45}
                textAnchor="end"
                height={120}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              {selectedYears.map((year, idx) => (
                <React.Fragment key={year}>
                  <Bar 
                    dataKey={`planned_${year}`} 
                    name={`${year} Planned`}
                    fill={plannedColors[idx % plannedColors.length]}
                    stackId={`year-${year}`}
                  />
                  <Bar 
                    dataKey={`actual_${year}`} 
                    name={`${year} Actual`}
                    fill={actualColors[idx % actualColors.length]}
                    stackId={`year-${year}`}
                  />
                </React.Fragment>
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Sector</TableHead>
                  {selectedYears.map(year => (
                    <React.Fragment key={year}>
                      <TableHead className="text-right">{year} Planned</TableHead>
                      <TableHead className="text-right">{year} Actual</TableHead>
                      <TableHead className="text-right">{year} Variance</TableHead>
                    </React.Fragment>
                  ))}
                  <TableHead className="text-right font-semibold">Total Planned</TableHead>
                  <TableHead className="text-right font-semibold">Total Actual</TableHead>
                  <TableHead className="text-right font-semibold">Total Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((sector, idx) => {
                  const totalPlanned = selectedYears.reduce((sum, year) => 
                    sum + (sector[`planned_${year}`] || 0), 0
                  );
                  const totalActual = selectedYears.reduce((sum, year) => 
                    sum + (sector[`actual_${year}`] || 0), 0
                  );
                  const totalVariance = totalActual - totalPlanned;

                  return (
                    <TableRow key={idx}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {sector.sectorName}
                        <div className="text-xs text-muted-foreground">{sector.sectorCode}</div>
                      </TableCell>
                      {selectedYears.map(year => {
                        const planned = sector[`planned_${year}`] || 0;
                        const actual = sector[`actual_${year}`] || 0;
                        const variance = actual - planned;
                        const varianceColor = variance >= 0 ? 'text-green-600' : 'text-red-600';

                        return (
                          <React.Fragment key={year}>
                            <TableCell className="text-right">{formatCurrency(planned)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(actual)}</TableCell>
                            <TableCell className={`text-right ${varianceColor}`}>
                              {formatCurrency(variance)}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                      <TableCell className="text-right font-semibold">{formatCurrency(totalPlanned)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(totalActual)}</TableCell>
                      <TableCell className={`text-right font-semibold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalVariance)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}





















