"use client";

import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryMetricsCards } from './SummaryMetricsCards';
import { TopProjectsChart } from './TopProjectsChart';
import { TopSectorsChart } from './TopSectorsChart';
import { ProjectStatusChart } from './ProjectStatusChart';
import { AidOverTimeChart } from './AidOverTimeChart';
import { ProjectsTable } from './ProjectsTable';
import { OrgProjectMap } from './OrgProjectMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, BarChart3 } from 'lucide-react';

interface AnalyticsData {
  summaryMetrics: {
    currentYear: {
      activeProjects: number;
      commitments: number;
      disbursements: number;
      expenditures: number;
    };
    previousYear: {
      activeProjects: number;
      commitments: number;
      disbursements: number;
      expenditures: number;
    };
  };
  topProjects: any[];
  sectorData: any[];
  projectStatusDistribution: any[];
  timeSeriesData: any[];
  allProjects: any[];
}

interface OrganizationAnalyticsProps {
  organizationId: string;
  currency?: string;
}

export function OrganizationAnalytics({
  organizationId,
  currency = 'USD',
}: OrganizationAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/organizations/${organizationId}/analytics`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchAnalytics();
    }
  }, [organizationId]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>

        {/* Map Skeleton */}
        <Skeleton className="h-[500px] rounded-lg" />

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>

        {/* Table Skeleton */}
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              className="ml-4"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Summary Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Summary Metrics (2025)
        </h2>
        <SummaryMetricsCards
          currentYear={data.summaryMetrics.currentYear}
          previousYear={data.summaryMetrics.previousYear}
          currency={currency}
        />
      </div>

      {/* Interactive Map Tab */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Geographic Footprint
        </h2>
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="map">
              <Map className="h-4 w-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="data">
              <BarChart3 className="h-4 w-4 mr-2" />
              Data View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="mt-4">
            <OrgProjectMap organizationId={organizationId} />
          </TabsContent>
          <TabsContent value="data" className="mt-4">
            <div className="text-sm text-slate-600 p-4 border border-slate-200 rounded-lg bg-slate-50">
              Location data summary: {data.allProjects.length} projects across multiple locations.
              Switch to Map View to see geographic distribution.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Top Projects Chart */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Top Projects by Budget
        </h2>
        <TopProjectsChart projects={data.topProjects} currency={currency} />
      </div>

      {/* Aid Over Time and Project Status - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Financial Trends
          </h2>
          <AidOverTimeChart data={data.timeSeriesData} currency={currency} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Project Portfolio Status
          </h2>
          <ProjectStatusChart data={data.projectStatusDistribution} />
        </div>
      </div>

      {/* Sector Analysis */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Sector Analysis
        </h2>
        <TopSectorsChart data={data.sectorData} currency={currency} />
      </div>

      {/* Projects Table */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          All Projects
        </h2>
        <ProjectsTable projects={data.allProjects} currency={currency} />
      </div>
    </div>
  );
}

