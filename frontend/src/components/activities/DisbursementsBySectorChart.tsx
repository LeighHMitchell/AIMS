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
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard, ChartTooltipRow } from '@/components/ui/chart-tooltip'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { YearRangeChip } from '@/components/ui/year-range-chip'

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
  /** Passed by CompactChartCard (true in card preview, false when expanded). */
  compact?: boolean;
}

export function DisbursementsBySectorChart({ data, loading = false }: DisbursementsBySectorChartProps) {
  const isExpanded = useChartExpansion();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  // Range state used only by the YearRangeChip — does NOT replace the existing per-year checkbox selection.
  const [chipSelectedYears, setChipSelectedYears] = useState<number[]>([]);

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

  // Slate-only palette for dashboard consistency. Per-year actual stays darker;
  // planned uses a lighter slate variant so each year's pair reads as related.
  const actualColors = ['#334155', '#4c5568', '#475569', '#5d6b7a', '#7b95a7', '#94a3b8'];
  const plannedColors = ['#94a3b8', '#a3b5c2', '#cbd5e1', '#cfd0d5', '#cbd5e1', '#cfd0d5'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return <ChartLoadingPlaceholder />;
  }

  if (data.sectors.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        <p className="text-body">No disbursement data to display</p>
      </div>
    );
  }

  // Minimal card preview: chart only, no controls / title (CompactChartCard
  // supplies the title, ƒ and expand button). Controls appear on expand.
  if (!isExpanded) {
    return (
      <div className="h-full w-full">
        {selectedYears.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p className="text-body">No year data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sectorName" angle={-45} textAnchor="end" height={70} fontSize={10} />
              <YAxis tickFormatter={formatAxisCurrency} fontSize={10} />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload || !payload.length) return null
                  const datum = payload[0]?.payload
                  const filtered = payload.filter((e: any) => e.value)
                  const rows: ChartTooltipRow[] = filtered.map((entry: any) => ({
                    label: entry.name,
                    value: formatCurrency(entry.value),
                    color: entry.color || entry.fill,
                  }))
                  return (
                    <ChartTooltipCard
                      title={label || datum?.sectorName || ''}
                      subtitle={datum?.sectorCode ? `Code: ${datum.sectorCode}` : undefined}
                      rows={rows}
                    />
                  )
                }}
              />
              {selectedYears.map((year, idx) => (
                <React.Fragment key={year}>
                  <Bar dataKey={`planned_${year}`} name={`${year} Planned`} fill={plannedColors[idx % plannedColors.length]} stackId={`year-${year}`} />
                  <Bar dataKey={`actual_${year}`} name={`${year} Actual`} fill={actualColors[idx % actualColors.length]} stackId={`year-${year}`} />
                </React.Fragment>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            {availableYears.length > 0 && (
              <YearRangeChip
                selectedYears={chipSelectedYears}
                onYearsChange={setChipSelectedYears}
                availableYears={availableYears}
                actualDataRange={
                  availableYears.length > 0
                    ? { minYear: availableYears[0], maxYear: availableYears[availableYears.length - 1] }
                    : null
                }
              />
            )}
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('chart')}
              className={cn(
                viewMode === 'chart'
                  ? "bg-white shadow-sm text-foreground hover:bg-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                viewMode === 'table'
                  ? "bg-white shadow-sm text-foreground hover:bg-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TableIcon className="h-4 w-4" />
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
              <Label className="text-body font-medium">Select years to display</Label>
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
                    className="text-body cursor-pointer"
                  >
                    {year}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div>
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
                tickFormatter={formatAxisCurrency}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload || !payload.length) return null
                  const datum = payload[0]?.payload
                  const filtered = payload.filter((e: any) => e.value)
                  const rows: ChartTooltipRow[] = filtered.map((entry: any) => ({
                    label: entry.name,
                    value: formatCurrency(entry.value),
                    color: entry.color || entry.fill,
                  }))
                  return (
                    <ChartTooltipCard
                      title={label || datum?.sectorName || ''}
                      subtitle={datum?.sectorCode ? `Code: ${datum.sectorCode}` : undefined}
                      rows={rows}
                    />
                  )
                }}
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
                  <TableHead className="text-right font-medium">Total Planned</TableHead>
                  <TableHead className="text-right font-medium">Total Actual</TableHead>
                  <TableHead className="text-right font-medium">Total Variance</TableHead>
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
                        <div className="text-helper text-muted-foreground">{sector.sectorCode}</div>
                      </TableCell>
                      {selectedYears.map(year => {
                        const planned = sector[`planned_${year}`] || 0;
                        const actual = sector[`actual_${year}`] || 0;
                        const variance = actual - planned;
                        const varianceColor = variance >= 0 ? 'text-green-600' : 'text-destructive';

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
                      <TableCell className={`text-right font-semibold ${totalVariance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(totalVariance)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}





















