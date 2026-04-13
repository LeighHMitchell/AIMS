"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { AlignmentCoverageDashboard } from "@/components/analytics/alignment-coverage/AlignmentCoverageDashboard";
import { BookOpen } from "lucide-react";

export default function AlignmentPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Plan Alignment
          </h1>
          <p className="text-muted-foreground mt-1">
            See how development activities align to national plans and sectoral
            strategies. Identify priority areas that are well-covered and those
            that lack support.
          </p>
        </div>

        {/* Dashboard */}
        <AlignmentCoverageDashboard />
      </div>
    </MainLayout>
  );
}
