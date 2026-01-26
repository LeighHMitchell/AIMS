"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart3,
  Grid3X3,
  AlertCircle,
  Target,
  Layers,
  MapPin,
} from "lucide-react";

import { MeasureType, DashboardData } from "@/types/national-priorities";
import { DashboardFilters } from "./DashboardFilters";
import { TopDonorAgenciesChart } from "./TopDonorAgenciesChart";
import { TopDonorGroupsChart } from "./TopDonorGroupsChart";
import { TopSectorsChart } from "./TopSectorsChart";
import { TopLocationsChart } from "./TopLocationsChart";
import { ImplementingAgenciesChart } from "./ImplementingAgenciesChart";
import { ExecutingAgenciesChart } from "./ExecutingAgenciesChart";
import { RecipientGovBodiesChart } from "./RecipientGovBodiesChart";
import { FundingByModalityChart } from "./FundingByModalityChart";
import { AidPredictabilityChart } from "./AidPredictabilityChart";
import { ProgramFragmentationChart } from "./ProgramFragmentationChart";
import { SectorFragmentationChart } from "./SectorFragmentationChart";
import { LocationFragmentationChart } from "./LocationFragmentationChart";
import { apiFetch } from '@/lib/api-fetch';

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function Dashboard() {
  const [measure, setMeasure] = useState<MeasureType>("disbursements");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bar-charts");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ measure });
      const response = await apiFetch(`/api/analytics/dashboard?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch dashboard data");
      }

      setData(result.data);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [measure]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Aid effectiveness analytics with fragmentation analysis
          </p>
        </div>
        {data && (
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total: {formatCurrency(data.grandTotal)}
          </Badge>
        )}
      </div>

      <DashboardFilters measure={measure} onMeasureChange={setMeasure} />

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted p-1 h-auto gap-1 border">
          <TabsTrigger
            value="bar-charts"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            Bar Charts
          </TabsTrigger>
          <TabsTrigger
            value="fragmentation"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Grid3X3 className="h-4 w-4" />
            Fragmentation
          </TabsTrigger>
        </TabsList>

        {/* Bar Charts Tab */}
        <TabsContent value="bar-charts" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Top Donor Agencies
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">By reporting organization</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <TopDonorAgenciesChart
                  data={data?.topDonorAgencies || []}
                  grandTotal={data?.grandTotal || 0}
                />
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Top Donor Groups
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Grouped by country</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <TopDonorGroupsChart
                  data={data?.topDonorGroups || []}
                  grandTotal={data?.grandTotal || 0}
                />
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Top Sectors
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">DAC 3-digit categories</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <TopSectorsChart
                  data={data?.topSectors || []}
                  grandTotal={data?.grandTotal || 0}
                />
              </CardContent>
            </Card>

            <TopLocationsChart />

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Implementing Agencies
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Organizations with implementing role</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <ImplementingAgenciesChart
                  data={data?.implementingAgencies || []}
                  grandTotal={data?.grandTotal || 0}
                />
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Executing Agencies
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Organizations managing budgets on behalf of funders</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <ExecutingAgenciesChart
                  data={data?.executingAgencies || []}
                  grandTotal={data?.grandTotal || 0}
                />
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Recipient Government Bodies
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Government bodies receiving disbursements</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <RecipientGovBodiesChart
                  data={data?.recipientGovBodies || []}
                  grandTotal={data?.grandTotal || 0}
                />
              </CardContent>
            </Card>

            {/* Funding Over Time Chart */}
            <FundingByModalityChart />

            {/* Aid Predictability Chart */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Aid Predictability
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Planned vs Actual Disbursements by Year</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <AidPredictabilityChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fragmentation Tab */}
        <TabsContent value="fragmentation" className="mt-6">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Program Fragmentation
                </CardTitle>
                <CardDescription>
                  How donors distribute their aid across National Priorities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProgramFragmentationChart measure={measure} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Sector Fragmentation
                </CardTitle>
                <CardDescription>
                  How donors distribute their aid across DAC Sectors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SectorFragmentationChart measure={measure} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Fragmentation
                </CardTitle>
                <CardDescription>
                  How donors distribute their aid across geographic regions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LocationFragmentationChart measure={measure} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

