"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { AlignmentCoverageDashboard } from "@/components/analytics/alignment-coverage/AlignmentCoverageDashboard";

export default function AlignmentPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Plan Alignment
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Which priority areas of Myanmar's national plans are covered by aid activities — and which aren't.
          </p>
        </div>

        {/* Dashboard */}
        <AlignmentCoverageDashboard />
      </div>
    </MainLayout>
  );
}
