"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeasureType } from "@/types/national-priorities";
import { DollarSign, FileCheck, Wallet } from "lucide-react";

interface DashboardFiltersProps {
  measure: MeasureType;
  onMeasureChange: (measure: MeasureType) => void;
}

export function DashboardFilters({
  measure,
  onMeasureChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-sm font-medium text-muted-foreground">Show:</span>
      <Tabs value={measure} onValueChange={(v) => onMeasureChange(v as MeasureType)}>
        <TabsList className="bg-muted">
          <TabsTrigger
            value="disbursements"
            className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Wallet className="h-4 w-4" />
            Disbursements
          </TabsTrigger>
          <TabsTrigger
            value="commitments"
            className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <FileCheck className="h-4 w-4" />
            Commitments
          </TabsTrigger>
          <TabsTrigger
            value="budgets"
            className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <DollarSign className="h-4 w-4" />
            Budgets
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

