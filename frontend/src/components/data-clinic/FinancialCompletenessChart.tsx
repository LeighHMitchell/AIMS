"use client"

import React, { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, BarChart3, Table as TableIcon, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  formatCurrencyCompact,
  formatCurrencyFull,
  formatPercentage,
  getSeverityColorFromPercentage,
  getSeverity,
  Severity
} from '@/utils/calculateFinancialCompleteness'

interface FinancialCompletenessActivity {
  id: string;
  title: string;
  iati_identifier: string | null;
  reporting_org_id: string | null;
  reporting_org_name: string | null;
  total_budgeted_usd: number;
  total_disbursed_usd: number;
  overspend_usd: number;
  budget_period_count: number;
  duration_years: number;
  percentage_spent: number;
}

interface FinancialCompletenessChartProps {
  data: FinancialCompletenessActivity[];
  loading: boolean;
}

type ViewMode = 'chart' | 'table';
type SortField = 'title' | 'organization' | 'budgeted' | 'disbursed' | 'overspend' | 'percentage' | 'severity';
type SortDirection = 'asc' | 'desc';

function SeverityBadge({ severity }: { severity: Severity }) {
  switch (severity) {
    case 'mild':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Mild
        </Badge>
      );
    case 'moderate':
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
          Moderate
        </Badge>
      );
    case 'severe':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Severe
        </Badge>
      );
    default:
      return null;
  }
}

// Custom Y-axis tick component that renders clickable, wrapping activity titles
const CustomYAxisTick = ({ x, y, payload, data, width }: any) => {
  const activity = data.find((d: any) => d.title === payload.value);
  const maxWidth = width - 10;
  const lineHeight = 14;
  
  const handleClick = () => {
    if (activity) {
      window.location.href = `/activities/${activity.id}`;
    }
  };

  // Simple word wrapping
  const wrapText = (text: string, maxCharsPerLine: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    // Limit to 3 lines max
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = lines[2].substring(0, lines[2].length - 3) + '...';
    }
    
    return lines;
  };

  const lines = wrapText(payload.value, 45);
  const totalHeight = lines.length * lineHeight;
  const startY = -totalHeight / 2 + lineHeight / 2;

  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }} onClick={handleClick}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={-5}
          y={startY + index * lineHeight}
          textAnchor="end"
          fill="#334155"
          fontSize={11}
          className="hover:font-medium"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export function FinancialCompletenessChart({ data, loading }: FinancialCompletenessChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [sortField, setSortField] = useState<SortField>('overspend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const router = useRouter();

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get sort icon for column header
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Prepare and sort chart data
  const chartData = useMemo(() => {
    const items = data.map((item) => ({
      ...item,
      fullName: item.title
    }));
    
    // Sort for table view
    return items.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'organization':
          comparison = (a.reporting_org_name || '').localeCompare(b.reporting_org_name || '');
          break;
        case 'budgeted':
          comparison = a.total_budgeted_usd - b.total_budgeted_usd;
          break;
        case 'disbursed':
          comparison = a.total_disbursed_usd - b.total_disbursed_usd;
          break;
        case 'overspend':
          comparison = a.overspend_usd - b.overspend_usd;
          break;
        case 'percentage':
          comparison = a.percentage_spent - b.percentage_spent;
          break;
        case 'severity':
          // null (no overspending) sorts first (0), then mild (1), moderate (2), severe (3)
          const severityOrder: Record<string, number> = { mild: 1, moderate: 2, severe: 3 };
          const getSeverityOrder = (pct: number) => severityOrder[getSeverity(pct) ?? ''] ?? 0;
          comparison = getSeverityOrder(a.percentage_spent) - getSeverityOrder(b.percentage_spent);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const item = payload[0].payload as FinancialCompletenessActivity & { fullName: string };

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-w-sm">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">{item.fullName}</p>
          {item.reporting_org_name && (
            <p className="text-xs text-slate-600 mt-0.5">{item.reporting_org_name}</p>
          )}
        </div>
        <div className="p-2">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-4 text-slate-700 font-medium">Budgeted</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">
                  {formatCurrencyFull(item.total_budgeted_usd)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-4 text-slate-700 font-medium">Disbursed</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">
                  {formatCurrencyFull(item.total_disbursed_usd)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-4 text-slate-700 font-medium">Overspend</td>
                <td className="py-1.5 text-right font-semibold text-red-600">
                  {formatCurrencyFull(item.overspend_usd)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-4 text-slate-700 font-medium">% Spent</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">
                  {formatPercentage(item.percentage_spent)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-slate-700 font-medium">Budget Periods</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">
                  {item.budget_period_count}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Overspend by Activity
          </CardTitle>
          <CardDescription>
            Activities with disbursements exceeding budgeted amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Overspend by Activity
          </CardTitle>
          <CardDescription>
            Activities with disbursements exceeding budgeted amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No data to display</p>
              <p className="text-sm text-slate-500 mt-2">Apply filters or check if data exists</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate dynamic height based on number of items - taller to accommodate wrapped titles
  const chartHeight = Math.max(400, chartData.length * 70);

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Overspend by Activity
            </CardTitle>
            <CardDescription>
              Activities with disbursements exceeding budgeted amounts. Click activity title to view details.
            </CardDescription>
          </div>
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="rounded-r-none gap-1.5"
            >
              <BarChart3 className="h-4 w-4" />
              Chart
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none gap-1.5"
            >
              <TableIcon className="h-4 w-4" />
              Table
            </Button>
          </div>
        </div>
        {/* Severity Legend */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-xs text-slate-500">Severity:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fbbf24' }} />
            <span className="text-xs text-slate-600">Mild (&lt;150%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
            <span className="text-xs text-slate-600">Moderate (150-200%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-xs text-slate-600">Severe (&gt;200%)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'chart' ? (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 300, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={formatCurrencyCompact}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={<CustomYAxisTick data={chartData} />}
                  axisLine={{ stroke: '#cbd5e1' }}
                  width={290}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="overspend_usd" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getSeverityColorFromPercentage(entry.percentage_spent)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead 
                    className="min-w-[250px] cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Activity Title
                      <SortIcon field="title" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('organization')}
                  >
                    <div className="flex items-center">
                      Organisation
                      <SortIcon field="organization" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('budgeted')}
                  >
                    <div className="flex items-center justify-end">
                      Budgeted USD
                      <SortIcon field="budgeted" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('disbursed')}
                  >
                    <div className="flex items-center justify-end">
                      Disbursed USD
                      <SortIcon field="disbursed" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('overspend')}
                  >
                    <div className="flex items-center justify-end">
                      Overspend USD
                      <SortIcon field="overspend" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center justify-end">
                      % Spent
                      <SortIcon field="percentage" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('severity')}
                  >
                    <div className="flex items-center justify-center">
                      Severity
                      <SortIcon field="severity" />
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((item) => {
                  const severity = getSeverity(item.percentage_spent);
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/activities/${item.id}`)}
                    >
                      <TableCell className="font-medium">
                        <span className="line-clamp-2">{item.title}</span>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {item.reporting_org_name || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyFull(item.total_budgeted_usd)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyFull(item.total_disbursed_usd)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrencyFull(item.overspend_usd)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPercentage(item.percentage_spent)}
                      </TableCell>
                      <TableCell className="text-center">
                        <SeverityBadge severity={severity} />
                      </TableCell>
                      <TableCell>
                        <ExternalLink className="h-4 w-4 text-slate-400" />
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
