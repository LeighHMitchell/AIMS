"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LoadingText } from "@/components/ui/loading-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeftRight, BarChart3, Table } from "lucide-react";
import { MeasureType, FragmentationData } from "@/types/national-priorities";
import { FragmentationHeatmap } from "./FragmentationHeatmap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectorFragmentationChartProps {
  measure?: MeasureType;
}

export function SectorFragmentationChart({
  measure: initialMeasure = "commitments",
}: SectorFragmentationChartProps) {
  const [data, setData] = useState<FragmentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measure, setMeasure] = useState<MeasureType>(initialMeasure);
  const [swapAxes, setSwapAxes] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        measure,
        maxDonors: "10",
      });

      const response = await fetch(`/api/analytics/fragmentation/sector?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data);
    } catch (err: any) {
      console.error("Error fetching sector fragmentation data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [measure]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* View Toggle - Top Right */}
      <div className="flex items-center justify-end">
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('chart')}
            className={cn(
              "h-8 px-3 rounded-none",
              viewMode === 'chart' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('table')}
            className={cn(
              "h-8 px-3 rounded-none",
              viewMode === 'table' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <Table className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !data || data.donors.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No sector fragmentation data available
        </div>
      ) : (
        <FragmentationHeatmap data={data} swapAxes={swapAxes} viewMode={viewMode} />
      )}

      {/* Controls Row - Below Chart */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
        {/* Measure Dropdown */}
        <Select value={measure} onValueChange={(v) => setMeasure(v as MeasureType)}>
          <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="commitments">Commitments</SelectItem>
            <SelectItem value="disbursements">Disbursements</SelectItem>
          </SelectContent>
        </Select>

        {/* Dimension Dropdown - Sector levels */}
        <Select defaultValue="primary">
          <SelectTrigger className="w-[180px] h-9 text-sm bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary Sector</SelectItem>
          </SelectContent>
        </Select>

        {/* Swap Axes Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSwapAxes(!swapAxes)}
          className="h-9"
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" />
          Swap Axes
        </Button>
      </div>
    </div>
  );
}
