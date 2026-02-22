"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LoadingText } from "@/components/ui/loading-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { MeasureType, FragmentationData } from "@/types/national-priorities";
import { FragmentationHeatmap } from "./FragmentationHeatmap";

interface LocationFragmentationChartProps {
  measure: MeasureType;
}

export function LocationFragmentationChart({
  measure,
}: LocationFragmentationChartProps) {
  const [data, setData] = useState<FragmentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        measure,
        maxDonors: "10",
      });

      const response = await fetch(`/api/analytics/fragmentation/location?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data);
    } catch (err: any) {
      console.error("Error fetching location fragmentation data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [measure]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
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

  if (!data || data.donors.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No location fragmentation data available
      </div>
    );
  }

  return <FragmentationHeatmap data={data} />;
}

