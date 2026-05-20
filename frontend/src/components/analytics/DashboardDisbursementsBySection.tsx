"use client"

import React, { useState, useEffect } from 'react'
import { DisbursementsBySectorChart } from '@/components/activities/DisbursementsBySectorChart'
import { DisbursementsOverTimeChart } from '@/components/activities/DisbursementsOverTimeChart'
import { Card, CardContent } from '@/components/ui/card'
import { CompactChartCard } from '@/components/ui/compact-chart-card'
import { apiFetch } from '@/lib/api-fetch';

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
      <CompactChartCard
        title="Planned and Actual Disbursements by Sector"
        shortDescription="Compare planned vs actual disbursements across sectors"
        fullDescription="Compare planned vs actual disbursements across sectors, by year"
        mathTooltip="For each sector, sums USD-converted planned disbursements and actual disbursements per year. Activities tagged with multiple sectors are split using the declared sector percentage."
        className="w-full"
        compactHeight={320}
      >
        <DisbursementsBySectorChart
          data={data || { sectors: [] }}
          loading={loading}
        />
      </CompactChartCard>

      <CompactChartCard
        title="Disbursements Over Time by Sector"
        shortDescription="Track disbursements across sectors over time"
        fullDescription="Track planned or actual disbursements across sectors over time"
        mathTooltip="Sums USD-converted disbursements per year and sector (planned or actual, selectable when expanded). Activities tagged with multiple sectors are split using the declared sector percentage."
        className="w-full"
        compactHeight={320}
      >
        <DisbursementsOverTimeChart
          data={data || { sectors: [] }}
          loading={loading}
        />
      </CompactChartCard>
    </div>
  );
}





















