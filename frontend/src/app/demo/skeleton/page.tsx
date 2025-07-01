'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { ActivityEditorSkeleton } from '@/components/activities/ActivityEditorSkeleton';
import { 
  SectorAllocationSkeleton, 
  OrganisationsSkeleton, 
  FinancesSkeleton, 
  LocationsSkeleton, 
  LinkedActivitiesSkeleton,
  GenericTabSkeleton 
} from '@/components/activities/TabSkeletons';
import { ActivityListSkeleton, DashboardStatsSkeleton, TableSkeleton, ChartSkeleton } from '@/components/ui/skeleton-loader';

export default function SkeletonDemoPage() {
  const [showFullEditor, setShowFullEditor] = useState(false);
  const [currentTab, setCurrentTab] = useState('sectors');

  const tabSkeletons = {
    sectors: <SectorAllocationSkeleton />,
    organisations: <OrganisationsSkeleton />,
    finances: <FinancesSkeleton />,
    locations: <LocationsSkeleton />,
    linked: <LinkedActivitiesSkeleton />,
    generic: <GenericTabSkeleton />
  };

  if (showFullEditor) {
    return (
      <MainLayout>
        <div className="relative">
          <Button 
            onClick={() => setShowFullEditor(false)}
            className="absolute top-4 right-4 z-10"
            variant="outline"
          >
            Exit Full Screen Demo
          </Button>
          <ActivityEditorSkeleton />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold mb-2">Skeleton Loader Demo</h1>
          <p className="text-muted-foreground">
            Preview all skeleton loading states used in the AIMS application
          </p>
        </div>

        {/* Full Activity Editor Skeleton */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Full Activity Editor Skeleton</h2>
          <Button onClick={() => setShowFullEditor(true)}>
            View Full Screen Demo
          </Button>
        </section>

        {/* Tab-specific Skeletons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Tab-Specific Skeletons</h2>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(tabSkeletons).map((tab) => (
              <Button
                key={tab}
                variant={currentTab === tab ? 'default' : 'outline'}
                onClick={() => setCurrentTab(tab)}
                className="capitalize"
              >
                {tab}
              </Button>
            ))}
          </div>
          <div className="border rounded-lg p-6 bg-gray-50">
            {tabSkeletons[currentTab as keyof typeof tabSkeletons]}
          </div>
        </section>

        {/* Other UI Skeletons */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Dashboard Stats Skeleton</h2>
            <DashboardStatsSkeleton />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Activity List Skeleton</h2>
            <ActivityListSkeleton />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Table Skeleton</h2>
            <TableSkeleton rows={5} columns={6} />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Chart Skeleton</h2>
            <ChartSkeleton height="300px" />
          </div>
        </section>
      </div>
    </MainLayout>
  );
} 