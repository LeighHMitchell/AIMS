"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { CoordinationCirclePack } from "@/components/analytics/CoordinationCirclePack";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingText } from "@/components/ui/loading-text";
import { AlertCircle, Network, RefreshCw, Users, Layers, Activity, DollarSign } from "lucide-react";
import type { CoordinationView, CoordinationResponse } from "@/types/coordination";

export default function CoordinationPage() {
  const [view, setView] = useState<CoordinationView>("sectors");
  const [data, setData] = useState<CoordinationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/coordination?view=${view}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch coordination data");
      }

      setData(result);
    } catch (err: any) {
      console.error("[CoordinationPage] Error:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white">
          <div className="p-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-900">Error Loading Data</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    className="ml-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Network className="h-6 w-6 text-slate-700" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Coordination</h1>
                <p className="text-sm text-slate-600">
                  {view === "sectors"
                    ? "Who's working in each sector?"
                    : "What is each partner working on?"}
                </p>
              </div>
            </div>

            {/* Toggle Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Button
                    variant={view === "sectors" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView("sectors")}
                  >
                    By Sector
                  </Button>
                  <Button
                    variant={view === "organizations" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView("organizations")}
                  >
                    By Partner
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Budget</p>
                  {loading ? (
                    <Skeleton className="h-6 w-24 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(data?.summary.totalBudget || 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Sectors</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(data?.summary.sectorCount || 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Partners</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(data?.summary.organizationCount || 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Activities</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(data?.summary.activityCount || 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Circle Pack Chart */}
        <div className="px-6 pb-6">
          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-[600px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4" />
                    <LoadingText>Loading coordination data...</LoadingText>
                  </div>
                </div>
              ) : (
                <CoordinationCirclePack view={view} data={data?.data || null} />
              )}
            </CardContent>
          </Card>

          {/* Explanation */}
          <div className="mt-4 text-sm text-slate-500 text-center">
            {view === "sectors" ? (
              <p>
                Each large circle represents a sector. The smaller circles inside show
                development partners working in that sector, sized by their budget allocation.
              </p>
            ) : (
              <p>
                Each large circle represents a development partner. The smaller circles inside
                show the sectors they work in, sized by budget allocation.
              </p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
