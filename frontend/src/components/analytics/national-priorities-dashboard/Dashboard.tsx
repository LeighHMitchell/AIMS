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
  Building,
  Users,
  MapPin,
  Layers,
  Target,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { MeasureType, DashboardData } from "@/types/national-priorities";
import { TopDonorAgenciesChart } from "./TopDonorAgenciesChart";
import { TopDonorGroupsChart } from "./TopDonorGroupsChart";
import { TopSectorsChart } from "./TopSectorsChart";
import { ImplementingAgenciesChart } from "./ImplementingAgenciesChart";
import { ExecutingAgenciesChart } from "./ExecutingAgenciesChart";
import { AidPredictabilityChart } from "./AidPredictabilityChart";
import { SubnationalAllocationsChart } from "./SubnationalAllocationsChart";
import { TopCapitalSpendChart } from "./TopCapitalSpendChart";
import { CapitalSpendOverTimeChart } from "./CapitalSpendOverTimeChart";
import { FundingByModalityChart } from "../dashboard/FundingByModalityChart";
import { RecipientGovBodiesChart } from "../dashboard/RecipientGovBodiesChart";
import { ProgramFragmentationChart } from "../dashboard/ProgramFragmentationChart";
import { SectorFragmentationChart } from "../dashboard/SectorFragmentationChart";
import { LocationFragmentationChart } from "../dashboard/LocationFragmentationChart";

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
      const response = await fetch(`/api/analytics/dashboard?${params}`);
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
            {/* Top Donor Agencies - Self-contained component with its own data fetching */}
            <TopDonorAgenciesChart />

            {/* Top Donor Groups - Self-contained component with its own data fetching */}
            <TopDonorGroupsChart />

            {/* Top Sectors - Self-contained component with its own data fetching */}
            <TopSectorsChart />

            {/* Subnational Allocations - Self-contained component with its own data fetching */}
            <SubnationalAllocationsChart />

            {/* Executing Agencies - Self-contained component with its own data fetching */}
            <ExecutingAgenciesChart />

            {/* Implementing Agencies - Self-contained component with its own data fetching */}
            <ImplementingAgenciesChart />

            {/* Recipient Government Bodies - Self-contained component with its own data fetching */}
            <Card className="bg-white border-slate-200 h-full flex flex-col">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Recipient Government Bodies
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Government bodies receiving funds</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3 flex-1 flex flex-col">
                <RecipientGovBodiesChart />
              </CardContent>
            </Card>

            {/* Aid Predictability Chart */}
            <AidPredictabilityChart />

            {/* Funding Over Time Chart */}
            <FundingByModalityChart />

            {/* Top Activities by Capital Spend */}
            <TopCapitalSpendChart />

            {/* Capital vs Non-Capital Spend Over Time */}
            <CapitalSpendOverTimeChart />
          </div>
        </TabsContent>

        {/* Fragmentation Tab */}
        <TabsContent value="fragmentation" className="mt-6">
          <TooltipProvider>
            <div className="space-y-8">
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800 uppercase tracking-wide">
                    Program Fragmentation
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>Shows how donors distribute their aid across National Priorities. Each cell shows the percentage of that category&apos;s total funding contributed by each donor.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgramFragmentationChart />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800 uppercase tracking-wide">
                    Sector Fragmentation
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>Shows how donors distribute their aid across DAC Sectors. Each cell shows the percentage of that sector&apos;s total funding contributed by each donor.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SectorFragmentationChart />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800 uppercase tracking-wide">
                    Location Fragmentation
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>Shows how donors distribute their aid across geographic regions. Each cell shows the percentage of that location&apos;s total funding contributed by each donor.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LocationFragmentationChart />
                </CardContent>
              </Card>
            </div>
          </TooltipProvider>
        </TabsContent>
      </Tabs>
    </div>
  );
}

