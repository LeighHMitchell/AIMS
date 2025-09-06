'use client';

import React, { Suspense } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { MapSkeleton } from '@/components/ui/skeleton-loader';
import AidMap from '@/components/AidMap';

export default function AidMapPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Aid Map</h1>
        <p className="text-gray-600">
          Interactive map showing the locations of all activities across Myanmar
        </p>
      </div>
      
      <Suspense fallback={<MapSkeleton height="600px" />}>
        <AidMap />
      </Suspense>
    </MainLayout>
  );
}