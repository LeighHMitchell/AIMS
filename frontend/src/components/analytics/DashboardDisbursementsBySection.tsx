"use client"

import React, { useState, useEffect } from 'react'
import { DisbursementsBySectorChart } from '@/components/activities/DisbursementsBySectorChart'
import { DisbursementsOverTimeChart } from '@/components/activities/DisbursementsOverTimeChart'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DateRange {
  from: Date;
  to: Date;
}

interface DashboardDisbursementsBySectionProps {
  dateRange: DateRange;
  refreshKey?: number;
}

export function DashboardDisbursementsBySection({
  dateRange,
  refreshKey = 0
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

        const response = await fetch(`/api/analytics/disbursements-by-sector?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch disbursements data');
        }

        const result = await response.json();
        setData(result);
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
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <p className="text-red-700">Error loading disbursements data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <DisbursementsBySectorChart 
        data={data || { sectors: [] }}
        loading={loading}
      />
      
      <DisbursementsOverTimeChart 
        data={data || { sectors: [] }}
        loading={loading}
      />
    </div>
  );
}





















