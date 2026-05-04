"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DisbursementsBySectorChart } from '@/components/activities/DisbursementsBySectorChart'
import { DisbursementsOverTimeChart } from '@/components/activities/DisbursementsOverTimeChart'
import { Card, CardContent } from '@/components/ui/card'
import { apiFetch } from '@/lib/api-fetch';
import { Button } from '@/components/ui/button'
import { BarChart3, Table as TableIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DateRange {
  from: Date;
  to: Date;
}

interface DashboardDisbursementsBySectionProps {
  dateRange: DateRange;
  refreshKey?: number;
  onDataChange?: (data: Array<Record<string, string | number>>) => void;
}

export function DashboardDisbursementsBySection({
  dateRange,
  refreshKey = 0,
  onDataChange
}: DashboardDisbursementsBySectionProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Build a flat tabular view of the section data (used for the table view).
  const tableRows = useMemo(() => {
    const sectors = (data?.sectors ?? []) as Array<any>;
    return sectors.map((s: any) => {
      const years = Array.isArray(s.years) ? s.years : [];
      const planned = years.reduce((sum: number, y: any) => sum + Number(y.planned || 0), 0);
      const actual = years.reduce((sum: number, y: any) => sum + Number(y.actual || 0), 0);
      return {
        sectorCode: String(s.sectorCode ?? ''),
        sector: s.sectorName ?? 'Unknown',
        category: s.categoryName ?? '',
        planned: Math.round(planned),
        actual: Math.round(actual),
      };
    });
  }, [data]);

  const formatUSD = (value: number) => `$${value.toLocaleString()}`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('dateFrom', dateRange.from.toISOString());
        params.append('dateTo', dateRange.to.toISOString());

        const response = await apiFetch(`/api/analytics/disbursements-by-sector?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch disbursements data');
        }

        const result = await response.json();
        setData(result);

        // Emit a clean tabular representation of the section data.
        const sectors = (result?.sectors ?? []) as Array<any>;
        onDataChange?.(
          sectors.map((s: any) => {
            const years = Array.isArray(s.years) ? s.years : [];
            const planned = years.reduce((sum: number, y: any) => sum + Number(y.planned || 0), 0);
            const actual = years.reduce((sum: number, y: any) => sum + Number(y.actual || 0), 0);
            return {
              "Sector Code": String(s.sectorCode ?? ''),
              Sector: s.sectorName ?? 'Unknown',
              Category: s.categoryName ?? '',
              "Planned (USD)": Math.round(planned),
              "Actual (USD)": Math.round(actual),
            };
          })
        );
      } catch (err) {
        console.error('Error fetching disbursements by sector:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData({ sectors: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, refreshKey]);

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="p-6">
          <p className="text-destructive">Error loading disbursements data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setViewMode('chart')}
            title="Chart View"
            aria-label="Chart View"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setViewMode('table')}
            title="Table View"
            aria-label="Table View"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <>
          <DisbursementsBySectorChart
            data={data || { sectors: [] }}
            loading={loading}
          />

          <DisbursementsOverTimeChart
            data={data || { sectors: [] }}
            loading={loading}
          />
        </>
      ) : (
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-white z-10 [&>th]:align-bottom">
                    <TableHead className="whitespace-normal">Sector Code</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right whitespace-normal">Planned (USD)</TableHead>
                    <TableHead className="text-right whitespace-normal">Actual (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{row.sectorCode}</TableCell>
                      <TableCell className="font-medium">{row.sector}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(row.planned)}</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(row.actual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}





















